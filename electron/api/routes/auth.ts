import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson, sendNoContent } from '../route-utils';
import {
  completeXiaojiuAuthCallback,
  clearPendingXiaojiuAuthFlow,
  startXiaojiuAuthFlow,
  type XiaojiuAuthStartConfig,
} from '../../utils/xiaojiu-auth';
import { setSetting } from '../../utils/store';

function sendHtml(res: ServerResponse, statusCode: number, html: string): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCallbackPage(options: {
  title: string;
  message: string;
  success: boolean;
}): string {
  const accent = options.success ? '#16a34a' : '#dc2626';
  const title = escapeHtml(options.title);
  const message = escapeHtml(options.message);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(420px, 100%);
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      padding: 28px 24px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 700;
      color: white;
      background: ${accent};
    }
    h1 {
      margin: 16px 0 10px;
      font-size: 24px;
      line-height: 1.2;
    }
    p {
      margin: 0;
      line-height: 1.6;
      color: #cbd5e1;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">${options.success ? 'OAuth Success' : 'OAuth Error'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </main>
</body>
</html>`;
}

function notifyRenderer(ctx: HostApiContext, channel: 'cloud:auth-success' | 'cloud:auth-error', payload: unknown): void {
  ctx.eventBus.emit(channel, payload);
  const window = ctx.mainWindow;
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, payload);
  }
}

export async function handleAuthRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/auth/xiaojiu/start' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<XiaojiuAuthStartConfig>(req);
      const result = startXiaojiuAuthFlow(body);
      sendJson(res, 200, { success: true, ...result });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/auth/xiaojiu/cancel' && req.method === 'POST') {
    clearPendingXiaojiuAuthFlow();
    sendNoContent(res);
    return true;
  }

  if (url.pathname === '/api/auth/xiaojiu/callback' && req.method === 'GET') {
    try {
      const result = await completeXiaojiuAuthCallback({
        code: url.searchParams.get('code'),
        state: url.searchParams.get('state'),
        error: url.searchParams.get('error'),
        errorMessage: url.searchParams.get('error_description'),
      });

      if (!result.success) {
        notifyRenderer(ctx, 'cloud:auth-error', { message: result.message });
        sendHtml(res, 400, renderCallbackPage({
          title: '小九登录失败',
          message: result.message,
          success: false,
        }));
        return true;
      }

      await Promise.all([
        setSetting('cloudApiUrl', result.cloudApiBase),
        setSetting('cloudApiToken', result.session.token),
      ]);
      notifyRenderer(ctx, 'cloud:auth-success', result.session);
      sendHtml(res, 200, renderCallbackPage({
        title: '小九登录成功',
        message: '您已经完成授权，请返回极智桌面应用继续使用。',
        success: true,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      notifyRenderer(ctx, 'cloud:auth-error', { message });
      sendHtml(res, 400, renderCallbackPage({
        title: '小九登录失败',
        message,
        success: false,
      }));
    }
    return true;
  }

  return false;
}
