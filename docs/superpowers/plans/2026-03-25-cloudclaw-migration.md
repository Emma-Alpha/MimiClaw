# CloudClaw Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move MimiClaw from local OpenClaw control to a pure cloud-managed control plane with per-user isolated runtime instances.

**Architecture:** Keep the Electron app as a thin client. Introduce cloud auth, cloud workspace/runtime ownership, and cloud-owned OpenClaw config. Migrate the renderer to call cloud APIs, then retire direct local `openclaw.json` mutation paths in the Electron app.

**Tech Stack:** Electron, React 19, TypeScript, Zustand, Vite, Vitest, existing `host-api`/`api-client` abstraction, cloud HTTP API backend to be added separately.

---

## Execution Order

Implement tasks strictly in this order:

1. Cloud session and API boundary
2. App shell and onboarding gate
3. Settings persistence split
4. Provider writer retirement
5. Channel and skill writer retirement
6. Gateway and IPC ownership cleanup
7. Settings, channels, skills, and cron page migration
8. Agents, models, and chat page migration
9. Docs and final verification

Later tasks depend on earlier ones. Do not start Tasks 2–9 until Task 1 is complete, and do not start Tasks 7–8 until Tasks 2–6 are complete.

---

## File Map

### Client session and API boundary
- Create: `src/lib/cloud-api.ts` — cloud API wrapper and auth/session helpers.
- Modify: `src/lib/host-api.ts` — keep the renderer request funnel, but route cloud-aware requests through the new boundary.
- Modify: `src/lib/api-client.ts` — keep transport routing centralized and add cloud-session awareness where needed.
- Modify: `src/stores/settings.ts` — store auth/bootstrap state separately from local UI preferences.

### App shell and onboarding
- Modify: `src/App.tsx` — gate the app by login/onboarding/cloud bootstrap state.
- Modify: `src/pages/Setup/index.tsx` — convert the first-run wizard into cloud onboarding.
- Modify: `src/components/layout/Sidebar.tsx` — gate navigation until auth/bootstrap are complete.

### Main-process / host API
- Modify: `electron/api/routes/app.ts` — add auth/bootstrap and cloud-aware app endpoints.
- Modify: `electron/api/routes/settings.ts` — stop treating local settings as the authoritative OpenClaw source.
- Modify: `electron/api/routes/gateway.ts` — move gateway status/actions toward cloud-backed ownership.
- Modify: `electron/api/routes/providers.ts`, `electron/api/routes/channels.ts`, `electron/api/routes/skills.ts`, `electron/api/routes/cron.ts` — migrate feature routes to cloud-backed state.
- Modify: `electron/main/ipc-handlers.ts` — remove or redirect handlers that directly mutate local OpenClaw state.

### Local OpenClaw writers / sync helpers
- Modify: `electron/utils/openclaw-auth.ts`
- Modify: `electron/utils/channel-config.ts`
- Modify: `electron/utils/skill-config.ts`
- Modify: `electron/services/providers/provider-runtime-sync.ts`
- Modify: `electron/gateway/config-sync.ts`
- Modify: `electron/utils/store.ts`

### Feature pages
- Modify: `src/pages/Settings/index.tsx`
- Modify: `src/pages/Channels/index.tsx`
- Modify: `src/pages/Skills/index.tsx`
- Modify: `src/pages/Cron/index.tsx`
- Modify: `src/pages/Agents/index.tsx`
- Modify: `src/pages/Models/index.tsx`
- Modify: `src/pages/Chat/index.tsx`

### Tests
- Create or update unit tests under `tests/unit/` for each task.
- Create: `tests/unit/cloud-api.test.ts`
- Create: `tests/unit/setup-page.test.tsx`
- Create: `tests/unit/provider-runtime-sync-cloud.test.ts`
- Create: `tests/unit/channel-skill-cloud.test.ts`
- Create: `tests/unit/gateway-cloud-ownership.test.ts`
- Create: `tests/unit/settings-page.test.tsx`
- Create: `tests/unit/channels-page.test.tsx`
- Create: `tests/unit/skills-page.test.tsx`
- Create: `tests/unit/cron-page.test.tsx`
- Create: `tests/unit/agents-page.test.tsx`
- Create: `tests/unit/models-page.test.tsx`
- Create: `tests/unit/chat-page.test.tsx`
- Update: `tests/unit/app-routes.test.ts`
- Update: `tests/unit/stores.test.ts`
- Update: `tests/unit/api-client.test.ts`
- Update: `tests/unit/host-api.test.ts`
- Update: `tests/unit/openclaw-auth.test.ts`
- Update: `tests/unit/channel-config.test.ts`
- Update: `tests/unit/provider-runtime-sync.test.ts`
- Update: `tests/unit/gateway-manager-heartbeat.test.ts`

