import type { CodeAgentRunRecord } from '../../shared/code-agent';

export type UnifiedGatewayLifecycleState = 'stopped' | 'starting' | 'running' | 'error' | 'reconnecting';
export type UnifiedRuntimeThreadSource = 'gateway' | 'code';

export type UnifiedRuntimeThread = {
  id: string;
  source: UnifiedRuntimeThreadSource;
  runId?: string;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
  detail: string;
  startedAt: number;
  updatedAt: number;
};

export type UnifiedRuntimeThreadSnapshot = UnifiedRuntimeThread & {
  stale: boolean;
};

export type UnifiedRuntimeSnapshot = {
  gatewayState: UnifiedGatewayLifecycleState;
  activeCount: number;
  threads: UnifiedRuntimeThreadSnapshot[];
  updatedAt: number;
};

const RUN_STALE_AFTER_MS = 90_000;
const RUN_REMOVE_AFTER_MS = 180_000;
const PRESSURE_THREAD_CAP = 8;
const CODE_THREAD_ID = 'code-agent:active';

const runtimeThreads = new Map<string, UnifiedRuntimeThread>();
const stateListeners = new Set<() => void>();

let gatewayLifecycleState: UnifiedGatewayLifecycleState = 'stopped';

function notifyStateChanged(): void {
  for (const listener of stateListeners) {
    try {
      listener();
    } catch {
      // Listener failures should not break global state propagation.
    }
  }
}

function normalizeGatewayState(state: string | undefined): UnifiedGatewayLifecycleState {
  if (state === 'running' || state === 'starting' || state === 'reconnecting' || state === 'error' || state === 'stopped') {
    return state;
  }
  return 'stopped';
}

export function normalizeAgentIdFromSessionKey(sessionKey?: string): string {
  const raw = typeof sessionKey === 'string' ? sessionKey.trim() : '';
  if (!raw.startsWith('agent:')) return 'main';
  const [, agentId] = raw.split(':');
  return agentId?.trim() || 'main';
}

function trimSingleLine(value: string, maxLength = 46): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function extractToolLineFromMessage(message: Record<string, unknown>): string {
  const content = message.content;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const item = block as Record<string, unknown>;
      if (item.type === 'tool_use' || item.type === 'toolCall') {
        const toolName = String(item.name ?? item.function ?? '').trim();
        const input = item.input && typeof item.input === 'object'
          ? item.input as Record<string, unknown>
          : {};
        const command = input.command ?? input.cmd ?? input.script ?? input.code;
        if (typeof command === 'string' && command.trim()) {
          return trimSingleLine(`${toolName || 'tool'} ${command.split('\n')[0]}`, 48);
        }
        const pathLike = input.path ?? input.file_path ?? input.filepath;
        if (typeof pathLike === 'string' && pathLike.trim()) {
          const compactPath = pathLike.split(/[\\/]/).slice(-2).join('/');
          return trimSingleLine(`${toolName || 'tool'} ${compactPath}`, 48);
        }
        if (toolName) return trimSingleLine(toolName, 48);
      }
    }

    for (let index = content.length - 1; index >= 0; index -= 1) {
      const block = content[index];
      if (!block || typeof block !== 'object') continue;
      const item = block as Record<string, unknown>;
      if (item.type === 'text' && typeof item.text === 'string' && item.text.trim()) {
        const lastLine = item.text.trim().split('\n').filter(Boolean).pop();
        if (lastLine) return trimSingleLine(lastLine, 48);
      }
    }
  }

  if (typeof content === 'string' && content.trim()) {
    const lastLine = content.trim().split('\n').filter(Boolean).pop();
    if (lastLine) return trimSingleLine(lastLine, 48);
  }

  const toolCalls = (message.tool_calls ?? message.toolCalls) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const firstCall = toolCalls[0] as Record<string, unknown>;
    const fn = firstCall.function as Record<string, unknown> | undefined;
    const toolName = String(fn?.name ?? firstCall.name ?? '').trim();
    if (toolName) return trimSingleLine(toolName, 48);
  }

  return '';
}

function summarizeGatewayDetail(message: unknown): string {
  if (!message || typeof message !== 'object') return '等待响应';
  const line = extractToolLineFromMessage(message as Record<string, unknown>);
  return line || '处理中';
}

function summarizeCodePrompt(prompt: unknown): string {
  if (typeof prompt !== 'string' || !prompt.trim()) return '处理中';
  return trimSingleLine(prompt.split('\n').filter(Boolean)[0] || prompt, 48);
}

