# Google Flow extension

Package: `extensions/google-flow`; stable ID `google-flow`. It declares **65 tools**: 42 `flow_*` tools and all23 public `deepx_*` names from the reference Chrome MCP server. [flow-tools.json](flow-tools.json) contains the exact complete tool input schemas, including all properties, required fields and descriptions. Native workflow handlers validate arguments as well; schemas do not guarantee a current Google model/UI supports a requested combination.

## Chrome MCP compatibility map

| Original public tool | Implementation |
| --- | --- |
| deepx_status | flow_status |
| deepx_get_options | flow_get_options |
| deepx_generate_image | flow_generate_image (legacy model/parameter normalization) |
| deepx_generate_video | flow_generate_video (legacy model/parameter normalization) |
| deepx_batch_generate | flow_batch_generate |
| deepx_rapid_batch_dispatch | flow_batch_generate with rapid dispatch |
| deepx_analyze_and_breakdown_script | flow_analyze_script |
| deepx_rapid_storyboard_autopilot | flow_storyboard |
| deepx_auto_character_pipeline | flow_character_pipeline |
| deepx_check_status | flow_video_status (single media_id wrapper) |
| deepx_upload_asset | flow_upload_media (single file_path wrapper) |
| deepx_list_characters | flow_list_characters |
| deepx_download_media | flow_download_media |
| deepx_cancel_job | flow_cancel (batch_id/job_id wrapper) |
| deepx_rename_project | flow_rename_project (new_name wrapper; current project default) |
| deepx_open_new_project | flow_create_project |
| deepx_rename_character | flow_rename_character |
| deepx_upload_character | flow_upload_character |
| deepx_generate_character | flow_generate_character |
| deepx_attach_library_reference | flow_attach_references (asset_name wrapper) |
| deepx_attach_references_batch | flow_attach_references (asset_names wrapper) |
| deepx_auto_chain_scene | flow_chain_scene |
| deepx_eval_script | flow_eval_script (code accepted) |

These are behavioral ports through the shared WebView extension API, not a guarantee of every original implementation detail. Chrome desktop-only sidebar/popup commands are deliberately excluded. Calls return this extension's JSON/job contract; do not assume an old Chrome batch_id format.

Additional retained tools: flow_list_models, flow_list_projects, flow_create_project, flow_rename_project, flow_open_project, flow_get_settings, flow_list_media, flow_get_last_media, flow_get_media, flow_upload_media, flow_generate_image, flow_generate_video, flow_get_job, flow_video_status, flow_edit_image, flow_edit_video, flow_extend_video, flow_upscale_image, flow_upscale_video, flow_trash_media, flow_restore_media, flow_rename_media, flow_lock_tab, flow_extract_frame, flow_video_to_gif, flow_combine_videos, flow_create_scene, flow_cancel, flow_status. See each exact schema in the JSON reference.

## Lifecycle and caching

On worker load, only job maps/reference storage helpers and the MCP listener initialize. Flow's page helper is installed lazily when a tool accesses Flow. Tools find an existing Flow tab or create one. Normal generation does not reload a loaded canvas. Changing project or entering an edit/Character Studio route requires navigation; this is distinct from reloading for every prompt.

The first request configures image/video mode, ingredients/frames mode, model, aspect, output count and applicable duration/resolution. A settings fingerprint is cached in the page helper and verified against the actual composer before reuse. For a matching text-only request on the same canvas with no stale reference chips, the warm path inserts its prompt and locates Send in one page evaluation. It skips project lookup, picker preparation and settings traversal. Tab readiness is cached for30 seconds; reference library results for5 seconds on attachment paths. Errors invalidate readiness, and mismatched outgoing requests invalidate settings.

The app still dispatches trusted Android touch for Send. A network guard verifies RPC, model key, aspect, output count and reference/frame IDs before generation goes out. The capture wait runs inside the page, avoiding repeated host roundtrips. Settings/protection checks are retained; physical touch and the live website still impose timing. There is no promise that ten submissions finish in1–2 seconds on every phone.

No credit-balance RPC runs before each generation. max_credits is an optional local budget based on displayed per-request cost; it is not a balance check or guarantee of Google's actual final billing. Generation may fail server-side for insufficient balance.

## Generate ten images

`count` means outputs for **one** prompt and supports1–4. Ten different prompts belong in items/prompts:

```json
{
  "name":"flow_batch_generate",
  "arguments":{
    "mode":"textToImage",
    "model":"Nano Banana 2.1",
    "prompts":["A red paper boat","A blue paper boat","A green paper boat","A yellow paper boat","A white paper boat","A black paper boat","An orange paper boat","A purple paper boat","A pink paper boat","A silver paper boat"],
    "rapid_dispatch":true,
    "pacing_delay_sec":0,
    "wait_seconds":0
  }
}
```

