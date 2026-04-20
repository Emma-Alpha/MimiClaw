/**
 * Chat Toolbar
 * Unified header style matching MiniChat embedded codex header.
 */
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { RefreshCw, Brain } from 'lucide-react';
import { ActionIcon } from '@lobehub/ui';
import { OpenClaw } from '@lobehub/icons';
import { createStyles } from 'antd-style';
import { SidebarToggleButton } from '@/components/layout/SidebarToggleButton';
import { useChatHeaderInsets } from '@/lib/titlebar-safe-area';
import { useChatStore } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import { useSettingsStore } from '@/stores/settings';
import {
  CHAT_SESSION_HEADER_ICON_SIZE,
  CHAT_SESSION_META_FONT_SIZE,
  CHAT_SESSION_TITLE_FONT_SIZE,
} from '@/styles/typography-tokens';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ token, css }) => ({
  toolbar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    height: 100%;
    min-width: 0;
    flex: 1;
    width: 100%;
    transition:
      padding-inline-end 0.28s ease,
      padding-inline-start 0.28s ease;
  `,
  left: css`
    display: flex;
    align-items: center;
    gap: 8px;
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
    gap: 2px;
    min-width: 0;
  `,
  sessionTitle: css`
    font-size: ${CHAT_SESSION_TITLE_FONT_SIZE}px;
    font-weight: 500;
    line-height: 1.2;
    color: ${token.colorText};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  agentName: css`
    font-size: ${CHAT_SESSION_META_FONT_SIZE}px;
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
    gap: 4px;
    flex-shrink: 0;
  `,
  thinkingActive: css`
    background: ${token.colorPrimaryBg} !important;
    color: ${token.colorPrimary} !important;
  `,
}));

export function ChatToolbar() {
  const { t } = useTranslation(['chat', 'common']);
  const { styles, cx } = useStyles();

  const refresh = useChatStore((s) => s.refresh);
  const loading = useChatStore((s) => s.loading);
  const showThinking = useChatStore((s) => s.showThinking);
  const toggleThinking = useChatStore((s) => s.toggleThinking);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessionLabels = useChatStore((s) => s.sessionLabels);
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const agents = useAgentsStore((s) => s.agents);
  const headerInsets = useChatHeaderInsets(sidebarCollapsed, {
    sidebarToggleLocation: sidebarCollapsed ? 'inline' : 'global',
  });

  const toolbarRegionStyle: CSSProperties & { WebkitAppRegion: 'drag' } = useMemo(
    () => ({
      WebkitAppRegion: 'drag',
      paddingInlineEnd: `${headerInsets.end}px`,
      paddingInlineStart: `${headerInsets.start}px`,
    }),
    [headerInsets.end, headerInsets.start],
  );

  const currentAgentName = useMemo(
    () => (agents ?? []).find((agent) => agent.id === currentAgentId)?.name ?? currentAgentId,
    [agents, currentAgentId],
  );

  const sidebarToggleAriaLabel = sidebarCollapsed
    ? t('sidebar.expandSidebar', { defaultValue: '展开侧边栏', ns: 'common' })
    : t('sidebar.collapseSidebar', { defaultValue: '收起侧边栏', ns: 'common' });
  const sessionTitle = currentSessionKey ? (sessionLabels[currentSessionKey] ?? '') : '';

  return (
    <div className={styles.toolbar} style={toolbarRegionStyle}>
      {/* Left: icon + title stack */}
      <div className={styles.left}>
        {sidebarCollapsed ? (
          <SidebarToggleButton
            ariaLabel={sidebarToggleAriaLabel}
            onToggle={() => setSidebarCollapsed(false)}
            sidebarCollapsed={sidebarCollapsed}
          />
        ) : null}
        <span className={styles.icon}>
          <OpenClaw.Color size={CHAT_SESSION_HEADER_ICON_SIZE} />
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
      <div className={styles.right} style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
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
