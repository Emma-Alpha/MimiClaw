import { useEffect, useRef } from 'react';
import {
  fetchHostXiaojiuLatestMessages,
  fetchHostXiaojiuOlderMessages,
  fetchHostXiaojiuSessions,
} from '@/lib/xiaojiu-messenger';
import {
  useRemoteMessengerStore,
  type RemoteMessengerSession,
} from '@/stores/remote-messenger';
import { useSettingsStore } from '@/stores/settings';
import {
  useXiaojiuChatStore,
  type XiaojiuMessage,
} from '@/stores/xiaojiu-chat';

const REMOTE_SYNC_INTERVAL_MS = 15_000;
const REMOTE_MESSAGE_SYNC_INTERVAL_MS = 12_000;
const REMOTE_MESSAGE_PAGE_SIZE = 20;

function traceXiaojiu(step: string, payload?: Record<string, unknown>): void {
  console.info('[xiaojiu-trace][bridge]', step, payload ?? {});
}

function isMessengerLoginError(message: string): boolean {
  return /未登录|登录已失效|authorization cookie|missing sessionid/i.test(message);
}

function toSession(session: RemoteMessengerSession): RemoteMessengerSession {
  return {
    id: session.id,
    name: session.name || session.id,
    avatar: session.avatar,
    unreadCount: session.unreadCount ?? 0,
    draftText: session.draftText,
    updatedAt: session.updatedAt,
    sortIndex: session.sortIndex,
    lastMsgId: session.lastMsgId ?? null,
  };
}

function toMessage(message: XiaojiuMessage): XiaojiuMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderAvatar: message.senderAvatar,
    isSelf: message.isSelf,
    type: message.type,
    text: message.text,
    timestamp: message.timestamp,
    attachments: message.attachments ?? [],
    raw: message.raw,
  };
}