---

## Task 1: Define the cloud session and API boundary

**Files:**
- Create: `src/lib/cloud-api.ts`
- Modify: `src/lib/host-api.ts`
- Modify: `src/lib/api-client.ts`
- Modify: `src/stores/settings.ts`
- Create: `tests/unit/cloud-api.test.ts`
- Modify: `tests/unit/api-client.test.ts`
- Modify: `tests/unit/host-api.test.ts`
- Modify: `tests/unit/stores.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that describe the new cloud-session contract:
- cloud API calls should carry auth/session context through a single frontend boundary,
- app state should distinguish login/bootstrap readiness from local UI preferences,
- the client request boundary should remain centralized.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test tests/unit/cloud-api.test.ts tests/unit/api-client.test.ts tests/unit/host-api.test.ts tests/unit/stores.test.ts -v`
Expected: fail until the new session boundary exists.

- [ ] **Step 3: Implement the minimal client boundary**

Add the new cloud API wrapper and the smallest session/auth state needed to make cloud calls explicit. Keep the implementation client-side only; do not add cloud backend logic here.

- [ ] **Step 4: Run the tests**

Run: `pnpm test tests/unit/cloud-api.test.ts tests/unit/api-client.test.ts tests/unit/host-api.test.ts tests/unit/stores.test.ts -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cloud-api.ts src/lib/host-api.ts src/lib/api-client.ts src/stores/settings.ts tests/unit/cloud-api.test.ts tests/unit/api-client.test.ts tests/unit/host-api.test.ts tests/unit/stores.test.ts
git commit -m "feat: add cloud session API boundary"
```

---

## Task 2: Convert the app shell and setup flow to cloud onboarding

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Setup/index.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/ja/common.json`
- Modify: `src/i18n/locales/zh/common.json`
- Create: `tests/unit/setup-page.test.tsx`
- Update: `tests/unit/app-routes.test.ts`

**Prerequisite:** Task 1 must be complete.

- [ ] **Step 1: Write the failing tests**

Add a dedicated setup-page test and an app-route test that assert:
- login is required before the main app,
- setup becomes cloud onboarding,
- sidebar navigation stays gated until onboarding is complete.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test tests/unit/setup-page.test.tsx tests/unit/app-routes.test.ts -v`
Expected: fail while the app still behaves like a local-first wizard.

- [ ] **Step 3: Implement the onboarding gate**

Update the app shell, sidebar, and setup page so the UI flow becomes: login -> cloud onboarding -> main app.

- [ ] **Step 4: Update localized copy**

Refresh the onboarding copy in all three locale files so it matches the cloud-managed flow.

- [ ] **Step 5: Run the tests**

Run: `pnpm test tests/unit/setup-page.test.tsx tests/unit/app-routes.test.ts -v`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/pages/Setup/index.tsx src/components/layout/Sidebar.tsx src/i18n/locales/en/common.json src/i18n/locales/ja/common.json src/i18n/locales/zh/common.json tests/unit/setup-page.test.tsx tests/unit/app-routes.test.ts
git commit -m "feat: move setup flow to cloud onboarding"
```

---

## Task 3: Move settings persistence behind the cloud boundary

**Files:**
- Modify: `src/stores/settings.ts`
- Modify: `electron/api/routes/settings.ts`
- Modify: `electron/utils/store.ts`
- Modify: `tests/unit/stores.test.ts`

**Prerequisite:** Task 1 must be complete.

- [ ] **Step 1: Write the failing tests**

Add tests that prove only UI/session preferences stay local while OpenClaw-affecting settings are routed through the cloud boundary.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test tests/unit/stores.test.ts -v`
Expected: fail until settings clearly separate local UI state from cloud-owned state.

- [ ] **Step 3: Implement the split**

Keep local persistence for pure UI preferences only. Route cloud-owned settings through the cloud API wrapper introduced in Task 1.

- [ ] **Step 4: Run the tests**

Run: `pnpm test tests/unit/stores.test.ts -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/stores/settings.ts electron/api/routes/settings.ts electron/utils/store.ts tests/unit/stores.test.ts
git commit -m "refactor: separate local preferences from cloud settings"
```

---

## Task 4: Retire provider runtime sync from local writes

