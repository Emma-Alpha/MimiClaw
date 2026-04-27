import { Tag } from '@lobehub/ui';
import { Button } from 'antd';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { hostApiFetch } from '@/lib/host-api';
import { SettingHeader } from '@/pages/Settings/components/SettingHeader';
import { useSkillsStyles } from '@/pages/Skills/styles';
import { useSettingsStore } from '@/stores/settings';
import type { InstalledPlugin, MarketplacePlugin } from '@/types/claude-plugin';
import type { PublicMcpConnectionSnapshot } from '@/types/plugin';

import type { PublicMcpId } from './publicMcp';
import {
  PUBLIC_MCP_OPTIONS,
  PUBLIC_MCP_SERVER_NAMES,
  resolvePublicMcpServer,
} from './publicMcp';
import { usePluginsStyles } from './styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PluginsTabKey = 'discover' | 'installed' | 'marketplaces';

type MarketplaceEntry = {
  source: { source: string; repo?: string; url?: string; path?: string };
  catalogUrl?: string;
};

type CatalogState = {
  loading: boolean;
  error: string | null;
  plugins: MarketplacePlugin[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseInstalledPlugin(key: string, enabled: boolean): InstalledPlugin {
  const atIndex = key.indexOf('@');
  if (atIndex > 0) {
    return {
      key,
      pluginName: key.slice(0, atIndex),
      marketplaceName: key.slice(atIndex + 1),
      enabled,
    };
  }
  return { key, pluginName: key, marketplaceName: '', enabled };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Plugins() {
  const { t } = useTranslation('plugins');
  const { styles: skillStyles, cx: skillCx } = useSkillsStyles();
  const { styles, cx } = usePluginsStyles();
  const sidebarActiveContext = useSettingsStore((state) => state.sidebarActiveContext);
  const sidebarThreadWorkspaces = useSettingsStore((state) => state.sidebarThreadWorkspaces);

  // Tab
  const [activeTab, setActiveTab] = useState<PluginsTabKey>('discover');

  // Public MCP state
  const [selectedPublicMcpId, setSelectedPublicMcpId] = useState<PublicMcpId | null>(null);
  const [publicMcpConnection, setPublicMcpConnection] = useState<PublicMcpConnectionSnapshot | null>(null);
  const [checkingPublicMcp, setCheckingPublicMcp] = useState(false);

  // Installed plugins state
  const [installedPlugins, setInstalledPlugins] = useState<Record<string, boolean>>({});
  const [installedLoading, setInstalledLoading] = useState(true);

  // Marketplace sources state
  const [marketplaces, setMarketplaces] = useState<Record<string, MarketplaceEntry>>({});
  const [marketplacesLoading, setMarketplacesLoading] = useState(true);

  // Catalog state (per-marketplace)
  const [catalogs, setCatalogs] = useState<Record<string, CatalogState>>({});

  // Discover search / filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Add marketplace dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    sourceType: 'url' as 'github' | 'git' | 'url' | 'local',
    url: '',
    repo: '',
    catalogUrl: '',
  });

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

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

  const selectedPublicMcp = selectedPublicMcpId
    ? PUBLIC_MCP_OPTIONS.find((option) => option.id === selectedPublicMcpId) ?? null
    : null;

  const selectedPublicMcpLinked = selectedPublicMcp
    ? Boolean(publicMcpConnection?.statuses[selectedPublicMcp.serverName])
    : false;

  const allMarketplacePlugins = useMemo(() => {
    const result: MarketplacePlugin[] = [];
    for (const catalog of Object.values(catalogs)) {
      if (catalog.plugins.length > 0) {
        result.push(...catalog.plugins);
      }
    }
    return result;
  }, [catalogs]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const plugin of allMarketplacePlugins) {
      plugin.categories?.forEach((cat) => set.add(cat));
    }
    return Array.from(set).sort();
  }, [allMarketplacePlugins]);

  const filteredMarketplacePlugins = useMemo(() => {
    let result = allMarketplacePlugins;
    if (selectedCategory) {
      result = result.filter((p) => p.categories?.includes(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allMarketplacePlugins, selectedCategory, searchQuery]);

  const installedList = useMemo(
    () =>
      Object.entries(installedPlugins).map(([key, enabled]) =>
        parseInstalledPlugin(key, enabled),
      ),
    [installedPlugins],
  );

  // ---------------------------------------------------------------------------
  // Fetch installed plugins
  // ---------------------------------------------------------------------------

  const fetchInstalled = useCallback(async () => {
    try {
      const data = await hostApiFetch<{ enabledPlugins: Record<string, boolean> }>(
        '/api/plugins/claude/installed',
      );
      setInstalledPlugins(data.enabledPlugins || {});
    } catch {
      // silent
    } finally {
      setInstalledLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch marketplace sources
  // ---------------------------------------------------------------------------

  const fetchMarketplaces = useCallback(async () => {
    try {
      const data = await hostApiFetch<{ marketplaces: Record<string, MarketplaceEntry> }>(
        '/api/plugins/claude/marketplaces',
      );
      setMarketplaces(data.marketplaces || {});
    } catch {
      // silent
    } finally {
      setMarketplacesLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch catalog for a marketplace
  // ---------------------------------------------------------------------------

  const fetchCatalog = useCallback(async (name: string, catalogUrl: string) => {
    setCatalogs((prev) => ({
      ...prev,
      [name]: { loading: true, error: null, plugins: prev[name]?.plugins || [] },
    }));
    try {
      const data = await hostApiFetch<{
        catalog: { name?: string; plugins?: Array<Omit<MarketplacePlugin, 'marketplace'>> };
      }>('/api/plugins/claude/catalog', {
        method: 'POST',
        body: JSON.stringify({ catalogUrl }),
      });
      const plugins: MarketplacePlugin[] = (data.catalog.plugins || []).map((p) => ({
        ...p,
        marketplace: name,
      }));
      setCatalogs((prev) => ({ ...prev, [name]: { loading: false, error: null, plugins } }));
    } catch (err) {
      setCatalogs((prev) => ({
        ...prev,
        [name]: { loading: false, error: String(err), plugins: [] },
      }));
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Initial loads
  // ---------------------------------------------------------------------------

  useEffect(() => {
    void fetchInstalled();
    void fetchMarketplaces();
  }, [fetchInstalled, fetchMarketplaces]);

  // Fetch catalogs when marketplaces change
  useEffect(() => {
    for (const [name, entry] of Object.entries(marketplaces)) {
      const url = entry.catalogUrl || entry.source.url || '';
      if (url && !catalogs[name]) {
        void fetchCatalog(name, url);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketplaces]);

  // ---------------------------------------------------------------------------
  // Public MCP connection check
  // ---------------------------------------------------------------------------

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

  const getPublicMcpLinked = useCallback(
    (publicMcpId: PublicMcpId) => {
      const option = PUBLIC_MCP_OPTIONS.find((item) => item.id === publicMcpId);
      if (!option) return false;
      return Boolean(publicMcpConnection?.statuses[option.serverName]);
    },
    [publicMcpConnection],
  );

  // ---------------------------------------------------------------------------
  // Public MCP actions
  // ---------------------------------------------------------------------------

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
        toast.success(
          t('toast.connectedReady', {
            filePath: result.filePath,
            server: t(`publicMcp.tools.${option.id}.name`),
          }),
        );
      } catch (copyError) {
        toast.error(t('toast.connectedFailed', { error: String(copyError) }));
      }
    },
    [handleCopyTemplate, refreshPublicMcpConnection, selectedWorkspaceRoot, t],
  );

  // ---------------------------------------------------------------------------
  // Plugin toggle / uninstall
  // ---------------------------------------------------------------------------

  const handleTogglePlugin = useCallback(
    async (key: string, enabled: boolean) => {
      try {
        const data = await hostApiFetch<{ enabledPlugins: Record<string, boolean> }>(
          '/api/plugins/claude/toggle',
          { method: 'PUT', body: JSON.stringify({ key, enabled }) },
        );
        setInstalledPlugins(data.enabledPlugins || {});
        toast.success(
          enabled ? t('toast.pluginEnabled', { key }) : t('toast.pluginDisabled', { key }),
        );
      } catch (err) {
        toast.error(t('toast.toggleFailed', { error: String(err) }));
      }
    },
    [t],
  );

  const handleUninstallPlugin = useCallback(
    async (key: string) => {
      try {
        const data = await hostApiFetch<{ enabledPlugins: Record<string, boolean> }>(
          '/api/plugins/claude/uninstall',
          { method: 'DELETE', body: JSON.stringify({ key }) },
        );
        setInstalledPlugins(data.enabledPlugins || {});
        toast.success(t('toast.pluginRemoved', { key }));
      } catch (err) {
        toast.error(t('toast.removeFailed', { error: String(err) }));
      }
    },
    [t],
  );

  const handleEnableFromDiscover = useCallback(
    async (plugin: MarketplacePlugin) => {
      const key = `${plugin.id}@${plugin.marketplace}`;
      await handleTogglePlugin(key, true);
    },
    [handleTogglePlugin],
  );

  // ---------------------------------------------------------------------------
  // Marketplace source management
  // ---------------------------------------------------------------------------

  const handleAddMarketplace = useCallback(async () => {
    const name = addForm.name.trim();
    if (!name) return;

    const source: MarketplaceEntry['source'] = { source: addForm.sourceType };
    if (addForm.sourceType === 'github') {
      source.repo = addForm.repo.trim();
    } else {
      source.url = addForm.url.trim();
    }

    try {
      const data = await hostApiFetch<{ marketplaces: Record<string, MarketplaceEntry> }>(
        '/api/plugins/claude/marketplaces',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            source,
            catalogUrl: addForm.catalogUrl.trim() || undefined,
          }),
        },
      );
      setMarketplaces(data.marketplaces || {});
      toast.success(t('toast.marketplaceAdded', { name }));
      setShowAddDialog(false);
      setAddForm({ name: '', sourceType: 'url', url: '', repo: '', catalogUrl: '' });

      // Auto-fetch catalog
      const entry = data.marketplaces?.[name];
      const catalogUrl = entry?.catalogUrl || entry?.source?.url || '';
      if (catalogUrl) {
        void fetchCatalog(name, catalogUrl);
      }
    } catch (err) {
      toast.error(t('toast.marketplaceAddFailed', { error: String(err) }));
    }
  }, [addForm, fetchCatalog, t]);

  const handleRemoveMarketplace = useCallback(
    async (name: string) => {
      try {
        const data = await hostApiFetch<{ marketplaces: Record<string, MarketplaceEntry> }>(
          '/api/plugins/claude/marketplaces',
          { method: 'DELETE', body: JSON.stringify({ name }) },
        );
        setMarketplaces(data.marketplaces || {});
        setCatalogs((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
        toast.success(t('toast.marketplaceRemoved', { name }));
      } catch (err) {
        toast.error(t('toast.marketplaceRemoveFailed', { error: String(err) }));
      }
    },
    [t],
  );

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (installedLoading && marketplacesLoading) {
    return (
      <div className={skillStyles.loadingWrapper}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Discover Tab — Public MCP Detail
  // ---------------------------------------------------------------------------

  const renderMcpDetail = () => {
    if (!selectedPublicMcp) return null;
    return (
      <section className={styles.pencilPanel}>
        <div className={styles.mcpBackRow}>
          <button
            className={styles.backButton}
            onClick={() => setSelectedPublicMcpId(null)}
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
                  selectedPublicMcpLinked ? styles.connectionBadgeConnected : styles.connectionBadgePending,
                )}
              >
                {selectedPublicMcpLinked ? t('publicMcp.status.connected') : t('publicMcp.status.disconnected')}
              </span>
            </div>
            <p className={styles.pencilDescription}>{t(`publicMcp.tools.${selectedPublicMcp.id}.detailDescription`)}</p>
          </div>
        </div>

        <div
          className={cx(
            styles.connectionPanel,
            selectedPublicMcpLinked ? styles.connectionPanelConnected : styles.connectionPanelPending,
          )}
        >
          <div className={styles.connectionPanelHeader}>
            <span className={styles.connectionPanelTitle}>
              {checkingPublicMcp
                ? t('publicMcp.status.checking')
                : selectedPublicMcpLinked
                  ? t('publicMcp.status.detected', { server: selectedPublicMcp.serverName })
                  : publicMcpConnection?.workspaceResolved
                    ? t('publicMcp.status.notDetected', { server: selectedPublicMcp.serverName })
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
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Discover Tab
  // ---------------------------------------------------------------------------

  const renderDiscoverTab = () => {
    if (selectedPublicMcp) return renderMcpDetail();

    const hasMarketplaceSources = Object.keys(marketplaces).length > 0;
    const catalogsLoading = Object.values(catalogs).some((c) => c.loading);

    return (
      <>
        {/* Recommended MCP Section */}
        <section className={styles.mcpCatalogPanel}>
          <div className={styles.pencilIntro}>
            <div className={styles.pencilIntroIcon}>
              <Sparkles size={16} />
            </div>
            <div>
              <p className={styles.pencilTitle}>{t('discover.recommendedMcp')}</p>
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
                  onClick={() => setSelectedPublicMcpId(option.id)}
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

        {/* Marketplace Plugins Section */}
        <section className={styles.sectionBlock} style={{ marginTop: 28 }}>
          <div className={styles.sectionTitle}>
            <Store size={14} />
            <span>{t('discover.marketplacePlugins')}</span>
          </div>
          <p className={styles.sectionDescription}>{t('discover.marketplacePluginsDescription')}</p>

          {!hasMarketplaceSources ? (
            <div className={styles.emptyState}>{t('discover.noMarketplaces')}</div>
          ) : catalogsLoading ? (
            <div className={styles.emptyState}>{t('discover.fetchingCatalog')}</div>
          ) : allMarketplacePlugins.length === 0 ? (
            <div className={styles.emptyState}>{t('discover.noPlugins')}</div>
          ) : (
            <>
              {/* Search + category filter */}
              <div className={styles.searchBar} style={{ marginTop: 14 }}>
                <input
                  className={styles.searchInput}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('discover.searchPlaceholder')}
                  type="text"
                  value={searchQuery}
                />
                <button
                  className={cx(
                    styles.categoryChip,
                    !selectedCategory && styles.categoryChipActive,
                  )}
                  onClick={() => setSelectedCategory(null)}
                  type="button"
                >
                  {t('discover.allCategories')}
                </button>
                {allCategories.map((cat) => (
                  <button
                    className={cx(
                      styles.categoryChip,
                      selectedCategory === cat && styles.categoryChipActive,
                    )}
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    type="button"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Plugin card grid */}
              <div className={styles.mcpCardGrid}>
                {filteredMarketplacePlugins.map((plugin) => {
                  const pluginKey = `${plugin.id}@${plugin.marketplace}`;
                  const isEnabled = installedPlugins[pluginKey] === true;

                  return (
                    <div className={styles.pluginCard} key={pluginKey}>
                      <div className={styles.pluginCardHeader}>
                        <span className={styles.pluginCardName}>{plugin.name}</span>
                        {plugin.version && (
                          <Tag color="default">v{plugin.version}</Tag>
                        )}
                      </div>
                      {plugin.author && (
                        <span className={styles.pluginCardAuthor}>{plugin.author}</span>
                      )}
                      <p className={styles.pluginCardDescription}>
                        {plugin.description}
                      </p>
                      <div className={styles.pluginCardFooter}>
                        <div className={styles.pluginCardTags}>
                          {plugin.components?.map((comp) => (
                            <span className={styles.componentTag} key={comp}>
                              {t(`badge.${comp}`, { defaultValue: comp })}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {plugin.homepage && (
                            <a
                              href={plugin.homepage}
                              rel="noopener noreferrer"
                              style={{ color: 'inherit', display: 'inline-flex' }}
                              target="_blank"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          {isEnabled ? (
                            <span className={styles.enabledBadge}>
                              <Check size={12} style={{ marginRight: 2 }} />
                              {t('discover.enabled')}
                            </span>
                          ) : (
                            <Button
                              size="small"
                              type="primary"
                              style={{ borderRadius: 999 }}
                              onClick={() => { void handleEnableFromDiscover(plugin); }}
                            >
                              {t('discover.enable')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Installed Tab
  // ---------------------------------------------------------------------------

  const renderInstalledTab = () => (
    <section>
      <div className={styles.sectionTitle}>
        <Check size={14} />
        <span>{t('installed.title')}</span>
      </div>
      <p className={styles.sectionDescription}>{t('installed.description')}</p>

      {installedList.length === 0 ? (
        <div className={styles.emptyState}>{t('installed.empty')}</div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {installedList.map((plugin) => (
            <div className={styles.listRow} key={plugin.key}>
              <div className={styles.listRowMeta}>
                <div className={styles.listRowName}>{plugin.pluginName}</div>
                {plugin.marketplaceName && (
                  <div className={styles.listRowSub}>@{plugin.marketplaceName}</div>
                )}
              </div>
              <span className={plugin.enabled ? styles.enabledBadge : styles.disabledBadge}>
                {plugin.enabled ? t('installed.enable') : t('installed.disable')}
              </span>
              <div className={styles.listRowActions}>
                <button
                  className={styles.rowActionButton}
                  onClick={() => { void handleTogglePlugin(plugin.key, !plugin.enabled); }}
                  type="button"
                >
                  {plugin.enabled ? t('installed.disable') : t('installed.enable')}
                </button>
                <button
                  className={cx(styles.rowActionButton, styles.rowActionDanger)}
                  onClick={() => { void handleUninstallPlugin(plugin.key); }}
                  type="button"
                >
                  <Trash2 size={13} />
                  {t('installed.uninstall')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  // ---------------------------------------------------------------------------
  // Render: Marketplaces Tab
  // ---------------------------------------------------------------------------

  const renderMarketplacesTab = () => (
    <section>
      <div className={styles.sectionTitle}>
        <Store size={14} />
        <span>{t('marketplaces.title')}</span>
      </div>
      <p className={styles.sectionDescription}>{t('marketplaces.description')}</p>

      {Object.keys(marketplaces).length === 0 ? (
        <div className={styles.emptyState}>{t('marketplaces.empty')}</div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {Object.entries(marketplaces).map(([name, entry]) => (
            <div className={styles.listRow} key={name}>
              <div className={styles.listRowMeta}>
                <div className={styles.listRowName}>{name}</div>
                <div className={styles.listRowSub}>
                  {entry.source.source === 'github'
                    ? `github:${entry.source.repo || ''}`
                    : entry.catalogUrl || entry.source.url || entry.source.path || ''}
                </div>
              </div>
              <Tag color="processing">{entry.source.source}</Tag>
              <div className={styles.listRowActions}>
                <button
                  className={styles.rowActionButton}
                  onClick={() => {
                    const url = entry.catalogUrl || entry.source.url || '';
                    if (url) void fetchCatalog(name, url);
                  }}
                  type="button"
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  className={cx(styles.rowActionButton, styles.rowActionDanger)}
                  onClick={() => { void handleRemoveMarketplace(name); }}
                  type="button"
                >
                  <Trash2 size={13} />
                  {t('marketplaces.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Button
          type="primary"
          icon={<Plus size={14} />}
          style={{ height: 38 }}
          onClick={() => setShowAddDialog(true)}
        >
          {t('marketplaces.addSource')}
        </Button>
      </div>
    </section>
  );

  // ---------------------------------------------------------------------------
  // Render: Add Marketplace Dialog
  // ---------------------------------------------------------------------------

  const renderAddDialog = () => {
    if (!showAddDialog) return null;
    return (
      <div className={styles.dialogOverlay} onClick={() => setShowAddDialog(false)}>
        <div className={styles.dialogBox} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className={styles.dialogTitle}>{t('marketplaces.addDialog.title')}</p>
            <button
              className={styles.rowActionButton}
              onClick={() => setShowAddDialog(false)}
              style={{ border: 'none', padding: 4, height: 'auto' }}
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.dialogField}>
            <label className={styles.dialogLabel}>{t('marketplaces.addDialog.nameLabel')}</label>
            <input
              className={styles.dialogInput}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('marketplaces.addDialog.namePlaceholder')}
              type="text"
              value={addForm.name}
            />
          </div>

          <div className={styles.dialogField}>
            <label className={styles.dialogLabel}>{t('marketplaces.addDialog.sourceTypeLabel')}</label>
            <select
              className={styles.dialogSelect}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  sourceType: e.target.value as 'github' | 'git' | 'url' | 'local',
                }))
              }
              value={addForm.sourceType}
            >
              <option value="url">URL</option>
              <option value="github">GitHub</option>
              <option value="git">Git</option>
              <option value="local">Local</option>
            </select>
          </div>

          {addForm.sourceType === 'github' ? (
            <div className={styles.dialogField}>
              <label className={styles.dialogLabel}>{t('marketplaces.addDialog.repoLabel')}</label>
              <input
                className={styles.dialogInput}
                onChange={(e) => setAddForm((f) => ({ ...f, repo: e.target.value }))}
                placeholder={t('marketplaces.addDialog.repoPlaceholder')}
                type="text"
                value={addForm.repo}
              />
            </div>
          ) : (
            <div className={styles.dialogField}>
              <label className={styles.dialogLabel}>{t('marketplaces.addDialog.urlLabel')}</label>
              <input
                className={styles.dialogInput}
                onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))}
                placeholder={t('marketplaces.addDialog.urlPlaceholder')}
                type="text"
                value={addForm.url}
              />
            </div>
          )}

          <div className={styles.dialogField}>
            <label className={styles.dialogLabel}>{t('marketplaces.addDialog.catalogUrlLabel')}</label>
            <input
              className={styles.dialogInput}
              onChange={(e) => setAddForm((f) => ({ ...f, catalogUrl: e.target.value }))}
              placeholder={t('marketplaces.addDialog.catalogUrlPlaceholder')}
              type="text"
              value={addForm.catalogUrl}
            />
          </div>

          <div className={styles.dialogActions}>
            <button
              className={styles.rowActionButton}
              onClick={() => setShowAddDialog(false)}
              type="button"
            >
              {t('marketplaces.addDialog.cancel')}
            </button>
            <Button
              type="primary"
              disabled={!addForm.name.trim()}
              style={{ borderRadius: 999 }}
              onClick={() => { void handleAddMarketplace(); }}
            >
              {t('marketplaces.addDialog.confirm')}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Header actions (contextual)
  // ---------------------------------------------------------------------------

  const headerExtra = () => {
    if (activeTab === 'discover' && selectedPublicMcp) {
      return (
        <div className={styles.headerActions}>
          <button
            className={styles.headerButton}
            disabled={checkingPublicMcp}
            onClick={() => { void refreshPublicMcpConnection(); }}
            type="button"
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            {t('publicMcp.refreshStatus')}
          </button>
          <Button
            type="primary"
            icon={<Plus style={{ width: 14, height: 14 }} />}
            style={{ borderRadius: 999, height: 38 }}
            onClick={() => { void handleConnectPublicMcp(selectedPublicMcp); }}
          >
            {t('publicMcp.connectNow')}
          </Button>
          <button
            className={styles.headerButton}
            onClick={() => { void handleCopyTemplate(selectedPublicMcp.template); }}
            type="button"
          >
            <Copy style={{ width: 14, height: 14 }} />
            {t('publicMcp.copyTemplate')}
          </button>
        </div>
      );
    }

    if (activeTab === 'installed') {
      return (
        <div className={styles.headerActions}>
          <button
            className={styles.headerButton}
            onClick={() => { void fetchInstalled(); }}
            type="button"
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            {t('actions.refresh')}
          </button>
        </div>
      );
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className={skillCx(skillStyles.skillsPageRoot, styles.pageRootInset)}>
      <div className={skillStyles.skillsPageInner}>
        <div className={skillStyles.skillsPageContent}>
          <div className={skillStyles.skillsPageHeader}>
            <SettingHeader title={t('title')} extra={headerExtra()} />
          </div>

          <div className={skillCx(skillStyles.skillsPageContentInner, styles.contentInnerInset)}>
            {/* Tab bar */}
            <div className={styles.tabsShell}>
              <button
                className={cx(styles.tabButton, activeTab === 'discover' && styles.tabButtonActive)}
                onClick={() => {
                  setActiveTab('discover');
                  setSelectedPublicMcpId(null);
                }}
                type="button"
              >
                <Sparkles size={15} />
                <span>{t('tabs.discover')}</span>
              </button>
              <button
                className={cx(styles.tabButton, activeTab === 'installed' && styles.tabButtonActive)}
                onClick={() => setActiveTab('installed')}
                type="button"
              >
                <Check size={15} />
                <span>{t('tabs.installed')}</span>
              </button>
              <button
                className={cx(styles.tabButton, activeTab === 'marketplaces' && styles.tabButtonActive)}
                onClick={() => setActiveTab('marketplaces')}
                type="button"
              >
                <Store size={15} />
                <span>{t('tabs.marketplaces')}</span>
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'discover' && renderDiscoverTab()}
            {activeTab === 'installed' && renderInstalledTab()}
            {activeTab === 'marketplaces' && renderMarketplacesTab()}
          </div>
        </div>
      </div>

      {renderAddDialog()}
    </div>
  );
}

Plugins.displayName = 'PluginsPage';

export default Plugins;
