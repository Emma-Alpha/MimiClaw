import type { IncomingMessage, ServerResponse } from 'http';
import { shell } from 'electron';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { fetchJizhiMessages, fetchJizhiSessions } from '../../services/jizhi-chat';
import { getSetting, setSetting } from '../../utils/store';
import { logger } from '../../utils/logger';

function readJizhiAppBaseUrl(): string {
  const viteEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;
  const configured = (viteEnv?.VITE_JIZHI_APP_BASE_URL ?? process.env.VITE_JIZHI_APP_BASE_URL ?? '').trim();
  return configured.replace(/\/$/, '') || 'https://jizhi.gz4399.com';
}

export async function handleJizhiRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  // Auth: get login status
  if (url.pathname === '/api/jizhi/auth/status' && req.method === 'GET') {
    const token = await getSetting('jizhiToken');
    sendJson(res, 200, { loggedIn: Boolean(token) });
    return true;
  }

  // Auth: open browser to Jizhi website for login
  if (url.pathname === '/api/jizhi/auth/start' && req.method === 'POST') {
    const appBase = readJizhiAppBaseUrl();
    await shell.openExternal(appBase);
    logger.info('[jizhi-auth] Opened browser for Jizhi login:', appBase);
    sendJson(res, 200, { success: true, url: appBase });
    return true;
  }

  // Auth: HTTP callback — website posts/redirects here with ?token=<jizhi_token>
  if (url.pathname === '/api/jizhi/auth/callback' && (req.method === 'GET' || req.method === 'POST')) {
    let token = url.searchParams.get('token')?.trim() || '';

    if (!token && req.method === 'POST') {
      try {
        const body = await parseJsonBody<{ token?: string }>(req);
        token = body.token?.trim() || '';
      } catch {
        // ignore parse errors
      }
    }

    if (!token) {
      sendJson(res, 400, { success: false, error: 'Missing token parameter' });
      return true;
    }

    await setSetting('jizhiToken', token);
    logger.info('[jizhi-auth] jizhiToken saved via HTTP callback');

    const window = ctx.mainWindow;
    if (window && !window.isDestroyed()) {
      window.webContents.send('jizhi:auth-success', {});
    }

    sendJson(res, 200, { success: true });
    return true;
  }

  // Auth: logout — clear saved token
  if (url.pathname === '/api/jizhi/auth/logout' && req.method === 'POST') {
    await setSetting('jizhiToken', '');
    logger.info('[jizhi-auth] jizhiToken cleared');
    const window = ctx.mainWindow;
    if (window && !window.isDestroyed()) {
      window.webContents.send('jizhi:auth-logout', {});
    }
    sendJson(res, 200, { success: true });
    return true;
  }

  if (url.pathname === '/api/jizhi/sessions' && req.method === 'GET') {
    try {
      logger.info('[jizhi-trace][route] GET /api/jizhi/sessions start');
      const sessions = await fetchJizhiSessions();
      sendJson(res, 200, { sessions });
    } catch (error) {
      logger.error('[jizhi-trace][route] GET /api/jizhi/sessions error', error);
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/jizhi/messages' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ sessionId?: string }>(req);
      if (!body.sessionId) {
        sendJson(res, 400, { error: 'Missing sessionId' });
        return true;
      }

      logger.info('[jizhi-trace][route] POST /api/jizhi/messages start', {
        sessionId: body.sessionId,
      });
      const messages = await fetchJizhiMessages(body.sessionId);
      sendJson(res, 200, { messages });
    } catch (error) {
      logger.error('[jizhi-trace][route] POST /api/jizhi/messages error', error);
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  return false;
}
