# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MimiClaw is a cross-platform **Electron desktop app** (React 19 + Vite + TypeScript) providing a GUI for the OpenClaw AI agent runtime. It uses pnpm as its package manager (pinned version in `package.json`'s `packageManager` field).

## Commands

| Task | Command |
|------|---------|
| Install deps + download uv | `pnpm run init` |
| Dev server (Vite + Electron) | `pnpm dev` |
| Lint (ESLint, auto-fix) | `pnpm run lint` |
| Type check | `pnpm run typecheck` |
| Unit tests (Vitest) | `pnpm test` |
| Run single test file | `pnpm test <path/to/test-file>` |
| Build frontend only | `pnpm run build:vite` |
| Full production build | `pnpm build` |
| Comms regression replay | `pnpm run comms:replay` |
| Comms baseline refresh | `pnpm run comms:baseline` |
| Comms regression compare | `pnpm run comms:compare` |

## Architecture

### Dual-Process Model

```
Electron Main Process (electron/main/index.ts)
├── Window lifecycle & system tray
├── Gateway process supervision
├── IPC handler registration
├── Host API Server (port 3210)
└── System integration (keychain, auto-update, OAuth)
                ↓ IPC (authoritative control plane)
React Renderer (src/)
├── Zustand state stores
├── All backend calls via src/lib/host-api.ts + src/lib/api-client.ts
└── Routes: Chat, Setup, Models, Agents, Channels, Skills, Cron, Settings
                ↓ WS → HTTP → IPC fallback
OpenClaw Gateway (port 18789)
├── AI agent runtime orchestration
├── Message channel management
└── Skill/plugin execution
```

### Key Directories

- `electron/main/` — App entry, windows, IPC handlers, system tray, auto-updater
- `electron/gateway/` — Gateway lifecycle management, process supervision, WebSocket client
- `electron/api/` — Host API server on `:3210` that bridges renderer ↔ Main/gateway
- `electron/services/` — Provider sync and OS keychain secrets abstraction
- `electron/preload/` — Secure IPC bridge (context isolation, no node integration in renderer)
- `src/lib/` — Renderer API layer; all backend calls go through `host-api.ts` / `api-client.ts`
- `src/stores/` — Zustand stores (chat, gateway, settings, providers, agents, channels, skills, cron)
- `src/pages/` — Page-level React components (Chat, Setup, Models, Agents, Channels, Skills, Cron, Settings)
- `src/components/ui/` — shadcn/ui + Radix UI wrappers with Tailwind styling
- `tests/unit/` — Vitest unit tests

### Renderer/Main API Boundary (Critical)

- Renderer must use `src/lib/host-api.ts` and `src/lib/api-client.ts` as the **sole** entry point for all backend calls.
- Do **not** add direct `window.electron.ipcRenderer.invoke(...)` calls in pages/components—expose them through host-api/api-client instead.
- Do **not** call Gateway HTTP endpoints directly from the renderer (`fetch('http://127.0.0.1:18789/...')`). Use Main-process proxy channels (`hostapi:fetch`, `gateway:httpProxy`) to avoid CORS/env drift.
- Transport policy is Main-owned and fixed as `WS → HTTP → IPC fallback`; the renderer must not implement protocol-switching logic.

## Non-Obvious Caveats

- **pnpm version**: Pinned via `packageManager` in `package.json`. Run `corepack enable && corepack prepare` to activate it before installing.
- **`pnpm run init`**: Convenience script that runs `pnpm install` followed by `pnpm run uv:download`. Either use this or run the two steps separately.
- **Gateway startup**: When running `pnpm dev`, the OpenClaw Gateway starts automatically on port 18789. It takes ~10–30 seconds to become ready. UI development works fine without it (shows "connecting" state).
- **Electron on headless Linux**: `dbus` errors (`Failed to connect to the bus`) are expected and harmless. The app runs fine with `$DISPLAY` set (e.g., `:1` via Xvfb).
- **`pnpm run lint` race condition**: If `pnpm run uv:download` was recently run, ESLint may fail with `ENOENT: no such file or directory, scandir '.../temp_uv_extract'`. Simply re-run lint after the download finishes.
- **Build script warnings**: `pnpm install` may warn about ignored build scripts for `@discordjs/opus` and `koffi`. These are optional and safe to ignore.
- **Token usage history**: The Models page reads OpenClaw session transcript `.jsonl` files from the local OpenClaw config directory. It does not parse console logs. It handles normal, `.deleted.jsonl`, and `.jsonl.reset.*` transcripts.
- **Models page aggregation**: The 7-day/30-day filters are rolling windows, not calendar-month buckets. Chart bucketing keeps all days in the window; only model grouping is capped to top entries.
- **OpenClaw Doctor**: Exposed via Settings > Advanced > Developer through the host-api routes. Renderer code must call the host route, not spawn CLI processes directly.
- **No database**: The app uses `electron-store` (JSON files) and the OS keychain. No DB setup needed.

## Communication Changes

If your change touches communication paths (gateway events, runtime send/receive, delivery, or fallback), run `pnpm run comms:replay` and `pnpm run comms:compare` before pushing.

## Documentation Sync

After any functional or architecture change, review `README.md`, `README.zh-CN.md`, and `README.ja-JP.md`. If behavior, flows, or interfaces changed, update all three in the same PR/commit.
