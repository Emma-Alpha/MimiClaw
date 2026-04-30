---
name: godot-foundations
description: Establish Godot 4 project architecture before implementation. Use when the user needs scene tree design, system boundaries, project structure, scripting language choice, or data flow strategy.
---

# Godot Foundations

## Overview

Use this skill to establish the non-negotiable architecture before implementation starts. Godot projects degrade quickly when scene design, system boundaries, state management, and resource loading are mixed together without clear ownership.

## Use This Skill When

- the user has not settled the project structure
- the task is about scene composition, system boundaries, or state ownership
- multiple specialist skills need one shared architectural frame

## Scene Architecture Principles

1. **Composition over inheritance.**
   - Build complex behaviors by combining focused, single-purpose scenes.
   - A Player scene contains HealthComponent, InventoryComponent, StateMachine as child scenes — not one 2000-line script.

2. **Self-contained scenes.**
   - Each scene should be runnable independently via F6 for testing.
   - No scene should crash when instantiated without its expected parent.

3. **Shallow node trees.**
   - Minimize hierarchy depth. Flat structures are easier to reason about.
   - Deep nesting creates fragile `get_node("../../../SomeNode")` references.

4. **Single responsibility.**
   - One node/script does one thing well.
   - Split scripts over 300 lines into components.

## Node Reference Rules

```gdscript
# @onready for internal child references — resolved once at _ready()
@onready var health: HealthComponent = $HealthComponent
@onready var sprite: AnimatedSprite2D = $Sprite

# @export for inspector-configurable dependencies
@export var projectile_scene: PackedScene
@export var move_speed: float = 200.0

# NEVER use string paths to distant nodes
# Bad: get_node("/root/Game/Level/Enemies/Boss")
# Good: use groups, signals, or exported NodePath
```

## Signal-Driven Communication

```gdscript
# Define signals for decoupled communication
signal health_changed(new_value: int, max_value: int)
signal died

# Emit signals — never call parent methods directly
func take_damage(amount: int) -> void:
    current_health -= amount
    health_changed.emit(current_health, max_health)
    if current_health <= 0:
        died.emit()
```

Rules:
- Prefer signals over direct method calls between unrelated systems.
- Connect in `_ready()` or via the editor — document which.
- Use an EventBus autoload only for truly global events (level_completed, game_paused).
- Avoid signal chains longer than 3 hops — refactor with an intermediary.

## Resource-Based Data

```gdscript
class_name WeaponData extends Resource

@export var weapon_name: StringName
@export var damage: int = 10
@export var attack_speed: float = 1.0
@export var range_distance: float = 100.0
@export var icon: Texture2D
```

- Save as `.tres` files for editor integration and hot-reload.
- Use Resource UIDs for stable cross-references.
- Treat Resources as immutable data at runtime unless explicitly designed as state containers.

## Project Structure

```
project.godot
├── src/                    # All game scripts
│   ├── player/             # Player-related scenes and scripts
│   ├── enemies/            # Enemy types
│   ├── systems/            # Gameplay systems (combat, inventory, quest)
│   ├── ui/                 # UI scenes and scripts
│   ├── world/              # Level and environment scripts
│   ├── autoloads/          # Autoload singletons
│   └── shared/             # Shared utilities, base classes
├── scenes/                 # Scene files (.tscn)
│   ├── levels/
│   ├── characters/
│   ├── ui/
│   └── effects/
├── assets/                 # Raw assets
│   ├── sprites/
│   ├── models/
│   ├── audio/
│   ├── fonts/
│   └── shaders/
├── data/                   # Game data (Resources, JSON)
│   ├── items/
│   ├── enemies/
│   └── levels/
├── addons/                 # Godot plugins
└── tests/                  # GUT or GdUnit4 test files
```

## Autoload Rules

Use autoloads sparingly — only for truly global systems:

- **EventBus** — Global signal relay for cross-system events.
- **AudioManager** — Sound playback management.
- **SaveManager** — Save/load coordination.
- **GameState** — Minimal global game state (current level, difficulty).
- **SceneManager** — Scene transition logic.

Do NOT autoload systems that can be scene-local (UI managers, camera controllers, input handlers).

## Scripting Language Selection

| Criteria | GDScript | C# | GDExtension |
|----------|----------|-----|-------------|
| Iteration speed | Best | Good | Slow |
| Godot API integration | Native | Bridge | Native (C++) |
| Team experience | Default | .NET teams | Engine devs |
| Performance | Good | Better | Best |
| Ecosystem access | Godot addons | NuGet packages | C/C++ libs |
| Hot reload | Full | Partial | None |

Default to GDScript unless there is a specific reason not to.

## Implementation Checklist

Define these before writing core code:

- [ ] Player fantasy and primary verbs
- [ ] Core loop and failure/reset states
- [ ] 2D or 3D track
- [ ] Scene composition strategy
- [ ] System boundaries (what owns what)
- [ ] Autoload inventory (keep minimal)
- [ ] Asset manifest and naming conventions
- [ ] Save data boundary (what is serializable)
- [ ] Input action map
- [ ] Target platforms and minimum specs

## Anti-Patterns

- God-scripts with 1000+ lines doing everything
- Deep node hierarchies with fragile string paths
- Game logic in `_process()` without system boundaries
- Autoloading everything instead of scene composition
- Mutable global state scattered across autoloads
- Signals connected but never disconnected (memory leaks with freed nodes)
- Using `get_node()` with absolute paths across scene boundaries

## References

- GDScript standards: `../../references/gdscript-standards.md`
- Architecture patterns: `../../references/godot-architecture.md`
- GDD template: `../../references/gdd-template.md`
- ADR template: `../../references/adr-template.md`
