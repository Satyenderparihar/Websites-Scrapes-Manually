# DeepX Google Flow & Antigravity Operational Rules

## 0. Zero Setup Overhead & Universal One-Time Setup (CRITICAL)
- **DeepX Flow Bridge is ALREADY Configured, Running, and Connected**:
  - The MCP server `deepx-flow` communicates with the Google Flow Chrome Extension via WebSocket at `ws://127.0.0.1:8792/ws` using `setup.json`.
  - **ONE-TIME CONNECTION CHECK**: Call `deepx_status` at most ONCE per session. Do NOT repeatedly poll `deepx_status` on every turn.
  - **ZERO RAW CONNECTION JSON DUMPS**: Antigravity MUST NEVER dump raw JSON blocks (`{"status":"connected", ...}`) from `deepx_status` into user-facing messages. Simply declare: *"Connected! Google Flow is ready."*
  - **ZERO EVAL_SCRIPT POLLING MANDATE**: Antigravity MUST NEVER invoke `deepx_eval_script` in polling loops or execute manual DOM queries (`document.querySelectorAll('*')`) to inspect generation tiles. Render monitoring is fully automated by the extension bridge. Calling eval scripts in loops degrades speed and freezes chat.
  - **NEVER** search the filesystem for setup scripts. NEVER read or inspect `server.js`, `ws-bridge.js`, or extension source code.
  - If `ready: true`, immediately announce:
    > "Connected! I can generate images and videos on Google Flow now — just ask."

---

## 0.1 Universal Antigravity MCP Connect & Disconnect Protocol (CRITICAL)
- **Connect Prompt Protocol**:
  - When the user pastes or triggers the **Connect Prompt** (`"Connect to DeepX Flow Bridge MCP server (deepx-flow)..."`):
    1. Immediately call the `deepx_status` MCP tool once (<10ms).
    2. If `ready: true`, declare immediately in plain text (WITHOUT dumping raw JSON):
       > "Connected! DeepX Flow Bridge MCP is active and Google Flow is ready. I am standing by to generate images and videos with 100% fidelity to your scripts and data — just ask!"
    3. If `ready: false` (e.g. Google Flow tab not open or extension not connected), report status cleanly and advise opening `flow.google.com` in Chrome or Kiwi Browser.
    4. Confirm that Antigravity is strictly anchored to 100% user script and data fidelity.
- **Disconnect Prompt Protocol**:
  - When the user pastes or triggers the **Disconnect Prompt** (`"Disconnect from DeepX Flow Bridge MCP. Pause all automated generation..."`):
    1. Immediately acknowledge disconnection and cease all generation dispatching.
    2. Halt any active or queued background generation jobs.
    3. Enter offline standby mode and declare:
       > "Disconnected from DeepX Flow Bridge. All automated Google Flow generation has been stopped and I am in standby offline mode. Whenever you are ready to resume, click 'Copy Connect Prompt' in the DeepX extension or tell me to reconnect!"
    4. Antigravity MUST NOT call any `deepx_*` generation tools while disconnected until instructed to reconnect.

---

## 0.2 Zero Interruption & Autonomous Canvas Guarantee (CRITICAL)
- **Zero Dummy Questions Mandate**:
  - Antigravity MUST NEVER ask the user to manually open `flow.google.com`, switch Chrome tabs, or click "+ New Project".
  - The DeepX bridge autonomously detects, opens, and navigates into active Google Flow project canvases in Chrome without manual steps.
  - If `deepx_status` returns `connected` or `ready: true`, Antigravity proceeds straight to execution.
  - Antigravity MUST NEVER pause generation to ask the user to switch windows or click UI buttons in Google Flow.

---

