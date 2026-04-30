---
name: godot-game-studio
description: "Godot Game Studio: design, prototype, and ship Godot 4 games with guided 2D/3D workflows, gameplay systems, AI, networking, shader pipelines, and playtesting. Use when the user wants to build a Godot game, write GDScript/C#/GDExtension code, design game systems, or plan game architecture."
requires_skills:
  - image-gen
  - model3d-gen
metadata:
  openclaw:
    emoji: "🎮"
---

# Godot Game Studio

## Overview

Use this skill as the umbrella entrypoint for Godot 4 game development. It provides a structured, studio-grade workflow covering the full lifecycle: concept, architecture, implementation, testing, and release.

This plugin covers:

- **2D** is a first-class path: platformers, top-down, tactics, pixel art, side-scrollers.
- **3D** is a first-class path: first-person, third-person, open world, exploration, simulation.
- **Shared** practices: gameplay systems, AI, UI, audio, networking, shaders, and QA apply to both.

## Bundled Capabilities

This skill automatically activates the following sub-skills:

- **image-gen**: Generate 2D game assets (sprites, backgrounds, UI elements, effects) via text-to-image.
- **model3d-gen**: Generate 3D models for game objects, characters, and environments via text-to-3D.

When you need to generate visual assets, use the corresponding skill directly.

## Collaboration Protocol

Follow this decision-making flow for all non-trivial work:

1. **Clarify** — Read existing design docs and code, identify ambiguities, ask clarifying questions.
2. **Options** — Present 2-4 approaches with trade-offs (performance, complexity, maintainability).
3. **Decision** — Wait for user approval before implementing.
4. **Draft** — Implement the approved approach.
5. **Review** — Flag any deviations, offer testing steps and next actions.

Never make unilateral architecture decisions. Propose, explain trade-offs, wait for approval.

## Use This Skill When

- the user wants to build a game with Godot Engine
- the user says "help me make a game" without naming a specific system
- the request spans multiple domains: gameplay, UI, assets, networking, QA
- the user is choosing between 2D and 3D, or between GDScript and C#

## Do Not Stay Here When

- the task is clearly 2D-only implementation
- the task is clearly 3D-only implementation
- the task is clearly a gameplay system (AI, inventory, combat)
- the task is clearly shader work or networking

Once the intent is clear, route to the most specific specialist skill and continue from there.

## Routing Rules

1. Classify the request before designing or coding:
   - `2D`: platformer, top-down, tactics, side-view, pixel art, tile-based.
   - `3D`: first-person, third-person, open world, exploration, simulation.
   - `Gameplay systems`: state machines, inventory, combat, economy, progression.
   - `Game AI`: behavior trees, utility AI, pathfinding, perception, NPC decision-making.
   - `Networking`: multiplayer, server authority, client prediction, synchronization.
   - `UI/UX`: HUD, menus, responsive layout, theme, accessibility.
   - `Shaders`: visual effects, materials, post-processing, compute shaders.
   - `Assets`: asset pipeline, import settings, resource management, optimization.
   - `QA`: playtesting, debugging, performance profiling, release checks.
   - `Architecture`: scene design, project structure, system boundaries, data flow.

2. Route to the specialist skill immediately after classification:
   - Architecture and foundations: `skills/godot-foundations/SKILL.md`
   - 2D game implementation: `skills/godot-2d-game/SKILL.md`
   - 3D game implementation: `skills/godot-3d-game/SKILL.md`
   - Gameplay systems: `skills/godot-gameplay-systems/SKILL.md`
   - AI systems: `skills/godot-game-ai/SKILL.md`
   - Multiplayer networking: `skills/godot-networking/SKILL.md`
   - UI/UX design: `skills/godot-ui-design/SKILL.md`
   - Shader development: `skills/godot-shaders/SKILL.md`
   - Asset pipeline: `skills/godot-asset-pipeline/SKILL.md`
   - QA and playtesting: `skills/godot-playtest/SKILL.md`

3. Keep one coherent plan across routed skills. Do not let architecture, gameplay, UI, and QA decisions drift apart.

## Default Workflow

1. Lock the game fantasy, player verbs, and core loop.
2. Define failure states, progression, and target play session length.
3. Choose the implementation track:
   - Default to 2D for sprite-based, tile-based, or side-view games.
   - Choose 3D when camera depth, materials, or spatial exploration are central.
4. Establish the scene architecture and system boundaries.
5. Choose the scripting language:
   - Default to GDScript for most projects (fastest iteration, best Godot integration).
   - Choose C# when the team has strong C# experience or needs .NET ecosystem access.
   - Choose GDExtension for performance-critical native code.
6. Define the asset workflow:
   - 2D: use `image-gen` for sprites, backgrounds, UI elements.
   - 3D: use `model3d-gen` for models, then optimize via asset pipeline.
7. Implement gameplay systems with data-driven design.
8. Build UI layer: Control nodes for in-game, DOM overlay patterns for complex menus.
9. Close with a playtest loop before calling the work production-ready.

## Game Art Generation Rules

**Always use image-gen or model3d-gen for visual assets.** Do NOT substitute with placeholder shapes unless explicitly temporary.

### Asset Generation Standards

1. Format: PNG with transparency for sprites and UI; opaque for backgrounds.
2. Subject centered with adequate padding for easy integration.
3. No watermarks, no branding, no baked-in text.
4. Consistent art style across ALL generated assets.
5. All assets must be original.

### File Naming Convention

Use clear, lowercase, underscore-separated names grouped by type:

- `assets/sprites/player_idle.png`
- `assets/backgrounds/forest_bg.png`
- `assets/ui/health_bar.png`
- `assets/effects/explosion_01.png`
- `assets/models/enemy_goblin.glb`
- `assets/audio/sfx_jump.ogg`

## Output Expectations

- Execute the full workflow end-to-end. Do not stop after outputting a plan.
- Generate art assets first, then write code that loads them.
- For planning requests, return a game-specific plan with architecture, gameplay loop, UI surface, asset workflow, and test approach.
- For implementation requests, write production-quality GDScript with full static typing.
- Always follow Godot 4 API conventions — verify APIs against the target Godot version.

## References

- Architecture: `references/godot-architecture.md`
- GDScript standards: `references/gdscript-standards.md`
- Performance guide: `references/godot-performance.md`
- Shader guide: `references/godot-shader-guide.md`
- Networking guide: `references/godot-networking.md`
- AI systems: `references/game-ai-systems.md`
- Economy design: `references/economy-design.md`
- Level design: `references/level-design.md`
- Audio systems: `references/audio-systems.md`
- Accessibility: `references/accessibility.md`
- GDD template: `references/gdd-template.md`
- ADR template: `references/adr-template.md`
- Playtest checklist: `references/playtest-checklist.md`

## Examples

- "Help me build a 2D pixel-art roguelike with Godot."
- "Design the combat system for my action RPG."
- "Set up multiplayer networking for my co-op game."
- "I need an AI system for enemy NPCs using behavior trees."
- "Optimize my 3D open world game's performance."
- "Create the UI/HUD for my survival game."
- "Write a water shader for my 2D game."
- "Plan the full architecture for my metroidvania."
