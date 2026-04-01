import { session } from 'electron';
import { logger } from '../utils/logger';

const REMOTE_MESSENGER_PARTITION = 'persist:jizhi-remote-chat';
const REMOTE_MESSENGER_ORIGIN = 'https://im.4399om.com';
const REMOTE_MESSENGER_REFERER = `${REMOTE_MESSENGER_ORIGIN}/main/messenger`;
const REMOTE_MESSENGER_API_BASE = 'https://messenger-api.4399om.com';
const REMOTE_MESSENGER_IM_VERSION = '5.2.7-b260';
const DEFAULT_PAGE_SIZE = 20;

function traceXiaojiu(step: string, payload?: Record<string, unknown>): void {
  logger.info(`[xiaojiu-trace][service] ${step}`, payload ?? {});
}

export interface XiaojiuAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  url?: string;
  name?: string;
  mimeType?: string;
}

export interface XiaojiuSession {
  id: string;
  name: string;
  avatar?: string;
  unreadCount: number;
  draftText?: string;
  updatedAt?: number;
  sortIndex: number;
  lastMsgId?: string | null;
}

export interface XiaojiuMessage {
  id: string;
  sessionId: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  isSelf: boolean;
  type?: string;
  text?: string;
  timestamp?: number;
  attachments: XiaojiuAttachment[];
  raw: Record<string, unknown>;
}

export interface XiaojiuMessagePage {
  messages: XiaojiuMessage[];
  hasMore: boolean;
  oldestMessageId: string | null;
}

type RemoteCookieJar = {
  Authorization?: string;
  PERMISSION_TOKEN?: string;
  lastLoginStaffId?: string;
  lastLoginStaffNo?: string;
  info_im_x_token?: string;
  [key: string]: string | undefined;
};

type ApiEnvelope = {
  code?: number | string;
  msg?: string;
  message?: string;
  data?: unknown;
  result?: unknown;
  [key: string]: unknown;
};

function normalizeTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric > 1e12 ? numeric : numeric * 1000;
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function compareMessageIdValues(left: string, right: string): number {
  const normalizedLeft = left.trim();
  const normalizedRight = right.trim();

  if (/^\d+$/.test(normalizedLeft) && /^\d+$/.test(normalizedRight)) {
    if (normalizedLeft.length !== normalizedRight.length) {
      return normalizedLeft.length - normalizedRight.length;
    }
    return normalizedLeft.localeCompare(normalizedRight);
  }

  const leftNumber = Number(normalizedLeft);
  const rightNumber = Number(normalizedRight);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return normalizedLeft.localeCompare(normalizedRight);
}