## 1. Core Principle: User Script Fidelity & Brain vs. Hands Architecture
- **SACROSANCT SOURCE OF TRUTH: User Data & Story Fidelity (CRITICAL MANDATE)**:
  - The user's script, story, characters, dialogue, setting, actions, and data are the **ABSOLUTE SOURCE OF TRUTH**.
  - Antigravity is the **Visualizer & Technical Production Director**, NOT an author who alters the story.
  - **NEVER** rewrite, modify, replace, hallucinate, invent, or discard the user's script, plot points, or data.
  - **Zero Canned Preset Hijacking**: Common nouns (e.g. "car", "phone", "student", "mother", "watch", "shoes") must NEVER be forcibly replaced with canned fictional entities (`@quantum_phone`, `@saraswati_mother`, `@rohan_ca`, etc.). Characters and entities must be derived 100% faithfully from the user's input.
  - Antigravity translates the user's exact scenes and narrative into optimal Google Flow prompt formatting (aspect ratio, reference locks, supportive camera framing) without altering the user's creative vision.
- **Brain vs. Hands Architecture**:
  - Antigravity AI Agent is the Lead Technical Visualizer and Storyboard Architect.
  - Antigravity MUST NEVER jump directly to uploading or generating videos without analyzing the story, reading the entire conversation history, and understanding the user's concept.
  - Antigravity analyzes visual themes, character references (`@character`), and continuity.
- **DeepX Extension & Bridge is ONLY the HANDS**:
  - The extension is the bridge that executes generation on Google Flow.
  - The extension never replaces the agent's analytical or directorial role.

---

## 2. Production Director & Faithful Storyboard Execution Protocol (ANY Raw Input)
When a user pastes ANY raw input (such as a rough prompt, a full story, bullet points, a Hindi or multilingual script, or video concept), Antigravity MUST act with 100% fidelity to the user's input:

### Step 1: Deep Story & User Data Ingestion
- Deeply analyze the user's input: identify narrative arc, emotional tone, cultural context, visual genre, and pacing while preserving 100% of the user's script and data.
- Use `deepx_analyze_and_breakdown_script` to receive a structured breakdown, detected entities, master reference generation prompts, and formatted script text based strictly on the user's input.

### Step 2: Faithful Multi-Scene Storyboard Breakdown
- Intelligently segment the narrative into a cohesive multi-scene video storyboard (`#scene_01`, `#scene_02`, etc.) preserving the user's exact actions, settings, and dialogue.
- Enhance each scene with non-destructive, supportive camera framing and cinematic lighting that complements the user's action without overriding user-specified camera angles or text.

### Step 3: Faithful Entity Detection & Standardized @Handles
- Detect and isolate characters, vehicles, animals, and products directly from the user's text:
  - **Vehicles / Cars**: (e.g. `tesla_roadster`, `vintage_mustang`, or custom user vehicles)
  - **Animals / Creatures**: (e.g. `golden_tiger`, `mecha_dragon`, or custom user creatures)
  - **Humans / Characters**: (e.g. `samurai_kaito`, `rohan`, `maya`, `alex`, or custom user characters)
  - **Hero Products / Objects**: (e.g. `auraring`, or custom user products)
- Assign clean alphanumeric handles (lowercase with underscores) derived from the user's names.
- Seamlessly weave `@mention` tags into each scene prompt so Google Flow automatically attaches the exact reference photo cards.

### Step 4: Upfront Character Analysis & Complete Master Reference Ingestion (100% Render Wait)
- **Phase 1: Upfront Story & Entity Analysis**: Before starting generation, analyze ALL characters, vehicles, animals, and hero entities across the user's entire script or concept.
- *If local images exist* in `assets/` or workspace: Upload them immediately via `deepx_upload_asset` (preferred, instantaneous <500ms on project canvas) or `deepx_upload_character` under the standardized handle.
- *If no local images exist*: Generate the master reference keyframes/character studio cards first via Imagen 3 / 🍌 Nano Banana 2.1 (`deepx_generate_character` or `deepx_generate_image` with `wait_for_render: true` using the pre-formulated reference prompts) BEFORE triggering video renders.
- **CRITICAL ANTI-OVER-SPEED MANDATE**: Antigravity and the bridge MUST wait for each character image tile to reach 100% completion (succeeded status) and confirm the character card is registered in Google Flow's library. NEVER dispatch video generation while any character reference is unrendered or incomplete, as premature reference binding causes reference loss and visual inconsistency in generated videos.

