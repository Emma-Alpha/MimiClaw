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
  Send,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
    <div className="ml-auto w-full max-w-[92%] rounded-[30px] border border-[#D6E5FF] bg-[linear-gradient(180deg,rgba(244,248,255,0.96)_0%,rgba(236,244,255,0.92)_100%)] px-3 py-3 shadow-[0_14px_38px_rgba(38,103,216,0.08)] dark:border-[#31415E] dark:bg-[linear-gradient(180deg,rgba(33,44,66,0.88)_0%,rgba(24,33,48,0.92)_100%)] dark:shadow-[0_16px_38px_rgba(0,0,0,0.24)] md:max-w-[82%]">
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
    </div>
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
    <div className="w-full max-w-[94%] rounded-[30px] border border-black/6 bg-white/78 px-3 py-3 shadow-[0_16px_42px_rgba(15,23,42,0.07)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_16px_42px_rgba(0,0,0,0.28)] md:max-w-[84%]">
      <div className="space-y-2">
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

function InputBadge({
  children,
  icon,
  compact = false,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-black/6 bg-black/[0.03] text-[12px] font-medium text-foreground/65 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70',
        compact ? 'h-8 gap-1.5 px-3' : 'h-8 px-3',
      )}
    >
      {icon ? <span className="mr-1.5 text-foreground/55">{icon}</span> : null}
      {children}
    </span>
  );
}

function ComposerActionButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full border transition',
        active
          ? 'border-[#2667D8]/18 bg-[#EEF5FF] text-[#2667D8] shadow-[0_4px_12px_rgba(38,103,216,0.10)] dark:border-[#7FB0FF]/20 dark:bg-[#1F2B3F] dark:text-[#8CB8FF]'
          : 'border-black/6 bg-transparent text-foreground/58 hover:bg-black/[0.05] dark:border-white/10 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/[0.08]',
      )}
    >
      {icon}
    </button>
  );
}

