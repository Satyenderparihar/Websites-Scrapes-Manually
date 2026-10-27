// DeepX Knowledge Base for Google Flow (Veo 3.1 & Imagen 3)

export const FLOW_OPTIONS = {
  videoModels: [
    {
      id: "veo-quality",
      name: "Veo 3.1 Quality (Director-grade)",
      description: "Highest visual fidelity, photorealistic textures, complex motion dynamics, and precise physics simulation. Best for final cinematic productions.",
      durations: [5, 8],
      aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"]
    },
    {
      id: "veo-lite",
      name: "Veo 3.1 Lite (High-speed)",
      description: "Optimized for fast rendering and rapid iteration. Retains high motion coherence with substantially reduced latency.",
      durations: [5, 8],
      aspectRatios: ["16:9", "9:16", "1:1"]
    },
    {
      id: "veo-omni",
      name: "Veo Omni (Abra Multimodal)",
      description: "Interactive video generation with versatile conditioning on image references and narrative beats.",
      durations: [5, 8, 10],
      aspectRatios: ["16:9", "9:16"]
    }
  ],

  imageModels: [
    {
      id: "imagen-3",
      internalKey: "NARWHAL",
      name: "Imagen 3 (Default)",
      description: "State-of-the-art text-to-image model by Google DeepMind. Incredible typography rendering, fine details, and prompt adherence.",
      outputsPerPrompt: [1, 2, 4],
      aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "2:3", "3:2"]
    }
  ],

  generationModes: [
    {
      id: "textToVideo",
      name: "Text to Video",
      description: "Generates video directly from a descriptive natural language prompt.",
      inputsRequired: ["prompt"]
    },
    {
      id: "imageToVideo",
      name: "Image to Video (Start Frame)",
      description: "Animates a still start image into a coherent video sequence following the prompt instructions.",
      inputsRequired: ["prompt", "startImageId or startImage file"]
    },
    {
      id: "startAndEndVideo",
      name: "Start and End Frame Interpolation (Fl)",
      description: "Generates smooth temporal transitions between two specified keyframes.",
      inputsRequired: ["prompt", "startImageId", "endImageId"]
    },
    {
      id: "referenceImagesToVideo",
      name: "Reference Images to Video",
      description: "Preserves character likeness, clothing, color palette, or object identity using uploaded asset IDs.",
      inputsRequired: ["prompt", "referenceMediaIds"]
    },
    {
      id: "textToImage",
      name: "Text to Image",
      description: "Generates high-resolution images from prompt.",
      inputsRequired: ["prompt"]
    },
    {
      id: "imageToImage",
      name: "Image to Image",
      description: "Stylizes or expands upon reference images with prompt guidance.",
      inputsRequired: ["prompt", "referenceMediaIds"]
    }
  ],

  aspectRatios: {
    "16:9": "Landscape (1920x1080) - Ideal for YouTube, cinema, desktop displays",
    "9:16": "Portrait (1080x1920) - Ideal for Shorts, Reels, TikTok, mobile feeds",
    "1:1": "Square (1080x1080) - Ideal for Instagram, square feeds, avatars",
    "4:3": "Standard / Retro television format",
    "3:4": "Vertical portrait classic",
    "2:3": "Vertical photography",
    "3:2": "Horizontal photography"
  },

  promptEngineeringTips: [
    "Specify Camera Motion: 'smooth slow pan left', 'tracking drone shot', 'low-angle push in', 'handheld documentary style'.",
    "Specify Lighting & Atmosphere: 'golden hour rim lighting', 'volumetric fog with cyan neon highlights', 'soft studio illumination'.",
    "Specify Dynamic Action: Clearly describe how subjects and surroundings evolve through time (e.g., 'water splashes outwards as the character leaps').",
    "Use Character Tags: Prefix character names with @ (e.g. '@hero running through the rain') when referencing saved project characters.",
    "Orderly Naming Convention: Include #tags in prompts (e.g. 'Cinematic hero #scene_01') to automatically name downloaded media files.",
    "Concatenation (isConcat): For continuous long-form storytelling, use isConcat=true to automatically feed the ending frame of each clip as the start frame of the next."
  ]
};

export function getDeepXKnowledgeMarkdown() {
  return `# DeepX Knowledge Base: Google Flow (Veo 3.1 & Imagen 3)

## Available Video Models
- **veo-quality** (Veo 3.1 Quality): Highest fidelity, director-grade cinematic output. Supports 5s & 8s durations in 16:9 and 9:16.
- **veo-lite** (Veo 3.1 Lite): Ultra-fast rendering with high coherence. Excellent for rapid iterative scene drafting.
- **veo-omni** (Abra): Multimodal video generation supporting 5s, 8s, 10s.

## Image Generation
- **imagen-3** (NARWHAL): Ultra-high detail, rich color fidelity, text rendering, and multi-asset reference blending. Supports 1x to 4x outputs per prompt.

## Video & Image Modes
1. **textToVideo**: Text prompt -> video.
2. **imageToVideo**: Start frame -> video animation.
3. **startAndEndVideo**: Interpolates between start and end frames.
4. **referenceImagesToVideo**: Enforces character or style consistency from reference assets.
5. **textToImage**: Text prompt -> images.
6. **imageToImage**: Reference image blending -> images.

## Character Generation & Studio (@mentions)
DeepX directly automates Google Flow's native Character Studio (\`/project/<id>/character\`):
- **deepx_generate_character**: Takes \`character_name\` and \`prompt\` to generate character candidate cards in Flow's Character Studio using \`🍌 Nano Banana 2.1\` or \`Imagen 3\`, assign the official character handle (e.g. \`rohan_student\`), and save the character into the project library.
- **deepx_upload_character**: Uploads a local image file and registers it as a named character.
- **Reference in Prompts**: Once saved, reference characters using \`@character_name\` in subsequent image and video prompts (e.g. \`"@rohan_student studying at night with desk lamp"\`). DeepX automatically binds the character asset during generation.
- **Safe Mode Routing**: When generating character images or portraits, always use \`mode: "textToImage"\` and image models (\`🍌 Nano Banana 2.1\` or \`imagen-3\`). DeepX guards against accidental video generation.

## Storytelling Concatenation (isConcat)
When \`isConcat: true\` is used during \`deepx_batch_generate\`, DeepX automatically captures the exact ending frame of video \`N\` and supplies it as the \`startImageId\` for video \`N+1\`, ensuring seamless continuity across scenes.

## Master Creative Director & Script Breakdown Protocol
When a user pastes ANY raw input (rough prompt, full story, bullet points, Hindi / multilingual script, or commercial brief):
- **deepx_analyze_and_breakdown_script**: Automatically decomposes raw text into an advanced cinematic multi-scene storyboard (#scene_01, #scene_02).
- **Universal Entity Isolation**: Detects vehicles (@tesla_roadster), animals (@golden_tiger), characters (@samurai_kaito, @rohan), and hero products (@auraring).
- **Master Reference Ingestion**: Generates master reference prompts for Imagen 3 / 🍌 Nano Banana 2.1 or uploads local assets from \`assets/\`.
- **Autonomous Production**: Feeds the resulting script to \`deepx_rapid_storyboard_autopilot\` for instant back-to-back video rendering, terminal frame grabbing, reference binding, and auto-download.
`;
}
