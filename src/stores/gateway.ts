/**
 * Gateway State Store
 * Uses Host API + SSE for lifecycle/status and a direct renderer WebSocket for runtime RPC.
 */
import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import { subscribeHostEvent } from '@/lib/host-events';
import type { GatewayStatus } from '../types/gateway';

let gatewayInitPromise: Promise<void> | null = null;
let gatewayEventUnsubscribers: Array<() => void> | null = null;
const gatewayEventDedupe = new Map<string, number>();
const GATEWAY_EVENT_DEDUPE_TTL_MS = 30_000;
const LOAD_SESSIONS_MIN_INTERVAL_MS = 1_200;
const LOAD_HISTORY_MIN_INTERVAL_MS = 800;
let lastLoadSessionsAt = 0;
let lastLoadHistoryAt = 0;

interface GatewayHealth {
  ok: boolean;
  error?: string;
  uptime?: number;
}

interface GatewayState {
  status: GatewayStatus;
  health: GatewayHealth | null;
  isInitialized: boolean;
  lastError: string | null;
  init: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  checkHealth: () => Promise<GatewayHealth>;
  rpc: <T>(method: string, params?: unknown, timeoutMs?: number) => Promise<T>;
  setStatus: (status: GatewayStatus) => void;
  clearError: () => void;
}

function pruneGatewayEventDedupe(now: number): void {
  for (const [key, ts] of gatewayEventDedupe) {
    if (now - ts > GATEWAY_EVENT_DEDUPE_TTL_MS) {
      gatewayEventDedupe.delete(key);
    }
  }
}

function buildGatewayEventDedupeKey(event: Record<string, unknown>): string | null {
  const runId = event.runId != null ? String(event.runId) : '';
  const sessionKey = event.sessionKey != null ? String(event.sessionKey) : '';
  const seq = event.seq != null ? String(event.seq) : '';
  const state = event.state != null ? String(event.state) : '';
  if (runId || sessionKey || seq || state) {
    return [runId, sessionKey, seq, state].join('|');
  }
  const message = event.message;
  if (message && typeof message === 'object') {
    const msg = message as Record<string, unknown>;
    const messageId = msg.id != null ? String(msg.id) : '';
    const stopReason = msg.stopReason ?? msg.stop_reason;
    if (messageId || stopReason) {
      return `msg|${messageId}|${String(stopReason ?? '')}`;
    }
  }
  return null;
}

function shouldProcessGatewayEvent(event: Record<string, unknown>): boolean {
  const key = buildGatewayEventDedupeKey(event);
  if (!key) return true;
  const now = Date.now();
  pruneGatewayEventDedupe(now);
  if (gatewayEventDedupe.has(key)) {
    return false;
  }
  gatewayEventDedupe.set(key, now);
  return true;
}

function maybeLoadSessions(
  state: { loadSessions: () => Promise<void> },
  force = false,
): void {
  const now = Date.now();
  if (!force && now - lastLoadSessionsAt < LOAD_SESSIONS_MIN_INTERVAL_MS) return;
  lastLoadSessionsAt = now;
  void state.loadSessions();
}

function maybeLoadHistory(
  state: { loadHistory: (quiet?: boolean) => Promise<void> },
  force = false,
): void {
  const now = Date.now();
  if (!force && now - lastLoadHistoryAt < LOAD_HISTORY_MIN_INTERVAL_MS) return;
  lastLoadHistoryAt = now;
  void state.loadHistory(true);
}

function extractPetTerminalLine(message: Record<string, unknown>): string | null {
  const content = message.content;

  if (Array.isArray(content)) {
    // Tool calls are highest priority
    for (const block of content) {
      if (typeof block !== 'object' || block === null) continue;
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_use' || b.type === 'toolCall') {
        const toolName = String(b.name ?? b.function ?? '');
        const input = typeof b.input === 'object' && b.input !== null ? b.input as Record<string, unknown> : {};
        const cmd = input.command ?? input.cmd ?? input.script ?? input.code;
        if (cmd) return `$ ${String(cmd).split('\n')[0].slice(0, 60)}`;
        const filePath = input.path ?? input.file_path ?? input.filepath;
        if (filePath) return `› ${toolName} ${String(filePath).split(/[\\/]/).slice(-2).join('/')}`;
        if (toolName) return `› ${toolName}`;
      }
    }
    // Fall back to last non-empty text block
    for (let i = content.length - 1; i >= 0; i--) {
      const block = content[i] as Record<string, unknown>;
      if (typeof block !== 'object' || block === null) continue;
      if (block.type === 'text' && typeof block.text === 'string') {
        const lastLine = block.text.trim().split('\n').filter(Boolean).pop() ?? '';
        if (lastLine) return lastLine.slice(0, 72);
      }
    }
  }

  if (typeof content === 'string' && content.trim()) {
    const lastLine = content.trim().split('\n').filter(Boolean).pop() ?? '';
    if (lastLine) return lastLine.slice(0, 72);
  }

  // OpenAI format: tool_calls array on message root
  const toolCalls = (message.tool_calls ?? message.toolCalls) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const tc = toolCalls[0] as Record<string, unknown>;
    const fn = tc.function as Record<string, unknown> | undefined;
    const toolName = String(fn?.name ?? tc.name ?? '');
    try {
      const args = JSON.parse(String(fn?.arguments ?? '{}')) as Record<string, unknown>;
      const cmd = args.command ?? args.cmd ?? args.script;
      if (cmd) return `$ ${String(cmd).split('\n')[0].slice(0, 60)}`;
    } catch { /* ignore */ }
    if (toolName) return `› ${toolName}`;
  }

  return null;
}

