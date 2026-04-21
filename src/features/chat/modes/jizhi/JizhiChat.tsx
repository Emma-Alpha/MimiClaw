import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
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
import { ComposerBase, ComposerChip, ComposerIconButton } from '@/features/mainChat/components/composer';
import { Button } from '@/components/ui/button';
import { JizhiMessageContent } from '@/features/jizhi/components/JizhiMessageContent';
import { cn } from '@/lib/utils';
import {
  CHAT_SESSION_CARD_ICON_SIZE,
  CHAT_SESSION_EMPTY_ICON_SIZE,
} from '@/styles/typography-tokens';
import { useStyles } from './JizhiChat.styles';
import {
  extractDroppedPathsFromTransfer,
  isPathDrag,
  mergeUnifiedComposerPaths,
  toJizhiSubmission,
  type UnifiedComposerPath,
} from '@/lib/unified-composer';
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

function UserBubble({ message, styles }: { message: HostJizhiUserMessage; styles: Record<string, string> }) {
  return (
    <ChatItem
      avatar={{
        avatar: (
          <span className={styles.userAvatarText}>
            我
          </span>
        ),
        backgroundColor: 'rgba(38,103,216,0.14)',
        title: '我',
      }}
      style={{ width: "100%" }}
      message="用户消息"
      placement="right"
      renderMessage={() => <JizhiMessageContent message={message.content} />}
      showTitle={false}
      time={Date.parse(message.createdAt)}
      variant="bubble"
      aboveMessage={(
        <div className={styles.userAbove}>
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
  styles,
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
  styles: Record<string, string>;
}) {
  const timeLabel = formatMessageTime(message.createdAt);
  const modelLabel = message.modelName || message.model || '极智';
  const statusLabel = formatAssistantStatus(message.status);
  const copyText = getAssistantClipboardText(message);

  return (
    <div className={styles.assistantGroupWrap}>
      <ChatItem
        avatar={{
          avatar: (
            <span className={styles.assistantAvatarText}>
              智
            </span>
          ),
          backgroundColor: 'rgba(15,23,42,0.06)',
          title: modelLabel,
        }}
        style={{ width: "100%" }}
        message={modelLabel}
        placement="left"
        renderMessage={() => <JizhiMessageContent message={message.content} />}
        showTitle={false}
        time={Date.parse(message.createdAt)}
        variant="bubble"
        aboveMessage={(
          <div className={styles.assistantAbove}>
            <span>{modelLabel}</span>
            {timeLabel ? <span>{timeLabel}</span> : null}
            {statusLabel ? (
              <span className={styles.assistantStatusBadge}>
                {statusLabel}
              </span>
            ) : null}
          </div>
        )}
      />

      <div className={styles.assistantActions}>
        {group.messages.length > 1 ? (
          <div className={styles.versionSwitcher}>
            {group.messages.map((item, index) => {
              const isActive = item.isActive;
              const isSwitching = switchingMessageUUID === item.messageUUID;

              return (
                <button
                  key={item.messageUUID || `${group.answerGroup}-${index + 1}`}
                  type="button"
                  className={cn(
                    styles.versionBtn,
                    isActive ? styles.versionBtnActive : '',
                  )}
                  disabled={isActive || !canSwitchVersion}
                  onClick={() => onSwitchVersion(item)}
                  title={`切换到回答 ${index + 1}`}
                >
                  {isSwitching ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : index + 1}
                </button>
              );
            })}
          </div>
        ) : null}

        <Button
          type="text"
          size="small"
          style={{ height: 32, borderRadius: 9999, padding: '0 12px', fontSize: 12 }}
          onClick={() => onCopy(message)}
          disabled={!copyText}
        >
          {copied ? <Check style={{ width: 14, height: 14, marginRight: 6 }} /> : <Copy style={{ width: 14, height: 14, marginRight: 6 }} />}
          {copied ? '已复制' : '复制'}
        </Button>

        <Button
          type="text"
          size="small"
          style={{ height: 32, borderRadius: 9999, padding: '0 12px', fontSize: 12 }}
          onClick={() => onRetry(message)}
          disabled={!canRetry}
        >
          <RotateCcw style={{ width: 14, height: 14, marginRight: 6 }} />
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
  styles,
}: {
  message: HostJizhiChatMessage;
  canRetryAssistant: (message: HostJizhiAssistantMessageItem) => boolean;
  canSwitchAssistantVersion: (group: HostJizhiGroupMessages) => boolean;
  onRetryAssistant: (message: HostJizhiAssistantMessageItem) => void;
  onCopyAssistant: (message: HostJizhiAssistantMessageItem) => void;
  onSwitchAssistantVersion: (message: HostJizhiAssistantMessageItem) => void;
  copiedMessageUUID: string | null;
  switchingMessageUUID: string | null;
  styles: Record<string, string>;
}) {
  if (message.role === 'user' && message.userMessage) {
    return <UserBubble message={message.userMessage} styles={styles} />;
  }

  if (message.role === 'assistant' && message.assistantMessage) {
    return (
      <div className={styles.assistantMessageGroup}>
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
              styles={styles}
            />
          );
        })}
      </div>
    );
  }

  return null;
}

