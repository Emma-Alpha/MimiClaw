---
name: godot-playtest
description: Run playtests and QA for Godot 4 games. Use when the user asks for testing strategy, performance profiling, bug triage, smoke tests, release readiness checks, or structured quality assurance.
---

# Godot Playtest

## Overview

Use this skill to test Godot games the way players experience them: boot, input, scene transitions, gameplay loops, and edge cases. Combine automated testing with structured manual passes.

## Testing Architecture

### Unit Tests (GUT / GdUnit4)

```gdscript
# Install GUT (Godot Unit Testing) as an addon
# tests/unit/test_health_component.gd

extends GutTest

func test_take_damage_reduces_health() -> void:
    # Arrange
    var health := HealthComponent.new()
    add_child_autofree(health)
    health.max_health = 100
    health._ready()

    # Act
    health.take_damage(30)

    # Assert
    assert_eq(health.current_health, 70)

func test_take_lethal_damage_emits_died() -> void:
    var health := HealthComponent.new()
    add_child_autofree(health)
    health.max_health = 50
    health._ready()
    watch_signals(health)

    health.take_damage(100)

    assert_signal_emitted(health, "died")
    assert_eq(health.current_health, 0)

func test_heal_does_not_exceed_max() -> void:
    var health := HealthComponent.new()
    add_child_autofree(health)
    health.max_health = 100
    health._ready()
    health.take_damage(20)

    health.heal(50)

    assert_eq(health.current_health, 100)
```

### Test Naming Convention

`test_[system]_[scenario]_[expected_result]`

- `test_inventory_add_item_to_full_returns_remaining`
- `test_combat_critical_hit_doubles_damage`
- `test_save_load_preserves_player_position`

### Integration Tests

```gdscript
func test_player_takes_damage_from_enemy() -> void:
    # Arrange
    var player := preload("res://scenes/characters/player.tscn").instantiate()
    var enemy := preload("res://scenes/enemies/goblin.tscn").instantiate()
    add_child_autofree(player)
    add_child_autofree(enemy)
    player.position = Vector2(100, 100)
    enemy.position = Vector2(120, 100)

    # Act
    enemy.attack()
    await get_tree().physics_frame
    await get_tree().physics_frame

    # Assert
    assert_lt(player.health_component.current_health, player.health_component.max_health)
```

## Performance Profiling

### Built-in Profiler

- **Debugger > Profiler**: CPU time per function.
- **Debugger > Monitors**: FPS, physics, memory, GPU.
- **Debugger > Visual Profiler**: GPU render pass breakdown.

### Performance Targets

| Metric | Desktop | Mobile | Minimum |
|--------|---------|--------|---------|
| FPS | 60 | 30-60 | Never below 30 |
| Frame time | < 16ms | < 33ms | < 33ms |
| Memory | < 2GB | < 512MB | Platform dependent |
| Load time | < 5s | < 10s | Level dependent |
| Draw calls | < 1000 | < 200 | Monitor trends |

### Profiling Checklist

```gdscript
# Add performance monitoring to debug overlay
func _process(_delta: float) -> void:
    if debug_enabled:
        fps_label.text = "FPS: %d" % Engine.get_frames_per_second()
        mem_label.text = "MEM: %.1f MB" % (OS.get_static_memory_usage() / 1048576.0)
        objects_label.text = "Objects: %d" % Performance.get_monitor(Performance.OBJECT_COUNT)
        draw_calls_label.text = "Draw: %d" % Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
```

## Smoke Test Checklist

### Boot

- [ ] Game launches without errors
- [ ] Title/menu screen appears
- [ ] All menu buttons work
- [ ] Settings persist between sessions

### Core Loop

- [ ] Player can perform all primary verbs (move, jump, attack, etc.)
- [ ] Enemies spawn and behave correctly
- [ ] Damage/health system works
- [ ] Score/progression tracks correctly
- [ ] Game over and restart work

### Scene Transitions

- [ ] All level transitions work without crashes
- [ ] Loading screens appear for long loads
- [ ] No memory leaks between scene changes
- [ ] Audio doesn't overlap during transitions

### Save/Load

- [ ] Save game creates valid file
- [ ] Load game restores correct state
- [ ] Corrupt save doesn't crash the game
- [ ] Multiple save slots work independently

### Input

- [ ] Keyboard controls work
- [ ] Gamepad controls work
- [ ] Mouse controls work (if applicable)
- [ ] Rebinding works (if implemented)
- [ ] Input works after scene transitions

### Audio

- [ ] Music plays at correct volume
- [ ] SFX play for all actions
- [ ] Volume settings persist
- [ ] No audio clipping or distortion
- [ ] Audio stops properly on scene change

### Performance

- [ ] Stable FPS during normal gameplay
- [ ] No hitches during common actions
- [ ] Memory stays stable (no leaks)
- [ ] No excessive draw calls

## Bug Report Template

```markdown
## Bug: [Short Description]

**Severity**: Critical / High / Medium / Low
**Reproducibility**: Always / Sometimes / Rare

### Steps to Reproduce
1.
2.
3.

### Expected Behavior


### Actual Behavior


### System Info
- Godot version:
- OS:
- GPU:
- Relevant settings:

### Evidence
- Screenshot/video:
- Error log:
```

## Release Readiness Checklist

- [ ] All critical and high-severity bugs fixed
- [ ] Performance targets met on all target platforms
- [ ] Save/load tested with edge cases
- [ ] All placeholder art replaced with final assets
- [ ] Audio levels balanced
- [ ] Input works with keyboard, mouse, and gamepad
- [ ] Export presets configured for all target platforms
- [ ] Test exports run on actual devices
- [ ] Version number updated
- [ ] Release notes prepared

## Regression Testing

Every bug fix MUST include a regression test:

```gdscript
# Bug #42: Player could jump while already in air
func test_player_cannot_double_jump_regression_42() -> void:
    var player := create_player()
    player.jump()  # First jump
    await get_tree().physics_frame

    player.jump()  # Attempt second jump

    assert_false(player.is_jumping_again, "Double jump should not be possible")
```

## Anti-Patterns

- No automated tests for core gameplay logic
- Only testing happy paths, never edge cases
- Performance profiling only on developer machines
- Skipping save/load testing
- No regression tests for fixed bugs
- Testing in editor only, never exported builds

## References

- Gameplay systems: `../godot-gameplay-systems/SKILL.md`
- Performance: `../../references/godot-performance.md`
- Playtest checklist: `../../references/playtest-checklist.md`
