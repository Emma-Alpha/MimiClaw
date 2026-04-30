---
name: godot-2d-game
description: Implement 2D games with Godot 4. Use when the user wants to build platformers, top-down, tactics, side-scrollers, pixel art, or tile-based games with GDScript, TileMap, AnimatedSprite2D, and CharacterBody2D.
---

# Godot 2D Game

## Overview

Use this skill for 2D game implementation in Godot 4. Covers all 2D genres: platformers, top-down RPGs, tactics, side-scrollers, arcade, and pixel art games.

## Core 2D Nodes

| Node | Use Case |
|------|----------|
| `CharacterBody2D` | Player and NPC movement with collision |
| `RigidBody2D` | Physics-driven objects (projectiles, debris) |
| `StaticBody2D` | Immovable world geometry |
| `Area2D` | Triggers, pickups, damage zones |
| `TileMapLayer` | Grid-based level geometry (Godot 4.3+) |
| `AnimatedSprite2D` | Frame-based character animation |
| `AnimationPlayer` | Complex animation sequences |
| `Camera2D` | Viewport camera with smoothing and limits |
| `ParallaxBackground` | Depth layers for side-scrollers |
| `NavigationAgent2D` | AI pathfinding |

## Movement Patterns

### Platformer

```gdscript
class_name PlatformerPlayer extends CharacterBody2D

@export var move_speed: float = 300.0
@export var jump_force: float = -500.0
@export var gravity_scale: float = 1.0

@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var coyote_timer: Timer = $CoyoteTimer

var was_on_floor: bool = false
var can_coyote_jump: bool = false

func _physics_process(delta: float) -> void:
    # Gravity
    if not is_on_floor():
        velocity.y += ProjectSettings.get_setting("physics/2d/default_gravity") * gravity_scale * delta

    # Coyote time
    if was_on_floor and not is_on_floor() and velocity.y >= 0:
        can_coyote_jump = true
        coyote_timer.start()

    # Jump
    if Input.is_action_just_pressed("jump"):
        if is_on_floor() or can_coyote_jump:
            velocity.y = jump_force
            can_coyote_jump = false

    # Horizontal movement
    var direction := Input.get_axis("move_left", "move_right")
    velocity.x = direction * move_speed

    # Animation
    if direction != 0.0:
        animated_sprite.flip_h = direction < 0.0
        animated_sprite.play("run")
    elif not is_on_floor():
        animated_sprite.play("jump")
    else:
        animated_sprite.play("idle")

    was_on_floor = is_on_floor()
    move_and_slide()
```

### Top-Down

```gdscript
class_name TopDownPlayer extends CharacterBody2D

@export var move_speed: float = 200.0

func _physics_process(_delta: float) -> void:
    var input_dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
    velocity = input_dir.normalized() * move_speed
    move_and_slide()
```

### Grid-Based / Tactics

```gdscript
class_name GridMover extends Node2D

@export var grid_size: int = 16
@export var move_duration: float = 0.15

var grid_position: Vector2i = Vector2i.ZERO
var is_moving: bool = false

func move_to_grid(target: Vector2i) -> void:
    if is_moving:
        return
    is_moving = true
    grid_position = target
    var tween := create_tween()
    tween.tween_property(self, "position", Vector2(target * grid_size), move_duration)
    await tween.finished
    is_moving = false
```

## TileMap Setup (Godot 4.3+)

- Use `TileMapLayer` nodes (one per layer) instead of the deprecated `TileMap` node.
- Separate layers: ground, walls, decoration, collision.
- Use physics layers on tiles for collision.
- Use custom data layers for gameplay metadata (walkable, damage, slow).

```gdscript
# Read tile custom data
var tile_data := tilemap_layer.get_cell_tile_data(cell_position)
if tile_data:
    var is_walkable: bool = tile_data.get_custom_data("walkable")
```

## Camera

```gdscript
# Camera2D setup for platformer
@onready var camera: Camera2D = $Camera2D

func _ready() -> void:
    camera.position_smoothing_enabled = true
    camera.position_smoothing_speed = 5.0
    camera.limit_bottom = 600  # Set to level bounds
    camera.limit_left = 0

# Screen shake
func shake_camera(intensity: float, duration: float) -> void:
    var tween := create_tween()
    for i in int(duration / 0.05):
        tween.tween_property(camera, "offset",
            Vector2(randf_range(-intensity, intensity),
                    randf_range(-intensity, intensity)), 0.05)
    tween.tween_property(camera, "offset", Vector2.ZERO, 0.05)
```

## Pixel Art Settings

For pixel-art games, configure in Project Settings:

- `display/window/stretch/mode` = `canvas_items`
- `display/window/stretch/aspect` = `keep`
- `rendering/textures/canvas_textures/default_texture_filter` = `Nearest`
- Design at native resolution (e.g., 320x180) and scale up.

## Animation Best Practices

- Use `AnimatedSprite2D` for simple frame-based animation.
- Use `AnimationPlayer` for complex sequences involving multiple properties.
- Keep animation state derived from gameplay state:
  ```gdscript
  # Good: animation follows state
  func update_animation() -> void:
      match current_state:
          State.IDLE: animated_sprite.play("idle")
          State.RUN: animated_sprite.play("run")
          State.ATTACK: animated_sprite.play("attack")

  # Bad: gameplay logic in animation callbacks
  ```
- Use `animation_finished` signal for attack timing, not timers.

## 2D Lighting

```gdscript
# PointLight2D for dynamic lighting
# CanvasModulate for ambient darkness
# LightOccluder2D for shadow casting

# Day/night cycle
func set_time_of_day(hour: float) -> void:
    var t := clampf(hour / 24.0, 0.0, 1.0)
    var color := day_night_gradient.sample(t)
    canvas_modulate.color = color
```

## Anti-Patterns

- Using `RigidBody2D` for player movement (use `CharacterBody2D`)
- Hardcoding level geometry instead of using TileMap
- Animation logic controlling game state instead of reflecting it
- Using `set_position()` instead of `move_and_slide()` for physics bodies
- One massive scene file for the entire level

## References

- Foundations: `../godot-foundations/SKILL.md`
- Gameplay systems: `../godot-gameplay-systems/SKILL.md`
- UI design: `../godot-ui-design/SKILL.md`
- Asset pipeline: `../godot-asset-pipeline/SKILL.md`
- GDScript standards: `../../references/gdscript-standards.md`
- Level design: `../../references/level-design.md`
