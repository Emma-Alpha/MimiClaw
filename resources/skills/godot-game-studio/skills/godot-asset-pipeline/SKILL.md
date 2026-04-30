---
name: godot-asset-pipeline
description: Manage game assets in Godot 4. Use when the user needs import settings, resource management, asset optimization, sprite sheets, 3D model import, audio setup, or build size reduction.
---

# Godot Asset Pipeline

## Overview

Use this skill for all asset management tasks. Covers import settings, optimization, resource organization, and build size management.

## Import Settings

### 2D Textures / Sprites

| Setting | Pixel Art | HD Art |
|---------|-----------|--------|
| Filter | Nearest | Linear Mipmap |
| Mipmaps | Off | On |
| Compression | Lossless | VRAM Compressed |
| Fix Alpha Border | On | On |
| Size Limit | None | 2048-4096 |

```
# Per-file import overrides in .import files
# Or set project-wide in Project Settings:
# rendering/textures/canvas_textures/default_texture_filter = Nearest (pixel art)
# rendering/textures/canvas_textures/default_texture_filter = Linear (HD)
```

### 3D Models

- Import as `.glb` or `.gltf` (preferred over `.fbx` for open standard).
- Configure in Advanced Import Settings:
  - Generate collision shapes from mesh geometry.
  - Generate navigation mesh if needed.
  - LOD generation for distant objects.
  - Animation import filters.

```
# Import script for automated settings
@tool
extends EditorScenePostImport

func _post_import(scene: Node) -> Object:
    # Add collision to all MeshInstance3D
    for child in scene.get_children():
        if child is MeshInstance3D:
            child.create_trimesh_collision()
    return scene
```

### Audio

| Format | Use Case | Import Setting |
|--------|----------|---------------|
| `.ogg` (Vorbis) | Music, long loops | Stream, Loop On |
| `.wav` | SFX, short sounds | Sample (loads to memory) |
| `.mp3` | Music alternative | Stream, Loop On |

Rules:
- SFX: `.wav` at 44.1kHz, 16-bit. Import as Sample.
- Music: `.ogg` at 44.1kHz. Import as Stream.
- Voice: `.ogg`. Import as Stream.
- Set loop points in import settings, not in code.

## Resource Organization

```
assets/
├── sprites/
│   ├── characters/
│   │   ├── player_idle.png
│   │   ├── player_run.png
│   │   └── player_idle.png.import  # Auto-generated
│   ├── environment/
│   ├── ui/
│   └── effects/
├── models/
│   ├── characters/
│   ├── props/
│   └── environment/
├── audio/
│   ├── music/
│   ├── sfx/
│   └── voice/
├── fonts/
├── shaders/
└── data/              # .tres Resource files
    ├── items/
    ├── enemies/
    └── levels/
```

### Naming Convention

- All lowercase, underscore-separated: `player_idle_01.png`
- Group by domain, then by entity: `sprites/characters/player_idle.png`
- Animation frames: `player_run_01.png`, `player_run_02.png`, etc.
- Variants: `sword_iron.tres`, `sword_gold.tres`

## Sprite Sheet / Atlas

```gdscript
# Use SpriteFrames resource with AnimatedSprite2D
# Import sprite sheet in editor:
# 1. Import PNG as Texture2D
# 2. Create SpriteFrames resource
# 3. Add animations with frame regions

# Or use AtlasTexture for manual regions:
var atlas := AtlasTexture.new()
atlas.atlas = preload("res://assets/sprites/spritesheet.png")
atlas.region = Rect2(0, 0, 32, 32)  # First frame
```

## Resource Loading

### Preloading (Small Resources)

```gdscript
# Use preload for small, always-needed resources
const PLAYER_SCENE: PackedScene = preload("res://scenes/characters/player.tscn")
const SWORD_DATA: WeaponData = preload("res://data/items/sword_iron.tres")
```

### Lazy Loading (Large Resources)

```gdscript
# Use ResourceLoader for large or optional resources
func load_level_async(path: String) -> void:
    ResourceLoader.load_threaded_request(path)

func _process(_delta: float) -> void:
    var status := ResourceLoader.load_threaded_get_status(level_path)
    match status:
        ResourceLoader.THREAD_LOAD_IN_PROGRESS:
            var progress: Array = []
            ResourceLoader.load_threaded_get_status(level_path, progress)
            loading_bar.value = progress[0] * 100
        ResourceLoader.THREAD_LOAD_LOADED:
            var scene: PackedScene = ResourceLoader.load_threaded_get(level_path)
            _on_level_loaded(scene)
        ResourceLoader.THREAD_LOAD_FAILED:
            push_error("Failed to load: " + level_path)
```

## Build Size Optimization

1. **Exclude unused assets** — check for orphaned files before export.
2. **Compress textures** — use VRAM compression for 3D, lossless for pixel art.
3. **Optimize audio** — reduce sample rate for non-critical SFX (22.05kHz is fine for UI sounds).
4. **Strip debug symbols** — in export preset settings.
5. **Use PCK patching** — for DLC and updates.
6. **Remove unused engine modules** — custom export templates with only needed features.

```gdscript
# Find orphaned resources
# Editor > Tools > Orphan Resource Explorer
# Or use script:
func find_orphaned_resources() -> Array[String]:
    var used := _scan_used_resources()
    var all := _scan_all_resources()
    var orphaned: Array[String] = []
    for res in all:
        if res not in used:
            orphaned.append(res)
    return orphaned
```

## Export Presets

- Configure per platform: Windows, macOS, Linux, Android, iOS, Web.
- Set texture compression per platform (ETC2 for Android, ASTC for iOS).
- Strip unused features to reduce binary size.
- Test exports on actual target devices.

## Anti-Patterns

- Importing everything as Lossless (huge build sizes)
- Not setting proper filter mode for pixel art (blurry sprites)
- Loading all assets at startup instead of streaming
- No naming convention (files scattered and misnamed)
- Shipping debug exports to production
- Not testing on minimum-spec target hardware

## References

- Foundations: `../godot-foundations/SKILL.md`
- Performance: `../../references/godot-performance.md`
- 2D game: `../godot-2d-game/SKILL.md`
- 3D game: `../godot-3d-game/SKILL.md`
