import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { fetchXiaojiuMessages, fetchXiaojiuSessions } from '../../services/xiaojiu-messenger';

export async function handleXiaojiuRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/xiaojiu/sessions' && req.method === 'GET') {
    try {
      const sessions = await fetchXiaojiuSessions();
      sendJson(res, 200, { sessions });
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/xiaojiu/messages' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        sessionId?: string;
        pageSize?: number;
      }>(req);

      if (!body.sessionId) {
        sendJson(res, 400, { error: 'Missing sessionId' });
        return true;
      }

      const result = await fetchXiaojiuMessages({
        sessionId: body.sessionId,
        mode: 'latest',
        pageSize: body.pageSize,
      });
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/xiaojiu/messages/load-more' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        sessionId?: string;
        anchorMsgId?: string | null;
        pageSize?: number;
      }>(req);

      if (!body.sessionId) {
        sendJson(res, 400, { error: 'Missing sessionId' });
        return true;
      }

      const result = await fetchXiaojiuMessages({
        sessionId: body.sessionId,
        mode: 'older',
        anchorMsgId: body.anchorMsgId ?? null,
        pageSize: body.pageSize,
      });
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  return false;
}
