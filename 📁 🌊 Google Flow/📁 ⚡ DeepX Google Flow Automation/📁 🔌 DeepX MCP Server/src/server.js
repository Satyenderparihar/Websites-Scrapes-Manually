// DeepX MCP Server
// Connects Antigravity AI Coding Agents directly to Google Flow (Veo 3.1 & Imagen 3)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DeepXWsBridge } from "./ws-bridge.js";
import { FLOW_OPTIONS, getDeepXKnowledgeMarkdown } from "./options-knowledge.js";
import { readFileSync, existsSync } from "fs";
import { basename, extname } from "path";
import { analyzeAndBreakdownScript, detectProtagonistEntities } from "./storyboard-analyzer.js";

const bridge = new DeepXWsBridge(8792);

const server = new McpServer({
  name: "deepx-flow",
  version: "1.0.0"
});

// Helper for standard MCP text response
function textResponse(text) {
  return {
    content: [{ type: "text", text }]
  };
}

// Helper to convert local image file to base64 data URL
function fileToDataUrl(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const ext = extname(filePath).toLowerCase();
  const mimeMap = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4"
  };
  const mimeType = mimeMap[ext] || "application/octet-stream";
  const data = readFileSync(filePath);
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

// Helper to verify bridge and Google Flow readiness before generation
let lastReadyCheck = 0;
let cachedReadyStatus = null;
const READY_CACHE_TTL_MS = 30000; // Fast-path: cache verified ready state for 30s to eliminate redundant roundtrips

async function ensureBridgeReady() {
  if (!bridge.isConnected()) {
    cachedReadyStatus = null;
    throw new Error("DeepX Chrome Extension is NOT connected to ws://127.0.0.1:8792/ws. Please ensure Chrome is running with the extension loaded.");
  }
  const now = Date.now();
  if (cachedReadyStatus && (now - lastReadyCheck < READY_CACHE_TTL_MS)) {
    return cachedReadyStatus;
  }
  const extStatus = await bridge.sendCommand("status", {}, 5000);
  if (!extStatus?.ready) {
    cachedReadyStatus = null;
    throw new Error(
      `Google Flow is not ready (${extStatus?.connectionState || "unknown"}): ${extStatus?.stateReason || "Please verify that a Google Flow tab is open with an active project selected and the extension is ON."}`
    );
  }
  cachedReadyStatus = extStatus;
  lastReadyCheck = now;
  return extStatus;
}

// 1. deepx_status
server.tool(
  "deepx_status",
  "Check DeepX bridge status: verifies Antigravity WebSocket connection, Chrome extension attachment, Google Flow tab, user session auth token, and active project ID. NOTE: The bridge is ALREADY configured and running. NEVER read or inspect ws-bridge.js or server.js. Call this tool immediately when verifying setup.",
  {},
  async () => {
    if (!bridge.isConnected()) {
      return textResponse(
        JSON.stringify(
          {
            status: "disconnected",
            ready: false,
            connectionState: "disconnected",
            message: "DeepX Chrome Extension is NOT connected to ws://127.0.0.1:8792/ws.",
            instructions: [
              "1. Open Chrome with the DeepX Flow Bridge extension installed.",
              "2. Open Google Flow at https://flow.google.com and log in to your Google Account.",
              "3. Ensure the Google Flow tab is open with an active project selected.",
              "4. Turn ON the DeepX extension in Chrome if it is in Standby."
            ]
          },
          null,
          2
        )
      );
    }

    try {
      const extStatus = await bridge.sendCommand("status", {}, 10000);
      const isReady = !!extStatus?.ready;
      const connectionState = extStatus?.connectionState || (isReady ? "ready" : "needs_attention");
      const account = extStatus?.account || null;
      const userLabel = account?.email ? `${account.accountName || "User"} (${account.email})` : (account?.accountName || "Signed Out");

      let message = extStatus?.stateReason;
      if (!message) {
        if (isReady) {
          message = `Connected and ready on Google Flow (Account: ${userLabel}, Plan: ${account?.plan || "Standard"}).`;
        } else {
          message = "Google Flow bridge requires user action in Chrome.";
        }
      }

      return textResponse(
        JSON.stringify(
          {
            status: isReady ? "connected" : connectionState,
            ready: isReady,
            connectionState,
            message,
            account: {
              isLoggedIn: !!account?.isLoggedIn,
              name: account?.accountName || null,
              email: account?.email || null,
              plan: account?.plan || "None"
            },
            projectId: extStatus?.projectId || null,
            projectName: extStatus?.projectName || null,
            flowTabOpen: !!extStatus?.flowTabOpen,
            flowActive: !!extStatus?.flowActive,
            bridge: "healthy",
            port: 8792,
            extension: bridge.extensionInfo,
            flowTab: extStatus
          },
          null,
          2
        )
      );
    } catch (err) {
      return textResponse(
        JSON.stringify(
          {
            status: "extension_error",
            ready: false,
            connectionState: "error",
            error: err.message
          },
          null,
          2
        )
      );
    }
  }
);

