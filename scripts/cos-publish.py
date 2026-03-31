#!/usr/bin/env python3
"""
cos-publish.py
Write a lightweight version manifest JSON to COS.

The .asar assets stay on GitHub Releases (direct download links, no API rate limit).
This script only uploads the tiny manifest so clients can discover updates
without calling the GitHub API (which hits 403 in mainland China).

Required env vars:
  COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION, COS_PREFIX
  VERSION  – semver string, e.g. 0.2.12-beta.38
  CHANNEL  – latest | beta | alpha
"""
import os
import sys
import json
import glob
import datetime

try:
    from qcloud_cos import CosConfig, CosS3Client
except ImportError:
    print("ERROR: cos-python-sdk-v5 not installed.", file=sys.stderr)
    sys.exit(1)

bucket  = os.environ["COS_BUCKET"]
region  = os.environ["COS_REGION"]
prefix  = os.environ["COS_PREFIX"]
version = os.environ["VERSION"]
channel = os.environ["CHANNEL"]
gh_tag  = f"v{version}"
# Direct download URL — not an API call, no rate limit, works for public repos
gh_base = f"https://github.com/Emma-Alpha/MimiClaw/releases/download/{gh_tag}"

# Read local .asar files only to record their sizes; actual hosting stays on GitHub
files_entry: dict = {}
for asar in sorted(glob.glob("release/*-darwin-*.asar")):
    fname = os.path.basename(asar)
    arch  = fname.replace(".asar", "").split("-")[-1]
    files_entry[arch] = {
        "name":      fname,
        "url":       f"{gh_base}/{fname}",
        "size":      os.path.getsize(asar),
        "sha256Url": f"{gh_base}/{fname}.sha256",
    }

if not files_entry:
    print("ERROR: No darwin .asar files found in release/", file=sys.stderr)
    sys.exit(1)

manifest = {
    "version":      version,
    "releaseDate":  datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "releaseNotes": None,
    "releaseUrl":   f"https://github.com/Emma-Alpha/MimiClaw/releases/tag/{gh_tag}",
    "files":        files_entry,
}
print(json.dumps(manifest, indent=2))

# Upload ONLY the manifest JSON (~500 bytes) to COS
config = CosConfig(Region=region, SecretId=os.environ["COS_SECRET_ID"], SecretKey=os.environ["COS_SECRET_KEY"])
client = CosS3Client(config)

manifest_path = "/tmp/cos-manifest.json"
with open(manifest_path, "w") as fp:
    json.dump(manifest, fp, indent=2)

key = f"{prefix}/channels/{channel}.json"
print(f"Uploading manifest ({len(json.dumps(manifest))} bytes) → cos://{bucket}/{key}")
client.upload_file(Bucket=bucket, LocalFilePath=manifest_path, Key=key, ContentType="application/json")
print("Done — COS manifest updated. Assets stay on GitHub Release CDN.")
