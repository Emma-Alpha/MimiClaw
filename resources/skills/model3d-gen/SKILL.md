---
name: model3d-gen
version: 1.0.0
description: 3D model generation via Tripo3D API. Text-to-3D and image-to-3D model generation via aihub.gz4399.com. Use when the user asks to generate, create, or make a 3D model, or says "生成3D模型", "文生模型", "图生模型", "建模", "三维模型".
metadata:
  openclaw:
    emoji: "🧊"
---

# Model3D Gen

Generate 3D models from text prompts or images via the Tripo3D API at `aihub.gz4399.com`. Supports text-to-3D, image-to-3D, and format conversion.

## Authentication

Read the API key from the app settings stored in electron-store (same settings as Image Gen):

```bash
read -r API_BASE_URL API_KEY <<< $(python3 -c "
import json, os, sys
settings_paths = [
    os.path.expanduser('~/Library/Application Support/极智/settings.json'),
    os.path.expanduser('~/Library/Application Support/jizhi/settings.json'),
    os.path.expanduser('~/.config/极智/settings.json'),
    os.path.expanduser('~/.config/jizhi/settings.json'),
]
for p in settings_paths:
    if os.path.exists(p):
        data = json.load(open(p))
        url = data.get('imageGenUrl', '')
        key = data.get('imageGenApiKey', '')
        if url and key:
            print(url, key)
            sys.exit(0)
print('', '')
" 2>/dev/null)
```

- `API_BASE_URL` — The API base URL (e.g. `https://aihub.gz4399.com`), configured in **Settings > Gateway > Image Generation**. Note: for Tripo3D endpoints, strip the trailing `/v1` if present.
- `API_KEY` — The API key for the service.

If either value is empty, inform the user they need to configure the URL and API Key in **Settings > Gateway > Image Generation** first.

### Derive Tripo3D base URL

The settings store `imageGenUrl` typically ends with `/v1` (e.g. `https://aihub.gz4399.com/v1`). Tripo3D routes are under a different path, so derive the host:

```bash
TRIPO_BASE=$(echo "$API_BASE_URL" | sed 's|/v1$||')
# Result: https://aihub.gz4399.com
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `{TRIPO_BASE}/api/aihub/v1/rawproxy/tripo3d/v2/openapi/task` | POST | Create task (text-to-3D, image-to-3D, format conversion) |
| `{TRIPO_BASE}/api/aihub/v1/rawproxy/tripo3d/v2/openapi/task/{task_id}` | GET | Query task status and result |

## File Upload Endpoint (Image-to-3D)

For image-to-3D, images must be uploaded to Filebed COS first to obtain a URL.

| Endpoint | Method | Description |
|---|---|---|
| `https://filebed.gz4399.com/api/main/v1/cosStorage/upload` | POST | Upload image file, returns accessible URL |

**Note:** Uploaded files are retained for 1 day by default.

---

## Text-to-3D (文生模型)

Generate a 3D model from a text prompt. This is a two-step process: first generates an image from text, then converts to 3D.

### Step 1 — Create Task

```bash
RESPONSE=$(curl -s "${TRIPO_BASE}/api/aihub/v1/rawproxy/tripo3d/v2/openapi/task" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text_to_image",
    "prompt": "<USER_PROMPT>"
  }')
```

### Create Task Response

```json
{
  "code": 0,
  "data": {
    "task_id": "40b86499-3722-4f2d-bcf7-6d4a5a78fe8e"
  }
}
```

Extract `data.task_id`. If `code` is not `0`, report the error and stop.

### Step 2 — Poll for Result

```bash
RESULT=$(curl -s "${TRIPO_BASE}/api/aihub/v1/rawproxy/tripo3d/v2/openapi/task/${TASK_ID}" \
  -H "Authorization: Bearer ${API_KEY}")
```

### Completed Response

```json
{
  "code": 0,
  "data": {
    "task_id": "40b86499-3722-4f2d-bcf7-6d4a5a78fe8e",
    "type": "text_to_image",
    "status": "success",
    "input": {
      "prompt": "a small cat",
      "model_version": "v2.5-20250123"
    },
    "output": {
      "generated_image": "https://tripo-data.rg2.download.data.tripo3d.com/..."
    },
    "progress": 100,
    "create_time": 1768474534
  }
}
```

When `status` is `success`, extract `output.generated_image` as the generated image URL.

---

## Image-to-3D (图生模型)

