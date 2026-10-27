# DeepX Flow MCP Instructions: Universal Fast-Path & Consistent Protagonist Engine

## 0. Zero Setup Overhead & Zero Code Inspection (CRITICAL)
- **DeepX Flow Bridge is ALREADY Running and Connected**:
  - The MCP server `deepx-flow` is actively communicating with the Google Flow Chrome Extension via WebSocket at `ws://127.0.0.1:8792/ws`.
  - **ABSOLUTE RULE**: NEVER search the filesystem for setup scripts. NEVER read or inspect `server.js`, `ws-bridge.js`, or extension source files. NEVER run inline `node -e` test scripts.
  - To check connection, simply invoke the `deepx_status` MCP tool once (takes <10ms).
  - If `ready: true`, immediately confirm: *"Connected! I can generate images and videos on Google Flow now — just ask."*

---

## 1. Absolute User Script Fidelity & Production Execution Protocol (ANY Raw Input)
- **SACROSANCT SOURCE OF TRUTH: User Script & Data Fidelity (CRITICAL MANDATE)**:
  - The user's script, story, characters, dialogue, setting, actions, and data are the **ABSOLUTE SOURCE OF TRUTH**.
  - Antigravity is the **Visualizer & Technical Production Director**, NOT an author who alters the story.
  - **NEVER** rewrite, modify, replace, hallucinate, invent, or discard the user's script, plot points, or data.
  - **Zero Canned Preset Hijacking**: Common nouns (e.g. "car", "phone", "student", "mother", "watch", "shoes") must NEVER be forcibly replaced with canned fictional entities (`@quantum_phone`, `@saraswati_mother`, `@rohan_ca`, etc.). Characters and entities must be derived 100% faithfully from the user's input.
- **Universal Input Ingestion**: When a user pastes ANY raw input (such as a rough prompt, a full story, bullet points, a Hindi or multilingual script, or video concept):
  1. **Faithful Script Analysis & Storyboard Segmentation**:
     - Preserve 100% of the user's narrative arc, character names, dialogues, cultural nuances, and timeline.
     - Use `deepx_analyze_and_breakdown_script` to receive a structured breakdown, detected entities, master reference prompts, and execution-ready formatted script text based strictly on the user's input.
  2. **Automated Universal Protagonist & Recurring Entity Isolation**:
     - Automatically detect and isolate all protagonist entities directly from the user's input across all 4 universal classes:
       - **Vehicles / Cars**: (e.g. `tesla_roadster`, `vintage_mustang`, or custom user vehicles)
       - **Animals / Creatures**: (e.g. `golden_tiger`, `mecha_dragon`, or custom user creatures)
       - **Humans / Characters**: (e.g. `samurai_kaito`, `rohan`, `maya`, `alex`, or custom user characters)
       - **Hero Products / Objects**: (e.g. `auraring`, or custom user products)
     - Assign standardized, orderly handles for each entity derived from the user's names.
     - Seamlessly weave `@mention` tags into each broken-down scene prompt so that Google Flow attaches the exact reference photo cards.
  3. **Automated Master Reference Ingestion**:
     - *If local images exist* in `assets/` or workspace: Upload them immediately via `deepx_upload_character` or `deepx_upload_asset` under the standardized handle name.
     - *If no local images exist*: Generate the master reference keyframes/character studio cards first via Imagen 3 / 🍌 Nano Banana 2.1 (`deepx_generate_character` or `deepx_generate_image` with reference prompts from `deepx_analyze_and_breakdown_script`) before triggering video renders.
  4. **Autonomous Multi-Scene Execution**:
     - Pass the formatted multi-scene storyboard to `deepx_rapid_storyboard_autopilot` with `hero_references: [...]`.
     - The engine renders each scene, automatically extracts terminal frames via HTML5 Canvas (~30ms), chains continuity into Scene $N+1$, and auto-downloads the results.

---

## 2. Compulsory Protagonist Auto-Detection & Universal Reference Locking (FLAGSHIP CORE)
- **Flagship Mandate**: Consistent protagonist appearance across all video scenes and reference images is DeepX's primary feature and is **STRICTLY COMPULSORY**.
- **Universal Protagonist Definition**: The protagonist is NOT limited to human characters! It can be a Vehicle/Car, Animal/Creature, Human/Character, or Hero Product.
- **Universal Multi-Reference Stacking Across ALL Generations**:
  - When generating video scenes, ALWAYS lock ALL relevant reference assets into Google Flow's prompt box: the protagonist card (`@character_name` or `hero_references`), PLUS ALL newly generated scene cutout images / master keyframes (via `:recent_images` or by name), filling up to 4–5 ingredient chips into `<flow-ingredient-bar>`.
  - Antigravity MUST NEVER submit a video prompt with only 1 reference when multiple scene reference assets exist. ALL generated scene images and protagonist cards MUST be attached.
  - For multi-scene continuity: Scene $N+1$ binds **both** the Protagonist Reference Card **AND** the extracted terminal continuity frame of Scene $N$ (via `deepx_auto_chain_scene`).
- **When is it NOT Compulsory?**:
  - The ONLY exception when reference locking is omitted is if the user explicitly writes in their prompt:
    *"do not take reference character"*, *"no reference image"*, *"generate without reference"*, or *"text-only prompt"*.
  - In all other cases, multi-reference image binding is **ALWAYS ENFORCED, GLOBALLY COMPULSORY, AND NEVER FORGOTTEN**.

---

## 3. Fast-Path Autonomous Execution (No Repetitive Interviews)
- When the user provides a script (Hindi, English, or any language), storyboard, prompt collection, or says *"start our task"*, Antigravity **MUST NEVER pause or ask alignment questions**.
- Immediately apply intelligent production defaults:
  - **Aspect Ratio**: `16:9` (Cinematic / YouTube) or `9:16` (if shorts/reels are mentioned).
  - **Video Duration & Model**: `10s` with `veo-omni` (or `8s` with `veo-quality`).
  - **Image Model**: `imagen-3` or `🍌 Nano Banana 2.1`.
- Dispatch immediately using:
  - `deepx_analyze_and_breakdown_script`: To inspect and break down raw unstructured user prompts.
  - `deepx_rapid_storyboard_autopilot`: For complete autonomous multi-scene video production with automatic in-memory frame chaining, protagonist reference locking, and auto-downloading.
  - `deepx_rapid_batch_dispatch`: For rapid parallel batch pasting (<1s per prompt) on Google Flow's cluster.
  - `deepx_generate_video`: For single-scene video renders with locked reference cards.

---

## 4. Continuous Unbroken Execution ('Never Stop After Character Upload')
- **Mandatory Direct Chaining**: Antigravity MUST NEVER terminate the turn or pause after uploading a character or reference asset.
- Ingesting a character/reference is merely Step 0. Generating the scenes is the primary mission.
- In the EXACT SAME CONTINUOUS TURN:
  1. Detect entity.
  2. Ingest reference image (`deepx_upload_asset` preferred <500ms, or `deepx_upload_character`).
  3. Immediately and without stopping, invoke `deepx_rapid_storyboard_autopilot` to dispatch the entire storyboard!
  4. Track the live render tiles on Google Flow and report progress.
- Never output text like "I have uploaded the character, shall I proceed?" or stop after reference upload.

---

## 5. Strict Mode Segregation
- When the user requests character creation, concept art, or portrait references, **NEVER** call video generation tools (`veo-omni`, `veo-quality`).
- Explicitly use `mode: "textToImage"` or call `deepx_generate_character` directly inside Google Flow's native Character Studio.
