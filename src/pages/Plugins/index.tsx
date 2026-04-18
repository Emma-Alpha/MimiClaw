import { Tag } from '@lobehub/ui';
import { AlertCircle, Braces, Check, FolderOpen, Package, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { SettingHeader } from '@/pages/Settings/components/SettingHeader';
import { useSkillsStyles } from '@/pages/Skills/styles';
import type { PluginsSnapshot, PluginSummary } from '@/types/plugin';

import dingtalkIcon from '@/assets/channels/dingtalk.svg';
import feishuIcon from '@/assets/channels/feishu.svg';
import qqIcon from '@/assets/channels/qq.svg';
import wechatIcon from '@/assets/channels/wechat.svg';
import wecomIcon from '@/assets/channels/wecom.svg';
import { usePluginsStyles } from './styles';

const PLUGIN_ICONS: Record<string, string> = {
  dingtalk: dingtalkIcon,
  wecom: wecomIcon,
  'openclaw-lark': feishuIcon,
  qqbot: qqIcon,
  'openclaw-weixin': wechatIcon,
};

function renderPluginIcon(plugin: PluginSummary) {
  const icon = PLUGIN_ICONS[plugin.key] || PLUGIN_ICONS[plugin.pluginId];
  if (icon) {
    return (
      <img
        alt={plugin.name}
        src={icon}
        style={{ width: 24, height: 24, objectFit: 'contain' }}
      />
    );
  }

  if (plugin.supportsMcp) {
    return <Braces size={22} />;
  }

  return <Package size={22} />;
}

function getSourceColor(source: PluginSummary['source']) {
  switch (source) {
    case 'bundled':
      return 'processing';
    case 'path':
      return 'success';
    case 'npm':
      return 'warning';
    default:
      return 'default';
  }
}

export function Plugins() {
  const { t } = useTranslation('plugins');
  const { styles: skillStyles, cx: skillCx } = useSkillsStyles();
  const { styles, cx } = usePluginsStyles();
  const [plugins, setPlugins] = useState<PluginSummary[]>([]);
  const [mcpPlugins, setMcpPlugins] = useState<PluginSummary[]>([]);
  const [extensionsDir, setExtensionsDir] = useState('~/.openclaw/extensions');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [installingKey, setInstallingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySnapshot = useCallback((snapshot: PluginsSnapshot) => {
    setPlugins(snapshot.plugins || []);
    setMcpPlugins(snapshot.mcpPlugins || []);
    setExtensionsDir(snapshot.extensionsDir || '~/.openclaw/extensions');
  }, []);

  const fetchSnapshot = useCallback(
    async (initial = false) => {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const snapshot = await hostApiFetch<PluginsSnapshot & { error?: string; success?: boolean }>('/api/plugins');
        applySnapshot(snapshot);
      } catch (fetchError) {
        const message = String(fetchError);
        setError(message);
        if (!initial) {
          toast.error(t('toast.failedRefresh'));
        }
      } finally {
        if (initial) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [applySnapshot, t],
  );

  useEffect(() => {
    void fetchSnapshot(true);
  }, [fetchSnapshot]);

  const handleInstall = useCallback(
    async (plugin: PluginSummary) => {
      try {
        setInstallingKey(plugin.key);
        const snapshot = await hostApiFetch<PluginsSnapshot & { error?: string; success?: boolean }>(
          '/api/plugins/install',
          {
            method: 'POST',
            body: JSON.stringify({ key: plugin.key }),
          },
        );
        applySnapshot(snapshot);
        toast.success(t('toast.installed', { name: plugin.name }));
      } catch (installError) {
        toast.error(t('toast.installFailed', { name: plugin.name, error: String(installError) }));
      } finally {
        setInstallingKey(null);
      }
    },
    [applySnapshot, t],
  );

  const openPath = useCallback(
    async (targetPath: string) => {
      const result = await invokeIpc<string>('shell:openPath', targetPath);
      if (typeof result === 'string' && result.trim().length > 0) {
        throw new Error(result);
      }
    },
    [],
  );

  const handleOpenFolder = useCallback(
    async (plugin: PluginSummary) => {
      if (!plugin.installPath) return;

      try {
        await openPath(plugin.installPath);
      } catch (openError) {
        toast.error(t('toast.failedOpenFolder', { error: String(openError) }));
      }
    },
    [openPath, t],
  );

  const handleOpenExtensionsDir = useCallback(async () => {
    try {
      await openPath(extensionsDir);
    } catch (openError) {
      toast.error(t('toast.failedOpenFolder', { error: String(openError) }));
    }
  }, [extensionsDir, openPath, t]);

  if (loading) {
    return (
      <div className={skillStyles.loadingWrapper}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const renderSection = (
    items: PluginSummary[],
    sectionKey: 'catalog' | 'mcp',
    icon: typeof Package,
  ) => (
    <section className={styles.sectionBlock}>
      <div className={skillStyles.sectionHeader}>
        <div>
          <div className={skillStyles.sectionTitle}>
            {icon === Package ? <Package size={14} /> : <Braces size={14} />}
            <span>{t(`section.${sectionKey}.title`)}</span>
            <span className={skillStyles.sectionCount}>{items.length}</span>
          </div>
          <p className={styles.sectionDescription}>{t(`section.${sectionKey}.description`)}</p>
        </div>
      </div>

      <div className={skillStyles.lobeListContainer}>
        {items.length === 0 ? (
          <div className={skillStyles.emptyState} style={{ padding: '24px 0' }}>
            <p style={{ fontSize: 13, opacity: 0.55 }}>{t(`empty.${sectionKey}`)}</p>
          </div>
        ) : (
          <div className={skillStyles.skillList}>
            {items.map((plugin) => {
              const sourceLabel = t(`source.${plugin.source}`);
              const statusLabel = plugin.enabled
                ? t('status.enabled')
                : plugin.installed
                  ? t('status.installed')
                  : t('status.available');
              const isInstalling = installingKey === plugin.key;

              return (
                <div
                  key={`${sectionKey}-${plugin.key}`}
                  className={skillCx(skillStyles.skillRow, styles.pluginRow)}
                >
                  <div className={skillStyles.skillIcon}>{renderPluginIcon(plugin)}</div>

                  <div className={skillStyles.skillMeta}>
                    <div className={skillStyles.skillNameRow}>
                      <span className={skillStyles.skillName}>{plugin.name}</span>
                      <Tag color={getSourceColor(plugin.source)}>{sourceLabel}</Tag>
                      {plugin.supportsMcp && <Tag color="geekblue">{t('badge.mcp')}</Tag>}
                      {plugin.version ? <span className={skillStyles.skillVersion}>v{plugin.version}</span> : null}
                    </div>

                    <p className={skillStyles.skillDescription}>
                      {plugin.description || t('descriptionFallback')}
                    </p>

                    {plugin.installPath ? (
                      <div className={styles.metaFooter}>
                        <span className={styles.pathText}>{plugin.installPath}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className={skillStyles.skillControls}>
                    <div className={styles.actionRow}>
                      <span
                        className={skillCx(
                          skillStyles.skillStateText,
                          plugin.installed ? skillStyles.skillStateInstalled : skillStyles.skillStateDisabled,
                        )}
                      >
                        {plugin.installed ? <Check style={{ width: 13, height: 13, strokeWidth: 2.5 }} /> : null}
                        {statusLabel}
                      </span>

                      {plugin.installed && plugin.installPath ? (
                        <button
                          type="button"
                          className={styles.rowActionButton}
                          onClick={() => {
                            void handleOpenFolder(plugin);
                          }}
                        >
                          <FolderOpen style={{ width: 14, height: 14 }} />
                          {t('actions.openFolder')}
                        </button>
                      ) : plugin.installable ? (
                        <button
                          type="button"
                          disabled={isInstalling}
                          className={cx(styles.rowActionButton, styles.rowActionPrimary)}
                          onClick={() => {
                            void handleInstall(plugin);
                          }}
                        >
                          <Package style={{ width: 14, height: 14 }} />
                          {isInstalling ? t('actions.installing') : t('actions.install')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className={skillStyles.skillsPageRoot}>
      <div className={skillStyles.skillsPageInner}>
        <div className={skillStyles.skillsPageContent}>
          <div className={skillStyles.skillsPageHeader}>
            <SettingHeader
              title={t('title')}
              extra={
                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.headerButton}
                    disabled={refreshing}
                    onClick={() => {
                      void fetchSnapshot(false);
                    }}
                  >
                    <RefreshCw style={{ width: 14, height: 14 }} />
                    {t('actions.refresh')}
                  </button>
                  <button
                    type="button"
                    className={styles.headerButton}
                    onClick={() => {
                      void handleOpenExtensionsDir();
                    }}
                  >
                    <FolderOpen style={{ width: 14, height: 14 }} />
                    {t('actions.openExtensionsFolder')}
                  </button>
                </div>
              }
            />
          </div>

          <div className={skillStyles.skillsPageContentInner}>
            <div className={styles.noticeBanner}>
              <AlertCircle className={styles.noticeIcon} style={{ width: 18, height: 18 }} />
              <span>{t('notice')}</span>
            </div>

            {error ? (
              <div className={skillStyles.errorBanner}>
                <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            ) : null}

            {renderSection(plugins, 'catalog', Package)}
            {renderSection(mcpPlugins, 'mcp', Braces)}
          </div>
        </div>
      </div>
    </div>
  );
}

Plugins.displayName = 'PluginsPage';

export default Plugins;
