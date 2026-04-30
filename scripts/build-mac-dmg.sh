#!/usr/bin/env bash
# build-mac-dmg.sh — produce verified macOS DMGs from electron-builder unpacked output.
#
# Background: electron-builder 26.x's own DMG/ZIP target creation silently drops
# `Versions/A/Electron Framework` (~185MB) even though the source unpacked .app
# at release/mac*/ is fully intact. This script bypasses that broken step by
# using macOS's built-in `hdiutil` against a `ditto`-staged copy of the unpacked
# .app — which we have verified preserves the framework binary correctly.
#
# Usage:
#   ./scripts/build-mac-dmg.sh           # rebuild DMGs for whatever .app(s) are in release/
#   ./scripts/build-mac-dmg.sh --tarball # also output tar.gz alongside
#
# Output: release/jizhi-${VERSION}-mac-${ARCH}.dmg (+ .sha256, optionally .tar.gz)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WANT_TARBALL=0
for arg in "$@"; do
  case "$arg" in
    --tarball|-t) WANT_TARBALL=1 ;;
  esac
done

VERSION=$(node -p "require('./package.json').version")

# Detect product filename from whatever electron-builder produced.
FIRST_APP=$(find release -maxdepth 2 -type d -name "*.app" 2>/dev/null | head -1)
if [ -z "$FIRST_APP" ]; then
  echo "❌ No .app found under release/. Run electron-builder first:"
  echo "   pnpm run package:prod && pnpm exec electron-builder --mac --x64 --publish never"
  exit 1
fi
PRODUCT_FILE_NAME=$(basename "$FIRST_APP" .app)
echo "Product: $PRODUCT_FILE_NAME (version $VERSION)"

# Drop any DMG/ZIP electron-builder produced — they're broken (missing framework
# binary). We rebuild fresh.
for f in release/*.dmg release/*.dmg.blockmap release/*.zip; do
  [ -f "$f" ] && rm -f "$f" && echo "Removed broken: $f"
done
true

REBUILT=0
while IFS= read -r APP_DIR; do
  APP_BIN=$(find "$APP_DIR/Contents/MacOS" -maxdepth 1 -type f | head -1)
  [ -n "$APP_BIN" ] || { echo "Skipping (no main bin): $APP_DIR"; continue; }

  case "$(file -b "$APP_BIN")" in
    *x86_64*) ARCH=x64 ;;
    *arm64*)  ARCH=arm64 ;;
    *universal*) ARCH=universal ;;
    *) echo "Skipping unknown arch: $APP_DIR"; continue ;;
  esac

  FW_BIN="$APP_DIR/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework"
  if [ ! -f "$FW_BIN" ] || [ "$(stat -f%z "$FW_BIN")" -lt $((50*1024*1024)) ]; then
    echo "❌ Source $APP_DIR has missing/short Electron Framework binary; cannot build a working DMG."
    echo "   Re-run electron-builder with a clean electron cache:"
    echo "   rm -rf ~/Library/Caches/electron release/"
    exit 1
  fi

  DMG_OUT="release/jizhi-${VERSION}-mac-${ARCH}.dmg"

  STAGING=$(mktemp -d)
  trap "rm -rf '$STAGING'" EXIT
  ditto "$APP_DIR" "$STAGING/${PRODUCT_FILE_NAME}.app"
  ln -s /Applications "$STAGING/Applications"

  VOLNAME="${PRODUCT_FILE_NAME} ${VERSION}"
  echo "→ Building $DMG_OUT (${ARCH}, vol: $VOLNAME)"
  hdiutil create \
    -volname "$VOLNAME" \
    -srcfolder "$STAGING" \
    -ov \
    -format UDZO \
    -fs HFS+ \
    "$DMG_OUT" >/dev/null

  rm -rf "$STAGING"
  trap - EXIT

  # Mount-and-verify the freshly-built DMG.
  MNT=$(mktemp -d)
  hdiutil attach -nobrowse -readonly -mountpoint "$MNT" "$DMG_OUT" >/dev/null
  VERIFY_BIN="$MNT/${PRODUCT_FILE_NAME}.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework"
  if [ ! -f "$VERIFY_BIN" ] || [ "$(stat -f%z "$VERIFY_BIN")" -lt $((50*1024*1024)) ]; then
    hdiutil detach "$MNT" -force >/dev/null 2>&1 || true
    rmdir "$MNT" 2>/dev/null || true
    echo "❌ Built DMG $DMG_OUT failed verification."
    exit 1
  fi
  VERIFY_SZ=$(stat -f%z "$VERIFY_BIN")
  echo "   ✅ verified: framework $((VERIFY_SZ/1024/1024))MB"
  hdiutil detach "$MNT" -force >/dev/null 2>&1 || true
  rmdir "$MNT" 2>/dev/null || true

  shasum -a 256 "$DMG_OUT" | awk '{print $1}' > "${DMG_OUT}.sha256"
  ls -lh "$DMG_OUT"

  if [ "$WANT_TARBALL" = "1" ]; then
    TAR_OUT="release/jizhi-${VERSION}-mac-${ARCH}.tar.gz"
    APP_NAME=$(basename "$APP_DIR")
    echo "→ Also packaging $TAR_OUT"
    ( cd "$(dirname "$APP_DIR")" && tar -czf "$ROOT/$TAR_OUT" "$APP_NAME" )
    shasum -a 256 "$TAR_OUT" | awk '{print $1}' > "${TAR_OUT}.sha256"
    ls -lh "$TAR_OUT"
  fi

  REBUILT=$((REBUILT + 1))
done < <(find release -maxdepth 2 -type d -name "*.app" | sort)

if [ "$REBUILT" -lt 1 ]; then
  echo "❌ No DMG was rebuilt — no valid .app sources found."
  exit 1
fi

echo ""
echo "✅ Done — rebuilt $REBUILT DMG(s):"
ls -lh release/*.dmg 2>/dev/null
[ "$WANT_TARBALL" = "1" ] && ls -lh release/*.tar.gz 2>/dev/null || true
