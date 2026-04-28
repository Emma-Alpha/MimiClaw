import { Flexbox, Text } from '@lobehub/ui';
import { Tag } from 'antd';
import { createStyles, cssVar } from 'antd-style';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import PluginAvatar from '@/components/Plugins/PluginAvatar';
import { usePluginsStore } from '@/stores/plugins';
import { useSettingsStore } from '@/stores/settings';
import type { MarketplacePlugin, PluginSkillEntry } from '@/types/claude-plugin';

import SkillDetailModal from './SkillDetailModal';

// ─── styles ──────────────────────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,

  /* ── toolbar ── */
  toolbar: css`
    display: grid;
    width: 100%;
    min-width: 0;
    align-items: center;
    gap: 8px;
    grid-template-columns: 1fr auto;
    padding: 8px 24px;
    box-sizing: border-box;
    flex-shrink: 0;
  `,
  breadcrumb: css`
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    font-size: 13px;
  `,
  breadcrumbLink: css`
    color: ${cssVar.colorTextDescription};
    cursor: pointer;
    border: none;
    background: none;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 13px;
    transition: background-color 0.12s;

    &:hover {
      background: color-mix(in oklab, ${cssVar.colorText} 5%, transparent);
      color: ${cssVar.colorText};
    }
  `,
  breadcrumbCurrent: css`
    color: ${cssVar.colorText};
    padding: 4px 8px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  actionButton: css`
    padding: 6px 14px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.9;
    }
  `,
  addButton: css`
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
  `,
  addedButton: css`
    background: color-mix(in oklab, ${cssVar.colorText} 8%, transparent);
    color: ${cssVar.colorText};
  `,
  removeButton: css`
    background: transparent;
    color: ${token.colorError};
    border: 1px solid ${token.colorErrorBorder};

    &:hover {
      background: ${token.colorErrorBg};
    }
  `,

  /* ── content ── */
  contentScroll: css`
    flex: 1;
    overflow-y: auto;
    scrollbar-gutter: stable;
  `,
  content: css`
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 48px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  `,

  /* ── section 1: hero ── */
  logo: css`
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid ${token.colorBorderSecondary};
    background: transparent;
  `,
  pluginName: css`
    font-size: 22px;
    font-weight: 600;
    color: ${cssVar.colorText};
    word-break: break-word;
  `,
  shortDesc: css`
    font-size: 16px;
    color: ${cssVar.colorTextSecondary};
  `,
  heroBanner: css`
    position: relative;
    display: flex;
    justify-content: center;
    overflow: hidden;
    border-radius: 16px;
    padding: 48px 32px;
    box-shadow: inset 0 0 0 1px ${token.colorBorderSecondary};
  `,
  heroBg: css`
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      ${token.colorPrimaryBg} 0%,
      ${token.colorBgLayout} 50%,
      ${token.colorPrimaryBgHover} 100%
    );
  `,
  heroOverlay: css`
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, ${cssVar.colorBgLayout} 70%, transparent);
  `,
  heroPrompt: css`
    position: relative;
    z-index: 1;
    max-width: 77%;
    border-radius: 16px;
    background: color-mix(in srgb, ${cssVar.colorBgLayout} 75%, transparent);
    padding: 8px 16px;
    box-shadow: 0 0 0 1px ${token.colorBorderSecondary};
    font-size: 14px;
    color: ${cssVar.colorText};
    word-break: break-word;
  `,
  heroPromptBadge: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 6px;
    background: ${token.colorSuccessBg};
    color: ${token.colorSuccess};
    font-size: 12px;
    font-weight: 500;
    margin-inline-end: 6px;
  `,
  longDesc: css`
    max-width: 960px;
    font-size: 14px;
    color: ${cssVar.colorText};
    line-height: 1.7;
  `,

  /* ── section 2: includes ── */
  sectionTitle: css`
    font-size: 14px;
    font-weight: 500;
    color: ${cssVar.colorText};
  `,
  cardList: css`
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 10px;
    overflow: hidden;
    background: ${token.colorFillQuaternary};
  `,
  cardRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 56px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.12s;

    &:not(:last-child) {
      border-bottom: 0.5px solid ${token.colorBorderSecondary};
    }

    &:hover {
      background: color-mix(in oklab, ${cssVar.colorText} 3%, transparent);
    }
  `,
  skillIcon: css`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: ${token.colorFillSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  `,
  skillBadge: css`
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 999px;
    background: ${token.colorFillTertiary};
    color: ${cssVar.colorTextSecondary};
    flex-shrink: 0;
  `,

  /* ── section 3: information ── */
  infoRow: css`
    display: grid;
    align-items: center;
    min-height: 56px;
    gap: 4px;
    padding: 8px 16px;

    @media (min-width: 640px) {
      grid-template-columns: 160px minmax(0, 1fr);
      gap: 24px;
    }

    &:not(:last-child) {
      border-bottom: 0.5px solid ${token.colorBorderSecondary};
    }
  `,
  infoLabel: css`
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
    min-width: 0;
  `,
  infoValue: css`
    font-size: 13px;
    color: ${cssVar.colorText};
    min-width: 0;
  `,
  externalLink: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${token.colorPrimary};
    text-decoration: none;
    font-size: 13px;

    &:hover {
      text-decoration: underline;
    }
  `,
}));

