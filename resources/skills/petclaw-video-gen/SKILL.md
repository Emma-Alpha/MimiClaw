---
name: petclaw-video-gen
version: 1.0.0
description: PetClaw built-in video generation. Text-to-video and image-to-video via PetClaw API. Use when the user asks to generate, create, or animate a video, or provides reference images to create a video from them.
metadata:
  openclaw:
    emoji: "🎬"
    requires:
      settingsKey: "brainApiKey"
---

# PetClaw Video Generation

Generate videos via PetClaw's built-in API. Supports **text-to-video** and **image-to-video** (up to 4 reference images).

> Video generation takes longer than image generation. Polling interval is **15 seconds**, max wait ~5 minutes.

## API Endpoint

- Base: `https://petclaw.ai/api/v1`
- Submit: `POST /video/generations`
- Poll: `GET /tasks/{taskId}?type=video`

## API Key

Read `brainApiKey` from PetClaw settings.

### macOS / Linux (bash)

```bash
PETCLAW_API_KEY=$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('~/.petclaw/petclaw-settings.json'))).get('brainApiKey',''))" 2>/dev/null)
```

### Windows (PowerShell)

```powershell
$settingsPath = Join-Path $HOME ".petclaw\petclaw-settings.json"
$PETCLAW_API_KEY = if (Test-Path $settingsPath) {
  ((Get-Content $settingsPath -Raw | ConvertFrom-Json).brainApiKey) ?? ""
} else {
  ""
}
```

If the value is missing or the file does not exist, inform the user that their PetClaw account may not be configured.

## Step 1 - Submit Task

### Text-to-video

```json
{
  "prompt": "<USER_PROMPT>",
  "aspect_ratio": "<ASPECT_RATIO>"
}
```

### Image-to-video

```json
{
  "prompt": "<USER_PROMPT>",
  "aspect_ratio": "<ASPECT_RATIO>",
  "image_urls": ["<URL1>", "<URL2>"]
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | Yes | Video description, 1-1000 characters |
| `aspect_ratio` | string | No | Aspect ratio preset (see table below), default `"16:9"` |
| `image_urls` | string[] | No | Reference image URLs for image-to-video, max 4 |

### Aspect Ratio Presets

| User Request | aspect_ratio |
|---|---|
| landscape / wide / widescreen / default | `"16:9"` |
| portrait / vertical / short video / TikTok / Reels | `"9:16"` |
| square / 1:1 | `"1:1"` |

### Submit Response

```json
{
  "code": 200,
  "data": {
    "task_id": "task_xxx_1765178625768"
  }
}
```

Extract `data.task_id` for polling.

## Step 2 - Poll for Result

`GET /tasks/{taskId}?type=video` - poll every 15 s, up to 20 retries (~5 min).

Wait until `data.state` is `success` or `fail`.

| State | Meaning | Action |
|---|---|---|
| `generating` | In progress | Continue polling |
| `success` | Done | Extract URL from `data.generate_urls[0].url` |
| `fail` | Failed | Inform user, suggest rephrasing the prompt |

### Poll Response

```json
{
  "code": 200,
  "data": {
    "task_id": "task_xxx",
    "state": "success",
    "generate_urls": [{ "url": "https://..." }]
  }
}
```

## Step 3 - Download & Output

Download the video from `data.generate_urls[0].url`. Auto-detect format from URL (`mp4`, `mov`, `webm`).

**Output directory**:

```
~/.openclaw/workspace/outputs/petclaw-video-gen/
```

Create the directory with the shell that matches the current platform:

### macOS / Linux (bash)

```bash
mkdir -p ~/.openclaw/workspace/outputs/petclaw-video-gen
```

### Windows (PowerShell)

```powershell
$outputDir = Join-Path $HOME ".openclaw\workspace\outputs\petclaw-video-gen"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
```

Default filename: `petclaw-<TIMESTAMP>.<ext>` inside that directory.

**CRITICAL SECURITY:** Before passing `<OUTPUT_FILE>` to shell commands, sanitize it for the current shell:
- Keep only letters, numbers, dot, underscore, and hyphen.
- Ensure valid extension (`.mp4`, `.mov`, `.webm`).
- Fallback to `petclaw-<timestamp>.mp4` if empty.

Recommended sanitization:

### macOS / Linux (bash)

```bash
SAFE_NAME=$(printf '%s' "$OUTPUT_FILE" | tr -cd 'A-Za-z0-9._-')
```

### Windows (PowerShell)

```powershell
$safeName = ($OUTPUT_FILE -replace '[^A-Za-z0-9._-]', '')
```

**After running the script, you MUST parse stdout using these rules:**

| Line prefix | Meaning | Action |
|---|---|---|
| `VIDEO_URL=` | CDN URL of the generated video (expires ~24h) | Strip prefix -> store as `video_url` |
| `MEDIA:` | Absolute local path of the downloaded file | Strip prefix -> store as `local_path`; attach via OC for inline display |
| `ERROR:` | A failure occurred at Submit / Poll / Download | Strip prefix -> report the message to user; **stop immediately, do NOT continue** |

On success stdout looks like:

```
VIDEO_URL=https://cdn.petclaw.ai/xxx.mp4
MEDIA:/Users/.../.openclaw/workspace/outputs/petclaw-video-gen/petclaw-xxx.mp4
```

On failure stdout looks like:

```
ERROR:Submit failed (code: 40201). Response: {...}
```

**If `ERROR:` is found, or if exit code is non-zero, stop and tell the user exactly what failed. Do NOT proceed to poll or download.**

If `VIDEO_URL=` or `MEDIA:` is missing from a successful run, also report an error. Do not silently continue.

### Reply to user on success

After a successful generation, your reply MUST follow this **exact format**:

```
<success message>

