---
name: godot-ui-design
description: Design UI/UX for Godot 4 games. Use when the user needs HUD, menus, inventory screens, dialog systems, responsive layouts, themes, or accessibility features for their game.
---

# Godot UI Design

## Overview

Use this skill for all game UI work. Game UI is NOT app UI — it must serve gameplay first, look thematic, and stay out of the player's way during action.

## UI Architecture in Godot

### Layer Separation

```
CanvasLayer (UI Layer, layer 10+)
├── HUD (always visible during gameplay)
│   ├── HealthBar
│   ├── Minimap
│   └── Hotbar
├── Menus (modal overlays)
│   ├── PauseMenu
│   ├── InventoryScreen
│   └── SettingsMenu
└── Dialogs (narrative overlays)
    ├── DialogBox
    └── NotificationQueue
```

- **HUD** — minimal, always visible, never blocks gameplay. Use `Control` nodes anchored to screen edges.
- **Menus** — modal, pause the game or overlay gameplay. Use `CanvasLayer` with higher layer index.
- **Dialogs** — semi-modal, narrative or notification UI.

### Theme System

```gdscript
# Create a Theme resource (.tres) for consistent styling
# Apply to root Control node — all children inherit

# Theme overrides for individual nodes:
label.add_theme_color_override("font_color", Color.WHITE)
label.add_theme_font_size_override("font_size", 24)

# Custom theme in code:
var theme := Theme.new()
theme.set_color("font_color", "Label", Color.WHITE)
theme.set_font("font", "Label", custom_font)
theme.set_font_size("font_size", "Label", 18)
```

Use one Theme resource per game. Override sparingly.

## HUD Design

```gdscript
class_name HUD extends CanvasLayer

@onready var health_bar: TextureProgressBar = %HealthBar
@onready var ammo_label: Label = %AmmoLabel
@onready var minimap: Control = %Minimap
@onready var notification_container: VBoxContainer = %Notifications

func update_health(current: int, maximum: int) -> void:
    var tween := create_tween()
    tween.tween_property(health_bar, "value", float(current) / maximum * 100.0, 0.3)

func show_notification(text: String, duration: float = 3.0) -> void:
    var label := Label.new()
    label.text = text
    label.modulate.a = 0.0
    notification_container.add_child(label)
    var tween := create_tween()
    tween.tween_property(label, "modulate:a", 1.0, 0.2)
    tween.tween_interval(duration)
    tween.tween_property(label, "modulate:a", 0.0, 0.3)
    tween.tween_callback(label.queue_free)
```

### HUD Rules

- Keep persistent HUD under 15-20% of viewport.
- Critical info (health, ammo) at screen edges, not center.
- Use `TextureProgressBar` for bars — more visually flexible than `ProgressBar`.
- Animate changes (damage flash, low health pulse).
- No text smaller than 14px at 1080p.

## Menu System

```gdscript
class_name MenuManager extends CanvasLayer

var menu_stack: Array[Control] = []

func open_menu(menu: Control) -> void:
    if menu_stack.size() > 0:
        menu_stack.back().visible = false
    menu_stack.append(menu)
    menu.visible = true
    get_tree().paused = true
    # Focus first focusable element
    var first_button := menu.find_child("*", true, false)
    if first_button is BaseButton:
        first_button.grab_focus()

func close_menu() -> void:
    if menu_stack.is_empty():
        return
    var current := menu_stack.pop_back()
    current.visible = false
    if menu_stack.size() > 0:
        menu_stack.back().visible = true
    else:
        get_tree().paused = false

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("ui_cancel") and menu_stack.size() > 0:
        close_menu()
        get_viewport().set_input_as_handled()
```

## Dialog System

```gdscript
class_name DialogBox extends Control

signal dialog_finished

@onready var name_label: Label = %NameLabel
@onready var text_label: RichTextLabel = %TextLabel
@onready var portrait: TextureRect = %Portrait
@onready var choices_container: VBoxContainer = %Choices

var dialog_data: Array[DialogLine] = []
var current_line: int = 0
var is_typing: bool = false

func start_dialog(lines: Array[DialogLine]) -> void:
    dialog_data = lines
    current_line = 0
    visible = true
    _show_line(dialog_data[0])

func _show_line(line: DialogLine) -> void:
    name_label.text = line.speaker_name
    portrait.texture = line.portrait
    text_label.text = line.text
    text_label.visible_ratio = 0.0
    is_typing = true
    var tween := create_tween()
    tween.tween_property(text_label, "visible_ratio", 1.0, line.text.length() * 0.03)
    await tween.finished
    is_typing = false
    if line.choices.size() > 0:
        _show_choices(line.choices)

func _unhandled_input(event: InputEvent) -> void:
    if not visible:
        return
    if event.is_action_pressed("ui_accept"):
        if is_typing:
            text_label.visible_ratio = 1.0
            is_typing = false
        else:
            _advance()
        get_viewport().set_input_as_handled()
```

## Responsive Layout

```gdscript
# Use anchors and containers for responsive design
# MarginContainer -> VBoxContainer/HBoxContainer -> Controls

# Anchor presets (set in editor or code):
# PRESET_TOP_LEFT, PRESET_CENTER, PRESET_FULL_RECT, etc.

# For different screen ratios:
func _ready() -> void:
    get_tree().root.size_changed.connect(_on_viewport_resized)
    _on_viewport_resized()

func _on_viewport_resized() -> void:
    var viewport_size := get_viewport_rect().size
    var is_mobile := viewport_size.x < 720
    mobile_layout.visible = is_mobile
    desktop_layout.visible = not is_mobile
```

## Input Focus for Gamepad

```gdscript
# Every menu MUST support keyboard/gamepad navigation
# Set focus neighbors on buttons:
button_a.focus_neighbor_bottom = button_b.get_path()
button_b.focus_neighbor_top = button_a.get_path()

# Auto-focus first button when menu opens
func _on_visibility_changed() -> void:
    if visible:
        first_button.grab_focus()
```

## Accessibility Requirements

- [ ] All text scalable (use Theme font sizes, not hardcoded)
- [ ] Colorblind-friendly: don't rely on color alone for state
- [ ] Keyboard/gamepad navigable: every menu works without mouse
- [ ] Screen reader hints via `tooltip_text` on interactive elements
- [ ] Animations skippable or reducible (check `DisplayServer.screen_is_kept_on()`)
- [ ] Subtitles for all spoken dialog
- [ ] Rebindable controls
- [ ] High contrast mode option

## Anti-Patterns

- HUD covering more than 25% of the screen
- Menus that don't pause the game (unless intentional)
- No gamepad/keyboard navigation in menus
- Hardcoded font sizes and colors instead of Theme
- Text baked into images
- Dialog system coupled to specific NPCs
- UI nodes processing when not visible

## References

- Foundations: `../godot-foundations/SKILL.md`
- Accessibility: `../../references/accessibility.md`
- Frontend design patterns: `../../references/godot-architecture.md`