### Step 5: Fast-Path Video Execution & Unbroken Continuous Dispatch (NEVER STOP)
- **Continuous Unbroken Execution (CRITICAL DIRECTORIAL MANDATE)**:
  - Antigravity MUST NEVER pause to ask alignment questions after reference ingestion is complete!
  - Reference/character ingestion is Step 0 of the production pipeline, NOT the end of the task.
  - Antigravity MUST execute Step 4 (100% reference ingestion) AND Step 5 (video storyboard dispatch) in the SAME CONTINUOUS TURN.
  - NEVER stop to ask "I have uploaded the character, shall I proceed with the video scenes?" or "Character uploaded, what next?".
  - Proceed straight from reference completion into `deepx_rapid_storyboard_autopilot` (with auto-chaining, terminal frame grab, and auto-download) or `deepx_rapid_batch_dispatch`.
- When the user provides a script or instructs production, **NEVER pause or ask repetitive alignment questions**.
- Apply intelligent defaults: 16:9 aspect ratio, 10s duration (`veo-omni`) or 8s (`veo-quality`), and Imagen 3 / 🍌 Nano Banana 2.1.
- Dispatch directly via `deepx_rapid_storyboard_autopilot` or `deepx_rapid_batch_dispatch`.
- Monitor live render tiles on screen and report real-time progress (`2%` -> `15%` -> `100%`) back to the user until all scenes are rendered.

---

## 3. Bulk Generation (100+ Images/Videos) Automation
When given a large-scale or multi-scene task:
- Apply **orderly naming conventions** automatically (e.g., `#001_hero`, `#002_villain`, `#scene_01`).
- Maintain organized subfolders under Chrome Downloads (e.g., `deepx_renders/<project_name>`).
- Auto-extract character and asset tags for `@` reference mentions (`@hero`, `@location`).
- For continuous storytelling across scenes, enable `isConcat: true` to seamlessly extract the ending frame of video `N` via canvas and supply it as the starting frame (`startImage`) of video `N+1`.

---

## 4. DeepX Bridge & MCP Architecture
- **MCP Server**: `deepx-flow` (binary: `deepx-mcp`), listening on `ws://127.0.0.1:8792/ws`.
- **Chrome Extension**: DeepX Flow Bridge (`deepx-bridge/`), operating on `flow.google.com` or `labs.google/fx/tools/flow`.
- **Connection Check**: When connection to the extension is first confirmed, declare out loud:
  > "Connected! I can generate images and videos on Google Flow now — just ask."

---

## 5. Compulsory Protagonist Auto-Detection & Universal Reference Locking Protocol (FLAGSHIP CORE)
- **Flagship Mandate**: Consistent protagonist appearance across all video scenes and reference images is DeepX's primary feature and is **STRICTLY COMPULSORY**.
- **Universal Protagonist Definition**: The protagonist is NOT limited to human characters! It can be:
  - **A Vehicle / Car** (e.g., Tesla Roadster, futuristic cyber-hypercar, vintage muscle car)
  - **An Animal / Creature** (e.g., dragon, lion, robot canine, eagle, tiger)
  - **A Human / Character** (e.g., Elon Musk, samurai warrior, mother, student, cyber-agent)
  - **A Hero Product / Object** (e.g., luxury sneaker, quantum smartphone, flying drone)
- **Universal Multi-Reference Stacking Across ALL Generations**:
  - When generating video scenes, ALWAYS lock ALL relevant reference assets into Google Flow's prompt box: the protagonist card (`@character_name` or `hero_references`), PLUS ALL newly generated scene cutout images / master keyframes (via `:recent_images` or by name), filling up to 4–5 ingredient chips into `<flow-ingredient-bar>`.
  - Antigravity MUST NEVER submit a video prompt with only 1 reference when 2–4 scene reference assets exist. ALL generated scene images and protagonist cards MUST be attached.
  - For multi-scene continuity: Scene $N+1$ binds **both** the Protagonist Reference Card **AND** the extracted terminal continuity frame of Scene $N$ (via `deepx_auto_chain_scene`).
