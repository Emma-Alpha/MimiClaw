#!/usr/bin/env python3
"""
cos-publish.py
Upload macOS .asar + .sha256 update assets to COS and write the channel manifest.

Required env vars:
  COS_SECRET_ID   – Tencent Cloud SecretId
  COS_SECRET_KEY  – Tencent Cloud SecretKey
  COS_BUCKET      – e.g. cobot-1254397474
  COS_REGION      – e.g. ap-guangzhou
  COS_PREFIX      – e.g. jizhi/updates
  VERSION         – semver string, e.g. 0.2.12-beta.36
  CHANNEL         – latest | beta | alpha
"""
import os
import sys
import json
import glob
import datetime

try:
    from qcloud_cos import CosConfig, CosS3Client
except ImportError:
    print("ERROR: cos-python-sdk-v5 not installed. Run: pip3 install cos-python-sdk-v5", file=sys.stderr)
    sys.exit(1)

secret_id  = os.environ["COS_SECRET_ID"]
secret_key = os.environ["COS_SECRET_KEY"]
bucket     = os.environ["COS_BUCKET"]
region     = os.environ["COS_REGION"]
prefix     = os.environ["COS_PREFIX"]
version    = os.environ["VERSION"]
channel    = os.environ["CHANNEL"]
base_url   = f"https://{bucket}.cos.{region}.myqcloud.com/{prefix}"

config = CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key)
client = CosS3Client(config)

# ── 1. Upload .asar and .sha256 under {version}/ ──────────────────────────────
uploaded = []
for pattern in ["release/*.asar", "release/*.sha256"]:
    for f in sorted(glob.glob(pattern)):
        key = f"{prefix}/{version}/{os.path.basename(f)}"
        print(f"Uploading {f}  →  cos://{bucket}/{key}")
        client.upload_file(Bucket=bucket, LocalFilePath=f, Key=key)
        uploaded.append(os.path.basename(f))

if not uploaded:
    print("ERROR: No .asar or .sha256 files found in release/", file=sys.stderr)
    sys.exit(1)

print(f"Uploaded {len(uploaded)} file(s).")

# ── 2. Build channel manifest from darwin .asar files ────────────────────────
files_entry: dict = {}
for asar in sorted(glob.glob("release/*-darwin-*.asar")):
    fname = os.path.basename(asar)
    arch  = fname.replace(".asar", "").split("-")[-1]
    files_entry[arch] = {
        "name":      fname,
        "url":       f"{base_url}/{version}/{fname}",
        "size":      os.path.getsize(asar),
        "sha256Url": f"{base_url}/{version}/{fname}.sha256",
    }

if not files_entry:
    print("ERROR: No darwin .asar files found; cannot generate manifest.", file=sys.stderr)
    sys.exit(1)

manifest = {
    "version":      version,
    "releaseDate":  datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "releaseNotes": None,
    "releaseUrl":   f"https://github.com/Emma-Alpha/MimiClaw/releases/tag/v{version}",
    "files":        files_entry,
}
print(json.dumps(manifest, indent=2))

# ── 3. Upload manifest to channels/{channel}.json ────────────────────────────
manifest_path = "/tmp/cos-manifest.json"
with open(manifest_path, "w") as fp:
    json.dump(manifest, fp, indent=2)

key = f"{prefix}/channels/{channel}.json"
print(f"Uploading manifest  →  cos://{bucket}/{key}")
client.upload_file(
    Bucket=bucket,
    LocalFilePath=manifest_path,
    Key=key,
    ContentType="application/json",
)
print("Done — COS manifest updated.")
