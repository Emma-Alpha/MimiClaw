---
name: godot-networking
description: Implement multiplayer networking in Godot 4. Use when the user needs server-authoritative multiplayer, client prediction, RPC patterns, synchronization, lobby systems, or dedicated server architecture.
---

# Godot Networking

## Overview

Use this skill for multiplayer game networking in Godot 4. All multiplayer code must follow the server-authoritative model: the server owns truth, clients predict and reconcile.

## Architecture Rules

1. **Server is AUTHORITATIVE** for all gameplay-critical state. Never trust client.
2. **Version all network messages** for forward/backward compatibility.
3. **Client-side prediction** — players predict locally, server corrects.
4. **Graceful reconnection** — handle disconnections without crashing.
5. **Rate-limit network logging** — don't spam logs in production.
6. **Validate all incoming data** — check packet sizes and field ranges.

## Godot Multiplayer API

### Setup

```gdscript
class_name NetworkManager extends Node

signal player_connected(peer_id: int)
signal player_disconnected(peer_id: int)
signal connection_failed
signal server_disconnected

const DEFAULT_PORT := 7000
const MAX_PLAYERS := 8

func host_game(port: int = DEFAULT_PORT) -> Error:
    var peer := ENetMultiplayerPeer.new()
    var err := peer.create_server(port, MAX_PLAYERS)
    if err != OK:
        return err
    multiplayer.multiplayer_peer = peer
    multiplayer.peer_connected.connect(_on_peer_connected)
    multiplayer.peer_disconnected.connect(_on_peer_disconnected)
    return OK

func join_game(address: String, port: int = DEFAULT_PORT) -> Error:
    var peer := ENetMultiplayerPeer.new()
    var err := peer.create_client(address, port)
    if err != OK:
        return err
    multiplayer.multiplayer_peer = peer
    multiplayer.connected_to_server.connect(_on_connected)
    multiplayer.connection_failed.connect(_on_connection_failed)
    multiplayer.server_disconnected.connect(_on_server_disconnected)
    return OK

func _on_peer_connected(id: int) -> void:
    player_connected.emit(id)

func _on_peer_disconnected(id: int) -> void:
    player_disconnected.emit(id)
```

### RPC Patterns

```gdscript
## Server -> All Clients (reliable)
@rpc("authority", "call_remote", "reliable")
func sync_game_state(state_data: Dictionary) -> void:
    _apply_server_state(state_data)

## Client -> Server (reliable)
@rpc("any_peer", "call_remote", "reliable")
func request_action(action: String, params: Dictionary) -> void:
    if not multiplayer.is_server():
        return
    var sender_id := multiplayer.get_remote_sender_id()
    # Validate and execute on server
    if _validate_action(sender_id, action, params):
        _execute_action(sender_id, action, params)

## Server -> All Clients (unreliable, for frequent updates)
@rpc("authority", "call_remote", "unreliable_ordered")
func sync_position(pos: Vector2, vel: Vector2) -> void:
    _interpolate_to(pos, vel)
```

### MultiplayerSynchronizer

```gdscript
# For automatic property replication, use MultiplayerSynchronizer node
# Configure in editor:
# - Replication properties (position, rotation, health)
# - Sync interval
# - Visibility filters (only sync nearby players)

# Scene structure:
# Player (CharacterBody2D)
#   ├── MultiplayerSynchronizer
#   │   └── Replicates: position, rotation, animation_state
#   ├── MultiplayerSpawner (on parent scene)
#   └── PlayerController (only processes on authority)
```

### Authority and Ownership

```gdscript
func _ready() -> void:
    # Only the owning peer processes input
    if not is_multiplayer_authority():
        set_physics_process(false)
        set_process_input(false)
        return

func _physics_process(delta: float) -> void:
    # This only runs on the authority peer
    var input_dir := Input.get_vector("left", "right", "up", "down")
    velocity = input_dir * speed
    move_and_slide()
```

## Client-Side Prediction

```gdscript
class_name PredictedPlayer extends CharacterBody2D

var input_history: Array[InputFrame] = []
var server_position: Vector2

func _physics_process(delta: float) -> void:
    if is_multiplayer_authority():
        # Record and send input
        var input := _capture_input()
        input_history.append(input)
        _send_input_to_server.rpc_id(1, input.serialize())
        # Predict locally
        _apply_input(input, delta)
        move_and_slide()

@rpc("authority", "call_remote", "unreliable_ordered")
func _receive_server_state(pos: Vector2, last_processed_frame: int) -> void:
    server_position = pos
    # Remove acknowledged inputs
    while input_history.size() > 0 and input_history[0].frame <= last_processed_frame:
        input_history.pop_front()
    # Re-simulate unacknowledged inputs
    position = server_position
    for input_frame in input_history:
        _apply_input(input_frame, get_physics_process_delta_time())
        move_and_slide()
```

## Lobby System

```gdscript
class_name LobbyManager extends Node

signal lobby_updated(players: Array[PlayerInfo])

var players: Dictionary = {}  # peer_id -> PlayerInfo

@rpc("any_peer", "call_remote", "reliable")
func register_player(player_name: String) -> void:
    var sender_id := multiplayer.get_remote_sender_id()
    if sender_id == 0:
        sender_id = 1  # Host
    players[sender_id] = PlayerInfo.new(sender_id, player_name)
    # Broadcast updated player list
    _broadcast_lobby_state.rpc()

@rpc("authority", "call_remote", "reliable")
func _broadcast_lobby_state() -> void:
    lobby_updated.emit(players.values())

func start_game() -> void:
    if not multiplayer.is_server():
        return
    _load_game_scene.rpc()
```

## Bandwidth Management

| Data Type | Channel | Frequency | Notes |
|-----------|---------|-----------|-------|
| Position/velocity | Unreliable ordered | 20 Hz | Interpolate on client |
| Health/state changes | Reliable | On change | Critical state |
| Chat messages | Reliable | On send | Queue if needed |
| Input | Unreliable ordered | 60 Hz | Client to server only |
| World events | Reliable | On occurrence | Spawn, despawn, effects |

## Security Checklist

- [ ] Server validates all client inputs (range, rate, legality)
- [ ] No client can modify another player's state
- [ ] Position changes validated against movement speed
- [ ] Cooldowns enforced server-side
- [ ] Packet size limits enforced
- [ ] Rate limiting on RPC calls
- [ ] No sensitive data sent to unauthorized clients

## Anti-Patterns

- Trusting client-reported position/damage/health
- Sending full game state every frame instead of deltas
- Using reliable channel for position updates (causes stutter)
- Not handling disconnection gracefully
- Hardcoded IP addresses and ports
- No input validation on the server

## References

- Foundations: `../godot-foundations/SKILL.md`
- Gameplay systems: `../godot-gameplay-systems/SKILL.md`
- Performance: `../../references/godot-performance.md`
- Networking deep dive: `../../references/godot-networking.md`
