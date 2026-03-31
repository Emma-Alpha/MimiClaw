---
name: cloudclaw-migration-design
description: Design for migrating ClawX from local OpenClaw control to a pure cloud-managed control plane.
type: project
---

# CloudClaw Migration Design

## Goal

Convert the current local-first ClawX/OpenClaw setup into a **pure cloud-controlled system**:

- The Electron app becomes a thin client.
- All OpenClaw configuration moves to the cloud.
- Each user gets an isolated gateway/runtime instance.
- The app starts with login, then onboarding, then normal usage.
- Existing local `openclaw.json` write paths are retired instead of being preserved as the source of truth.

## Scope

### In scope

- Cloud authentication with an initial hardcoded `admin/admin` login for MVP.
- A cloud workspace model with **one isolated OpenClaw instance per user**.
- Cloud storage and mutation of OpenClaw configuration.
- Cloud-managed gateway lifecycle: create, start, stop, restart, health.
- Electron renderer updates to use cloud APIs for setup and all configuration changes.
- Gradual retirement of local config writers in the current Electron app.

### Out of scope for the first phase

- Migrating existing local `openclaw.json` into the cloud.
- Multi-tenant shared gateway instances.
- Advanced user management beyond the initial `admin/admin` bootstrap.
- Offline-first behavior.

## Target Architecture

### Client

The Electron app should only:

- authenticate the user,
- show onboarding/setup,
- render state from cloud APIs,
- submit user actions to cloud APIs.

It should not:

- directly mutate `~/.openclaw/openclaw.json`,
- own gateway lifecycle,
- decide where config is stored,
- act as the source of truth for OpenClaw state.

### Cloud control plane

The cloud backend becomes the authoritative system for:

- auth/session handling,
- workspace isolation,
- OpenClaw config storage,
- gateway lifecycle management,
- config synchronization to the runtime instance.

### Per-user runtime

Each user gets one isolated runtime instance. The cloud backend is responsible for provisioning and managing that instance and for pushing config updates into it.

## Main Data Flow

```text
Electron UI
  -> Cloud API
     -> Auth
     -> Workspace / User state
     -> Config store
     -> Gateway manager
     -> User-specific OpenClaw runtime
```

## Proposed Backend Modules

### 1. Auth module

Responsibilities:

- accept `admin/admin` for MVP,
- issue session/token for the client,
- expose auth status and logout.

This should be implemented so the credential model can be replaced later without redesigning the app.

### 2. Workspace module

Responsibilities:

- represent one user-owned space,
- bind the user to one gateway/runtime,
- store workspace-level metadata and status.

### 3. Gateway manager module

Responsibilities:

- create and initialize a user runtime,
- start/stop/restart it,
- report health and status,
- isolate one runtime per user.

### 4. Config module

Responsibilities:

- own the cloud version of OpenClaw config,
- read and write config,
- keep config authoritative in the cloud,
- expose the current resolved config to the runtime manager.

### 5. Sync worker module

Responsibilities:

- push config changes into the user runtime,
- retry failed syncs,
- surface sync state to the UI.

## Frontend Changes

### Entry flow

The app should move from:

- setup completion only

to:

- login required,
- then onboarding/setup,
- then main app.

### Setup flow

The current first-run setup should become cloud onboarding:

1. log in,
2. create or attach a user workspace,
3. initialize the cloud-managed gateway/runtime,
4. configure cloud OpenClaw state,
5. verify connectivity and enter the main app.

### Settings and feature pages

Pages that currently mutate local or host-owned OpenClaw state must switch to cloud API calls:

- Settings,
- Providers,
- Channels,
- Skills,
- Cron,
- Chat/runtime state.

## Migration Approach

### Phase 1: Cloud auth and bootstrapping

- Add cloud login.
- Add authenticated session state.
- Replace first-run setup gating with cloud onboarding gating.

### Phase 2: Cloud workspace and runtime

- Create per-user workspace records.
- Provision one runtime per user.
- Expose runtime status and health in the UI.

### Phase 3: Cloud config ownership

- Move config read/write to cloud APIs.
- Replace local config writes with remote mutations.
- Make cloud config the only source of truth.

### Phase 4: Feature-page migration

- Move provider/channel/skill/cron operations to the cloud control plane.
- Ensure the renderer only consumes cloud state.

### Phase 5: Retire local writers

- Remove or disable direct `openclaw.json` mutation paths in the Electron app.
- Remove any fallback behavior that treats local config as authoritative.

## MVP Definition

The smallest usable end state is:

- user logs in with `admin/admin`,
- cloud creates a personal workspace,
- cloud creates or attaches a gateway/runtime,
- cloud stores OpenClaw config,
- the Electron client can view and edit that config through the cloud.

## Risks

### 1. Dual source of truth

If local config writes remain active while cloud config is introduced, the system can diverge.

**Mitigation:** retire local writers as early as possible and keep cloud config authoritative from the start.

### 2. Runtime/config inconsistency

A config write may succeed in storage but fail to sync into the runtime.

**Mitigation:** add sync status, retries, and explicit error reporting.

### 3. Overloading the first release

Trying to preserve the full current local behavior in the cloud version would slow delivery and increase risk.

**Mitigation:** keep the first release focused on the minimum closed loop.

### 4. Hardcoded credentials becoming sticky

`admin/admin` is acceptable for bootstrapping but not for a final security model.

**Mitigation:** isolate auth behind a module with a replaceable interface.

## Recommended Implementation Order

1. Define cloud API contracts.
2. Implement auth/session.
3. Add workspace and per-user runtime management.
4. Move config storage and sync to cloud.
5. Switch renderer setup/settings to cloud APIs.
6. Remove local `openclaw.json` mutation paths.

## Success Criteria

The migration is successful when:

- the client cannot reach a meaningful state without cloud auth,
- all OpenClaw state is owned by the cloud,
- one user maps to one isolated runtime,
- no user-facing flow depends on local `openclaw.json` writes,
- the current app remains usable as a UI while the backend becomes the source of truth.
