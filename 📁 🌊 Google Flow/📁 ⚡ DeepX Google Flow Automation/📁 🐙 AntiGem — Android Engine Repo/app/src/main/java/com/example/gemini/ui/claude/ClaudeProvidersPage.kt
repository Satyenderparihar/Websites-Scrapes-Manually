package com.example.gemini.ui.claude

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.gemini.data.agent.claude.ClaudeProvider
import com.example.gemini.data.agent.claude.ClaudeProviderModel
import com.example.gemini.theme.QuotaAmber
import com.example.gemini.theme.QuotaRed
import com.example.gemini.ui.components.ClaudeAccent

private const val OPENROUTER_BASE_URL = "https://openrouter.ai/api"

/**
 * Custom providers: Anthropic-compatible APIs whose models show up in the Claude model picker next to Claude's own.
 * A chat on one runs with that provider's endpoint and key; settings.json and other chats are not changed.
 */
@Composable
fun ProvidersPage(deps: ClaudeSettingsDeps) {
    val backend = deps.backend
    val context = LocalContext.current
    val providers by backend.providers.collectAsState()
    val settingsEndpoint by backend.settingsEndpoint.collectAsState()
    var editing by remember { mutableStateOf<ClaudeProvider?>(null) }
    var toDelete by remember { mutableStateOf<ClaudeProvider?>(null) }
    var fetching by remember { mutableStateOf<String?>(null) }
    var fetched by remember { mutableStateOf<Pair<ClaudeProvider, List<ClaudeProviderModel>>?>(null) }
    var importing by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { backend.refreshProviders() }
    val muted = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)

    Text("Other Anthropic-compatible APIs", fontWeight = FontWeight.Bold, fontSize = 14.sp)
    Text(
        "OpenRouter, Kimi, DeepSeek… Their models are listed in the chat's model picker under Claude's own. " +
            "A chat on one of them uses its key; your Claude login and other chats stay as they are.",
        fontSize = 11.5.sp, color = muted
    )

    settingsEndpoint?.let { endpoint ->
        Surface(shape = RoundedCornerShape(12.dp), color = QuotaAmber.copy(alpha = 0.1f), border = BorderStroke(1.dp, QuotaAmber.copy(alpha = 0.4f))) {
            Column(Modifier.padding(12.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("settings.json sends every chat to $endpoint", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Text(
                    "Then even chats on Claude's models go there. Move it into a provider so only the chats you choose use it.",
                    fontSize = 11.5.sp, color = muted
                )
                TextButton(enabled = !importing, onClick = {
                    importing = true
                    backend.importSettingsProvider { err ->
                        importing = false
                        Toast.makeText(context, err ?: "Moved into a provider", Toast.LENGTH_SHORT).show()
                    }
                }) { Text(if (importing) "Moving…" else "Move into a provider", color = ClaudeAccent) }
            }
        }
    }

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (providers.none { it.openrouter }) {
            OutlinedButton(onClick = { editing = ClaudeProvider(name = "OpenRouter", base_url = OPENROUTER_BASE_URL) }) { Text("+ OpenRouter") }
        }
        OutlinedButton(onClick = { editing = ClaudeProvider() }) { Text("+ Custom provider") }
    }

    if (providers.isEmpty()) {
        ClaudeCard {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("No custom providers yet", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text("Add one with its base URL and API key, then add or fetch its models.", fontSize = 11.5.sp, color = muted)
            }
        }
    }

    providers.forEach { p ->
        ClaudeCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(p.name, fontWeight = FontWeight.Bold, fontSize = 14.5.sp)
                    Text(p.base_url, fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    p.api_key_hint?.let { Text("Key $it", fontSize = 11.sp, color = muted) }
                }
                IconButton(onClick = { editing = p }) { Icon(Icons.Outlined.Edit, "Edit") }
                IconButton(onClick = { toDelete = p }) { Icon(Icons.Outlined.Delete, "Remove", tint = QuotaRed.copy(alpha = 0.8f)) }
            }
            Spacer(Modifier.size(6.dp))
            Text("Models (${p.models.size})", fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp)
            p.models.forEach { m ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f).padding(vertical = 2.dp)) {
                        Text(m.name?.takeIf { it.isNotBlank() } ?: m.id, fontSize = 13.sp)
                        if (!m.name.isNullOrBlank()) Text(m.id, fontSize = 10.5.sp, fontFamily = FontFamily.Monospace, color = muted)
                    }
                    IconButton(onClick = { backend.saveProvider(p.copy(models = p.models - m)) }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Close, "Remove model", modifier = Modifier.size(16.dp))
                    }
                }
            }
            var newModel by remember(p.id) { mutableStateOf("") }
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = newModel, onValueChange = { newModel = it }, singleLine = true,
                    placeholder = { Text("model id, e.g. moonshotai/kimi-k2", fontSize = 12.sp) },
                    textStyle = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.weight(1f)
                )
                TextButton(enabled = newModel.isNotBlank(), onClick = {
                    backend.saveProvider(p.copy(models = p.models + ClaudeProviderModel(newModel.trim())))
                    newModel = ""
                }) { Text("Add", color = ClaudeAccent) }
            }
            val canFetch = p.openrouter || p.models_url.isNotBlank()
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(enabled = canFetch && fetching == null, onClick = {
                    fetching = p.id
                    backend.fetchProviderModels(p.id, freeOnly = p.openrouter) { res ->
                        fetching = null
                        res.onSuccess { fetched = p to it }
                            .onFailure { Toast.makeText(context, "Cannot fetch models: ${it.message}", Toast.LENGTH_LONG).show() }
                    }
                }) { Text(if (p.openrouter) "Fetch free models" else "Fetch models", color = if (canFetch) ClaudeAccent else muted) }
                if (fetching == p.id) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = ClaudeAccent)
                if (!canFetch) Text("Set a models URL (Edit) to fetch the list", fontSize = 11.sp, color = muted)
            }
        }
    }

    editing?.let { p -> ProviderDialog(p, onDismiss = { editing = null }) { saved, done -> backend.saveProvider(saved) { err -> done(err); if (err == null) editing = null } } }

    toDelete?.let { p ->
        AlertDialog(
            onDismissRequest = { toDelete = null },
            title = { Text("Remove ${p.name}?", fontWeight = FontWeight.Bold) },
            text = { Text("Its key and models are removed. Chats on it have to pick another model.", fontSize = 13.5.sp) },
            confirmButton = { TextButton(onClick = { backend.deleteProvider(p.id); toDelete = null }) { Text("Remove", color = QuotaRed) } },
            dismissButton = { TextButton(onClick = { toDelete = null }) { Text("Cancel") } }
        )
    }

    fetched?.let { (p, models) ->
        FetchedModelsDialog(p, models, onDismiss = { fetched = null }) { picked ->
            backend.saveProvider(p.copy(models = p.models + picked.filter { m -> p.models.none { it.id == m.id } }))
            fetched = null
        }
    }
}

