import { useMemo } from 'react';
import { ChatItem } from '@lobehub/ui/chat';
import { Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JizhiMessageContent } from '@/components/jizhi/JizhiMessageContent';
import { cn } from '@/lib/utils';
import { useJizhiChatStore } from '@/stores/jizhi-chat';
import { useJizhiSessionsStore } from '@/stores/jizhi-sessions';
import type {
  HostJizhiAssistantMessageItem,
  HostJizhiChatMessage,
  HostJizhiUserMessage,
} from '@/lib/jizhi-chat';

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

function formatMessageTime(timestamp?: string): string {
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

function getActiveAssistantMessages(message: HostJizhiChatMessage): HostJizhiAssistantMessageItem[] {
  return (message.assistantMessage?.groupMessages ?? [])
    .map((group) => group.messages.find((item) => item.isActive) ?? group.messages[0])
    .filter((item): item is HostJizhiAssistantMessageItem => Boolean(item));
}

function UserBubble({ message }: { message: HostJizhiUserMessage }) {
  return (
    <ChatItem
      avatar={{
        avatar: (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#2667D8]">
            我
          </span>
        ),
        backgroundColor: 'rgba(38,103,216,0.14)',
        title: '我',
      }}
      className="w-full"
      message="用户消息"
      placement="right"
      renderMessage={() => <JizhiMessageContent message={message.content} />}
      showTitle={false}
      time={Date.parse(message.createdAt)}
      variant="bubble"
      aboveMessage={(
        <div className="mb-2 flex justify-end px-1 text-[11px] text-foreground/45">
          <span>{formatMessageTime(message.createdAt)}</span>
        </div>
      )}
    />
  );
}

function AssistantBubble({ message }: { message: HostJizhiAssistantMessageItem }) {
  const timeLabel = formatMessageTime(message.createdAt);
  const modelLabel = message.modelName || message.model || '极智';

  return (
    <ChatItem
      avatar={{
        avatar: (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-foreground/75">
            智
          </span>
        ),
        backgroundColor: 'rgba(15,23,42,0.06)',
        title: modelLabel,
      }}
      className="w-full"
      message={modelLabel}
      placement="left"
      renderMessage={() => <JizhiMessageContent message={message.content} />}
      showTitle={false}
      time={Date.parse(message.createdAt)}
      variant="bubble"
      aboveMessage={(
        <div className="mb-2 flex flex-wrap items-center gap-2 px-1 text-[11px] text-foreground/45">
          <span>{modelLabel}</span>
          {timeLabel ? <span>{timeLabel}</span> : null}
          {message.status && message.status !== 'success' ? (
            <span className="rounded-full bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
              {message.status}
            </span>
          ) : null}
        </div>
      )}
    />
  );
}

function MessageRow({ message }: { message: HostJizhiChatMessage }) {
  if (message.role === 'user' && message.userMessage) {
    return <UserBubble message={message.userMessage} />;
  }

  if (message.role === 'assistant' && message.assistantMessage) {
    const activeMessages = getActiveAssistantMessages(message);
    return (
      <div className="space-y-4">
        {activeMessages.map((item) => (
          <AssistantBubble key={item.messageUUID} message={item} />
        ))}
      </div>
    );
  }

  return null;
}

export function JizhiChat() {
  const activeSessionId = useJizhiSessionsStore((state) => state.activeSessionId);
  const sessions = useJizhiSessionsStore((state) => state.sessions);
  const loadingSessions = useJizhiSessionsStore((state) => state.loading);

  const messagesBySession = useJizhiChatStore((state) => state.messagesBySession);
  const loadingSessionId = useJizhiChatStore((state) => state.loadingSessionId);
  const syncError = useJizhiChatStore((state) => state.syncError);
  const lastSyncedAtBySession = useJizhiChatStore((state) => state.lastSyncedAtBySession);
  const requestRefresh = useJizhiChatStore((state) => state.requestRefresh);

  const currentSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );
  const messages = useMemo(
    () => (activeSessionId ? (messagesBySession[activeSessionId] ?? []) : []),
    [activeSessionId, messagesBySession],
  );
  const loadingMessages = activeSessionId != null && loadingSessionId === activeSessionId;
  const loading = loadingSessions || loadingMessages;
  const lastSyncedAt = activeSessionId ? lastSyncedAtBySession[activeSessionId] : undefined;

  if (!activeSessionId || !currentSession) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,#f4f8ff,transparent_45%),linear-gradient(180deg,#fbfcfe_0%,#f5f7fb_100%)] dark:bg-[radial-gradient(circle_at_top,#1c2638,transparent_35%),linear-gradient(180deg,#121317_0%,#18191d_100%)]">
        <div className="max-w-md rounded-[28px] border border-black/5 bg-white/80 p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF4FF] text-[#2667D8] dark:bg-white/10 dark:text-white">
            <MessageSquare className="h-7 w-7" />
          </div>
          <div className="text-lg font-semibold">选择一个极智会话</div>
          <p className="mt-2 text-sm leading-6 text-foreground/55">
            左侧 Session list 里的 `极智` 会话会在这里直接渲染。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fc_100%)] dark:bg-[linear-gradient(180deg,#14161a_0%,#181a1f_100%)]">
      <div className="border-b border-black/5 px-6 py-4 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F2FF] text-[#2667D8] dark:bg-white/10 dark:text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold">{currentSession.name}</h1>
              <span className="rounded-full bg-[#E8F2FF] px-2 py-0.5 text-[11px] font-medium text-[#2667D8] dark:bg-white/10 dark:text-white">
                极智
              </span>
              {currentSession.category ? (
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-foreground/60 dark:bg-white/10">
                  {currentSession.category}
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

      <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-6')}>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          {messages.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-dashed border-black/10 bg-white/60 text-sm text-foreground/45 dark:border-white/10 dark:bg-white/5">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在拉取消息列表...
                </div>
              ) : (
                '当前会话暂无可展示消息。'
              )}
            </div>
          ) : (
            messages.map((message) => (
              <MessageRow key={`${message.index}`} message={message} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
