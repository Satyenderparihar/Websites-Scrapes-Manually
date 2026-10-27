---
name: matanyone-video-matting
description: >-
  Generates consistent character and object video generations optimized for video matting, chroma keying, background removal, and VFX compositing on Google Flow. Inspired by pq-yang/MatAnyone. Use when the user requests green screen, solid black background, character isolation, rotoscoping, or transparent-ready video layers.
---

# MatAnyone Consistent Character Video Matting Skill

Based on the consistent appearance memory and object matting principles from `pq-yang/MatAnyone`.

## Core Directives for Video Matting & Background Isolation

1. **Clean Studio Background Directives**:
   - `solid chroma key green studio background (#00FF00)`, `seamless green cyclorama backdrop`, `pure solid black studio void backdrop (#000000)`, `isolated subject against uniform solid backdrop for clean alpha matting`.

2. **Silhouette & Edge Definition**:
   - `razor-sharp edge definition with high-contrast rim lighting`, `zero green spill on subject hair and clothing`, `clean silhouette contour separation`, `studio backlight highlighting subject edges for effortless alpha extraction`.

3. **Consistent Character Motion**:
   - Controlled character action with minimal motion blur (`crisp 60fps shutter speed aesthetics, minimal motion blur, sharp foreground separation`).
   - 360-degree turntable rotation or steady frontal camera tracking.

4. **DeepX Integration**:
   - Double-lock the protagonist reference card (`@protagonist_name`) to guarantee facial and costume consistency while isolating against solid chroma backgrounds for post-production VFX in Premiere, CapCut, or DaVinci Resolve.
