// Adapted from flow_mcp/deepx-mcp/src/storyboard-analyzer.js. Local files come from chrome.antigem.
// DeepX Storyboard Architect & Intelligent Script Breakdown Engine
// Analyzes raw inputs (prompts, Hindi/multilingual scripts, stories, bullet points)
// Automatically isolates protagonist entities (Vehicles, Animals, Characters, Products)
// Supports dynamic Named Entity Recognition (NER) for arbitrary character names in English, Hindi, and multilingual scripts
// Generates standardized @handles, master reference prompts, and cinematic multi-scene storyboards

let localAssetIndex = [];
export function setLocalAssetIndex(files) { localAssetIndex = files || []; }

// Entity type definitions
export const ENTITY_TYPES = {
  VEHICLE: "vehicle",
  ANIMAL: "animal",
  CHARACTER: "character",
  PRODUCT: "product"
};

// Style and Skill Presets (Retro 8-Bit, MatAnyone Matting, Gemini Director, Cinematic)
export const STYLE_PRESETS = {
  cinematic: {
    id: "cinematic",
    name: "Cinematic Photorealism",
    modifier: "photorealistic 8k, cinematic 24fps film grain, masterpiece director composition, Arri Alexa LF",
    lighting: "volumetric lighting with soft directional sunbeams and subtle cinematic haze",
    badge: "⚡ Cinematic"
  },
  retro_8bit: {
    id: "retro_8bit",
    name: "8-Bit / 16-Bit Retro Arcade",
    modifier: "authentic 8-bit retro arcade pixel art, 16-bit vintage video game aesthetic, CRT monitor scanlines, vibrant dithering color palette, classic sprite animation",
    lighting: "glowing CRT phosphors, arcade cabinet marquee illumination",
    badge: "👾 8-Bit Retro"
  },
  matanyone_matting: {
    id: "matanyone_matting",
    name: "MatAnyone Video Matting",
    modifier: "consistent character video matting, clean solid chroma key green screen background [HEX #00FF00], isolated studio subject, ultra-sharp edge fidelity for VFX compositing",
    lighting: "high-contrast multi-point studio lighting, spill suppression, even edge illumination",
    badge: "🎭 MatAnyone Matting"
  },
  gemini_multimodal: {
    id: "gemini_multimodal",
    name: "Gemini Multimodal Director",
    modifier: "gemini multimodal director style, ultra-high dynamic range 4k anamorphic capture, purposeful narrative visual rhythm, cinematic camera choreography with motivated depth of field",
    lighting: "dramatic naturalistic golden hour and practical atmospheric bounce lighting",
    badge: "🧠 Gemini Director"
  }
};

export function detectStylePreset(text) {
  if (!text || typeof text !== "string") return null;
  const lower = text.toLowerCase();
  if (/\b(?:8[- ]?bit|16[- ]?bit|pixel\s*art|retro\s*arcade|arcade\s*game|retro\s*game|arcade\s*intro)\b/i.test(lower)) {
    return "retro_8bit";
  }
  if (/\b(?:matanyone|matting|chroma\s*key|green\s*screen|solid\s*background|isolated\s*subject|clean\s*cutout|rotoscop)\b/i.test(lower)) {
    return "matanyone_matting";
  }
  if (/\b(?:gemini\s*samples|gemini\s*director|multimodal\s*director|shot\s*choreography|visual\s*rhythm)\b/i.test(lower)) {
    return "gemini_multimodal";
  }
  return null;
}

