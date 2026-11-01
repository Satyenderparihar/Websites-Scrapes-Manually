package com.example.gemini.ui.components

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.util.LruCache
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Process-local previews only: no video or thumbnail files are written. */
internal object VideoThumbnailCache {
    private data class Preview(val bitmap: Bitmap?)

    private val previews = object : LruCache<String, Preview>(12 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Preview): Int =
            value.bitmap?.allocationByteCount ?: 4096
    }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val extractionLock = Mutex()
    private val pending = mutableMapOf<String, Deferred<Bitmap?>>()

    fun peek(key: String): Bitmap? = previews.get(key)?.bitmap

    suspend fun load(context: Context, key: String, uri: Uri): Bitmap? {
        val request = synchronized(pending) {
            previews.get(key)?.let { return it.bitmap }
            pending.getOrPut(key) {
                // Survives list-item disposal, so scrolling cannot restart extraction.
                scope.async(start = CoroutineStart.LAZY) {
                    extractionLock.withLock {
                        val bitmap = extract(context, uri)
                        // Remember failures too, instead of retrying on every scroll.
                        previews.put(key, Preview(bitmap))
                        bitmap
                    }
                }.also { task ->
                    task.invokeOnCompletion { synchronized(pending) { pending.remove(key) } }
                }
            }
        }
        request.start()
        return request.await()
    }

    private fun extract(context: Context, uri: Uri): Bitmap? {
        val retriever = MediaMetadataRetriever()
        return try {
            if (uri.scheme == "http" || uri.scheme == "https") {
                retriever.setDataSource(uri.toString(), emptyMap<String, String>())
            } else {
                retriever.setDataSource(context, uri)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                retriever.getScaledFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, 480, 270)
            } else {
                retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)?.let { frame ->
                    val scale = minOf(480f / frame.width, 270f / frame.height, 1f)
                    if (scale < 1f) {
                        Bitmap.createScaledBitmap(
                            frame, (frame.width * scale).toInt().coerceAtLeast(1),
                            (frame.height * scale).toInt().coerceAtLeast(1), true
                        ).also { if (it !== frame) frame.recycle() }
                    } else frame
                }
            }
        } catch (_: Exception) {
            null
        } finally {
            try { retriever.release() } catch (_: Exception) {}
        }
    }
}