**Files:**
- Modify: `electron/services/providers/provider-runtime-sync.ts`
- Modify: `electron/api/routes/providers.ts`
- Modify: `tests/unit/provider-runtime-sync.test.ts`
- Create: `tests/unit/provider-runtime-sync-cloud.test.ts`

**Prerequisite:** Tasks 1 and 3 must be complete.

- [ ] **Step 1: Write the failing tests**

Add tests that expose the remaining direct `openclaw.json` mutation behavior in the provider runtime sync path.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test tests/unit/provider-runtime-sync.test.ts tests/unit/provider-runtime-sync-cloud.test.ts -v`
Expected: fail while local config mutation is still the implementation.

- [ ] **Step 3: Replace local writes with cloud-backed operations**

Keep the provider route surface, but move the implementation to the cloud-owned model. Remove direct `openclaw.json` writes once the cloud path exists.

- [ ] **Step 4: Run the tests**

Run: `pnpm test tests/unit/provider-runtime-sync.test.ts tests/unit/provider-runtime-sync-cloud.test.ts -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add electron/services/providers/provider-runtime-sync.ts electron/api/routes/providers.ts tests/unit/provider-runtime-sync.test.ts tests/unit/provider-runtime-sync-cloud.test.ts
git commit -m "refactor: move provider runtime sync to cloud"
```

---

## Task 5: Retire channel and skill local writers

**Files:**
- Modify: `electron/utils/openclaw-auth.ts`
- Modify: `electron/utils/channel-config.ts`
- Modify: `electron/utils/skill-config.ts`
- Modify: `electron/api/routes/channels.ts`
- Modify: `electron/api/routes/skills.ts`
- Modify: `tests/unit/openclaw-auth.test.ts`
- Modify: `tests/unit/channel-config.test.ts`
- Create: `tests/unit/channel-skill-cloud.test.ts`

**Prerequisite:** Tasks 1 and 3 must be complete.

- [ ] **Step 1: Write the failing tests**

Add tests that expose the remaining direct `openclaw.json` mutation behavior for channel and skill paths.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test tests/unit/openclaw-auth.test.ts tests/unit/channel-config.test.ts tests/unit/channel-skill-cloud.test.ts -v`
Expected: fail while local config mutation is still the implementation.

- [ ] **Step 3: Replace local writes with cloud-backed operations**

Move the channel and skill route surfaces to the cloud-owned model and remove direct config writes.

- [ ] **Step 4: Run the tests**

Run: `pnpm test tests/unit/openclaw-auth.test.ts tests/unit/channel-config.test.ts tests/unit/channel-skill-cloud.test.ts -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add electron/utils/openclaw-auth.ts electron/utils/channel-config.ts electron/utils/skill-config.ts electron/api/routes/channels.ts electron/api/routes/skills.ts tests/unit/openclaw-auth.test.ts tests/unit/channel-config.test.ts tests/unit/channel-skill-cloud.test.ts
git commit -m "refactor: move channel and skill writers to cloud"
```

---

## Task 6: Remove gateway and IPC assumptions about local ownership

**Files:**
- Modify: `electron/gateway/config-sync.ts`
- Modify: `electron/main/ipc-handlers.ts`
- Modify: `electron/api/routes/app.ts`
- Modify: `electron/api/routes/gateway.ts`
- Modify: `tests/unit/gateway-manager-heartbeat.test.ts`
- Update: `tests/unit/app-routes.test.ts`
- Create: `tests/unit/gateway-cloud-ownership.test.ts`

**Prerequisite:** Tasks 1, 3, 4, and 5 must be complete.

- [ ] **Step 1: Write the failing tests**

Add tests that verify the app no longer assumes a local gateway is the authoritative source of truth.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test tests/unit/gateway-manager-heartbeat.test.ts tests/unit/app-routes.test.ts tests/unit/gateway-cloud-ownership.test.ts -v`
Expected: fail while the app still treats the local gateway as authoritative.

- [ ] **Step 3: Remove the local-ownership assumptions**

Update IPC and gateway routes so they reflect cloud ownership and do not synchronize directly to local OpenClaw config.

- [ ] **Step 4: Run the tests**

Run: `pnpm test tests/unit/gateway-manager-heartbeat.test.ts tests/unit/app-routes.test.ts tests/unit/gateway-cloud-ownership.test.ts -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add electron/gateway/config-sync.ts electron/main/ipc-handlers.ts electron/api/routes/app.ts electron/api/routes/gateway.ts tests/unit/gateway-manager-heartbeat.test.ts tests/unit/app-routes.test.ts tests/unit/gateway-cloud-ownership.test.ts
git commit -m "refactor: remove local gateway ownership assumptions"
```

---

## Task 7: Migrate settings, channels, skills, and cron pages to cloud state

**Files:**
- Modify: `src/pages/Settings/index.tsx`
- Modify: `src/pages/Channels/index.tsx`
- Modify: `src/pages/Skills/index.tsx`
- Modify: `src/pages/Cron/index.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Create: `tests/unit/settings-page.test.tsx`
- Create: `tests/unit/channels-page.test.tsx`
- Create: `tests/unit/skills-page.test.tsx`
- Create: `tests/unit/cron-page.test.tsx`

