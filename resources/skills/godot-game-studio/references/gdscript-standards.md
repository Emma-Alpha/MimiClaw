# GDScript Coding Standards

## Type Safety

- **Always use static typing.** No untyped variables, parameters, or return values.
- Use `class_name` registration for all reusable scripts.
- Use typed arrays: `Array[Item]`, `Array[Vector2]`.
- Use `@export` with type hints for inspector exposure.

```gdscript
# Good
var health: int = 100
var velocity: Vector2 = Vector2.ZERO
var items: Array[Item] = []
func calculate_damage(base: int, multiplier: float) -> int:
    return int(base * multiplier)

# Bad
var health = 100
var velocity = Vector2.ZERO
func calculate_damage(base, multiplier):
    return base * multiplier
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `PlayerController` |
| Functions | snake_case | `calculate_damage()` |
| Variables | snake_case | `move_speed` |
| Constants | UPPER_SNAKE | `MAX_HEALTH` |
| Signals | snake_case (past tense event) | `health_changed` |
| Enums | PascalCase.UPPER_SNAKE | `State.IDLE` |
| Private members | prefix `_` | `_internal_timer` |
| Files | snake_case | `player_controller.gd` |
| Scenes | snake_case | `player.tscn` |
| Resources | snake_case | `sword_data.tres` |

## Code Organization

Order within a script:

1. `class_name` and `extends`
2. Doc comment
3. Signals
4. Enums
5. Constants
6. `@export` variables
7. Public variables
8. Private variables (`_prefixed`)
9. `@onready` variables
10. Built-in callbacks (`_ready`, `_process`, `_physics_process`, `_input`)
11. Public methods
12. Private methods (`_prefixed`)
13. Signal callbacks (`_on_*`)

```gdscript
class_name Player extends CharacterBody2D
## A playable character with movement and combat abilities.

signal health_changed(current: int, maximum: int)
signal died

enum State { IDLE, RUN, JUMP, ATTACK, HURT, DEAD }

const MAX_HEALTH: int = 100

@export var move_speed: float = 200.0
@export var jump_force: float = -400.0

var current_health: int = MAX_HEALTH
var current_state: State = State.IDLE

var _damage_cooldown: float = 0.0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var health_component: HealthComponent = $HealthComponent

func _ready() -> void:
    health_component.died.connect(_on_health_component_died)

func _physics_process(delta: float) -> void:
    _apply_gravity(delta)
    _handle_movement()
    move_and_slide()

func take_damage(amount: int) -> void:
    health_component.take_damage(amount)

func _apply_gravity(delta: float) -> void:
    if not is_on_floor():
        velocity.y += 980.0 * delta

func _handle_movement() -> void:
    var direction := Input.get_axis("move_left", "move_right")
    velocity.x = direction * move_speed

func _on_health_component_died() -> void:
    current_state = State.DEAD
    died.emit()
```

## Async Patterns

- Prefer `await` over callbacks.
- Use `await get_tree().process_frame` for next-frame execution.
- Use `await get_tree().create_timer(duration).timeout` for delays.
- Use Tweens for smooth value changes.

```gdscript
# Tween usage
func flash_white() -> void:
    var tween := create_tween()
    tween.tween_property(sprite, "modulate", Color.WHITE, 0.1)
    tween.tween_property(sprite, "modulate", Color(1, 1, 1, 1), 0.1)
    await tween.finished

# Async resource loading
func load_scene_async(path: String) -> PackedScene:
    ResourceLoader.load_threaded_request(path)
    while ResourceLoader.load_threaded_get_status(path) == ResourceLoader.THREAD_LOAD_IN_PROGRESS:
        await get_tree().process_frame
    return ResourceLoader.load_threaded_get(path) as PackedScene
```

## Error Handling

```gdscript
# Use push_error for critical issues
# Use push_warning for non-critical issues
# Use assert for debug-only checks

func load_data(path: String) -> Resource:
    if not FileAccess.file_exists(path):
        push_error("Data file not found: %s" % path)
        return null
    var resource := load(path)
    if resource == null:
        push_error("Failed to load resource: %s" % path)
    return resource

# Guard clauses for early return
func interact(target: Node) -> void:
    if not target:
        return
    if not target.has_method("on_interact"):
        return
    if not _can_interact:
        return
    target.on_interact(self)
```

## Documentation

```gdscript
## A component that manages an entity's health pool.
##
## Attach as a child node to any entity that can take damage.
## Emits [signal died] when health reaches zero.
class_name HealthComponent extends Node

## Emitted when health value changes.
signal health_changed(current: int, maximum: int)

## Emitted when health reaches zero.
signal died

## The maximum health value. Set via inspector or code.
@export var max_health: int = 100
```

- Use `##` doc comments for classes, signals, exports, and public methods.
- Keep comments for *why*, not *what*. The code shows what.
- Don't comment obvious code.

## Things to Avoid

- `get_node()` with long string paths — use `@onready` or `@export`.
- `$` with runtime-constructed paths — fragile and slow.
- `call_deferred()` as a default — understand why you need it.
- `yield()` — deprecated, use `await`.
- `connect()` with string method names — use callables: `signal.connect(_on_method)`.
- `preload()` for large resources — use threaded loading.
- Circular references between scripts.
