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

const IMAGE_ICON_RE = /^(https?:\/\/|data:image\/|blob:|file:\/\/|\/)/i;

const PLUGIN_ICONS = {
  dingtalk: {
    colors: ['#1677ff', '#13c2c2'],
    mask: dingtalkIcon,
  },
  wecom: {
    colors: ['#34c759', '#1677ff'],
    mask: wecomIcon,
  },
  'openclaw-lark': {
    colors: ['#00c2ff', '#3370ff'],
    mask: feishuIcon,
  },
  qqbot: {
    colors: ['#ff7875', '#1677ff'],
    mask: qqIcon,
  },
  'openclaw-weixin': {
    colors: ['#34c759', '#95de64'],
    mask: wechatIcon,
  },
} as const;

const PLUGIN_ICON_PALETTES = [
  ['#1677ff', '#13c2c2'],
  ['#7c3aed', '#2563eb'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#3b82f6'],
  ['#ec4899', '#8b5cf6'],
  ['#f97316', '#eab308'],
] as const;

type PluginStyleClasses = ReturnType<typeof usePluginsStyles>['styles'];

function getPluginMonogram(plugin: PluginSummary) {
  const label = `${plugin.name || ''} ${plugin.pluginId || ''}`.trim();
  const matched = Array.from(label).find((char) => /[A-Za-z0-9\u4e00-\u9fff]/.test(char));

  return matched?.toUpperCase() || 'P';
}

function getPluginPalette(plugin: PluginSummary) {
  const seed = `${plugin.key}:${plugin.pluginId}:${plugin.name}`;
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }

  return PLUGIN_ICON_PALETTES[hash % PLUGIN_ICON_PALETTES.length];
}

function renderGeneratedPluginIcon(plugin: PluginSummary, styles: PluginStyleClasses) {
  const [start, end] = getPluginPalette(plugin);

  return (
    <div
      className={styles.generatedIcon}
      style={{ background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` }}
    >
      {plugin.supportsMcp ? (
        <Braces size={16} style={{ strokeWidth: 2.4 }} />
      ) : (
        <span className={styles.generatedIconLabel}>{getPluginMonogram(plugin)}</span>
      )}
    </div>
  );
}

function renderPluginIcon(plugin: PluginSummary, styles: PluginStyleClasses) {
  if (plugin.icon && IMAGE_ICON_RE.test(plugin.icon)) {
    return (
      <img
        alt={plugin.name}
        className={styles.pluginImage}
        src={plugin.icon}
      />
    );
  }

  const knownIcon = PLUGIN_ICONS[plugin.key as keyof typeof PLUGIN_ICONS]
    || PLUGIN_ICONS[plugin.pluginId as keyof typeof PLUGIN_ICONS];

  if (knownIcon) {
    return (
      <span
        aria-hidden="true"
        className={styles.maskedBrandIcon}
        style={{
          background: `linear-gradient(135deg, ${knownIcon.colors[0]} 0%, ${knownIcon.colors[1]} 100%)`,
          maskImage: `url(${knownIcon.mask})`,
          WebkitMaskImage: `url(${knownIcon.mask})`,
        }}
      />
    );
  }

  return renderGeneratedPluginIcon(plugin, styles);
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
                  <div className={skillStyles.skillIcon}>{renderPluginIcon(plugin, styles)}</div>

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
    <div className={skillCx(skillStyles.skillsPageRoot, styles.pageRootInset)}>
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

          <div className={skillCx(skillStyles.skillsPageContentInner, styles.contentInnerInset)}>
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