**Prerequisite:** Tasks 2, 3, 4, 5, and 6 must be complete.

- [ ] **Step 1: Write the failing tests**

Add page-level tests for each affected surface, focusing on whether the page reads from and writes to the cloud boundary rather than local OpenClaw state.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test tests/unit/settings-page.test.tsx tests/unit/channels-page.test.tsx tests/unit/skills-page.test.tsx tests/unit/cron-page.test.tsx -v`
Expected: fail until the pages are wired to cloud state.

- [ ] **Step 3: Migrate the pages one cluster at a time**

Update settings/channels/skills/cron first, keeping the view layer thin and side-effect-free.

- [ ] **Step 4: Run the tests**

Run: `pnpm test tests/unit/settings-page.test.tsx tests/unit/channels-page.test.tsx tests/unit/skills-page.test.tsx tests/unit/cron-page.test.tsx -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings/index.tsx src/pages/Channels/index.tsx src/pages/Skills/index.tsx src/pages/Cron/index.tsx src/components/layout/Sidebar.tsx tests/unit/settings-page.test.tsx tests/unit/channels-page.test.tsx tests/unit/skills-page.test.tsx tests/unit/cron-page.test.tsx
git commit -m "feat: move settings and automation pages onto cloud state"
```

---

## Task 8: Migrate agents, models, and chat pages to cloud state

**Files:**
- Modify: `src/pages/Agents/index.tsx`
- Modify: `src/pages/Models/index.tsx`
- Modify: `src/pages/Chat/index.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Create: `tests/unit/agents-page.test.tsx`
- Create: `tests/unit/models-page.test.tsx`
- Create: `tests/unit/chat-page.test.tsx`

**Prerequisite:** Tasks 2, 3, 4, 5, and 6 must be complete.

- [ ] **Step 1: Write the failing tests**

Add page-level tests for each remaining surface, focusing on cloud-backed state reads and writes.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test tests/unit/agents-page.test.tsx tests/unit/models-page.test.tsx tests/unit/chat-page.test.tsx -v`
Expected: fail until the pages are wired to cloud state.

- [ ] **Step 3: Migrate the pages**

Update agents/models/chat to use the cloud boundary and keep the sidebar/navigation behavior consistent with cloud onboarding.

- [ ] **Step 4: Run the tests**

Run: `pnpm test tests/unit/agents-page.test.tsx tests/unit/models-page.test.tsx tests/unit/chat-page.test.tsx -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Agents/index.tsx src/pages/Models/index.tsx src/pages/Chat/index.tsx src/components/layout/Sidebar.tsx tests/unit/agents-page.test.tsx tests/unit/models-page.test.tsx tests/unit/chat-page.test.tsx
git commit -m "feat: move agent, model, and chat pages onto cloud state"
```

---

## Task 9: Sync docs and finish verification

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `README.ja-JP.md`

**Prerequisite:** Tasks 1–8 must be complete.

- [ ] **Step 1: Update the docs**

Rewrite the user-facing architecture and setup description so they match the cloud-managed model.

- [ ] **Step 2: Run verification**

Run: `pnpm test -v && pnpm run typecheck && pnpm run lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add README.md README.zh-CN.md README.ja-JP.md
git commit -m "docs: describe cloud-managed MimiClaw flow"
```

---

## Final Verification

- [ ] Run `pnpm test -v`
- [ ] Run `pnpm run typecheck`
- [ ] Run `pnpm run lint`
- [ ] Review the implementation for any remaining direct local OpenClaw control paths

## Notes

- Keep each task self-contained and commit after each milestone.
- Do not add a cloud backend implementation in this repo unless the backend is explicitly part of the current task.
- Remove local control paths instead of layering on compatibility shims when the cloud path is ready.
