---
name: nano-banana
description: "Nano Banana Pro - AI Image Generation: generate and edit images using Google's Gemini image generation models (Nano Banana 2 = gemini-2.0-flash-preview-image-generation, Nano Banana Pro = gemini-3-pro-image-preview). Create photorealistic images, illustrations, concept art, and edited variations from text prompts. Use when: the user wants to generate an image, create artwork, make a visual, edit an existing image, create a logo concept, illustrate an idea, or generate any visual content from a description."
metadata: { "openclaw": { "emoji": "🍌" } }
---

## Setup
Set `GEMINI_API_KEY` in PetClaw settings. Get free key at https://aistudio.google.com/app/apikey

## Models
- **Nano Banana 2** (faster, free tier): `gemini-2.0-flash-preview-image-generation`
- **Nano Banana Pro** (higher quality): `gemini-3-pro-image-preview`

## Generate Image
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "<YOUR PROMPT HERE>"}]
    }],
    "generationConfig": {
      "responseModalities": ["IMAGE", "TEXT"]
    }
  }' | python3 -c "
import sys, json, base64
resp = json.load(sys.stdin)
for part in resp['\''candidates'\''][0]['\''content'\'']['\''parts'\'']:
    if '\''inlineData'\'' in part:
        data = base64.b64decode(part['\''inlineData'\'']['\''data'\''])
        with open('/tmp/generated_image.png', '\''wb'\'') as f:
            f.write(data)
        print('\''Saved to /tmp/generated_image.png'\'')
"
```

## Edit Existing Image
```python
import google.generativeai as genai
import PIL.Image

genai.configure(api_key=os.environ['GEMINI_API_KEY'])
model = genai.GenerativeModel('gemini-2.0-flash-preview-image-generation')

image = PIL.Image.open('/path/to/input.jpg')
response = model.generate_content([
    image,
    "Edit this image to: <EDIT INSTRUCTION>"
])
```

## Prompt Engineering Tips

### Style Modifiers
- **Photorealistic**: "photorealistic, 8K, DSLR, natural lighting"
- **Illustration**: "digital illustration, flat design, vector art"
- **Artistic**: "oil painting, impressionist style, textured canvas"
- **Cinematic**: "cinematic lighting, film still, anamorphic lens"

### Composition
- Specify: foreground, background, lighting direction, camera angle
- Example: "close-up portrait, soft backlight, shallow depth of field, blurred bokeh background"

### Negative guidance (what to avoid)
Add to end: "Avoid: blurry, distorted, watermark, text"

## Workflow
1. Ask user to describe the image they want
2. Help refine the prompt (suggest style, composition, lighting)
3. Generate with Nano Banana 2 first (faster)
4. If user wants higher quality, switch to Pro model
5. Save output to `/tmp/generated_image.png`
6. Open in Preview: `open /tmp/generated_image.png`
7. Offer variations or edits based on feedback