export function JizhiChat() {
  const { styles } = useStyles();
  const [draft, setDraft] = useState('');
  const [droppedPaths, setDroppedPaths] = useState<UnifiedComposerPath[]>([]);
  const [dragOver, setDragOver] = useState(false);
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

    const prompt = toJizhiSubmission({
      text: draft,
      paths: droppedPaths,
    }).prompt;
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
      setDroppedPaths([]);
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

  const handleComposerDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isPathDrag(event.dataTransfer ?? null)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  };

  const handleComposerDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!isPathDrag(event.dataTransfer ?? null)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  };

  const handleComposerDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isPathDrag(event.dataTransfer ?? null)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    const dropped = extractDroppedPathsFromTransfer(event.dataTransfer ?? null);
    if (!dropped.length) return;
    setDroppedPaths((current) => mergeUnifiedComposerPaths(current, dropped));
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
      <div className={styles.emptyRoot}>
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <MessageSquare
              style={{ width: CHAT_SESSION_EMPTY_ICON_SIZE, height: CHAT_SESSION_EMPTY_ICON_SIZE }}
            />
          </div>
          <div className={styles.emptyTitle}>选择一个极智会话</div>
          <p className={styles.emptyDesc}>
            左侧 Session list 里的 `极智` 会话会在这里直接渲染。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.headerWrap}>
        <div className={styles.headerInner}>
          <div className={styles.headerCard}>
            <div className={styles.headerIcon}>
              <MessageSquare
                style={{ width: CHAT_SESSION_CARD_ICON_SIZE, height: CHAT_SESSION_CARD_ICON_SIZE }}
              />
            </div>
            <div className={styles.headerContent}>
              <div className={styles.headerTitleRow}>
                <h1 className={styles.headerTitle}>{currentSession.name}</h1>
                <span className={styles.headerBadge}>极智</span>
                {currentSession.category ? (
                  <span className={styles.headerCategoryBadge}>
                    {currentSession.category}
                  </span>
                ) : null}
              </div>
              <div className={styles.headerMeta}>
                <span>{loading ? '同步中...' : lastSyncedAt ? `最近同步 ${formatSyncTime(lastSyncedAt)}` : '等待首次同步'}</span>
                {currentSession.model ? (
                  <>
                    <span className={styles.headerDivider}>/</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSession.model}</span>
                  </>
                ) : null}
              </div>
            </div>
            <Button
              size="small"
              className={styles.headerActionButton}
              onClick={() => requestRefresh()}
              disabled={loading}
            >
              {loading ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <RefreshCw style={{ width: 16, height: 16 }} />}
              刷新
            </Button>
          </div>
        </div>
      </div>

      {syncError ? (
        <div className={styles.syncError}>
          <div className={styles.syncErrorInner}>{syncError}</div>
        </div>
      ) : null}

      <div ref={scrollRef} className={styles.messageList}>
        <div className={styles.messageListInner}>
          {messages.length === 0 ? (
            <div className={styles.emptyMessageBox}>
              {loading ? (
                <div className={styles.loadingRow}>
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
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
                styles={styles}
              />
            ))
          )}
        </div>
      </div>

      <div className={styles.composerWrap}>
        <div className={styles.composerInner}>
          <ComposerBase
            variant="desktop"
            className={styles.composerShell}
            value={draft}
            onInput={setDraft}
            paths={droppedPaths}
            onPathsChange={setDroppedPaths}
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
            dragOver={dragOver}
            onDragOver={handleComposerDragOver}
            onDragLeave={handleComposerDragLeave}
            onDrop={handleComposerDrop}
            leftActions={(
              <>
                <ComposerChip variant="desktop" icon={<Bot />}>
                  {isLlmSession ? '模型模式' : '智能体模式'}
                </ComposerChip>
                {currentSession.model ? (
                  <ComposerChip variant="desktop" icon={<Cpu />}>
                    {currentSession.model}
                  </ComposerChip>
                ) : null}
                {isLlmSession ? (
                  <ComposerChip variant="desktop" icon={<BrainCircuit />}>
                    思考模式
                  </ComposerChip>
                ) : null}
              </>
            )}
            rightActions={canRetry ? (
              <ComposerIconButton
                variant="desktop"
                icon={<RotateCcw />}
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
