import { ActionIcon, Flexbox, Text } from '@lobehub/ui';
import { createStyles, cssVar } from 'antd-style';
import { Dropdown, type MenuProps, Segmented, Switch } from 'antd';
import {
  ChevronDown,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import PluginAvatar from '@/components/Plugins/PluginAvatar';
import { SearchInput } from '@/components/common/SearchInput';
import {
  getAllMarketplacePlugins,
  getCategories,
  usePluginsStore,
} from '@/stores/plugins';
import { useSettingsStore } from '@/stores/settings';
import type { InstalledPlugin, MarketplacePlugin } from '@/types/claude-plugin';
import type { ClaudeCodeSkillEntry } from '@/lib/code-agent';

import CardGrid from './components/CardGrid';
import HeroCarousel from './components/HeroCarousel';
import PluginCard from './components/PluginCard';

// ─── styles ──────────────────────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    height: 100%;
    overflow-y: auto;
    scrollbar-gutter: stable;
  `,
  scrollContent: css`
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 24px 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  title: css`
    font-size: 22px;
    font-weight: 400;
    color: ${cssVar.colorText};
  `,
  subtitle: css`
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
    margin-top: -16px;
  `,
  controlsBar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding-block: 8px;
    flex-wrap: wrap;
  `,
  stickyHeader: css`
    position: sticky;
    top: 0;
    z-index: 10;
    background: linear-gradient(
      to bottom,
      ${cssVar.colorBgLayout} 70%,
      transparent
    );
    padding: 16px 24px 24px;
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
  `,
  manageTabBar: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  `,
  manageTabButton: css`
    padding: 4px 12px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    cursor: pointer;
    background: transparent;
    color: ${cssVar.colorTextSecondary};
    transition: background-color 0.12s, color 0.12s;

    &:hover {
      background: color-mix(in oklab, ${cssVar.colorText} 5%, transparent);
    }
  `,
  manageTabActive: css`
    background: color-mix(in oklab, ${cssVar.colorText} 8%, transparent);
    color: ${cssVar.colorText};
  `,
  tabCount: css`
    margin-inline-start: 4px;
    color: ${cssVar.colorTextQuaternary};
  `,
  section: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  sectionTitle: css`
    font-size: 14px;
    font-weight: 500;
    color: ${cssVar.colorText};
  `,
  filterButton: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 8px;
    border: none;
    font-size: 12px;
    cursor: pointer;
    background: color-mix(in oklab, ${cssVar.colorText} 8%, transparent);
    color: ${cssVar.colorText};
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  emptyState: css`
    padding: 48px 24px;
    text-align: center;
  `,
  mcpRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, ${token.colorBorder} 40%, transparent);
  `,
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function toInstalledPlugins(
  record: Record<string, boolean>,
): InstalledPlugin[] {
  return Object.entries(record).map(([key, enabled]) => {
    const atIndex = key.indexOf('@');
    return {
      key,
      pluginName: atIndex > 0 ? key.slice(0, atIndex) : key,
      marketplaceName: atIndex > 0 ? key.slice(atIndex + 1) : '',
      enabled,
    };
  });
}

// ─── Browse: Plugins content ─────────────────────────────────────────────────

const BrowsePluginsContent = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('plugins');

  const catalogs = usePluginsStore((s) => s.catalogs);
  const enabledPlugins = usePluginsStore((s) => s.enabledPlugins);
  const searchQuery = usePluginsStore((s) => s.searchQuery);
  const selectedMarketplace = usePluginsStore((s) => s.selectedMarketplace);
  const selectedCategory = usePluginsStore((s) => s.selectedCategory);

  const allPlugins = useMemo(
    () => getAllMarketplacePlugins(catalogs),
    [catalogs],
  );

  const filtered = useMemo(() => {
    let result = allPlugins;
    if (selectedMarketplace) {
      result = result.filter((p) => p.marketplace === selectedMarketplace);
    }
    if (selectedCategory) {
      result = result.filter((p) =>
        p.categories?.includes(selectedCategory),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allPlugins, selectedMarketplace, selectedCategory, searchQuery]);

  const featured = useMemo(
    () => allPlugins.slice(0, 5),
    [allPlugins],
  );

  const showHero =
    !searchQuery.trim() && !selectedCategory && featured.length > 0;

  // group by category
  const sections = useMemo(() => {
    const map = new Map<string, MarketplacePlugin[]>();
    for (const p of filtered) {
      const cat = p.categories?.[0] ?? t('discover.allCategories');
      const list = map.get(cat) ?? [];
      list.push(p);
      map.set(cat, list);
    }
    return [...map.entries()].map(([title, plugins]) => ({ title, plugins }));
  }, [filtered, t]);

  return (
    <Flexbox gap={24}>
      {showHero && <HeroCarousel plugins={featured} />}

      {sections.length === 0 && (
        <div className={styles.emptyState}>
          <Text type="secondary">{t('discover.noPlugins')}</Text>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.title} className={styles.section}>
          <span className={styles.sectionTitle}>{section.title}</span>
          <CardGrid>
            {section.plugins.map((plugin) => {
              const key = `${plugin.name}@${plugin.marketplace}`;
              const installed = key in enabledPlugins;
              return (
                <PluginCard
                  key={`${plugin.marketplace}:${plugin.id}`}
                  icon={plugin.icon}
                  title={plugin.name}
                  description={plugin.description}
                  badges={
                    plugin.marketplace !== 'Built by OpenAI'
                      ? [plugin.marketplace]
                      : undefined
                  }
                  actionMode={installed ? 'status' : 'install'}
                  checked={installed}
                  extra={
                    plugin.homepage ? (
                      <ActionIcon
                        icon={ExternalLinkStub}
                        size={{ blockSize: 28, size: 14 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(plugin.homepage, '_blank');
                        }}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </CardGrid>
        </div>
      ))}
    </Flexbox>
  );
});

// stub to avoid importing ExternalLink inside memo
const ExternalLinkStub = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ─── Browse: Skills content ──────────────────────────────────────────────────

const BrowseSkillsContent = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('skills');

  const skills = usePluginsStore((s) => s.skills);
  const searchQuery = usePluginsStore((s) => s.searchQuery);

  const filterSkills = useCallback(
    (list: ClaudeCodeSkillEntry[]) => {
      if (!searchQuery.trim()) return list;
      const q = searchQuery.toLowerCase();
      return list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    },
    [searchQuery],
  );

  const globalFiltered = useMemo(
    () => filterSkills(skills.global),
    [filterSkills, skills.global],
  );
  const projectFiltered = useMemo(
    () => filterSkills(skills.project),
    [filterSkills, skills.project],
  );

  const hasResults = globalFiltered.length > 0 || projectFiltered.length > 0;

  return (
    <Flexbox gap={24}>
      {!hasResults && (
        <div className={styles.emptyState}>
          <Text type="secondary">{t('noSkills')}</Text>
        </div>
      )}

      {globalFiltered.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>
            {t('source.badge.agentsPersonal')}
          </span>
          <CardGrid>
            {globalFiltered.map((skill) => (
              <PluginCard
                key={skill.name}
                title={skill.name}
                description={skill.description}
                badges={[skill.source === 'claude' ? 'Claude' : skill.source]}
                actionMode="status"
                checked
              />
            ))}
          </CardGrid>
        </div>
      )}

      {projectFiltered.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>
            {t('source.badge.workspace')}
          </span>
          <CardGrid>
            {projectFiltered.map((skill) => (
              <PluginCard
                key={skill.name}
                title={skill.name}
                description={skill.description}
                badges={[skill.scope]}
                actionMode="status"
                checked
              />
            ))}
          </CardGrid>
        </div>
      )}
    </Flexbox>
  );
});

// ─── Manage mode ─────────────────────────────────────────────────────────────

const ManageContent = memo(() => {
  const { styles, cx } = useStyles();
  const { t } = useTranslation('plugins');
  const { t: tSkills } = useTranslation('skills');

  const manageTab = usePluginsStore((s) => s.manageTab);
  const setManageTab = usePluginsStore((s) => s.setManageTab);
  const searchQuery = usePluginsStore((s) => s.searchQuery);
  const setSearchQuery = usePluginsStore((s) => s.setSearchQuery);

  const enabledPlugins = usePluginsStore((s) => s.enabledPlugins);
  const togglePlugin = usePluginsStore((s) => s.togglePlugin);
  const uninstallPlugin = usePluginsStore((s) => s.uninstallPlugin);
  const skills = usePluginsStore((s) => s.skills);
  const mcpStatuses = usePluginsStore((s) => s.mcpStatuses);

  const plugins = useMemo(
    () => toInstalledPlugins(enabledPlugins),
    [enabledPlugins],
  );
  const allSkills = useMemo(
    () => [...skills.global, ...skills.project],
    [skills],
  );
  const mcpEntries = useMemo(
    () => Object.entries(mcpStatuses),
    [mcpStatuses],
  );

  const q = searchQuery.toLowerCase();
  const filteredPlugins = q
    ? plugins.filter((p) => p.pluginName.toLowerCase().includes(q))
    : plugins;
  const filteredSkills = q
    ? allSkills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      )
    : allSkills;
  const filteredMcps = q
    ? mcpEntries.filter(([name]) => name.toLowerCase().includes(q))
    : mcpEntries;

  const tabs = [
    { key: 'plugins' as const, label: 'Plugins', count: plugins.length },
    { key: 'skills' as const, label: 'Skills', count: allSkills.length },
    { key: 'mcps' as const, label: 'MCPs', count: mcpEntries.length },
  ];

  const handleToggle = useCallback(
    async (key: string, enabled: boolean) => {
      await togglePlugin(key, enabled);
      toast.success(
        enabled
          ? t('toast.pluginEnabled', { key })
          : t('toast.pluginDisabled', { key }),
      );
    },
    [togglePlugin, t],
  );

  const handleUninstall = useCallback(
    async (key: string) => {
      await uninstallPlugin(key);
      toast.success(t('toast.pluginRemoved', { key }));
    },
    [uninstallPlugin, t],
  );

  return (
    <>
      <div className={styles.stickyHeader}>
        <Flexbox
          horizontal
          align="center"
          justify="space-between"
          gap={12}
          style={{ flexWrap: 'wrap' }}
        >
          <div className={styles.manageTabBar}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={cx(
                  styles.manageTabButton,
                  manageTab === tab.key && styles.manageTabActive,
                )}
                onClick={() => setManageTab(tab.key)}
              >
                {tab.label}
                <span className={styles.tabCount}>{tab.count}</span>
              </button>
            ))}
          </div>
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder={t('discover.searchPlaceholder')}
            clearable
            style={{ width: 220, flexShrink: 0 }}
          />
        </Flexbox>
      </div>

      <div className={styles.scrollContent} style={{ paddingTop: 0 }}>
        {manageTab === 'plugins' && (
          <CardGrid singleColumn>
            {filteredPlugins.length === 0 ? (
              <div className={styles.emptyState}>
                <Text type="secondary">{t('installed.empty')}</Text>
              </div>
            ) : (
              filteredPlugins.map((plugin) => (
                <PluginCard
                  key={plugin.key}
                  title={plugin.pluginName}
                  description={plugin.marketplaceName}
                  actionMode="toggle"
                  checked={plugin.enabled}
                  onToggle={(checked) => handleToggle(plugin.key, checked)}
                  onUninstall={() => handleUninstall(plugin.key)}
                />
              ))
            )}
          </CardGrid>
        )}

        {manageTab === 'skills' && (
          <CardGrid singleColumn>
            {filteredSkills.length === 0 ? (
              <div className={styles.emptyState}>
                <Text type="secondary">{tSkills('noSkills')}</Text>
              </div>
            ) : (
              filteredSkills.map((skill) => (
                <PluginCard
                  key={`${skill.scope}:${skill.name}`}
                  title={skill.name}
                  description={skill.description}
                  badges={[
                    skill.source === 'claude' ? 'Claude' : skill.source,
                  ]}
                  actionMode="status"
                  checked
                />
              ))
            )}
          </CardGrid>
        )}

        {manageTab === 'mcps' && (
          <Flexbox gap={8}>
            {filteredMcps.length === 0 ? (
              <div className={styles.emptyState}>
                <Text type="secondary">No MCP servers</Text>
              </div>
            ) : (
              filteredMcps.map(([name, connected]) => (
                <div key={name} className={styles.mcpRow}>
                  <PluginAvatar avatar="MCP_AVATAR" size={32} />
                  <Flexbox flex={1} gap={2}>
                    <Text weight={500}>{name}</Text>
                    <Text
                      type="secondary"
                      style={{ fontSize: 11 }}
                    >
                      {connected ? t('publicMcp.status.connected') : t('publicMcp.status.disconnected')}
                    </Text>
                  </Flexbox>
                  <Switch size="small" checked={connected} disabled />
                </div>
              ))
            )}
          </Flexbox>
        )}
      </div>
    </>
  );
});

// ─── page ────────────────────────────────────────────────────────────────────

export function Plugins() {
  const { styles } = useStyles();
  const { t } = useTranslation('plugins');

  const mode = usePluginsStore((s) => s.mode);
  const setMode = usePluginsStore((s) => s.setMode);
  const activeTab = usePluginsStore((s) => s.activeTab);
  const setActiveTab = usePluginsStore((s) => s.setActiveTab);
  const searchQuery = usePluginsStore((s) => s.searchQuery);
  const setSearchQuery = usePluginsStore((s) => s.setSearchQuery);
  const loading = usePluginsStore((s) => s.loading);

  const selectedMarketplace = usePluginsStore((s) => s.selectedMarketplace);
  const setSelectedMarketplace = usePluginsStore(
    (s) => s.setSelectedMarketplace,
  );
  const selectedCategory = usePluginsStore((s) => s.selectedCategory);
  const setSelectedCategory = usePluginsStore((s) => s.setSelectedCategory);

  const catalogs = usePluginsStore((s) => s.catalogs);
  const marketplaceSources = usePluginsStore((s) => s.marketplaceSources);

  const fetchInstalledPlugins = usePluginsStore(
    (s) => s.fetchInstalledPlugins,
  );
  const fetchMarketplaceSources = usePluginsStore(
    (s) => s.fetchMarketplaceSources,
  );
  const fetchCatalog = usePluginsStore((s) => s.fetchCatalog);
  const fetchSkills = usePluginsStore((s) => s.fetchSkills);
  const fetchMcpStatus = usePluginsStore((s) => s.fetchMcpStatus);

  // resolve workspace root from settings
  const workspaces = useSettingsStore((s) => s.sidebarThreadWorkspaces);
  const workspaceRoot = useMemo(() => {
    const sorted = [...workspaces].sort(
      (a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0),
    );
    return sorted[0]?.rootPath ?? '';
  }, [workspaces]);

  // ── data fetching ──────────────────────────────────────────────────────

  useEffect(() => {
    void fetchInstalledPlugins();
    void fetchMarketplaceSources();
    if (workspaceRoot) {
      void fetchSkills(workspaceRoot);
      void fetchMcpStatus(['figma-desktop', 'pencil'], workspaceRoot);
    }
  }, [
    fetchInstalledPlugins,
    fetchMarketplaceSources,
    fetchSkills,
    fetchMcpStatus,
    workspaceRoot,
  ]);

  // auto-fetch catalogs
  useEffect(() => {
    for (const [name, source] of Object.entries(marketplaceSources)) {
      if (source.catalogUrl && !catalogs[name]) {
        void fetchCatalog(source.catalogUrl, name);
      }
    }
  }, [marketplaceSources, catalogs, fetchCatalog]);

  // ── filter data ────────────────────────────────────────────────────────

  const allPlugins = useMemo(
    () => getAllMarketplacePlugins(catalogs),
    [catalogs],
  );
  const marketplaceNames = useMemo(
    () => [...new Set(allPlugins.map((p) => p.marketplace))],
    [allPlugins],
  );
  const categories = useMemo(() => getCategories(allPlugins), [allPlugins]);

  const handleRefresh = useCallback(async () => {
    try {
      await fetchInstalledPlugins();
      await fetchMarketplaceSources();
      if (workspaceRoot) await fetchSkills(workspaceRoot);
    } catch {
      toast.error(t('toast.failedRefresh'));
    }
  }, [fetchInstalledPlugins, fetchMarketplaceSources, fetchSkills, t, workspaceRoot]);

  // ── marketplace dropdown menu ──────────────────────────────────────────

  const marketplaceMenu: MenuProps = {
    items: [
      {
        key: '__all__',
        label: t('discover.allCategories'),
      },
      ...marketplaceNames.map((name) => ({
        key: name,
        label: name,
      })),
    ],
    onClick: ({ key }) =>
      setSelectedMarketplace(key === '__all__' ? null : key),
  };

  const categoryMenu: MenuProps = {
    items: [
      {
        key: '__all__',
        label: t('discover.allCategories'),
      },
      ...categories.map((cat) => ({
        key: cat,
        label: cat,
      })),
    ],
    onClick: ({ key }) =>
      setSelectedCategory(key === '__all__' ? null : key),
  };

  // ── Manage mode ────────────────────────────────────────────────────────

  if (mode === 'manage') {
    return (
      <div className={styles.page}>
        <ManageContent />
      </div>
    );
  }

  // ── Browse mode ────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.scrollContent}>
        {/* Header */}
        <Flexbox horizontal align="center" justify="space-between">
          <span className={styles.title}>{t('title')}</span>
          <Flexbox horizontal align="center" gap={6}>
            <ActionIcon
              icon={RefreshCw}
              size={{ blockSize: 32, size: 16 }}
              title={t('actions.refresh')}
              loading={loading}
              onClick={handleRefresh}
            />
            <ActionIcon
              icon={Settings2}
              size={{ blockSize: 32, size: 16 }}
              title="Manage"
              onClick={() => setMode('manage')}
            />
          </Flexbox>
        </Flexbox>

        <span className={styles.subtitle}>
          {t('publicMcp.description')}
        </span>

        {/* Controls bar */}
        <div className={styles.controlsBar}>
          <Segmented
            size="small"
            options={[
              { label: t('tabs.discover'), value: 'plugins' },
              { label: 'Skills', value: 'skills' },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'plugins' | 'skills')}
          />
          <div style={{ flex: 1 }} />
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder={t('discover.searchPlaceholder')}
            clearable
            style={{ width: 200 }}
          />
          {activeTab === 'plugins' && marketplaceNames.length > 0 && (
            <Dropdown menu={marketplaceMenu} trigger={['click']}>
              <button type="button" className={styles.filterButton}>
                {selectedMarketplace ?? t('discover.allCategories')}
                <ChevronDown size={12} />
              </button>
            </Dropdown>
          )}
          {activeTab === 'plugins' && categories.length > 0 && (
            <Dropdown menu={categoryMenu} trigger={['click']}>
              <button type="button" className={styles.filterButton}>
                {selectedCategory ?? t('discover.allCategories')}
                <ChevronDown size={12} />
              </button>
            </Dropdown>
          )}
        </div>

        {/* Content */}
        {activeTab === 'plugins' ? (
          <BrowsePluginsContent />
        ) : (
          <BrowseSkillsContent />
        )}
      </div>
    </div>
  );
}

export default Plugins;
