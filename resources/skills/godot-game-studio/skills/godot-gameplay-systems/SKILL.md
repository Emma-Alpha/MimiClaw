---
name: godot-gameplay-systems
description: Design and implement gameplay systems in Godot 4. Use when the user needs state machines, combat systems, inventory, quest systems, economy, progression, save/load, or any core gameplay mechanic.
---

# Godot Gameplay Systems

## Overview

Use this skill for implementing core gameplay mechanics. All gameplay systems must follow data-driven design: values come from Resource files, not hardcoded constants.

## State Machine

The foundation of most gameplay systems. Every entity with multiple behaviors needs one.

```gdscript
class_name StateMachine extends Node

## Transition table:
## IDLE -> WALK (movement input)
## IDLE -> JUMP (jump pressed + on_floor)
## IDLE -> ATTACK (attack pressed)
## WALK -> IDLE (no input)
## WALK -> JUMP (jump pressed + on_floor)
## ATTACK -> IDLE (animation finished)
## JUMP -> IDLE (landed + no input)
## JUMP -> WALK (landed + has input)
## Any -> HURT (damage received)
## Any -> DEAD (health <= 0)

@export var initial_state: State

var current_state: State
var states: Dictionary = {}

func _ready() -> void:
    for child in get_children():
        if child is State:
            states[child.name.to_lower()] = child
            child.transitioned.connect(_on_state_transitioned)
    if initial_state:
        initial_state.enter()
        current_state = initial_state

func _process(delta: float) -> void:
    if current_state:
        current_state.update(delta)

func _physics_process(delta: float) -> void:
    if current_state:
        current_state.physics_update(delta)

func _on_state_transitioned(state: State, new_state_name: String) -> void:
    if state != current_state:
        return
    var new_state: State = states.get(new_state_name.to_lower())
    if not new_state:
        return
    current_state.exit()
    new_state.enter()
    current_state = new_state
```

```gdscript
class_name State extends Node

signal transitioned(state: State, new_state_name: String)

func enter() -> void:
    pass

func exit() -> void:
    pass

func update(_delta: float) -> void:
    pass

func physics_update(_delta: float) -> void:
    pass
```

## Combat System

```gdscript
class_name HitboxComponent extends Area2D

@export var damage: int = 10
@export var knockback_force: float = 200.0

class_name HurtboxComponent extends Area2D

signal damage_received(amount: int, knockback: Vector2)

func _ready() -> void:
    area_entered.connect(_on_area_entered)

func _on_area_entered(hitbox: Area2D) -> void:
    if hitbox is HitboxComponent:
        var direction := (global_position - hitbox.global_position).normalized()
        var knockback := direction * hitbox.knockback_force
        damage_received.emit(hitbox.damage, knockback)
```

```gdscript
class_name HealthComponent extends Node

signal health_changed(current: int, maximum: int)
signal died

@export var max_health: int = 100
var current_health: int

func _ready() -> void:
    current_health = max_health

func take_damage(amount: int) -> void:
    current_health = maxi(current_health - amount, 0)
    health_changed.emit(current_health, max_health)
    if current_health == 0:
        died.emit()

func heal(amount: int) -> void:
    current_health = mini(current_health + amount, max_health)
    health_changed.emit(current_health, max_health)
```

## Inventory System

```gdscript
class_name ItemData extends Resource

@export var id: StringName
@export var display_name: String
@export var description: String
@export var icon: Texture2D
@export var max_stack: int = 1
@export var item_type: ItemType

enum ItemType { WEAPON, ARMOR, CONSUMABLE, MATERIAL, KEY_ITEM }
```

```gdscript
class_name Inventory extends Node

signal item_added(item: ItemData, slot: int)
signal item_removed(item: ItemData, slot: int)
signal inventory_changed

@export var max_slots: int = 20

var slots: Array[InventorySlot] = []

func _ready() -> void:
    slots.resize(max_slots)
    for i in max_slots:
        slots[i] = InventorySlot.new()

func add_item(item: ItemData, quantity: int = 1) -> int:
    # Try stacking first
    for slot in slots:
        if slot.item == item and slot.quantity < item.max_stack:
            var can_add := mini(quantity, item.max_stack - slot.quantity)
            slot.quantity += can_add
            quantity -= can_add
            inventory_changed.emit()
            if quantity == 0:
                return 0
    # Then use empty slots
    for i in slots.size():
        if slots[i].is_empty():
            var can_add := mini(quantity, item.max_stack)
            slots[i].item = item
            slots[i].quantity = can_add
            quantity -= can_add
            item_added.emit(item, i)
            inventory_changed.emit()
            if quantity == 0:
                return 0
    return quantity  # Remaining items that didn't fit
```

