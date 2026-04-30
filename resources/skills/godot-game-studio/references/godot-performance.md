# Godot Performance Guide

## Frame Processing Rules

### Minimize _process and _physics_process

```gdscript
# Disable when not needed
func _ready() -> void:
    set_process(false)
    set_physics_process(false)

func activate() -> void:
    set_process(true)

func deactivate() -> void:
    set_process(false)
```

### Always Use Delta Time

```gdscript
# Good: frame-rate independent
func _process(delta: float) -> void:
    timer -= delta
    position += velocity * delta

# Bad: frame-rate dependent
func _process(_delta: float) -> void:
    timer -= 0.016  # Assumes 60fps
    position += velocity
```

## Memory Management

### Object Pooling

Pre-allocate frequently used objects. See `godot-architecture.md` for the full pattern.

Candidates for pooling:
- Bullets / projectiles
- Particles
- Enemies in wave-based games
- Pickup items
- Audio players for SFX

### Node Lifecycle

```gdscript
# Always free nodes when done
node.queue_free()  # Safe, deferred
node.free()        # Immediate, use only when you're sure

# Check before accessing freed nodes
if is_instance_valid(node):
    node.do_something()

# Disconnect signals from freed nodes
func _exit_tree() -> void:
    event_bus.some_signal.disconnect(_on_some_signal)
```

### Memory Monitoring

```gdscript
# Check memory usage
var static_mem := OS.get_static_memory_usage()
var dynamic_mem := OS.get_static_memory_peak_usage()
print("Memory: %.1f MB" % (static_mem / 1048576.0))

# Monitor for leaks
# Performance.get_monitor(Performance.OBJECT_COUNT)
# Performance.get_monitor(Performance.OBJECT_NODE_COUNT)
# Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT)
```

## Rendering Optimization

### 2D

- Use `VisibleOnScreenNotifier2D` to disable off-screen processing.
- Use `CanvasGroup` for batching related sprites.
- Minimize draw calls by using texture atlases.
- Limit particle count and lifetime.
- Use `SubViewport` for complex effects that don't need per-frame updates.

### 3D

- Use LOD (Level of Detail) for distant objects.
- Use occlusion culling for complex scenes.
- Bake lighting where possible (`LightmapGI`).
- Use `VisibilityRange` on MeshInstance3D for LOD distances.
- Limit shadow-casting lights (expensive with shadows enabled).
- Use `ReflectionProbe` instead of real-time reflections.
- Reduce post-processing on mobile (disable SSAO, reduce glow quality).

```gdscript
# LOD setup
mesh_instance.visibility_range_begin = 0.0
mesh_instance.visibility_range_begin_margin = 1.0
mesh_instance.visibility_range_end = 100.0
mesh_instance.visibility_range_end_margin = 5.0
mesh_instance.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
```

## Physics Optimization

- Use simple collision shapes (box, sphere, capsule) instead of mesh colliders.
- Set collision layers and masks — don't check everything against everything.
- Reduce physics tick rate if 60fps physics isn't needed: `physics/common/physics_ticks_per_second`.
- Use `Area` nodes for triggers instead of physics bodies.
- Disable physics on inactive objects.

## AI Performance Budget

- **Total AI budget: 2ms per frame.**
- Stagger AI updates across frames — not every NPC updates every frame.
- Use perception intervals (0.1s-0.5s) instead of per-frame checks.
- Cache pathfinding results — don't recalculate every frame.
- Disable AI for off-screen or distant entities.

```gdscript
# Staggered AI updates
var _ai_agents: Array[AIAgent] = []
var _current_index: int = 0
var _agents_per_frame: int = 5

func _physics_process(delta: float) -> void:
    for i in _agents_per_frame:
        var idx := (_current_index + i) % _ai_agents.size()
        _ai_agents[idx].update_ai(delta * _ai_agents.size() / _agents_per_frame)
    _current_index = (_current_index + _agents_per_frame) % _ai_agents.size()
```

## Loading Performance

- Use `ResourceLoader.load_threaded_request()` for async loading.
- Show loading screen during heavy loads.
- Preload small, always-needed resources with `preload()`.
- Stream large resources (music, large textures).

## Profiling Workflow

1. **Identify the bottleneck first** — CPU, GPU, or memory?
2. **Use the built-in Profiler** (Debugger > Profiler) for CPU functions.
3. **Use Visual Profiler** (Debugger > Visual Profiler) for GPU passes.
4. **Use Monitors** for real-time metric tracking.
5. **Profile on target hardware** — developer machines are not representative.
6. **Before/after measurements** — no optimization without proof.

## Common Performance Pitfalls

- Calling `get_node()` or `find_child()` every frame.
- Creating/freeing objects every frame instead of pooling.
- Using `String` concatenation in hot loops (allocates).
- Animated sprites with unnecessarily high frame counts.
- Full-resolution shadows on all lights.
- Not using visibility culling for off-screen objects.
- Spawning particles without limits.
- Signals connected to freed nodes (causes errors, not crashes).
