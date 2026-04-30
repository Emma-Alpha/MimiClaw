# Game Accessibility Standards

## Input Accessibility

### Rebindable Controls

```gdscript
class_name InputRemapper extends Node

## All input actions must be rebindable.
## Store custom bindings in user settings.

func rebind_action(action: StringName, event: InputEvent) -> void:
    InputMap.action_erase_events(action)
    InputMap.action_add_event(action, event)
    _save_bindings()

func reset_to_defaults() -> void:
    InputMap.load_from_project_settings()
    _save_bindings()

func _save_bindings() -> void:
    var bindings: Dictionary = {}
    for action in InputMap.get_actions():
        if action.begins_with("ui_"):
            continue  # Skip built-in UI actions
        var events := InputMap.action_get_events(action)
        bindings[action] = events.map(func(e: InputEvent) -> Dictionary: return _serialize_event(e))
    # Save to user config
```

### Multiple Input Methods

Every game must support:

- [ ] Keyboard + mouse
- [ ] Gamepad (at least one standard layout)
- [ ] Touch (if targeting mobile)
- [ ] Remappable bindings for all methods

### Hold vs Toggle

```gdscript
## Offer hold and toggle for sustained actions (sprint, aim, crouch)
@export var sprint_mode: SprintMode = SprintMode.HOLD

enum SprintMode { HOLD, TOGGLE }

var is_sprinting: bool = false

func _unhandled_input(event: InputEvent) -> void:
    match sprint_mode:
        SprintMode.HOLD:
            is_sprinting = Input.is_action_pressed("sprint")
        SprintMode.TOGGLE:
            if event.is_action_pressed("sprint"):
                is_sprinting = not is_sprinting
```

## Visual Accessibility

### Text

- [ ] Minimum 14px font at 1080p (scales proportionally)
- [ ] Font size adjustable in settings (small, medium, large, extra large)
- [ ] High contrast between text and background
- [ ] No critical information conveyed by color alone
- [ ] Subtitles for all spoken dialog
- [ ] Speaker identification in subtitles (name or color)

### Colorblind Modes

```gdscript
class_name AccessibilitySettings extends Resource

enum ColorblindMode { NONE, PROTANOPIA, DEUTERANOPIA, TRITANOPIA }

@export var colorblind_mode: ColorblindMode = ColorblindMode.NONE
@export var icon_shapes_enabled: bool = false  # Use shapes in addition to color

func get_team_color(team: int) -> Color:
    match colorblind_mode:
        ColorblindMode.NONE:
            return [Color.RED, Color.BLUE][team]
        ColorblindMode.PROTANOPIA, ColorblindMode.DEUTERANOPIA:
            return [Color.ORANGE, Color.CYAN][team]
        ColorblindMode.TRITANOPIA:
            return [Color.RED, Color.GREEN][team]
    return Color.WHITE
```

Rules:
- Use shapes and patterns alongside color (health bar + number, icons + color).
- Provide at least 3 colorblind presets (protanopia, deuteranopia, tritanopia).
- Test with colorblind simulation tools.

### Screen Reader

```gdscript
## Add accessibility descriptions to interactive elements
button.tooltip_text = "Open inventory (I)"
button.focus_mode = Control.FOCUS_ALL

## Announce important events
func announce(text: String) -> void:
    DisplayServer.tts_speak(text)
```

## Audio Accessibility

- [ ] Separate volume sliders: Master, Music, SFX, Voice, UI
- [ ] Visual indicators for important audio cues (directional damage, footsteps)
- [ ] Subtitles with speaker identification
- [ ] Mono audio option (for single-ear hearing)
- [ ] Mute all option

## Motion Accessibility

### Reduced Motion

```gdscript
## Check and respect reduced motion preference
func play_screen_effect(effect: String) -> void:
    if accessibility_settings.reduced_motion:
        # Skip or simplify the effect
        return
    _play_full_effect(effect)

func shake_camera(intensity: float, duration: float) -> void:
    if accessibility_settings.reduced_motion:
        intensity *= 0.2  # Reduce, don't eliminate
        duration *= 0.5
    _do_camera_shake(intensity, duration)
```

- [ ] Screen shake intensity slider (0-100%)
- [ ] Flash effects reducible or disableable
- [ ] Photosensitivity warning for rapid flashing
- [ ] Camera motion smoothing options

## Cognitive Accessibility

- [ ] Adjustable game speed
- [ ] Difficulty options clearly described
- [ ] Objective reminders accessible anytime
- [ ] Tutorial messages re-readable
- [ ] Pause available at all times (except online multiplayer)
- [ ] Auto-save at reasonable intervals
- [ ] Clear, consistent UI navigation
- [ ] No time-limited decisions without accessibility override

## Settings Persistence

```gdscript
## All accessibility settings must persist between sessions
func save_accessibility_settings() -> void:
    var config := ConfigFile.new()
    config.set_value("accessibility", "colorblind_mode", colorblind_mode)
    config.set_value("accessibility", "reduced_motion", reduced_motion)
    config.set_value("accessibility", "text_size", text_size)
    config.set_value("accessibility", "subtitles", subtitles_enabled)
    config.set_value("accessibility", "screen_shake", screen_shake_intensity)
    config.save("user://accessibility.cfg")
```

## Accessibility Checklist

### Minimum (All Games)

- [ ] Rebindable controls
- [ ] Subtitles
- [ ] Volume sliders (at least master + music + sfx)
- [ ] Pause anytime
- [ ] Text size options

### Recommended

- [ ] Colorblind modes
- [ ] Reduced motion option
- [ ] Screen shake slider
- [ ] Hold/toggle options for sustained actions
- [ ] High contrast mode
- [ ] Auto-save

### Ideal

- [ ] Screen reader support
- [ ] Mono audio
- [ ] Visual audio cues
- [ ] Game speed adjustment
- [ ] One-handed control scheme
- [ ] Difficulty customization
