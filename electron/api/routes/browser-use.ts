import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson, setCorsHeaders } from '../route-utils';
import { browserUseManager } from '../../browser-use/manager';
import type { BrowserUseCommand, BrowserUseNavigationConfig } from '../../../shared/browser-use';

export async function handleBrowserUseRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  if (!url.pathname.startsWith('/api/browser-use')) {
    return false;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return true;
  }

  // GET /api/browser-use/status
  if (url.pathname === '/api/browser-use/status' && req.method === 'GET') {
    sendJson(res, 200, browserUseManager.getStatus());
    return true;
  }

  // POST /api/browser-use/execute
  if (url.pathname === '/api/browser-use/execute' && req.method === 'POST') {
    const command = await parseJsonBody<BrowserUseCommand>(req);
    const result = await browserUseManager.executeCommand(command);
    sendJson(res, 200, result);
    return true;
  }

  // POST /api/browser-use/screenshot
  if (url.pathname === '/api/browser-use/screenshot' && req.method === 'POST') {
    const result = await browserUseManager.executeCommand({
      commandId: `screenshot-${Date.now()}`,
      kind: 'screenshot',
      params: {},
    });
    sendJson(res, 200, result);
    return true;
  }

  // POST /api/browser-use/navigate
  if (url.pathname === '/api/browser-use/navigate' && req.method === 'POST') {
    const body = await parseJsonBody<{ url: string }>(req);
    const result = await browserUseManager.executeCommand({
      commandId: `navigate-${Date.now()}`,
      kind: 'navigate',
      params: { url: body.url },
    });
    sendJson(res, 200, result);
    return true;
  }

  // POST /api/browser-use/close
  if (url.pathname === '/api/browser-use/close' && req.method === 'POST') {
    browserUseManager.detach();
    sendJson(res, 200, { success: true });
    return true;
  }

  // GET /api/browser-use/nav-config
  if (url.pathname === '/api/browser-use/nav-config' && req.method === 'GET') {
    sendJson(res, 200, browserUseManager.getNavigationConfig());
    return true;
  }

  // POST /api/browser-use/nav-config
  if (url.pathname === '/api/browser-use/nav-config' && req.method === 'POST') {
    const config = await parseJsonBody<BrowserUseNavigationConfig>(req);
    browserUseManager.setNavigationConfig(config);
    sendJson(res, 200, { success: true });
    return true;
  }

  return false;
}