function handleGatewayNotification(notification: { method?: string; params?: Record<string, unknown> } | undefined): void {
  const payload = notification;
  if (!payload || payload.method !== 'agent' || !payload.params || typeof payload.params !== 'object') {
    return;
  }

  const p = payload.params;
  const data = (p.data && typeof p.data === 'object') ? (p.data as Record<string, unknown>) : {};
  const phase = data.phase ?? p.phase;
  const hasChatData = (p.state ?? data.state) || (p.message ?? data.message);

  if (hasChatData) {
    const normalizedEvent: Record<string, unknown> = {
      ...data,
      runId: p.runId ?? data.runId,
      sessionKey: p.sessionKey ?? data.sessionKey,
      stream: p.stream ?? data.stream,
      seq: p.seq ?? data.seq,
      state: p.state ?? data.state,
      message: p.message ?? data.message,
    };
    if (shouldProcessGatewayEvent(normalizedEvent)) {
      import('./chat')
        .then(({ useChatStore }) => {
          useChatStore.getState().handleChatEvent(normalizedEvent);
        })
        .catch(() => {});
    }

    // Push terminal line to pet floating window (agent notifications that carry a message)
    pushPetLineFromMessage(normalizedEvent.message);
  }

  const runId = p.runId ?? data.runId;
  const sessionKey = p.sessionKey ?? data.sessionKey;
  if (phase === 'started' && runId != null && sessionKey != null) {
    import('./chat')
      .then(({ useChatStore }) => {
        const state = useChatStore.getState();
        const resolvedSessionKey = String(sessionKey);
        const shouldRefreshSessions =
          resolvedSessionKey !== state.currentSessionKey
          || !state.sessions.some((session) => session.key === resolvedSessionKey);
        if (shouldRefreshSessions) {
          maybeLoadSessions(state, true);
        }

        state.handleChatEvent({
          state: 'started',
          runId,
          sessionKey: resolvedSessionKey,
        });
      })
      .catch(() => {});
  }

  if (phase === 'completed' || phase === 'done' || phase === 'finished' || phase === 'end') {
    import('./chat')
      .then(({ useChatStore }) => {
        const state = useChatStore.getState();
        const resolvedSessionKey = sessionKey != null ? String(sessionKey) : null;
        const shouldRefreshSessions = resolvedSessionKey != null && (
          resolvedSessionKey !== state.currentSessionKey
          || !state.sessions.some((session) => session.key === resolvedSessionKey)
        );
        if (shouldRefreshSessions) {
          maybeLoadSessions(state);
        }

        const matchesCurrentSession = resolvedSessionKey == null || resolvedSessionKey === state.currentSessionKey;
        const matchesActiveRun = runId != null && state.activeRunId != null && String(runId) === state.activeRunId;

        if (matchesCurrentSession || matchesActiveRun) {
          maybeLoadHistory(state);
        }
        if ((matchesCurrentSession || matchesActiveRun) && state.sending) {
          useChatStore.setState({
            sending: false,
            activeRunId: null,
            pendingFinal: false,
            lastUserMessageAt: null,
          });
        }
      })
      .catch(() => {});
  }
}

function pushPetLineFromMessage(msg: unknown): void {
  if (!msg || typeof msg !== 'object') return;
  const line = extractPetTerminalLine(msg as Record<string, unknown>);
  if (line) {
    void window.electron.ipcRenderer.invoke('pet:pushTerminalLine', line).catch(() => {});
  }
}

function handleGatewayChatMessage(data: unknown): void {
  import('./chat').then(({ useChatStore }) => {
    const chatData = data as Record<string, unknown>;
    const payload = ('message' in chatData && typeof chatData.message === 'object')
      ? chatData.message as Record<string, unknown>
      : chatData;

    if (payload.state) {
      if (!shouldProcessGatewayEvent(payload)) return;
      useChatStore.getState().handleChatEvent(payload);
      // payload.message is the actual message object
      pushPetLineFromMessage(payload.message ?? payload);
      return;
    }

    const normalized = {
      state: 'final',
      message: payload,
      runId: chatData.runId ?? payload.runId,
    };
    if (!shouldProcessGatewayEvent(normalized)) return;
    useChatStore.getState().handleChatEvent(normalized);
    // In this path, payload IS the message
    pushPetLineFromMessage(payload);
  }).catch(() => {});
}

