import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { fetchXiaojiuMessages, fetchXiaojiuSessions } from '../../services/xiaojiu-messenger';
import { logger } from '../../utils/logger';

export async function handleXiaojiuRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/xiaojiu/sessions' && req.method === 'GET') {
    try {
      logger.info('[xiaojiu-trace][route] GET /api/xiaojiu/sessions start');
      const sessions = await fetchXiaojiuSessions();
      logger.info('[xiaojiu-trace][route] GET /api/xiaojiu/sessions success', {
        count: sessions.length,
      });
      sendJson(res, 200, { sessions });
    } catch (error) {
      logger.error('[xiaojiu-trace][route] GET /api/xiaojiu/sessions error', error);
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
        latestMsgId?: string | null;
        pageSize?: number;
      }>(req);

      if (!body.sessionId) {
        sendJson(res, 400, { error: 'Missing sessionId' });
        return true;
      }

      logger.info('[xiaojiu-trace][route] POST /api/xiaojiu/messages start', {
        sessionId: body.sessionId,
        latestMsgId: body.latestMsgId ?? null,
        pageSize: body.pageSize ?? null,
      });
      const result = await fetchXiaojiuMessages({
        sessionId: body.sessionId,
        mode: 'latest',
        latestMsgId: body.latestMsgId ?? null,
        pageSize: body.pageSize,
      });
      logger.info('[xiaojiu-trace][route] POST /api/xiaojiu/messages success', {
        sessionId: body.sessionId,
        count: result.messages.length,
        hasMore: result.hasMore,
        oldestMessageId: result.oldestMessageId,
      });
      sendJson(res, 200, result);
    } catch (error) {
      logger.error('[xiaojiu-trace][route] POST /api/xiaojiu/messages error', error);
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

      logger.info('[xiaojiu-trace][route] POST /api/xiaojiu/messages/load-more start', {
        sessionId: body.sessionId,
        anchorMsgId: body.anchorMsgId ?? null,
        pageSize: body.pageSize ?? null,
      });
      const result = await fetchXiaojiuMessages({
        sessionId: body.sessionId,
        mode: 'older',
        anchorMsgId: body.anchorMsgId ?? null,
        pageSize: body.pageSize,
      });
      logger.info('[xiaojiu-trace][route] POST /api/xiaojiu/messages/load-more success', {
        sessionId: body.sessionId,
        anchorMsgId: body.anchorMsgId ?? null,
        count: result.messages.length,
        hasMore: result.hasMore,
        oldestMessageId: result.oldestMessageId,
      });
      sendJson(res, 200, result);
    } catch (error) {
      logger.error('[xiaojiu-trace][route] POST /api/xiaojiu/messages/load-more error', error);
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  return false;
}
