import { useEffect, useMemo, useRef } from 'react';
import { ChatItem } from '@lobehub/ui/chat';
import { Loader2, MessageSquare, RefreshCw, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRemoteMessengerStore } from '@/stores/remote-messenger';
import { useXiaojiuChatStore, type XiaojiuAttachment, type XiaojiuMessage } from '@/stores/xiaojiu-chat';
import { useStyles } from './XiaojiuChat.styles';

function formatMessageTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSyncTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatRawMessage(raw: Record<string, unknown>): string {
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return '[unserializable raw message]';
  }
}

function formatMessageTypeLabel(type?: string): string | null {
  if (!type) return null;
  const trimmed = type.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return null;
  return trimmed;
}

function getMessageSenderLabel(message: XiaojiuMessage): string {
  if (message.isSelf) return '我';
  const senderName = message.senderName?.trim();
  return senderName || '未知发送者';
}

function getMessageAvatarText(message: XiaojiuMessage): string {
  const senderLabel = getMessageSenderLabel(message);
  return senderLabel.slice(0, 1).toUpperCase();
}

function AttachmentCard({ attachment, styles }: { attachment: XiaojiuAttachment; styles: Record<string, string> }) {
  if (attachment.type === 'image' && attachment.url) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className={styles.imageAttachment}
      >
        <img
          src={attachment.url}
          alt={attachment.name || 'image'}
          className={styles.imageAttachmentImg}
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className={styles.fileAttachment}
    >
      <span className={styles.fileAttachmentIcon}>
        {attachment.type === 'image' ? <ImageIcon style={{ width: 16, height: 16 }} /> : <FileText style={{ width: 16, height: 16 }} />}
      </span>
      <span className={styles.fileAttachmentName}>{attachment.name || attachment.url || '附件'}</span>
    </a>
  );
}

function MessageBubble({ message, styles }: { message: XiaojiuMessage; styles: Record<string, string> }) {
  const hasText = !!message.text?.trim();
  const hasAttachments = message.attachments.length > 0;
  const rawPreview = formatRawMessage(message.raw);
  const typeLabel = formatMessageTypeLabel(message.type);
  const senderLabel = getMessageSenderLabel(message);

  const belowMessage = hasAttachments ? (
    <div className={styles.attachmentGrid}>
      {message.attachments.map((attachment, index) => (
        <AttachmentCard
          key={`${message.id}-attachment-${index}-${attachment.url || attachment.name || attachment.type}`}
          attachment={attachment}
          styles={styles}
        />
      ))}
    </div>
  ) : undefined;

  return (
    <ChatItem
      aboveMessage={(
        <div className={message.isSelf ? styles.bubbleAboveRight : styles.bubbleAboveLeft}>
          <span>{senderLabel}</span>
          {typeLabel ? (
            <span className={styles.typeBadge}>
              {typeLabel}
            </span>
          ) : null}
          {message.timestamp ? <span>{formatMessageTime(message.timestamp)}</span> : null}
        </div>
      )}
      avatar={{
        avatar: (
          <span className={message.isSelf ? styles.avatarSelf : styles.avatarOther}>
            {getMessageAvatarText(message)}
          </span>
        ),
        backgroundColor: message.isSelf ? 'rgba(38,103,216,0.14)' : 'rgba(15,23,42,0.06)',
        title: senderLabel,
      }}
      belowMessage={belowMessage}
      style={{ width: "100%" }}
      message={message.text || (hasAttachments ? '附件消息' : '暂不支持直接解析的消息内容')}
      placement={message.isSelf ? 'right' : 'left'}
      renderMessage={() =>
        hasText ? (
          <div className={styles.textMessage}>
            {message.text}
          </div>
        ) : hasAttachments ? (
          <div className={styles.attachmentHint}>
            这条消息包含附件内容。
          </div>
        ) : (
          <div className={styles.rawMessageWrap}>
            <div className={styles.rawMessageHint}>暂不支持直接解析的消息内容</div>
            <details className={styles.rawDetails}>
              <summary className={styles.rawSummary}>
                查看原始消息
              </summary>
              <pre className={styles.rawPre}>
                {rawPreview}
              </pre>
            </details>
          </div>
        )
      }
      showTitle={false}
      time={message.timestamp}
      variant="bubble"
    />
  );
}

