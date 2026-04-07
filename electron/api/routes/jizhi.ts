import type { IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'node:crypto';
import { BrowserWindow, shell } from 'electron';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import {
  activeJizhiMessage,
  fetchJizhiMessages,
  fetchJizhiSessions,
  retryJizhiMessage,
  sendJizhiMessage,
  stopJizhiMessage,
  streamJizhiMessage,
} from '../../services/jizhi-chat';
import {
  applyPetCompanionGrowth,
  normalizePetCompanion,
  rollPetCompanion,
  type StoredPetCompanion,
} from '../../../shared/pet-companion';
import { getSetting, setSetting, type AppSettings } from '../../utils/store';
import { logger } from '../../utils/logger';

function readJizhiAppBaseUrl(): string {
  const viteEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;
  const configured = (viteEnv?.VITE_JIZHI_APP_BASE_URL ?? process.env.VITE_JIZHI_APP_BASE_URL ?? '').trim();
  return configured.replace(/\/$/, '') || 'https://jizhi.gz4399.com';
}

type JizhiHostStreamEvent = {
  sessionId: string;
  messageUUID: string;
  event: 'open' | 'chunk' | 'result' | 'error' | 'end' | 'stopped';
  seq?: string;
  data?: Record<string, unknown> | null;
  errorMessage?: string | null;
};

const jizhiStreamControllers = new Map<string, AbortController>();

function emitJizhiStreamEvent(ctx: HostApiContext, payload: JizhiHostStreamEvent): void {
  ctx.eventBus.emit('jizhi:stream', payload);

  const window = ctx.mainWindow;
  if (window && !window.isDestroyed()) {
    window.webContents.send('jizhi:stream', payload);
  }
}

async function emitPetSettingsUpdated(): Promise<void> {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('pet:settings-updated');
    }
  }
}

function buildPetCompanionSeed(storedSeed: string, machineId: string): string {
  if (storedSeed.trim()) return storedSeed.trim();
  if (machineId.trim()) return `machine:${machineId.trim()}`;
  return `local:${randomUUID()}`;
}

async function ensurePetCompanionForJizhi(): Promise<StoredPetCompanion> {
  const stored = await getSetting('petCompanion');
  if (stored) {
    const normalized = normalizePetCompanion(stored);
    if (
      !('potentialStats' in stored)
      || !('usage' in stored)
      || !('activityExp' in stored)
      || !('bondExp' in stored)
      || !('updatedAt' in stored)
      || !('lastActiveAt' in stored)
    ) {
      await setSetting('petCompanion', normalized as AppSettings['petCompanion']);
    }
    return normalized;
  }

  const [storedSeed, machineId] = await Promise.all([
    getSetting('petCompanionSeed'),
    getSetting('machineId'),
  ]);
  const seed = buildPetCompanionSeed(storedSeed, machineId);
  const companion = rollPetCompanion(seed);
  await setSetting('petCompanionSeed', seed);
  await setSetting('petCompanion', companion as AppSettings['petCompanion']);
  return companion;
}

