---
name: game-studio
description: "Game Studio: design, prototype, and ship browser games with guided 2D/3D workflows, asset pipelines, image generation, and playtesting. Use when the user wants to build a game, prototype gameplay, generate game assets, or plan a game project."
requires_skills:
  - image-gen
  - video-gen
  - model3d-gen
metadata:
  openclaw:
    emoji: "🎮"
---

# Game Studio

## Overview

Use this skill as the umbrella entrypoint for browser-game work. Default to a 2D Phaser path unless the user explicitly asks for 3D, Three.js, React Three Fiber, shader-heavy rendering, or another WebGL-first direction.

This plugin is intentionally asymmetric:

- 2D is the strongest execution path in v1.
- 3D has one opinionated default ecosystem: vanilla Three.js for plain TypeScript or Vite apps, React Three Fiber for React-hosted 3D apps, and GLB or glTF 2.0 as the default shipping asset format.
- Shared architecture, UI, and playtest practices apply to both.

## Bundled Capabilities

This skill automatically activates the following sub-skills:

- **image-gen**: Generate 2D game assets (sprites, backgrounds, UI elements, effects) via text-to-image and image-to-image.
- **video-gen**: Generate game trailers, cutscene clips, and animation references via text-to-video.
- **model3d-gen**: Generate 3D models for game objects, characters, and environments via text-to-3D.

When you need to generate or edit visual assets, use the corresponding skill directly. Do not ask the user to invoke them separately.

## Use This Skill When

- the user is still choosing a stack
- the request spans multiple domains such as runtime, UI, asset pipeline, and QA
- the user says "help me build a game" without naming the implementation path
- the user wants to generate game art, sprites, 3D models, or video assets as part of game development

## Do Not Stay Here When

- the runtime is clearly plain Three.js
- the runtime is clearly React Three Fiber
- the task is clearly a shipped-asset problem
- the task is clearly frontend-only or QA-only

Once the intent is clear, route to the most specific specialist skill and continue from there.

## Routing Rules

1. Classify the request before designing or coding:
   - `2D default`: Phaser, sprites, tilemaps, top-down, side-view, grid tactics, action platformers.
   - `3D + plain TS/Vite`: imperative scene control, engine-like loops, non-React apps, direct Three.js work.
   - `3D + React`: React-hosted product surfaces, declarative scene composition, shared React state, UI-heavy 3D apps.
   - `3D asset pipeline`: GLB, glTF, texture packaging, compression, LOD, runtime asset size.
   - `Alternative engine`: Babylon.js or PlayCanvas requests, usually as comparison or ecosystem fit questions.
   - `Shared`: core loop design, frontend direction, save/debug/perf boundaries, browser QA.
2. Route to the specialist skills immediately after classification:
   - Shared architecture and engine choice: `skills/web-game-foundations/SKILL.md`
   - Deep 2D implementation: `skills/phaser-2d-game/SKILL.md`
   - Vanilla Three.js implementation: `skills/three-webgl-game/SKILL.md`
   - React-hosted 3D implementation: `skills/react-three-fiber-game/SKILL.md`
   - 3D asset shipping and optimization: `skills/web-3d-asset-pipeline/SKILL.md`
   - HUD and menu direction: `skills/game-ui-frontend/SKILL.md`
   - 2D sprite generation and normalization: `skills/sprite-pipeline/SKILL.md`
   - Browser QA and visual review: `skills/game-playtest/SKILL.md`
3. Keep one coherent plan across the routed skills. Do not let engine, UI, asset, and QA decisions drift apart.

## Default Workflow

1. Lock the game fantasy and player verbs.
2. Define the core loop, failure states, progression, and target play session length.
3. Choose the implementation track:
   - Default to Phaser for 2D browser games.
   - Choose vanilla Three.js when the project is explicitly 3D and wants direct render-loop control in a plain TypeScript or Vite app.
   - Choose React Three Fiber when the project already lives in React or wants declarative scene composition with shared React state.
   - Choose raw WebGL only when the user explicitly wants a custom renderer or shader-first surface.
4. Define the UI surface early. Browser games usually need a DOM HUD and menu layer even when the playfield is canvas or WebGL.
   - For 3D starter scaffolds, default to a low-chrome HUD that preserves the playfield and keeps secondary panels collapsed.
