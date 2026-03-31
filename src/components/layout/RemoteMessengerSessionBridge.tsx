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
import {
  useXiaojiuChatStore,
  type XiaojiuMessage,
} from '@/stores/xiaojiu-chat';

const REMOTE_SYNC_INTERVAL_MS = 15_000;
const REMOTE_MESSAGE_SYNC_INTERVAL_MS = 12_000;
const REMOTE_MESSAGE_PAGE_SIZE = 20;

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
  const handledLoadMoreNonceRef = useRef<Record<string, number>>({});
  const setLoading = useRemoteMessengerStore((state) => state.setLoading);
  const setSessions = useRemoteMessengerStore((state) => state.setSessions);
  const setSyncError = useRemoteMessengerStore((state) => state.setSyncError);
  const activeSessionId = useRemoteMessengerStore((state) => state.activeSessionId);

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

  useEffect(() => {
    let disposed = false;

    const syncSessions = async () => {
      if (disposed) return;
      setLoading(true);

      try {
        const syncedAt = Date.now();
        const sessions = (await fetchHostXiaojiuSessions()).map((session) => toSession(session));
        if (disposed) return;
        setSessions(sessions, syncedAt);
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
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
  }, [setLoading, setSessions, setSyncError]);

  useEffect(() => {
    if (!activeSessionId) return;

    let disposed = false;

    const syncMessages = async () => {
      if (disposed) return;
      setLoadingSession(activeSessionId);

      try {
        const result = await fetchHostXiaojiuLatestMessages(
          activeSessionId,
          REMOTE_MESSAGE_PAGE_SIZE,
        );
        if (disposed) return;

        const syncedAt = Date.now();
        const messages = result.messages.map((message) => toMessage(message));
        mergeLatestMessages(activeSessionId, messages, syncedAt, {
          hasMore: result.hasMore,
          oldestMessageId: result.oldestMessageId,
        });
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
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
    refreshNonce,
    mergeLatestMessages,
    setChatSyncError,
    setLoadingSession,
  ]);

  useEffect(() => {
    if (!activeSessionId || activeLoadMoreNonce <= 0 || !activeHasMore) return;
    if ((handledLoadMoreNonceRef.current[activeSessionId] ?? 0) >= activeLoadMoreNonce) return;

    let disposed = false;

    const loadOlderMessages = async () => {
      if (disposed) return;
      handledLoadMoreNonceRef.current[activeSessionId] = activeLoadMoreNonce;
      setLoadingMoreSession(activeSessionId);

      try {
        const result = await fetchHostXiaojiuOlderMessages(
          activeSessionId,
          activeOldestMessageId,
          REMOTE_MESSAGE_PAGE_SIZE,
        );
        if (disposed) return;

        const syncedAt = Date.now();
        const messages = result.messages.map((message) => toMessage(message));
        prependMessages(activeSessionId, messages, syncedAt, {
          hasMore: result.hasMore,
          oldestMessageId: result.oldestMessageId,
        });
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
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
  ]);

  return null;
}
