---
name: godot-3d-game
description: Implement 3D games with Godot 4. Use when the user wants to build first-person, third-person, open world, exploration, or simulation games with CharacterBody3D, CSG, MeshInstance3D, and Godot's 3D rendering pipeline.
---

# Godot 3D Game

## Overview

Use this skill for 3D game implementation in Godot 4. Covers first-person, third-person, open world, exploration, simulation, and architectural visualization.

## Core 3D Nodes

| Node | Use Case |
|------|----------|
| `CharacterBody3D` | Player and NPC movement with collision |
| `RigidBody3D` | Physics-driven objects |
| `StaticBody3D` | Immovable world geometry |
| `Area3D` | Triggers, pickups, damage zones |
| `MeshInstance3D` | Visual mesh rendering |
| `CSGBox3D` / `CSGCombiner3D` | Prototyping geometry (not for production) |
| `Camera3D` | Player viewport |
| `DirectionalLight3D` | Sun/moon lighting |
| `OmniLight3D` / `SpotLight3D` | Point and spot lights |
| `WorldEnvironment` | Sky, fog, tonemap, ambient lighting |
| `NavigationRegion3D` | AI pathfinding mesh |
| `GPUParticles3D` | Particle effects |

## First-Person Controller

```gdscript
class_name FPSController extends CharacterBody3D

@export var move_speed: float = 5.0
@export var sprint_speed: float = 8.0
@export var jump_force: float = 4.5
@export var mouse_sensitivity: float = 0.002

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

func _ready() -> void:
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion:
        rotate_y(-event.relative.x * mouse_sensitivity)
        head.rotate_x(-event.relative.y * mouse_sensitivity)
        head.rotation.x = clampf(head.rotation.x, deg_to_rad(-89), deg_to_rad(89))
    if event.is_action_pressed("ui_cancel"):
        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta

    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_force

    var speed := sprint_speed if Input.is_action_pressed("sprint") else move_speed
    var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

    if direction:
        velocity.x = direction.x * speed
        velocity.z = direction.z * speed
    else:
        velocity.x = move_toward(velocity.x, 0, speed)
        velocity.z = move_toward(velocity.z, 0, speed)

    move_and_slide()
```

## Third-Person Controller

```gdscript
class_name ThirdPersonController extends CharacterBody3D

@export var move_speed: float = 5.0
@export var rotation_speed: float = 10.0

@onready var camera_pivot: Node3D = $CameraPivot
@onready var camera: Camera3D = $CameraPivot/SpringArm3D/Camera3D
@onready var model: Node3D = $Model

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta

    var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var direction := Vector3(input_dir.x, 0, input_dir.y).rotated(Vector3.UP, camera_pivot.rotation.y).normalized()

    if direction:
        velocity.x = direction.x * move_speed
        velocity.z = direction.z * move_speed
        # Rotate model to face movement direction
        var target_angle := atan2(direction.x, direction.z)
        model.rotation.y = lerp_angle(model.rotation.y, target_angle, rotation_speed * delta)
    else:
        velocity.x = move_toward(velocity.x, 0, move_speed)
        velocity.z = move_toward(velocity.z, 0, move_speed)

    move_and_slide()
```

## 3D Environment Setup

### World Environment

```gdscript
# WorldEnvironment node with Environment resource
# Configure in editor or via code:
var env := Environment.new()
env.background_mode = Environment.BG_SKY
env.sky = Sky.new()
env.sky.sky_material = ProceduralSkyMaterial.new()
env.tonemap_mode = Environment.TONE_MAP_ACES
env.ssao_enabled = true
env.sdfgi_enabled = true  # Global illumination
env.glow_enabled = true
```

### Lighting Strategy

- Use `DirectionalLight3D` for sun with shadow enabled.
- Use `OmniLight3D` sparingly for point lights (expensive with shadows).
- Use `ReflectionProbe` for baked reflections in key areas.
- Use `LightmapGI` for baked lighting in static scenes.
- Use `VoxelGI` or `SDFGI` for dynamic global illumination.

## Level Streaming

For large worlds, use scene composition:

```gdscript
class_name LevelStreamer extends Node3D

@export var load_distance: float = 100.0
@export var unload_distance: float = 150.0

var chunks: Dictionary = {}  # Vector2i -> Node3D

func _process(_delta: float) -> void:
    var player_chunk := world_to_chunk(player.global_position)
    _load_nearby_chunks(player_chunk)
    _unload_distant_chunks(player_chunk)

func _load_nearby_chunks(center: Vector2i) -> void:
    for x in range(center.x - 2, center.x + 3):
        for z in range(center.y - 2, center.y + 3):
            var key := Vector2i(x, z)
            if key not in chunks:
                _async_load_chunk(key)

func _async_load_chunk(key: Vector2i) -> void:
    var path := "res://scenes/levels/chunk_%d_%d.tscn" % [key.x, key.y]
    ResourceLoader.load_threaded_request(path)
    # Check status in _process and instantiate when ready
```

## Physics

- Use collision layers and masks to control what interacts.
- Layer 1: World geometry.
- Layer 2: Player.
- Layer 3: Enemies.
- Layer 4: Projectiles.
- Layer 5: Triggers/Areas.
- Use `ShapeCast3D` for ground detection and ledge checks.
- Use `RayCast3D` for line-of-sight and interaction.

## Anti-Patterns

- Using CSG nodes in production (they're for prototyping only)
- Not setting collision layers/masks (everything collides with everything)
- Baking lighting on dynamic objects
- Using `_process()` for physics movement (use `_physics_process()`)
- Loading entire world at once instead of streaming
- Hardcoding camera sensitivity without player settings

## References

- Foundations: `../godot-foundations/SKILL.md`
- Shaders: `../godot-shaders/SKILL.md`
- Performance: `../../references/godot-performance.md`
- Asset pipeline: `../godot-asset-pipeline/SKILL.md`
