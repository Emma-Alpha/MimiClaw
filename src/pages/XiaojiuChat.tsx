import { useEffect, useMemo, useRef } from 'react';
import { ChatItem } from '@lobehub/ui/chat';
import { Loader2, MessageSquare, RefreshCw, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRemoteMessengerStore } from '@/stores/remote-messenger';
import { useXiaojiuChatStore, type XiaojiuAttachment, type XiaojiuMessage } from '@/stores/xiaojiu-chat';

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

function AttachmentCard({ attachment }: { attachment: XiaojiuAttachment }) {
  if (attachment.type === 'image' && attachment.url) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-transform hover:scale-[1.01] dark:border-white/10 dark:bg-white/5"
      >
        <img
          src={attachment.url}
          alt={attachment.name || 'image'}
          className="max-h-72 w-full object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-foreground/80 shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10">
        {attachment.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{attachment.name || attachment.url || '附件'}</span>
    </a>
  );
}

function MessageBubble({ message }: { message: XiaojiuMessage }) {
  const hasText = !!message.text?.trim();
  const hasAttachments = message.attachments.length > 0;
  const rawPreview = formatRawMessage(message.raw);
  const typeLabel = formatMessageTypeLabel(message.type);
  const senderLabel = getMessageSenderLabel(message);

  const belowMessage = hasAttachments ? (
    <div className="mt-3 grid w-full gap-2">
      {message.attachments.map((attachment, index) => (
        <AttachmentCard
          key={`${message.id}-attachment-${index}-${attachment.url || attachment.name || attachment.type}`}
          attachment={attachment}
        />
      ))}
    </div>
  ) : undefined;

  return (
    <ChatItem
      aboveMessage={(
        <div
          className={cn(
            'mb-2 flex flex-wrap items-center gap-2 px-1 text-[11px] text-foreground/45',
            message.isSelf ? 'justify-end' : 'justify-start',
          )}
        >
          <span>{senderLabel}</span>
          {typeLabel ? (
            <span className="rounded-full bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
              {typeLabel}
            </span>
          ) : null}
          {message.timestamp ? <span>{formatMessageTime(message.timestamp)}</span> : null}
        </div>
      )}
      avatar={{
        avatar: (
          <span
            className={cn(
              'flex h-full w-full items-center justify-center text-sm font-semibold',
              message.isSelf ? 'text-[#2667D8]' : 'text-foreground/70',
            )}
          >
            {getMessageAvatarText(message)}
          </span>
        ),
        backgroundColor: message.isSelf ? 'rgba(38,103,216,0.14)' : 'rgba(15,23,42,0.06)',
        title: senderLabel,
      }}
      belowMessage={belowMessage}
      className="w-full"
      message={message.text || (hasAttachments ? '附件消息' : '暂不支持直接解析的消息内容')}
      placement={message.isSelf ? 'right' : 'left'}
      renderMessage={() =>
        hasText ? (
          <div className="whitespace-pre-wrap break-words text-[14px] leading-6 text-foreground">
            {message.text}
          </div>
        ) : hasAttachments ? (
          <div className="text-[13px] text-foreground/55">
            这条消息包含附件内容。
          </div>
        ) : (
          <div className="space-y-2 text-left">
            <div className="text-[13px] text-foreground/55">暂不支持直接解析的消息内容</div>
            <details className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
              <summary className="cursor-pointer select-none text-[12px] text-foreground/60">
                查看原始消息
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-foreground/70">
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
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,#f4f8ff,transparent_45%),linear-gradient(180deg,#fbfcfe_0%,#f5f7fb_100%)] dark:bg-[radial-gradient(circle_at_top,#1c2638,transparent_35%),linear-gradient(180deg,#121317_0%,#18191d_100%)]">
        <div className="max-w-md rounded-[28px] border border-black/5 bg-white/80 p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF4FF] text-[#2667D8] dark:bg-white/10 dark:text-white">
            <MessageSquare className="h-7 w-7" />
          </div>
          <div className="text-lg font-semibold">选择一个小九会话</div>
          <p className="mt-2 text-sm leading-6 text-foreground/55">
            左侧 Session list 里的 `小九` 会话会在这里直接渲染消息，不再打开远程 webview。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fc_100%)] dark:bg-[linear-gradient(180deg,#14161a_0%,#181a1f_100%)]">
      <div className="border-b border-black/5 px-6 py-4 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
          {currentSession.avatar ? (
            <img
              src={currentSession.avatar}
              alt={currentSession.name}
              className="h-11 w-11 rounded-2xl object-cover ring-1 ring-black/5 dark:ring-white/10"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F2FF] text-[#2667D8] dark:bg-white/10 dark:text-white">
              <MessageSquare className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold">{currentSession.name}</h1>
              <span className="rounded-full bg-[#E8F2FF] px-2 py-0.5 text-[11px] font-medium text-[#2667D8] dark:bg-white/10 dark:text-white">
                小九
              </span>
              {currentSession.unreadCount > 0 ? (
                <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-medium text-[#D92D20] dark:bg-[#432] dark:text-[#FFB4A8]">
                  {currentSession.unreadCount} 未读
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-foreground/45">
              {loading ? '同步中...' : lastSyncedAt ? `最近同步 ${formatSyncTime(lastSyncedAt)}` : '等待首次同步'}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => requestRefresh()}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            刷新
          </Button>
        </div>
      </div>

      {syncError ? (
        <div className="border-b border-[#F5C2C7] bg-[#FFF1F3] px-6 py-2 text-sm text-[#B42318] dark:border-[#5A2026] dark:bg-[#2A1719] dark:text-[#FFB4A8]">
          <div className="mx-auto max-w-5xl">{syncError}</div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          {messages.length > 0 ? (
            <div className="flex justify-center text-xs text-foreground/45">
              {loadingMore ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
            <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-dashed border-black/10 bg-white/60 text-sm text-foreground/45 dark:border-white/10 dark:bg-white/5">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在拉取消息列表...
                </div>
              ) : (
                '当前会话暂无可展示消息，或远端接口尚未返回可解析内容。'
              )}
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