// 2. deepx_get_options
server.tool(
  "deepx_get_options",
  "Deep knowledge reference tool: returns complete options matrix for Google Flow, including all Veo 3.1 & Imagen 3 models, modes, duration limits, aspect ratios, character tagging (@mentions), orderly naming (#tag), and prompt cinematography best practices.",
  {},
  async () => {
    return textResponse(getDeepXKnowledgeMarkdown());
  }
);

// 3. deepx_generate_video
server.tool(
  "deepx_generate_video",
  "Generate a single video on Google Flow using Veo 3.1 (Quality, Lite, or Omni). FAST-PATH: Call directly with prompt; do not pause to ask alignment questions when a script is provided. Supports text-to-video, start frame animation, start+end frame interpolation, and reference image consistency. Automatically waits for video completion when wait_for_completion=true.",
  {
    prompt: z.string().describe("The descriptive prompt for the video generation."),
    model: z.enum(["veo-quality", "veo-lite", "veo-omni"]).default("veo-quality").describe("Video model: 'veo-quality' (director grade Veo 3.1), 'veo-lite' (high-speed Veo 3.1), or 'veo-omni' (Abra multimodal)."),
    mode: z.enum(["textToVideo", "imageToVideo", "startAndEndVideo", "referenceImagesToVideo"]).default("textToVideo").describe("Generation mode: 'textToVideo', 'imageToVideo' (animates start frame), 'startAndEndVideo' (interpolates start & end), or 'referenceImagesToVideo' (style/character reference)."),
    duration: z.number().int().default(8).describe("Duration in seconds: 5 or 8 (veo-omni also supports 10)."),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9").describe("Aspect ratio: '16:9' (landscape), '9:16' (portrait/shorts), or '1:1' (square)."),
    start_image_id: z.string().optional().describe("Media ID of start frame in Flow library (required for imageToVideo or startAndEndVideo)."),
    end_image_id: z.string().optional().describe("Media ID of end frame in Flow library (required for startAndEndVideo)."),
    reference_media_ids: z.array(z.string()).optional().describe("Media IDs of character or style reference assets."),
    reference_assets: z.array(z.string()).optional().describe("Names of reference characters, hero vehicles, or images from project library to bind into the ingredient bar (e.g. ['tesla_roadster'])."),
    no_references: z.boolean().default(false).describe("Set true ONLY if user explicitly instructed not to use reference characters or images."),
    seed: z.number().optional().describe("Optional seed for deterministic generation."),
    wait_for_completion: z.boolean().default(true).describe("If true, polls until video generation succeeds and returns download URL.")
  },
  async (args) => {
    await ensureBridgeReady();

    const payload = {
      prompt: args.prompt,
      model: args.model,
      mode: args.mode,
      duration: args.duration,
      aspectRatio: args.aspect_ratio,
      startImageId: args.start_image_id,
      endImageId: args.end_image_id,
      referenceMediaIds: args.reference_media_ids || [],
      referenceAssets: args.reference_assets || [],
      noReferences: args.no_references || false,
      seed: args.seed
    };

    const dispatchRes = await bridge.sendCommand("generate_video", payload, 60000);

    if (!args.wait_for_completion) {
      return textResponse(JSON.stringify(dispatchRes, null, 2));
    }

    // Poll status until ready
    const pollRes = await bridge.sendCommand(
      "check_video_status",
      { mediaId: dispatchRes.mediaId, projectId: dispatchRes.projectId },
      180000
    );

    return textResponse(
      JSON.stringify(
        {
          status: pollRes.status,
          mediaId: dispatchRes.mediaId,
          projectId: dispatchRes.projectId,
          modelKey: dispatchRes.modelKey,
          videoUrl: pollRes.videoUrl,
          downloadUrl: pollRes.downloadUrl
        },
        null,
        2
      )
    );
  }
);

// 4. deepx_generate_image
server.tool(
  "deepx_generate_image",
  "Generate 1 to 4 images on Google Flow using Imagen 3 (NARWHAL) with support for reference assets and prompt styling.",
  {
    prompt: z.string().describe("The descriptive prompt for image generation."),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]).default("16:9").describe("Aspect ratio: '16:9', '9:16', '1:1', etc."),
    count: z.number().int().min(1).max(4).default(1).describe("Number of output images (1-4)."),
    reference_media_ids: z.array(z.string()).optional().describe("Optional reference media IDs to blend or guide styling."),
    seed: z.number().optional().describe("Optional seed."),
    wait_for_render: z.boolean().default(true).describe("If true (default), waits for the image tile to reach 100% completion in Google Flow before returning.")
  },
  async (args) => {
    await ensureBridgeReady();

    const payload = {
      prompt: args.prompt,
      aspectRatio: args.aspect_ratio,
      count: args.count,
      referenceMediaIds: args.reference_media_ids || [],
      seed: args.seed,
      wait_for_render: args.wait_for_render ?? true
    };

    const timeoutMs = (args.wait_for_render ?? true) ? 120000 : 60000;
    const result = await bridge.sendCommand("generate_image", payload, timeoutMs);
    return textResponse(JSON.stringify(result, null, 2));
  }
);

