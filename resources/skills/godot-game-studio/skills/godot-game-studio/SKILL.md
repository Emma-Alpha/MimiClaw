---
name: godot-game-studio
description: Route Godot game development work. Use when the user needs stack selection and workflow planning across design, implementation, systems, and playtesting before moving to a specialist skill.
---

# Godot Game Studio

## Overview

Use this skill as the umbrella entrypoint for Godot 4 game development. Default to GDScript unless the user explicitly asks for C# or GDExtension.

## Use This Skill When

- the user is still choosing between 2D and 3D
- the request spans multiple domains
- the user says "help me build a game" without naming the specific system
- the user wants to plan game architecture from scratch

## Do Not Stay Here When

- the task is clearly 2D or 3D implementation
- the task is clearly a specific gameplay system
- the task is clearly shader, network, or AI work

Once the intent is clear, route to the most specific specialist skill.

## Routing Rules

1. Classify the request:
   - `2D`: platformer, top-down, tactics, pixel art, tile-based → `../godot-2d-game/SKILL.md`
   - `3D`: first/third-person, open world, simulation → `../godot-3d-game/SKILL.md`
   - `Architecture`: scene design, project structure → `../godot-foundations/SKILL.md`
   - `Gameplay`: combat, inventory, state machines → `../godot-gameplay-systems/SKILL.md`
   - `AI`: behavior trees, pathfinding, NPC logic → `../godot-game-ai/SKILL.md`
   - `Networking`: multiplayer, synchronization → `../godot-networking/SKILL.md`
   - `UI`: HUD, menus, themes → `../godot-ui-design/SKILL.md`
   - `Shaders`: visual effects, materials → `../godot-shaders/SKILL.md`
   - `Assets`: import, optimization, pipeline → `../godot-asset-pipeline/SKILL.md`
   - `QA`: playtesting, profiling, release → `../godot-playtest/SKILL.md`

2. Keep one coherent plan across routed skills.

## Default Workflow

1. Lock the game fantasy and player verbs.
2. Define the core loop, failure states, progression.
3. Choose 2D or 3D track.
4. Establish scene architecture.
5. Implement gameplay systems with data-driven design.
6. Build the UI layer.
7. Close with a playtest loop.

## References

- Architecture: `../../references/godot-architecture.md`
- GDScript standards: `../../references/gdscript-standards.md`
- GDD template: `../../references/gdd-template.md`
