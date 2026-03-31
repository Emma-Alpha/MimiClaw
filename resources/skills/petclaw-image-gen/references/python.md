# Python reference (all platforms, zero dependencies)

> Requires Python 3.6+. Uses only stdlib (`urllib`, `json`, `time`, `os`).

Run directly — no pip install needed:

```bash
python3 generate.py --prompt "a cute cat" --aspect-ratio "1:1"
```

Options:
- `--prompt` (required): image description
- `--aspect-ratio`: `1:1` (default), `16:9`, `9:16`, `4:3`, `3:4`
- `--image-urls URL1 URL2 ...`: reference images for image-to-image (max 14)
- `--out`: output filename (default: `petclaw-<timestamp>.png`)

```python
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import posixpath
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

API_BASE = "https://petclaw.ai/api/v1"
SETTINGS_FILE = os.path.expanduser("~/.petclaw/petclaw-settings.json")
OUTPUT_DIR = os.path.expanduser("~/.openclaw/workspace/outputs/petclaw-image-gen")
_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


def _read_api_key() -> str:
    try:
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f).get("brainApiKey", "").strip()
    except (FileNotFoundError, json.JSONDecodeError):
        return ""


def _json_request(url: str, api_key: str, method: str = "GET", payload=None, timeout_s: int = 60):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": _UA,
        "Accept": "application/json",
    }
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            body = resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read()
        raise RuntimeError(f"HTTP {e.code} {e.reason}: {err_body.decode('utf-8', 'replace')}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"Network error: {e.reason}") from None
    try:
        return json.loads(body.decode("utf-8"))
    except Exception:
        raise RuntimeError(f"Non-JSON response: {body[:200]!r}") from None


def _download(url: str, out_file: str, timeout_s: int = 120):
    req = urllib.request.Request(url, method="GET", headers={"User-Agent": _UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            content = resp.read()
    except Exception as e:
        raise RuntimeError(f"Failed to download image: {e}") from None
    with open(out_file, "wb") as f:
        f.write(content)


def _default_out_file(ext: str = ".png") -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    return os.path.join(OUTPUT_DIR, f"petclaw-{ts}{ext}")


def _ext_from_url(url: str) -> str:
    path = urlparse(url).path
    _, ext = posixpath.splitext(path)
    return ext.lower() if ext in (".png", ".jpg", ".jpeg", ".webp") else ".png"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Generate an image via PetClaw API.")
    parser.add_argument("--prompt", required=True, help="Image description (1–20000 chars).")
    parser.add_argument("--aspect-ratio", default="1:1", help="Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4.")
    parser.add_argument("--image-urls", nargs="*", default=None,
                        help="Reference image URLs for image-to-image (max 14).")
    parser.add_argument("--out", default=None, help="Output filename (default: petclaw-<timestamp>.png).")
    parser.add_argument("--poll-seconds", type=int, default=10, help="Seconds between polls.")
    parser.add_argument("--max-retries", type=int, default=30, help="Max polling attempts (~5 min).")
    parser.add_argument("--verbose", action="store_true", help="Print task ID and per-poll status.")
    args = parser.parse_args(argv)

    api_key = _read_api_key()
    if not api_key:
        print("ERROR:PetClaw API key not found. Check brainApiKey in ~/.petclaw/petclaw-settings.json")
    print("Error: PetClaw API key not found.", file=sys.stderr)
        return 2

    if args.image_urls and len(args.image_urls) > 14:
        print("Error: maximum 14 reference image URLs allowed.", file=sys.stderr)
        return 2

    payload: dict = {
        "prompt": args.prompt,
        "aspect_ratio": args.aspect_ratio,
    }
    if args.image_urls:
        payload["image_input"] = args.image_urls

    # Step 1: Submit (retry once on 50003)
    for attempt in range(2):
        resp = _json_request(f"{API_BASE}/image/generations", api_key=api_key, method="POST", payload=payload)
        code = resp.get("code")
        if code == 200:
            break
        msg = resp.get("message") or str(resp)
        if code == 50003 and attempt == 0:
            time.sleep(5)
            continue
        if code == 40201:
            raise RuntimeError(f"[CREDIT_INSUFFICIENT] {msg} — please top up your PetClaw account.")
        if code == 40001:
            raise RuntimeError(f"[VALIDATION_MODEL] {msg}")
        if code == 42901 and attempt == 0:
            time.sleep(30)
            continue
        raise RuntimeError(f"Submit failed (code {code}): {msg}")
    task_id = (resp.get("data") or {}).get("task_id")
    if not task_id:
        raise RuntimeError(f"No task_id in response: {resp}")
    if args.verbose:
        print(f"Task submitted: {task_id}")

    # Step 2: Poll
    for i in range(1, args.max_retries + 1):
        time.sleep(args.poll_seconds)
        poll = _json_request(f"{API_BASE}/tasks/{task_id}?type=image", api_key=api_key, method="GET")
        data = poll.get("data") or {}
        state = data.get("state", "")
        if args.verbose:
            print(f"[{i}/{args.max_retries}] State: {state}")

        if state == "success":
            urls = data.get("generate_urls") or []
            if not urls:
                raise RuntimeError(f"Task succeeded but generate_urls is empty: {poll}")
            image_url = urls[0].get("url") or urls[0]
            ext = _ext_from_url(str(image_url))

            # Step 3: Download
            out_file = os.path.abspath(args.out) if args.out else _default_out_file(ext)
            _download(str(image_url), out_file=out_file)
            if args.verbose:
                print(f"Downloaded to: {out_file}")
            print(f"IMAGE_URL={image_url}")
            print(f"MEDIA:{out_file}")
            return 0

        if state == "fail":
            raise RuntimeError(f"Generation failed. Task: {poll}")

    raise RuntimeError(f"Timed out after {args.max_retries} polls (~{args.max_retries * args.poll_seconds // 60} min). Task ID: {task_id}")


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Exception as e:
        msg = str(e)
        print(f"ERROR:{msg}")          # structured — Agent must read this
        print(f"Error: {msg}", file=sys.stderr)
        raise SystemExit(1)
```
