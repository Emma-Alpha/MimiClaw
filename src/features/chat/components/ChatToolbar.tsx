/**
 * Chat Toolbar
 * Codex-style session title + agent badge + controls.
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
    min-width: 0;
    flex: 1;
  `,
  sessionTitle: css`
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  agentBadge: css`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 6px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillTertiary};
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
    flex-shrink: 0;
    white-space: nowrap;
  `,
  agentIcon: css`
    color: ${token.colorPrimary};
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  `,
  thinkingActive: css`
    background: ${token.colorPrimaryBg} !important;
    color: ${token.colorPrimary} !important;
  `,
  divider: css`
    width: 1px;
    height: 16px;
    background: ${token.colorBorderSecondary};
    flex-shrink: 0;
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
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessionLabels = useChatStore((s) => s.sessionLabels);
  const agents = useAgentsStore((s) => s.agents);

  const currentAgentName = useMemo(
    () => (agents ?? []).find((agent) => agent.id === currentAgentId)?.name ?? currentAgentId,
    [agents, currentAgentId],
  );

  const sessionTitle = currentSessionKey ? (sessionLabels[currentSessionKey] ?? '') : '';

  return (
    // biome-ignore lint/suspicious/noExplicitAny: WebkitAppRegion is not in CSSProperties
    <div className={styles.toolbar} style={{ WebkitAppRegion: 'no-drag' } as any}>
      {sessionTitle && (
        <span className={styles.sessionTitle} title={sessionTitle}>
          {sessionTitle}
        </span>
      )}

      <div className={styles.agentBadge}>
        <Bot className={styles.agentIcon} />
        <span>{currentAgentName || t('toolbar.currentAgent', { agent: currentAgentName })}</span>
      </div>

      <div className={styles.divider} />

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
