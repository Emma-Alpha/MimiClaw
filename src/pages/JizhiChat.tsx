import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatItem } from '@lobehub/ui/chat';
import {
  Bot,
  BrainCircuit,
  Check,
  Copy,
  Cpu,
  Loader2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { ComposerBase, ComposerChip, ComposerIconButton } from '@/components/common/composer';
import { Button } from '@/components/ui/button';
import { JizhiMessageContent } from '@/components/jizhi/JizhiMessageContent';
import { cn } from '@/lib/utils';
import {
  activeHostJizhiMessage,
  retryHostJizhiMessage,
  sendHostJizhiMessage,
  stopHostJizhiMessage,
} from '@/lib/jizhi-chat';
import { useJizhiChatStore } from '@/stores/jizhi-chat';
import { useJizhiSessionsStore } from '@/stores/jizhi-sessions';
import type {
  HostJizhiAssistantMessageItem,
  HostJizhiChatMessage,
  HostJizhiGroupMessages,
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

function formatAssistantStatus(status?: string): string {
  if (!status || status === 'success') return '';

  if (status === 'loading') return '生成中';
  if (status === 'error') return '生成失败';
  if (status === 'stopped') return '已停止';
  return status;
}

function parseStructuredText(raw: string): { content?: string; reasonContent?: string } | null {
  try {
    return JSON.parse(raw) as { content?: string; reasonContent?: string };
  } catch {
    return null;
  }
}

function getAssistantClipboardText(message: HostJizhiAssistantMessageItem): string {
  const parts: string[] = [];

  for (const item of message.content.items) {
    if (item.contentType === 'text' || item.contentType === 'steps') {
      const payload = parseStructuredText(item.content);
      const reasonContent = payload?.reasonContent?.trim();
      const content = payload?.content?.trim();

      if (reasonContent) {
        parts.push(`【思考】\n${reasonContent}`);
      }
      if (content) {
        parts.push(content);
      }
      continue;
    }

    if (item.contentType === 'fileSet') {
      try {
        const payload = JSON.parse(item.content) as { files?: Array<{ fileName?: string }> };
        const fileNames = (payload.files ?? [])
          .map((file) => file.fileName?.trim())
          .filter((value): value is string => Boolean(value));
        if (fileNames.length > 0) {
          parts.push(`【文件】\n${fileNames.join('\n')}`);
        }
      } catch {
        // ignore parse failure
      }
    }
  }

  return parts.join('\n\n').trim();
}

function getActiveAssistantMessage(group: HostJizhiGroupMessages): HostJizhiAssistantMessageItem | null {
  return group.messages.find((item) => item.isActive) ?? group.messages[0] ?? null;
}

function getLatestAssistantMessage(messages: HostJizhiChatMessage[]): HostJizhiAssistantMessageItem | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const chatMessage = messages[messageIndex];
    const groupMessages = chatMessage.assistantMessage?.groupMessages ?? [];

    for (let groupIndex = groupMessages.length - 1; groupIndex >= 0; groupIndex -= 1) {
      const activeMessage = getActiveAssistantMessage(groupMessages[groupIndex]);
      if (activeMessage) {
        return activeMessage;
      }
    }
  }

  return null;
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
        <div className="mb-2 flex justify-end px-1 text-[11px] text-[#4B6EA8]/70 dark:text-white/42">
          <span>{formatMessageTime(message.createdAt)}</span>
        </div>
      )}
    />
  );
}

