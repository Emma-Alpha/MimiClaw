/**
 * Per-workspace config storage.
 * Configs are stored as JSON files under data/configs/<workspaceId>.json
 */

import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { requireAuth } from './auth.js';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const CONFIGS_DIR = path.join(DATA_DIR, 'configs');

function ensureConfigsDir(): void {
  if (!fs.existsSync(CONFIGS_DIR)) {
    fs.mkdirSync(CONFIGS_DIR, { recursive: true });
  }
}

function configPath(workspaceId: string): string {
  return path.join(CONFIGS_DIR, `${workspaceId}.json`);
}

function readConfig(workspaceId: string): Record<string, unknown> {
  ensureConfigsDir();
  const p = configPath(workspaceId);
  if (!fs.existsSync(p)) return defaultConfig();
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown>;
  } catch {
    return defaultConfig();
  }
}

function writeConfig(workspaceId: string, cfg: Record<string, unknown>): void {
  ensureConfigsDir();
  fs.writeFileSync(configPath(workspaceId), JSON.stringify(cfg, null, 2), 'utf-8');
}

/** Minimal valid config template */
function defaultConfig(): Record<string, unknown> {
  return {
    version: 1,
    channels: {},
    plugins: {
      allow: [],
      entries: {},
    },
    env: {},
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export const configRouter = new Hono();

/** GET /api/config — get the full config for this workspace */
configRouter.get('/', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  const cfg = readConfig(claims.workspaceId);
  return c.json(cfg);
});

/** PUT /api/config — replace the full config */
configRouter.put('/', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch {
    return c.json({ error: '无效的 JSON' }, 400);
  }

  writeConfig(claims.workspaceId, body);
  return c.json({ ok: true });
});

/** PATCH /api/config — shallow-merge fields into config */
configRouter.patch('/', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  let patch: Record<string, unknown>;
  try {
    patch = await c.req.json<Record<string, unknown>>();
  } catch {
    return c.json({ error: '无效的 JSON' }, 400);
  }

  const current = readConfig(claims.workspaceId);
  const merged = { ...current, ...patch };
  writeConfig(claims.workspaceId, merged);
  return c.json({ ok: true, config: merged });
});

/** DELETE /api/config — reset to default template */
configRouter.delete('/', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  writeConfig(claims.workspaceId, defaultConfig());
  return c.json({ ok: true });
});