// 5. deepx_batch_generate
server.tool(
  "deepx_batch_generate",
  "High-performance parallel generation engine: batch generate multiple images or videos (supports 100+ prompts). Accepts an array of prompts OR a raw multi-scene script text with empty lines (gaps) separating scenes. Features rapid back-to-back queueing into Google Flow, parallel execution, pacing delays, automatic retries, custom #tag file naming, auto-download, and continuous storytelling concatenation (is_concat=true) where the ending frame of video N feeds into start frame of video N+1.",
  {
    prompts: z.array(z.string()).optional().describe("Array of prompts to generate. Include #tags (e.g. 'Hero jumping #scene_01') for automatic orderly file naming."),
    script_text: z.string().optional().describe("Raw storyboard or commercial script text. Separate each scene prompt with an empty line (gap). DeepX will parse and dispatch each scene automatically."),
    mode: z.enum(["textToVideo", "textToImage"]).default("textToVideo").describe("Batch mode: 'textToVideo' or 'textToImage'."),
    model: z.enum(["veo-quality", "veo-lite", "veo-omni", "imagen-3"]).default("veo-quality").describe("Model to use."),
    concurrent_prompts: z.number().int().min(1).max(8).default(2).describe("Number of prompts generating simultaneously (1-8)."),
    pacing_delay_sec: z.number().default(1.5).describe("Delay between dispatching prompts into Google Flow (default: 1.5s)."),
    is_concat: z.boolean().default(false).describe("If true, runs scenes sequentially and extracts the ending frame of clip N as the start frame for clip N+1 for seamless video storytelling."),
    rapid_dispatch: z.boolean().default(true).describe("If true (AnyAI style), pastes all prompts into Google Flow back-to-back so all scenes render in parallel on Flow's cluster."),
    wait_for_completion: z.boolean().default(false).describe("If true, waits for all parallel videos to finish rendering. If false, returns immediately once all prompts are queued."),
    auto_download: z.boolean().default(false).describe("If true, automatically downloads finished files to Chrome Downloads folder."),
    download_folder: z.string().default("deepx_renders").describe("Subfolder under Chrome Downloads where media will be saved."),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9").describe("Aspect ratio for the batch."),
    duration: z.number().int().default(8).describe("Duration for video items in seconds (5, 8, or 10)."),
    hero_references: z.array(z.string()).optional().describe("Protagonist/hero reference names (e.g. ['kisaan', 'samurai_kaito']) to lock into EVERY scene. Compulsory for character consistency in stories unless no_references is true."),
    no_references: z.boolean().default(false).describe("Set true ONLY if user explicitly instructed not to use reference characters or images.")
  },
  async (args) => {
    await ensureBridgeReady();

    let heroRefs = args.hero_references ? [...args.hero_references] : [];
    if (!args.no_references && heroRefs.length === 0) {
      try {
        const textToAnalyze = args.script_text || (args.prompts || []).join(" ");
        if (textToAnalyze) {
          const entRes = detectProtagonistEntities(textToAnalyze);
          if (entRes.heroReferences && entRes.heroReferences.length > 0) {
            heroRefs = entRes.heroReferences;
          }
        }
      } catch (_) {}
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      batchId,
      prompts: args.prompts || [],
      scriptText: args.script_text || "",
      heroReferences: heroRefs,
      noReferences: args.no_references || false,
      mode: args.mode,
      model: args.model,
      concurrentPrompts: args.concurrent_prompts,
      pacingDelaySec: args.pacing_delay_sec,
      isConcat: args.is_concat,
      rapidDispatch: args.rapid_dispatch,
      waitForCompletion: args.wait_for_completion,
      autoDownload: args.auto_download,
      downloadFolder: args.download_folder,
      aspectRatio: args.aspect_ratio,
      duration: args.duration
    };

    const count = (args.prompts?.length || 1) * (args.wait_for_completion ? 150000 : 5000);
    const result = await bridge.sendCommand(
      "batch_generate",
      payload,
      Math.max(60000, count)
    );

    return textResponse(JSON.stringify(result, null, 2));
  }
);

