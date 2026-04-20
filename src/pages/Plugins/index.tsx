import { Tag } from '@lobehub/ui';
import {
  AlertCircle,
  ArrowLeft,
  Braces,
  Check,
  Copy,
  FolderOpen,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { SettingHeader } from '@/pages/Settings/components/SettingHeader';
import { useSkillsStyles } from '@/pages/Skills/styles';
import { useSettingsStore } from '@/stores/settings';
import type { PluginsSnapshot, PluginSummary, PublicMcpConnectionSnapshot } from '@/types/plugin';

import dingtalkIcon from '@/assets/channels/dingtalk.svg';
import feishuIcon from '@/assets/channels/feishu.svg';
import qqIcon from '@/assets/channels/qq.svg';
import wechatIcon from '@/assets/channels/wechat.svg';
import wecomIcon from '@/assets/channels/wecom.svg';
import type { PublicMcpId } from './publicMcp';
import {
  PUBLIC_MCP_OPTIONS,
  PUBLIC_MCP_SERVER_NAMES,
  resolvePublicMcpServer,
} from './publicMcp';
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
type PluginsTabKey = 'openclaw' | 'publicMcp';

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
  const sidebarActiveContext = useSettingsStore((state) => state.sidebarActiveContext);
  const sidebarThreadWorkspaces = useSettingsStore((state) => state.sidebarThreadWorkspaces);
  const [activeTab, setActiveTab] = useState<PluginsTabKey>('publicMcp');
  const [selectedPublicMcpId, setSelectedPublicMcpId] = useState<PublicMcpId | null>(null);
  const [plugins, setPlugins] = useState<PluginSummary[]>([]);
  const [mcpPlugins, setMcpPlugins] = useState<PluginSummary[]>([]);
  const [publicMcpConnection, setPublicMcpConnection] = useState<PublicMcpConnectionSnapshot | null>(null);
  const [checkingPublicMcp, setCheckingPublicMcp] = useState(false);
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

  const selectedPublicMcp = selectedPublicMcpId
    ? PUBLIC_MCP_OPTIONS.find((option) => option.id === selectedPublicMcpId) ?? null
    : null;
  const selectedWorkspaceRoot = useMemo(() => {
    if (sidebarActiveContext.kind === 'thread' && sidebarActiveContext.workspaceId) {
      const matched = sidebarThreadWorkspaces.find(
        (workspace) => workspace.id === sidebarActiveContext.workspaceId,
      );
      if (matched?.rootPath?.trim()) return matched.rootPath.trim();
    }
    const latestWorkspace = [...sidebarThreadWorkspaces]
      .sort((left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0))[0];
    return latestWorkspace?.rootPath?.trim() || '';
  }, [sidebarActiveContext, sidebarThreadWorkspaces]);

  const refreshPublicMcpConnection = useCallback(async () => {
    try {
      setCheckingPublicMcp(true);
      const snapshot = await hostApiFetch<PublicMcpConnectionSnapshot & { success?: boolean }>(
        '/api/plugins/public-mcp/status',
        {
          method: 'POST',
          body: JSON.stringify({
            serverNames: PUBLIC_MCP_SERVER_NAMES,
            workspaceRoot: selectedWorkspaceRoot,
          }),
        },
      );
      setPublicMcpConnection(snapshot);
    } catch {
      setPublicMcpConnection(null);
    } finally {
      setCheckingPublicMcp(false);
    }
  }, [selectedWorkspaceRoot]);

  useEffect(() => {
    void refreshPublicMcpConnection();
  }, [refreshPublicMcpConnection]);

  const handleCopyTemplate = useCallback(
    async (template: string) => {
      try {
        await navigator.clipboard.writeText(template);
        toast.success(t('toast.copiedTemplate'));
      } catch (copyError) {
        toast.error(t('toast.failedCopyTemplate', { error: String(copyError) }));
      }
    },
    [t],
  );

  const handleConnectPublicMcp = useCallback(
    async (option: (typeof PUBLIC_MCP_OPTIONS)[number]) => {
      try {
        const clipboardText = option.setupMode === 'clipboard'
          ? await navigator.clipboard.readText()
          : '';
        const parsedServer = resolvePublicMcpServer(option, clipboardText);

        if (!parsedServer) {
          await handleCopyTemplate(option.template);
          toast.error(t('toast.clipboardMcpInvalid'));
          return;
        }

        const result = await hostApiFetch<{
          existed: boolean;
          filePath: string;
          serverName: string;
          success: boolean;
          workspaceRoot: string;
        }>('/api/plugins/public-mcp/connect', {
          method: 'POST',
          body: JSON.stringify({
            workspaceRoot: selectedWorkspaceRoot,
            serverConfig: parsedServer.serverConfig,
            serverName: parsedServer.serverName,
          }),
        });

        await refreshPublicMcpConnection();
        toast.success(t('toast.connectedReady', { filePath: result.filePath, server: result.serverName }));
      } catch (copyError) {
        toast.error(t('toast.connectedFailed', { error: String(copyError) }));
      }
    },
    [handleCopyTemplate, refreshPublicMcpConnection, selectedWorkspaceRoot, t],
  );

  const getPublicMcpLinked = useCallback(
    (publicMcpId: PublicMcpId) => Boolean(publicMcpConnection?.statuses[publicMcpId]),
    [publicMcpConnection],
  );

  const selectedPublicMcpLinked = selectedPublicMcp ? getPublicMcpLinked(selectedPublicMcp.id) : false;

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
                  {activeTab === 'openclaw' ? (
                    <>
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
                    </>
                  ) : selectedPublicMcp ? (
                    <>
                      <button
                        type="button"
                        className={styles.headerButton}
                        disabled={checkingPublicMcp}
                        onClick={() => {
                          void refreshPublicMcpConnection();
                        }}
                      >
                        <RefreshCw style={{ width: 14, height: 14 }} />
                        {t('publicMcp.refreshStatus')}
                      </button>
                      <button
                        type="button"
                        className={cx(styles.headerButton, styles.headerButtonPrimary)}
                        onClick={() => {
                          void handleConnectPublicMcp(selectedPublicMcp);
                        }}
                      >
                        <Plus style={{ width: 14, height: 14 }} />
                        {t('publicMcp.connectNow')}
                      </button>
                      <button
                        type="button"
                        className={styles.headerButton}
                        onClick={() => {
                          void handleCopyTemplate(selectedPublicMcp.template);
                        }}
                      >
                        <Copy style={{ width: 14, height: 14 }} />
                        {t('publicMcp.copyTemplate')}
                      </button>
                    </>
                  ) : null}
                </div>
              }
            />
          </div>

          <div className={skillCx(skillStyles.skillsPageContentInner, styles.contentInnerInset)}>
            <div className={styles.tabsShell}>
              <button
                className={cx(styles.tabButton, activeTab === 'publicMcp' && styles.tabButtonActive)}
                onClick={() => {
                  setActiveTab('publicMcp');
                  setSelectedPublicMcpId(null);
                }}
                type="button"
              >
                <Sparkles size={15} />
                <span>{t('tabs.publicMcp')}</span>
              </button>
              <button
                className={cx(styles.tabButton, activeTab === 'openclaw' && styles.tabButtonActive)}
                onClick={() => {
                  setActiveTab('openclaw');
                }}
                type="button"
              >
                <Package size={15} />
                <span>{t('tabs.openclaw')}</span>
              </button>
            </div>

            {error ? (
              <div className={skillStyles.errorBanner}>
                <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            ) : null}

            {activeTab === 'publicMcp' ? (
              selectedPublicMcp ? (
                <section className={styles.pencilPanel}>
                  <div className={styles.mcpBackRow}>
                    <button
                      className={styles.backButton}
                      onClick={() => {
                        setSelectedPublicMcpId(null);
                      }}
                      type="button"
                    >
                      <ArrowLeft size={14} />
                      {t('publicMcp.back')}
                    </button>
                  </div>

                  <div className={styles.pencilIntro}>
                    <div className={styles.pencilIntroIcon}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className={styles.pencilTitleRow}>
                        <p className={styles.pencilTitle}>{t(`publicMcp.tools.${selectedPublicMcp.id}.detailTitle`)}</p>
                        <span
                          className={cx(
                            styles.connectionBadge,
                            selectedPublicMcpLinked
                              ? styles.connectionBadgeConnected
                              : styles.connectionBadgePending,
                          )}
                        >
                          {selectedPublicMcpLinked
                            ? t('publicMcp.status.connected')
                            : t('publicMcp.status.disconnected')}
                        </span>
                      </div>
                      <p className={styles.pencilDescription}>{t(`publicMcp.tools.${selectedPublicMcp.id}.detailDescription`)}</p>
                    </div>
                  </div>

                  <div
                    className={cx(
                      styles.connectionPanel,
                      selectedPublicMcpLinked
                        ? styles.connectionPanelConnected
                        : styles.connectionPanelPending,
                    )}
                  >
                    <div className={styles.connectionPanelHeader}>
                      <span className={styles.connectionPanelTitle}>
                        {checkingPublicMcp
                          ? t('publicMcp.status.checking')
                          : selectedPublicMcpLinked
                            ? t('publicMcp.status.detected', { server: selectedPublicMcp.id })
                            : publicMcpConnection?.workspaceResolved
                              ? t('publicMcp.status.notDetected', { server: selectedPublicMcp.id })
                              : t('publicMcp.status.workspaceMissing')}
                      </span>
                    </div>
                    {publicMcpConnection?.workspaceResolved ? (
                      <div className={styles.connectionMetaList}>
                        <div className={styles.connectionMetaItem}>
                          <span className={styles.connectionMetaLabel}>{t('publicMcp.status.workspaceLabel')}</span>
                          <span className={styles.pathText}>{publicMcpConnection.workspaceRoot}</span>
                        </div>
                        <div className={styles.connectionMetaItem}>
                          <span className={styles.connectionMetaLabel}>{t('publicMcp.status.fileLabel')}</span>
                          <span className={styles.pathText}>
                            {publicMcpConnection.filePath || t('publicMcp.status.fileMissing')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className={styles.connectionHint}>{t('publicMcp.status.workspaceHint')}</p>
                    )}
                    <p className={styles.connectionHint}>{t('publicMcp.status.verificationHint')}</p>
                  </div>

                  <div className={styles.noticeBanner}>
                    <AlertCircle className={styles.noticeIcon} style={{ width: 18, height: 18 }} />
                    <span>{t('publicMcp.hint')}</span>
                  </div>

                  <div className={styles.pencilSteps}>
                    <div className={styles.pencilStepItem}>
                      <span className={styles.pencilStepIndex}>1</span>
                      <span>{t(`publicMcp.tools.${selectedPublicMcp.id}.steps.open`)}</span>
                    </div>
                    <div className={styles.pencilStepItem}>
                      <span className={styles.pencilStepIndex}>2</span>
                      <span>{t(`publicMcp.tools.${selectedPublicMcp.id}.steps.copy`)}</span>
                    </div>
                    <div className={styles.pencilStepItem}>
                      <span className={styles.pencilStepIndex}>3</span>
                      <span>{t(`publicMcp.tools.${selectedPublicMcp.id}.steps.paste`)}</span>
                    </div>
                  </div>

                  <div className={styles.codeCard}>
                    <p className={styles.codeCardTitle}>{t('publicMcp.templateTitle')}</p>
                    <pre className={styles.templateCode}>
                      <code>{selectedPublicMcp.template}</code>
                    </pre>
                  </div>
                </section>
              ) : (
                <section className={styles.mcpCatalogPanel}>
                  <div className={styles.pencilIntro}>
                    <div className={styles.pencilIntroIcon}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className={styles.pencilTitle}>{t('publicMcp.title')}</p>
                      <p className={styles.pencilDescription}>{t('publicMcp.description')}</p>
                    </div>
                  </div>

                  <div className={styles.mcpCardGrid}>
                    {PUBLIC_MCP_OPTIONS.map((option) => {
                      const isLinked = getPublicMcpLinked(option.id);

                      return (
                        <button
                          className={styles.mcpCard}
                          key={option.id}
                          onClick={() => {
                            setSelectedPublicMcpId(option.id);
                          }}
                          type="button"
                        >
                          <div className={styles.mcpCardHeader}>
                            <div className={styles.mcpCardIconWrap}>
                              <Sparkles size={15} />
                            </div>
                            <span
                              className={cx(
                                styles.mcpCardBadge,
                                isLinked && styles.mcpCardBadgeConnected,
                              )}
                            >
                              {isLinked ? t('publicMcp.status.connected') : t(`publicMcp.tools.${option.id}.badge`)}
                            </span>
                          </div>
                          <p className={styles.mcpCardTitle}>{t(`publicMcp.tools.${option.id}.name`)}</p>
                          <p className={styles.mcpCardDescription}>{t(`publicMcp.tools.${option.id}.summary`)}</p>
                          <span
                            className={cx(
                              styles.mcpCardAction,
                              isLinked && styles.mcpCardActionConnected,
                            )}
                          >
                            {isLinked ? t('publicMcp.cardActionConnected') : t('publicMcp.cardAction')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )
            ) : (
              <>
                <div className={styles.noticeBanner}>
                  <AlertCircle className={styles.noticeIcon} style={{ width: 18, height: 18 }} />
                  <span>{t('notice')}</span>
                </div>

                {renderSection(plugins, 'catalog', Package)}
                {renderSection(mcpPlugins, 'mcp', Braces)}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Plugins.displayName = 'PluginsPage';

export default Plugins;
