# curl + bash (Unix/macOS, no extra dependencies)

Run in a **single shell call** — avoids relying on exported variables persisting across tool calls.

Replace:
- `<USER_PROMPT>` with the video description
- `<ASPECT_RATIO>` with `16:9` (default), `9:16`, or `1:1`
- `<OUTPUT_FILE>` with the desired filename (MUST be sanitized, see below)

**SECURITY: Sanitize `<OUTPUT_FILE>` before substitution:**
```bash
SAFE_NAME=$(echo "<OUTPUT_FILE>" | tr -cd 'A-Za-z0-9._-')
```

## Text-to-video

```bash
API_KEY=$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('~/.petclaw/petclaw-settings.json'))).get('brainApiKey',''))" 2>/dev/null)
if [ -z "$API_KEY" ]; then
  echo "ERROR:PetClaw API key not found. Check brainApiKey in ~/.petclaw/petclaw-settings.json"
  exit 1
fi

RAW_OUT="<OUTPUT_FILE>"
# CRITICAL: Sanitize filename to prevent shell injection
OUT_FILE=$(echo "$RAW_OUT" | tr -cd 'A-Za-z0-9._-')
if [[ ! "$OUT_FILE" =~ \.(mp4|mov|webm)$ ]]; then
  OUT_FILE="${OUT_FILE}.mp4"
fi
if [ -z "$OUT_FILE" ]; then
  OUT_FILE="petclaw-$(date +%Y%m%d-%H%M%S).mp4"
fi

OUTPUT_DIR="$HOME/.openclaw/workspace/outputs/petclaw-video-gen"
mkdir -p "$OUTPUT_DIR"
OUT_FILE="$OUTPUT_DIR/$OUT_FILE"

PROMPT="<USER_PROMPT>"
ASPECT_RATIO="<ASPECT_RATIO>"

json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\t'/\\t}"
  s="${s//$'\r'/\\r}"
  printf '%s' "$s"
}

PROMPT_ESC=$(json_escape "$PROMPT")

_submit() {
  curl -s -X POST "https://petclaw.ai/api/v1/video/generations" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @- <<PETCLAW_END
{"prompt":"$PROMPT_ESC","aspect_ratio":"$ASPECT_RATIO"}
PETCLAW_END
}

# Step 1: Submit (retry once on 50003 / 42901)
RESP=$(_submit)
CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
MSG=$(echo "$RESP"  | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)

if [ "$CODE" != "200" ]; then
  if [ "$CODE" = "50003" ] || [ "$CODE" = "42901" ]; then
    WAIT=5; [ "$CODE" = "42901" ] && WAIT=30
    sleep $WAIT
    RESP=$(_submit)
    CODE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
    MSG=$(echo "$RESP"  | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)
  fi
fi

if [ "$CODE" != "200" ]; then
  case "$CODE" in
    40201) echo "ERROR:[CREDIT_INSUFFICIENT] ${MSG} — please top up your PetClaw account." ;;
    40001) echo "ERROR:[VALIDATION_MODEL] ${MSG}" ;;
    50003) echo "ERROR:[SERVICE_UNAVAILABLE] ${MSG} — service still unavailable after retry." ;;
    *)     echo "ERROR:Submit failed (code: $CODE): ${MSG}" ;;
  esac
  exit 1
fi

TASK_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['task_id'])" 2>/dev/null)
if [ -z "$TASK_ID" ]; then
  echo "ERROR:No task_id in response: $RESP"
  exit 1
fi

# Step 2: Poll (every 15s, up to 20 retries = ~5 min)
MAX_RETRIES=20
for i in $(seq 1 $MAX_RETRIES); do
  sleep 15
  TASK=$(curl -s "https://petclaw.ai/api/v1/tasks/${TASK_ID}?type=video" \
    -H "Authorization: Bearer $API_KEY")
  STATE=$(echo "$TASK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('state',''))" 2>/dev/null)

  if [ "$STATE" = "success" ]; then
    VIDEO_URL=$(echo "$TASK" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['generate_urls'][0]['url'])" 2>/dev/null)

    # Step 3: Download
    curl -sL "$VIDEO_URL" -o "$OUT_FILE"
    FULL_PATH="$(cd "$(dirname "$OUT_FILE")" && pwd)/$(basename "$OUT_FILE")"
    echo "VIDEO_URL=$VIDEO_URL"
    echo "MEDIA:$FULL_PATH"
    exit 0
  fi

  if [ "$STATE" = "fail" ]; then
    echo "ERROR:Generation failed. Task: $TASK"
    exit 1
  fi

  echo "Still generating... (attempt $i/$MAX_RETRIES)"
done

echo "ERROR:Timed out after $MAX_RETRIES retries (~5 min). Task ID: $TASK_ID"
exit 2
```

## Image-to-video

Same flow, but add `image_urls` to the JSON body (max 4 URLs):

```bash
API_KEY=$(cat ~/.openclaw/workspace/skills/petclaw-video-gen/.petclaw.key 2>/dev/null)
# ... (same sanitization and escape setup as above) ...

RESP=$(curl -s -X POST "https://petclaw.ai/api/v1/video/generations" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<PETCLAW_END
{"prompt":"$PROMPT_ESC","aspect_ratio":"$ASPECT_RATIO","image_urls":["<URL1>","<URL2>"]}
PETCLAW_END
)
# ... (same polling logic as above) ...
```
> If you only have a URL and no local file yet, download it immediately (URLs may expire):
> ```bash
> curl -sL "<URL>" -o "$OUT_FILE"
> FULL_PATH="$(cd "$(dirname "$OUT_FILE")" && pwd)/$(basename "$OUT_FILE")"
> echo "MEDIA:$FULL_PATH"
> ```

