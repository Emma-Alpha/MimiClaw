---
name: godot-shaders
description: Develop shaders for Godot 4. Use when the user needs visual effects, custom materials, post-processing, water, fire, dissolve, outline, toon shading, or compute shaders in Godot's shading language.
---

# Godot Shaders

## Overview

Use this skill for all shader development in Godot 4. Covers spatial (3D), canvas_item (2D), particles, sky, and fog shaders.

## Shader Types

| Type | Use Case | File |
|------|----------|------|
| `spatial` | 3D materials and effects | `.gdshader` |
| `canvas_item` | 2D sprites, UI, post-processing | `.gdshader` |
| `particles` | GPU particle behavior | `.gdshader` |
| `sky` | Custom sky rendering | `.gdshader` |
| `fog` | Volumetric fog effects | `.gdshader` |

## File Naming

`[type]_[category]_[name].gdshader`

Examples:
- `spatial_env_water.gdshader`
- `canvas_item_fx_dissolve.gdshader`
- `spatial_char_toon.gdshader`
- `particles_fx_fire.gdshader`

## Common 2D Shaders

### Dissolve Effect

```glsl
shader_type canvas_item;

uniform float dissolve_amount : hint_range(0.0, 1.0) = 0.0;
uniform sampler2D noise_texture : filter_linear;
uniform vec4 edge_color : source_color = vec4(1.0, 0.5, 0.0, 1.0);
uniform float edge_width : hint_range(0.0, 0.1) = 0.03;

void fragment() {
    vec4 tex_color = texture(TEXTURE, UV);
    float noise = texture(noise_texture, UV).r;

    float edge = smoothstep(dissolve_amount - edge_width, dissolve_amount, noise);
    float alpha_cut = step(dissolve_amount, noise);

    COLOR = mix(edge_color, tex_color, edge);
    COLOR.a *= tex_color.a * alpha_cut;
}
```

### Outline

```glsl
shader_type canvas_item;

uniform float outline_width : hint_range(0.0, 10.0) = 2.0;
uniform vec4 outline_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);

void fragment() {
    vec2 size = TEXTURE_PIXEL_SIZE * outline_width;
    float outline = texture(TEXTURE, UV + vec2(-size.x, 0)).a;
    outline += texture(TEXTURE, UV + vec2(size.x, 0)).a;
    outline += texture(TEXTURE, UV + vec2(0, -size.y)).a;
    outline += texture(TEXTURE, UV + vec2(0, size.y)).a;
    outline = min(outline, 1.0);

    vec4 tex = texture(TEXTURE, UV);
    COLOR = mix(outline_color * outline, tex, tex.a);
    COLOR.a = max(tex.a, outline * outline_color.a);
}
```

### Flash / Hit Effect

```glsl
shader_type canvas_item;

uniform float flash_amount : hint_range(0.0, 1.0) = 0.0;
uniform vec4 flash_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);

void fragment() {
    vec4 tex = texture(TEXTURE, UV);
    COLOR = mix(tex, flash_color, flash_amount);
    COLOR.a = tex.a;
}
```

## Common 3D Shaders

### Toon / Cel Shading

```glsl
shader_type spatial;
render_mode diffuse_toon, specular_toon;

uniform vec4 albedo_color : source_color = vec4(1.0);
uniform sampler2D albedo_texture : source_color, filter_linear_mipmap;
uniform float shadow_threshold : hint_range(0.0, 1.0) = 0.5;
uniform vec4 shadow_color : source_color = vec4(0.5, 0.5, 0.7, 1.0);
uniform float rim_amount : hint_range(0.0, 1.0) = 0.7;

void fragment() {
    vec4 tex = texture(albedo_texture, UV);
    ALBEDO = tex.rgb * albedo_color.rgb;
    ROUGHNESS = 1.0;
    METALLIC = 0.0;
}

void light() {
    float NdotL = dot(NORMAL, LIGHT);
    float stepped = step(shadow_threshold, NdotL * ATTENUATION);
    vec3 shaded = mix(shadow_color.rgb * ALBEDO, ALBEDO, stepped);

    // Rim lighting
    float rim = 1.0 - dot(NORMAL, VIEW);
    rim = step(rim_amount, rim) * stepped;

    DIFFUSE_LIGHT += shaded * LIGHT_COLOR;
    DIFFUSE_LIGHT += rim * LIGHT_COLOR * 0.3;
}
```

