import { randomUUID } from 'node:crypto';
import type {
  VoiceChatConfigState,
  VoiceChatHistoryMessage,
  VoiceChatSessionSummary,
  VoiceChatWindowBounds,
} from '../../shared/voice-chat';
import {
  DEFAULT_VOICE_CHAT_APP_KEY,
  DEFAULT_VOICE_CHAT_ENDPOINT,
  DEFAULT_VOICE_CHAT_RESOURCE_ID,
} from '../../shared/voice-chat';
import {
  getVolcengineSpeechAccessToken,
  getVolcengineSpeechConfigState,
} from './speech-config';

interface VoiceChatStoreShape {
  realtime: {
    accessKey: string;
    appId: string;
    apiKey?: string;
    botId?: string;
    endpoint: string;
  };
  history: {
    sessions: VoiceChatSessionSummary[];
    messagesBySession: Record<string, VoiceChatHistoryMessage[]>;
  };
  window: {
    bounds: VoiceChatWindowBounds | null;
  };
}

export interface VoiceChatRealtimeCredentials {
  accessKey: string;
  appId: string;
  endpoint: string;
  resourceId: string;
  appKey: string;
  accessKeySource: 'voice-chat' | 'speech-asr';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let voiceChatStoreInstance: any = null;

async function getVoiceChatStore() {
  if (!voiceChatStoreInstance) {
    const Store = (await import('electron-store')).default;
    voiceChatStoreInstance = new Store<VoiceChatStoreShape>({
      name: 'voice-chat',
      defaults: {
        realtime: {
          accessKey: '',
          appId: '',
          endpoint: DEFAULT_VOICE_CHAT_ENDPOINT,
        },
        history: {
          sessions: [],
          messagesBySession: {},
        },
        window: {
          bounds: null,
        },
      },
    });
  }

  return voiceChatStoreInstance;
}

function maskSecret(secret: string): string | null {
  const trimmed = secret.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}***`;
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
}

function normalizeEndpoint(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_VOICE_CHAT_ENDPOINT;
  }

  const normalized = trimmed.toLowerCase();
  if (
    normalized === 'wss://ai-gateway.vei.volces.com/v1/realtime'
    || normalized === 'https://ai-gateway.vei.volces.com/v1/realtime'
  ) {
    return DEFAULT_VOICE_CHAT_ENDPOINT;
  }

  return trimmed;
}

function formatVoiceChatTitle(timestampMs: number): string {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `Voice Chat ${year}-${month}-${day} ${hour}:${minute}`;
}

export async function getVoiceChatConfigState(): Promise<VoiceChatConfigState> {
  const store = await getVoiceChatStore();
  const value = store.get('realtime');
  const dedicatedAccessKey = (value.accessKey ?? value.apiKey ?? '').trim();
  const appId = (value.appId ?? value.botId ?? '').trim();
  const endpoint = normalizeEndpoint(value.endpoint);
  const speechConfig = await getVolcengineSpeechConfigState().catch(() => null);
  const accessKeySource = dedicatedAccessKey
    ? 'voice-chat'
    : speechConfig?.hasToken
      ? 'speech-asr'
      : null;
  const effectiveHasAccessKey = Boolean(dedicatedAccessKey || speechConfig?.hasToken);
  const effectiveAccessKeyMasked = dedicatedAccessKey
    ? maskSecret(dedicatedAccessKey)
    : (speechConfig?.tokenMasked ?? null);

  return {
    provider: 'volcengine-realtime',
    configured: Boolean(effectiveHasAccessKey && appId),
    appId,
    endpoint,
    hasAccessKey: effectiveHasAccessKey,
    accessKeyMasked: effectiveAccessKeyMasked,
    accessKeySource,
    resourceId: DEFAULT_VOICE_CHAT_RESOURCE_ID,
    appKey: DEFAULT_VOICE_CHAT_APP_KEY,
  };
}

export async function saveVoiceChatConfig(input: {
  accessKey?: string;
  appId?: string;
  endpoint?: string;
  clearAccessKey?: boolean;
  apiKey?: string;
  botId?: string;
  clearApiKey?: boolean;
}): Promise<VoiceChatConfigState> {
  const store = await getVoiceChatStore();
  const current = store.get('realtime');
  const nextAccessKey = input.clearAccessKey || input.clearApiKey
    ? ''
    : typeof input.accessKey === 'string' && input.accessKey.trim()
      ? input.accessKey.trim()
      : typeof input.apiKey === 'string' && input.apiKey.trim()
        ? input.apiKey.trim()
        : (current.accessKey ?? current.apiKey ?? '');

  store.set('realtime', {
    accessKey: nextAccessKey,
    appId: typeof input.appId === 'string'
      ? input.appId.trim()
      : typeof input.botId === 'string'
        ? input.botId.trim()
        : (current.appId ?? current.botId ?? ''),
    endpoint: typeof input.endpoint === 'string' ? normalizeEndpoint(input.endpoint) : normalizeEndpoint(current.endpoint),
  });

  return await getVoiceChatConfigState();
}

export async function getVoiceChatRealtimeCredentials(): Promise<VoiceChatRealtimeCredentials> {
  const store = await getVoiceChatStore();
  const value = store.get('realtime');
  const dedicatedAccessKey = (value.accessKey ?? value.apiKey ?? '').trim();
  const fallbackSpeechAccessKey = dedicatedAccessKey ? '' : await getVolcengineSpeechAccessToken().catch(() => '');
  const accessKey = dedicatedAccessKey || fallbackSpeechAccessKey;
  const accessKeySource: 'voice-chat' | 'speech-asr' = dedicatedAccessKey ? 'voice-chat' : 'speech-asr';
  const appId = (value.appId ?? value.botId ?? '').trim();
  const endpoint = normalizeEndpoint(value.endpoint);

  if (!accessKey || !appId) {
    throw new Error('Voice Chat is not configured. Please fill in APP ID first, and ensure either a dedicated Access Token or the existing Volcengine ASR Access Token is available.');
  }

  return {
    accessKey,
    appId,
    endpoint,
    resourceId: DEFAULT_VOICE_CHAT_RESOURCE_ID,
    appKey: DEFAULT_VOICE_CHAT_APP_KEY,
    accessKeySource,
  };
}

export async function listVoiceChatSessions(): Promise<VoiceChatSessionSummary[]> {
  const store = await getVoiceChatStore();
  const sessions = store.get('history.sessions') ?? [];
  return [...sessions].sort((left, right) => right.lastActivityAt - left.lastActivityAt);
}

export async function getVoiceChatSessionHistory(sessionId: string): Promise<VoiceChatHistoryMessage[]> {
  const store = await getVoiceChatStore();
  const messagesBySession = store.get('history.messagesBySession') ?? {};
  const messages = messagesBySession[sessionId] ?? [];
  return [...messages].sort((left, right) => left.createdAt - right.createdAt);
}

export async function createVoiceChatSession(startedAt = Date.now()): Promise<VoiceChatSessionSummary> {
  const store = await getVoiceChatStore();
  const sessions = store.get('history.sessions') ?? [];
  const session: VoiceChatSessionSummary = {
    id: randomUUID(),
    title: formatVoiceChatTitle(startedAt),
    startedAt,
    lastActivityAt: startedAt,
    endedAt: null,
    status: 'active',
  };

  store.set('history.sessions', [session, ...sessions]);
  return session;
}

export async function appendVoiceChatHistoryMessage(input: {
  sessionId: string;
  groupId: string;
  role: VoiceChatHistoryMessage['role'];
  text: string;
  interrupted?: boolean;
  createdAt?: number;
}): Promise<VoiceChatHistoryMessage> {
  const trimmedText = input.text.trim();
  if (!trimmedText) {
    throw new Error('Voice Chat history message text is required');
  }

  const store = await getVoiceChatStore();
  const messagesBySession = store.get('history.messagesBySession') ?? {};
  const sessions = store.get('history.sessions') ?? [];
  const nextMessage: VoiceChatHistoryMessage = {
    id: randomUUID(),
    sessionId: input.sessionId,
    groupId: input.groupId,
    role: input.role,
    text: trimmedText,
    interrupted: input.interrupted === true,
    createdAt: input.createdAt ?? Date.now(),
  };

  store.set('history.messagesBySession', {
    ...messagesBySession,
    [input.sessionId]: [...(messagesBySession[input.sessionId] ?? []), nextMessage],
  });

  store.set('history.sessions', sessions.map((session) => (
    session.id === input.sessionId
      ? {
          ...session,
          lastActivityAt: nextMessage.createdAt,
        }
      : session
  )));

  return nextMessage;
}

export async function finalizeVoiceChatSession(input: {
  sessionId: string;
  status?: VoiceChatSessionSummary['status'];
  endedAt?: number;
}): Promise<void> {
  const store = await getVoiceChatStore();
  const sessions = store.get('history.sessions') ?? [];
  const endedAt = input.endedAt ?? Date.now();

  store.set('history.sessions', sessions.map((session) => (
    session.id === input.sessionId
      ? {
          ...session,
          status: input.status ?? 'completed',
          endedAt,
          lastActivityAt: Math.max(session.lastActivityAt, endedAt),
        }
      : session
  )));
}

export async function getVoiceChatWindowBounds(): Promise<VoiceChatWindowBounds | null> {
  const store = await getVoiceChatStore();
  return store.get('window.bounds') ?? null;
}

export async function saveVoiceChatWindowBounds(bounds: VoiceChatWindowBounds): Promise<void> {
  const store = await getVoiceChatStore();
  store.set('window.bounds', bounds);
}
