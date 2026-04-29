---
name: image-gen
version: 1.0.0
description: ArtFlow image generation. Text-to-image via ArtFlow API. Use when the user asks to generate, create, or draw an image, or says "生成图片", "画一张", "文生图".
metadata:
  openclaw:
    emoji: "🎨"
---

# Image Gen (ArtFlow)

Generate images from text prompts via ArtFlow API (artflow.gz4399.com). Uses `gpt-image-2` model by default.

## Authentication

Read the JWT token from the local cloud session stored in `localStorage`:

```bash
# The token is stored in electron-store as cloudApiToken.
# In the SKILL context, read it from the mimiclaw cloud session file.
CLOUD_TOKEN=$(python3 -c "
import json, os, sys
# Try electron-store settings
settings_paths = [
    os.path.expanduser('~/Library/Application Support/极智/settings.json'),
    os.path.expanduser('~/Library/Application Support/jizhi/settings.json'),
    os.path.expanduser('~/.config/极智/settings.json'),
    os.path.expanduser('~/.config/jizhi/settings.json'),
]
for p in settings_paths:
    if os.path.exists(p):
        data = json.load(open(p))
        token = data.get('cloudApiToken', '')
        if token:
            print(token)
            sys.exit(0)
print('')
" 2>/dev/null)
```

If the token is empty, inform the user they need to log in first via the app's login page.

The token is used as a cookie: `aisearch_jwt=JWT <token>`

## API Endpoint

- Base URL: `https://artflow.gz4399.com`
- Create Topic: `POST /api/nextimage/v1/topic/create`
- Send: `POST /api/nextimage/v1/chat/message/send`
- Query: `GET /api/nextimage/v1/chat/message?id={messageId}`

## Step 1 - Create Topic

**Every generation must first create a new topic (chat session).** The returned `chatId` is required by the send request.

**IMPORTANT: `count` must always be `1` unless the user explicitly requests multiple images (e.g. "生成3张", "generate 4 images"). Never increase count on your own.**

```bash
TOPIC_RESPONSE=$(curl -s 'https://artflow.gz4399.com/api/nextimage/v1/topic/create' \
  -H 'accept: application/json' \
  -H 'content-type: application/json;charset=UTF-8' \
  -b "aisearch_jwt=JWT ${CLOUD_TOKEN}" \
  -H 'x-client-source: artflow-main' \
  --data-raw '{
    "config": {
      "clearContext": 0,
      "count": 1,
      "gptImage2Size": { "height": 2048, "ratio": "1:1", "width": 2048 },
      "model": "gpt-image-2"
    }
  }')
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `config.model` | string | `gpt-image-2` | Generation model |
| `config.count` | number | `1` | Number of images. **Always 1 unless user explicitly asks for more.** |
| `config.gptImage2Size.ratio` | string | `1:1` | Aspect ratio: `auto`, `1:1`, `16:9`, `9:16`, `4:3`, `3:4` |
| `config.gptImage2Size.width` | number | `2048` | Image width |
| `config.gptImage2Size.height` | number | `2048` | Image height |
| `config.clearContext` | number | `0` | Whether to clear context |

### Create Topic Response

```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": 56789
  }
}
```

Extract `data.id` as `CHAT_ID`. If `code` is not `0`, report the error and stop.

## Step 2 - Send Generation Request

Use the `CHAT_ID` from Step 1:

**The `count` here MUST match the value used in Step 1. Default is `1`.**

```bash
curl -s 'https://artflow.gz4399.com/api/nextimage/v1/chat/message/send' \
  -H 'accept: application/json' \
  -H 'content-type: application/json;charset=UTF-8' \
  -b "aisearch_jwt=JWT ${CLOUD_TOKEN}" \
  -H 'x-client-source: artflow-main' \
  --data-raw '{
    "prompt": "<USER_PROMPT>",
    "model": "gpt-image-2",
    "chatId": <CHAT_ID>,
    "params": {
      "clearContext": 0,
      "count": 1,
      "gptImage2Size": { "ratio": "1:1" }
    }
  }'
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | Yes | - | Image description |
| `model` | string | No | `gpt-image-2` | Generation model |
| `chatId` | number | Yes | - | Topic ID from Step 1 |
| `params.count` | number | No | `1` | Number of images. **Must match Step 1. Always 1 unless user explicitly asks for more.** |
| `params.gptImage2Size.ratio` | string | No | `1:1` | Aspect ratio: `auto`, `1:1`, `16:9`, `9:16`, `4:3`, `3:4` |

### Send Response

```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": [3175285, 3175286]
  }
}
```

