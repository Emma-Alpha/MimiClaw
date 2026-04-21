import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Loader2, OctagonX } from 'lucide-react';
import { createStyles } from 'antd-style';
import { VList, type VListHandle } from 'virtua';
import { OpenClaw } from '@lobehub/icons';
import { ChatItem } from '@lobehub/ui/chat';
import { useTranslation } from 'react-i18next';
import { invokeIpc } from '@/lib/api-client';
import { useMinLoading } from '@/hooks/use-min-loading';
import { useSettingsStore } from '@/stores/settings';
import { type RawMessage } from '@/stores/chat';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BackBottomButton } from '@/components/common/BackBottomButton';
import { CHAT_SESSION_HEADER_ICON_SIZE } from '@/styles/typography-tokens';
import { ChatMessage } from './ChatMessage';
import { ChatSkeletonList } from './ChatSkeletonList';
import { extractImages, extractText, extractThinking, extractToolUse } from '../lib/message-utils';
import { useMessageStyles } from './messages/styles';

const useStyles = createStyles(({ token, css }) => ({
  messagesArea: css`
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  `,
  scrollableContent: css`
    height: 100%;
    overflow-y: auto;
    padding: 12px 0 24px;
  `,
  scrollableInner: css`
    max-width: calc(var(--chat-window-content-width) + (var(--chat-window-side-gap) * 2));
    width: 100%;
    margin: 0 auto;
    padding-inline: var(--chat-window-side-gap);
    box-sizing: border-box;
  `,
  timelineVirtualItem: css`
    max-width: calc(var(--chat-window-content-width) + (var(--chat-window-side-gap) * 2));
    width: 100%;
    margin: 0 auto;
    padding: 0 var(--chat-window-side-gap) 20px;
    box-sizing: border-box;
  `,
  backBottomAnchor: css`
    position: absolute;
    inset: 0;
    width: calc(100% - ((var(--chat-window-side-gap) * 2) + (var(--chat-dock-inline-padding) * 2)));
    max-width: calc(var(--chat-window-content-width) - (var(--chat-dock-inline-padding) * 2));
    margin: 0 auto;
    overflow: visible;
    pointer-events: none;
    z-index: 8;
  `,
  backBottomButton: css`
    inset-block-end: 24px;
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
    height: 100%;
    padding: 48px var(--chat-window-side-gap);
    max-width: var(--chat-window-content-width);
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  `,
  welcomeTitle: css`
    font-size: 22px;
    font-weight: 600;
    color: ${token.colorText};
    margin-bottom: 10px;
    letter-spacing: -0.025em;
  `,
  welcomeSubtitle: css`
    font-size: 14px;
    color: ${token.colorTextSecondary};
    margin-bottom: 40px;
    font-weight: 400;
  `,
  welcomeActions: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    max-width: 480px;
    width: 100%;
  `,
  welcomeChip: css`
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid color-mix(in oklab, ${token.colorText} 8%, transparent);
    font-size: 13px;
    font-weight: 450;
    color: ${token.colorTextSecondary};
    background: color-mix(in oklab, ${token.colorText} 2%, transparent);
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.12s;
    text-align: left;

    &:hover {
      background: color-mix(in oklab, ${token.colorText} 6%, transparent);
      border-color: color-mix(in oklab, ${token.colorText} 12%, transparent);
      color: ${token.colorText};
      transform: translateY(-1px);
    }
  `,
  interruptedHint: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorWarningBorder};
    background: ${token.colorWarningBg};
    color: ${token.colorWarningText};
    font-size: var(--mimi-font-size-sm);
    width: fit-content;
    max-width: 480px;
    margin-left: 44px;
  `,
}));

const BACK_BOTTOM_THRESHOLD = 40;
type TimelineRenderRow = { key: string; node: ReactNode; messageIndex?: number };

type ConversationViewProps = {
  messages: RawMessage[];
  currentSessionKey: string;
  loading: boolean;
  sending: boolean;
  error: string | null;
  showThinking: boolean;
  streamingMessage: unknown | null;
  streamingTools: Array<{ id?: string; toolCallId?: string; name: string; status: 'running' | 'completed' | 'error'; durationMs?: number; summary?: string; updatedAt: number }>;
  pendingFinal: boolean;
  lastRunWasAborted: boolean;
  clearError: () => void;
};

