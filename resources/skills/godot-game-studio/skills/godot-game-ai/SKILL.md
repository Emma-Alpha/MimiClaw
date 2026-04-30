---
name: godot-game-ai
description: Implement game AI systems in Godot 4. Use when the user needs behavior trees, utility AI, finite state machines, pathfinding, perception systems, NPC decision-making, or enemy AI patterns.
---

# Godot Game AI

## Overview

Use this skill for AI system implementation. Game AI must be performant (2ms per frame budget), configurable via data, and debuggable via visualization.

## AI Architecture Tiers

| Tier | Pattern | Use Case | Cost |
|------|---------|----------|------|
| Simple | Finite State Machine | Basic enemies, NPCs with few states | Lowest |
| Medium | Behavior Tree | Complex enemies, companions, boss AI | Medium |
| Advanced | Utility AI | NPCs with many competing needs | Higher |
| Hybrid | BT + Utility scoring | Boss AI, adaptive difficulty | Highest |

## Behavior Tree

```gdscript
class_name BTNode extends Node

enum Status { SUCCESS, FAILURE, RUNNING }

func tick(_actor: Node, _blackboard: Dictionary) -> Status:
    return Status.FAILURE
```

```gdscript
class_name BTSelector extends BTNode
## Tries children in order, returns SUCCESS on first success.

func tick(actor: Node, blackboard: Dictionary) -> Status:
    for child in get_children():
        if child is BTNode:
            var result := child.tick(actor, blackboard)
            if result != Status.FAILURE:
                return result
    return Status.FAILURE
```

```gdscript
class_name BTSequence extends BTNode
## Runs children in order, returns FAILURE on first failure.

func tick(actor: Node, blackboard: Dictionary) -> Status:
    for child in get_children():
        if child is BTNode:
            var result := child.tick(actor, blackboard)
            if result != Status.SUCCESS:
                return result
    return Status.SUCCESS
```

```gdscript
class_name BTCondition extends BTNode
## Checks a condition on the blackboard.

@export var key: String
@export var expected_value: Variant = true

func tick(_actor: Node, blackboard: Dictionary) -> Status:
    if blackboard.get(key) == expected_value:
        return Status.SUCCESS
    return Status.FAILURE
```

Usage — compose in scene tree:

```
EnemyBT (BTSelector)
├── AttackSequence (BTSequence)
│   ├── IsPlayerInRange (BTCondition)
│   ├── HasLineOfSight (BTCondition)
│   └── AttackAction (BTAction)
├── ChaseSequence (BTSequence)
│   ├── IsPlayerDetected (BTCondition)
│   └── ChaseAction (BTAction)
└── PatrolAction (BTAction)
```

## Utility AI

For NPCs with many competing needs (Sims-like, complex companions):

```gdscript
class_name UtilityAI extends Node

var considerations: Array[Consideration] = []

func evaluate(actor: Node, world_state: Dictionary) -> Consideration:
    var best: Consideration = null
    var best_score: float = -1.0
    for c in considerations:
        var score := c.evaluate(actor, world_state)
        if score > best_score:
            best_score = score
            best = c
    return best

class_name Consideration extends Resource

@export var action_name: StringName
@export var base_weight: float = 1.0
@export var response_curve: Curve

func evaluate(actor: Node, world_state: Dictionary) -> float:
    var input := _get_input(actor, world_state)
    return response_curve.sample(input) * base_weight

func _get_input(_actor: Node, _world_state: Dictionary) -> float:
    return 0.0  # Override in subclasses
```

## Perception System

```gdscript
class_name PerceptionComponent extends Node2D

signal target_detected(target: Node2D)
signal target_lost(target: Node2D)

@export var sight_range: float = 300.0
@export var sight_angle: float = 120.0  # degrees
@export var hearing_range: float = 150.0
@export var perception_update_interval: float = 0.2

var known_targets: Array[Node2D] = []
var _timer: float = 0.0

func _physics_process(delta: float) -> void:
    _timer += delta
    if _timer < perception_update_interval:
        return
    _timer = 0.0
    _update_perception()

func _update_perception() -> void:
    var potential := get_tree().get_nodes_in_group("detectable")
    for target in potential:
        if target == owner:
            continue
        var can_see := _check_sight(target)
        var can_hear := _check_hearing(target)
        var is_known := target in known_targets
        if (can_see or can_hear) and not is_known:
            known_targets.append(target)
            target_detected.emit(target)
        elif not can_see and not can_hear and is_known:
            known_targets.erase(target)
            target_lost.emit(target)

func _check_sight(target: Node2D) -> bool:
    var to_target := target.global_position - global_position
    if to_target.length() > sight_range:
        return false
    var angle := rad_to_deg(global_transform.x.angle_to(to_target))
    if absf(angle) > sight_angle / 2.0:
        return false
    # Raycast for line-of-sight
    var space := get_world_2d().direct_space_state
    var query := PhysicsRayQueryParameters2D.create(global_position, target.global_position)
    query.exclude = [owner.get_rid()]
    var result := space.intersect_ray(query)
    return result.is_empty() or result.collider == target

func _check_hearing(target: Node2D) -> bool:
    return global_position.distance_to(target.global_position) <= hearing_range
```

