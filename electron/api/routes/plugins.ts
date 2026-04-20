import type { IncomingMessage, ServerResponse } from 'http';

import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { installPlugin, listPluginsSnapshot } from '../../utils/plugins';

function scheduleGatewayReload(ctx: HostApiContext): void {
  if (ctx.gatewayManager.getStatus().state === 'stopped') return;
  ctx.gatewayManager.debouncedReload();
}

export async function handlePluginRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/plugins' && req.method === 'GET') {
    sendJson(res, 200, { success: true, ...(await listPluginsSnapshot()) });
    return true;
  }

  if (url.pathname === '/api/plugins/install' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ key: string }>(req);
      const snapshot = await installPlugin(body.key);
      scheduleGatewayReload(ctx);
      sendJson(res, 200, { success: true, ...snapshot });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
