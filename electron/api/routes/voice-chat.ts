import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import {
  appendVoiceChatHistoryMessage,
  finalizeVoiceChatSession,
  getVoiceChatConfigState,
  getVoiceChatSessionHistory,
  listVoiceChatSessions,
  saveVoiceChatConfig,
} from '../../services/voice-chat-store';

export async function handleVoiceChatRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/voice-chat/config' && req.method === 'GET') {
    try {
      const result = await getVoiceChatConfigState();
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/voice-chat/config' && req.method === 'PUT') {
    try {
      const body = await parseJsonBody<{
        accessKey?: string;
        appId?: string;
        endpoint?: string;
        clearAccessKey?: boolean;
      }>(req);
      const result = await saveVoiceChatConfig(body);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/voice-chat/sessions' && req.method === 'GET') {
    try {
      const sessions = await listVoiceChatSessions();
      sendJson(res, 200, { sessions });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/voice-chat/messages' && req.method === 'GET') {
    const sessionId = url.searchParams.get('sessionId')?.trim();
    if (!sessionId) {
      sendJson(res, 400, { success: false, error: 'sessionId is required' });
      return true;
    }

    try {
      const messages = await getVoiceChatSessionHistory(sessionId);
      sendJson(res, 200, { messages });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/voice-chat/messages' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        sessionId?: string;
        groupId?: string;
        role?: 'user' | 'assistant';
        text?: string;
        interrupted?: boolean;
        createdAt?: number;
      }>(req);
      if (!body.sessionId || !body.groupId || !body.role || !body.text) {
        sendJson(res, 400, { success: false, error: 'sessionId, groupId, role, and text are required' });
        return true;
      }

      const message = await appendVoiceChatHistoryMessage({
        sessionId: body.sessionId,
        groupId: body.groupId,
        role: body.role,
        text: body.text,
        interrupted: body.interrupted,
        createdAt: body.createdAt,
      });
      sendJson(res, 200, { message });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/voice-chat/session/finalize' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        sessionId?: string;
        status?: 'active' | 'completed' | 'failed';
        endedAt?: number;
      }>(req);
      if (!body.sessionId) {
        sendJson(res, 400, { success: false, error: 'sessionId is required' });
        return true;
      }

      await finalizeVoiceChatSession({
        sessionId: body.sessionId,
        status: body.status,
        endedAt: body.endedAt,
      });
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  return false;
}
