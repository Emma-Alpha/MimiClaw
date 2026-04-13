/**
 * Chat Page
 * Native React implementation communicating with OpenClaw Gateway
 * via gateway:rpc IPC. Session selector, thinking toggle, and refresh
 * are in the toolbar; messages render with markdown + streaming.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type UIEvent } from 'react';
import { AlertCircle, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { createStyles } from 'antd-style';
import VList, { type ListRef } from '@rc-component/virtual-list';
import { useChatStore, type RawMessage } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useAgentsStore } from '@/stores/agents';
import { useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatToolbar } from './ChatToolbar';
import { invokeIpc } from '@/lib/api-client';
import { extractImages, extractText, extractThinking, extractToolUse } from './message-utils';
import { useTranslation } from 'react-i18next';
import { useMinLoading } from '@/hooks/use-min-loading';
import { ChatSkeletonList } from './ChatSkeletonList';

const useStyles = createStyles(({ token, css }) => ({
  chatPage: css`
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: transparent;
    transition: background 0.3s;
  `,
  toolbar: css`
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: flex-end;
    padding: 16px 24px 8px;
  `,
  messagesArea: css`
    position: relative;
    flex: 1;
    overflow-y: auto;
    padding: 0 24px 24px;
  `,
  messagesAreaVirtual: css`
    overflow: hidden;
  `,
  messagesInner: css`
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  messagesInnerVirtual: css`
    height: 100%;
    display: block;
  `,
  timelineRow: css`
    width: 100%;
  `,
  timelineVirtual: css`
    height: 100%;
    overflow-anchor: none;
    padding-bottom: 24px;
  `,
  timelineVirtualItem: css`
    padding-bottom: 24px;
    &:last-child {
      padding-bottom: 0;
    }
  `,
  errorBar: css`
    padding: 8px 16px;
    background: ${token.colorErrorBg};
    border-top: 1px solid ${token.colorErrorBorder};
  `,
  errorInner: css`
    max-width: 896px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,
  errorText: css`
    font-size: var(--mimi-font-size-base);
    color: ${token.colorError};
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  dismissBtn: css`
    font-size: var(--mimi-font-size-sm);
    color: ${token.colorError};
    opacity: 0.6;
    cursor: pointer;
    background: none;
    border: none;
    text-decoration: underline;
    &:hover { opacity: 1; }
  `,
  loadingOverlay: css`
    position: absolute;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${token.colorBgMask};
    backdrop-filter: blur(1px);
    border-radius: 12px;
    pointer-events: auto;
  `,
  loadingCard: css`
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadow};
    border-radius: 9999px;
    padding: 10px;
    border: 1px solid ${token.colorBorderSecondary};
  `,
  welcomeRoot: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 60vh;
  `,
  welcomeTitle: css`
    font-size: var(--mimi-font-size-base);
    font-family: Georgia, Cambria, "Times New Roman", Times, serif;
    color: ${token.colorTextSecondary};
    margin-bottom: 32px;
    font-weight: var(--mimi-font-weight-regular);
    letter-spacing: -0.02em;
  `,
  welcomeActions: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 10px;
    max-width: 512px;
    width: 100%;
  `,
  welcomeChip: css`
    padding: 6px 16px;
    border-radius: 9999px;
    border: 1px solid ${token.colorBorderSecondary};
    font-size: var(--mimi-font-size-md);
    font-weight: var(--mimi-font-weight-medium);
    color: ${token.colorTextSecondary};
    background: ${token.colorFillQuaternary};
    cursor: default;
    transition: background 0.15s;

    &:hover {
      background: ${token.colorFillSecondary};
    }
  `,
  typingBubble: css`
    background: ${token.colorFillSecondary};
    color: ${token.colorText};
    border-radius: ${token.borderRadiusLG}px;
    padding: 12px 16px;
  `,
  activityBubble: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--mimi-font-size-base);
    color: ${token.colorTextSecondary};
    background: ${token.colorFillSecondary};
    border-radius: ${token.borderRadiusLG}px;
    padding: 12px 16px;
  `,
  activityElapsed: css`
    font-size: var(--mimi-font-size-sm);
    color: ${token.colorTextTertiary};
  `,
  backBottom: css`
    position: absolute;
    right: 36px;
    bottom: 22px;
    z-index: 8;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 999px;
    background: ${token.colorBgElevated};
    color: ${token.colorTextSecondary};
    padding: 8px 12px;
    cursor: pointer;
    box-shadow: ${token.boxShadowSecondary};
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  `,
  backBottomVisible: css`
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  `,
}));

const BACK_BOTTOM_THRESHOLD = 40;
const USER_PIN_RETRY_DELAYS = [0, 32, 96];

type TimelineRenderRow = {
  key: string;
  node: ReactNode;
  messageIndex?: number;
};

function isNearBottom(scrollTop: number, scrollHeight: number, clientHeight: number): boolean {
  return scrollHeight - scrollTop - clientHeight <= BACK_BOTTOM_THRESHOLD;
}

export function Chat() {
  const { t } = useTranslation('chat');
  const { styles, cx } = useStyles();
  const location = useLocation();
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';

  const messages = useChatStore((s) => s.messages);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const loading = useChatStore((s) => s.loading);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const showThinking = useChatStore((s) => s.showThinking);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const pendingFinal = useChatStore((s) => s.pendingFinal);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const abortRun = useChatStore((s) => s.abortRun);
  const clearError = useChatStore((s) => s.clearError);
  const switchSession = useChatStore((s) => s.switchSession);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  const cleanupEmptySession = useChatStore((s) => s.cleanupEmptySession);

  const [streamingTimestamp, setStreamingTimestamp] = useState<number>(0);
  const minLoading = useMinLoading(loading && messages.length > 0);
  const messagesAreaRef = useRef<HTMLDivElement | null>(null);
  const vListRef = useRef<ListRef | null>(null);
  const pinTimersRef = useRef<number[]>([]);
  const prevMessagesLengthRef = useRef(messages.length);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [atBottom, setAtBottom] = useState(true);

  // Load data when gateway is running.
  // When the store already holds messages for this session (i.e. the user
  // is navigating *back* to Chat), use quiet mode so the existing messages
  // stay visible while fresh data loads in the background.  This avoids
  // an unnecessary messages → spinner → messages flicker.
  useEffect(() => {
    return () => {
      // If the user navigates away without sending any messages, remove the
      // empty session so it doesn't linger as a ghost entry in the sidebar.
      cleanupEmptySession();
    };
  }, [cleanupEmptySession]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const requestedSessionKey = new URLSearchParams(location.search).get('sessionKey')?.trim() || '';
    if (!requestedSessionKey) return;
    if (requestedSessionKey === currentSessionKey) return;
    switchSession(requestedSessionKey);
  }, [location.search, currentSessionKey, switchSession]);

  // Update timestamp when sending starts
  useEffect(() => {
    if (sending && streamingTimestamp === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStreamingTimestamp(Date.now() / 1000);
    } else if (!sending && streamingTimestamp !== 0) {
      setStreamingTimestamp(0);
    }
  }, [sending, streamingTimestamp]);

  // Gateway not running block has been completely removed so the UI always renders.

  const streamMsg = streamingMessage && typeof streamingMessage === 'object'
    ? streamingMessage as unknown as { role?: string; content?: unknown; timestamp?: number }
    : null;
  const streamText = streamMsg ? extractText(streamMsg) : (typeof streamingMessage === 'string' ? streamingMessage : '');
  const hasStreamText = streamText.trim().length > 0;
  const streamThinking = streamMsg ? extractThinking(streamMsg) : null;
  const hasStreamThinking = showThinking && !!streamThinking && streamThinking.trim().length > 0;
  const streamTools = streamMsg ? extractToolUse(streamMsg) : [];
  const hasStreamTools = streamTools.length > 0;
  const streamImages = streamMsg ? extractImages(streamMsg) : [];
  const hasStreamImages = streamImages.length > 0;
  const hasStreamToolStatus = streamingTools.length > 0;
  const shouldRenderStreaming = sending && (hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus);
  const hasAnyStreamContent = hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus;
  const petUiActivity = !sending
    ? 'idle'
    : (shouldRenderStreaming || pendingFinal)
      ? 'working'
      : 'listening';

  const isEmpty = messages.length === 0 && !sending;
  const showInitialSkeleton = loading && messages.length === 0 && !sending;

  const timelineRows = useMemo<TimelineRenderRow[]>(() => {
    if (showInitialSkeleton || isEmpty) return [];

    const rows: TimelineRenderRow[] = messages.map((msg, idx) => ({
      key: msg.id || `msg-${idx}`,
      messageIndex: idx,
      node: (
        <ChatMessage
          key={msg.id || `msg-${idx}`}
          message={msg}
          showThinking={showThinking}
        />
      ),
    }));

    if (shouldRenderStreaming) {
      rows.push({
        key: 'streaming:message',
        node: (
          <ChatMessage
            message={(streamMsg
              ? {
                  ...(streamMsg as Record<string, unknown>),
                  role: (typeof streamMsg.role === 'string' ? streamMsg.role : 'assistant') as RawMessage['role'],
                  content: streamMsg.content ?? streamText,
                  timestamp: streamMsg.timestamp ?? streamingTimestamp,
                }
              : {
                  role: 'assistant',
                  content: streamText,
                  timestamp: streamingTimestamp,
                }) as RawMessage}
            showThinking={showThinking}
            isStreaming
            streamingTools={streamingTools}
          />
        ),
      });
    }

    if (sending && pendingFinal && !shouldRenderStreaming) {
      rows.push({
        key: 'streaming:pending-final',
        node: (
          <ActivityIndicator
            phase="tool_processing"
            startedAt={streamingTimestamp || undefined}
          />
        ),
      });
    }

    if (sending && !pendingFinal && !hasAnyStreamContent) {
      rows.push({
        key: 'streaming:typing',
        node: <TypingIndicator startedAt={streamingTimestamp || undefined} />,
      });
    }

    return rows;
  }, [
    showInitialSkeleton,
    isEmpty,
    messages,
    showThinking,
    shouldRenderStreaming,
    streamMsg,
    streamText,
    streamingTimestamp,
    streamingTools,
    sending,
    pendingFinal,
    hasAnyStreamContent,
  ]);

  const shouldVirtualize = viewportHeight > 0 && timelineRows.length > 20;

  const clearUserPinTimers = useCallback(() => {
    pinTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    pinTimersRef.current = [];
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

    if (shouldVirtualize) {
      vListRef.current?.scrollTo(Number.MAX_SAFE_INTEGER);
      setAtBottom(true);
      return;
    }

    const node = messagesAreaRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    setAtBottom(true);
  }, [shouldVirtualize]);

  useEffect(() => {
    void invokeIpc('pet:setUiActivity', { activity: petUiActivity }).catch(() => {});
  }, [petUiActivity]);

  useEffect(() => {
    const node = messagesAreaRef.current;
    if (!node) return;

    const update = () => {
      setViewportHeight(Math.max(0, Math.floor(node.clientHeight)));
    };

    update();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const shouldFollow = atBottom && sending;
      if (!shouldFollow || timelineRows.length === 0) return;
      scrollToBottom(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [atBottom, sending, timelineRows.length, scrollToBottom]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => scrollToBottom(false));
    return () => cancelAnimationFrame(raf);
  }, [currentSessionKey, scrollToBottom]);

  const pinToUserMessage = useCallback((messageIndex: number, rowKey: string) => {
    clearUserPinTimers();

    const scrollToUserRow = () => {
      if (shouldVirtualize) {
        vListRef.current?.scrollTo({
          index: messageIndex,
          align: 'top',
        });
        return;
      }

      const container = messagesAreaRef.current;
      if (!container) return;

      const target = Array.from(
        container.querySelectorAll<HTMLElement>('[data-chat-row-key]'),
      ).find((element) => element.dataset.chatRowKey === rowKey);

      if (!target) return;

      container.scrollTo({
        top: Math.max(0, target.offsetTop - 8),
        behavior: 'smooth',
      });
    };

    USER_PIN_RETRY_DELAYS.forEach((delay) => {
      const timerId = window.setTimeout(scrollToUserRow, delay);
      pinTimersRef.current.push(timerId);
    });
  }, [clearUserPinTimers, shouldVirtualize]);

  useEffect(() => {
    return clearUserPinTimers;
  }, [clearUserPinTimers]);

  useEffect(() => {
    const previousLength = prevMessagesLengthRef.current;
    const currentLength = messages.length;
    prevMessagesLengthRef.current = currentLength;

    if (!sending || currentLength <= previousLength) return;

    const lastMessage = messages[currentLength - 1];
    if (!lastMessage || lastMessage.role !== 'user') return;

    const userRow = timelineRows.find((row) => row.messageIndex === currentLength - 1);
    if (!userRow) return;

    pinToUserMessage(currentLength - 1, userRow.key);
  }, [messages, sending, timelineRows, pinToUserMessage]);

  const handleNativeScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setAtBottom(isNearBottom(target.scrollTop, target.scrollHeight, target.clientHeight));
  }, []);

  const handleVirtualScroll = useCallback((event: UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    setAtBottom(isNearBottom(target.scrollTop, target.scrollHeight, target.clientHeight));
  }, []);

  return (
    <div className={styles.chatPage}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <ChatToolbar />
      </div>

      {/* Messages Area */}
      <div
        ref={messagesAreaRef}
        className={cx(styles.messagesArea, shouldVirtualize && styles.messagesAreaVirtual)}
        onScroll={!shouldVirtualize ? handleNativeScroll : undefined}
      >
        <div className={cx(styles.messagesInner, shouldVirtualize && styles.messagesInnerVirtual)}>
          {showInitialSkeleton ? (
            <ChatSkeletonList />
          ) : isEmpty ? (
            <WelcomeScreen />
          ) : shouldVirtualize ? (
            <VList<TimelineRenderRow>
              ref={vListRef}
              data={timelineRows}
              height={viewportHeight}
              itemHeight={80}
              itemKey="key"
              className={styles.timelineVirtual}
              onScroll={handleVirtualScroll}
            >
              {(row) => (
                <div className={styles.timelineVirtualItem} data-chat-row-key={row.key}>
                  {row.node}
                </div>
              )}
            </VList>
          ) : (
            <>
              {timelineRows.map((row) => (
                <div
                  key={row.key}
                  className={styles.timelineRow}
                  data-chat-row-key={row.key}
                >
                  {row.node}
                </div>
              ))}
            </>
          )}
        </div>

        {!isEmpty && !showInitialSkeleton && (
          <button
            type="button"
            className={cx(styles.backBottom, !atBottom && styles.backBottomVisible)}
            onClick={() => scrollToBottom(true)}
            title={t('backToBottom', { defaultValue: 'Back to bottom' })}
          >
            <ChevronDown style={{ width: 14, height: 14 }} />
            <span>{t('backToBottom', { defaultValue: 'Back to bottom' })}</span>
          </button>
        )}
      </div>

      {/* Error bar */}
      {error && (
        <div className={styles.errorBar}>
          <div className={styles.errorInner}>
            <p className={styles.errorText}>
              <AlertCircle style={{ width: 16, height: 16 }} />
              {error}
            </p>
            <button type="button" onClick={clearError} className={styles.dismissBtn}>
              {t('common:actions.dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        onSend={sendMessage}
        onStop={abortRun}
        disabled={!isGatewayRunning}
        sending={sending}
      />

      {/* Loading overlay */}
      {minLoading && !sending && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingCard}>
            <LoadingSpinner size="md" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Welcome Screen ──────────────────────────────────────────────

function WelcomeScreen() {
  const { t } = useTranslation('chat');
  const { styles } = useStyles();
  const quickActions = [
    { key: 'askQuestions', label: t('welcome.askQuestions') },
    { key: 'creativeTasks', label: t('welcome.creativeTasks') },
    { key: 'brainstorming', label: t('welcome.brainstorming') },
  ];

  return (
    <div className={styles.welcomeRoot}>
      <h1 className={styles.welcomeTitle}>{t('welcome.subtitle')}</h1>
      <div className={styles.welcomeActions}>
        {quickActions.map(({ key, label }) => (
          <button type="button" key={key} className={styles.welcomeChip}>{label}</button>
        ))}
      </div>
    </div>
  );
}

function useElapsedLabel(startedAt?: number): string | null {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startedAt) return;

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor(Date.now() / 1000 - startedAt)));
    };

    updateElapsed();
    const id = setInterval(updateElapsed, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (elapsedSeconds < 2) return null;
  return `${elapsedSeconds}s`;
}

// ── Typing Indicator ────────────────────────────────────────────

function TypingIndicator({ startedAt }: { startedAt?: number }) {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  const elapsed = useElapsedLabel(startedAt);

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', width: 32, height: 32, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginTop: 4, background: 'rgba(0,0,0,0.05)' }}>
        <Sparkles style={{ width: 16, height: 16 }} />
      </div>
      <div className={styles.typingBubble}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>{t('status.thinking', { defaultValue: 'Thinking...' })}</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', opacity: 0.4, animation: 'bounce 1s infinite', animationDelay: '0ms' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', opacity: 0.4, animation: 'bounce 1s infinite', animationDelay: '150ms' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', opacity: 0.4, animation: 'bounce 1s infinite', animationDelay: '300ms' }} />
          {elapsed && <span className={styles.activityElapsed}>({elapsed})</span>}
        </div>
      </div>
    </div>
  );
}

// ── Activity Indicator ──────────────────────────────────────────

function ActivityIndicator({ phase, startedAt }: { phase: 'tool_processing'; startedAt?: number }) {
  void phase;
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  const elapsed = useElapsedLabel(startedAt);

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', width: 32, height: 32, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginTop: 4, background: 'rgba(0,0,0,0.05)' }}>
        <Sparkles style={{ width: 16, height: 16 }} />
      </div>
      <div className={styles.activityBubble}>
        <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
        <span>{t('status.processingTools', { defaultValue: 'Processing tool results...' })}</span>
        {elapsed && <span className={styles.activityElapsed}>({elapsed})</span>}
      </div>
    </div>
  );
}

export default Chat;
