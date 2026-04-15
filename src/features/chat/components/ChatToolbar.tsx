/**
 * Chat Toolbar
 * Session selector, new session, refresh, and thinking toggle.
 * Rendered in the Header when on the Chat page.
 * Uses @lobehub/ui ActionIcon for icon buttons.
 */
import { useMemo } from 'react';
import { RefreshCw, Brain, Bot } from 'lucide-react';
import { ActionIcon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { useChatStore } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ token, css }) => ({
  toolbar: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  agentBadge: css`
    display: none;
    align-items: center;
    gap: 6px;
    border-radius: 9999px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 4px 12px;
    font-size: var(--mimi-font-size-sm);
    font-weight: var(--mimi-font-weight-medium);
    color: ${token.colorTextSecondary};

    @media (min-width: 640px) {
      display: flex;
    }
  `,
  agentIcon: css`
    color: ${token.colorPrimary};
    width: 14px;
    height: 14px;
  `,
  thinkingActive: css`
    background: ${token.colorPrimaryBg} !important;
    color: ${token.colorPrimary} !important;
  `,
}));

export function ChatToolbar() {
  const { t } = useTranslation('chat');
  const { styles, cx } = useStyles();

  const refresh = useChatStore((s) => s.refresh);
  const loading = useChatStore((s) => s.loading);
  const showThinking = useChatStore((s) => s.showThinking);
  const toggleThinking = useChatStore((s) => s.toggleThinking);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const agents = useAgentsStore((s) => s.agents);

  const currentAgentName = useMemo(
    () => (agents ?? []).find((agent) => agent.id === currentAgentId)?.name ?? currentAgentId,
    [agents, currentAgentId],
  );

  return (
    // biome-ignore lint/suspicious/noExplicitAny: WebkitAppRegion is not in CSSProperties
    <div className={styles.toolbar} style={{ WebkitAppRegion: 'no-drag' } as any}>
      <div className={styles.agentBadge}>
        <Bot className={styles.agentIcon} />
        <span>{t('toolbar.currentAgent', { agent: currentAgentName })}</span>
      </div>

      <ActionIcon
        icon={RefreshCw}
        title={t('toolbar.refresh')}
        loading={loading}
        onClick={() => refresh()}
        size="small"
      />

      <ActionIcon
        icon={Brain}
        title={showThinking ? t('toolbar.hideThinking') : t('toolbar.showThinking')}
        onClick={toggleThinking}
        size="small"
        className={cx(showThinking && styles.thinkingActive)}
        active={showThinking}
      />
    </div>
  );
}
