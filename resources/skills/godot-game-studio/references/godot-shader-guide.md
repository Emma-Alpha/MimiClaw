# Godot Shader Deep Dive

## Shader Language Overview

Godot uses a GLSL-like shading language with these shader types:

- `spatial` — 3D objects (meshes, terrain, characters)
- `canvas_item` — 2D sprites, UI, post-processing
- `particles` — GPU particle compute
- `sky` — procedural skies
- `fog` — volumetric fog volumes

## Render Modes

### Spatial

```glsl
// Common render modes
render_mode blend_mix;              // Standard alpha blending
render_mode blend_add;              // Additive (fire, glow)
render_mode unshaded;               // No lighting calculations
render_mode diffuse_toon;           // Toon diffuse model
render_mode specular_toon;          // Toon specular model
render_mode cull_disabled;          // Double-sided rendering
render_mode depth_draw_opaque;      // Standard depth write
render_mode depth_draw_always;      // Force depth write (transparent + depth)
```

### Canvas Item

```glsl
render_mode blend_mix;              // Standard alpha blending
render_mode blend_add;              // Additive blending
render_mode blend_mul;              // Multiply blending
render_mode unshaded;               // No CanvasItem modulate
render_mode skip_vertex_transform;  // Manual vertex transform
```

## Built-in Variables

### Spatial - vertex()

| Variable | Type | Description |
|----------|------|-------------|
| `VERTEX` | vec3 | Vertex position (model space) |
| `NORMAL` | vec3 | Vertex normal |
| `UV` | vec2 | UV coordinates |
| `COLOR` | vec4 | Vertex color |
| `MODEL_MATRIX` | mat4 | Model transform |
| `PROJECTION_MATRIX` | mat4 | Projection transform |
| `TIME` | float | Elapsed time |

### Spatial - fragment()

| Variable | Type | Description |
|----------|------|-------------|
| `ALBEDO` | vec3 | Base color output |
| `ALPHA` | float | Alpha output |
| `METALLIC` | float | Metallic output (0-1) |
| `ROUGHNESS` | float | Roughness output (0-1) |
| `EMISSION` | vec3 | Emission color |
| `NORMAL` | vec3 | Fragment normal |
| `NORMAL_MAP` | vec3 | Normal map sample |
| `UV` | vec2 | UV coordinates |
| `SCREEN_UV` | vec2 | Screen-space UV |

### Spatial - light()

| Variable | Type | Description |
|----------|------|-------------|
| `LIGHT` | vec3 | Light direction |
| `LIGHT_COLOR` | vec3 | Light color * energy |
| `ATTENUATION` | float | Light attenuation |
| `DIFFUSE_LIGHT` | vec3 | Diffuse output (accumulates) |
| `SPECULAR_LIGHT` | vec3 | Specular output (accumulates) |

## Advanced Techniques

### Screen-Space Effects

```glsl
shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;

void fragment() {
    vec4 screen = texture(screen_texture, SCREEN_UV);
    // Post-processing on screen content
    COLOR = screen;
}
```

### Depth-Based Effects

```glsl
shader_type spatial;

uniform sampler2D depth_texture : hint_depth_texture;

void fragment() {
    float depth = texture(depth_texture, SCREEN_UV).r;
    float linear_depth = PROJECTION_MATRIX[3][2] / (depth + PROJECTION_MATRIX[2][2]);
    // Use linear_depth for fog, intersection, edge detection
}
```

### Vertex Animation (Wind, Grass)

```glsl
shader_type spatial;
render_mode cull_disabled;

uniform float wind_strength : hint_range(0.0, 2.0) = 0.5;
uniform float wind_speed : hint_range(0.0, 5.0) = 2.0;

void vertex() {
    float wind = sin(TIME * wind_speed + VERTEX.x * 2.0 + VERTEX.z * 3.0);
    VERTEX.x += wind * wind_strength * UV.y;  // UV.y = 0 at base, 1 at tip
    VERTEX.z += wind * wind_strength * 0.5 * UV.y;
}
```

### Triplanar Mapping

```glsl
shader_type spatial;

uniform sampler2D albedo_texture : source_color, filter_linear_mipmap, repeat_enable;
uniform float blend_sharpness : hint_range(1.0, 10.0) = 4.0;

void fragment() {
    vec3 world_normal = abs(NORMAL);
    world_normal = pow(world_normal, vec3(blend_sharpness));
    world_normal /= (world_normal.x + world_normal.y + world_normal.z);

    vec3 world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
    vec3 x_proj = texture(albedo_texture, world_pos.yz).rgb;
    vec3 y_proj = texture(albedo_texture, world_pos.xz).rgb;
    vec3 z_proj = texture(albedo_texture, world_pos.xy).rgb;

    ALBEDO = x_proj * world_normal.x + y_proj * world_normal.y + z_proj * world_normal.z;
}
```

## Performance Guidelines

1. **Avoid branching in fragment shaders** — GPUs prefer SIMD-uniform execution.
   ```glsl
   // Bad
   if (value > 0.5) { result = a; } else { result = b; }
   // Good
   result = mix(b, a, step(0.5, value));
   ```

2. **Minimize texture samples** — pack data into RGBA channels.
   ```glsl
   // Pack: R=roughness, G=metallic, B=AO, A=height
   vec4 packed = texture(orm_texture, UV);
   ROUGHNESS = packed.r;
   METALLIC = packed.g;
   AO = packed.b;
   ```

3. **Use `lowp` and `mediump` on mobile** when full precision isn't needed.

4. **Pre-compute constants** in vertex shader, pass to fragment via `varying`.

5. **Blur: two-pass approach** — horizontal blur + vertical blur is O(n) instead of O(n^2).