async function recordJizhiPetCompanionGrowth(): Promise<void> {
  try {
    const companion = await ensurePetCompanionForJizhi();
    const updated = applyPetCompanionGrowth(companion, 'mini_chat');
    await setSetting('petCompanion', updated as AppSettings['petCompanion']);
    await emitPetSettingsUpdated();
  } catch (error) {
    logger.debug('[jizhi] Failed to record pet companion growth from jizhi usage:', error);
  }
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

  if (url.pathname === '/api/jizhi/send' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        sessionId?: string;
        prompt?: string;
        category?: string;
        model?: string;
        messageUUID?: string;
      }>(req);

      if (!body.sessionId) {
        sendJson(res, 400, { error: 'Missing sessionId' });
        return true;
      }

      if (!body.prompt?.trim()) {
        sendJson(res, 400, { error: 'Missing prompt' });
        return true;
      }

      logger.info('[jizhi-trace][route] POST /api/jizhi/send start', {
        sessionId: body.sessionId,
        category: body.category ?? null,
      });

      const requestMessageUUID = body.messageUUID?.trim() || `msg_${randomUUID()}`;
      const result = await sendJizhiMessage({
        sessionId: body.sessionId,
        prompt: body.prompt,
        category: body.category ?? '',
        fallbackModel: body.model,
        messageUUID: requestMessageUUID,
      });
      await recordJizhiPetCompanionGrowth();

      const messageUUID = result.messageUUID ?? requestMessageUUID;
      const controller = new AbortController();
      jizhiStreamControllers.set(messageUUID, controller);
      emitJizhiStreamEvent(ctx, {
        sessionId: body.sessionId,
        messageUUID,
        event: 'open',
      });

      void streamJizhiMessage({
        messageUUID,
        signal: controller.signal,
        onEvent: (event) => {
          const data = event.payload?.data && typeof event.payload.data === 'object'
            ? event.payload.data
            : null;

          const streamErrorMessage = typeof data?.errorMessage === 'string'
            ? data.errorMessage.trim()
            : '';
          const payloadErrorMessage = typeof event.payload?.message === 'string'
            ? event.payload.message.trim()
            : '';
          const errorMessage = event.event === 'error'
            ? (streamErrorMessage || payloadErrorMessage || '极智流式响应失败')
            : null;

          emitJizhiStreamEvent(ctx, {
            sessionId: body.sessionId!,
            messageUUID,
            event: event.event,
            seq: event.id,
            data,
            errorMessage,
          });
        },
      }).catch((error) => {
        if (controller.signal.aborted) {
          logger.info('[jizhi-trace][route] POST /api/jizhi/send stream aborted', {
            sessionId: body.sessionId,
            messageUUID,
          });
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[jizhi-trace][route] POST /api/jizhi/send stream error', {
          sessionId: body.sessionId,
          messageUUID,
          error: message,
        });
        emitJizhiStreamEvent(ctx, {
          sessionId: body.sessionId!,
          messageUUID,
          event: 'error',
          errorMessage: message,
        });
      }).finally(() => {
        jizhiStreamControllers.delete(messageUUID);
      });

      sendJson(res, 200, { result });
    } catch (error) {
      logger.error('[jizhi-trace][route] POST /api/jizhi/send error', error);
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/jizhi/stop' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        sessionId?: string;
        messageUUID?: string;
      }>(req);

      if (!body.sessionId) {
        sendJson(res, 400, { error: 'Missing sessionId' });
        return true;
      }

      if (!body.messageUUID?.trim()) {
        sendJson(res, 400, { error: 'Missing messageUUID' });
        return true;
      }

      const messageUUID = body.messageUUID.trim();
      logger.info('[jizhi-trace][route] POST /api/jizhi/stop start', {
        sessionId: body.sessionId,
        messageUUID,
      });

      const controller = jizhiStreamControllers.get(messageUUID);
      if (controller) {
        controller.abort();
        jizhiStreamControllers.delete(messageUUID);
      }

      const result = await stopJizhiMessage(messageUUID);
      emitJizhiStreamEvent(ctx, {
        sessionId: body.sessionId,
        messageUUID,
        event: 'stopped',
      });

      sendJson(res, 200, { result });
    } catch (error) {
      logger.error('[jizhi-trace][route] POST /api/jizhi/stop error', error);
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/jizhi/retry' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        sessionId?: string;
        messageUUID?: string;
        category?: string;
        model?: string;
      }>(req);

      if (!body.sessionId) {
        sendJson(res, 400, { error: 'Missing sessionId' });
        return true;
      }
      if (!body.messageUUID?.trim()) {
        sendJson(res, 400, { error: 'Missing messageUUID' });
        return true;
      }
      if (!body.category?.trim()) {
        sendJson(res, 400, { error: 'Missing category' });
        return true;
      }
      if (!body.model?.trim()) {
        sendJson(res, 400, { error: 'Missing model' });
        return true;
      }

      logger.info('[jizhi-trace][route] POST /api/jizhi/retry start', {
        sessionId: body.sessionId,
        messageUUID: body.messageUUID,
        category: body.category,
        model: body.model,
      });

      const result = await retryJizhiMessage({
        sessionId: body.sessionId,
        messageUUID: body.messageUUID,
        category: body.category,
        model: body.model,
      });
      await recordJizhiPetCompanionGrowth();

      const retryMessageUUID = result.messageUUID?.trim();
      if (retryMessageUUID) {
        const controller = new AbortController();
        jizhiStreamControllers.set(retryMessageUUID, controller);

        emitJizhiStreamEvent(ctx, {
          sessionId: body.sessionId,
          messageUUID: retryMessageUUID,
          event: 'open',
        });

        void streamJizhiMessage({
          messageUUID: retryMessageUUID,
          signal: controller.signal,
          onEvent: (event) => {
            const data = event.payload?.data && typeof event.payload.data === 'object'
              ? event.payload.data
              : null;

            const streamErrorMessage = typeof data?.errorMessage === 'string'
              ? data.errorMessage.trim()
              : '';
            const payloadErrorMessage = typeof event.payload?.message === 'string'
              ? event.payload.message.trim()
              : '';
            const errorMessage = event.event === 'error'
              ? (streamErrorMessage || payloadErrorMessage || '极智重试响应失败')
              : null;

            emitJizhiStreamEvent(ctx, {
              sessionId: body.sessionId!,
              messageUUID: retryMessageUUID,
              event: event.event,
              seq: event.id,
              data,
              errorMessage,
            });
          },
        }).catch((error) => {
          if (controller.signal.aborted) {
            logger.info('[jizhi-trace][route] POST /api/jizhi/retry stream aborted', {
              sessionId: body.sessionId,
              messageUUID: retryMessageUUID,
            });
            return;
          }

          const message = error instanceof Error ? error.message : String(error);
          logger.error('[jizhi-trace][route] POST /api/jizhi/retry stream error', {
            sessionId: body.sessionId,
            messageUUID: retryMessageUUID,
            error: message,
          });
          emitJizhiStreamEvent(ctx, {
            sessionId: body.sessionId!,
            messageUUID: retryMessageUUID,
            event: 'error',
            errorMessage: message,
          });
        }).finally(() => {
          jizhiStreamControllers.delete(retryMessageUUID);
        });
      }

      sendJson(res, 200, { result });
    } catch (error) {
      logger.error('[jizhi-trace][route] POST /api/jizhi/retry error', error);
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/jizhi/active' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ messageUUID?: string }>(req);

      if (!body.messageUUID?.trim()) {
        sendJson(res, 400, { error: 'Missing messageUUID' });
        return true;
      }

      const result = await activeJizhiMessage(body.messageUUID);
      sendJson(res, 200, { result });
    } catch (error) {
      logger.error('[jizhi-trace][route] POST /api/jizhi/active error', error);
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  return false;
}
