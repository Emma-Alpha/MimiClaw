import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { parseJsonBody } from '../route-utils';
import { setCorsHeaders, sendJson, sendNoContent } from '../route-utils';
import { runOpenClawDoctor, runOpenClawDoctorFix } from '../../utils/openclaw-doctor';
import {
  isCloudMode,
  getCloudConfig,
  patchCloudConfig,
  getCloudGatewayStatus,
  startCloudGateway,
  stopCloudGateway,
  restartCloudGateway,
} from '../../utils/cloud-config-bridge';

export async function handleAppRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/events' && req.method === 'GET') {
    setCorsHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    ctx.eventBus.addSseClient(res);
    // Send a current-state snapshot immediately so renderer subscribers do not
    // miss lifecycle transitions that happened before the SSE connection opened.
    res.write(`event: gateway:status\ndata: ${JSON.stringify(ctx.gatewayManager.getStatus())}\n\n`);
    return true;
  }

  if (url.pathname === '/api/app/openclaw-doctor' && req.method === 'POST') {
    const body = await parseJsonBody<{ mode?: 'diagnose' | 'fix' }>(req);
    const mode = body.mode === 'fix' ? 'fix' : 'diagnose';
    sendJson(res, 200, mode === 'fix' ? await runOpenClawDoctorFix() : await runOpenClawDoctor());
    return true;
  }

  // ── Cloud control-plane proxy routes ──────────────────────────────────────
  // These let the renderer read/write cloud state without importing cloud-api
  // from the main process (which would violate the renderer/main boundary).

  if (url.pathname === '/api/cloud/status' && req.method === 'GET') {
    sendJson(res, 200, { cloudMode: await isCloudMode() });
    return true;
  }

  if (url.pathname === '/api/cloud/config' && req.method === 'GET') {
    if (!(await isCloudMode())) {
      sendJson(res, 200, { cloudMode: false, config: null });
      return true;
    }
    const config = await getCloudConfig();
    sendJson(res, 200, { cloudMode: true, config });
    return true;
  }

  if (url.pathname === '/api/cloud/config' && req.method === 'PATCH') {
    if (!(await isCloudMode())) {
      sendJson(res, 400, { success: false, error: 'Not in cloud mode' });
      return true;
    }
    try {
      const body = await parseJsonBody<Record<string, unknown>>(req);
      const ok = await patchCloudConfig(body);
      sendJson(res, 200, { success: ok });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  if (url.pathname === '/api/cloud/gateway/status' && req.method === 'GET') {
    if (!(await isCloudMode())) {
      sendJson(res, 200, { cloudMode: false });
      return true;
    }
    const status = await getCloudGatewayStatus();
    sendJson(res, 200, { cloudMode: true, ...status });
    return true;
  }

  if (url.pathname === '/api/cloud/gateway/start' && req.method === 'POST') {
    if (!(await isCloudMode())) {
      sendJson(res, 400, { success: false, error: 'Not in cloud mode' });
      return true;
    }
    const result = await startCloudGateway();
    sendJson(res, 200, result ?? { success: false, error: 'Cloud API unreachable' });
    return true;
  }

  if (url.pathname === '/api/cloud/gateway/stop' && req.method === 'POST') {
    if (!(await isCloudMode())) {
      sendJson(res, 400, { success: false, error: 'Not in cloud mode' });
      return true;
    }
    const result = await stopCloudGateway();
    sendJson(res, 200, result ?? { success: false, error: 'Cloud API unreachable' });
    return true;
  }

  if (url.pathname === '/api/cloud/gateway/restart' && req.method === 'POST') {
    if (!(await isCloudMode())) {
      sendJson(res, 400, { success: false, error: 'Not in cloud mode' });
      return true;
    }
    const result = await restartCloudGateway();
    sendJson(res, 200, result ?? { success: false, error: 'Cloud API unreachable' });
    return true;
  }

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return true;
  }

  return false;
}
