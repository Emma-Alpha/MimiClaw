import { Hono } from 'hono';
import { requireAuth } from './auth.js';
import { readStore, updateStore } from './store.js';
import type { WorkspaceStatusResponse } from './types.js';

export const workspaceRouter = new Hono();

/** GET /api/workspace/status */
workspaceRouter.get('/status', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  const store = readStore();
  const ws = store.workspaces.find((w) => w.id === claims.workspaceId);

  if (!ws) {
    return c.json({ error: '工作区不存在' }, 404);
  }

  const resp: WorkspaceStatusResponse = {
    workspaceId: ws.id,
    userId: ws.userId,
    gatewayState: ws.gatewayState,
    gatewayWsUrl: ws.gatewayWsUrl,
    gatewayPort: ws.gatewayPort,
    gatewayError: ws.gatewayError,
  };

  return c.json(resp);
});

/**
 * POST /api/workspace/bootstrap
 * Called by the Electron client after first login to initialize the workspace.
 * Idempotent — safe to call multiple times.
 */
workspaceRouter.post('/bootstrap', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  const store = readStore();
  const ws = store.workspaces.find((w) => w.id === claims.workspaceId);

  if (!ws) {
    return c.json({ error: '工作区不存在' }, 404);
  }

  // Mark workspace as bootstrapped — in a real deployment this would also
  // trigger provisioning the gateway container/process for the user.
  updateStore((data) => {
    const target = data.workspaces.find((w) => w.id === claims.workspaceId);
    if (target) {
      target.updatedAt = new Date().toISOString();
    }
  });

  return c.json({
    ok: true,
    workspaceId: ws.id,
    message: '工作区初始化完成',
  });
});
