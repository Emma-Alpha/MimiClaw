/**
 * Chat Toolbar
 * Unified header style matching MiniChat embedded codex header.
 */
import { useMemo } from 'react';
import { RefreshCw, Brain } from 'lucide-react';
import { ActionIcon } from '@lobehub/ui';
import { OpenClaw } from '@lobehub/icons';
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
  left: css`
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  `,
  icon: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `,
  titleWrap: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  sessionTitle: css`
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
    color: ${token.colorText};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  agentName: css`
    font-size: 11px;
    font-weight: 400;
    line-height: 1.2;
    color: ${token.colorTextTertiary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  right: css`
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
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
      {/* Left: icon + title stack */}
      <div className={styles.left}>
        <span className={styles.icon}>
          <OpenClaw.Color size={14} />
        </span>
        <div className={styles.titleWrap}>
          {sessionTitle ? (
            <span className={styles.sessionTitle} title={sessionTitle}>
              {sessionTitle}
            </span>
          ) : (
            <span className={styles.sessionTitle}>
              {t('toolbar.currentAgent', { agent: currentAgentName }) || currentAgentName || '极智'}
            </span>
          )}
          {sessionTitle && currentAgentName && (
            <span className={styles.agentName} title={currentAgentName}>
              {currentAgentName}
            </span>
          )}
        </div>
      </div>

      {/* Right: action icons */}
      <div className={styles.right}>
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
    </div>
  );
}
