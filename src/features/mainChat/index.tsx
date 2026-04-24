/**
 * Chat Page
 * Native React implementation communicating with OpenClaw Gateway
 * via gateway:rpc IPC. Session selector, thinking toggle, and refresh
 * are in the toolbar; messages render with markdown + streaming.
 */
import { useEffect } from 'react';
import { createStyles } from 'antd-style';
import { useLocation } from 'react-router-dom';
import { useChatStore } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import { CHAT_HEADER_HEIGHT } from '@/lib/titlebar-safe-area';
import { ChatToolbar } from './components/ChatToolbar';
import { ConversationView } from './Conversation';
import { MainChatInput } from './MainChatInput';

const useStyles = createStyles(({ token, css }) => ({
  chatPage: css`
    --chat-window-side-gap: 16px;
    --chat-window-content-width: min(800px, calc(100% - (var(--chat-window-side-gap) * 2)));
    --chat-dock-inline-padding: 12px;
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: transparent;
  `,
  toolbar: css`
    --main-chat-header-bg: color-mix(
      in srgb,
      ${token.colorBgContainer} 86%,
      transparent
    );
    --main-chat-header-title-color: color-mix(
      in srgb,
      ${token.colorText} 78%,
      ${token.colorTextSecondary}
    );
    height: ${CHAT_HEADER_HEIGHT}px;
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
    background: var(--main-chat-header-bg);
    backdrop-filter: saturate(160%) blur(18px);
    -webkit-backdrop-filter: saturate(160%) blur(18px);
    position: relative;
    overflow: visible;
    z-index: 10;

    &::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      height: 32px;
      background: linear-gradient(
        to bottom,
        var(--main-chat-header-bg) 0%,
        transparent 100%
      );
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
      pointer-events: none;
      z-index: 10;
    }
  `,
}));

export function Chat() {
  const { styles } = useStyles();
  const location = useLocation();

  const messages = useChatStore((s) => s.messages);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const loading = useChatStore((s) => s.loading);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const showThinking = useChatStore((s) => s.showThinking);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const pendingFinal = useChatStore((s) => s.pendingFinal);
  const clearError = useChatStore((s) => s.clearError);
  const switchSession = useChatStore((s) => s.switchSession);
  const lastRunWasAborted = useChatStore((s) => s.lastRunWasAborted);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const cleanupEmptySession = useChatStore((s) => s.cleanupEmptySession);

  useEffect(() => {
    return () => {
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

  return (
    <div className={styles.chatPage}>
      <div className={styles.toolbar}>
        <ChatToolbar />
      </div>

      <ConversationView
        messages={messages}
        currentSessionKey={currentSessionKey}
        loading={loading}
        sending={sending}
        error={error}
        showThinking={showThinking}
        streamingMessage={streamingMessage}
        streamingTools={streamingTools}
        pendingFinal={pendingFinal}
        lastRunWasAborted={lastRunWasAborted}
        clearError={clearError}
      />

      <MainChatInput />
    </div>
  );
}

export default Chat;

export { CodeChat } from './codeAssistant';
