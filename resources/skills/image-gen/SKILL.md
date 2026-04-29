---
name: image-gen
version: 2.0.0
description: Image generation via OpenAI-compatible API. Text-to-image and image-to-image via aihub.gz4399.com. Use when the user asks to generate, create, or draw an image, edit/modify an existing image, or says "生成图片", "画一张", "文生图", "图生图".
metadata:
  openclaw:
    emoji: "🎨"
---

# Image Gen

Generate images from text prompts or edit images with reference images via the OpenAI-compatible API at `aihub.gz4399.com`. Uses `gpt-image-2` model.

## Authentication

Read the API URL and API key from the app settings stored in electron-store:

```bash
read -r IMAGE_GEN_URL IMAGE_GEN_KEY <<< $(python3 -c "
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

- `IMAGE_GEN_URL` — The OpenAI-compatible API base URL (e.g. `https://aihub.gz4399.com/v1`), configured in Settings > Gateway > Image Generation.
- `IMAGE_GEN_KEY` — The API key for the image generation service.

If either value is empty, inform the user they need to configure the Image Generation URL and API Key in **Settings > Gateway > Image Generation** first.

## API Endpoint

- Base URL: Configured via `imageGenUrl` in settings (e.g. `https://aihub.gz4399.com/v1`)
- Model: `gpt-image-2`
- Text-to-image: `POST {BASE_URL}/images/generations`
- Image-to-image: `POST {BASE_URL}/images/edits`

## Text-to-Image (文生图)

Generate an image from a text prompt.

### Python

```python
from openai import OpenAI
import base64
import datetime

client = OpenAI(
    api_key=IMAGE_GEN_KEY,
    base_url=IMAGE_GEN_URL  # e.g. "https://aihub.gz4399.com/v1"
)

result = client.images.generate(
    model="gpt-image-2",
    prompt="<USER_PROMPT>"
)

image_base64 = result.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
filename = f"output_{timestamp}.png"

with open(filename, "wb") as f:
    f.write(image_bytes)
```

### curl

```bash
RESPONSE=$(curl -s "${IMAGE_GEN_URL}/images/generations" \
  -H "Authorization: Bearer ${IMAGE_GEN_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2",
    "prompt": "<USER_PROMPT>"
  }')

# Extract base64 image data and decode
IMAGE_B64=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['b64_json'])")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_PATH=~/Downloads/image-gen/output_${TIMESTAMP}.png
mkdir -p ~/Downloads/image-gen
echo "$IMAGE_B64" | base64 -d > "$OUTPUT_PATH"
```

### Response Format

```json
{
  "data": [
    {
      "b64_json": "<base64-encoded-image-data>"
    }
  ]
}
```

## Image-to-Image (图生图)

Edit or combine images using reference images with a text prompt. Supports multiple reference images.

### Python

```python
from openai import OpenAI
import base64
import datetime

client = OpenAI(
    api_key=IMAGE_GEN_KEY,
    base_url=IMAGE_GEN_URL  # e.g. "https://aihub.gz4399.com/v1"
)

result = client.images.edit(
    model="gpt-image-2",
    image=[
        open("image1.png", "rb"),
        open("image2.png", "rb"),
    ],
    prompt="<USER_PROMPT>"
)

image_base64 = result.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
filename = f"output_{timestamp}.png"

with open(filename, "wb") as f:
    f.write(image_bytes)
```

### curl

```bash
RESPONSE=$(curl -s "${IMAGE_GEN_URL}/images/edits" \
  -H "Authorization: Bearer ${IMAGE_GEN_KEY}" \
  -F model="gpt-image-2" \
  -F "image=@image1.png" \
  -F "image=@image2.png" \
  -F "prompt=<USER_PROMPT>")

# Extract base64 image data and decode
IMAGE_B64=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['b64_json'])")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_PATH=~/Downloads/image-gen/output_${TIMESTAMP}.png
mkdir -p ~/Downloads/image-gen
echo "$IMAGE_B64" | base64 -d > "$OUTPUT_PATH"
```

### Notes on Image-to-Image

- Pass one or more reference images via the `image` parameter.
- The prompt should describe how to use/combine the reference images.
- Useful for style transfer, compositing, and image editing tasks.

## Output

**Output directory**:

```bash
mkdir -p ~/Downloads/image-gen
```

Default filename: `output_<TIMESTAMP>.png`

**CRITICAL SECURITY:** Sanitize the output filename — keep only letters, numbers, dot, underscore, and hyphen.

### Reply to user on success

After a successful generation, your reply MUST follow this **exact format**:

```
<success message>

![](file_path_or_url)

Local path: local_path
```

Rules:
1. **Inline image** — output `![](path)` on its own line to render the image inline in chat.
2. **Local path** — show the saved file path so the user knows where it is.
3. **Print `MEDIA:<path>`** for auto-attach if available.

## Error Handling

| Scenario | Action |
|---|---|
| URL or API key is empty | Tell user to configure Image Generation settings in Settings > Gateway > Image Generation |
| API returns error | Report the error message, stop |
| Response missing `b64_json` | Report unexpected response format |
| Network error | Inform user, suggest checking connection |

## Choosing Text-to-Image vs Image-to-Image

| User Intent | API |
|---|---|
| Generate from text description only | `images/generations` (text-to-image) |
| Edit, modify, or combine existing images | `images/edits` (image-to-image) |
| Add elements to an existing image | `images/edits` (image-to-image) |
| Change style of an existing image | `images/edits` (image-to-image) |

## Triggers

- Chinese: "生成图片：xxx" / "画一张：xxx" / "文生图：xxx" / "帮我画" / "图生图"
- English: "generate image: xxx" / "draw: xxx" / "create image: xxx" / "edit image"

Treat the text after the colon as `prompt` and generate immediately.

## Prompt Enhancement

Expand vague user requests into detailed prompts before submission:
- Add style, composition, lighting, and background details where appropriate.
- Preserve the user's original intent; only add detail, never change meaning.
- If the user provides a very specific prompt, use it as-is without modification.

## Notes

- The generation typically takes 30s-2min depending on complexity.
- The API returns base64-encoded image data directly — no polling required.
- For image-to-image, ensure reference image files exist and are accessible before calling the API.
- Multiple reference images can be passed for compositing tasks.
