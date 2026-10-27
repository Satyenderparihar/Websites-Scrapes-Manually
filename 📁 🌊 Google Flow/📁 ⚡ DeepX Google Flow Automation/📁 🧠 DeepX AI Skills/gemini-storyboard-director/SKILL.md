---
name: gemini-storyboard-director
description: >-
  Advanced multimodal storyboard director and cinematic choreography engine on Google Flow. Inspired by philschmid/gemini-samples. Use when the user requests cinematic prompt expansion, multimodal narrative breakdown, complex camera moves (crane, drone, orbit), lighting design, or narrative emotional beats.
---

# Gemini Multimodal Storyboard Director Skill

Based on Google DeepMind & Gemini multimodal storytelling samples from `philschmid/gemini-samples`.

## Directorial Architecture

1. **Multimodal Narrative Beat Formulation**:
   - Converts raw script or story concepts into three distinct cinematic layers:
     - **Visual Action**: What the protagonist and environment are physically doing.
     - **Camera Choreography**: Specific focal length, angle, and dynamic camera movement (`35mm anamorphic wide lens`, `rapid orbiting crane tracking shot`, `low-angle dynamic Dutch tilt`).
     - **Lighting & Atmosphere**: Volumetric lighting, environmental depth (`atmospheric mist`, `golden hour rim lighting`, `moody neon reflections on wet asphalt`).

2. **Shot Type Progression**:
   - **Scene 1 (Establishing Shot)**: Extreme wide aerial or drone establishing master view.
   - **Scene 2 (Character Introduction)**: Medium tracking shot anchoring `@protagonist_name`.
   - **Scene 3 (Dramatic Climax)**: Dynamic orbiting low-angle shot with high volumetric contrast.
   - **Scene 4 (Hero Resolution)**: Slow push-in close-up with shallow depth of field (bokeh).

3. **Seamless Chaining**:
   - Matches the ending visual state of Scene $N$ to the opening visual state of Scene $N+1$ using in-memory HTML5 Canvas continuity.