// Helper for Unicode-aware word matching and replacement without double-@ collisions
export function createWordRegex(str) {
  const esc = str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![#@_\\p{L}\\p{N}])@?(${esc})(?![_\\p{L}\\p{N}])`, "iu");
}

export function replaceWord(text, word, replacement) {
  if (!text || !word || !replacement) return text || "";
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?<![#@_\\p{L}\\p{N}])@?(${esc})(?![_\\p{L}\\p{N}])`, "giu");
  return text.replace(regex, replacement);
}

// Language detection
export function detectLanguage(text) {
  if (!text || typeof text !== "string") return "english";
  if (/[\u0900-\u097F]/.test(text)) {
    return "hindi";
  }
  const hinglishMarkers = /\b(drishya|scene|kahaani|ladka|ladki|gaadi|shehar|mandir|raasta|aankhon|chehre|rohan|arjun|priya|vikram|kabir)\b/i;
  if (hinglishMarkers.test(text)) {
    return "hinglish";
  }
  return "english";
}

// Canonical handle sanitizer
export function sanitizeHandle(rawName) {
  if (!rawName || typeof rawName !== "string") return "protagonist";
  let clean = rawName
    .toLowerCase()
    .replace(/^[@#]+/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return clean || "protagonist";
}

// Known entity dictionaries and pattern matchers
// Known entity dictionaries and pattern matchers - specifically tuned to avoid hijacking generic nouns
const VEHICLE_PATTERNS = [
  { match: /(?:tesla\s+roadster|roadster)/iu, triggers: ["tesla roadster", "roadster"], name: "Tesla Roadster", handle: "tesla_roadster", desc: "Matte black Tesla Roadster with glowing red aerodynamic taillights and sleek aerodynamic carbon fiber chassis" },
  { match: /(?:tesla\s+)?cybertruck/iu, triggers: ["tesla cybertruck", "cybertruck"], name: "Cybertruck", handle: "cybertruck", desc: "Angular stainless-steel Cybertruck with futuristic LED lightbar and rugged cyber-tread wheels" },
  { match: /(?:vintage\s+|classic\s+)?mustang|विंटेज\s*मस्टैंग|मस्टैंग/iu, triggers: ["vintage mustang", "classic mustang", "विंटेज मस्टैंग", "mustang", "मस्टैंग"], name: "Vintage Mustang", handle: "vintage_mustang", desc: "Cherry red 1969 vintage muscle Mustang with chrome accents, dual white racing stripes, and rumbling dual exhaust" },
  { match: /ferrari/iu, triggers: ["ferrari"], name: "Ferrari", handle: "ferrari", desc: "Rosso Corsa red hyper-aerodynamic Ferrari supercar with sculpted side air intakes and gloss carbon-ceramic wheels" },
  { match: /lamborghini/iu, triggers: ["lamborghini"], name: "Lamborghini", handle: "lamborghini", desc: "Vibrant optic-yellow angular Lamborghini hypercar with scissor doors and aggressive aerodynamic rear diffuser" },
  { match: /porsche(?:\s+911)?/iu, triggers: ["porsche 911", "porsche"], name: "Porsche 911", handle: "porsche_911", desc: "Sleek metallic silver Porsche 911 with iconic teardrop silhouette and modern matrix LED headlights" },
  { match: /(?:cyberpunk\s+|flying\s+)?hoverbike/iu, triggers: ["cyberpunk hoverbike", "flying hoverbike", "hoverbike"], name: "Hoverbike", handle: "hoverbike", desc: "Futuristic anti-gravity hoverbike with glowing cyan repulsor rings and streamlined carbon cowl" },
  { match: /(?:cyberpunk\s+|neon\s+)motorcycle/iu, triggers: ["cyberpunk motorcycle", "neon motorcycle"], name: "Cyber Motorcycle", handle: "cyber_motorcycle", desc: "Low-slung futuristic motorcycle with hubless glowing wheels and matte black aerodynamic fairings" },
  { match: /(?:flying\s+)?speeder/iu, triggers: ["flying speeder", "speeder"], name: "Speeder", handle: "speeder", desc: "Sleek aerodynamic flying landspeeder with dual thrusters and panoramic canopy" },
  { match: /starfighter|spaceship/iu, triggers: ["starfighter", "spaceship"], name: "Starfighter", handle: "starfighter", desc: "Deep space combat starfighter with twin plasma thrusters and matte titanium hull plating" },
  { match: /hypercar|supercar/iu, triggers: ["hypercar", "supercar"], name: "Hypercar", handle: "hypercar", desc: "Aerodynamic concept hypercar with iridescent carbon fiber bodywork and active aerodynamic wings" },
  { match: /sports\s+car|muscle\s+car|racing\s+car/iu, triggers: ["sports car", "muscle car", "racing car"], name: "Sports Car", handle: "sports_car", desc: "High-performance sports car with aggressive aerodynamic stance, wide fenders, and gloss finish" },
  { match: /stealth\s+helicopter/iu, triggers: ["stealth helicopter"], name: "Stealth Helicopter", handle: "stealth_helicopter", desc: "Futuristic matte black stealth helicopter with whisper rotor blades and panoramic tactical canopy" },
  { match: /luxury\s+yacht/iu, triggers: ["luxury yacht"], name: "Luxury Yacht", handle: "luxury_yacht", desc: "Sleek ultramodern luxury yacht with teak wood decking, polished composite hull, and ambient mood illumination" }
];

const ANIMAL_PATTERNS = [
  { match: /(?:golden\s+|bengal\s+|cybernetic\s+)?tiger|बाघ/iu, triggers: ["golden tiger", "bengal tiger", "cybernetic tiger", "tiger", "बाघ"], name: "Golden Tiger", handle: "golden_tiger", desc: "Majestic muscular golden Bengal tiger with striking black stripes, piercing amber eyes, and powerful predatory stride" },
  { match: /(?:dire\s+|cybernetic\s+|shadow\s+)?wolf|भेड़िया/iu, triggers: ["dire wolf", "cybernetic wolf", "shadow wolf", "wolf", "भेड़िया"], name: "Dire Wolf", handle: "dire_wolf", desc: "Lithe silver-furred dire wolf with sharp intelligent ice-blue eyes and thick majestic winter coat" },
  { match: /(?:mecha\s+|cyber\s+|fire\s+)?dragon|ड्रैगन/iu, triggers: ["mecha dragon", "cyber dragon", "fire dragon", "dragon", "ड्रैगन"], name: "Mecha Dragon", handle: "mecha_dragon", desc: "Magnificent mechanical dragon with iridescent metallic scales, razor-sharp wing spans, and glowing internal reactor vents" },
  { match: /(?:black\s+)?panther|चीता/iu, triggers: ["black panther", "panther", "cheetah", "चीता"], name: "Black Panther", handle: "black_panther", desc: "Sleek obsidian black panther with silk-like coat, silent muscular stride, and luminous emerald eyes" },
  { match: /(?:golden\s+|bald\s+)?eagle|चील/iu, triggers: ["golden eagle", "bald eagle", "eagle", "चील"], name: "Golden Eagle", handle: "golden_eagle", desc: "Regal golden eagle with sharp curved beak, massive feathered wingspan, and razor-focused predatory gaze" },
  { match: /phoenix/iu, triggers: ["phoenix"], name: "Phoenix", handle: "phoenix", desc: "Mythical immortal phoenix with luminous embers trailing from golden and crimson plumage" },
  { match: /(?:white\s+|black\s+)?stallion/iu, triggers: ["white stallion", "black stallion", "stallion"], name: "Stallion", handle: "stallion", desc: "Powerful muscular stallion with flowing windblown mane, proud arched neck, and dynamic athletic posture" },
  { match: /(?:cyber\s+hound|robot\s+dog)/iu, triggers: ["cyber hound", "robot dog"], name: "Cyber Hound", handle: "cyber_hound", desc: "Futuristic quad-legged robotic canine with articulated carbon-alloy joints and sensor array head" },
  { match: /lion|सिंह/iu, triggers: ["lion", "सिंह"], name: "Regal Lion", handle: "regal_lion", desc: "Magnificent golden-maned African lion with regal gaze and commanding posture" },
  { match: /grizzly\s+bear/iu, triggers: ["grizzly bear"], name: "Grizzly Bear", handle: "grizzly_bear", desc: "Massive majestic bear with dense weathered fur, commanding presence, and powerful stance" }
];

const CHARACTER_PATTERNS = [
  { match: /(?:cyber\s+|ronin\s+)?samurai/iu, triggers: ["cyber samurai", "ronin samurai", "samurai"], name: "Samurai Kaito", handle: "samurai_kaito", desc: "Discipline-forged master samurai wearing modern dark lacquered armor, woven battle hakama, and twin katana sheaths" },
  { match: /(?:cyberpunk\s+|stealth\s+|cybernetic\s+)?(?:ninja\s+drones?|ninjas?)/iu, triggers: ["cybernetic ninja drones", "ninja drones", "cyber ninja", "ninja"], name: "Shadow Ninja", handle: "shadow_ninja", desc: "Agile shadow operative wearing form-fitting tactical nanofiber stealth cowl with darkened visor" },
  { match: /(?:cyberpunk\s+)?hacker/iu, triggers: ["cyberpunk hacker", "cyber hacker", "hacker"], name: "Cyber Hacker", handle: "cyber_hacker", desc: "Sharp-eyed tech hacker wearing an oversized augmented-reality hooded bomber jacket with biometric implants" },
  { match: /(?:space\s+)?astronaut/iu, triggers: ["space astronaut", "astronaut"], name: "Astronaut", handle: "astronaut", desc: "Modern deep-space astronaut wearing an advanced exploration EVA suit with reflective gold visor" },
  { match: /(?:secret\s+|stealth\s+)agent/iu, triggers: ["secret agent", "stealth agent"], name: "Stealth Agent", handle: "stealth_agent", desc: "Crisp-suited clandestine intelligence operative with subtle earpiece and composed lethal demeanor" },
  { match: /rohan|रोहन/iu, triggers: ["rohan", "रोहन"], name: "Rohan", handle: "rohan", desc: "Charismatic young Indian protagonist with determined eyes, sharp expressive facial features, and contemporary styling" },
  { match: /arjun|अर्जुन/iu, triggers: ["arjun", "अर्जुन"], name: "Arjun", handle: "arjun", desc: "Athletic hero protagonist with sharp jawline, commanding posture, and resolute eyes" },
  { match: /kaito/iu, triggers: ["kaito"], name: "Kaito", handle: "kaito", desc: "Intense disciplined hero with focused gaze, sleek dark hair, and sharp contemporary attire" }
];

const PRODUCT_PATTERNS = [
  { match: /(?:aura\s*ring|smart\s*ring)/iu, triggers: ["auraring", "aura ring", "smart ring"], name: "AuraRing", handle: "auraring", desc: "Ultra-sleek brushed titanium smart ring with subtle recessed biometric sensor line emitting faint emerald pulse" },
  { match: /(?:smart\s*watch|luxury\s*watch|chronometer)/iu, triggers: ["smart watch", "smartwatch", "luxury watch", "chronometer watch", "chronometer"], name: "Chronometer Watch", handle: "luxury_watch", desc: "Swiss-crafted luxury mechanical chronometer with exposed tourbillon movement and sapphire crystal dome" },
  { match: /(?:quantum\s*phone|holographic\s*phone)/iu, triggers: ["quantum phone", "holographic phone"], name: "Quantum Phone", handle: "quantum_phone", desc: "Bezel-less holographic smartphone with translucent ceramic back and edge-to-edge floating UI display" },
  { match: /(?:quantum\s*sneaker|high-tech\s*sneaker)/iu, triggers: ["quantum sneaker", "high-tech sneaker"], name: "Quantum Sneaker", handle: "quantum_sneaker", desc: "High-tech performance sneaker with pressurized air-cushion translucent sole and adaptive woven mesh" },
  { match: /(?:smart\s*earbuds|acoustic\s*earbuds)/iu, triggers: ["smart earbuds", "acoustic earbuds"], name: "Acoustic Earbuds", handle: "smart_earbuds", desc: "Matte black ergonomic sound-cancelling earbuds with laser-etched metal accents" },
  { match: /smart\s*glasses|ar\s*visor/iu, triggers: ["smart glasses", "ar visor"], name: "AR Smart Glasses", handle: "ar_glasses", desc: "Minimalist titanium eyewear frames with micro-OLED optical prism displays" },
  { match: /(?:plasma\s*katana|plasma\s*blade|energy\s*sword|glowing\s*katana)/iu, triggers: ["glowing plasma katana", "plasma katana", "glowing katana", "plasma blade", "energy sword"], name: "Plasma Katana", handle: "plasma_katana", desc: "Precision-machined hilt projecting a razor-thin luminous cyan plasma blade" },
  { match: /glowing\s+crystal/iu, triggers: ["glowing crystal"], name: "Glowing Crystal", handle: "glowing_crystal", desc: "Ancient multifaceted crystal pulsating with luminous inner cyan energy and delicate geometric facets" },
  { match: /(?:alien\s+artifact|ancient\s+artifact)/iu, triggers: ["alien artifact", "ancient artifact"], name: "Alien Artifact", handle: "alien_artifact", desc: "Intricate extraterrestrial relic etched with glowing alien glyphs and floating magnetic components" }
];

// Curated dictionary of common Indic/Hindi proper names for instant zero-shot recognition
const COMMON_HINDI_NAMES = [
  { hindi: "विक्रम", handle: "vikram", name: "Vikram" },
  { hindi: "मीरा", handle: "meera", name: "Meera" },
  { hindi: "कबीर", handle: "kabir", name: "Kabir" },
  { hindi: "प्रिया", handle: "priya", name: "Priya" },
  { hindi: "रोहन", handle: "rohan", name: "Rohan" },
  { hindi: "अर्जुन", handle: "arjun", name: "Arjun" },
  { hindi: "राहुल", handle: "rahul", name: "Rahul" },
  { hindi: "अमित", handle: "amit", name: "Amit" },
  { hindi: "नेहा", handle: "neha", name: "Neha" },
  { hindi: "पूजा", handle: "pooja", name: "Pooja" },
  { hindi: "समीर", handle: "sameer", name: "Sameer" },
  { hindi: "राज", handle: "raj", name: "Raj" },
  { hindi: "अंजलि", handle: "anjali", name: "Anjali" },
  { hindi: "संजय", handle: "sanjay", name: "Sanjay" },
  { hindi: "अजय", handle: "ajay", name: "Ajay" },
  { hindi: "दीपक", handle: "deepak", name: "Deepak" },
  { hindi: "करण", handle: "karan", name: "Karan" },
  { hindi: "कृष्णा", handle: "krishna", name: "Krishna" },
  { hindi: "शिव", handle: "shiva", name: "Shiva" },
  { hindi: "सरस्वती", handle: "saraswati", name: "Saraswati" }
];

// English stopwords, formatting words, and camera terms to exclude from proper noun detection
const ENGLISH_NER_EXCLUSIONS = new Set([
  "a", "an", "the", "this", "that", "these", "those", "there", "here", "it", "its", "he", "she", "they", "we", "you", "i",
  "my", "your", "his", "her", "their", "our", "scene", "shot", "take", "act", "sequence", "beat", "part", "chapter", "day",
  "night", "interior", "exterior", "int", "ext", "cut", "fade", "dissolve", "close", "wide", "medium", "drone", "camera",
  "tracking", "low", "high", "crane", "orbit", "slow", "fast", "suddenly", "meanwhile", "later", "next", "then", "soon",
  "finally", "after", "before", "during", "while", "as", "when", "where", "why", "what", "how", "who", "which", "but", "and",
  "or", "nor", "so", "for", "yet", "in", "on", "at", "to", "from", "with", "by", "about", "into", "onto", "over", "under",
  "above", "below", "between", "through", "out", "off", "up", "down", "back", "away", "yes", "no", "not", "just", "only",
  "even", "also", "still", "already", "very", "really", "too", "more", "most", "good", "bad", "big", "small", "new", "old",
  "first", "second", "third", "last", "establishing", "dynamic", "peak", "heroic", "cinematic", "resolution", "motion",
  "climax", "intro", "outro", "volumetric", "lighting", "bokeh", "anamorphic", "shrine", "tokyo", "city", "room", "hall",
  "extreme", "high", "angle", "shot", "shots", "wide", "tight", "view", "overhead", "pan", "tilt", "zoom", "rack", "focus",
  "dutch", "aerial", "eye", "eyes", "look", "looks", "looking", "standing", "sitting", "walking", "running", "driving",
  "holding", "wearing", "morning", "evening", "sun", "rain", "fog", "smoke", "light", "lights", "dark", "shadow", "neon",
  "speed", "background", "foreground", "center", "side", "front", "top", "bottom", "street", "streets", "door", "window",
  "car", "phone", "wall", "floor", "table", "chair", "sky", "road", "water", "river", "ocean", "hands", "hand", "face"
]);

// Search for local matching assets in workspace
function findLocalAsset(handle) {
  const candidates=[handle,`photo_${handle}`,`character_${handle}`,`hero_${handle}`,handle.replace(/_/g,'-')];
  const file=localAssetIndex.find(f=>candidates.some(n=>['.jpg','.jpeg','.png','.webp'].some(e=>f.name?.toLowerCase()===n.toLowerCase()+e)));
  return file?{exists:true,filePath:file.path,fileName:file.name}:{exists:false,filePath:null,fileName:null};
}

// Extract all entities from text input with universal 4-class detection and dynamic NER
export function detectProtagonistEntities(rawInput, protagonistOverride = null) {
  const text = String(rawInput || "");
  const detected = new Map();

  const addEntity = (type, matched) => {
    if (!detected.has(matched.handle)) {
      const local = findLocalAsset(matched.handle);
      detected.set(matched.handle, {
        handle: matched.handle,
        name: matched.name,
        type: type,
        description: matched.desc || `Central ${type} protagonist ${matched.name} with consistent cinematic visual identity`,
        triggers: matched.triggers || [matched.name.toLowerCase()],
        localAssetExists: local.exists,
        localAssetPath: local.filePath,
        localFileName: local.fileName,
        referencePrompt: generateMasterReferencePrompt(type, matched.name, matched.desc || matched.name, matched.handle)
      });
    }
  };

  // If user provided an explicit override handle
  if (protagonistOverride) {
    const handle = sanitizeHandle(protagonistOverride);
    const local = findLocalAsset(handle);
    detected.set(handle, {
      handle,
      name: protagonistOverride,
      type: ENTITY_TYPES.CHARACTER,
      description: `Primary protagonist ${protagonistOverride} with consistent cinematic visual identity`,
      triggers: [protagonistOverride.toLowerCase(), handle],
      localAssetExists: local.exists,
      localAssetPath: local.filePath,
      localFileName: local.fileName,
      referencePrompt: generateMasterReferencePrompt(ENTITY_TYPES.CHARACTER, protagonistOverride, `Hero protagonist ${protagonistOverride}`, handle)
    });
  }

  // Check explicit @mentions inside the text (e.g. @tesla_roadster or @samurai_kaito)
  const explicitMentions = text.match(/@([a-zA-Z0-9_]+)/g);
  if (explicitMentions) {
    for (const m of explicitMentions) {
      const h = sanitizeHandle(m);
      if (!detected.has(h)) {
        const local = findLocalAsset(h);
        detected.set(h, {
          handle: h,
          name: h.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          type: ENTITY_TYPES.CHARACTER,
          description: `Custom referenced entity @${h} mentioned in prompt`,
          triggers: [h, `@${h}`],
          localAssetExists: local.exists,
          localAssetPath: local.filePath,
          localFileName: local.fileName,
          referencePrompt: generateMasterReferencePrompt(ENTITY_TYPES.CHARACTER, h, `Iconic representation of ${h}`, h)
        });
      }
    }
  }

  // 1. Dynamic Hindi Named Entity Detection
  for (const item of COMMON_HINDI_NAMES) {
    if (text.includes(item.hindi)) {
      addEntity(ENTITY_TYPES.CHARACTER, {
        name: item.name,
        handle: item.handle,
        desc: `Charismatic Indian protagonist ${item.name} with expressive eyes and contemporary styling`,
        triggers: [item.hindi, item.name.toLowerCase(), item.handle]
      });
    }
  }

  // 2. Scan Standard Character patterns
  for (const p of CHARACTER_PATTERNS) {
    if (p.match.test(text)) addEntity(ENTITY_TYPES.CHARACTER, p);
  }

  // 3. Scan Vehicle patterns
  for (const p of VEHICLE_PATTERNS) {
    if (p.match.test(text)) addEntity(ENTITY_TYPES.VEHICLE, p);
  }

  // 4. Scan Animal patterns
  for (const p of ANIMAL_PATTERNS) {
    if (p.match.test(text)) addEntity(ENTITY_TYPES.ANIMAL, p);
  }

  // 5. Scan Product patterns
  for (const p of PRODUCT_PATTERNS) {
    if (p.match.test(text)) addEntity(ENTITY_TYPES.PRODUCT, p);
  }

  // 6. Dynamic English Named Entity Recognition (Capitalized Proper Nouns e.g. "Kabir", "Priya", "Elena", "Marcus")
  const properNounRegex = /\b([A-Z][a-z]{2,20})\b/g;
  let pMatch;
  while ((pMatch = properNounRegex.exec(text)) !== null) {
    const rawWord = pMatch[1];
    const lowerWord = rawWord.toLowerCase();
    if (ENGLISH_NER_EXCLUSIONS.has(lowerWord)) continue;
    
    // Check if followed by location or classification nouns e.g. "Andromeda sector", "Tokyo city", "Orion galaxy"
    const locationFollowerRegex = new RegExp(`\\b${rawWord}\\s+(?:sector|zone|region|area|city|street|avenue|road|bridge|island|mountain|station|planet|galaxy|system|cluster|hall|room|desert|forest|valley|sea|ocean|district)\\b`, "i");
    if (locationFollowerRegex.test(text)) continue;

    // Check if word is already part of an existing entity's triggers
    const isAlreadyCovered = Array.from(detected.values()).some(e => {
      const triggers = e.triggers || [];
      return triggers.some(t => t.toLowerCase().includes(lowerWord));
    });
    if (isAlreadyCovered) continue;

    const handle = sanitizeHandle(lowerWord);
    if (!detected.has(handle)) {
      // Extract contextual description around the entity in the user's text if present
      let entityDesc = `Central protagonist ${rawWord} with distinctive presence and realistic styling`;
      const descMatch = text.match(new RegExp(`\\b${rawWord}\\b(?:[,\\s]+(?:is|wearing|a|an|the)\\s+([a-zA-Z0-9\\s,]{4,50}?)(?:[.,;\\n]|$))`, "i"));
      if (descMatch && descMatch[1]) {
        entityDesc = `${rawWord}, ${descMatch[1].trim()}`;
      }
      addEntity(ENTITY_TYPES.CHARACTER, {
        name: rawWord,
        handle: handle,
        desc: entityDesc,
        triggers: [rawWord, lowerWord]
      });
    }
  }

  // 7. Fallback: only if text explicitly mentions hero or protagonist
  if (detected.size === 0 && /\b(hero|protagonist|नायक|मुख्य\s*पात्र)\b/i.test(text)) {
    const defaultHandle = "hero_protagonist";
    const local = findLocalAsset(defaultHandle);
    detected.set(defaultHandle, {
      handle: defaultHandle,
      name: "Hero Protagonist",
      type: ENTITY_TYPES.CHARACTER,
      description: "Central hero protagonist with strong cinematic visual identity and charismatic presence",
      triggers: ["hero", "protagonist", "नायक"],
      localAssetExists: local.exists,
      localAssetPath: local.filePath,
      localFileName: local.fileName,
      referencePrompt: generateMasterReferencePrompt(ENTITY_TYPES.CHARACTER, "Hero Protagonist", "Central hero with sharp determined expression and cinematic costume", defaultHandle)
    });
  }

  const list = Array.from(detected.values());

  // Prioritize human characters or vehicles as primary protagonist over background products
  let primary = list.length > 0 ? (list[0]?.handle || "protagonist") : null;
  const preferredPrimary = list.find(e => e.type === ENTITY_TYPES.CHARACTER) ||
    list.find(e => e.type === ENTITY_TYPES.VEHICLE) ||
    list.find(e => e.type === ENTITY_TYPES.ANIMAL);
  if (preferredPrimary) {
    primary = preferredPrimary.handle;
  }

  return {
    entities: list,
    primaryProtagonist: primary,
    heroReferences: list.map(e => e.handle)
  };
}

// Generate master reference prompt for Imagen 3 / 🍌 Nano Banana 2.1
export function generateMasterReferencePrompt(type, name, description, handle) {
  const tag = `#${handle}_reference`;
  switch (type) {
    case ENTITY_TYPES.VEHICLE:
      return `Cinematic studio 3/4 beauty angle reference shot of ${name}, ${description}. High-gloss automotive finish, razor-sharp reflections, sleek aerodynamic details, dramatic volumetric rim lighting, pristine dark gradient studio stage, 8k raytraced render ${tag}`;
    case ENTITY_TYPES.CHARACTER:
      return `Official master character turnaround reference portrait of ${name}, ${description}. Neutral front-facing pose, authentic facial anatomy, detailed realistic clothing fabric textures, soft 3-point portrait illumination, clean neutral grey backdrop, photorealistic 8k ${tag}`;
    case ENTITY_TYPES.ANIMAL:
      return `Majestic full-body master reference portrait of ${name}, ${description}. Dynamic proud stance, hyper-detailed anatomical textures, piercing expressive eyes, subtle volumetric rim lighting, neutral studio background, 8k National Geographic documentary photography ${tag}`;
    case ENTITY_TYPES.PRODUCT:
      return `High-end commercial hero product photography of ${name}, ${description}. Floating weightlessly above a minimalist matte black pedestal, immaculate macro reflections, precision edge illumination, 8k commercial studio lighting ${tag}`;
    default:
      return `Master visual reference portrait of ${name}, ${description}, 8k photorealistic quality ${tag}`;
  }
}

// Intelligently segment raw input into distinct scene beats and strip markdown formatting
export function segmentRawInputIntoScenes(rawInput, targetSceneCount = null) {
  const text = String(rawInput || "").trim();
  if (!text) return [];

  // Check 1: Explicit double line breaks
  if (text.includes("\n\n")) {
    const blocks = text
      .split(/\n\s*\n+/)
      .map(b => b.trim())
      .filter(b => b.length > 0);
    if (blocks.length > 1) {
      return blocks;
    }
  }

  // Check 2: Scene markers e.g. "Scene 1:", "Shot 1:", "दृश्य 1:", "सीन 1:"
  const sceneMarkerRegex = /(?:^|\n)\s*(?:(?:###?\s*)?(?:\*{0,2})(?:Scene|Shot|Sequence|Take|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?)/iu;
  if (sceneMarkerRegex.test(text)) {
    const parts = text
      .split(/(?=(?:^|\n)\s*(?:(?:###?\s*)?(?:\*{0,2})(?:Scene|Shot|Sequence|Take|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?))/iu)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    if (parts.length > 1) {
      return parts;
    }
  }

  // Check 3: Numbered items e.g. "1. ...\n2. ..."
  const numberedListRegex = /(?:^|\n)\s*\d+[\.\)]\s+/;
  if (numberedListRegex.test(text)) {
    const parts = text
      .split(/(?=(?:^|\n)\s*\d+[\.\)]\s+)/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    if (parts.length > 1) {
      return parts;
    }
  }

  // Check 4: Bulleted items e.g. "- ...\n- ..." or "* ...\n* ..."
  const bulletRegex = /(?:^|\n)\s*[\*\-•]\s+/;
  if (bulletRegex.test(text)) {
    const parts = text
      .split(/(?=(?:^|\n)\s*[\*\-•]\s+)/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    if (parts.length > 1) {
      return parts;
    }
  }

  // Check 5: Multiple single-line statements
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 15);
  if (lines.length >= 3) {
    return lines;
  }

  // Check 6: Unstructured single narrative or prompt -> split by sentence and reconstruct into narrative beats
  const sentences = text
    .split(/(?<=[.?!।])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const desiredCount = targetSceneCount || (sentences.length >= 6 ? 4 : Math.max(3, sentences.length));

  if (sentences.length <= 1) {
    // If targetSceneCount > 1 was requested, or if input is minimal (< 35 chars e.g. "Tesla Roadster"), provide 4 clean progression beats
    if ((targetSceneCount && targetSceneCount > 1) || text.length < 35) {
      return [
        `Establishing view of ${text}`,
        `Dynamic motion of ${text}`,
        `Peak action sequence of ${text}`,
        `Heroic resolution of ${text}`
      ];
    }
    return [text];
  }

  // Distribute sentences evenly across desired scenes
  const scenes = [];
  const k = Math.min(desiredCount, sentences.length);
  for (let j = 0; j < k; j++) {
    const start = Math.floor((j * sentences.length) / k);
    const end = Math.floor(((j + 1) * sentences.length) / k);
    const chunk = sentences.slice(start, end).join(" ");
    if (chunk) scenes.push(chunk);
  }

  return scenes.length > 0 ? scenes : [text];
}

// Master Storyboard Synthesizer
export function analyzeAndBreakdownScript(args) {
  const {
    raw_input: rawInput,
    target_scene_count: targetSceneCount,
    aspect_ratio: aspectRatio = "16:9",
    genre_or_style: genreOrStyle,
    style_preset: stylePresetArg,
    pacing = "cinematic",
    protagonist_override: protagonistOverride
  } = args;

  if (!rawInput || typeof rawInput !== "string") {
    throw new Error("raw_input string is required for storyboard analysis");
  }

  const selectedPresetKey = stylePresetArg || detectStylePreset(rawInput) || "cinematic";
  const activePreset = STYLE_PRESETS[selectedPresetKey] || STYLE_PRESETS.cinematic;

  const lang = detectLanguage(rawInput);
  const { entities, primaryProtagonist, heroReferences } = detectProtagonistEntities(rawInput, protagonistOverride);
  const rawSceneSegments = segmentRawInputIntoScenes(rawInput, targetSceneCount);

  // Cinematic directorial camera and lighting templates
  const directorialTemplates = [
    {
      beat: "Establishing & Introduction",
      camera: "Cinematic wide establishing drone tracking shot, slowly descending with an anamorphic push-in",
      lighting: "Atmospheric volumetric lighting with soft directional sunbeams and subtle cinematic haze",
      pacingNote: "Steady, immersive opening pacing",
      defaultSlug: "intro"
    },
    {
      beat: "Escalation & Dynamic Motion",
      camera: "Dynamic low-angle tracking shot, tracking parallel to the subject with fluid kinetic motion",
      lighting: "Dramatic lateral rim lighting, motion blur on peripheral background, razor-sharp focus on subject",
      pacingNote: "Accelerating kinetic momentum",
      defaultSlug: "motion"
    },
    {
      beat: "Climax & Peak Energy",
      camera: "Fast orbiting 360-degree crane shot with intense dynamic perspective and rapid focal adjustment",
      lighting: "High-contrast chiaroscuro illumination with volumetric particles and vivid atmospheric reflections",
      pacingNote: "Peak energetic intensity",
      defaultSlug: "climax"
    },
    {
      beat: "Heroic Resolution & Lingering Visual",
      camera: "Slow-motion 120fps heroic low-angle visual, lingering subtle dolly back",
      lighting: "Golden hour sunset rim glow and soft ambient reflections, creamy anamorphic bokeh depth of field",
      pacingNote: "Poised, triumphant lingering resolution",
      defaultSlug: "resolution"
    },
    {
      beat: "Dramatic Transition & Tension",
      camera: "Tight over-the-shoulder push-in with rack focus transitioning between foreground and background",
      lighting: "Moody neon backlighting with subtle rain/dust reflections",
      pacingNote: "Suspenseful anticipatory pacing",
      defaultSlug: "transition"
    },
    {
      beat: "Epic Finale & Lingering Cut",
      camera: "Sweeping upward crane shot pulling back into epic cinematic wide horizon",
      lighting: "Breathtaking twilight illumination with expansive sky gradient",
      pacingNote: "Majestic cinematic fade",
      defaultSlug: "finale"
    }
  ];

  const storyboard = [];

  for (let idx = 0; idx < rawSceneSegments.length; idx++) {
    const rawSegment = rawSceneSegments[idx];
    const template = directorialTemplates[idx % directorialTemplates.length];
    const sceneNum = idx + 1;
    const sceneId = `scene_${String(sceneNum).padStart(2, "0")}`;

    // Clean up markdown headers, titles, asterisks, and scene labels
    let cleanPrompt = rawSegment
      // If scene header is on its own line e.g. "**Scene 1: The Lab**\n..."
      .replace(/^\s*\*{0,2}(?:###?\s*)?(?:Scene|Shot|Sequence|Take|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?[^\n]*\*{0,2}\s*\n+/iu, "")
      // If scene header is inline with prompt e.g. "Scene 1: Rohan runs..." or "दृश्य 2: वह बाहर..."
      .replace(/^\s*\*{0,2}(?:###?\s*)?(?:Scene|Shot|Sequence|Take|दृश्य|सीन)\s*(?:#?\d+|[a-zA-Z0-9_\-]+)\s*[:\-\.]?\s*/iu, "")
      .replace(/^\s*\*{1,3}[^\*\n]+\*{1,3}\s*\n+/u, "")
      .replace(/^\d+[\.\)]\s+/, "")
      .replace(/^[\*\-•]\s+/, "")
      .replace(/\*\*/g, "")
      .replace(/\n+/g, " ")
      .replace(/[.!,|:।\s-]+$/u, "")
      .trim();

    // Check existing #tags or construct a standardized tag
    const existingTagMatch = cleanPrompt.match(/#([a-zA-Z0-9_\-]+)/);
    const sceneTag = existingTagMatch ? `#${existingTagMatch[1]}` : `#${sceneId}_${primaryProtagonist || "scene"}_${template.defaultSlug}`;

    // Strip existing #tag from body if present to avoid duplication
    if (existingTagMatch) {
      cleanPrompt = cleanPrompt.replace(/#([a-zA-Z0-9_\-]+)/g, "").trim();
    }

    // Determine which entities belong in this scene by scanning triggers in cleanPrompt
    // Sort entities/triggers by length descending to match multi-word phrases first
    const entitiesInScene = [];
    let promptWithMentions = cleanPrompt;

    // Collect all candidate triggers across all entities
    const triggerPairs = [];
    for (const ent of entities) {
      const triggers = ent.triggers || [ent.name.toLowerCase(), ent.handle];
      for (const t of triggers) {
        triggerPairs.push({ trigger: t, handle: ent.handle });
      }
    }
    triggerPairs.sort((a, b) => b.trigger.length - a.trigger.length);

    for (const pair of triggerPairs) {
      if (promptWithMentions.includes(`@${pair.handle}`)) {
        if (!entitiesInScene.includes(pair.handle)) entitiesInScene.push(pair.handle);
        continue;
      }
      const testRegex = createWordRegex(pair.trigger);
      if (testRegex.test(promptWithMentions)) {
        promptWithMentions = replaceWord(promptWithMentions, pair.trigger, `@${pair.handle}`);
        if (!entitiesInScene.includes(pair.handle)) entitiesInScene.push(pair.handle);
      }
    }

    // If no entities matched this specific scene, only anchor to primaryProtagonist if scene has pronoun/reference
    if (entitiesInScene.length === 0 && primaryProtagonist) {
      const hasPronounOrRef = /\b(he|she|they|his|her|him|वह|उसने|उसका|उसकी)\b/iu.test(promptWithMentions);
      if (hasPronounOrRef) {
        entitiesInScene.push(primaryProtagonist);
      }
    }

    // Ensure clean prompt body punctuation and handle formatting before assembling final string
    promptWithMentions = promptWithMentions
      .replace(/@+([a-zA-Z0-9]+)_@+([a-zA-Z0-9]+)/g, "@$1_$2")
      .replace(/@+/g, "@")
      .replace(/[.!,|:।\s-]+$/u, "")
      .trim();

    // Synthesize full cinematic director prompt prioritizing user data
    // The user's exact scene action and data is the primary core of the prompt
    const hasCameraDirection = /(?:camera|shot|angle|lens|drone|aerial|wide|close[- ]?up|tracking|orbit|pan|zoom|tilt|overhead|macro|low[- ]?angle|high[- ]?angle|crane|pov|over[- ]the[- ]shoulder|fps)/i.test(promptWithMentions);
    const styleModifier = genreOrStyle ? `, ${genreOrStyle}` : `, ${activePreset.modifier}`;
    const lightingEnhancer = activePreset.id !== "cinematic" ? `, ${activePreset.lighting}` : "";

    // Adapt camera to interior context if needed
    const isInterior = /(?:room|bedroom|kitchen|office|lab|hall|interior|indoor|कमरा|हवेली|हॉल|घर)/iu.test(promptWithMentions);
    let cameraText = template.camera;
    if (isInterior && cameraText.toLowerCase().includes("drone")) {
      cameraText = "Cinematic wide interior establishing shot, slowly pushing in with motivated atmospheric lighting";
    }

    let fullPrompt;
    if (hasCameraDirection) {
      fullPrompt = `${promptWithMentions}. ${template.lighting}${lightingEnhancer}${styleModifier} ${sceneTag}`;
    } else {
      fullPrompt = `${promptWithMentions}. ${cameraText}, ${template.lighting}${lightingEnhancer}${styleModifier} ${sceneTag}`;
    }

    storyboard.push({
      sceneNumber: sceneNum,
      sceneId: sceneId,
      tag: sceneTag,
      beat: template.beat,
      prompt: fullPrompt,
      rawConcept: rawSegment,
      entitiesMentioned: entitiesInScene,
      camera: template.camera,
      lighting: template.lighting,
      duration: 10,
      isConcat: idx > 0
    });
  }

  // Format clean scriptText separated by blank lines (\n\n) for direct autopilot feeding
  const formattedScriptText = storyboard.map(s => s.prompt).join("\n\n");

  // Construct suggested action plan
  const actionPlan = [];
  const missingLocalEntities = entities.filter(e => !e.localAssetExists);
  const presentLocalEntities = entities.filter(e => e.localAssetExists);

  if (presentLocalEntities.length > 0) {
    actionPlan.push(`Upload local asset references: ${presentLocalEntities.map(e => `${e.name} (${e.localFileName})`).join(", ")} via deepx_upload_asset.`);
  }

  if (missingLocalEntities.length > 0) {
    actionPlan.push(`Generate master reference card(s) for ${missingLocalEntities.map(e => `@${e.handle}`).join(", ")} via deepx_generate_image or deepx_generate_character before triggering video render.`);
  }

  actionPlan.push(`Execute complete autonomous video storyboard via deepx_rapid_storyboard_autopilot with hero_references: [${heroReferences.map(h => `'${h}'`).join(", ")}].`);

  return {
    success: true,
    language: lang,
    genreOrStyle: genreOrStyle || activePreset.name,
    stylePreset: activePreset.id,
    stylePresetName: activePreset.name,
    aspectRatio,
    pacing,
    totalScenes: storyboard.length,
    primaryProtagonist,
    heroReferences,
    entities,
    storyboard,
    formattedScriptText,
    suggestedActionPlan: actionPlan
  };
}
