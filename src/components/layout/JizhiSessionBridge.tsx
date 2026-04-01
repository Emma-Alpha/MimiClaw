import { useEffect } from 'react';
import { fetchHostJizhiMessages, fetchHostJizhiSessions } from '@/lib/jizhi-chat';
import { useJizhiChatStore } from '@/stores/jizhi-chat';
import { useJizhiSessionsStore } from '@/stores/jizhi-sessions';

const JIZHI_SESSION_SYNC_INTERVAL_MS = 30_000;
const JIZHI_MESSAGE_SYNC_INTERVAL_MS = 15_000;

function trace(step: string, payload?: Record<string, unknown>): void {
  console.info('[jizhi-trace][bridge]', step, payload ?? {});
}

export function JizhiSessionBridge() {
  const setLoading = useJizhiSessionsStore((state) => state.setLoading);
  const setSessions = useJizhiSessionsStore((state) => state.setSessions);
  const setSyncError = useJizhiSessionsStore((state) => state.setSyncError);
  const activeSessionId = useJizhiSessionsStore((state) => state.activeSessionId);

  const refreshNonce = useJizhiChatStore((state) => state.refreshNonce);
  const setLoadingSession = useJizhiChatStore((state) => state.setLoadingSession);
  const setMessages = useJizhiChatStore((state) => state.setMessages);
  const setChatSyncError = useJizhiChatStore((state) => state.setSyncError);

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
    if (!activeSessionId) return;

    let disposed = false;

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
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
        setChatSyncError(message);
        trace('message sync:error', { sessionId: activeSessionId, message });
      }
    };

    void syncMessages();
    const intervalId = window.setInterval(() => {
      void syncMessages();
    }, JIZHI_MESSAGE_SYNC_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeSessionId,
    refreshNonce,
    setChatSyncError,
    setLoadingSession,
    setMessages,
  ]);

  return null;
}