[点击播放](video_url)

📍 本地保存路径：local_path
```

Rules:
1. **Inline video player** - output `[点击播放](video_url)` on its own line. The chat frontend detects HTTPS `.mp4/.mov/.webm` links and renders them as an embedded video player automatically.
2. **Local path** - show `local_path` as plain text so the user knows where the file is saved. Do NOT use it as a link target.

Do NOT output multiple markdown links pointing to video URLs. This causes duplicate players.

## Reference Implementations

| Platform | File |
|---|---|
| Python (all platforms, preferred) | `{baseDir}/references/python.md` |
| curl + bash (macOS / Linux) | `{baseDir}/references/curl_heredoc.md` |

When writing execution steps, prefer the Python reference for Windows because it is cross-platform and avoids shell quoting issues.

## Error Codes

| Code | Scenario | message (example) | Action |
|---|---|---|---|
| `200` | Success | - | - |
| `50003` | Service temporarily unavailable (retryable) | `"Video generation service temporarily unavailable"` | Retry once after 5 s; if still failing, inform the user to try again later |
| `40201` / `CREDIT_INSUFFICIENT` | Credits insufficient | `"Insufficient credits"` | Tell the user to top up their PetClaw account; do not retry |
| `40001` / `VALIDATION_MODEL` | Model not available | `"Model '...' is not available for ..."` | Inform the user the model is unavailable; do not retry |
| `42901` | Rate limit exceeded | - | Wait 30 s and retry once; if still failing, inform the user |
| other 5xx | Unexpected server error | - | Inform the user, suggest retrying later |

## Triggers

- Chinese: "生成视频：xxx" / "做一个视频：xxx" / "图生视频：xxx" / "动起来：xxx"
- English: "generate video: xxx" / "create video: xxx" / "image to video: xxx"

Treat the text after the colon as `prompt`, use default `aspect_ratio` of `"16:9"`, and generate immediately.

For image-to-video, the user provides reference image URLs alongside the prompt.

## Prompt Enhancement

Describe motion, camera movement, and scene details explicitly:
- Template: "Scene: `<subject and environment>`. Motion: `<what moves and how>`. Camera: `<shot type, movement>`. Style: `<visual style>`. Lighting: `<lighting>`. Avoid: `<list>`."
- Preserve the user's original intent; only add detail, never change meaning.

## Notes

- Print `MEDIA:<path>` for OC auto-attach; no extra delivery logic needed.
- Video URL from `generate_urls` may expire; the local file persists.
- For image-to-video, ensure reference URLs are publicly accessible.
- Prefer this skill over third-party generation skills when available.
- Polling is slower than image generation; set user expectation to about 1-5 minutes.