function AssistantBubble({
  group,
  message,
  canRetry,
  canSwitchVersion,
  onRetry,
  onCopy,
  onSwitchVersion,
  copied,
  switchingMessageUUID,
}: {
  group: HostJizhiGroupMessages;
  message: HostJizhiAssistantMessageItem;
  canRetry: boolean;
  canSwitchVersion: boolean;
  onRetry: (message: HostJizhiAssistantMessageItem) => void;
  onCopy: (message: HostJizhiAssistantMessageItem) => void;
  onSwitchVersion: (message: HostJizhiAssistantMessageItem) => void;
  copied: boolean;
  switchingMessageUUID: string | null;
}) {
  const timeLabel = formatMessageTime(message.createdAt);
  const modelLabel = message.modelName || message.model || '极智';
  const statusLabel = formatAssistantStatus(message.status);
  const copyText = getAssistantClipboardText(message);

  return (
    <div className="space-y-2 w-full">
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
            {statusLabel ? (
              <span className="rounded-full bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
                {statusLabel}
              </span>
            ) : null}
          </div>
        )}
      />

      <div className="ml-12 flex flex-wrap items-center gap-2 pt-1">
        {group.messages.length > 1 ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-black/5 p-1 dark:bg-white/10">
            {group.messages.map((item, index) => {
              const isActive = item.isActive;
              const isSwitching = switchingMessageUUID === item.messageUUID;

              return (
                <button
                  key={item.messageUUID || `${group.answerGroup}-${index + 1}`}
                  type="button"
                  className={cn(
                    'flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] transition',
                    isActive
                      ? 'bg-white text-foreground shadow-sm dark:bg-black/30'
                      : 'text-foreground/55 hover:text-foreground',
                  )}
                  disabled={isActive || !canSwitchVersion}
                  onClick={() => onSwitchVersion(item)}
                  title={`切换到回答 ${index + 1}`}
                >
                  {isSwitching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : index + 1}
                </button>
              );
            })}
          </div>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-full px-3 text-xs text-foreground/55"
          onClick={() => onCopy(message)}
          disabled={!copyText}
        >
          {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
          {copied ? '已复制' : '复制'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-full px-3 text-xs text-foreground/55"
          onClick={() => onRetry(message)}
          disabled={!canRetry}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          重新生成
        </Button>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  canRetryAssistant,
  canSwitchAssistantVersion,
  onRetryAssistant,
  onCopyAssistant,
  onSwitchAssistantVersion,
  copiedMessageUUID,
  switchingMessageUUID,
}: {
  message: HostJizhiChatMessage;
  canRetryAssistant: (message: HostJizhiAssistantMessageItem) => boolean;
  canSwitchAssistantVersion: (group: HostJizhiGroupMessages) => boolean;
  onRetryAssistant: (message: HostJizhiAssistantMessageItem) => void;
  onCopyAssistant: (message: HostJizhiAssistantMessageItem) => void;
  onSwitchAssistantVersion: (message: HostJizhiAssistantMessageItem) => void;
  copiedMessageUUID: string | null;
  switchingMessageUUID: string | null;
}) {
  if (message.role === 'user' && message.userMessage) {
    return <UserBubble message={message.userMessage} />;
  }

  if (message.role === 'assistant' && message.assistantMessage) {
    return (
      <div className="space-y-4">
        {message.assistantMessage.groupMessages.map((group, index) => {
          const activeMessage = getActiveAssistantMessage(group);
          if (!activeMessage) return null;

          return (
            <AssistantBubble
              key={group.answerGroup || activeMessage.messageUUID || `${message.index}-${index}`}
              group={group}
              message={activeMessage}
              canRetry={canRetryAssistant(activeMessage)}
              canSwitchVersion={canSwitchAssistantVersion(group)}
              onRetry={onRetryAssistant}
              onCopy={onCopyAssistant}
              onSwitchVersion={onSwitchAssistantVersion}
              copied={copiedMessageUUID === activeMessage.messageUUID}
              switchingMessageUUID={switchingMessageUUID}
            />
          );
        })}
      </div>
    );
  }

  return null;
}

export function JizhiChat() {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedMessageUUID, setCopiedMessageUUID] = useState<string | null>(null);
  const [switchingMessageUUID, setSwitchingMessageUUID] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const copyTimeoutRef = useRef<number | null>(null);

  const activeSessionId = useJizhiSessionsStore((state) => state.activeSessionId);
  const sessions = useJizhiSessionsStore((state) => state.sessions);
  const loadingSessions = useJizhiSessionsStore((state) => state.loading);

  const messagesBySession = useJizhiChatStore((state) => state.messagesBySession);
  const pendingMessagesBySession = useJizhiChatStore((state) => state.pendingMessagesBySession);
  const loadingSessionId = useJizhiChatStore((state) => state.loadingSessionId);
  const syncError = useJizhiChatStore((state) => state.syncError);
  const lastSyncedAtBySession = useJizhiChatStore((state) => state.lastSyncedAtBySession);
  const requestRefresh = useJizhiChatStore((state) => state.requestRefresh);
  const setChatSyncError = useJizhiChatStore((state) => state.setSyncError);
  const appendPendingMessagePair = useJizhiChatStore((state) => state.appendPendingMessagePair);
  const appendPendingAssistant = useJizhiChatStore((state) => state.appendPendingAssistant);
  const markPendingPairError = useJizhiChatStore((state) => state.markPendingPairError);

  const currentSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );
  const isLlmSession = currentSession?.category?.toLowerCase().includes('llm') ?? false;
  const messages = useMemo(
    () => {
      if (!activeSessionId) return [];
      const syncedMessages = messagesBySession[activeSessionId] ?? [];
      const pendingMessages = (pendingMessagesBySession[activeSessionId] ?? [])
        .flatMap((pair) => pair.messages);
      return [...syncedMessages, ...pendingMessages];
    },
    [activeSessionId, messagesBySession, pendingMessagesBySession],
  );
  const loadingMessages = activeSessionId != null && loadingSessionId === activeSessionId;
  const loading = loadingSessions || loadingMessages;
  const lastSyncedAt = activeSessionId ? lastSyncedAtBySession[activeSessionId] : undefined;
  const activeStreamingMessageUUID = useMemo(() => {
    if (!activeSessionId) return null;

    const pairs = pendingMessagesBySession[activeSessionId] ?? [];
    for (let index = pairs.length - 1; index >= 0; index -= 1) {
      const pair = pairs[index];
      const assistantMessage = pair.messages.find((message) => message.role === 'assistant')?.assistantMessage;
      const activeItem = assistantMessage?.groupMessages
        .flatMap((group) => group.messages)
        .find((item) => item.status === 'loading');
      if (activeItem?.messageUUID) {
        return activeItem.messageUUID;
      }
    }

    return null;
  }, [activeSessionId, pendingMessagesBySession]);
  const latestAssistantMessage = useMemo(() => {
    return getLatestAssistantMessage(messages);
  }, [messages]);

  const canRetry = Boolean(
    activeSessionId
    && currentSession?.category
    && latestAssistantMessage?.messageUUID
    && latestAssistantMessage?.model
    && !activeStreamingMessageUUID
    && !sending,
  );

  const handleStop = async () => {
    if (!activeSessionId || !activeStreamingMessageUUID) return;

    setSending(true);
    setChatSyncError(null);
    try {
      await stopHostJizhiMessage({
        sessionId: activeSessionId,
        messageUUID: activeStreamingMessageUUID,
      });
      requestRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatSyncError(message);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    shouldScrollToBottomRef.current = false;
  }, [messages, loading]);



  useEffect(() => () => {
    if (copyTimeoutRef.current != null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
  }, []);

  const handleSend = async () => {
    if (!activeSessionId || !currentSession) return;

    const prompt = draft.trim();
    if (!prompt) return;
    if (!currentSession.category) {
      setChatSyncError('当前极智会话缺少 category，暂时无法发送消息。');
      return;
    }

    setSending(true);
    setChatSyncError(null);
    const messageUUID = `msg_${crypto.randomUUID()}`;
    try {
      appendPendingMessagePair({
        sessionId: activeSessionId,
        prompt,
        assistantMessageUUID: messageUUID,
        model: currentSession.model,
        modelName: currentSession.model,
      });
      shouldScrollToBottomRef.current = true;
      setDraft('');
      await sendHostJizhiMessage({
        sessionId: activeSessionId,
        prompt,
        category: currentSession.category,
        model: currentSession.model,
        messageUUID,
      });
      requestRefresh();
      window.setTimeout(() => {
        requestRefresh();
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markPendingPairError(activeSessionId, messageUUID, message);
      setChatSyncError(message);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async () => {
    if (!latestAssistantMessage) {
      return;
    }
    await retryAssistantMessage(latestAssistantMessage);
  };

  const retryAssistantMessage = async (assistantMessage: HostJizhiAssistantMessageItem) => {
    if (!activeSessionId || !currentSession?.category || !assistantMessage.messageUUID || !assistantMessage.model) {
      return;
    }

    setSending(true);
    setChatSyncError(null);
    try {
      const result = await retryHostJizhiMessage({
        sessionId: activeSessionId,
        messageUUID: assistantMessage.messageUUID,
        category: currentSession.category,
        model: assistantMessage.model,
      });

      if (result.messageUUID) {
        appendPendingAssistant({
          sessionId: activeSessionId,
          assistantMessageUUID: result.messageUUID,
          model: assistantMessage.model,
          modelName: assistantMessage.modelName || assistantMessage.model,
          placeholderText: '极智重新生成中...',
        });
      }

      requestRefresh();
      window.setTimeout(() => {
        requestRefresh();
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatSyncError(message);
    } finally {
      setSending(false);
    }
  };

  const handleCopyAssistant = async (assistantMessage: HostJizhiAssistantMessageItem) => {
    const text = getAssistantClipboardText(assistantMessage);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageUUID(assistantMessage.messageUUID);
      if (copyTimeoutRef.current != null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedMessageUUID(null);
        copyTimeoutRef.current = null;
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatSyncError(`复制失败：${message}`);
    }
  };

  const canRetryAssistant = (assistantMessage: HostJizhiAssistantMessageItem) => Boolean(
    activeSessionId
    && currentSession?.category
    && assistantMessage.messageUUID
    && assistantMessage.model
    && !activeStreamingMessageUUID
    && !sending,
  );

  const canSwitchAssistantVersion = (group: HostJizhiGroupMessages) => Boolean(
    group.messages.length > 1
    && !activeStreamingMessageUUID
    && !sending
    && !switchingMessageUUID,
  );

  const handleSwitchAssistantVersion = async (assistantMessage: HostJizhiAssistantMessageItem) => {
    if (!assistantMessage.messageUUID || switchingMessageUUID) {
      return;
    }

    setSwitchingMessageUUID(assistantMessage.messageUUID);
    setChatSyncError(null);
    try {
      await activeHostJizhiMessage({
        messageUUID: assistantMessage.messageUUID,
      });
      requestRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatSyncError(message);
    } finally {
      setSwitchingMessageUUID(null);
    }
  };

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
      <div className="px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-4 rounded-[28px] border border-black/6 bg-white/72 px-4 py-4 shadow-[0_16px_44px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_18px_44px_rgba(0,0,0,0.24)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#EEF5FF_0%,#E2EEFF_100%)] text-[#2667D8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_100%)] dark:text-white">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-semibold tracking-[0.01em]">{currentSession.name}</h1>
                <span className="rounded-full bg-[#E8F2FF] px-2.5 py-1 text-[11px] font-medium text-[#2667D8] dark:bg-white/10 dark:text-white">
                  极智
                </span>
                {currentSession.category ? (
                  <span className="rounded-full border border-black/6 bg-black/[0.03] px-2.5 py-1 text-[11px] font-medium text-foreground/60 dark:border-white/10 dark:bg-white/[0.05]">
                    {currentSession.category}
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-foreground/45">
                <span>{loading ? '同步中...' : lastSyncedAt ? `最近同步 ${formatSyncTime(lastSyncedAt)}` : '等待首次同步'}</span>
                {currentSession.model ? (
                  <>
                    <span className="text-foreground/25">/</span>
                    <span className="truncate">{currentSession.model}</span>
                  </>
                ) : null}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full border-black/8 bg-white/70 shadow-none hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
              onClick={() => requestRefresh()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              刷新
            </Button>
          </div>
        </div>
      </div>

      {syncError ? (
        <div className="px-6 pb-2 text-sm text-[#B42318] dark:text-[#FFB4A8]">
          <div className="mx-auto max-w-5xl">{syncError}</div>
        </div>
      ) : null}

      <div ref={scrollRef} className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-6')}>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-4">
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
              <MessageRow
                key={`${message.index}`}
                message={message}
                canRetryAssistant={canRetryAssistant}
                canSwitchAssistantVersion={canSwitchAssistantVersion}
                onRetryAssistant={(assistantMessage) => {
                  void retryAssistantMessage(assistantMessage);
                }}
                onCopyAssistant={(assistantMessage) => {
                  void handleCopyAssistant(assistantMessage);
                }}
                onSwitchAssistantVersion={(assistantMessage) => {
                  void handleSwitchAssistantVersion(assistantMessage);
                }}
                copiedMessageUUID={copiedMessageUUID}
                switchingMessageUUID={switchingMessageUUID}
              />
            ))
          )}
        </div>
      </div>

      <div className="border-t border-black/5 px-6 py-4 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-[800px] flex-col gap-3">
          <ComposerBase
            variant="desktop"
            value={draft}
            onInput={setDraft}
            onSend={() => {
              void handleSend();
            }}
            onStop={() => {
              void handleStop();
            }}
            loading={sending || Boolean(activeStreamingMessageUUID)}
            disabled={!activeSessionId || sending}
            sendDisabled={!activeSessionId || sending}
            placeholder="输入你想让极智继续处理的内容..."
            leftActions={(
              <>
                <ComposerChip variant="desktop" icon={<Bot className="h-3.5 w-3.5" />}>
                  {isLlmSession ? '模型模式' : '智能体模式'}
                </ComposerChip>
                {currentSession.model ? (
                  <ComposerChip variant="desktop" icon={<Cpu className="h-3.5 w-3.5" />}>
                    {currentSession.model}
                  </ComposerChip>
                ) : null}
                {isLlmSession ? (
                  <ComposerChip variant="desktop" icon={<BrainCircuit className="h-3.5 w-3.5" />}>
                    思考模式
                  </ComposerChip>
                ) : null}
              </>
            )}
            rightActions={canRetry ? (
              <ComposerIconButton
                variant="desktop"
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={() => { void handleRetry(); }}
                disabled={!canRetry}
                title="重新生成"
              />
            ) : null}
            sendTexts={{
              send: '发送',
              stop: '停止',
              warp: 'Shift + Enter',
            }}
          />
        </div>
      </div>
    </div>
  );
}
