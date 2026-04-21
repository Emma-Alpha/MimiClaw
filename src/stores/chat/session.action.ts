import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import {
  clearHistoryPoll,
  enrichWithCachedImages,
  enrichWithToolResultFiles,
  getCanonicalPrefixFromSessions,
  getMessageText,
  hasNonToolAssistantContent,
  isToolResultRole,
  loadMissingPreviews,
  toMs,
} from './helpers';
import { buildCronSessionHistoryPath, isCronSessionKey } from './cron-session-utils';
import type { ChatGet, ChatSet } from './store-api';
import {
  DEFAULT_CANONICAL_PREFIX,
  DEFAULT_SESSION_KEY,
  type ChatSession,
  type RawMessage,
} from './types';

function getAgentIdFromSessionKey(sessionKey: string): string {
  if (!sessionKey.startsWith('agent:')) return 'main';
  const [, agentId] = sessionKey.split(':');
  return agentId || 'main';
}

function parseSessionUpdatedAtMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return toMs(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

async function loadCronFallbackMessages(sessionKey: string, limit = 200): Promise<RawMessage[]> {
  if (!isCronSessionKey(sessionKey)) return [];
  try {
    const response = await hostApiFetch<{ messages?: RawMessage[] }>(
      buildCronSessionHistoryPath(sessionKey, limit),
    );
    return Array.isArray(response.messages) ? response.messages : [];
  } catch (error) {
    console.warn('Failed to load cron fallback history:', error);
    return [];
  }
}

export class ChatSessionActionImpl {
  readonly #get: ChatGet;
  readonly #set: ChatSet;

  constructor(set: ChatSet, get: ChatGet, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  loadSessions = async () => {
    try {
      const result = await invokeIpc(
        'gateway:rpc',
        'sessions.list',
        {},
      ) as { success: boolean; result?: Record<string, unknown>; error?: string };

      if (result.success && result.result) {
        const data = result.result;
        const rawSessions = Array.isArray(data.sessions) ? data.sessions : [];
        const sessions: ChatSession[] = rawSessions.map((s: Record<string, unknown>) => ({
          key: String(s.key || ''),
          label: s.label ? String(s.label) : undefined,
          displayName: s.displayName ? String(s.displayName) : undefined,
          thinkingLevel: s.thinkingLevel ? String(s.thinkingLevel) : undefined,
          model: s.model ? String(s.model) : undefined,
          updatedAt: parseSessionUpdatedAtMs(s.updatedAt),
        })).filter((s: ChatSession) => s.key);

        const canonicalBySuffix = new Map<string, string>();
        for (const session of sessions) {
          if (!session.key.startsWith('agent:')) continue;
          const parts = session.key.split(':');
          if (parts.length < 3) continue;
          const suffix = parts.slice(2).join(':');
          if (suffix && !canonicalBySuffix.has(suffix)) {
            canonicalBySuffix.set(suffix, session.key);
          }
        }

        const seen = new Set<string>();
        const dedupedSessions = sessions.filter((s) => {
          if (!s.key.startsWith('agent:') && canonicalBySuffix.has(s.key)) return false;
          if (seen.has(s.key)) return false;
          seen.add(s.key);
          return true;
        });

        const { currentSessionKey } = this.#get();
        let nextSessionKey = currentSessionKey || DEFAULT_SESSION_KEY;
        if (!nextSessionKey.startsWith('agent:')) {
          const canonicalMatch = canonicalBySuffix.get(nextSessionKey);
          if (canonicalMatch) {
            nextSessionKey = canonicalMatch;
          }
        }
        if (!dedupedSessions.find((s) => s.key === nextSessionKey) && dedupedSessions.length > 0) {
          const isNewEmptySession = this.#get().messages.length === 0;
          if (!isNewEmptySession) {
            nextSessionKey = dedupedSessions[0].key;
          }
        }

        const sessionsWithCurrent = !dedupedSessions.find((s) => s.key === nextSessionKey) && nextSessionKey
          ? [
            ...dedupedSessions,
            { key: nextSessionKey, displayName: nextSessionKey },
          ]
          : dedupedSessions;

        const discoveredActivity = Object.fromEntries(
          sessionsWithCurrent.flatMap((session) => {
            if (typeof session.updatedAt !== 'number' || !Number.isFinite(session.updatedAt)) return [];
            return [[session.key, session.updatedAt] as const];
          }),
        );

        this.#set((state) => ({
          sessions: sessionsWithCurrent,
          currentSessionKey: nextSessionKey,
          currentAgentId: getAgentIdFromSessionKey(nextSessionKey),
          sessionLastActivity: {
            ...state.sessionLastActivity,
            ...discoveredActivity,
          },
        }));

        if (currentSessionKey !== nextSessionKey) {
          await this.loadHistory();
        }

        const sessionsToLabel = sessionsWithCurrent.filter((s) => !s.key.endsWith(':main'));
        if (sessionsToLabel.length > 0) {
          void Promise.all(
            sessionsToLabel.map(async (session) => {
              try {
                const r = await invokeIpc(
                  'gateway:rpc',
                  'chat.history',
                  { sessionKey: session.key, limit: 1000 },
                ) as { success: boolean; result?: Record<string, unknown> };
                if (!r.success || !r.result) return;
                const msgs = Array.isArray(r.result.messages) ? r.result.messages as RawMessage[] : [];
                const firstUser = msgs.find((m) => m.role === 'user');
                const lastMsg = msgs[msgs.length - 1];
                this.#set((s) => {
                  const next: Partial<typeof s> = {};
                  if (firstUser) {
                    const labelText = getMessageText(firstUser.content).trim();
                    if (labelText) {
                      const truncated = labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText;
                      next.sessionLabels = { ...s.sessionLabels, [session.key]: truncated };
                    }
                  }
                  if (lastMsg?.timestamp) {
                    next.sessionLastActivity = { ...s.sessionLastActivity, [session.key]: toMs(lastMsg.timestamp) };
                  }
                  return next;
                });
              } catch {
                // ignore per-session errors
              }
            }),
          );
        }
      }
    } catch (err) {
      console.warn('Failed to load sessions:', err);
    }
  };

  switchSession = (key: string) => {
    const { currentSessionKey, messages, sessionLastActivity, sessionLabels } = this.#get();
    const leavingEmpty = !currentSessionKey.endsWith(':main')
      && messages.length === 0
      && !sessionLastActivity[currentSessionKey]
      && !sessionLabels[currentSessionKey];
    this.#set((s) => ({
      currentSessionKey: key,
      currentAgentId: getAgentIdFromSessionKey(key),
      messages: [],
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      activeRunId: null,
      error: null,
      pendingFinal: false,
      lastUserMessageAt: null,
      pendingToolImages: [],
      ...(leavingEmpty ? {
        sessions: s.sessions.filter((session) => session.key !== currentSessionKey),
        sessionLabels: Object.fromEntries(
          Object.entries(s.sessionLabels).filter(([k]) => k !== currentSessionKey),
        ),
        sessionLastActivity: Object.fromEntries(
          Object.entries(s.sessionLastActivity).filter(([k]) => k !== currentSessionKey),
        ),
      } : {}),
    }));
    void this.loadHistory();
  };

  deleteSession = async (key: string) => {
    try {
      const result = await invokeIpc('session:delete', key) as {
        success: boolean;
        error?: string;
      };
      if (!result.success) {
        console.warn(`[deleteSession] IPC reported failure for ${key}:`, result.error);
      }
    } catch (err) {
      console.warn(`[deleteSession] IPC call failed for ${key}:`, err);
    }

    const { currentSessionKey, sessions } = this.#get();
    const remaining = sessions.filter((session) => session.key !== key);

    if (currentSessionKey === key) {
      const next = remaining[0];
      this.#set((s) => ({
        sessions: remaining,
        sessionLabels: Object.fromEntries(Object.entries(s.sessionLabels).filter(([k]) => k !== key)),
        sessionLastActivity: Object.fromEntries(Object.entries(s.sessionLastActivity).filter(([k]) => k !== key)),
        messages: [],
        streamingText: '',
        streamingMessage: null,
        streamingTools: [],
        activeRunId: null,
        error: null,
        pendingFinal: false,
        lastUserMessageAt: null,
        pendingToolImages: [],
        currentSessionKey: next?.key ?? DEFAULT_SESSION_KEY,
        currentAgentId: getAgentIdFromSessionKey(next?.key ?? DEFAULT_SESSION_KEY),
      }));
      if (next) {
        await this.loadHistory();
      }
    } else {
      this.#set((s) => ({
        sessions: remaining,
        sessionLabels: Object.fromEntries(Object.entries(s.sessionLabels).filter(([k]) => k !== key)),
        sessionLastActivity: Object.fromEntries(Object.entries(s.sessionLastActivity).filter(([k]) => k !== key)),
      }));
    }
  };

  newSession = () => {
    const { currentSessionKey, messages, sessionLastActivity, sessionLabels } = this.#get();
    const leavingEmpty = !currentSessionKey.endsWith(':main')
      && messages.length === 0
      && !sessionLastActivity[currentSessionKey]
      && !sessionLabels[currentSessionKey];
    const prefix = getCanonicalPrefixFromSessions(this.#get().sessions) ?? DEFAULT_CANONICAL_PREFIX;
    const newKey = `${prefix}:session-${Date.now()}`;
    const newSessionEntry: ChatSession = { key: newKey, displayName: newKey };
    this.#set((s) => ({
      currentSessionKey: newKey,
      currentAgentId: getAgentIdFromSessionKey(newKey),
      sessions: [
        ...(leavingEmpty ? s.sessions.filter((sess) => sess.key !== currentSessionKey) : s.sessions),
        newSessionEntry,
      ],
      sessionLabels: leavingEmpty
        ? Object.fromEntries(Object.entries(s.sessionLabels).filter(([k]) => k !== currentSessionKey))
        : s.sessionLabels,
      sessionLastActivity: leavingEmpty
        ? Object.fromEntries(Object.entries(s.sessionLastActivity).filter(([k]) => k !== currentSessionKey))
        : s.sessionLastActivity,
      messages: [],
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      activeRunId: null,
      error: null,
      pendingFinal: false,
      lastUserMessageAt: null,
      pendingToolImages: [],
    }));
  };

  cleanupEmptySession = () => {
    const { currentSessionKey, messages, sessionLastActivity, sessionLabels } = this.#get();
    const isEmptyNonMain = !currentSessionKey.endsWith(':main')
      && messages.length === 0
      && !sessionLastActivity[currentSessionKey]
      && !sessionLabels[currentSessionKey];
    if (!isEmptyNonMain) return;
    this.#set((s) => ({
      sessions: s.sessions.filter((sess) => sess.key !== currentSessionKey),
      sessionLabels: Object.fromEntries(
        Object.entries(s.sessionLabels).filter(([k]) => k !== currentSessionKey),
      ),
      sessionLastActivity: Object.fromEntries(
        Object.entries(s.sessionLastActivity).filter(([k]) => k !== currentSessionKey),
      ),
    }));
  };

  loadHistory = async (quiet = false) => {
    const { currentSessionKey } = this.#get();
    if (!quiet) this.#set({ loading: true, error: null });

    const applyLoadedMessages = (rawMessages: RawMessage[], thinkingLevel: string | null) => {
      const messagesWithToolImages = enrichWithToolResultFiles(rawMessages);
      const filteredMessages = messagesWithToolImages.filter((msg) => !isToolResultRole(msg.role));
      const enrichedMessages = enrichWithCachedImages(filteredMessages);

      let finalMessages = enrichedMessages;
      const userMsgAt = this.#get().lastUserMessageAt;
      if (this.#get().sending && userMsgAt) {
        const userMsMs = toMs(userMsgAt);
        const hasRecentUser = enrichedMessages.some(
          (m) => m.role === 'user' && m.timestamp && Math.abs(toMs(m.timestamp) - userMsMs) < 5000,
        );
        if (!hasRecentUser) {
          const currentMsgs = this.#get().messages;
          const optimistic = [...currentMsgs].reverse().find(
            (m) => m.role === 'user' && m.timestamp && Math.abs(toMs(m.timestamp) - userMsMs) < 5000,
          );
          if (optimistic) {
            finalMessages = [...enrichedMessages, optimistic];
          }
        }
      }

      this.#set({ messages: finalMessages, thinkingLevel, loading: false });

      const isMainSession = currentSessionKey.endsWith(':main');
      if (!isMainSession) {
        const firstUserMsg = finalMessages.find((m) => m.role === 'user');
        if (firstUserMsg) {
          const labelText = getMessageText(firstUserMsg.content).trim();
          if (labelText) {
            const truncated = labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText;
            this.#set((s) => ({
              sessionLabels: { ...s.sessionLabels, [currentSessionKey]: truncated },
            }));
          }
        }
      }

      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg?.timestamp) {
        const lastAt = toMs(lastMsg.timestamp);
        this.#set((s) => ({
          sessionLastActivity: { ...s.sessionLastActivity, [currentSessionKey]: lastAt },
        }));
      }

      loadMissingPreviews(finalMessages).then((updated) => {
        if (updated) {
          this.#set({
            messages: finalMessages.map((msg) =>
              msg._attachedFiles
                ? { ...msg, _attachedFiles: msg._attachedFiles.map((f) => ({ ...f })) }
                : msg,
            ),
          });
        }
      });
      const { pendingFinal, lastUserMessageAt, sending: isSendingNow } = this.#get();

      const userMsTs = lastUserMessageAt ? toMs(lastUserMessageAt) : 0;
      const isAfterUserMsg = (msg: RawMessage): boolean => {
        if (!userMsTs || !msg.timestamp) return true;
        return toMs(msg.timestamp) >= userMsTs;
      };

      if (isSendingNow && !pendingFinal) {
        const hasRecentAssistantActivity = [...filteredMessages].reverse().some((msg) => {
          if (msg.role !== 'assistant') return false;
          return isAfterUserMsg(msg);
        });
        if (hasRecentAssistantActivity) {
          this.#set({ pendingFinal: true });
        }
      }

      if (pendingFinal || this.#get().pendingFinal) {
        const recentAssistant = [...filteredMessages].reverse().find((msg) => {
          if (msg.role !== 'assistant') return false;
          if (!hasNonToolAssistantContent(msg)) return false;
          return isAfterUserMsg(msg);
        });
        if (recentAssistant) {
          clearHistoryPoll();
          this.#set({ sending: false, activeRunId: null, pendingFinal: false });
        }
      }
    };

    try {
      const result = await invokeIpc(
        'gateway:rpc',
        'chat.history',
        { sessionKey: currentSessionKey, limit: 200 },
      ) as { success: boolean; result?: Record<string, unknown>; error?: string };

      if (result.success && result.result) {
        const data = result.result;
        let rawMessages = Array.isArray(data.messages) ? data.messages as RawMessage[] : [];
        const thinkingLevel = data.thinkingLevel ? String(data.thinkingLevel) : null;
        if (rawMessages.length === 0 && isCronSessionKey(currentSessionKey)) {
          rawMessages = await loadCronFallbackMessages(currentSessionKey, 200);
        }
        applyLoadedMessages(rawMessages, thinkingLevel);
      } else {
        const fallbackMessages = await loadCronFallbackMessages(currentSessionKey, 200);
        if (fallbackMessages.length > 0) {
          applyLoadedMessages(fallbackMessages, null);
        } else {
          this.#set({ messages: [], loading: false });
        }
      }
    } catch (err) {
      console.warn('Failed to load chat history:', err);
      const fallbackMessages = await loadCronFallbackMessages(currentSessionKey, 200);
      if (fallbackMessages.length > 0) {
        applyLoadedMessages(fallbackMessages, null);
      } else {
        this.#set({ messages: [], loading: false });
      }
    }
  };
}