function collectLikelyMessageIds(...values: unknown[]): string[] {
  const seen = new Set<string>();

  values.forEach((value) => {
    const items = Array.isArray(value) ? value : [value];
    items.forEach((item) => {
      if (typeof item !== 'string') return;
      const normalized = item.trim();
      if (!normalized) return;
      seen.add(normalized);
    });
  });

  return Array.from(seen).sort((left, right) => compareMessageIdValues(right, left));
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

function findArrayByKeys(
  input: unknown,
  keys: string[],
  depth = 0,
  visited = new WeakSet<object>(),
): Record<string, unknown>[] | null {
  if (depth > 6 || input == null) return null;

  if (Array.isArray(input)) {
    return input.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  }

  if (typeof input !== 'object') return null;
  if (visited.has(input)) return null;
  visited.add(input);

  const record = input as Record<string, unknown>;
  for (const key of keys) {
    const nested = findArrayByKeys(record[key], keys, depth + 1, visited);
    if (nested) return nested;
  }

  for (const value of Object.values(record)) {
    const nested = findArrayByKeys(value, keys, depth + 1, visited);
    if (nested) return nested;
  }

  return null;
}

function collectUrls(input: unknown, acc: string[] = []): string[] {
  if (!input || acc.length >= 4) return acc;

  if (typeof input === 'string') {
    const value = input.trim();
    if (/^https?:\/\//i.test(value)) acc.push(value);
    return acc;
  }

  if (Array.isArray(input)) {
    input.forEach((item) => collectUrls(item, acc));
    return acc;
  }

  if (typeof input === 'object') {
    Object.entries(input).forEach(([key, value]) => {
      if (acc.length >= 4) return;
      if (/url|src|image|thumb|download/i.test(key)) {
        collectUrls(value, acc);
        return;
      }
      if (typeof value === 'object') {
        collectUrls(value, acc);
      }
    });
  }

  return acc;
}

function extractText(input: unknown, depth = 0): string {
  if (depth > 4 || input == null) return '';

  if (typeof input === 'string') return input.trim();

  if (Array.isArray(input)) {
    return input
      .map((item) => extractText(item, depth + 1))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (typeof input === 'object') {
    const record = input as Record<string, unknown>;
    if (Array.isArray(record.blocks)) {
      return record.blocks
        .map((block) => (
          block && typeof block === 'object' && typeof (block as { text?: unknown }).text === 'string'
            ? ((block as { text: string }).text || '').trim()
            : ''
        ))
        .filter(Boolean)
        .join('\n')
        .trim();
    }

    const direct = firstString(
      record.text,
      record.content,
      record.msgContent,
      record.message,
      record.messageContent,
      record.plainText,
      record.richText,
      record.md,
      record.markdown,
      record.body,
    );
    if (direct) return direct;

    return [
      'text',
      'content',
      'msgContent',
      'message',
      'messageContent',
      'plainText',
      'richText',
      'md',
      'markdown',
      'body',
    ]
      .map((key) => extractText(record[key], depth + 1))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return '';
}

function normalizeAttachmentType(value: unknown, url: string | undefined, mimeType: string | undefined): XiaojiuAttachment['type'] {
  const raw = String(value || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();
  const href = String(url || '').toLowerCase();

  if (raw.includes('image') || mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(href)) {
    return 'image';
  }
  if (raw.includes('video') || mime.startsWith('video/') || /\.(mp4|mov|webm|m4v)(\?|$)/.test(href)) {
    return 'video';
  }
  if (raw.includes('audio') || mime.startsWith('audio/') || /\.(mp3|wav|aac|m4a|ogg)(\?|$)/.test(href)) {
    return 'audio';
  }
  return 'file';
}

function toAttachments(raw: Record<string, unknown>): XiaojiuAttachment[] {
  const parsed = parseJsonValue(raw.content ?? raw.msgContent ?? raw.payload ?? raw.body);
  const urls = collectUrls([
    raw.url,
    raw.src,
    raw.downloadUrl,
    raw.thumbUrl,
    raw.imageUrl,
    parsed,
    raw.fileInfo,
    raw.imageList,
  ]);

  return urls.slice(0, 2).map((url) => ({
    type: normalizeAttachmentType(raw.type ?? raw.msgType ?? raw.messageType, url, firstString(raw.mimeType, raw.mediaType)),
    url,
    name: firstString(raw.fileName, raw.name, raw.title),
    mimeType: firstString(raw.mimeType, raw.mediaType) || undefined,
  }));
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function parseEnvelope(payload: unknown): { envelope: ApiEnvelope | null; data: unknown } {
  const parsed = parseJsonValue(payload);
  const envelope = parsed && typeof parsed === 'object' ? parsed as ApiEnvelope : null;
  const data = envelope ? (envelope.data ?? envelope.result ?? envelope) : parsed;
  return { envelope, data };
}

function ensureSuccess(envelope: ApiEnvelope | null, fallbackMessage: string): void {
  const code = envelope?.code;
  if (code == null || code === '') return;

  const normalized = String(code);
  if (normalized === '200' || normalized === '0') return;

  const message = firstString(envelope?.msg, envelope?.message, fallbackMessage) || fallbackMessage;
  throw new Error(message);
}

function compareMessagesByOrder(
  left: Pick<XiaojiuMessage, 'id' | 'timestamp'>,
  right: Pick<XiaojiuMessage, 'id' | 'timestamp'>,
): number {
  const leftTime = left.timestamp ?? 0;
  const rightTime = right.timestamp ?? 0;
  if (leftTime !== rightTime) return leftTime - rightTime;
  return compareMessageIdValues(left.id, right.id);
}

function resolveHasMore(
  envelope: Record<string, unknown> | null,
  data: Record<string, unknown>,
  list: XiaojiuMessage[],
  pageSize: number,
): boolean {
  // isFirst: true means we've reached the oldest messages — no more older messages to load
  const isFirst = data.isFirst ?? envelope?.isFirst;
  if (typeof isFirst === 'boolean') return !isFirst;

  const explicitHasMore = [
    data.hasMore,
    data.hasNext,
    data.more,
    envelope?.hasMore,
    envelope?.hasNext,
    envelope?.more,
  ].find((value) => typeof value === 'boolean');

  if (typeof explicitHasMore === 'boolean') return explicitHasMore;

  const explicitIsEnd = [
    data.isEnd,
    data.ended,
    envelope?.isEnd,
    envelope?.ended,
  ].find((value) => typeof value === 'boolean');

  if (typeof explicitIsEnd === 'boolean') return !explicitIsEnd;

  const total = firstNumber(
    data.total,
    data.totalCount,
    envelope?.total,
    envelope?.totalCount,
  );
  if (typeof total === 'number' && total > 0) {
    return list.length < total;
  }

  return list.length >= pageSize;
}

function normalizeSession(entry: Record<string, unknown>, index: number): XiaojiuSession | null {
  const id = firstString(entry.id, entry.snSessionId, entry.sessionId);
  if (!id) return null;

  const parsedDraft = parseJsonValue(
    entry.draftText
    ?? entry.lastMsgPreview
    ?? entry.lastContent
    ?? entry.lastMessage
    ?? entry.content
    ?? entry.msgContent,
  );

  const lastMsgId = collectLikelyMessageIds(
    entry.lastMsgId,
    entry.latestMsgId,
    entry.lastMessageId,
    entry.maxMsgId,
    entry.newestMsgId,
    entry.lastSyncMsgId,
    entry.lastReadMsgId,
    entry.jumpMsgId,
  )[0] || null;

  return {
    id,
    name: firstString(
      entry.name,
      entry.sessionName,
      entry.showName,
      entry.displayName,
      entry.title,
      entry.nickName,
      entry.nickname,
      entry.snSessionName,
      id,
    ) || id,
    avatar: firstString(entry.avatar, entry.sessionAvatar) || undefined,
    unreadCount: firstNumber(entry.unreadCount, entry.unread, entry.unreadNum) ?? 0,
    draftText: firstString(extractText(parsedDraft)) || undefined,
    updatedAt: [
      entry.updatedAt,
      entry.updateTime,
      entry.lastMessageTime,
      entry.lastMsgTime,
      entry.sendTime,
      entry.gmtModified,
      entry.time,
    ]
      .map(normalizeTimestamp)
      .find((value): value is number => typeof value === 'number'),
    sortIndex: index,
    lastMsgId,
  };
}

function normalizeMessage(
  sessionId: string,
  entry: Record<string, unknown>,
  index: number,
  viewerHints: string[],
): XiaojiuMessage {
  const parsedContent = parseJsonValue(
    entry.content
    ?? entry.msgContent
    ?? entry.payload
    ?? entry.body
    ?? entry.message
    ?? entry.text,
  );

  const senderId = firstString(entry.senderId, entry.sender, entry.fromUid, entry.uid) || undefined;
  const text = firstString(
    extractText(parsedContent),
    extractText(entry.messageContent),
    extractText(entry.lastContent),
  );

  return {
    id: firstString(entry.id, entry.msgId, entry.snMsgId, entry.clientMsgId, String(index)),
    sessionId,
    senderId,
    senderName: firstString(
      entry.senderName,
      entry.staffName,
      entry.userName,
      entry.fromName,
      entry.nickname,
      entry.name,
      entry.nickName,
      senderId,
      '未知发送者',
    ),
    senderAvatar: firstString(entry.senderAvatar, entry.avatar, entry.fromAvatar) || undefined,
    isSelf:
      entry.isSelf === true
      || entry.self === true
      || entry.mine === true
      || entry.isMine === true
      || (!!senderId && viewerHints.includes(senderId)),
    type: firstString(entry.type, entry.msgType, entry.messageType) || undefined,
    text: text || undefined,
    timestamp: normalizeTimestamp(
      entry.sendTime
      ?? entry.timestamp
      ?? entry.createTime
      ?? entry.gmtCreate
      ?? entry.time,
    ),
    attachments: toAttachments(entry),
    raw: entry,
  };
}

function uniqueSessions(sessions: XiaojiuSession[]): XiaojiuSession[] {
  const byId = new Map<string, XiaojiuSession>();
  sessions.forEach((session, index) => {
    byId.set(session.id, {
      ...session,
      sortIndex: index,
    });
  });

  return Array.from(byId.values()).sort((left, right) => {
    const leftTime = left.updatedAt ?? 0;
    const rightTime = right.updatedAt ?? 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return left.sortIndex - right.sortIndex;
  });
}

async function getCookieJar(): Promise<RemoteCookieJar> {
  const partitionSession = session.fromPartition(REMOTE_MESSENGER_PARTITION);
  const cookieSets = await Promise.all([
    partitionSession.cookies.get({ url: REMOTE_MESSENGER_ORIGIN }).catch(() => []),
    partitionSession.cookies.get({ url: REMOTE_MESSENGER_API_BASE }).catch(() => []),
  ]);

  const jar: RemoteCookieJar = {};
  cookieSets.flat().forEach((cookie) => {
    jar[cookie.name] = cookie.value;
  });
  return jar;
}

function buildCookieHeader(jar: RemoteCookieJar): string {
  return Object.entries(jar)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function postMessengerApi(path: string, body: Record<string, unknown>): Promise<unknown> {
  const jar = await getCookieJar();
  const authToken = jar.Authorization || jar.info_im_x_token;
  if (!authToken) {
    throw new Error('小九 Messenger 未登录，缺少 Authorization cookie');
  }

  traceXiaojiu('post api:start', {
    path,
    body,
  });

  const form = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    if (value == null || value === '') return;
    form.append(key, String(value));
  });

  const response = await fetch(`${REMOTE_MESSENGER_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Cookie: buildCookieHeader(jar),
      'IM-Version': REMOTE_MESSENGER_IM_VERSION,
      Origin: REMOTE_MESSENGER_ORIGIN,
      Referer: `${REMOTE_MESSENGER_REFERER}`,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Token': authToken,
    },
    body: form.toString(),
  });

  const text = await response.text();
  const { envelope } = parseEnvelope(text);

  traceXiaojiu('post api:response', {
    path,
    status: response.status,
    ok: response.ok,
    code: envelope?.code ?? null,
    message: firstString(envelope?.msg, envelope?.message) || null,
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(firstString(envelope?.msg, envelope?.message, '小九 Messenger 登录已失效'));
  }

  if (!response.ok) {
    throw new Error(firstString(envelope?.msg, envelope?.message, `HTTP ${response.status}`));
  }

  return text;
}

async function fetchSessionInfo(sessionId: string): Promise<Record<string, unknown> | null> {
  try {
    const payload = await postMessengerApi('/session/session-info', { snSessionId: sessionId });
    const { envelope, data } = parseEnvelope(payload);
    ensureSuccess(envelope, '获取会话信息失败');
    return toRecord(data);
  } catch {
    return null;
  }
}

function findLikelyLatestMessageIds(data: Record<string, unknown> | null): string[] {
  if (!data) return [];

  return collectLikelyMessageIds(
    data.latestMsgId,
    data.lastMsgId,
    data.msgId,
    data.jumpMsgId,
    data.lastMessageId,
    data.lastReadMsgId,
  );
}

export async function fetchXiaojiuSessions(): Promise<XiaojiuSession[]> {
  traceXiaojiu('fetch sessions:start');
  const [topPayload, listPayload] = await Promise.all([
    postMessengerApi('/session/top-list', {}).catch(() => null),
    postMessengerApi('/session/list', {}),
  ]);

  const payloads = [topPayload, listPayload].filter((value): value is unknown => value != null);
  const collected: XiaojiuSession[] = [];

  payloads.forEach((payload) => {
    const { envelope, data } = parseEnvelope(payload);
    ensureSuccess(envelope, '获取小九会话列表失败');
    const list = findArrayByKeys(data, ['list', 'rows', 'records', 'result', 'data'])
      || findArrayByKeys(envelope, ['list', 'rows', 'records', 'result', 'data']);
    if (!list) return;

    list.forEach((item, index) => {
      const normalized = normalizeSession(item, collected.length + index);
      if (normalized) collected.push(normalized);
    });
  });

  const sessions = uniqueSessions(collected);
  traceXiaojiu('fetch sessions:success', {
    count: sessions.length,
    ids: sessions.slice(0, 5).map((session) => session.id),
  });
  return sessions;
}

function resolveMessageCandidates(
  sessionId: string,
  mode: 'latest' | 'older',
  anchorMsgId: string | null,
  sessionInfo: Record<string, unknown> | null,
  pageSize: number,
  providedLatestMsgId?: string | null,
): Array<Record<string, unknown>> {
  if (mode === 'older') {
    // anchorMsgId is the oldest message ID we currently have — pass as msgId so the API
    // returns the page of messages that precede it.
    const anchor = anchorMsgId || null;
    return [
      { snSessionId: sessionId, msgId: anchor, next: 1, jump: 2, pageSize, listen: true },
      { snSessionId: sessionId, msgId: anchor, next: 1, jump: 2, pageSize, listen: 'true' },
      { snSessionId: sessionId, msgId: anchor, next: 1, jump: 2, pageSize: Math.max(pageSize, 50) },
      { snSessionId: sessionId, msgId: anchor, next: 1, jump: 2, pageSize },
    ];
  }

  // For latest mode: msgId MUST be the most recent message ID in the session so the
  // API returns the newest page (isLatest: true). Without a valid msgId the API returns
  // from the very beginning of history. Try, in priority order:
  //   1. latestMsgId passed directly from the session list (most reliable)
  //   2. latestMsgId extracted from the session-info endpoint
  //   3. Fallbacks without msgId
  const latestMsgIds = collectLikelyMessageIds(
    providedLatestMsgId,
    findLikelyLatestMessageIds(sessionInfo),
  );

  const base = { snSessionId: sessionId, next: 1, jump: 2, pageSize, listen: true as boolean | string };
  const latestCandidates: Array<Record<string, unknown>> = [];
  latestMsgIds.forEach((msgId) => {
    latestCandidates.push({ ...base, msgId });
    latestCandidates.push({ ...base, msgId, listen: 'true' });
  });

  return [
    ...latestCandidates,
    // Fallbacks when no latestMsgId is available — these may return oldest messages
    { ...base },
    { ...base, listen: 'true' },
    { snSessionId: sessionId, head: true, pageSize },
    { snSessionId: sessionId, head: true, pageSize: Math.max(pageSize, 50) },
    { snSessionId: sessionId, pageSize },
  ];
}

export async function fetchXiaojiuMessages(options: {
  sessionId: string;
  mode?: 'latest' | 'older';
  anchorMsgId?: string | null;
  latestMsgId?: string | null;
  pageSize?: number;
}): Promise<XiaojiuMessagePage> {
  const sessionId = options.sessionId;
  const mode = options.mode ?? 'latest';
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  traceXiaojiu('fetch messages:start', {
    sessionId,
    mode,
    anchorMsgId: options.anchorMsgId ?? null,
    latestMsgId: options.latestMsgId ?? null,
    pageSize,
  });
  const sessionInfo = await fetchSessionInfo(sessionId);
  const viewerHints = [
    firstString(sessionInfo?.uid),
    firstString(sessionInfo?.userId),
    firstString(sessionInfo?.staffId),
    firstString(sessionInfo?.sender),
  ].filter(Boolean);

  const candidates = resolveMessageCandidates(
    sessionId,
    mode,
    options.anchorMsgId ?? null,
    sessionInfo,
    pageSize,
    options.latestMsgId ?? null,
  );

  const successfulPages: XiaojiuMessagePage[] = [];
  let firstError: Error | null = null;

  for (const payload of candidates) {
    try {
      traceXiaojiu('fetch messages:try payload', {
        sessionId,
        mode,
        payload,
      });
      const responsePayload = await postMessengerApi('/message/list', payload);
      const { envelope, data } = parseEnvelope(responsePayload);
      ensureSuccess(envelope, '获取小九消息失败');

      const list = findArrayByKeys(data, ['list', 'messageList', 'messages', 'rows', 'records', 'result', 'data'])
        || findArrayByKeys(envelope, ['list', 'messageList', 'messages', 'rows', 'records', 'result', 'data']);
      if (!list) continue;

      const messages = list
        .map((item, index) => normalizeMessage(sessionId, item, index, viewerHints))
        .sort(compareMessagesByOrder);

      successfulPages.push({
        messages,
        hasMore: resolveHasMore(toRecord(envelope), toRecord(data), messages, pageSize),
        oldestMessageId: messages[0]?.id ?? null,
      });

      traceXiaojiu('fetch messages:payload success', {
        sessionId,
        mode,
        payload,
        count: messages.length,
        hasMore: successfulPages[successfulPages.length - 1]?.hasMore ?? false,
        oldestMessageId: messages[0]?.id ?? null,
        newestMessageId: messages[messages.length - 1]?.id ?? null,
      });

      if (mode === 'older') {
        break;
      }
    } catch (error) {
      traceXiaojiu('fetch messages:payload error', {
        sessionId,
        mode,
        payload,
        message: error instanceof Error ? error.message : String(error),
      });
      if (!firstError) {
        firstError = error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  if (successfulPages.length === 0) {
    throw firstError ?? new Error('小九消息接口没有返回可识别的消息列表');
  }

  if (mode === 'older') {
    traceXiaojiu('fetch messages:final older', {
      sessionId,
      count: successfulPages[0].messages.length,
      hasMore: successfulPages[0].hasMore,
      oldestMessageId: successfulPages[0].oldestMessageId,
    });
    return successfulPages[0];
  }

  const finalPage = successfulPages.sort((left, right) => {
    const leftNewest = left.messages[left.messages.length - 1];
    const rightNewest = right.messages[right.messages.length - 1];
    if (leftNewest && rightNewest) {
      const orderResult = compareMessagesByOrder(rightNewest, leftNewest);
      if (orderResult !== 0) return orderResult;
    }
    return right.messages.length - left.messages.length;
  })[0];

  traceXiaojiu('fetch messages:final latest', {
    sessionId,
    count: finalPage.messages.length,
    hasMore: finalPage.hasMore,
    oldestMessageId: finalPage.oldestMessageId,
    newestMessageId: finalPage.messages[finalPage.messages.length - 1]?.id ?? null,
  });

  return finalPage;
}
