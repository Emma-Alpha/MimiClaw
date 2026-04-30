# Godot Networking Deep Dive

## Network Architectures

### Peer-to-Peer (P2P)

- One player is the host (server + client).
- Other players connect directly.
- Simple setup, no dedicated server needed.
- Best for: co-op games, small player counts (2-8).

### Dedicated Server

- Separate headless server process.
- All players are clients.
- Better security, consistent authority.
- Best for: competitive games, larger player counts.

```gdscript
# Run as dedicated server
func _ready() -> void:
    if OS.has_feature("dedicated_server") or "--server" in OS.get_cmdline_args():
        _start_dedicated_server()
    else:
        _show_main_menu()

func _start_dedicated_server() -> void:
    DisplayServer.window_set_title("Game Server")
    var peer := ENetMultiplayerPeer.new()
    peer.create_server(7000, 32)
    multiplayer.multiplayer_peer = peer
```

## RPC Reference

### Annotations

```gdscript
@rpc("authority")           # Only the multiplayer authority can call
@rpc("any_peer")            # Any connected peer can call
@rpc("call_local")          # Also executes on the caller
@rpc("call_remote")         # Only executes on remote peers
@rpc("reliable")            # TCP-like: guaranteed delivery, ordered
@rpc("unreliable")          # UDP-like: no guarantee
@rpc("unreliable_ordered")  # No delivery guarantee, but ordered

# Combine:
@rpc("any_peer", "call_remote", "reliable")
func request_action(action: String) -> void:
    pass
```

### When to Use Each

| Channel | Use Case | Example |
|---------|----------|---------|
| Reliable | State changes that MUST arrive | Health change, item pickup, chat |
| Unreliable Ordered | Frequent updates, latest matters | Position, rotation, velocity |
| Unreliable | Fire-and-forget | Particle effects, sounds |

## Synchronization Patterns

### State Sync (Simple)

Server sends full state periodically:

```gdscript
# Server
var sync_timer: float = 0.0
const SYNC_RATE: float = 0.05  # 20 Hz

func _physics_process(delta: float) -> void:
    if not multiplayer.is_server():
        return
    sync_timer += delta
    if sync_timer >= SYNC_RATE:
        sync_timer = 0.0
        _broadcast_state.rpc()

@rpc("authority", "call_remote", "unreliable_ordered")
func _broadcast_state() -> void:
    # Client applies state
    pass
```

### Input Sync (Responsive)

Client sends inputs, server simulates:

```gdscript
# Client sends input
@rpc("any_peer", "call_remote", "unreliable_ordered")
func _send_input(input_data: Dictionary) -> void:
    if not multiplayer.is_server():
        return
    var sender := multiplayer.get_remote_sender_id()
    _apply_player_input(sender, input_data)
```

### Snapshot Interpolation

For smooth visual representation of network entities:

```gdscript
class_name NetworkInterpolator extends Node2D

var buffer: Array[StateSnapshot] = []
const INTERPOLATION_DELAY: float = 0.1  # 100ms buffer

func add_snapshot(pos: Vector2, rot: float, timestamp: float) -> void:
    buffer.append(StateSnapshot.new(pos, rot, timestamp))
    while buffer.size() > 10:
        buffer.pop_front()

func _process(_delta: float) -> void:
    var render_time := Time.get_unix_time_from_system() - INTERPOLATION_DELAY
    if buffer.size() < 2:
        return
    # Find surrounding snapshots
    for i in range(buffer.size() - 1):
        if buffer[i].time <= render_time and buffer[i + 1].time >= render_time:
            var t := (render_time - buffer[i].time) / (buffer[i + 1].time - buffer[i].time)
            position = buffer[i].position.lerp(buffer[i + 1].position, t)
            rotation = lerp_angle(buffer[i].rotation, buffer[i + 1].rotation, t)
            break
```

## Network Security

### Server-Side Validation

```gdscript
@rpc("any_peer", "call_remote", "reliable")
func request_move(target_pos: Vector2) -> void:
    if not multiplayer.is_server():
        return
    var sender_id := multiplayer.get_remote_sender_id()
    var player := _get_player(sender_id)
    if not player:
        return

    # Validate move distance
    var distance := player.position.distance_to(target_pos)
    if distance > player.max_move_speed * 0.1:  # Allow some tolerance
        push_warning("Player %d: suspicious move distance: %.1f" % [sender_id, distance])
        return

    # Validate position is reachable
    if not _is_valid_position(target_pos):
        return

    player.position = target_pos
    _sync_player_position.rpc(sender_id, target_pos)
```

### Rate Limiting

```gdscript
var _rpc_timestamps: Dictionary = {}  # peer_id -> Array[float]
const MAX_RPC_PER_SECOND: int = 30

func _is_rate_limited(peer_id: int) -> bool:
    if peer_id not in _rpc_timestamps:
        _rpc_timestamps[peer_id] = []
    var timestamps: Array = _rpc_timestamps[peer_id]
    var now := Time.get_unix_time_from_system()
    # Remove old timestamps
    while timestamps.size() > 0 and now - timestamps[0] > 1.0:
        timestamps.pop_front()
    if timestamps.size() >= MAX_RPC_PER_SECOND:
        return true
    timestamps.append(now)
    return false
```

## Testing Multiplayer

- Use multiple editor instances (Project > Debug > Run Multiple Instances).
- Test with simulated latency: `peer.get_peer(id).set_peer_timeout(min, max)`.
- Test disconnection and reconnection flows.
- Test with 1, 2, max, and max+1 players.
- Test server authority with modified clients.