export function ConversationView({ messages, currentSessionKey, loading, sending, error, showThinking, streamingMessage, streamingTools, pendingFinal, lastRunWasAborted, clearError }: ConversationViewProps) {
  const { t } = useTranslation('chat');
  const { styles } = useStyles();
  const enableAutoScrollOnStreaming = useSettingsStore((s) => s.enableAutoScrollOnStreaming);
  const [streamingTimestamp, setStreamingTimestamp] = useState<number>(0);
  const minLoading = useMinLoading(loading && messages.length > 0);
  const vListRef = useRef<VListHandle | null>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    if (sending && streamingTimestamp === 0) setStreamingTimestamp(Date.now() / 1000);
    else if (!sending && streamingTimestamp !== 0) setStreamingTimestamp(0);
  }, [sending, streamingTimestamp]);

  const streamMsg = streamingMessage && typeof streamingMessage === 'object' ? streamingMessage as { role?: string; content?: unknown; timestamp?: number } : null;
  const streamText = streamMsg ? extractText(streamMsg) : (typeof streamingMessage === 'string' ? streamingMessage : '');
  const hasStreamText = streamText.trim().length > 0;
  const streamThinking = streamMsg ? extractThinking(streamMsg) : null;
  const hasStreamThinking = showThinking && !!streamThinking && streamThinking.trim().length > 0;
  const streamTools = streamMsg ? extractToolUse(streamMsg) : [];
  const streamImages = streamMsg ? extractImages(streamMsg) : [];
  const hasStreamTools = streamTools.length > 0;
  const hasStreamImages = streamImages.length > 0;
  const hasStreamToolStatus = streamingTools.length > 0;
  const shouldRenderStreaming = sending && (hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus);
  const hasAnyStreamContent = hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus;
  const petUiActivity = !sending ? 'idle' : (shouldRenderStreaming || pendingFinal) ? 'working' : 'listening';
  const isEmpty = messages.length === 0 && !sending;
  const showInitialSkeleton = loading && messages.length === 0 && !sending;

  const timelineRows = useMemo<TimelineRenderRow[]>(() => {
    if (showInitialSkeleton || isEmpty) return [];
    const rows: TimelineRenderRow[] = messages.map((msg, idx) => ({
      key: msg.id || `msg-${idx}`,
      messageIndex: idx,
      node: <ChatMessage key={msg.id || `msg-${idx}`} message={msg} showThinking={showThinking} />,
    }));
    if (shouldRenderStreaming) {
      rows.push({
        key: 'streaming:message',
        node: <ChatMessage message={(streamMsg ? { ...(streamMsg as Record<string, unknown>), role: (typeof streamMsg.role === 'string' ? streamMsg.role : 'assistant') as RawMessage['role'], content: streamMsg.content ?? streamText, timestamp: streamMsg.timestamp ?? streamingTimestamp } : { role: 'assistant', content: streamText, timestamp: streamingTimestamp }) as RawMessage} showThinking={showThinking} isStreaming streamingTools={streamingTools} />,
      });
    }
    if (sending && pendingFinal && !shouldRenderStreaming) rows.push({ key: 'streaming:pending-final', node: <ActivityIndicator phase="tool_processing" startedAt={streamingTimestamp || undefined} /> });
    if (sending && !pendingFinal && !hasAnyStreamContent) rows.push({ key: 'streaming:typing', node: <TypingIndicator startedAt={streamingTimestamp || undefined} /> });
    if (!sending && lastRunWasAborted) rows.push({ key: 'hint:interrupted', node: <InterruptedHint /> });
    return rows;
  }, [showInitialSkeleton, isEmpty, messages, showThinking, shouldRenderStreaming, streamMsg, streamText, streamingTimestamp, streamingTools, sending, pendingFinal, hasAnyStreamContent, lastRunWasAborted]);

  const scrollToBottom = useCallback((smooth = true) => {
    if (timelineRows.length === 0) return;
    vListRef.current?.scrollToIndex(timelineRows.length - 1, { align: 'end', smooth });
    setAtBottom(true);
  }, [timelineRows.length]);

  useEffect(() => { void invokeIpc('pet:setUiActivity', { activity: petUiActivity }).catch(() => {}); }, [petUiActivity]);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const shouldFollow = enableAutoScrollOnStreaming && atBottom && sending;
      if (!shouldFollow || timelineRows.length === 0) return;
      scrollToBottom(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [atBottom, enableAutoScrollOnStreaming, sending, timelineRows.length, scrollToBottom]);
  useEffect(() => {
    const raf = requestAnimationFrame(() => scrollToBottom(false));
    return () => cancelAnimationFrame(raf);
  }, [currentSessionKey, scrollToBottom]);
  useEffect(() => { prevMessagesLengthRef.current = messages.length; }, [messages.length]);

  const handleScroll = useCallback((offset: number) => {
    const ref = vListRef.current;
    if (!ref) return;
    setAtBottom(ref.scrollSize - offset - ref.viewportSize <= BACK_BOTTOM_THRESHOLD);
  }, []);

  return (
    <>
      <div className={styles.messagesArea}>
        {showInitialSkeleton ? (
          <div className={styles.scrollableContent}><div className={styles.scrollableInner}><ChatSkeletonList /></div></div>
        ) : isEmpty ? (
          <div className={styles.scrollableContent}><WelcomeScreen /></div>
        ) : (
          <VList<TimelineRenderRow>
            ref={vListRef}
            data={timelineRows}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: 'auto', paddingTop: 20, paddingBottom: 24 }}
            onScroll={handleScroll}
          >
            {(row) => <div className={styles.timelineVirtualItem} data-chat-row-key={row.key}>{row.node}</div>}
          </VList>
        )}
        {!isEmpty && !showInitialSkeleton && (
          <div className={styles.backBottomAnchor}>
            <BackBottomButton visible={!atBottom} className={styles.backBottomButton} onScrollToBottom={() => scrollToBottom(true)} />
          </div>
        )}
      </div>
      {error && (
        <div className={styles.errorBar}>
          <div className={styles.errorInner}>
            <p className={styles.errorText}><AlertCircle style={{ width: 16, height: 16 }} />{error}</p>
            <button type="button" onClick={clearError} className={styles.dismissBtn}>{t('common:actions.dismiss')}</button>
          </div>
        </div>
      )}
      {minLoading && !sending && <div className={styles.loadingOverlay}><div className={styles.loadingCard}><LoadingSpinner size="md" /></div></div>}
    </>
  );
}