Generate a 3D model from an image. Requires uploading the image first.

### Step 1 — Upload Image

If the user provides a local file, upload it to Filebed COS:

```bash
UPLOAD_RESPONSE=$(curl -s 'https://filebed.gz4399.com/api/main/v1/cosStorage/upload' \
  -H "X-Upload-Token: ${COS_TOKEN}" \
  -H "Authorization:" \
  -F "file=@<LOCAL_IMAGE_PATH>")
```

**Note about COS_TOKEN:** The upload endpoint requires a separate `COS_TOKEN` (not the API key). If this token is not available, inform the user that they need a COS upload token. If the user already has an accessible image URL, skip this step.

### Upload Response

```json
{
  "code": 0,
  "data": {
    "url": "https://filebed.gz4399.com/cosStorage/sk-cos-xxx/1772710174819_xxx.png",
    "fileName": "out.png",
    "fileSize": 120312
  }
}
```

Extract `data.url` as the image URL for the next step.

### Step 2 — Create Image-to-Model Task

```bash
RESPONSE=$(curl -s "${TRIPO_BASE}/api/aihub/v1/rawproxy/tripo3d/v2/openapi/task" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image_to_model",
    "file": {
      "type": "png",
      "url": "<IMAGE_URL>"
    },
    "model_version": "v3.0-20250812",
    "texture": true,
    "texture_quality": "detailed",
    "texture_alignment": "original_image",
    "pbr": true,
    "quad": true,
    "auto_size": false,
    "smart_low_poly": false
  }')
```

### Image-to-Model Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | string | Yes | - | Fixed: `image_to_model` |
| `file.type` | string | Yes | - | Image format: `png`, `jpeg`, `webp`, etc. |
| `file.url` | string | Yes | - | Image URL (from upload or user-provided) |
| `model_version` | string | No | `v3.0-20250812` | Model version |
| `model_seed` | number | No | random | Seed for model generation |
| `texture` | boolean | No | `true` | Whether to generate texture |
| `texture_seed` | number | No | random | Seed for texture generation |
| `texture_quality` | string | No | `detailed` | Texture quality: `detailed` |
| `texture_alignment` | string | No | `original_image` | Texture alignment: `original_image` |
| `pbr` | boolean | No | `true` | Whether to generate PBR materials |
| `quad` | boolean | No | `true` | Whether to use quad mesh |
| `auto_size` | boolean | No | `false` | Whether to auto-adjust size |
| `smart_low_poly` | boolean | No | `false` | Whether to use smart low-poly |

### Step 3 — Poll for Result

```bash
RESULT=$(curl -s "${TRIPO_BASE}/api/aihub/v1/rawproxy/tripo3d/v2/openapi/task/${TASK_ID}" \
  -H "Authorization: Bearer ${API_KEY}")
```

### Completed Response

```json
{
  "code": 0,
  "data": {
    "task_id": "832096f7-9a7b-48a0-88fb-adc0bc615911",
    "type": "image_to_model",
    "status": "success",
    "output": {
      "pbr_model": "https://tripo-data.rg2.download.data.tripo3d.com/...",
      "rendered_image": "https://tripo-data.rg2.download.data.tripo3d.com/..."
    },
    "progress": 100,
    "thumbnail": "https://tripo-data.rg2.download.data.tripo3d.com/...",
    "result": {
      "pbr_model": {
        "type": "fbx",
        "url": "https://tripo-data.rg2.download.data.tripo3d.com/..."
      },
      "rendered_image": {
        "type": "webp",
        "url": "https://tripo-data.rg2.download.data.tripo3d.com/..."
      }
    }
  }
}
```

When `status` is `success`:
- `result.pbr_model.url` — 3D model download URL (FBX format by default)
- `result.rendered_image.url` — Rendered preview image
- `thumbnail` — Thumbnail image

---

## Format Conversion (格式转换)

Convert a generated 3D model to another format (GLB, FBX, USDZ, OBJ, etc.).

### Create Conversion Task

```bash
RESPONSE=$(curl -s "${TRIPO_BASE}/api/aihub/v1/rawproxy/tripo3d/v2/openapi/task" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "convert_model",
    "format": "FBX",
    "original_model_task_id": "<ORIGINAL_TASK_ID>",
    "face_limit": 5000
  }')
```