5. Decide the asset workflow:
   - 2D characters and effects: use `sprite-pipeline` and `image-gen`.
   - 3D models, textures, and shipping format: use `web-3d-asset-pipeline` and `model3d-gen`.
   - Video assets and animation references: use `video-gen`.
6. Close with a playtest loop before calling the work production-ready.

## Game Art Generation Rules

When using **image-gen** to generate game assets, follow these rules strictly.

### Asset Manifest First

Before generating any assets, output a resource manifest table:
- Resource name, output path, type (sprite/background/UI/effect), transparent or opaque, required or optional.
- Keep the list minimal — fewer, higher-quality assets are better than many mediocre ones.
- If a resource can be drawn with code (simple shapes, particles), skip generation.

### Resource Generation Standards

1. Format: PNG.
2. Characters, projectiles, explosions, icons, buttons, UI panels: **transparent background**.
3. Scene backgrounds: **opaque background**.
4. Subject centered with adequate padding on all sides for easy integration.
5. No watermarks, no branding, no logos.
6. **No baked-in text** — all text (HP, labels, button captions) must be rendered in code.
7. Consistent art style across ALL generated assets.
8. All assets must be original — do not replicate specific commercial characters.

### image-gen Prompt Template

Every call to image-gen MUST include ALL of the following fields:

```
- Resource name:
- Purpose:
- Output path:
- Style:
- Subject description:
- Composition:
- Background:
- Color palette:
- Restrictions:
- Output format:
```

Defaults:
- **Composition**: subject centered, edge padding, suitable for game engine import.
- **Background**: transparent (except scene backgrounds).
- **Restrictions**: original, no text, no watermark, no branding, no trademarks, no complex background clutter.

### Style Consistency

- Generate the **scene background first** to establish the visual tone and color palette.
- For subsequent assets, explicitly reference the established style in the prompt: "matching the bright cartoon style of the game background."
- When generating paired assets (e.g., blue team / red team), use identical prompts with only the color swapped.
- If image-gen supports using a reference image for style consistency, use the previously generated background as reference.

### Output Path

Save generated images **directly into the game project directory** (e.g., `assets/player_blue.png`), NOT to the default `~/Downloads/image-gen/`. Override the output path in the image-gen script.

### File Naming Convention

Use clear, lowercase, underscore-separated names grouped by type:
- `assets/backgrounds/battle_bg.png`
- `assets/sprites/player_blue.png`
- `assets/effects/explosion_ring.png`
- `assets/ui/panel_top.png`
- `assets/ui/button_primary.png`

### Quality Checklist

- Sprites: transparent background, subject centered, consistent scale across all characters
- Backgrounds: 16:9 aspect ratio (or as specified), no text baked in
- UI panels/buttons: transparent background, clean edges, no text baked in
- Effects (explosions, particles): transparent background, visually distinct at small game sizes
- All assets visually coherent when placed together in the game scene

## Output Expectations

- Execute the full workflow end-to-end in one run. Do not stop after outputting a plan or asset manifest.
- Generate art assets first, then write code that integrates them.
- For planning requests, return a game-specific plan with stack choice, gameplay loop, UI surface, asset workflow, and test approach.
- For implementation requests, keep the chosen stack obvious in the file structure and code boundaries.
- For mixed requests, preserve the plugin default: 2D Phaser first unless the user asks for something else.
- When the user asks about Babylon.js or PlayCanvas, compare them honestly but keep Three.js and R3F as the primary code-generation defaults unless the user explicitly chooses another engine.

## References

- Engine selection: `references/engine-selection.md`
- Three.js stack: `references/threejs-stack.md`
- React Three Fiber stack: `references/react-three-fiber-stack.md`
- 3D asset pipeline: `references/web-3d-asset-pipeline.md`
- Vanilla Three.js starter: `references/threejs-vanilla-starter.md`
- React Three Fiber starter: `references/react-three-fiber-starter.md`
- Frontend prompting patterns: `references/frontend-prompts.md`
- Playtest checklist: `references/playtest-checklist.md`

## Examples

- "Help me prototype a browser tactics game."
- "I need a Phaser-based action game loop with a HUD and menus."
- "I want a Three.js exploration demo with WebGL lighting and browser-safe UI."
- "I want a React-based 3D configurator with React Three Fiber."
- "Optimize my GLB assets for the web and keep the file sizes under control."
- "Set up the asset workflow for consistent 2D sprite animations."
- "Generate character sprites and background art for my 2D platformer."