function clampPressure(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isThreadStale(thread: UnifiedRuntimeThread, now = Date.now()): boolean {
  return now - thread.updatedAt > RUN_STALE_AFTER_MS;
}

function pruneRuntimeThreads(now = Date.now()): boolean {
  let changed = false;
  for (const [id, thread] of runtimeThreads) {
    if (now - thread.updatedAt > RUN_REMOVE_AFTER_MS) {
      runtimeThreads.delete(id);
      changed = true;
    }
  }
  return changed;
}

function ensurePruned(now = Date.now()): void {
  if (pruneRuntimeThreads(now)) {
    notifyStateChanged();
  }
}

function upsertRuntimeThread(thread: UnifiedRuntimeThread): void {
  runtimeThreads.set(thread.id, thread);
  notifyStateChanged();
}

function removeRuntimeThreadById(threadId: string): void {
  if (!runtimeThreads.delete(threadId)) return;
  notifyStateChanged();
}

function resolveGatewayThreadId(runId?: string, sessionKey?: string): string | null {
  const normalizedRunId = typeof runId === 'string' ? runId.trim() : '';
  if (normalizedRunId) return `gateway:${normalizedRunId}`;
  const normalizedSessionKey = typeof sessionKey === 'string' ? sessionKey.trim() : '';
  if (normalizedSessionKey) return `gateway:${normalizedSessionKey}`;
  return null;
}

export function subscribeUnifiedSessionState(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function getUnifiedSessionGatewayState(): UnifiedGatewayLifecycleState {
  return gatewayLifecycleState;
}

export function setUnifiedGatewayLifecycleState(state: string | undefined): void {
  const nextState = normalizeGatewayState(state);
  let changed = false;

  if (nextState !== gatewayLifecycleState) {
    gatewayLifecycleState = nextState;
    changed = true;
  }

  if (nextState === 'stopped') {
    for (const [id, thread] of runtimeThreads) {
      if (thread.source === 'gateway') {
        runtimeThreads.delete(id);
        changed = true;
      }
    }
  }

  if (pruneRuntimeThreads(Date.now())) {
    changed = true;
  }

  if (changed) {
    notifyStateChanged();
  }
}

export function recordUnifiedGatewayStarted(payload: {
  runId?: string;
  sessionKey?: string;
  message?: unknown;
  startedAt?: unknown;
}): void {
  const threadId = resolveGatewayThreadId(payload.runId, payload.sessionKey);
  if (!threadId) return;
  const now = Date.now();
  const startedAt = typeof payload.startedAt === 'number' && Number.isFinite(payload.startedAt)
    ? payload.startedAt
    : now;
  const sessionKey = payload.sessionKey?.trim();
  upsertRuntimeThread({
    id: threadId,
    source: 'gateway',
    runId: payload.runId?.trim() || undefined,
    sessionKey,
    agentId: normalizeAgentIdFromSessionKey(sessionKey),
    detail: summarizeGatewayDetail(payload.message),
    startedAt,
    updatedAt: now,
  });
}

export function recordUnifiedGatewayProgress(payload: {
  runId?: string;
  sessionKey?: string;
  message?: unknown;
}): void {
  const threadId = resolveGatewayThreadId(payload.runId, payload.sessionKey);
  if (!threadId) return;
  const existing = runtimeThreads.get(threadId);
  const now = Date.now();
  const sessionKey = payload.sessionKey?.trim() || existing?.sessionKey;
  upsertRuntimeThread({
    id: threadId,
    source: 'gateway',
    runId: payload.runId?.trim() || existing?.runId,
    sessionKey,
    agentId: existing?.agentId || normalizeAgentIdFromSessionKey(sessionKey),
    detail: summarizeGatewayDetail(payload.message) || existing?.detail || '处理中',
    startedAt: existing?.startedAt || now,
    updatedAt: now,
  });
}

export function recordUnifiedGatewayCompleted(payload: {
  runId?: string;
  sessionKey?: string;
}): void {
  const threadId = resolveGatewayThreadId(payload.runId, payload.sessionKey);
  if (!threadId) return;
  removeRuntimeThreadById(threadId);
}

export function recordUnifiedCodeRunStarted(payload: CodeAgentRunRecord | null | undefined): void {
  const now = Date.now();
  const sessionId = payload?.request?.sessionId?.trim() || undefined;
  upsertRuntimeThread({
    id: CODE_THREAD_ID,
    source: 'code',
    sessionId,
    detail: summarizeCodePrompt(payload?.request?.prompt),
    startedAt: payload?.startedAt && Number.isFinite(payload.startedAt) ? payload.startedAt : now,
    updatedAt: now,
  });
}

export function recordUnifiedCodeActivity(payload: { toolName?: string; inputSummary?: string } | null | undefined): void {
  const existing = runtimeThreads.get(CODE_THREAD_ID);
  if (!existing) return;
  const tool = typeof payload?.toolName === 'string' ? payload.toolName.trim() : '';
  const summary = typeof payload?.inputSummary === 'string' ? payload.inputSummary.trim() : '';
  const nextDetail = trimSingleLine([tool, summary].filter(Boolean).join(' '), 48) || existing.detail;
  upsertRuntimeThread({
    ...existing,
    detail: nextDetail,
    updatedAt: Date.now(),
  });
}

export function recordUnifiedCodeRunFinished(): void {
  removeRuntimeThreadById(CODE_THREAD_ID);
}

export function getUnifiedSessionActiveThreads(now = Date.now()): UnifiedRuntimeThread[] {
  ensurePruned(now);
  return [...runtimeThreads.values()]
    .filter((thread) => !isThreadStale(thread, now))
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export function getUnifiedSessionMostRecentActiveThread(now = Date.now()): UnifiedRuntimeThread | null {
  const [latest] = getUnifiedSessionActiveThreads(now);
  return latest || null;
}

export function getUnifiedSessionRuntimeThreadById(threadId: string): UnifiedRuntimeThread | null {
  const normalized = threadId.trim();
  if (!normalized) return null;
  ensurePruned(Date.now());
  return runtimeThreads.get(normalized) || null;
}

export function getUnifiedSessionRuntimeSnapshot(now = Date.now()): UnifiedRuntimeSnapshot {
  ensurePruned(now);
  const threads = [...runtimeThreads.values()]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map((thread) => ({
      ...thread,
      stale: isThreadStale(thread, now),
    }));

  return {
    gatewayState: gatewayLifecycleState,
    activeCount: threads.length,
    threads,
    updatedAt: now,
  };
}

export function getUnifiedSessionPressure(now = Date.now()): number {
  const activeCount = getUnifiedSessionActiveThreads(now).length;
  return clampPressure((activeCount / PRESSURE_THREAD_CAP) * 100);
}

export function resetUnifiedSessionState(): void {
  runtimeThreads.clear();
  gatewayLifecycleState = 'stopped';
  notifyStateChanged();
}
