# Godot Architecture Patterns

## Component Pattern

The primary architectural pattern for Godot: attach behavior as child nodes.

```
Player (CharacterBody2D)
├── Sprite (AnimatedSprite2D)
├── CollisionShape (CollisionShape2D)
├── HealthComponent (Node)
├── HurtboxComponent (Area2D)
├── HitboxComponent (Area2D)
├── InventoryComponent (Node)
├── StateMachine (Node)
│   ├── IdleState (Node)
│   ├── RunState (Node)
│   ├── JumpState (Node)
│   └── AttackState (Node)
├── CoyoteTimer (Timer)
└── Camera (Camera2D)
```

### Benefits

- Each component is testable in isolation.
- Components are reusable across entities.
- Adding/removing behavior = adding/removing child nodes.
- No deep inheritance chains.

### Rules

- Components communicate via signals, not direct method calls to siblings.
- The parent entity coordinates components, children don't know about each other.
- Each component has a single, clear responsibility.

## Event Bus Pattern

For truly global events that don't belong to any specific scene:

```gdscript
# autoloads/event_bus.gd
class_name EventBus extends Node

signal level_completed(level_id: int)
signal game_paused(is_paused: bool)
signal player_died
signal item_collected(item: ItemData)
signal dialogue_started(dialogue_id: StringName)
signal dialogue_finished
signal achievement_unlocked(achievement_id: StringName)
```

### When to Use

- Cross-system events (UI reacting to gameplay events).
- Events that multiple unrelated systems care about.
- Events where the emitter shouldn't know about receivers.

### When NOT to Use

- Communication between parent and child nodes (use direct signals).
- Communication within the same system (use local signals).
- Frequent per-frame data (use direct references).

## Service Locator Pattern

For systems that need to be accessible but shouldn't be autoloads:

```gdscript
# autoloads/services.gd
class_name Services extends Node

static var audio: AudioManager
static var save: SaveManager
static var input: InputManager

static func register(service_name: StringName, instance: Node) -> void:
    match service_name:
        &"audio": audio = instance as AudioManager
        &"save": save = instance as SaveManager
        &"input": input = instance as InputManager

static func unregister(service_name: StringName) -> void:
    match service_name:
        &"audio": audio = null
        &"save": save = null
        &"input": input = null
```

## Object Pool Pattern

For frequently spawned/despawned objects:

```gdscript
class_name ObjectPool extends Node

@export var scene: PackedScene
@export var initial_size: int = 20

var _pool: Array[Node] = []

func _ready() -> void:
    for i in initial_size:
        var instance := scene.instantiate()
        instance.set_process(false)
        instance.set_physics_process(false)
        instance.visible = false
        add_child(instance)
        _pool.append(instance)

func acquire() -> Node:
    for obj in _pool:
        if not obj.visible:
            obj.visible = true
            obj.set_process(true)
            obj.set_physics_process(true)
            return obj
    # Pool exhausted — expand
    var instance := scene.instantiate()
    add_child(instance)
    _pool.append(instance)
    return instance

func release(obj: Node) -> void:
    obj.visible = false
    obj.set_process(false)
    obj.set_physics_process(false)
```

## Scene Transition Pattern

```gdscript
# autoloads/scene_manager.gd
class_name SceneManager extends CanvasLayer

@onready var animation_player: AnimationPlayer = $AnimationPlayer

var _target_scene: String = ""

func change_scene(path: String) -> void:
    _target_scene = path
    animation_player.play("fade_out")
    await animation_player.animation_finished
    get_tree().change_scene_to_file(_target_scene)
    animation_player.play("fade_in")
    await animation_player.animation_finished
```

## Dependency Injection via @export

```gdscript
# Instead of finding nodes at runtime, inject via editor
class_name EnemySpawner extends Node2D

@export var enemy_scene: PackedScene
@export var spawn_points: Array[Marker2D]
@export var spawn_interval: float = 3.0
@export var max_enemies: int = 10
@export var enemy_data: EnemyData  # Data-driven configuration
```

## Architecture Decision Record (ADR)

When making significant architectural decisions, document them:

1. What decision was made?
2. What alternatives were considered?
3. Why was this option chosen?
4. What are the trade-offs?
5. When might this decision need revisiting?

See `adr-template.md` for the full template.
