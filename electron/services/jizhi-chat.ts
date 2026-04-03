import { randomUUID } from 'node:crypto';
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

type JizhiTopicCategory = 'llm' | 'agent';

type JizhiTopicFormConfig = {
  model?: string[];
  [key: string]: unknown;
};

type JizhiTopicFormRow = {
  id?: number;
  config?: JizhiTopicFormConfig;
  [key: string]: unknown;
};

type JizhiTopicFormResponse = {
  row?: JizhiTopicFormRow;
  form?: Record<string, unknown>;
  formConfig?: unknown[];
};

type JizhiSendMessageParams = {
  sessionId: string;
  prompt: string;
  category: string;
  fallbackModel?: string;
  messageUUID?: string;
};

type JizhiSendMessageResponse = {
  messageUUID?: string;
  [key: string]: unknown;
};

type JizhiRetryMessageParams = {
  sessionId: string;
  messageUUID: string;
  category: string;
  model: string;
};

type JizhiRetryMessageResponse = {
  messageUUID?: string;
  [key: string]: unknown;
};

type JizhiStopMessageResponse = {
  success?: boolean;
  [key: string]: unknown;
};

type JizhiActiveMessageResponse = {
  success?: boolean;
  [key: string]: unknown;
};

type JizhiStreamEventType = 'chunk' | 'result' | 'error' | 'end';

type JizhiStreamChunkData = {
  blockUUID?: string;
  parentMessageUUID?: string;
  contentType?: string;
  content?: string;
  [key: string]: unknown;
};

type JizhiStreamPayload = {
  data?: JizhiStreamChunkData;
  [key: string]: unknown;
};

export type JizhiStreamEvent = {
  event: JizhiStreamEventType;
  id?: string;
  payload?: JizhiStreamPayload | null;
};

function trace(step: string, payload?: Record<string, unknown>): void {
  logger.info(`[jizhi-trace][service] ${step}`, payload ?? {});
}

/**
 * Produce a terminal-friendly summary of an API response payload.
 * Strings longer than MAX_STR chars are replaced with a `[N chars]` stub,
 * arrays are capped at MAX_ARR items, and nesting is capped at MAX_DEPTH.
 * The full payload is still written to the log file via `trace`; this is
 * only used for the noisy request:payload terminal line.
 */
const MAX_STR   = 120;
const MAX_ARR   = 4;
const MAX_DEPTH = 3;

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[…]';
  if (typeof value === 'string') {
    return value.length > MAX_STR
      ? `${value.slice(0, MAX_STR)}… [+${value.length - MAX_STR} chars]`
      : value;
  }
  if (Array.isArray(value)) {
    const preview = value.slice(0, MAX_ARR).map(v => sanitizeForLog(v, depth + 1));
    if (value.length > MAX_ARR) preview.push(`… +${value.length - MAX_ARR} more` as unknown);
    return preview;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForLog(v, depth + 1);
    }
    return out;
  }
  return value;
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