### Conversion Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Fixed: `convert_model` |
| `format` | string | Yes | Target format: `FBX`, `USDZ`, `OBJ`, `GLB`, `STL` |
| `original_model_task_id` | string | Yes | Task ID from a completed image-to-model task |
| `face_limit` | number | No | Polygon face limit (for optimization) |

After creating the conversion task, poll using the same query endpoint until `status` is `success`.

---

## Polling Rules

All task types use the same polling pattern:

- Poll every **10 seconds**.
- Maximum **60 retries** (~10 minutes timeout).
- Report `progress` to the user during polling (e.g. "Generating 3D model... 45%").
- Check `queuing_num` — if positive, inform the user about the queue position.

### Task Status Values

| Status | Action |
|---|---|
| `queued` | Task is queued. Report queue position if available. Wait and poll again. |
| `running` | Task is generating. Report `progress`. Wait and poll again. |
| `success` | Task is done. Extract results from `output` / `result`. |
| `failed` | Task failed. Report the error and stop. |

---

## Download & Output

Download the generated model and save it locally:

```bash
mkdir -p ~/Downloads/model3d-gen
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_PATH=~/Downloads/model3d-gen/model_${TIMESTAMP}.fbx
curl -s -o "${OUTPUT_PATH}" "${MODEL_URL}"
```

**CRITICAL SECURITY:** Sanitize the output filename — keep only letters, numbers, dot, underscore, and hyphen.

### Reply to user on success

After a successful generation, your reply MUST follow this **exact format**:

```
<success message>

![](rendered_image_url)

Model download: <model_download_url>
Local path: <local_path>
```

Rules:
1. **Preview image** — if a `rendered_image` or `thumbnail` is available, display it inline with `![](url)`.
2. **Model download** — provide the model download URL.
3. **Local path** — show the saved file path so the user knows where it is.
4. **Print `MEDIA:<path>`** for auto-attach if available.

---

## Choosing the Right Mode

| User Intent | Task Type | Description |
|---|---|---|
| Generate 3D from text description | `text_to_image` | Text prompt generates a concept image first |
| Generate 3D from an existing image | `image_to_model` | Image directly to 3D model with textures |
| Convert model to another format | `convert_model` | FBX, USDZ, OBJ, GLB, STL |

### Recommended Workflow

For **text-to-3D**, the full pipeline is:
1. `text_to_image` — generate concept image from text
2. `image_to_model` — convert the generated image to a 3D model
3. (Optional) `convert_model` — convert to desired format

For **image-to-3D**, start directly at step 2.

## Error Handling

| Scenario | Action |
|---|---|
| URL or API key is empty | Tell user to configure settings in Settings > Gateway > Image Generation |
| `code` is not `0` in response | Report the error message, stop |
| Poll timeout (10 min) | Inform user generation is taking too long, provide task_id for manual checking |
| Task status is `failed` | Report the error, stop |
| Image upload fails | Report upload error, suggest checking the file format and size |
| Network error | Inform user, suggest checking connection |

## Default Parameters

When the user does not specify, use these defaults for image-to-model:
- **model_version**: `v3.0-20250812`
- **texture**: `true`
- **texture_quality**: `detailed`
- **texture_alignment**: `original_image`
- **pbr**: `true`
- **quad**: `true`
- **auto_size**: `false`
- **smart_low_poly**: `false`

## Triggers

- Chinese: "生成3D模型：xxx" / "文生模型：xxx" / "图生模型" / "建模" / "三维模型" / "生成模型"
- English: "generate 3D model: xxx" / "create 3D model: xxx" / "text to 3D" / "image to 3D"

Treat the text after the colon as `prompt` and generate immediately using default parameters.

## Prompt Enhancement

For text-to-3D, expand vague user requests into detailed prompts:
- Describe the object's shape, material, color, and surface details.
- Mention the viewing angle if relevant (e.g. front view, isometric).
- Keep prompts focused on a single object for best results.
- Preserve the user's original intent; only add detail, never change meaning.
- If the user provides a very specific prompt, use it as-is without modification.

## Notes

- 3D model generation typically takes 1-5 minutes. Keep the user informed during polling.
- The `progress` field indicates completion percentage (0-100).
- The default output format is FBX with PBR textures. Use format conversion for other formats.
- Model download URLs may be time-limited (signed URLs). Download promptly after task completion.
- Filebed COS uploaded files are retained for 1 day only.
- Due to compute resource limits, there are concurrency restrictions. Avoid submitting many tasks simultaneously.