A batch holds one keyboard/zoom lease until its children finish, including the gaps between dry-run submissions. Rapid dispatch queues all submissions. Page configuration/Send is serialized to avoid mixing prompts; Google generation/collection can overlap. With rapid_dispatch=false, concurrent_prompts (1–8) bounds workflows waiting for generation before the next submission. max_retries (0–3) retries recognized pre-send failures only. A possibly submitted request is never automatically retried. Scene result arrays retain input order even if files finish out of order. Up to500 scenes per batch.

`script_text` can supply blank-line-separated prompts; `auto_breakdown:true` uses the ported heuristic analyzer instead. Optional pacing_delay_sec, download_folder and tag_filenames control dispatch spacing and local copies. Media is always cached locally by core generation; auto_download is accepted for Chrome compatibility and does not disable that cache.

## References and character workflows

Pass `references:["media-id-a","media-id-b"]` to reuse generated/uploaded media, without uploading those bytes again. Local paths upload only once per unchanged path/size/modification-time combination per project in the current worker. Uploads use the original DataTransfer path where available. For current XAP controls that require trusted input, the app taps Upload, captures the detached file chooser’s backend node ID and supplies the local file through CDP without opening an Android file dialog. Temporary file-input hooks are restored after preparation. Registered @handles resolve through persistent storage by project; ambiguous cross-project handles require a media ID. Exact library title attachment rejects missing or ambiguous matches. Attachments verify actual chip media IDs.

Video ingredients and start/end frames are separate modes. Use references for ingredients, start_frame/end_frame for frames. Do not combine them. End frame requires start frame. Veo Quality does not support ingredients in this implementation. `flow_get_options` reports the implementation's current supported combinations. Legacy model aliases map to current labels: imagen-3 → Nano Banana2.1, veo-omni → Omni1.1Flash, veo-quality/lite/fast → corresponding Veo3.1 model. Seed selection is unavailable in the current website UI and explicitly rejects instead of pretending to apply it.

- `flow_upload_character`: upload image, rename library asset, persist reusable @handle. It does not create a native Character Studio entry.
- `flow_generate_character`: native Character Studio by default; uses that page’s current configuration, fills the prompt, dispatches trusted touch, waits for candidates, names/saves. As in the original Studio handler, the model argument is not applied on this separate UI route; use native_studio:false to select an image model explicitly. `native_studio:false` uses ordinary image generation then registers the resulting reference asset.
- `flow_character_pipeline`: build several named image references from explicit characters or analyzed entities, optionally follow with video_scenes. Registered IDs survive worker reload; jobs do not.
- `flow_analyze_script`: heuristic language/style/entity detection and scene segmentation, ported from the reference extension. It scans optional asset_dirs (default ~/assets) using listFiles and proposes master reference prompts. It is not an LLM and can miss entities; inspect output or pass explicit characters/references.
- `flow_storyboard`: analyze script, prepare missing entity reference assets, then render scenes. Explicit hero_references/no_references override automatic reference selection. The analyzer augments prompts with camera/style text; it does not preserve input text byte-for-byte.
- `flow_chain_scene` / is_concat:true: download previous video, extract a near-terminal PNG, upload that frame and use it as the next start_frame. Scenes are dependent and therefore sequential. Each next scene uses frames rather than ingredients. Image-mode chaining rejects. This establishes frame continuity; it does not itself concatenate files. Use flow_combine_videos for export concatenation.

Native Character Studio is sensitive to the current Google page layout and available account UI. Candidate/name/save readiness and the saved character tile are checked; failures are reported. Native Studio rejects max_credits on real generation because that UI route cannot enforce the local budget; use native_studio:false when a budget is required. It is separate from ordinary named image-reference generation and must be tested against the actual account UI.

## Jobs, cancellation and dry runs

Generation and larger workflows return a job with job_id, status, stage and eventual media_ids/files. Poll `flow_get_job` with job_id/job_ids and wait_seconds0–50. Workflow parents expose child_job_ids, completed,total,scenes,analysis/characters as applicable. Jobs are memory-only, capped for completed generation history (up to2000 tracked entries before pruning). Save returned media IDs in the calling model/client if needed after reload.

`wait_for_completion:true` on compatibility calls requests a bounded wait (45 seconds), not an unbounded HTTP connection. Poll until done/failed/cancelled. `flow_cancel` recursively cancels the selected workflow's queued/active child jobs; it stops local collection/dispatch and cannot refund or undo a generation already accepted by Google.

`dry_run:true` prepares the real composer and taps Send, but the outgoing-request guard blocks generation before network dispatch and returns request_sent.guard_ok. It may navigate, change settings, attach/upload local references and edit the prompt. It is not read-only. Dry runs do not spend generation credits.

A dependent dry-run storyboard/chain cannot fabricate reference/media IDs for nonexistent outputs: it stops at that dependency and reports next_stage/chain_preview. Character Studio dry run prepares UI but does not tap Send; its result is validated_ui with sent:false, not a network guard proof. These distinctions are intentional.