export function RemoteMessengerSessionBridge() {
  const xiaojiuEnabled = useSettingsStore((state) => state.xiaojiuEnabled);
  const handledLoadMoreNonceRef = useRef<Record<string, number>>({});
  const setLoading = useRemoteMessengerStore((state) => state.setLoading);
  const setSessions = useRemoteMessengerStore((state) => state.setSessions);
  const setSyncError = useRemoteMessengerStore((state) => state.setSyncError);
  const activeSessionId = useRemoteMessengerStore((state) => state.activeSessionId);
  const remoteSessions = useRemoteMessengerStore((state) => state.sessions);

  const refreshNonce = useXiaojiuChatStore((state) => state.refreshNonce);
  const loadMoreNonceBySession = useXiaojiuChatStore((state) => state.loadMoreNonceBySession);
  const oldestMessageIdBySession = useXiaojiuChatStore((state) => state.oldestMessageIdBySession);
  const hasMoreBySession = useXiaojiuChatStore((state) => state.hasMoreBySession);
  const setLoadingSession = useXiaojiuChatStore((state) => state.setLoadingSession);
  const setLoadingMoreSession = useXiaojiuChatStore((state) => state.setLoadingMoreSession);
  const mergeLatestMessages = useXiaojiuChatStore((state) => state.mergeLatestMessages);
  const prependMessages = useXiaojiuChatStore((state) => state.prependMessages);
  const setChatSyncError = useXiaojiuChatStore((state) => state.setSyncError);

  const activeLoadMoreNonce = activeSessionId ? (loadMoreNonceBySession[activeSessionId] ?? 0) : 0;
  const activeOldestMessageId = activeSessionId ? (oldestMessageIdBySession[activeSessionId] ?? null) : null;
  const activeHasMore = activeSessionId ? (hasMoreBySession[activeSessionId] ?? false) : false;
  const activeSessionLastMsgId = activeSessionId
    ? (remoteSessions.find((s) => s.id === activeSessionId)?.lastMsgId ?? null)
    : null;

  useEffect(() => {
    if (!xiaojiuEnabled) {
      setLoading(false);
      setSyncError(null);
      setChatSyncError(null);
      return;
    }

    let disposed = false;

    const syncSessions = async () => {
      if (disposed) return;
      setLoading(true);
      traceXiaojiu('session sync:start');

      try {
        const syncedAt = Date.now();
        const sessions = (await fetchHostXiaojiuSessions()).map((session) => toSession(session));
        if (disposed) return;
        traceXiaojiu('session sync:success', {
          syncedAt,
          count: sessions.length,
        });
        setSessions(sessions, syncedAt);
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
        traceXiaojiu('session sync:error', { message });
        if (isMessengerLoginError(message)) {
          setSyncError(null);
          setSessions([], Date.now());
          return;
        }
        setSyncError(message);
      }
    };

    void syncSessions();
    const intervalId = window.setInterval(() => {
      void syncSessions();
    }, REMOTE_SYNC_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [setChatSyncError, setLoading, setSessions, setSyncError, xiaojiuEnabled]);

  useEffect(() => {
    if (!xiaojiuEnabled || !activeSessionId) return;

    let disposed = false;

    const syncMessages = async () => {
      if (disposed) return;
      setLoadingSession(activeSessionId);
      traceXiaojiu('latest sync:start', { sessionId: activeSessionId });

      try {
        const result = await fetchHostXiaojiuLatestMessages(
          activeSessionId,
          REMOTE_MESSAGE_PAGE_SIZE,
          activeSessionLastMsgId,
        );
        if (disposed) return;

        const syncedAt = Date.now();
        const messages = result.messages.map((message) => toMessage(message));
        traceXiaojiu('latest sync:success', {
          sessionId: activeSessionId,
          syncedAt,
          count: messages.length,
          hasMore: result.hasMore,
          oldestMessageId: result.oldestMessageId,
          newestMessageId: messages[messages.length - 1]?.id ?? null,
          latestMsgId: activeSessionLastMsgId,
        });
        mergeLatestMessages(activeSessionId, messages, syncedAt, {
          hasMore: result.hasMore,
          oldestMessageId: result.oldestMessageId,
        });
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
        traceXiaojiu('latest sync:error', { sessionId: activeSessionId, message });
        setChatSyncError(message);
      }
    };

    void syncMessages();
    const intervalId = window.setInterval(() => {
      void syncMessages();
    }, REMOTE_MESSAGE_SYNC_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeSessionId,
    activeSessionLastMsgId,
    refreshNonce,
    mergeLatestMessages,
    setChatSyncError,
    setLoadingSession,
    xiaojiuEnabled,
  ]);

  useEffect(() => {
    if (!xiaojiuEnabled || !activeSessionId || activeLoadMoreNonce <= 0 || !activeHasMore) return;
    if ((handledLoadMoreNonceRef.current[activeSessionId] ?? 0) >= activeLoadMoreNonce) return;

    let disposed = false;

    const loadOlderMessages = async () => {
      if (disposed) return;
      handledLoadMoreNonceRef.current[activeSessionId] = activeLoadMoreNonce;
      setLoadingMoreSession(activeSessionId);
      traceXiaojiu('load more:start', {
        sessionId: activeSessionId,
        anchorMsgId: activeOldestMessageId,
        nonce: activeLoadMoreNonce,
      });

      try {
        const result = await fetchHostXiaojiuOlderMessages(
          activeSessionId,
          activeOldestMessageId,
          REMOTE_MESSAGE_PAGE_SIZE,
        );
        if (disposed) return;

        const syncedAt = Date.now();
        const messages = result.messages.map((message) => toMessage(message));
        traceXiaojiu('load more:success', {
          sessionId: activeSessionId,
          syncedAt,
          anchorMsgId: activeOldestMessageId,
          count: messages.length,
          hasMore: result.hasMore,
          oldestMessageId: result.oldestMessageId,
        });
        prependMessages(activeSessionId, messages, syncedAt, {
          hasMore: result.hasMore,
          oldestMessageId: result.oldestMessageId,
        });
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
        traceXiaojiu('load more:error', {
          sessionId: activeSessionId,
          anchorMsgId: activeOldestMessageId,
          message,
        });
        setChatSyncError(message);
      }
    };

    void loadOlderMessages();

    return () => {
      disposed = true;
    };
  }, [
    activeHasMore,
    activeLoadMoreNonce,
    activeOldestMessageId,
    activeSessionId,
    prependMessages,
    setChatSyncError,
    setLoadingMoreSession,
    xiaojiuEnabled,
  ]);

  return null;
}