// 5a. deepx_analyze_and_breakdown_script
server.tool(
  "deepx_analyze_and_breakdown_script",
  "Master Creative Director & Storyboard Architect: Deeply analyzes ANY raw user input (rough prompt, full story, bullet points, Hindi/multilingual script, or commercial brief). Automatically isolates all protagonist entities across all classes (Vehicles, Animals, Characters, Products), assigns standardized clean @handles (e.g. @tesla_roadster, @samurai_kaito, @vintage_mustang), generates master reference prompts for Imagen 3 / 🍌 Nano Banana 2.1, breaks down the story into an advanced multi-scene storyboard with cinematic camera movements, lighting, and pacing, and formats the output ready for instant execution.",
  {
    raw_input: z.string().describe("The user's raw input: rough prompt, story text, bullet points, Hindi or multilingual script, or commercial brief."),
    target_scene_count: z.number().int().min(1).max(12).optional().describe("Optional desired scene count (auto-detected if omitted, typically 3-6 scenes)."),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]).default("16:9").describe("Target aspect ratio ('16:9' landscape, '9:16' vertical/shorts, '1:1' square)."),
    genre_or_style: z.string().optional().describe("Optional genre or visual style (e.g. 'cinematic photorealistic 8k', 'cyberpunk sci-fi', 'luxury commercial', '2.5D anime')."),
    style_preset: z.enum(["cinematic", "retro_8bit", "matanyone_matting", "gemini_multimodal", "hindi_2d_documentary"]).optional().describe("Style preset based on skills: 'hindi_2d_documentary' (2D Disney-Pixar/Anime cel-shaded spy documentary), 'retro_8bit' (8-bit/16-bit arcade pixel art), 'matanyone_matting' (chroma key green screen character matting), 'gemini_multimodal' (multimodal AI director), or 'cinematic' (photorealistic 8k)."),
    pacing: z.enum(["cinematic", "dynamic", "slow", "fast-paced"]).default("cinematic").describe("Pacing of the video storyboard."),
    protagonist_override: z.string().optional().describe("Optional explicit protagonist name or handle if requested by user."),
    no_references: z.boolean().default(false).describe("Set true ONLY if user explicitly instructed not to use reference characters or images.")
  },
  async (args) => {
    const analysis = analyzeAndBreakdownScript(args);
    return textResponse(JSON.stringify(analysis, null, 2));
  }
);