export function JizhiChat() {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedMessageUUID, setCopiedMessageUUID] = useState<string | null>(null);
  const [switchingMessageUUID, setSwitchingMessageUUID] = useState<string | null>(null);
  const [composerFocused, setComposerFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
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
  const isLlmSession = currentSession?.category === 'llm';
  const canSend = Boolean(
    activeSessionId
    && currentSession
    && currentSession.category
    && draft.trim()
    && !sending,
  ) && !activeStreamingMessageUUID;

  const canStop = Boolean(activeSessionId && activeStreamingMessageUUID && !sending);
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

  useEffect(() => {
    const node = composerRef.current;
    if (!node) return;

    node.style.height = '0px';
    const nextHeight = Math.min(Math.max(node.scrollHeight, 92), 220);
    node.style.height = `${nextHeight}px`;
  }, [draft]);

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
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
          <div
            className={cn(
              'rounded-[26px] border border-black/8 bg-white/92 p-3 backdrop-blur-xl transition-[border-color,box-shadow,transform,background-color] duration-200 dark:border-white/10 dark:bg-[#181b22]/88',
              composerFocused
                ? 'border-[#2667D8]/30 bg-white shadow-[0_22px_60px_rgba(38,103,216,0.14)] dark:border-[#7FB0FF]/35 dark:bg-[#1a1e26] dark:shadow-[0_24px_65px_rgba(64,116,214,0.18)]'
                : 'shadow-[0_18px_50px_rgba(15,23,42,0.08)] hover:border-black/12 hover:shadow-[0_20px_56px_rgba(15,23,42,0.10)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.32)] dark:hover:border-white/14 dark:hover:bg-[#1a1d24]',
            )}
          >
            <div
              className={cn(
                'rounded-[20px] border border-transparent bg-transparent transition-[background-color,border-color,box-shadow] duration-200',
                composerFocused
                  ? 'bg-[#F9FBFF] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-[#151922]'
                  : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.02]',
              )}
              onClick={() => composerRef.current?.focus()}
            >
              <Textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (canSend) {
                      void handleSend();
                    }
                  }
                }}
                placeholder="输入你想让极智继续处理的内容..."
                disabled={!activeSessionId || sending}
                className="min-h-[92px] resize-none overflow-y-auto border-0 bg-transparent px-2 py-3 text-[15px] leading-7 shadow-none ring-0 placeholder:text-foreground/28 placeholder:transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 dark:placeholder:text-white/22"
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-black/6 px-1 pt-3 dark:border-white/8">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border border-black/6 bg-black/[0.025] px-1.5 py-1 dark:border-white/10 dark:bg-white/[0.03]">
                  <ComposerActionButton
                    icon={<Bot className="h-4 w-4" />}
                    label={isLlmSession ? '模型模式' : '智能体模式'}
                    active={Boolean(currentSession.category)}
                    onClick={() => composerRef.current?.focus()}
                  />
                  <ComposerActionButton
                    icon={<Cpu className="h-4 w-4" />}
                    label={currentSession.model || '当前模型'}
                    active={Boolean(currentSession.model)}
                    onClick={() => composerRef.current?.focus()}
                  />
                  {isLlmSession ? (
                    <ComposerActionButton
                      icon={<BrainCircuit className="h-4 w-4" />}
                      label="思考模式"
                      active
                      onClick={() => composerRef.current?.focus()}
                    />
                  ) : null}
                </div>

                {currentSession.model ? (
                  <InputBadge icon={<Cpu className="h-3.5 w-3.5" />} compact>
                    <span className="max-w-[140px] truncate">{currentSession.model}</span>
                  </InputBadge>
                ) : null}

                <span className={cn('text-[12px] transition-colors', composerFocused ? 'text-foreground/50' : 'text-foreground/40')}>
                  Enter 发送
                </span>
                <span className="text-[12px] text-foreground/28">/</span>
                <span className={cn('text-[12px] transition-colors', composerFocused ? 'text-foreground/50' : 'text-foreground/40')}>
                  Shift + Enter 换行
                </span>
              </div>

              <div className="flex items-center gap-2">
                {canRetry ? (
                  <Button
                    onClick={() => {
                      void handleRetry();
                    }}
                    disabled={!canRetry}
                    variant="ghost"
                    className="h-10 w-10 rounded-full border border-black/8 bg-black/[0.03] px-0 text-[13px] font-medium text-foreground/70 hover:bg-black/[0.045] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80 dark:hover:bg-white/[0.08]"
                    title="重新生成"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  </Button>
                ) : null}

                <div className="inline-flex items-center gap-2">
                  <div className={cn('hidden text-[12px] transition-colors lg:block', composerFocused ? 'text-[#2667D8] dark:text-[#8CB8FF]' : 'text-foreground/42')}>
                    {activeStreamingMessageUUID ? '正在生成' : draft.trim() ? '准备发送' : '等待输入'}
                  </div>
                  <Button
                    onClick={() => {
                      if (activeStreamingMessageUUID) {
                        void handleStop();
                        return;
                      }
                      void handleSend();
                    }}
                    disabled={activeStreamingMessageUUID ? !canStop : !canSend}
                    className={cn(
                      'h-11 w-11 rounded-full px-0 text-[13px] font-medium shadow-[0_10px_24px_rgba(38,103,216,0.18)] transition disabled:shadow-none',
                      activeStreamingMessageUUID
                        ? 'border border-[#E8B6BC] bg-[#FFF3F4] text-[#B42318] hover:bg-[#FFE5E8] dark:border-[#6B2B31] dark:bg-[#33181C] dark:text-[#FFB4A8] dark:hover:bg-[#432126]'
                        : 'bg-[#2667D8] text-white hover:bg-[#1F58BA] dark:bg-[#3B82F6] dark:hover:bg-[#2F6FDB]',
                    )}
                    variant={activeStreamingMessageUUID ? 'outline' : 'default'}
                    title={activeStreamingMessageUUID ? '停止生成' : '发送'}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : activeStreamingMessageUUID ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