### Water Surface

```glsl
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back;

uniform vec4 shallow_color : source_color = vec4(0.1, 0.5, 0.7, 0.7);
uniform vec4 deep_color : source_color = vec4(0.0, 0.1, 0.3, 0.9);
uniform float depth_factor : hint_range(0.0, 10.0) = 2.0;
uniform sampler2D wave_noise : filter_linear_mipmap, repeat_enable;
uniform float wave_speed : hint_range(0.0, 2.0) = 0.3;
uniform float wave_strength : hint_range(0.0, 0.1) = 0.02;
uniform sampler2D depth_texture : hint_depth_texture;
uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;

void fragment() {
    // Wave distortion
    vec2 wave_uv = UV * 4.0 + TIME * wave_speed;
    vec2 wave = texture(wave_noise, wave_uv).rg * 2.0 - 1.0;
    wave *= wave_strength;

    // Depth-based color
    float depth = texture(depth_texture, SCREEN_UV).r;
    float linear_depth = PROJECTION_MATRIX[3][2] / (depth + PROJECTION_MATRIX[2][2]);
    float water_depth = linear_depth - VERTEX.z;
    float depth_blend = clamp(water_depth / depth_factor, 0.0, 1.0);

    ALBEDO = mix(shallow_color.rgb, deep_color.rgb, depth_blend);
    ALPHA = mix(shallow_color.a, deep_color.a, depth_blend);
    ROUGHNESS = 0.05;
    METALLIC = 0.3;
    NORMAL_MAP = texture(wave_noise, wave_uv * 0.5).rgb;
}
```

### Fresnel / Force Field

```glsl
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_back, unshaded;

uniform vec4 fresnel_color : source_color = vec4(0.2, 0.5, 1.0, 1.0);
uniform float fresnel_power : hint_range(0.1, 10.0) = 3.0;
uniform float pulse_speed : hint_range(0.0, 5.0) = 1.0;

void fragment() {
    float fresnel = pow(1.0 - dot(NORMAL, VIEW), fresnel_power);
    float pulse = sin(TIME * pulse_speed) * 0.3 + 0.7;
    ALBEDO = fresnel_color.rgb;
    ALPHA = fresnel * fresnel_color.a * pulse;
}
```

## Performance Rules

1. **Avoid dynamic branching in fragment shaders** — use `step()`, `mix()`, `smoothstep()` instead of `if/else`.
2. **Minimize texture samples** — combine related data into channel-packed textures.
3. **Reduced precision on mobile** — use `lowp` and `mediump` where possible.
4. **Two-pass approach for blur effects** — horizontal then vertical.
5. **Document performance budget** — target platform and complexity budget per shader.
6. **Profile on minimum-spec hardware** — don't assume GPU performance.

## Uniform Guidelines

- Use `source_color` hint for all color uniforms.
- Use `hint_range(min, max)` for float uniforms.
- Group related uniforms with `group_uniforms`.
- Document every uniform with a comment.
- No magic numbers — use uniforms for tweakable values.

## Anti-Patterns

- Branching in fragment shaders for visual variation
- Sampling the same texture multiple times with different UVs unnecessarily
- Not using hint annotations on uniforms
- Hardcoding values that should be uniforms
- Mixing render pipelines in one shader directory
- No fallback for lower-tier hardware

## References

- 3D game: `../godot-3d-game/SKILL.md`
- 2D game: `../godot-2d-game/SKILL.md`
- Performance: `../../references/godot-performance.md`
- Shader deep dive: `../../references/godot-shader-guide.md`
