/**
 * Gateway manager — spawns and supervises per-user gateway processes.
 *
 * Each workspace gets its own gateway instance on a unique port.
 * Port range: 19000–19999, assigned round-robin from the pool.
 *
 * Process lifecycle:
 *   start  → spawn gateway serve → wait for /health → update workspace state
 *   stop   → SIGTERM the process → update workspace state
 *   restart → stop + start
 */

import { Hono } from 'hono';
import { spawn, type ChildProcess } from 'node:child_process';
import { readStore, updateStore } from './store.js';
import { requireAuth } from './auth.js';

// ─── In-memory process registry ─────────────────────────────────────────────

interface GatewayProcess {
  workspaceId: string;
  port: number;
  proc: ChildProcess;
}

const processes = new Map<string, GatewayProcess>();

const PORT_BASE = 19000;
const PORT_MAX = 19999;

function allocatePort(): number {
  const used = new Set([...processes.values()].map((p) => p.port));
  for (let p = PORT_BASE; p <= PORT_MAX; p++) {
    if (!used.has(p)) return p;
  }
  throw new Error('端口资源耗尽');
}

// ─── Process lifecycle helpers ───────────────────────────────────────────────

const GATEWAY_BIN = process.env.GATEWAY_BIN ?? 'gateway';
const GATEWAY_SERVE_ARGS = (port: number) =>
  (process.env.GATEWAY_SERVE_ARGS ?? `serve --port {port}`)
    .replace('{port}', String(port))
    .split(' ');

async function waitForHealth(port: number, timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export async function startGateway(workspaceId: string): Promise<void> {
  if (processes.has(workspaceId)) return; // already running

  const port = allocatePort();

  updateStore((data) => {
    const ws = data.workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      ws.gatewayState = 'starting';
      ws.gatewayPort = port;
      ws.gatewayError = null;
      ws.updatedAt = new Date().toISOString();
    }
  });

  const args = GATEWAY_SERVE_ARGS(port);
  const proc = spawn(GATEWAY_BIN, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WORKSPACE_ID: workspaceId },
  });

  console.info(`[gateway] Starting workspace=${workspaceId} port=${port} pid=${proc.pid}`);

  proc.stdout?.on('data', (d: Buffer) =>
    console.info(`[gateway:${workspaceId}] ${d.toString().trim()}`),
  );
  proc.stderr?.on('data', (d: Buffer) =>
    console.error(`[gateway:${workspaceId}] ${d.toString().trim()}`),
  );

  proc.on('exit', (code) => {
    console.warn(`[gateway] workspace=${workspaceId} exited code=${code}`);
    processes.delete(workspaceId);
    updateStore((data) => {
      const ws = data.workspaces.find((w) => w.id === workspaceId);
      if (ws) {
        ws.gatewayState = code === 0 ? 'stopped' : 'error';
        ws.gatewayPid = null;
        ws.gatewayWsUrl = null;
        ws.gatewayError = code !== 0 ? `进程退出，退出码：${code}` : null;
        ws.updatedAt = new Date().toISOString();
      }
    });
  });

  processes.set(workspaceId, { workspaceId, port, proc });

  const ready = await waitForHealth(port);
  if (!ready) {
    proc.kill('SIGTERM');
    processes.delete(workspaceId);
    updateStore((data) => {
      const ws = data.workspaces.find((w) => w.id === workspaceId);
      if (ws) {
        ws.gatewayState = 'error';
        ws.gatewayPid = null;
        ws.gatewayWsUrl = null;
        ws.gatewayError = '网关健康检查超时，启动失败';
        ws.updatedAt = new Date().toISOString();
      }
    });
    throw new Error('网关启动超时');
  }

  const wsUrl = `ws://127.0.0.1:${port}/ws`;
  updateStore((data) => {
    const ws = data.workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      ws.gatewayState = 'running';
      ws.gatewayPid = proc.pid ?? null;
      ws.gatewayWsUrl = wsUrl;
      ws.gatewayError = null;
      ws.updatedAt = new Date().toISOString();
    }
  });

  console.info(`[gateway] workspace=${workspaceId} running at ${wsUrl}`);
}

export function stopGateway(workspaceId: string): void {
  const entry = processes.get(workspaceId);
  if (!entry) return;

  entry.proc.kill('SIGTERM');
  processes.delete(workspaceId);

  updateStore((data) => {
    const ws = data.workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      ws.gatewayState = 'stopped';
      ws.gatewayPid = null;
      ws.gatewayWsUrl = null;
      ws.gatewayError = null;
      ws.updatedAt = new Date().toISOString();
    }
  });

  console.info(`[gateway] workspace=${workspaceId} stopped`);
}

export async function restartGateway(workspaceId: string): Promise<void> {
  stopGateway(workspaceId);
  await startGateway(workspaceId);
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export const gatewayRouter = new Hono();

/** GET /api/gateway/status */
gatewayRouter.get('/status', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  const store = readStore();
  const ws = store.workspaces.find((w) => w.id === claims.workspaceId);
  if (!ws) return c.json({ error: '工作区不存在' }, 404);

  return c.json({
    workspaceId: ws.id,
    gatewayState: ws.gatewayState,
    gatewayWsUrl: ws.gatewayWsUrl,
    gatewayPort: ws.gatewayPort,
    gatewayPid: ws.gatewayPid,
    gatewayError: ws.gatewayError,
  });
});

/** POST /api/gateway/start */
gatewayRouter.post('/start', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  try {
    await startGateway(claims.workspaceId);
    const store = readStore();
    const ws = store.workspaces.find((w) => w.id === claims.workspaceId)!;
    return c.json({ ok: true, gatewayWsUrl: ws.gatewayWsUrl, gatewayPort: ws.gatewayPort });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

/** POST /api/gateway/stop */
gatewayRouter.post('/stop', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  stopGateway(claims.workspaceId);
  return c.json({ ok: true });
});

/** POST /api/gateway/restart */
gatewayRouter.post('/restart', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  try {
    await restartGateway(claims.workspaceId);
    const store = readStore();
    const ws = store.workspaces.find((w) => w.id === claims.workspaceId)!;
    return c.json({ ok: true, gatewayWsUrl: ws.gatewayWsUrl });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