function WelcomeScreen() {
  const { t } = useTranslation('chat');
  const { styles } = useStyles();
  const quickActions = [{ key: 'askQuestions', label: t('welcome.askQuestions') }, { key: 'creativeTasks', label: t('welcome.creativeTasks') }, { key: 'brainstorming', label: t('welcome.brainstorming') }];
  return <div className={styles.welcomeRoot}><h1 className={styles.welcomeTitle}>{t('welcome.title', { defaultValue: '有什么可以帮你？' })}</h1><p className={styles.welcomeSubtitle}>{t('welcome.subtitle')}</p><div className={styles.welcomeActions}>{quickActions.map(({ key, label }) => <button type="button" key={key} className={styles.welcomeChip}>{label}</button>)}</div></div>;
}

function useElapsedLabel(startedAt?: number): string | null {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const updateElapsed = () => setElapsedSeconds(Math.max(0, Math.floor(Date.now() / 1000 - startedAt)));
    updateElapsed();
    const id = setInterval(updateElapsed, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (elapsedSeconds < 2) return null;
  return `${elapsedSeconds}s`;
}

function TypingIndicator({ startedAt }: { startedAt?: number }) {
  const { styles } = useMessageStyles();
  const elapsed = useElapsedLabel(startedAt);
  return <ChatItem avatar={{ avatar: <span className={styles.messageMetaAvatar}><OpenClaw.Color size={CHAT_SESSION_HEADER_ICON_SIZE} /></span>, backgroundColor: 'transparent', title: '极智' }} className={styles.chatItem} message="" placement="left" renderMessage={() => <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 22 }}><span style={{ height: 6, width: 6, borderRadius: '50%', backgroundColor: 'var(--ant-color-text-tertiary, #999)', opacity: 0.6 }} /><span style={{ height: 6, width: 6, borderRadius: '50%', backgroundColor: 'var(--ant-color-text-tertiary, #999)', opacity: 0.6 }} /><span style={{ height: 6, width: 6, borderRadius: '50%', backgroundColor: 'var(--ant-color-text-tertiary, #999)', opacity: 0.6 }} />{elapsed && <span className={styles.activityElapsed}>({elapsed})</span>}</div>} showAvatar={false} showTitle={false} variant="bubble" />;
}

function ActivityIndicator({ startedAt }: { phase: 'tool_processing'; startedAt?: number }) {
  const { styles } = useMessageStyles();
  const { t } = useTranslation('chat');
  const elapsed = useElapsedLabel(startedAt);
  return <ChatItem avatar={{ avatar: <span className={styles.messageMetaAvatar}><OpenClaw.Color size={CHAT_SESSION_HEADER_ICON_SIZE} /></span>, backgroundColor: 'transparent', title: '极智' }} className={styles.chatItem} message="" placement="left" renderMessage={() => <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--mimi-font-size-base)', color: 'var(--ant-color-text-secondary)' }}><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /><span>{t('status.processingTools', { defaultValue: 'Processing tool results...' })}</span>{elapsed && <span className={styles.activityElapsed}>({elapsed})</span>}</div>} showAvatar={false} showTitle={false} variant="bubble" />;
}

function InterruptedHint() {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  return <div className={styles.interruptedHint}><OctagonX style={{ width: 14, height: 14, flexShrink: 0 }} /><span><strong>{t('status.interrupted', { defaultValue: 'Interrupted' })}</strong>{' · '}{t('status.interruptedHint', { defaultValue: 'This run was aborted. Send a new message to continue.' })}</span></div>;
}
