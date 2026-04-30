# Audio Systems Guide

## Audio Architecture

```
AudioManager (Autoload)
├── MusicPlayer (AudioStreamPlayer)
├── AmbiencePlayer (AudioStreamPlayer)
├── SFXPool (Node)
│   ├── SFXPlayer1 (AudioStreamPlayer)
│   ├── SFXPlayer2 (AudioStreamPlayer)
│   └── ... (pool of 8-16 players)
└── UIAudioPlayer (AudioStreamPlayer)
```

### AudioManager

```gdscript
class_name AudioManager extends Node

@onready var music_player: AudioStreamPlayer = $MusicPlayer
@onready var ambience_player: AudioStreamPlayer = $AmbiencePlayer

var _sfx_pool: Array[AudioStreamPlayer] = []
const SFX_POOL_SIZE: int = 16

func _ready() -> void:
    for i in SFX_POOL_SIZE:
        var player := AudioStreamPlayer.new()
        player.bus = &"SFX"
        add_child(player)
        _sfx_pool.append(player)

## Play a sound effect from the pool.
func play_sfx(stream: AudioStream, volume_db: float = 0.0, pitch: float = 1.0) -> void:
    for player in _sfx_pool:
        if not player.playing:
            player.stream = stream
            player.volume_db = volume_db
            player.pitch_scale = pitch
            player.play()
            return
    push_warning("SFX pool exhausted")

## Play a 2D positional sound effect.
func play_sfx_2d(stream: AudioStream, position: Vector2,
                  volume_db: float = 0.0, pitch: float = 1.0) -> AudioStreamPlayer2D:
    var player := AudioStreamPlayer2D.new()
    player.stream = stream
    player.volume_db = volume_db
    player.pitch_scale = pitch
    player.position = position
    player.bus = &"SFX"
    player.finished.connect(player.queue_free)
    add_child(player)
    player.play()
    return player

## Crossfade to a new music track.
func play_music(stream: AudioStream, fade_duration: float = 1.0) -> void:
    if music_player.stream == stream and music_player.playing:
        return
    var tween := create_tween()
    if music_player.playing:
        tween.tween_property(music_player, "volume_db", -40.0, fade_duration)
        tween.tween_callback(func() -> void:
            music_player.stream = stream
            music_player.volume_db = 0.0
            music_player.play())
    else:
        music_player.stream = stream
        music_player.volume_db = -40.0
        music_player.play()
        tween.tween_property(music_player, "volume_db", 0.0, fade_duration)

## Stop music with fade out.
func stop_music(fade_duration: float = 1.0) -> void:
    var tween := create_tween()
    tween.tween_property(music_player, "volume_db", -40.0, fade_duration)
    tween.tween_callback(music_player.stop)
```

## Audio Bus Layout

```
Master
├── Music (volume: 0 dB)
│   └── Compressor (threshold: -20 dB, ratio: 4:1)
├── SFX (volume: 0 dB)
│   └── Limiter (ceiling: -1 dB)
├── Ambience (volume: -6 dB)
├── UI (volume: -3 dB)
└── Voice (volume: +3 dB)
    └── Compressor (threshold: -15 dB, ratio: 3:1)
```

Configure in Godot: Audio tab at bottom of editor.

### Volume Settings

```gdscript
class_name AudioSettings extends Resource

@export_range(-40, 0) var master_volume: float = 0.0
@export_range(-40, 0) var music_volume: float = 0.0
@export_range(-40, 0) var sfx_volume: float = 0.0
@export_range(-40, 0) var voice_volume: float = 0.0

func apply() -> void:
    AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Master"), master_volume)
    AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Music"), music_volume)
    AudioServer.set_bus_volume_db(AudioServer.get_bus_index("SFX"), sfx_volume)
    AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Voice"), voice_volume)
```

## Spatial Audio (3D)

```gdscript
# AudioStreamPlayer3D for positional sound
var audio_3d := AudioStreamPlayer3D.new()
audio_3d.stream = footstep_sound
audio_3d.max_distance = 20.0
audio_3d.unit_size = 3.0  # Reference distance
audio_3d.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
audio_3d.bus = &"SFX"
```

### Audio Listener

- In 3D: The `Camera3D` with `current = true` is the listener.
- In 2D: The `AudioListener2D` node or current `Camera2D`.
- Only one listener active at a time.

## Sound Design Patterns

### Randomized Variations

```gdscript
@export var footstep_sounds: Array[AudioStream]
@export var pitch_variation: float = 0.1

func play_footstep() -> void:
    var sound := footstep_sounds[randi() % footstep_sounds.size()]
    var pitch := 1.0 + randf_range(-pitch_variation, pitch_variation)
    AudioManager.play_sfx(sound, 0.0, pitch)
```

### Layered Ambience

```gdscript
# Multiple ambient layers that blend based on context
func update_ambience(indoor_factor: float, rain_factor: float) -> void:
    outdoor_ambience.volume_db = linear_to_db(1.0 - indoor_factor)
    indoor_ambience.volume_db = linear_to_db(indoor_factor)
    rain_ambience.volume_db = linear_to_db(rain_factor * (1.0 - indoor_factor * 0.7))
```

### Dynamic Music

```gdscript
# Switch music layers based on game state
enum MusicState { EXPLORE, COMBAT, BOSS }

func set_music_state(state: MusicState) -> void:
    match state:
        MusicState.EXPLORE:
            AudioManager.play_music(explore_music, 2.0)
        MusicState.COMBAT:
            AudioManager.play_music(combat_music, 0.5)
        MusicState.BOSS:
            AudioManager.play_music(boss_music, 0.3)
```

## Audio Performance

- Pool AudioStreamPlayers — don't create/free per sound.
- Limit simultaneous sounds (8-16 for SFX).
- Use `.ogg` for music (streaming), `.wav` for short SFX (in memory).
- Set max_distance on 3D audio to cull distant sounds.
- Reduce polyphony on mobile (fewer simultaneous voices).

## Common Mistakes

- No audio bus organization (everything on Master).
- Volume settings not persisting between sessions.
- Music restarting on scene change instead of crossfading.
- No variation on repeated sounds (footsteps, hits).
- 3D audio with infinite range (everything plays everywhere).
- Forgetting to free one-shot AudioStreamPlayer nodes.
