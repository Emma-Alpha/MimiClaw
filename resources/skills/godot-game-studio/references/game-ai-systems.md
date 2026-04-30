# Game AI Systems

## Behavior Trees — Full Reference

### Node Types

| Type | Symbol | Description |
|------|--------|-------------|
| Selector | `?` | Try children until one succeeds (OR) |
| Sequence | `→` | Run children until one fails (AND) |
| Parallel | `⇉` | Run all children simultaneously |
| Decorator | `◇` | Modifies child result (inverter, repeat, timeout) |
| Condition | `?=` | Check a boolean condition |
| Action | `!` | Execute a behavior |

### Common Decorators

```gdscript
class_name BTInverter extends BTNode
## Inverts child result: SUCCESS -> FAILURE, FAILURE -> SUCCESS

func tick(actor: Node, blackboard: Dictionary) -> Status:
    var child: BTNode = get_child(0)
    var result := child.tick(actor, blackboard)
    match result:
        Status.SUCCESS: return Status.FAILURE
        Status.FAILURE: return Status.SUCCESS
        _: return Status.RUNNING

class_name BTRepeat extends BTNode
## Repeats child N times or until failure

@export var repeat_count: int = 3
var _current: int = 0

func tick(actor: Node, blackboard: Dictionary) -> Status:
    var child: BTNode = get_child(0)
    if _current >= repeat_count:
        _current = 0
        return Status.SUCCESS
    var result := child.tick(actor, blackboard)
    if result == Status.SUCCESS:
        _current += 1
        return Status.RUNNING
    elif result == Status.FAILURE:
        _current = 0
        return Status.FAILURE
    return Status.RUNNING

class_name BTCooldown extends BTNode
## Prevents child from running more often than interval

@export var cooldown_time: float = 2.0
var _last_run: float = -INF

func tick(actor: Node, blackboard: Dictionary) -> Status:
    var now: float = blackboard.get("time", 0.0)
    if now - _last_run < cooldown_time:
        return Status.FAILURE
    var result := get_child(0).tick(actor, blackboard)
    if result != Status.RUNNING:
        _last_run = now
    return result
```

### Blackboard

Shared data store for the behavior tree:

```gdscript
# Blackboard is a Dictionary passed through all nodes
var blackboard: Dictionary = {
    "target": null,
    "target_distance": INF,
    "health_percent": 1.0,
    "ammo_count": 30,
    "time": 0.0,
    "last_heard_position": Vector2.ZERO,
    "alert_level": 0,  # 0=idle, 1=suspicious, 2=alert, 3=combat
}
```

## Utility AI — Full Reference

### Response Curves

| Curve Type | Formula | Use Case |
|-----------|---------|----------|
| Linear | `y = mx + b` | Proportional response |
| Quadratic | `y = x^2` | Accelerating urgency |
| Logistic | `y = 1/(1+e^(-k(x-m)))` | Threshold with smooth transition |
| Inverse | `y = 1 - x` | Decreasing priority |

### Scoring Example

```
NPC deciding what to do:
┌─────────────┬───────────┬──────────┬───────┐
│ Action      │ Input     │ Score    │ Notes │
├─────────────┼───────────┼──────────┼───────┤
│ Eat         │ hunger=0.8│ 0.72     │ Quadratic curve on hunger │
│ Sleep       │ tired=0.5 │ 0.25     │ Quadratic curve on fatigue │
│ Fight       │ threat=0.9│ 0.81     │ Linear on threat level │ ← Winner
│ Socialize   │ lonely=0.3│ 0.15     │ Linear on social need │
│ Explore     │ bored=0.6 │ 0.36     │ Linear on boredom │
└─────────────┴───────────┴──────────┴───────┘
```

## Finite State Machine (FSM)

Best for simple AI with clear, distinct states:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  PATROL ──(see player)──▶ CHASE ──(in range)──▶ ATTACK  │
│    ▲                       │                      │      │
│    │                       │                      │      │
│    └──(lost player)────────┘                      │      │
│    └──(player dead)───────────────────────────────┘      │
│                                                          │
│  Any ──(health < 20%)──▶ FLEE ──(safe)──▶ HEAL          │
│  Any ──(health = 0)──▶ DEAD                              │
└──────────────────────────────────────────────────────────┘
```

Use FSM when:
- States are few (< 8) and well-defined.
- Transitions are clear and predictable.
- Behavior within each state is simple.

Use Behavior Trees when:
- Many conditions affect behavior.
- Behaviors compose and overlap.
- Priority ordering matters.

## Spatial Awareness

### Navigation Queries

```gdscript
# Find cover positions
func find_cover(from_threat: Vector2, search_radius: float) -> Vector2:
    var best_cover := Vector2.INF
    var best_score := -INF
    for point in _cover_points:
        var dist_to_threat := point.distance_to(from_threat)
        var dist_to_me := point.distance_to(global_position)
        if dist_to_me > search_radius:
            continue
        # Check if point blocks line of sight to threat
        var space := get_world_2d().direct_space_state
        var query := PhysicsRayQueryParameters2D.create(point, from_threat)
        var result := space.intersect_ray(query)
        if result.is_empty():
            continue  # No cover here
        var score := dist_to_threat - dist_to_me * 0.5
        if score > best_score:
            best_score = score
            best_cover = point
    return best_cover
```

### Group Coordination

```gdscript
class_name SquadManager extends Node

var members: Array[AIAgent] = []

func assign_roles() -> void:
    if members.is_empty():
        return
    # Leader: closest to objective
    members.sort_custom(func(a: AIAgent, b: AIAgent) -> bool:
        return a.distance_to_objective < b.distance_to_objective)
    members[0].role = AIAgent.Role.LEADER
    # Flankers: 2 members if available
    for i in range(1, mini(3, members.size())):
        members[i].role = AIAgent.Role.FLANKER
    # Rest: support
    for i in range(3, members.size()):
        members[i].role = AIAgent.Role.SUPPORT

func request_suppressing_fire(target: Vector2) -> void:
    for member in members:
        if member.role == AIAgent.Role.SUPPORT and member.has_ammo():
            member.suppress(target)
            break
```

## AI Fairness — Telegraphing

AI must be fair to the player:

1. **Telegraph attacks** — wind-up animations before damage.
2. **Reaction delay** — AI doesn't react instantly to player actions.
3. **Perception limits** — AI can't see through walls or behind itself.
4. **Cooldowns** — AI abilities have cooldowns like player abilities.
5. **Difficulty scaling** — adjust reaction time, accuracy, aggression, not rules.

```gdscript
@export var reaction_time: float = 0.3  # Seconds before reacting
@export var accuracy_jitter: float = 15.0  # Degrees of aim spread
@export var attack_cooldown: float = 1.5
```