function mapChannelStatus(status: string): 'connected' | 'connecting' | 'disconnected' | 'error' {
  switch (status) {
    case 'connected':
    case 'running':
      return 'connected';
    case 'connecting':
    case 'starting':
      return 'connecting';
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'disconnected';
  }
}

export const useGatewayStore = create<GatewayState>((set, get) => ({
  status: {
    state: 'stopped',
    port: 18789,
  },
  health: null,
  isInitialized: false,
  lastError: null,

  init: async () => {
    if (get().isInitialized) return;
    if (gatewayInitPromise) {
      await gatewayInitPromise;
      return;
    }

    gatewayInitPromise = (async () => {
      try {
        const status = await hostApiFetch<GatewayStatus>('/api/gateway/status');
        set({ status, isInitialized: true });

        if (!gatewayEventUnsubscribers) {
          const unsubscribers: Array<() => void> = [];
          unsubscribers.push(subscribeHostEvent<GatewayStatus>('gateway:status', (payload) => {
            set({ status: payload });
          }));
          unsubscribers.push(subscribeHostEvent<{ message?: string }>('gateway:error', (payload) => {
            set({ lastError: payload.message || 'Gateway error' });
          }));
          unsubscribers.push(subscribeHostEvent<{ method?: string; params?: Record<string, unknown> }>(
            'gateway:notification',
            (payload) => {
              handleGatewayNotification(payload);
            },
          ));
          unsubscribers.push(subscribeHostEvent('gateway:chat-message', (payload) => {
            handleGatewayChatMessage(payload);
          }));
          unsubscribers.push(subscribeHostEvent<{ channelId?: string; status?: string }>(
            'gateway:channel-status',
            (update) => {
              import('./channels')
                .then(({ useChannelsStore }) => {
                  if (!update.channelId || !update.status) return;
                  const state = useChannelsStore.getState();
                  const channel = state.channels.find((item) => item.type === update.channelId);
                  if (channel) {
                    const newStatus = mapChannelStatus(update.status);
                    state.updateChannel(channel.id, { status: newStatus });
                    
                    if (newStatus === 'disconnected' || newStatus === 'error') {
                      state.scheduleAutoReconnect(channel.id);
                    } else if (newStatus === 'connected' || newStatus === 'connecting') {
                      state.clearAutoReconnect(channel.id);
                    }
                  }
                })
                .catch(() => {});
            },
          ));
          gatewayEventUnsubscribers = unsubscribers;
        }
      } catch (error) {
        console.error('Failed to initialize Gateway:', error);
        set({ lastError: String(error) });
      } finally {
        gatewayInitPromise = null;
      }
    })();

    await gatewayInitPromise;
  },

  start: async () => {
    try {
      set({ status: { ...get().status, state: 'starting' }, lastError: null });
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/gateway/start', {
        method: 'POST',
      });
      if (!result.success) {
        set({
          status: { ...get().status, state: 'error', error: result.error },
          lastError: result.error || 'Failed to start Gateway',
        });
      }
    } catch (error) {
      set({
        status: { ...get().status, state: 'error', error: String(error) },
        lastError: String(error),
      });
    }
  },

  stop: async () => {
    try {
      await hostApiFetch('/api/gateway/stop', { method: 'POST' });
      set({ status: { ...get().status, state: 'stopped' }, lastError: null });
    } catch (error) {
      console.error('Failed to stop Gateway:', error);
      set({ lastError: String(error) });
    }
  },

  restart: async () => {
    try {
      set({ status: { ...get().status, state: 'starting' }, lastError: null });
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/gateway/restart', {
        method: 'POST',
      });
      if (!result.success) {
        set({
          status: { ...get().status, state: 'error', error: result.error },
          lastError: result.error || 'Failed to restart Gateway',
        });
      }
    } catch (error) {
      set({
        status: { ...get().status, state: 'error', error: String(error) },
        lastError: String(error),
      });
    }
  },

  checkHealth: async () => {
    try {
      const result = await hostApiFetch<GatewayHealth>('/api/gateway/health');
      set({ health: result });
      return result;
    } catch (error) {
      const health: GatewayHealth = { ok: false, error: String(error) };
      set({ health });
      return health;
    }
  },

  rpc: async <T>(method: string, params?: unknown, timeoutMs?: number): Promise<T> => {
    const response = await invokeIpc<{
      success: boolean;
      result?: T;
      error?: string;
    }>('gateway:rpc', method, params, timeoutMs);
    if (!response.success) {
      throw new Error(response.error || `Gateway RPC failed: ${method}`);
    }
    return response.result as T;
  },

  setStatus: (status) => set({ status }),
  clearError: () => set({ lastError: null }),
}));
