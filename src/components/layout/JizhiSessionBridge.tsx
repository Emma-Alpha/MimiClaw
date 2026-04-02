import { useEffect } from 'react';
import type { HostJizhiStreamEvent } from '@/lib/jizhi-chat';
import { fetchHostJizhiMessages, fetchHostJizhiSessions } from '@/lib/jizhi-chat';
import { subscribeHostEvent } from '@/lib/host-events';
import { useJizhiChatStore } from '@/stores/jizhi-chat';
import { useJizhiSessionsStore } from '@/stores/jizhi-sessions';

const JIZHI_SESSION_SYNC_INTERVAL_MS = 30_000;
const JIZHI_MESSAGE_SYNC_INTERVAL_MS = 15_000;
const JIZHI_MESSAGE_STREAMING_SYNC_INTERVAL_MS = 1_200;

function trace(step: string, payload?: Record<string, unknown>): void {
  console.info('[jizhi-trace][bridge]', step, payload ?? {});
}

export function JizhiSessionBridge() {
  const setLoading = useJizhiSessionsStore((state) => state.setLoading);
  const setSessions = useJizhiSessionsStore((state) => state.setSessions);
  const setSyncError = useJizhiSessionsStore((state) => state.setSyncError);
  const activeSessionId = useJizhiSessionsStore((state) => state.activeSessionId);

  const refreshNonce = useJizhiChatStore((state) => state.refreshNonce);
  const activePendingMessageCount = useJizhiChatStore((state) => (
    activeSessionId ? (state.pendingMessagesBySession[activeSessionId] ?? []).length : 0
  ));
  const setLoadingSession = useJizhiChatStore((state) => state.setLoadingSession);
  const setMessages = useJizhiChatStore((state) => state.setMessages);
  const setChatSyncError = useJizhiChatStore((state) => state.setSyncError);
  const applyStreamEvent = useJizhiChatStore((state) => state.applyStreamEvent);
  const requestRefresh = useJizhiChatStore((state) => state.requestRefresh);

  useEffect(() => {
    let disposed = false;

    const syncSessions = async () => {
      if (disposed) return;
      setLoading(true);
      trace('session sync:start');

      try {
        const syncedAt = Date.now();
        const sessions = await fetchHostJizhiSessions();
        if (disposed) return;
        setSessions(sessions, syncedAt);
        trace('session sync:success', { count: sessions.length, syncedAt });
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
        setSyncError(message);
        trace('session sync:error', { message });
      }
    };

    void syncSessions();
    const intervalId = window.setInterval(() => {
      void syncSessions();
    }, JIZHI_SESSION_SYNC_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [setLoading, setSessions, setSyncError]);

  useEffect(() => {
    return subscribeHostEvent<HostJizhiStreamEvent>('jizhi:stream', (payload) => {
      applyStreamEvent(payload);
      trace('stream:event', {
        sessionId: payload.sessionId,
        messageUUID: payload.messageUUID,
        event: payload.event,
        seq: payload.seq ?? null,
      });

      if (
        payload.event === 'result'
        || payload.event === 'error'
        || payload.event === 'end'
        || payload.event === 'stopped'
      ) {
        window.setTimeout(() => {
          requestRefresh();
        }, 120);
      }
    });
  }, [applyStreamEvent, requestRefresh]);

  useEffect(() => {
    if (!activeSessionId) return;

    let disposed = false;
    let timeoutId: number | null = null;

    const scheduleNextSync = () => {
      if (disposed) return;
      const hasPendingMessages = activePendingMessageCount > 0;
      const delay = hasPendingMessages
        ? JIZHI_MESSAGE_STREAMING_SYNC_INTERVAL_MS
        : JIZHI_MESSAGE_SYNC_INTERVAL_MS;
      timeoutId = window.setTimeout(() => {
        void syncMessages();
      }, delay);
    };

    const syncMessages = async () => {
      if (disposed) return;
      setLoadingSession(activeSessionId);
      trace('message sync:start', { sessionId: activeSessionId });

      try {
        const messages = await fetchHostJizhiMessages(activeSessionId);
        if (disposed) return;
        const syncedAt = Date.now();
        setMessages(activeSessionId, messages, syncedAt);
        trace('message sync:success', {
          sessionId: activeSessionId,
          count: messages.length,
          syncedAt,
        });
        scheduleNextSync();
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
        setChatSyncError(message);
        trace('message sync:error', { sessionId: activeSessionId, message });
        scheduleNextSync();
      }
    };

    void syncMessages();

    return () => {
      disposed = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    activeSessionId,
    activePendingMessageCount,
    refreshNonce,
    setChatSyncError,
    setLoadingSession,
    setMessages,
  ]);

  return null;
}