export function XiaojiuChat() {
  const { styles } = useStyles();
  const activeSessionId = useRemoteMessengerStore((state) => state.activeSessionId);
  const remoteSessions = useRemoteMessengerStore((state) => state.sessions);

  const messagesBySession = useXiaojiuChatStore((state) => state.messagesBySession);
  const loadingSessionId = useXiaojiuChatStore((state) => state.loadingSessionId);
  const loadingMoreSessionId = useXiaojiuChatStore((state) => state.loadingMoreSessionId);
  const syncError = useXiaojiuChatStore((state) => state.syncError);
  const lastSyncedAtBySession = useXiaojiuChatStore((state) => state.lastSyncedAtBySession);
  const hasMoreBySession = useXiaojiuChatStore((state) => state.hasMoreBySession);
  const requestRefresh = useXiaojiuChatStore((state) => state.requestRefresh);
  const requestLoadMore = useXiaojiuChatStore((state) => state.requestLoadMore);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const previousSessionIdRef = useRef<string | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const pendingLoadMoreRef = useRef<{
    sessionId: string;
    previousHeight: number;
    previousTop: number;
  } | null>(null);
  const currentSession = useMemo(
    () => remoteSessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, remoteSessions],
  );
  const messages = useMemo(
    () => (activeSessionId ? (messagesBySession[activeSessionId] ?? []) : []),
    [activeSessionId, messagesBySession],
  );
  const loading = activeSessionId != null && loadingSessionId === activeSessionId;
  const loadingMore = activeSessionId != null && loadingMoreSessionId === activeSessionId;
  const hasMore = activeSessionId ? (hasMoreBySession[activeSessionId] ?? false) : false;
  const lastSyncedAt = activeSessionId ? lastSyncedAtBySession[activeSessionId] : undefined;

  useEffect(() => {
    console.info('[xiaojiu-trace][page] active session changed', {
      activeSessionId,
      sessionName: currentSession?.name ?? null,
    });
  }, [activeSessionId, currentSession?.name]);

  useEffect(() => {
    console.info('[xiaojiu-trace][page] messages snapshot', {
      activeSessionId,
      count: messages.length,
      firstMessageId: messages[0]?.id ?? null,
      lastMessageId: messages[messages.length - 1]?.id ?? null,
      loading,
      loadingMore,
      hasMore,
      syncError,
    });
  }, [activeSessionId, hasMore, loading, loadingMore, messages, syncError]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    if (activeSessionId !== previousSessionIdRef.current) {
      previousSessionIdRef.current = activeSessionId;
      shouldScrollToBottomRef.current = true;
      pendingLoadMoreRef.current = null;
    }

    if (
      pendingLoadMoreRef.current
      && pendingLoadMoreRef.current.sessionId === activeSessionId
      && !loadingMore
    ) {
      const { previousHeight, previousTop } = pendingLoadMoreRef.current;
      node.scrollTop = previousTop + (node.scrollHeight - previousHeight);
      pendingLoadMoreRef.current = null;
      return;
    }

    if (shouldScrollToBottomRef.current && !loading && messages.length > 0) {
      node.scrollTop = node.scrollHeight;
      shouldScrollToBottomRef.current = false;
    }
  }, [activeSessionId, loading, loadingMore, messages]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (
      !node
      || !activeSessionId
      || !hasMore
      || loading
      || loadingMore
      || pendingLoadMoreRef.current
      || node.scrollTop > 48
    ) {
      return;
    }

    pendingLoadMoreRef.current = {
      sessionId: activeSessionId,
      previousHeight: node.scrollHeight,
      previousTop: node.scrollTop,
    };
    requestLoadMore(activeSessionId);
  };

  if (!activeSessionId || !currentSession) {
    return (
      <div className={styles.emptyRoot}>
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <MessageSquare style={{ width: 28, height: 28 }} />
          </div>
          <div className={styles.emptyTitle}>选择一个小九会话</div>
          <p className={styles.emptyDesc}>
            左侧 Session list 里的 `小九` 会话会在这里直接渲染消息，不再打开远程 webview。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          {currentSession.avatar ? (
            <img
              src={currentSession.avatar}
              alt={currentSession.name}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback}>
              <MessageSquare style={{ width: 20, height: 20 }} />
            </div>
          )}
          <div className={styles.headerContent}>
            <div className={styles.headerTitleRow}>
              <h1 className={styles.headerTitle}>{currentSession.name}</h1>
              <span className={styles.headerBadge}>小九</span>
              {currentSession.unreadCount > 0 ? (
                <span className={styles.unreadBadge}>
                  {currentSession.unreadCount} 未读
                </span>
              ) : null}
            </div>
            <div className={styles.headerMeta}>
              {loading ? '同步中...' : lastSyncedAt ? `最近同步 ${formatSyncTime(lastSyncedAt)}` : '等待首次同步'}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            style={{ borderRadius: 9999, gap: 8 }}
            onClick={() => requestRefresh()}
            disabled={loading}
          >
            {loading ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <RefreshCw style={{ width: 16, height: 16 }} />}
            刷新
          </Button>
        </div>
      </div>

      {syncError ? (
        <div className={styles.syncErrorBar}>
          <div className={styles.syncErrorInner}>{syncError}</div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={styles.messageList}
      >
        <div className={styles.messageListInner}>
          {messages.length > 0 ? (
            <div className={styles.loadMoreRow}>
              {loadingMore ? (
                <div className={styles.loadMoreInner}>
                  <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                  正在加载更多消息...
                </div>
              ) : hasMore ? (
                '滚动到顶部加载更多'
              ) : (
                '没有更多消息了'
              )}
            </div>
          ) : null}
          {messages.length === 0 ? (
            <div className={styles.emptyMessageBox}>
              {loading ? (
                <div className={styles.loadingInner}>
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                  正在拉取消息列表...
                </div>
              ) : (
                '当前会话暂无可展示消息，或远端接口尚未返回可解析内容。'
              )}
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} styles={styles} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