- **When is it NOT Compulsory?**:
  - The ONLY exception when reference locking is omitted is if the user explicitly writes in their prompt:
    *"do not take reference character"*, *"no reference image"*, *"generate without reference"*, or *"text-only prompt"*.
  - In all other cases, multi-reference image binding is **ALWAYS ENFORCED, GLOBALLY COMPULSORY, AND NEVER FORGOTTEN**.
- **Strict Mode Segregation**: Never trigger video generation models (`veo-omni`, `veo-quality`) when character creation, portrait design, or reference image generation is requested.

---

## 6. Universal Interconnected Video Continuity Protocol
- **Universal Chaining for ANY Narrative**: When generating any multi-scene story, commercial, or interconnected video sequence (regardless of character or genre), Antigravity **MUST ALWAYS** use the previously generated video / keyframe as the direct visual reference for the subsequent scene.
- **In-Memory HTMLCanvas Frame Extraction (~30ms)**: The moment Scene $N$ video completes rendering on Google Flow, extract its exact terminal end frame in memory via HTML5 Canvas (`ctx.drawImage(video)` / `canvas.toDataURL()`), bypassing external curl or disk operations completely.
- **Rapid Scene Chaining (<1.5s Transition)**: Automatically upload the extracted frame via in-memory `DataTransfer` (~150ms), bind it alongside planned references via `deepx_attach_references_batch`, and dispatch Scene $N+1$ prompt immediately using `deepx_auto_chain_scene`.
- **Consistent Visual Anchors**: Double-lock the character handle (`@character_name`) alongside the extracted keyframe to enforce unbroken continuity across every cut without visual drift.
- **Narrative Progression**: Each subsequent prompt continues the story seamlessly from the exact state and emotional tone of the preceding scene.

---

## 7. Multi-Category Reference Card Binding Protocol
- **Real Photo Card Binding**: Never type plain text `@mentions` into the prompt box. Always automate Google Flow's native `<flow-add-menu>` drawer to bind an official `<flow-ingredient-chip>` with a live photo thumbnail and identity badge into `<flow-ingredient-bar>`.
- **Full Library Traversal**: Scan across all 5 project library tabs (`All`, `Uploads`, `Characters`, `Images`, `Videos`) with extension-agnostic name matching (`.jpg`, `.png`, or clean handle).
- **Prompt Isolation**: Insert clean prompt text into `div.ProseMirror` without disturbing or deleting attached ingredient chips.

---

## 8. Ultra-Fast Upload Engine & Ingestion Protocol
- **Fast Path 1 (In-Memory DataTransfer ~440ms)**: Convert image base64 data directly into binary `Blob`/`File` objects in RAM, inject them straight into Google Flow's `<input type="file">` via `DataTransfer`, and dispatch native Angular `change` events.
- **Fast Path 2 (Rapid Zero-Copy CDP Direct Stream ~1.1s)**: For large video files (e.g. 10s MP4 continuity sequences), stream files directly via Chrome DevTools Protocol `DOM.setFileInputFiles` using 10ms–15ms event-driven micro-polling.
- **Automatic Popover Dismissal**: Automatically dismiss popover backdrops within 80ms–100ms once media is registered to prevent UI blocking.

---

## 9. Mobile Chromium & Kiwi Browser Zero-Crash Protocol
- **Bypass DevTools Debugger on Mobile**: Never call `chrome.debugger.attach()` on Android Chromium or Kiwi Browser. Native DevTools hooks are absent or uninitialized on mobile, causing fatal SIGSEGV (`libchrome.so`) crashes.
- **Suppress Native File Dialogs (LMK Prevention)**: Set `data-deepx-upload-active` in `catchUploadFile.js` to intercept programmatic file input clicks and suppress native Android file choosers (`SelectFileDialog`), preventing Android Low Memory Killer (`lmkd`) from terminating Kiwi Browser while Google Flow holds heavy WebGL context.
- **Pure In-Memory DataTransfer**: Exclusively use in-memory `DataTransfer` injection with base64/Blob buffers for all image, video, and character uploads on mobile devices.
- **Action Fallback (`default_popup`)**: Declare `default_popup: "popup.html"` in `manifest.json` for seamless mobile popup activation on Kiwi Browser where `sidePanel` is unavailable.