function normalizeTopicCategory(value: string | undefined): JizhiTopicCategory | null {
  if (value === 'llm' || value === 'agent') return value;
  return null;
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
  trace('request:payload', sanitizeForLog({
    path,
    payload: payload ?? (rawText || null),
  }) as Record<string, unknown>);

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
  trace('fetch sessions:raw', sanitizeForLog({
    rowCount: rows.length,
    data,
  }) as Record<string, unknown>);
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

async function fetchJizhiTopicForm(
  sessionId: string,
  category: JizhiTopicCategory,
): Promise<JizhiTopicFormResponse> {
  const search = new URLSearchParams({ id: sessionId.trim() });
  const data = await fetchJizhiApi<JizhiTopicFormResponse>(
    `${JIZHI_CHAT_API_PREFIX}/topic/${category}/form?${search.toString()}`,
  );
  trace('fetch topic form:success', {
    sessionId,
    category,
    hasConfig: Boolean(data?.row?.config),
  });
  return data;
}

export async function sendJizhiMessage(params: JizhiSendMessageParams): Promise<JizhiSendMessageResponse> {
  const sessionId = params.sessionId.trim();
  const prompt = params.prompt.trim();
  const category = normalizeTopicCategory(params.category);
  const messageUUID = params.messageUUID?.trim() || `msg_${randomUUID()}`;

  if (!sessionId) {
    throw new Error('Missing sessionId');
  }
  if (!prompt) {
    throw new Error('Missing prompt');
  }
  if (!category) {
    throw new Error(`Unsupported Jizhi category: ${params.category}`);
  }

  const chatId = Number(sessionId);
  if (!Number.isFinite(chatId)) {
    throw new Error(`Invalid chatId: ${sessionId}`);
  }

  const topicForm = await fetchJizhiTopicForm(sessionId, category);
  const config = topicForm.row?.config ?? {};
  const configuredModels = Array.isArray(config.model)
    ? config.model.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  const model = configuredModels.length > 0
    ? configuredModels
    : (params.fallbackModel?.trim() ? [params.fallbackModel.trim()] : []);

  const payload = {
    messageUUID,
    chatId,
    prompt,
    model,
    file: [] as unknown[],
    config,
  };

  trace('send message:request', {
    sessionId,
    category,
    modelCount: model.length,
    hasConfig: Object.keys(config).length > 0,
  });

  const data = await fetchJizhiApi<JizhiSendMessageResponse>(
    `${JIZHI_CHAT_API_PREFIX}/chat/message/${category}/send`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  trace('send message:success', {
    sessionId,
    category,
    messageUUID: data?.messageUUID ?? messageUUID,
  });

  return {
    ...data,
    messageUUID: data?.messageUUID ?? messageUUID,
  };
}

export async function stopJizhiMessage(messageUUID: string): Promise<JizhiStopMessageResponse> {
  const normalizedMessageUUID = messageUUID.trim();
  if (!normalizedMessageUUID) {
    throw new Error('Missing messageUUID');
  }

  trace('stop message:request', {
    messageUUID: normalizedMessageUUID,
  });

  const data = await fetchJizhiApi<JizhiStopMessageResponse>(
    `${JIZHI_CHAT_API_PREFIX}/chat/message/stop`,
    {
      method: 'PUT',
      body: JSON.stringify({
        messageUUID: normalizedMessageUUID,
      }),
    },
  );

  trace('stop message:success', {
    messageUUID: normalizedMessageUUID,
  });

  return data;
}

export async function retryJizhiMessage(params: JizhiRetryMessageParams): Promise<JizhiRetryMessageResponse> {
  const sessionId = params.sessionId.trim();
  const targetMessageUUID = params.messageUUID.trim();
  const category = normalizeTopicCategory(params.category);
  const model = params.model.trim();

  if (!sessionId) {
    throw new Error('Missing sessionId');
  }
  if (!targetMessageUUID) {
    throw new Error('Missing messageUUID');
  }
  if (!category) {
    throw new Error(`Unsupported Jizhi category: ${params.category}`);
  }
  if (!model) {
    throw new Error('Missing model');
  }

  const topicForm = await fetchJizhiTopicForm(sessionId, category);
  const config = topicForm.row?.config ?? {};

  trace('retry message:request', {
    sessionId,
    targetMessageUUID,
    category,
    model,
  });

  const data = await fetchJizhiApi<JizhiRetryMessageResponse>(
    `${JIZHI_CHAT_API_PREFIX}/chat/message/${category}/retry`,
    {
      method: 'PUT',
      body: JSON.stringify({
        messageUUID: targetMessageUUID,
        model,
        config,
      }),
    },
  );

  trace('retry message:success', {
    sessionId,
    targetMessageUUID,
    retryMessageUUID: data?.messageUUID ?? null,
  });

  return data;
}

export async function activeJizhiMessage(messageUUID: string): Promise<JizhiActiveMessageResponse> {
  const normalizedMessageUUID = messageUUID.trim();
  if (!normalizedMessageUUID) {
    throw new Error('Missing messageUUID');
  }

  trace('active message:request', {
    messageUUID: normalizedMessageUUID,
  });

  const data = await fetchJizhiApi<JizhiActiveMessageResponse>(
    `${JIZHI_CHAT_API_PREFIX}/chat/message/active`,
    {
      method: 'PUT',
      body: JSON.stringify({
        messageUUID: normalizedMessageUUID,
      }),
    },
  );

  trace('active message:success', {
    messageUUID: normalizedMessageUUID,
  });

  return data;
}

function parseSseEvent(rawEvent: string): JizhiStreamEvent | null {
  const normalized = rawEvent.trim();
  if (!normalized) return null;

  let eventName = '';
  let eventId = '';
  const dataLines: string[] = [];

  for (const line of normalized.split('\n')) {
    if (!line || line.startsWith(':')) continue;

    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
      continue;
    }

    if (line.startsWith('id:')) {
      eventId = line.slice('id:'.length).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  if (eventName !== 'chunk' && eventName !== 'result' && eventName !== 'error' && eventName !== 'end') {
    return null;
  }

  const rawPayload = dataLines.join('\n').trim();
  let payload: JizhiStreamPayload | null = null;
  if (rawPayload) {
    try {
      payload = JSON.parse(rawPayload) as JizhiStreamPayload;
    } catch {
      payload = {
        data: {
          contentType: 'text',
          content: JSON.stringify({ content: rawPayload }),
        },
      };
    }
  }

  return {
    event: eventName,
    id: eventId || undefined,
    payload,
  };
}

export async function streamJizhiMessage(params: {
  messageUUID: string;
  fromSeq?: number;
  signal?: AbortSignal;
  onEvent: (event: JizhiStreamEvent) => void;
}): Promise<void> {
  const messageUUID = params.messageUUID.trim();
  if (!messageUUID) {
    throw new Error('Missing messageUUID');
  }

  const creds = await getCloudCredentials();
  const configuredApiBase = readConfiguredJizhiApiBase();
  const configuredAppBase = readConfiguredJizhiAppBase();
  const baseUrl = configuredApiBase ?? configuredAppBase ?? resolveJizhiAppBase(creds.apiUrl);
  const path = `${JIZHI_CHAT_API_PREFIX}/chat/message/stream`;
  const url = `${baseUrl}${path}`;

  trace('stream:start', {
    path,
    baseUrl,
    messageUUID,
    fromSeq: params.fromSeq ?? 0,
  });

  const response = await fetch(url, {
    method: 'POST',
    signal: params.signal,
    headers: {
      Accept: 'text/event-stream, application/json, text/plain, */*',
      Authorization: creds.token,
      Cookie: `${JIZHI_TOKEN_COOKIE_NAME}=${encodeURIComponent(creds.rawToken)}`,
      'Content-Type': 'application/json',
      'X-Client-Source': JIZHI_CLIENT_SOURCE,
    },
    body: JSON.stringify({
      messageUUID,
      fromSeq: params.fromSeq ?? 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error('极智流式接口未返回可读数据流');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    while (true) {
      const separatorIndex = buffer.indexOf('\n\n');
      if (separatorIndex === -1) break;

      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const parsedEvent = parseSseEvent(rawEvent);
      if (!parsedEvent) continue;

      trace('stream:event', {
        messageUUID,
        event: parsedEvent.event,
        id: parsedEvent.id ?? null,
      });
      params.onEvent(parsedEvent);
    }
  }

  const trailingEvent = parseSseEvent(buffer);
  if (trailingEvent) {
    trace('stream:event', {
      messageUUID,
      event: trailingEvent.event,
      id: trailingEvent.id ?? null,
      trailing: true,
    });
    params.onEvent(trailingEvent);
  }

  trace('stream:complete', { messageUUID });
}