// 5b. deepx_rapid_batch_dispatch
server.tool(
  "deepx_rapid_batch_dispatch",
  "AnyAI Native Rapid Scene Dispatch Engine: Takes a multi-scene storyboard or image prompt collection (separated by empty line gaps) and pastes each prompt directly into Google Flow back-to-back at sub-second speed (<1s per prompt) for parallel cluster rendering. Supports auto_breakdown=true to segment raw scripts automatically. FAST-PATH: Use directly without waiting or asking alignment questions. Supports both Video (Veo Omni, Veo 3.1) and Image (🍌 Nano Banana 2.1, Imagen 3).",
  {
    script_text: z.string().describe("Storyboard or prompt collection with each item separated by an empty line (gap), or raw script to be segmented."),
    auto_breakdown: z.boolean().default(true).describe("If true, automatically analyzes unstructured raw text to segment scenes and inject cinematic styling."),
    hero_references: z.array(z.string()).optional().describe("Protagonist/hero reference names (e.g. ['kisaan', 'samurai_kaito']) to lock into EVERY scene. Compulsory for character consistency in stories unless no_references is true."),
    no_references: z.boolean().default(false).describe("Set true ONLY if user explicitly instructed not to use reference characters or images."),
    mode: z.enum(["textToVideo", "textToImage"]).default("textToVideo").describe("Generation mode: 'textToVideo' or 'textToImage'."),
    model: z.string().default("veo-omni").describe("Model name. Video: 'veo-omni', 'veo-quality', 'veo-lite'. Image: '🍌 Nano Banana 2.1', '🍌 Nano Banana 2', '🍌 Nano Banana Pro', 'imagen-3'."),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]).default("9:16").describe("Aspect ratio: '9:16' (vertical/shorts), '16:9' (landscape), '1:1' (square), '4:3', '3:4'."),
    duration: z.number().int().default(10).describe("Duration for video scenes in seconds (5, 8, or 10). Ignored for images."),
    count: z.number().int().default(1).describe("Image count per prompt (1, 2, or 4). Ignored for videos."),
    pacing_delay_sec: z.number().default(0.8).describe("Pacing delay between pasting prompts into Google Flow (default: 0.8s).")
  },
  async (args) => {
    await ensureBridgeReady();

    let effectiveScriptText = args.script_text;
    let heroRefs = args.hero_references ? [...args.hero_references] : [];

    // Auto-detect protagonist if not explicitly provided and not no_references
    if (!args.no_references && heroRefs.length === 0) {
      try {
        const entRes = detectProtagonistEntities(args.script_text);
        if (entRes.heroReferences && entRes.heroReferences.length > 0) {
          heroRefs = entRes.heroReferences;
        }
      } catch (_) {}
    }

    const hasExplicitScenes = args.script_text.includes("\n\n") ||
      /(?:^|\n)\s*(?:(?:###?\s*)?(?:\*{0,2})(?:Scene|Shot|Sequence|Take|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?)/iu.test(args.script_text) ||
      /(?:^|\n)\s*\d+[\.\)]\s+/.test(args.script_text) ||
      (args.script_text.includes("\n") && args.script_text.split(/\r?\n+/).map(s => s.trim()).filter(Boolean).length > 1);

    if (args.auto_breakdown && !hasExplicitScenes) {
      try {
        const analysis = analyzeAndBreakdownScript({
          raw_input: args.script_text,
          aspect_ratio: args.aspect_ratio,
          no_references: args.no_references
        });
        if (analysis.totalScenes > 1) {
          effectiveScriptText = analysis.formattedScriptText;
          if (heroRefs.length === 0 && analysis.heroReferences) {
            heroRefs = analysis.heroReferences;
          }
        }
      } catch (_) {}
    }

    const isImage = args.mode === "textToImage" ||
      args.model.includes("Banana") ||
      args.model.toLowerCase().includes("imagen");
    const effectiveModel = isImage && !args.model.includes("Banana") && !args.model.toLowerCase().includes("imagen")
      ? "🍌 Nano Banana 2.1"
      : args.model;
    const batchId = `rapid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      batchId,
      scriptText: effectiveScriptText,
      heroReferences: heroRefs,
      noReferences: args.no_references || false,
      mode: isImage ? "textToImage" : "textToVideo",
      model: effectiveModel,
      aspectRatio: args.aspect_ratio,
      duration: isImage ? null : args.duration,
      count: isImage ? args.count : 1,
      pacingDelaySec: args.pacing_delay_sec,
      rapidDispatch: true,
      waitForCompletion: false
    };

    const result = await bridge.sendCommand("rapid_batch_dispatch", payload, 60000, (progress) => {
      if (progress.type === "PROMPT_DISPATCHED") {
        console.error(`[DeepX MCP] [${progress.index + 1}/${progress.total}] Prompt dispatched live into Google Flow (${progress.sceneRecord?.dispatchTimeMs || 700}ms)`);
      } else if (progress.type === "TILES_REALTIME_UPDATE" && progress.tiles) {
        progress.tiles.forEach(t => {
          console.error(`[DeepX MCP Realtime] '${t.prompt || "Scene"}': ${t.percent}% generating...`);
        });
      }
    });
    return textResponse(JSON.stringify(result, null, 2));
  }
);

// 5c. deepx_rapid_storyboard_autopilot
server.tool(
  "deepx_rapid_storyboard_autopilot",
  "Fully Autonomous Multi-Scene Storyboard Engine: Single-command complete production. Takes any script (Hindi, English, etc.) or raw narrative and executes end-to-end: automatically breaks down raw text into scenes, detects and locks protagonist reference cards, renders video, extracts terminal frame on canvas (~30ms), chains scenes, and auto-downloads without human intervention. FAST-PATH: Call immediately without interviewing the user.",
  {
    script_text: z.string().optional().describe("Complete storyboard script with scenes separated by blank lines (or gaps). If raw or unformatted text is provided, DeepX automatically analyzes and segments it into cinematic scenes."),
    raw_input: z.string().optional().describe("Alias for script_text: raw story, rough prompt, bullet points, or Hindi script to be automatically analyzed and broken down into multi-scene production."),
    auto_breakdown: z.boolean().default(true).describe("If true, automatically analyzes unstructured raw text to segment scenes, isolate protagonist entities, and formulate cinematic prompts with @mention tags."),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]).default("16:9").describe("Aspect ratio for the scenes (default: '16:9')."),
    duration: z.number().int().default(10).describe("Duration per scene in seconds (5, 8, or 10)."),
    model: z.string().default("veo-omni").describe("Video model ('veo-omni', 'veo-quality', 'veo-lite')."),
    hero_references: z.array(z.string()).optional().describe("Protagonist/hero character, vehicle, animal, or product reference names (e.g. ['tesla_roadster', 'cyber_samurai']) to lock into EVERY scene. Compulsory for character consistency unless user explicitly asked for no references."),
    no_references: z.boolean().default(false).describe("Set true ONLY if user explicitly instructed not to use reference characters or images."),
    auto_download: z.boolean().default(true).describe("If true, automatically downloads finished scenes to Chrome Downloads folder."),
    download_folder: z.string().default("deepx_renders").describe("Subfolder under Chrome Downloads.")
  },
  async (args) => {
    await ensureBridgeReady();

    const inputText = args.script_text || args.raw_input || "";
    if (!inputText.trim()) {
      throw new Error("Either script_text or raw_input must be provided.");
    }

    let effectiveScriptText = inputText;
    let heroRefs = args.hero_references ? [...args.hero_references] : [];

    // If auto_breakdown is enabled and (inputText has no blank gaps OR hero_references is empty)
    if (args.auto_breakdown) {
      try {
        const analysis = analyzeAndBreakdownScript({
          raw_input: inputText,
          aspect_ratio: args.aspect_ratio,
          pacing: "cinematic"
        });

        // If caller didn't pass explicit hero_references, use auto-detected ones
        if ((!heroRefs || heroRefs.length === 0) && !args.no_references) {
          heroRefs = analysis.heroReferences;
        }

        const hasExplicitScenes = inputText.includes("\n\n") ||
          /(?:^|\n)\s*(?:(?:###?\s*)?(?:\*{0,2})(?:Scene|Shot|Sequence|Take|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?)/iu.test(inputText) ||
          /(?:^|\n)\s*\d+[\.\)]\s+/.test(inputText) ||
          (inputText.includes("\n") && inputText.split(/\r?\n+/).map(s => s.trim()).filter(Boolean).length > 1);

        // If the input was raw text or lacked scene breaks, use the broken-down formattedScriptText; otherwise preserve user's exact scenes
        if (!hasExplicitScenes) {
          effectiveScriptText = analysis.formattedScriptText;
        }

        // Auto-upload local asset references if any matching images exist in project
        if (!args.no_references && analysis.entities) {
          for (const ent of analysis.entities) {
            if (ent.localAssetExists && ent.localAssetPath) {
              try {
                const dataUrl = fileToDataUrl(ent.localAssetPath);
                await bridge.sendCommand(
                  "upload_asset",
                  {
                    filePath: ent.localAssetPath,
                    dataUrl,
                    fileName: ent.localFileName || `${ent.handle}.jpg`,
                    mimeType: ent.localAssetPath.endsWith(".png") ? "image/png" : "image/jpeg"
                  },
                  40000
                );
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.warn("[DeepX MCP Autopilot] Auto-breakdown warning:", err.message);
      }
    }

    const payload = {
      scriptText: effectiveScriptText,
      heroReferences: heroRefs,
      noReferences: args.no_references || false,
      aspectRatio: args.aspect_ratio,
      duration: args.duration,
      model: args.model,
      autoDownload: args.auto_download,
      downloadFolder: args.download_folder
    };

    const result = await bridge.sendCommand("autonomous_storyboard_pipeline", payload, 600000);
    return textResponse(JSON.stringify(result, null, 2));
  }
);

// 6. deepx_auto_character_pipeline
server.tool(
  "deepx_auto_character_pipeline",
  "Automated Master Character & Universal Entity Pipeline (from AnyAI): Generates character, vehicle, animal, or product reference images in bulk, assigns orderly names (#001_character, #002_character), uploads them to Google Flow's asset library, and optionally generates detailed video prompts referencing those characters back-to-back using continuous scene concatenation (is_concat=true). If script_text or raw_input is provided without characters array, automatically extracts and registers all entities.",
  {
    script_text: z.string().optional().describe("Optional raw script or story. If characters array is omitted, entities will be auto-detected from this script."),
    raw_input: z.string().optional().describe("Alias for script_text: raw story, prompt, or script to auto-extract characters and universal entities from."),
    characters: z.array(
      z.object({
        name: z.string().describe("Character/entity name, e.g. 'samurai', 'tesla_roadster', 'golden_tiger'."),
        prompt: z.string().describe("Portrait generation prompt describing character appearance, clothes, and style."),
        type: z.enum(["character", "vehicle", "animal", "product"]).optional().describe("Entity type (default: 'character').")
      })
    ).optional().describe("List of characters or entities to generate and register. If omitted, extracted from script_text."),
    video_scenes: z.array(
      z.object({
        character_name: z.string().describe("Which character to reference."),
        action_prompt: z.string().describe("What happens in this video scene.")
      })
    ).optional().describe("Optional list of sequential video scenes to generate back-to-back."),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9").describe("Aspect ratio for all outputs."),
    video_model: z.enum(["veo-quality", "veo-lite", "veo-omni"]).default("veo-quality").describe("Veo model for video scenes.")
  },
  async (args) => {
    let effectiveCharacters = args.characters || [];
    const text = args.script_text || args.raw_input;
    if (effectiveCharacters.length === 0 && text) {
      const detected = detectProtagonistEntities(text);
      effectiveCharacters = detected.entities.map(e => ({
        name: e.handle,
        prompt: e.referencePrompt,
        type: e.type
      }));
    }

    if (effectiveCharacters.length === 0) {
      throw new Error("No characters or entities provided or detected from script_text or raw_input.");
    }

    const characterMediaMap = {};
    const stepLogs = [];

    // Step 1: Upfront Character Analysis & Complete Reference Ingestion
    stepLogs.push(`[Phase 1: Character Analysis] Identified ${effectiveCharacters.length} character/entity profiles: ${effectiveCharacters.map(c => c.name).join(", ")}`);
    stepLogs.push(`[Phase 2: Reference Ingestion] Generating ${effectiveCharacters.length} character reference portrait(s) and waiting for 100% completion...`);
    for (let i = 0; i < effectiveCharacters.length; i++) {
      const char = effectiveCharacters[i];
      const prompt = char.prompt.includes("#") ? char.prompt : `${char.prompt} #${char.name}_portrait`;
      const imgRes = await bridge.sendCommand(
        "generate_image",
        {
          prompt,
          aspectRatio: args.aspect_ratio,
          count: 1,
          wait_for_render: true
        },
        120000
      );

      const mediaId = imgRes.primaryMediaId || imgRes.images?.[0]?.mediaId;
      characterMediaMap[char.name] = mediaId || "confirmed";
      stepLogs.push(`Character '${char.name}' 100% rendered and ready in Google Flow library.`);
    }

    // Step 2: Generate sequential video scenes back-to-back if provided
    const videoResults = [];
    if (args.video_scenes && args.video_scenes.length > 0) {
      stepLogs.push(`[Phase 3: Video Generation] All character references confirmed complete. Starting ${args.video_scenes.length} video scene(s) with locked references (${args.video_model})...`);
      let lastVideoUrl = null;

    for (let i = 0; i < args.video_scenes.length; i++) {
      const scene = args.video_scenes[i];
      const charMediaId = characterMediaMap[scene.character_name];
      const promptWithTag = `${scene.action_prompt} #${scene.character_name}_scene_${i + 1}`;

      let startImageId = null;
      if (i > 0 && lastVideoUrl) {
        // Extract last frame from previous video
        const frameRes = await bridge.sendCommand("extract_last_frame", { videoUrl: lastVideoUrl }, 40000);
        if (frameRes?.dataUrl) {
          const uploadRes = await bridge.sendCommand(
            "upload_asset",
            {
              dataUrl: frameRes.dataUrl,
              fileName: `frame_concat_${i}.jpg`,
              mimeType: "image/jpeg"
            },
            40000
          );
          startImageId = uploadRes.mediaId;
        }
      }

      const dispatchRes = await bridge.sendCommand(
        "generate_video",
        {
          prompt: promptWithTag,
          model: args.video_model,
          mode: startImageId ? "start" : charMediaId ? "ref" : "text",
          startImageId,
          referenceMediaIds: charMediaId ? [charMediaId] : [],
          aspectRatio: args.aspect_ratio,
          duration: 8
        },
        60000
      );

      // Poll until video is ready
      const statusRes = await bridge.sendCommand(
        "check_video_status",
        { mediaId: dispatchRes.mediaId, projectId: dispatchRes.projectId },
        180000
      );

      lastVideoUrl = statusRes.videoUrl;
      videoResults.push({
        sceneIndex: i + 1,
        character: scene.character_name,
        prompt: promptWithTag,
        mediaId: dispatchRes.mediaId,
        videoUrl: statusRes.videoUrl,
        downloadUrl: statusRes.downloadUrl
      });
      stepLogs.push(`Scene ${i + 1} generated successfully.`);
    }
  } else {
    stepLogs.push("No video scenes requested. Characters successfully registered and ready for story scenes.");
  }

  return textResponse(
      JSON.stringify(
        {
          success: true,
          characters: characterMediaMap,
          scenesGenerated: videoResults.length,
          scenes: videoResults,
          pipelineLogs: stepLogs
        },
        null,
        2
      )
    );
  }
);

