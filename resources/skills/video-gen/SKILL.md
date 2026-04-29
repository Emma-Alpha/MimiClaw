---
name: video-gen
version: 1.0.0
description: Video generation via Seedance 2.0 API. Text-to-video and image/video/audio-to-video via aihub.gz4399.com. Use when the user asks to generate, create, or produce a video, or says "生成视频", "文生视频", "图生视频", "做一个视频".
metadata:
  openclaw:
    emoji: "🎬"
---

# Video Gen

Generate videos from text prompts or multimodal references (images, videos, audio) via the Seedance 2.0 API at `aihub.gz4399.com`.

## Models

| Model | Description |
|---|---|
| `doubao-seedance-2-0-260128_4399` | Full model with best quality |
| `doubao-seedance-2-0-fast-260128_4399` | Faster generation, inherits core capabilities |

Default model: `doubao-seedance-2-0-260128_4399`

## Authentication

Read the API URL and API key from the app settings stored in electron-store (same settings as Image Gen):

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
        url = data.get('aihubApiUrl', '')
        key = data.get('aihubApiKey', '')
        if url and key:
            print(url, key)
            sys.exit(0)
print('', '')
" 2>/dev/null)
```

- `API_BASE_URL` — The API base URL (e.g. `https://aihub.gz4399.com/v1`), configured in **Settings > Gateway > AI Hub**.
- `API_KEY` — The API key for the service.

If either value is empty, inform the user they need to configure the URL and API Key in **Settings > Gateway > AI Hub** first.

## API Endpoints

- Create task: `POST {API_BASE_URL}/rawproxy/seedance/v1/videos`
- Query task: `GET {API_BASE_URL}/rawproxy/seedance/v1/videos/{task_id}`

## Video Generation Modes

| Mode | `video_mode` | `images` | `metadata` | Description |
|---|---|---|---|---|
| Text-to-video | `text_to_video` | None | None | Generate video from text prompt only |
| First frame | `first_frame_to_video` | 1 image URL | None | Use single image as first frame |
| First + last frame | `first_last_frame` | 2 image URLs | None | Use two images as first and last frames |
| Omni mode | `omni` | 0-9 image URLs | `video_urls`, `audio_urls` | Multi-modal reference generation with images, videos, audio |

**These modes are mutually exclusive and cannot be mixed.**

## Step 1 — Create Video Task

### Text-to-Video (文生视频)

```bash
RESPONSE=$(curl -s "${API_BASE_URL}/rawproxy/seedance/v1/videos" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedance-2-0-260128_4399",
    "prompt": "<USER_PROMPT>",
    "aspect_ratio": "16:9",
    "duration": 5,
    "resolution": "720p"
  }')
```

### Image-to-Video — First Frame (首帧生视频)

Pass 1 image URL in `images` — it becomes the video's first frame.

```bash
RESPONSE=$(curl -s "${API_BASE_URL}/rawproxy/seedance/v1/videos" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedance-2-0-260128_4399",
    "prompt": "<USER_PROMPT>",
    "images": ["<IMAGE_URL>"],
    "aspect_ratio": "16:9",
    "duration": 5,
    "resolution": "720p"
  }')
```

### Image-to-Video — First + Last Frame (首尾帧)

Pass 2 image URLs in `images` — first image is the starting frame, second is the ending frame.

```bash
RESPONSE=$(curl -s "${API_BASE_URL}/rawproxy/seedance/v1/videos" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedance-2-0-260128_4399",
    "prompt": "<USER_PROMPT>",
    "images": ["<FIRST_FRAME_URL>", "<LAST_FRAME_URL>"],
    "aspect_ratio": "16:9",
    "duration": 5,
    "resolution": "720p",
    "video_mode": "first_last_frame"
  }')
```

### Omni Mode — Multi-modal Reference (全能模式)

Supports images, reference videos, and reference audio as inputs.

```bash
RESPONSE=$(curl -s "${API_BASE_URL}/rawproxy/seedance/v1/videos" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedance-2-0-260128_4399",
    "prompt": "<USER_PROMPT>",
    "images": ["<IMAGE_URL_1>", "<IMAGE_URL_2>"],
    "aspect_ratio": "16:9",
    "duration": 10,
    "resolution": "720p",
    "video_mode": "omni",
    "metadata": {
      "video_urls": ["<VIDEO_URL_1>"],
      "audio_urls": ["<AUDIO_URL_1>"],
      "generate_audio": true
    }
  }')
```

### Create Task Response

```json
{
  "id": "task_KMBktCIwhboeC6fgl7lj8Zi4ZnHhlvmT",
  "task_id": "task_KMBktCIwhboeC6fgl7lj8Zi4ZnHhlvmT",
  "object": "video",
  "model": "doubao-seedance-2-0-260128_4399",
  "status": "",
  "progress": 0,
  "created_at": 1775532478
}
```

Extract `task_id`. If the response contains an error, report it and stop.

## Step 2 — Poll for Result

Video generation is **asynchronous**. After creating the task, poll the status until completion.

```bash
RESULT=$(curl -s "${API_BASE_URL}/rawproxy/seedance/v1/videos/${TASK_ID}" \
  -H "Authorization: Bearer ${API_KEY}")
```

### Status Values

| Status | Action |
|---|---|
| `queued` | Task is queued. Wait and poll again. |
| `in_progress` | Task is generating. Wait and poll again. Report `progress` to the user. |
| `completed` | Task is done. Extract `metadata.url` for the video download link. |
| `failed` | Task failed. Report the error and stop. |
| `unknown` | Unexpected state. Report and stop. |