## Quest System

```gdscript
class_name QuestData extends Resource

@export var id: StringName
@export var title: String
@export var description: String
@export var objectives: Array[QuestObjective]
@export var rewards: Array[QuestReward]
@export var prerequisites: Array[StringName]

class_name QuestObjective extends Resource

@export var description: String
@export var target_id: StringName
@export var required_count: int = 1
var current_count: int = 0
var completed: bool:
    get: return current_count >= required_count
```

```gdscript
class_name QuestManager extends Node

signal quest_started(quest_id: StringName)
signal quest_updated(quest_id: StringName, objective_index: int)
signal quest_completed(quest_id: StringName)

var active_quests: Dictionary = {}  # StringName -> QuestData
var completed_quests: Array[StringName] = []

func start_quest(quest: QuestData) -> bool:
    if quest.id in active_quests or quest.id in completed_quests:
        return false
    for prereq in quest.prerequisites:
        if prereq not in completed_quests:
            return false
    active_quests[quest.id] = quest.duplicate(true)
    quest_started.emit(quest.id)
    return true

func update_objective(target_id: StringName, count: int = 1) -> void:
    for quest_id in active_quests:
        var quest: QuestData = active_quests[quest_id]
        for i in quest.objectives.size():
            var obj: QuestObjective = quest.objectives[i]
            if obj.target_id == target_id and not obj.completed:
                obj.current_count += count
                quest_updated.emit(quest_id, i)
                if quest.objectives.all(func(o: QuestObjective) -> bool: return o.completed):
                    _complete_quest(quest_id)
```

## Save / Load System

```gdscript
class_name SaveManager extends Node

const SAVE_DIR := "user://saves/"
const SAVE_VERSION := 1

func save_game(slot: int) -> Error:
    var data := {
        "version": SAVE_VERSION,
        "timestamp": Time.get_unix_time_from_system(),
        "player": _serialize_player(),
        "inventory": _serialize_inventory(),
        "quests": _serialize_quests(),
        "world_state": _serialize_world(),
    }
    DirAccess.make_dir_recursive_absolute(SAVE_DIR)
    var path := SAVE_DIR + "save_%d.json" % slot
    var file := FileAccess.open(path, FileAccess.WRITE)
    if not file:
        return FileAccess.get_open_error()
    file.store_string(JSON.stringify(data, "\t"))
    return OK

func load_game(slot: int) -> Error:
    var path := SAVE_DIR + "save_%d.json" % slot
    if not FileAccess.file_exists(path):
        return ERR_FILE_NOT_FOUND
    var file := FileAccess.open(path, FileAccess.READ)
    var data: Variant = JSON.parse_string(file.get_as_text())
    if data == null or not data is Dictionary:
        return ERR_PARSE_ERROR
    if data.get("version", 0) != SAVE_VERSION:
        return _migrate_save(data)
    _deserialize_player(data["player"])
    _deserialize_inventory(data["inventory"])
    _deserialize_quests(data["quests"])
    _deserialize_world(data["world_state"])
    return OK
```

## Data-Driven Design Rules

1. **ALL gameplay values from Resources or data files** — NEVER hardcode.
2. **Balance data in .tres files** — designers can edit without touching code.
3. **Schema validation** — check data integrity at load time.
4. **Version your data** — breaking changes need migration logic.

## Progression / Experience System

```gdscript
class_name LevelSystem extends Node

signal level_up(new_level: int)
signal experience_gained(amount: int, total: int)

@export var level_curve: Curve  # XP required per level

var current_level: int = 1
var current_xp: int = 0

func add_experience(amount: int) -> void:
    current_xp += amount
    experience_gained.emit(amount, current_xp)
    while current_xp >= xp_for_next_level():
        current_xp -= xp_for_next_level()
        current_level += 1
        level_up.emit(current_level)

func xp_for_next_level() -> int:
    return int(level_curve.sample(float(current_level) / 100.0) * 1000)
```

## Anti-Patterns

- Game logic in animation callbacks instead of state machines
- Inventory using Array indices as item IDs
- Save system serializing node references instead of data
- Hardcoded damage/health values instead of data Resources
- Quest system tightly coupled to specific NPCs/scenes
- Global mutable state without clear ownership

## References

- Foundations: `../godot-foundations/SKILL.md`
- AI systems: `../godot-game-ai/SKILL.md`
- Economy design: `../../references/economy-design.md`
- GDScript standards: `../../references/gdscript-standards.md`