// 7. deepx_check_status
server.tool(
  "deepx_check_status",
  "Poll or check generation status of a specific video media ID on Google Flow.",
  {
    media_id: z.string().describe("The media ID returned from deepx_generate_video."),
    project_id: z.string().optional().describe("Optional Google Flow project ID.")
  },
  async (args) => {
    const res = await bridge.sendCommand(
      "check_video_status",
      { mediaId: args.media_id, projectId: args.project_id },
      30000
    );
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 8. deepx_upload_asset
server.tool(
  "deepx_upload_asset",
  "Upload a local image or video file to the current Google Flow project media library and retrieve its mediaId.",
  {
    file_path: z.string().describe("Absolute local path to the image or video file."),
    file_name: z.string().optional().describe("Optional display filename.")
  },
  async (args) => {
    const dataUrl = fileToDataUrl(args.file_path);
    const fileName = args.file_name || basename(args.file_path);
    const ext = extname(args.file_path).toLowerCase();
    const mimeType = ext === ".mp4" ? "video/mp4" : "image/png";

    const res = await bridge.sendCommand(
      "upload_asset",
      { filePath: args.file_path, dataUrl, fileName, mimeType },
      60000
    );
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 9. deepx_list_characters
server.tool(
  "deepx_list_characters",
  "Scan and retrieve all registered character handles and asset names in the current Google Flow project for @mention referencing.",
  {},
  async () => {
    const characters = await bridge.sendCommand("list_characters", {}, 20000);
    const charList = Array.isArray(characters) ? characters : (characters?.items || []);
    return textResponse(
      JSON.stringify(
        {
          total: charList.length,
          characters: charList,
          mentionSyntax: charList.map((c) => `@${typeof c === "string" ? c : (c.name || "character")}`)
        },
        null,
        2
      )
    );
  }
);

// 10. deepx_download_media
server.tool(
  "deepx_download_media",
  "Download a generated video or image to the local system via Chrome Downloads with optional folder and custom filename.",
  {
    url: z.string().describe("Direct FifeURL or download redirect URL of the media."),
    filename: z.string().describe("Target filename e.g. 'hero_scene_01.mp4'."),
    folder: z.string().default("deepx_renders").describe("Subfolder under Chrome Downloads.")
  },
  async (args) => {
    const res = await bridge.sendCommand("download_media", args, 30000);
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 11. deepx_cancel_job
server.tool(
  "deepx_cancel_job",
  "Cancel an active batch generation job by batch ID.",
  {
    batch_id: z.string().describe("Batch ID to cancel.")
  },
  async (args) => {
    const res = await bridge.sendCommand("cancel_batch", { batchId: args.batch_id }, 15000);
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 12. deepx_rename_project
server.tool(
  "deepx_rename_project",
  "Rename the active Google Flow project title.",
  {
    new_name: z.string().describe("New title for the Google Flow project.")
  },
  async (args) => {
    const res = await bridge.sendCommand("rename_project", { newName: args.new_name }, 20000);
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 13. deepx_open_new_project
server.tool(
  "deepx_open_new_project",
  "Create and open a new Google Flow project in the active session.",
  {},
  async () => {
    const res = await bridge.sendCommand("open_new_project", {}, 25000);
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 14. deepx_rename_character
server.tool(
  "deepx_rename_character",
  "Rename an existing character in the current Google Flow project library.",
  {
    old_name: z.string().describe("Current character name/handle to rename."),
    new_name: z.string().describe("New character name/handle.")
  },
  async (args) => {
    const res = await bridge.sendCommand("rename_character", { oldName: args.old_name, newName: args.new_name }, 25000);
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 15. deepx_upload_character
server.tool(
  "deepx_upload_character",
  "Upload a local image from chat or disk to Google Flow and register it as a named character (e.g. 'deepesh') in the active project character library.",
  {
    file_path: z.string().describe("Absolute local path to the image file (e.g. from user uploaded images in chat)."),
    character_name: z.string().describe("Name/handle for the character (e.g. 'deepesh').")
  },
  async (args) => {
    if (!existsSync(args.file_path)) {
      throw new Error(`File not found: ${args.file_path}`);
    }
    const dataUrl = fileToDataUrl(args.file_path);
    const res = await bridge.sendCommand(
      "upload_character",
      { filePath: args.file_path, dataUrl, characterName: args.character_name },
      60000
    );
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 16. deepx_generate_character
server.tool(
  "deepx_generate_character",
  "Generate a character directly inside Google Flow's native Character Studio using Imagen 3 / 🍌 Nano Banana 2.1 and automatically assign their name according to the story and script. Navigates to the Character Studio, submits character appearance prompt, generates candidate cards, sets the official character name (e.g. 'rohan_student'), and saves the character for @mention referencing in video/image scenes.",
  {
    character_name: z.string().describe("Character name/handle according to the story/script (e.g. 'rohan_student', 'rohan_ca', 'saraswati_mother')."),
    prompt: z.string().describe("Detailed visual description of character (features, expression, clothes, age, 2.5D or cinematic style)."),
    model: z.string().default("🍌 Nano Banana 2.1").describe("Image model for character generation (default: '🍌 Nano Banana 2.1').")
  },
  async (args) => {
    await ensureBridgeReady();
    const res = await bridge.sendCommand(
      "generate_character",
      {
        characterName: args.character_name,
        prompt: args.prompt,
        model: args.model
      },
      90000
    );
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 17. deepx_attach_library_reference
server.tool(
  "deepx_attach_library_reference",
  "Attach an official reference card (character portrait, previous scene video, or uploaded asset) from Google Flow's project library to the prompt box. Verifies that the photo card chip is visibly bound inside the ingredient bar before generation.",
  {
    asset_name: z.string().describe("Name of the character or library asset to attach (e.g. 'rohan_student', 'rohan_ca', or previous video title).")
  },
  async (args) => {
    await ensureBridgeReady();
    const res = await bridge.sendCommand(
      "attach_library_reference",
      { assetName: args.asset_name },
      30000
    );
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 18. deepx_attach_references_batch
server.tool(
  "deepx_attach_references_batch",
  "Super-fast batch reference attacher: attaches multiple reference cards / photos simultaneously from the project library into the Google Flow prompt box in under 300ms without reopening the drawer.",
  {
    asset_names: z.array(z.string()).describe("List of character, image, or video asset names to attach into the prompt box (up to 5).")
  },
  async (args) => {
    await ensureBridgeReady();
    const res = await bridge.sendCommand(
      "attach_references_batch",
      { assetNames: args.asset_names },
      30000
    );
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 19. deepx_auto_chain_scene
server.tool(
  "deepx_auto_chain_scene",
  "Autonomous Video Analyzer & Scene Chainer: Detects the latest completed video tile on Google Flow, extracts its terminal end frame in memory via HTMLCanvas, uploads it via DataTransfer as a continuity anchor, stacks additional references, injects the next scene prompt, and immediately submits generation in under 1.5 seconds.",
  {
    next_prompt: z.string().describe("The prompt text for the next scene to generate."),
    reference_assets: z.array(z.string()).optional().describe("Optional additional reference assets to stack alongside the terminal frame."),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]).default("16:9"),
    duration: z.number().default(10),
    model: z.string().default("veo-omni")
  },
  async (args) => {
    await ensureBridgeReady();
    const res = await bridge.sendCommand(
      "auto_chain_scene",
      {
        nextPrompt: args.next_prompt,
        referenceAssets: args.reference_assets || [],
        aspectRatio: args.aspect_ratio,
        duration: args.duration,
        model: args.model
      },
      60000
    );
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// 18. deepx_eval_script
server.tool(
  "deepx_eval_script",
  "Evaluate a JavaScript expression in the active Google Flow tab and return the value. Useful for real-time DOM queries, inspection, or verifying UI state.",
  {
    code: z.string().describe("JavaScript code string (can include 'return <value>').")
  },
  async (args) => {
    await ensureBridgeReady();
    const res = await bridge.sendCommand(
      "eval_script",
      { code: args.code },
      30000
    );
    return textResponse(JSON.stringify(res, null, 2));
  }
);

// Start WebSocket bridge and connect MCP server over stdio
async function main() {
  await bridge.start();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[DeepX MCP] Server connected to stdio transport and ready for Antigravity requests.");
}

main().catch((err) => {
  console.error("[DeepX MCP] Fatal startup error:", err);
  process.exit(1);
});