### Polling Rules

- Poll every **15 seconds**.
- Maximum **40 retries** (~10 minutes timeout).
- Report progress to the user during polling (e.g. "Generating video... 30%").

### Completed Response Example

```json
{
  "completed_at": 1775532723,
  "created_at": 1775532478,
  "id": "task_KMBktCIwhboeC6fgl7lj8Zi4ZnHhlvmT",
  "metadata": {
    "url": "https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/doubao-seedance-2-0/xxx.mp4?..."
  },
  "model": "doubao-seedance-2-0-260128_4399",
  "object": "video",
  "progress": 100,
  "status": "completed",
  "task_id": "task_KMBktCIwhboeC6fgl7lj8Zi4ZnHhlvmT"
}
```

When `status` is `completed`, extract `metadata.url` as the video download URL.

## Step 3 — Download & Output

Download the video and save it locally:

```bash
mkdir -p ~/Downloads/video-gen
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_PATH=~/Downloads/video-gen/video_${TIMESTAMP}.mp4
curl -s -o "${OUTPUT_PATH}" "${VIDEO_URL}"
```

**CRITICAL SECURITY:** Sanitize the output filename — keep only letters, numbers, dot, underscore, and hyphen.

### Reply to user on success

After a successful generation, your reply MUST follow this **exact format**:

```
<success message>

Video URL: <video_download_url>

Local path: <local_path>
```

Rules:
1. **Video URL** — provide the download URL so the user can preview or share it.
2. **Local path** — show the saved file path so the user knows where it is.
3. **Print `MEDIA:<path>`** for auto-attach if available.

## Request Parameters Reference

| Parameter | Required | Type | Default | Description |
|---|---|---|---|---|
| `model` | Yes | string | - | `doubao-seedance-2-0-260128_4399` or `doubao-seedance-2-0-fast-260128_4399` |
| `prompt` | Yes | string | - | Video generation prompt |
| `images` | No | string[] | - | Reference image URLs (0-9). 1 = first frame, 2 = first+last frame, 3+ = reference images |
| `duration` | No | number | - | Video duration in seconds: 4-15 |
| `resolution` | No | string | - | `480p` or `720p` |
| `aspect_ratio` | No | string | - | `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9`, or `adaptive` |
| `video_mode` | No | string | - | `text_to_video`, `first_frame_to_video`, `first_last_frame`, or `omni` |
| `metadata.video_urls` | No | string[] | - | Reference video URLs (0-3, total duration <= 15s) |
| `metadata.audio_urls` | No | string[] | - | Reference audio URLs (0-3) |
| `metadata.generate_audio` | No | boolean | false | Whether to generate audio for the video |

### Input Constraints

- **Images**: jpeg, png, webp, bmp, tiff, gif. Aspect ratio 0.4-2.5, dimensions 300-6000px, max 30MB each.
- **Videos**: mp4, mov. 480p/720p, 2-15s each, max 3 videos, total duration <= 15s, max 50MB each, FPS 24-60.
- **Total references**: At most 12 reference materials (images + videos + audio combined).
- **Output**: Fixed mp4 format.

## Error Handling

| Scenario | Action |
|---|---|
| URL or API key is empty | Tell user to configure settings in Settings > Gateway > AI Hub |
| Create task returns error | Report the error message, stop |
| Poll timeout (10 min) | Inform user generation is taking too long, provide task_id for manual checking |
| Task status is `failed` | Report the error, stop |
| Task status is `unknown` | Report unexpected state, stop |
| Network error | Inform user, suggest checking connection |

## Choosing the Right Mode

| User Intent | Mode | `video_mode` | `images` |
|---|---|---|---|
| Generate from text only | Text-to-video | `text_to_video` | None |
| Animate a single image | First frame | `first_frame_to_video` | 1 URL |
| Transition between two images | First+last frame | `first_last_frame` | 2 URLs |
| Use multiple images as style/character references | Omni | `omni` | 3+ URLs |
| Use reference videos or audio | Omni | `omni` | Optional + `metadata` |

## Default Parameters

When the user does not specify, use these defaults:
- **model**: `doubao-seedance-2-0-260128_4399`
- **duration**: `5`
- **resolution**: `720p`
- **aspect_ratio**: `16:9`

If the user asks for "fast" or "quick" generation, use the fast model: `doubao-seedance-2-0-fast-260128_4399`.

## Triggers

- Chinese: "生成视频：xxx" / "文生视频：xxx" / "图生视频：xxx" / "做一个视频" / "帮我生成视频"
- English: "generate video: xxx" / "create video: xxx" / "make a video: xxx" / "text to video"

Treat the text after the colon as `prompt` and generate immediately using default parameters.

## Prompt Enhancement

Expand vague user requests into detailed video prompts before submission:
- Add motion descriptions, camera movement, lighting, and scene transitions where appropriate.
- Describe the scene in terms of continuous actions and temporal flow.
- Preserve the user's original intent; only add detail, never change meaning.
- If the user provides a very specific prompt, use it as-is without modification.
- **Never change `duration`, `resolution`, `aspect_ratio`, or `model` during prompt enhancement.** Only modify the text prompt.

## Notes

- Video generation typically takes 2-5 minutes. Keep the user informed during polling.
- The `progress` field in poll responses indicates completion percentage (0-100).
- Reference files (images, videos, audio) must be accessible via URL. If the user provides local files, they need to be uploaded first.
- Due to compute resource limits, there are concurrency restrictions. Avoid submitting many tasks simultaneously.
- The video download URL from `metadata.url` may be time-limited (signed URL). Download promptly after task completion.