## Pathfinding

```gdscript
class_name AINavigator extends Node2D

@onready var nav_agent: NavigationAgent2D = $NavigationAgent2D

@export var move_speed: float = 150.0

func navigate_to(target: Vector2) -> void:
    nav_agent.target_position = target

func _physics_process(_delta: float) -> void:
    if nav_agent.is_navigation_finished():
        return
    var next_pos := nav_agent.get_next_path_position()
    var direction := global_position.direction_to(next_pos)
    (owner as CharacterBody2D).velocity = direction * move_speed
    (owner as CharacterBody2D).move_and_slide()
```

Setup:
- Add `NavigationRegion2D` to the level with a `NavigationPolygon`.
- Bake navigation mesh in editor or at runtime.
- Use navigation layers for different agent types (flying, ground, water).

## Steering Behaviors

For smooth, natural movement (flocking, avoidance):

```gdscript
class_name SteeringBehavior extends Node2D

@export var max_speed: float = 200.0
@export var max_force: float = 400.0

var velocity_vec: Vector2 = Vector2.ZERO

func seek(target: Vector2) -> Vector2:
    var desired := (target - global_position).normalized() * max_speed
    return (desired - velocity_vec).limit_length(max_force)

func flee(target: Vector2) -> Vector2:
    return -seek(target)

func arrive(target: Vector2, slow_radius: float = 100.0) -> Vector2:
    var to_target := target - global_position
    var distance := to_target.length()
    if distance < 1.0:
        return -velocity_vec
    var speed := max_speed
    if distance < slow_radius:
        speed = max_speed * (distance / slow_radius)
    var desired := to_target.normalized() * speed
    return (desired - velocity_vec).limit_length(max_force)

func separation(neighbors: Array[Node2D], radius: float) -> Vector2:
    var force := Vector2.ZERO
    for neighbor in neighbors:
        var to_me := global_position - neighbor.global_position
        var dist := to_me.length()
        if dist > 0 and dist < radius:
            force += to_me.normalized() / dist
    return force.limit_length(max_force)
```

## Performance Rules

- **2ms per frame budget** for all AI updates combined.
- Stagger AI updates — not all agents tick every frame.
- Use perception update intervals (0.1-0.5s), not per-frame checks.
- Pre-compute navigation paths, don't recalculate every frame.
- Use groups and spatial queries instead of iterating all nodes.
- Disable AI for off-screen or distant entities.

## Debug Visualization

```gdscript
## Always provide debug drawing for AI state
func _draw() -> void:
    if not Engine.is_editor_hint() and not debug_enabled:
        return
    # Draw perception cone
    draw_arc(Vector2.ZERO, sight_range, -deg_to_rad(sight_angle/2),
             deg_to_rad(sight_angle/2), 32, Color.YELLOW, 1.0)
    # Draw current path
    if nav_agent and not nav_agent.is_navigation_finished():
        var path := nav_agent.get_current_navigation_path()
        for i in path.size() - 1:
            draw_line(to_local(path[i]), to_local(path[i+1]), Color.GREEN, 2.0)
    # Draw current state
    draw_string(ThemeDB.fallback_font, Vector2(0, -40), str(current_state),
                HORIZONTAL_ALIGNMENT_CENTER, -1, 12, Color.WHITE)
```

## Anti-Patterns

- AI logic in `_process()` without frame budget management
- Per-frame raycasts for perception (use intervals)
- Hardcoded AI parameters instead of data Resources
- No debug visualization for AI state
- AI that doesn't telegraph intentions (unfair to player)
- Behavior trees nested 10+ levels deep

## References

- Gameplay systems: `../godot-gameplay-systems/SKILL.md`
- Performance: `../../references/godot-performance.md`
- AI systems deep dive: `../../references/game-ai-systems.md`
