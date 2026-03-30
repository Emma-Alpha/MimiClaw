---
name: veo-video-gen
description: "AI Video Generation (Veo 3.1 Fast): generate short videos from text prompts or images using Google's Veo 3.1 Fast model via Vertex AI. Create cinematic clips, product demos, animations, and visual storytelling content. Use when: the user wants to generate a video, create a video clip from a description, turn an image into a video, make a product demo video, create an animated scene, or produce any AI-generated video content."
metadata: { "openclaw": { "emoji": "🎬" } }
---

## Setup
1. Create a Google Cloud project at https://console.cloud.google.com/
2. Enable Vertex AI API and Veo model access
3. Create a service account and download JSON key
4. Set in PetClaw settings:
   - `GOOGLE_CLOUD_PROJECT`: your project ID (e.g. `my-project-123`)
   - `GOOGLE_APPLICATION_CREDENTIALS`: path to JSON key file

```bash
# Install Google Cloud SDK
brew install google-cloud-sdk

# Authenticate
gcloud auth application-default login
gcloud config set project $GOOGLE_CLOUD_PROJECT
```

## Generate Video from Text

```python
import vertexai
from vertexai.preview.vision_models import VideoGenerationModel

vertexai.init(project=os.environ['GOOGLE_CLOUD_PROJECT'], location='us-central1')
model = VideoGenerationModel.from_pretrained('veo-3.1-fast-generate-preview')

operation = model.generate_video(
    prompt="<YOUR PROMPT>",
    output_gcs_uri="gs://your-bucket/output/",
    duration_seconds=8,       # 4-8 seconds
    aspect_ratio="16:9",      # "16:9" | "9:16" | "1:1"
    fps=24,
)

# Wait for completion
video = operation.result()
print(f"Video saved to: {video.video.uri}")
```

## Generate Video from Image (Image-to-Video)

```python
from vertexai.preview.vision_models import Image

input_image = Image.load_from_file('/path/to/image.jpg')
operation = model.generate_video(
    prompt="Animate this image: gentle camera pan to the right, clouds moving",
    image=input_image,
    duration_seconds=5,
)
```

## Download Generated Video
```bash
# Copy from GCS to local
gsutil cp gs://your-bucket/output/*.mp4 /tmp/generated_video.mp4

# Open in QuickTime
open /tmp/generated_video.mp4
```

## Prompt Engineering for Video

### Motion Descriptors
- Camera: "slow dolly in", "aerial tracking shot", "handheld", "static tripod"
- Subject: "walking forward", "rotating 360°", "exploding in slow motion"
- Atmosphere: "golden hour light", "stormy sky", "neon-lit rain"

### Good Prompt Structure
```
[Subject + Action] + [Setting] + [Camera Movement] + [Style/Mood]

Example: "A majestic eagle soaring over snow-capped mountains, 
aerial tracking shot, cinematic 4K, dramatic clouds, golden hour lighting"
```

### Tips
- Be specific about motion — static scenes look less impressive
- Keep prompts under 200 words
- For image-to-video: describe the motion you want, not the scene content
- Aspect ratio: 16:9 for YouTube/landscape, 9:16 for Reels/Shorts

## Workflow
1. Ask user what video they want (subject, setting, mood, length)
2. Help craft an effective video prompt
3. Check GCS bucket is configured (or set up one)
4. Generate video (typically takes 30-120 seconds)
5. Download and open locally
6. Offer to generate variations
