import { getSetting } from '../utils/store';
import { logger } from '../utils/logger';

const JIZHI_CLIENT_SOURCE = 'jizhi-main';
const JIZHI_TOKEN_COOKIE_NAME = 'jizhi_token';
const JIZHI_CHAT_API_PREFIX = '/api/jizhi/v1';

function normalizeConfiguredBaseUrl(value: string | undefined): string | null {
  const normalized = (value || '').trim();
  if (!normalized) return null;

  try {
    return new URL(normalized).toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function readConfiguredJizhiAppBase(): string | null {
  const viteEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;

  return normalizeConfiguredBaseUrl(
    viteEnv?.VITE_JIZHI_APP_BASE_URL ?? process.env.VITE_JIZHI_APP_BASE_URL,
  );
}

function readConfiguredJizhiApiBase(): string | null {
  const viteEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;

  return normalizeConfiguredBaseUrl(
    viteEnv?.VITE_JIZHI_API_BASE_URL ?? process.env.VITE_JIZHI_API_BASE_URL,
  );
}

type JizhiApiEnvelope<T> = {
  code?: number;
  message?: string;
  msg?: string;
  data?: T;
};

type JizhiTopicRow = {
  id: number;
  topic?: string;
  updatedAt?: string;
  createdAt?: string;
  model?: string;
  category?: 'llm' | 'agent' | string;
  lastMessageCreatedAt?: string;
  isCollect?: boolean;
  isTop?: boolean;
  projectId?: number;
};

type JizhiTopicListResponse = {
  rows?: JizhiTopicRow[];
  total?: number;
};

export interface JizhiSession {
  id: string;
  name: string;
  updatedAt?: number;
  createdAt?: number;
  lastMessageCreatedAt?: number;
  model?: string;
  category?: string;
  isCollect: boolean;
  isTop: boolean;
  projectId?: number;
}

export interface JizhiMessageContentItem {
  blockUUID: string;
  parentMessageUUID: string;
  contentType: string;
  content: string;
}

export interface JizhiMessageContent {
  items: JizhiMessageContentItem[];
}

export interface JizhiAssistantMessageItem {
  content: JizhiMessageContent;
  createdAt: string;
  creatorId: number;
  creatorName: string;
  env: string;
  errorMessage: string;
  errorTitle?: string;
  errorType?: string;
  errorData?: unknown;
  id: number;
  isActive: boolean;
  messageUUID: string;
  model: string;
  modelName: string;
  status: string;
  updatedAt: string;
  icon_bucket_path?: string;
}

export interface JizhiGroupMessages {
  answerGroup: string;
  messages: JizhiAssistantMessageItem[];
}

export interface JizhiAssistantMessage {
  chatId: number;
  parentMessageId: number;
  groupMessages: JizhiGroupMessages[];
}

export interface JizhiUserMessage {
  chatId: number;
  content: JizhiMessageContent;
  createdAt: string;
  creatorId: number;
  creatorName: string;
  env: string;
  errorMessage: string;
  id: number;
  messageUUID: string;
  status: string;
  updatedAt: string;
}

export interface JizhiChatMessage {
  assistantMessage?: JizhiAssistantMessage;
  role: 'assistant' | 'user' | 'system';
  userMessage?: JizhiUserMessage;
  index: string;
}

type JizhiMessagesResponse = {
  rows?: JizhiChatMessage[];
  total?: number;
};

function trace(step: string, payload?: Record<string, unknown>): void {
  logger.info(`[jizhi-trace][service] ${step}`, payload ?? {});
}

function parseJsonPayload<T>(rawText: string): JizhiApiEnvelope<T> | null {
  const normalized = rawText.trim();
  if (!normalized) return null;

  try {
    return JSON.parse(normalized) as JizhiApiEnvelope<T>;
  } catch {
    return null;
  }
}

function normalizeTimestamp(value: string | number | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeAuthHeader(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';
  return /^(Bearer|Basic)\s+/i.test(trimmed) ? trimmed : `Bearer ${trimmed}`;
}

async function getCloudCredentials(): Promise<{ apiUrl: string; token: string; rawToken: string }> {
  const [apiUrl, cloudToken, jizhiToken] = await Promise.all([
    getSetting('cloudApiUrl'),
    getSetting('cloudApiToken'),
    getSetting('jizhiToken'),
  ]);

  // jizhiToken (from Jizhi website login) takes priority over cloudApiToken
  const rawToken = (jizhiToken || cloudToken || '').trim();

  if (!rawToken) {
    throw new Error('极智未登录，请先完成极智授权（点击授权按钮登录极智网站）');
  }

  return {
    apiUrl: (apiUrl || '').replace(/\/$/, ''),
    token: normalizeAuthHeader(rawToken),
    rawToken,
  };
}

function resolveJizhiAppBase(apiUrl: string): string {
  const configuredBase = readConfiguredJizhiAppBase();
  if (configuredBase) {
    return configuredBase;
  }

  try {
    const url = new URL(apiUrl);
    if (url.hostname.startsWith('api.')) {
      url.hostname = url.hostname.slice(4);
    }
    return url.origin;
  } catch {
    return apiUrl.replace(/\/$/, '');
  }
}

async function fetchJizhiApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const creds = await getCloudCredentials();
  const configuredApiBase = readConfiguredJizhiApiBase();
  const configuredAppBase = readConfiguredJizhiAppBase();
  const baseUrl = configuredApiBase ?? configuredAppBase ?? resolveJizhiAppBase(creds.apiUrl);
  const url = `${baseUrl}${path}`;
  trace('request:start', {
    path,
    baseUrl,
    configuredApiBaseUrl: configuredApiBase,
    configuredAppBaseUrl: configuredAppBase,
    cloudApiUrl: creds.apiUrl,
    method: init?.method ?? 'GET',
  });

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json, text/plain, */*',
      Authorization: creds.token,
      Cookie: `${JIZHI_TOKEN_COOKIE_NAME}=${encodeURIComponent(creds.rawToken)}`,
      'Content-Type': 'application/json',
      'X-Client-Source': JIZHI_CLIENT_SOURCE,
      ...(init?.headers ?? {}),
    },
  });

  const rawText = await response.text();
  const payload = parseJsonPayload<T>(rawText);
  const contentType = response.headers.get('content-type') ?? '';
  trace('request:response', {
    path,
    status: response.status,
    ok: response.ok,
    contentType,
    code: payload?.code ?? null,
    message: payload?.message ?? payload?.msg ?? null,
  });
  trace('request:payload', {
    path,
    payload: payload ?? (rawText || null),
  });

  if (contentType.includes('text/html') || (!payload && rawText.trim().startsWith('<!doctype html'))) {
    throw new Error(`极智接口返回了 HTML 页面而不是 JSON，请检查 Jizhi API base 配置。path=${path} baseUrl=${baseUrl}`);
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.msg || `HTTP ${response.status}`);
  }

  if (payload?.code != null && payload.code !== 0) {
    throw new Error(payload.message || payload.msg || `极智接口返回异常 code=${payload.code}`);
  }

  return (payload?.data ?? payload) as T;
}

function normalizeSession(row: JizhiTopicRow): JizhiSession {
  return {
    id: String(row.id),
    name: row.topic?.trim() || `会话 ${row.id}`,
    updatedAt: normalizeTimestamp(row.updatedAt),
    createdAt: normalizeTimestamp(row.createdAt),
    lastMessageCreatedAt: normalizeTimestamp(row.lastMessageCreatedAt),
    model: row.model,
    category: row.category,
    isCollect: row.isCollect === true,
    isTop: row.isTop === true,
    projectId: typeof row.projectId === 'number' ? row.projectId : undefined,
  };
}

export async function fetchJizhiSessions(): Promise<JizhiSession[]> {
  const data = await fetchJizhiApi<JizhiTopicListResponse>(`${JIZHI_CHAT_API_PREFIX}/topic/all`);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  trace('fetch sessions:raw', {
    rowCount: rows.length,
    data,
  });
  const sessions = rows.map(normalizeSession).sort((left, right) => {
    const leftTime = left.lastMessageCreatedAt ?? left.updatedAt ?? left.createdAt ?? 0;
    const rightTime = right.lastMessageCreatedAt ?? right.updatedAt ?? right.createdAt ?? 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return Number(right.isTop) - Number(left.isTop);
  });
  trace('fetch sessions:success', { count: sessions.length });
  return sessions;
}

export async function fetchJizhiMessages(sessionId: string): Promise<JizhiChatMessage[]> {
  if (!sessionId.trim()) {
    throw new Error('Missing sessionId');
  }

  const search = new URLSearchParams({ chatId: sessionId.trim() });
  const data = await fetchJizhiApi<JizhiMessagesResponse>(`${JIZHI_CHAT_API_PREFIX}/chat/message/all?${search.toString()}`);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  trace('fetch messages:success', {
    sessionId,
    count: rows.length,
  });
  return rows;
}