// ─── component ───────────────────────────────────────────────────────────────

interface PluginDetailPageProps {
  plugin: MarketplacePlugin;
  onBack: () => void;
}

const PluginDetailPage = memo<PluginDetailPageProps>(({ plugin, onBack }) => {
  const { styles, cx } = useStyles();
  const { t } = useTranslation('plugins');
  const [selectedSkill, setSelectedSkill] = useState<PluginSkillEntry | null>(
    null,
  );

  const enabledPlugins = usePluginsStore((s) => s.enabledPlugins);
  const togglePlugin = usePluginsStore((s) => s.togglePlugin);
  const uninstallPlugin = usePluginsStore((s) => s.uninstallPlugin);
  const connectMcp = usePluginsStore((s) => s.connectMcp);
  const disconnectMcp = usePluginsStore((s) => s.disconnectMcp);
  const fetchMcpStatus = usePluginsStore((s) => s.fetchMcpStatus);
  const mcpStatuses = usePluginsStore((s) => s.mcpStatuses);

  const workspaces = useSettingsStore((s) => s.sidebarThreadWorkspaces);
  const workspaceRoot = useMemo(() => {
    const sorted = [...workspaces].sort(
      (a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0),
    );
    return sorted[0]?.rootPath ?? '';
  }, [workspaces]);

  const pluginKey = `${plugin.name}@${plugin.marketplace}`;
  const isAdded = pluginKey in enabledPlugins;
  const isMcpPlugin = Boolean(plugin.mcpServerName && plugin.mcpServerConfig);
  const mcpConnected = plugin.mcpServerName
    ? (mcpStatuses[plugin.mcpServerName] ?? false)
    : false;

  // Fetch MCP status on mount for MCP plugins
  useEffect(() => {
    if (plugin.mcpServerName && workspaceRoot) {
      void fetchMcpStatus([plugin.mcpServerName], workspaceRoot);
    }
  }, [plugin.mcpServerName, workspaceRoot, fetchMcpStatus]);

  const handleAdd = useCallback(async () => {
    // Allow reconnect for MCP plugins that are added but not connected
    if (isAdded && (!isMcpPlugin || mcpConnected)) return;
    try {
      if (isMcpPlugin && plugin.mcpServerName && plugin.mcpServerConfig) {
        if (!workspaceRoot) {
          toast.error(t('toast.noWorkspace', '请先打开一个项目目录'));
          return;
        }
        await connectMcp(plugin.mcpServerName, plugin.mcpServerConfig, workspaceRoot);
      }
      if (!isAdded) {
        await togglePlugin(pluginKey, true);
      }
      toast.success(t('toast.pluginEnabled', { key: plugin.name }));
    } catch (error) {
      toast.error(t('toast.connectedFailed', { error: String(error) }));
    }
  }, [isAdded, isMcpPlugin, mcpConnected, plugin, workspaceRoot, connectMcp, togglePlugin, pluginKey, t]);

  const handleRemove = useCallback(async () => {
    try {
      if (isMcpPlugin && plugin.mcpServerName && workspaceRoot) {
        await disconnectMcp(plugin.mcpServerName, workspaceRoot);
      }
      await uninstallPlugin(pluginKey);
      toast.success(t('toast.pluginRemoved', { key: plugin.name }));
    } catch (error) {
      toast.error(t('toast.mcpDisconnectFailed', { error: String(error) }));
    }
  }, [isMcpPlugin, plugin, workspaceRoot, disconnectMcp, uninstallPlugin, pluginKey, t]);

  // build information items
  const infoItems = useMemo(() => {
    const items: { label: string; value: string; href?: string; tag?: 'connected' | 'disconnected' }[] = [];
    if (isMcpPlugin) {
      items.push({
        label: t('publicMcp.status.mcpStatus'),
        value: mcpConnected
          ? t('publicMcp.status.connected')
          : t('publicMcp.status.disconnected'),
        tag: mcpConnected ? 'connected' : 'disconnected',
      });
    }
    const cats = plugin.categories?.join(', ');
    if (cats) items.push({ label: t('detail.category', '类别'), value: cats });
    const caps = plugin.capabilities?.join(', ');
    if (caps) items.push({ label: t('detail.capabilities', '功能'), value: caps });
    const dev = plugin.developerName || plugin.author;
    if (dev) items.push({ label: t('detail.developer', '开发者'), value: dev });
    if (plugin.homepage)
      items.push({ label: t('detail.website', '网站'), value: plugin.homepage, href: plugin.homepage });
    return items;
  }, [plugin, isMcpPlugin, mcpConnected, t]);

  const showLongDesc =
    plugin.longDescription &&
    plugin.longDescription !== plugin.description;

  return (
    <div className={styles.page}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.breadcrumb}>
          <button
            type="button"
            className={styles.breadcrumbLink}
            onClick={onBack}
          >
            插件
          </button>
          <ChevronRight size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
          <span className={styles.breadcrumbCurrent}>{plugin.name}</span>
        </div>
        <Flexbox horizontal gap={8}>
          {isAdded && (
            <button
              type="button"
              className={cx(styles.actionButton, styles.removeButton)}
              onClick={handleRemove}
            >
              {t('publicMcp.status.removePlugin')}
            </button>
          )}
          <button
            type="button"
            className={cx(
              styles.actionButton,
              isAdded && (!isMcpPlugin || mcpConnected) ? styles.addedButton : styles.addButton,
            )}
            disabled={(isAdded && (!isMcpPlugin || mcpConnected)) || (isMcpPlugin && !workspaceRoot)}
            onClick={handleAdd}
          >
            {isAdded
              ? (isMcpPlugin && !mcpConnected
                ? t('publicMcp.status.reconnect', '重新连接')
                : t('discover.enabled'))
              : t('detail.addToApp', '添加到 MimiClaw')}
          </button>
        </Flexbox>
      </div>

      {/* ── Scrollable content ── */}
      <div className={styles.contentScroll}>
      <div className={styles.content}>
        {/* ── SECTION 1: Hero ── */}
        <section>
          <Flexbox gap={20}>
            {/* Logo */}
            <div className={styles.logo}>
              <PluginAvatar
                avatar={plugin.icon || 'MCP_AVATAR'}
                size={40}
                style={{ borderRadius: 8 }}
              />
            </div>

            {/* Name + Description */}
            <Flexbox gap={4}>
              <span className={styles.pluginName}>{plugin.name}</span>
              <span className={styles.shortDesc}>{plugin.description}</span>
            </Flexbox>

            {/* Hero Banner */}
            {plugin.defaultPrompt && (
              <div className={styles.heroBanner}>
                <div className={styles.heroBg} />
                <div className={styles.heroOverlay} />
                <div className={styles.heroPrompt}>
                  <span className={styles.heroPromptBadge}>
                    🎮 {plugin.name}
                  </span>
                  {plugin.defaultPrompt}
                </div>
              </div>
            )}

            {/* Long description */}
            {showLongDesc && (
              <span className={styles.longDesc}>
                {plugin.longDescription}
              </span>
            )}

            {/* Workspace warning for MCP plugins */}
            {isMcpPlugin && !workspaceRoot && (
              <Tag color="warning">
                {t('publicMcp.status.workspaceMissing')}
              </Tag>
            )}
          </Flexbox>
        </section>

        {/* ── SECTION 2: Includes / 包含内容 ── */}
        {plugin.skills && plugin.skills.length > 0 && (
          <section>
            <Flexbox gap={12}>
              <span className={styles.sectionTitle}>包含内容</span>
              <div className={styles.cardList}>
                {plugin.skills.map((skill) => (
                  <div
                    key={skill.name}
                    className={styles.cardRow}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedSkill(skill)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedSkill(skill);
                      }
                    }}
                  >
                    <div className={styles.skillIcon}>🛠</div>
                    <Flexbox flex={1} gap={1} style={{ minWidth: 0 }}>
                      <Flexbox horizontal align="center" gap={6}>
                        <Text
                          weight={500}
                          style={{ fontSize: 13 }}
                          ellipsis
                        >
                          {skill.name}
                        </Text>
                        {skill.badge && (
                          <span className={styles.skillBadge}>
                            {skill.badge}
                          </span>
                        )}
                      </Flexbox>
                      <Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                        ellipsis
                      >
                        {skill.description}
                      </Text>
                    </Flexbox>
                  </div>
                ))}
              </div>
            </Flexbox>
          </section>
        )}

        {/* ── SECTION 3: Information / 信息 ── */}
        {infoItems.length > 0 && (
          <section>
            <Flexbox gap={12}>
              <span className={styles.sectionTitle}>信息</span>
              <div className={styles.cardList}>
                {infoItems.map((item) => (
                  <div key={item.label} className={styles.infoRow}>
                    <span className={styles.infoLabel}>{item.label}</span>
                    {item.href ? (
                      <a
                        className={styles.externalLink}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {(() => {
                          try {
                            return new URL(item.href).hostname;
                          } catch {
                            return item.value;
                          }
                        })()}
                        <ExternalLink size={12} />
                      </a>
                    ) : item.tag ? (
                      <Tag color={item.tag === 'connected' ? 'success' : 'default'}>
                        {item.value}
                      </Tag>
                    ) : (
                      <span className={styles.infoValue}>{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </Flexbox>
          </section>
        )}
      </div>
      </div>

      {/* Skill detail modal */}
      <SkillDetailModal
        open={!!selectedSkill}
        skill={selectedSkill}
        onClose={() => setSelectedSkill(null)}
      />
    </div>
  );
});

export default PluginDetailPage;