@Composable
private fun ProviderDialog(initial: ClaudeProvider, onDismiss: () -> Unit, onSave: (ClaudeProvider, (String?) -> Unit) -> Unit) {
    val isNew = initial.id.isBlank()
    var name by remember { mutableStateOf(initial.name) }
    var baseUrl by remember { mutableStateOf(initial.base_url) }
    var key by remember { mutableStateOf("") }
    var modelsUrl by remember { mutableStateOf(initial.models_url) }
    var smallModel by remember { mutableStateOf(initial.small_model) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val openRouter = baseUrl.contains("openrouter.ai")
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isNew) "Add provider" else "Edit ${initial.name}", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    baseUrl, { baseUrl = it }, label = { Text("Base URL (Anthropic-compatible)") }, singleLine = true,
                    placeholder = { Text("https://api.example.com/anthropic") }, modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    key, { key = it }, label = { Text("API key") }, singleLine = true,
                    placeholder = { Text(if (isNew) "sk-…" else "unchanged (${initial.api_key_hint ?: "saved"})") },
                    visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth()
                )
                if (!openRouter) {
                    OutlinedTextField(
                        modelsUrl, { modelsUrl = it }, label = { Text("Models URL (optional)") }, singleLine = true,
                        placeholder = { Text("https://api.example.com/v1/models") }, modifier = Modifier.fillMaxWidth()
                    )
                }
                OutlinedTextField(
                    smallModel, { smallModel = it }, label = { Text("Background model (optional)") }, singleLine = true,
                    placeholder = { Text("titles & summaries; default: the chat's model") }, modifier = Modifier.fillMaxWidth()
                )
                Text(
                    if (openRouter) "OpenRouter's model list is fetched automatically (free models)." else "The models URL lets you fetch the provider's model list instead of typing ids.",
                    fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                )
                error?.let { Text(it, fontSize = 12.sp, color = QuotaRed) }
            }
        },
        confirmButton = {
            TextButton(enabled = !saving && name.isNotBlank() && baseUrl.isNotBlank() && (!isNew || key.isNotBlank()), onClick = {
                saving = true
                error = null
                onSave(
                    initial.copy(name = name, base_url = baseUrl, api_key = key.ifBlank { null }, models_url = if (openRouter) "" else modelsUrl, small_model = smallModel)
                ) { err ->
                    saving = false
                    error = err
                }
            }) { Text(if (saving) "Saving…" else "Save", color = ClaudeAccent) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun FetchedModelsDialog(provider: ClaudeProvider, models: List<ClaudeProviderModel>, onDismiss: () -> Unit, onAdd: (List<ClaudeProviderModel>) -> Unit) {
    val existing = remember(provider) { provider.models.map { it.id }.toSet() }
    var picked by remember { mutableStateOf(models.map { it.id }.filter { it !in existing }.toSet()) }
    var query by remember { mutableStateOf("") }
    val shown = models.filter { query.isBlank() || it.id.contains(query, true) || it.name.orEmpty().contains(query, true) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("${provider.name}: ${models.size} models", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                if (models.size > 8) {
                    OutlinedTextField(query, { query = it }, placeholder = { Text("Search") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                }
                Row {
                    TextButton(onClick = { picked = picked + shown.map { it.id }.filter { it !in existing } }) { Text("Select all") }
                    TextButton(onClick = { picked = picked - shown.map { it.id }.toSet() }) { Text("None") }
                }
                LazyColumn(Modifier.heightIn(max = 380.dp)) {
                    items(shown, key = { it.id }) { m ->
                        val added = m.id in existing
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp))
                                .clickable(enabled = !added) { picked = if (m.id in picked) picked - m.id else picked + m.id },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = added || m.id in picked, onCheckedChange = null, enabled = !added,
                                colors = CheckboxDefaults.colors(checkedColor = ClaudeAccent)
                            )
                            Spacer(Modifier.width(6.dp))
                            Column(Modifier.weight(1f).padding(vertical = 4.dp)) {
                                Text(m.name?.takeIf { it.isNotBlank() } ?: m.id, fontSize = 13.sp)
                                Text(if (added) "${m.id} · added" else m.id, fontSize = 10.5.sp, fontFamily = FontFamily.Monospace,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f))
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(enabled = picked.isNotEmpty(), onClick = { onAdd(models.filter { it.id in picked }) }) {
                Text("Add ${picked.size}", color = ClaudeAccent)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