Extract `data.id` array. This typically returns 2 IDs: one for the user message, one for the assistant message.

If `code` is not `0`, report the error message to the user and stop.

## Step 3 - Poll for Result

For **each** message ID returned, query the message status:

```bash
curl -s "https://artflow.gz4399.com/api/nextimage/v1/chat/message?id=${MSG_ID}" \
  -H 'accept: application/json' \
  -b "aisearch_jwt=JWT ${CLOUD_TOKEN}" \
  -H 'x-client-source: artflow-main'
```

### Response Handling Rules

1. **If `data.role` is `"user"`** — skip this message ID entirely, move to the next one.

2. **If `data.role` is `"assistant"`** — check `data.content` for an item with `type: "image"`:
   - If `image.status` is `"pending"` — wait **10 seconds**, then poll again. Keep polling up to 5 minutes (30 retries).
   - If `image.status` is `"success"` — extract the image URL (see Step 4).
   - If `image.status` is any other value — report error from `image.errorInfo` or `image.error` and stop.

### Pending Response Example

```json
{
  "code": 0,
  "data": {
    "role": "assistant",
    "content": [{
      "type": "image",
      "image": {
        "status": "pending",
        "url": "",
        "originUrl": "",
        "width": 1024,
        "height": 1024,
        "predictTimeSec": 90
      }
    }]
  }
}
```

### Success Response Example

```json
{
  "code": 0,
  "data": {
    "role": "assistant",
    "content": [{
      "type": "image",
      "image": {
        "status": "success",
        "url": "/cosres/apps-ai-tools/nextimage/storage_out/user_11/xxx_small.webp",
        "originUrl": "/cosres/apps-ai-tools/nextimage/storage_out/user_11/xxx.png",
        "width": 1024,
        "height": 1536
      }
    }]
  }
}
```

## Step 4 - Extract Image URL

The `originUrl` field is a **relative path**. Prepend the base URL to get the full URL:

```
https://artflow.gz4399.com{originUrl}
```

For example:
```
https://artflow.gz4399.com/cosres/apps-ai-tools/nextimage/storage_out/user_11/1777382299852_bb67ca9b13ab42ff96cf322d9e556074.png
```

The `url` field contains a smaller preview (webp). Use `originUrl` for the full-resolution image.

## Step 5 - Download & Output

Download the image and save it locally:

**Output directory**:

```bash
mkdir -p ~/Downloads/image-gen
```

Download using curl:

```bash
curl -s -o "${OUTPUT_PATH}" "https://artflow.gz4399.com${ORIGIN_URL}" \
  -b "aisearch_jwt=JWT ${CLOUD_TOKEN}"
```

Default filename: `artflow-<TIMESTAMP>.png`

**CRITICAL SECURITY:** Sanitize the output filename — keep only letters, numbers, dot, underscore, and hyphen.

### Reply to user on success

After a successful generation, your reply MUST follow this **exact format**:

```
<success message>

![](full_image_url)

Local path: local_path
```

Rules:
1. **Inline image** — output `![](full_image_url)` on its own line using the full URL (`https://artflow.gz4399.com` + `originUrl`). This renders the image inline in chat.
2. **Local path** — show the saved file path so the user knows where it is.
3. **Print `MEDIA:<path>`** for auto-attach if available.

## Error Handling

| Scenario | Action |
|---|---|
| Token is empty | Tell user to log in first |
| `code` is not `0` in send response | Report error message, stop |
| Poll timeout (5 min) | Inform user generation is taking too long, suggest retrying |
| `image.status` is not `pending`/`success` | Report `errorInfo` or `error` field |
| Network error | Inform user, suggest checking connection |

## Triggers

- Chinese: "生成图片：xxx" / "画一张：xxx" / "文生图：xxx" / "帮我画"
- English: "generate image: xxx" / "draw: xxx" / "create image: xxx"

Treat the text after the colon as `prompt`, use default `ratio` of `"auto"`, and generate immediately.

## Prompt Enhancement

Expand vague user requests into detailed prompts before submission:
- Add style, composition, lighting, and background details where appropriate.
- Preserve the user's original intent; only add detail, never change meaning.
- If the user provides a very specific prompt, use it as-is without modification.
- **Never change `count` or `ratio` during prompt enhancement.** Only modify the text prompt.

## Notes

- The generation typically takes 1-3 minutes. Keep the user informed during polling.
- The `predictTimeSec` field in the pending response gives an estimate (usually 90s).
- Image URLs from ArtFlow may require the same cookie authentication to access.
- Always use `originUrl` (full resolution PNG) rather than `url` (compressed webp preview).
