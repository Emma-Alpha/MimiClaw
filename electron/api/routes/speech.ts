import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import {
  ensureLocalTranscriptionBootstrap,
  getLocalTranscriptionBootstrapStatus,
  transcribeLocalAudioFile,
} from '../../services/local-transcription';
import {
  getVolcengineSpeechConfigState,
  saveVolcengineSpeechConfig,
} from '../../services/speech-config';

export async function handleSpeechRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/speech/local-status' && req.method === 'GET') {
    try {
      const result = await getLocalTranscriptionBootstrapStatus();
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/speech/bootstrap-local' && req.method === 'POST') {
    try {
      await parseJsonBody<Record<string, never>>(req);
      const result = await ensureLocalTranscriptionBootstrap();
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/speech/transcribe-local' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ filePath?: string; language?: string }>(req);
      const filePath = typeof body.filePath === 'string' ? body.filePath.trim() : '';
      const language = typeof body.language === 'string' ? body.language.trim() : 'auto';
      if (!filePath) {
        sendJson(res, 400, { success: false, error: 'filePath is required' });
        return true;
      }

      const result = await transcribeLocalAudioFile(filePath, language);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/speech/volcengine-config' && req.method === 'GET') {
    try {
      const result = await getVolcengineSpeechConfigState();
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/speech/volcengine-config' && req.method === 'PUT') {
    try {
      const body = await parseJsonBody<{
        appId?: string;
        cluster?: string;
        token?: string;
        language?: string;
        endpoint?: string;
        clearToken?: boolean;
      }>(req);
      const result = await saveVolcengineSpeechConfig(body);
      sendJson(res, 200, result);
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
