import { ActionIcon, Flexbox, Text } from '@lobehub/ui';
import { createStyles, cssVar } from 'antd-style';
import { Input, Modal, Switch, Tabs } from 'antd';
import {
  ExternalLink,
  Globe,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import PluginAvatar from '@/components/Plugins/PluginAvatar';
import { usePluginsStore } from '@/stores/plugins';
import type { InstalledPlugin, MarketplacePlugin } from '@/types/claude-plugin';

// ─── styles ──────────────────────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
  page: css`
    height: 100%;
    overflow-y: auto;
    padding: 24px 32px;
  `,
  header: css`
    margin-bottom: 24px;
  `,
  card: css`
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid ${token.colorBorderSecondary};
    transition: border-color 0.15s;

    &:hover {
      border-color: ${token.colorBorder};
    }
  `,
  emptyState: css`
    padding: 48px 24px;
    text-align: center;
  `,
  mcpCard: css`
    padding: 16px;
    border-radius: 10px;
    border: 1px solid ${token.colorBorderSecondary};
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover {
      border-color: ${cssVar.colorPrimary};
    }
  `,
  badge: css`
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 999px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryText};
    flex-shrink: 0;
  `,
  sourceCard: css`
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid ${token.colorBorderSecondary};
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

// ─── sub-components ──────────────────────────────────────────────────────────

const PluginItem = memo<{
  plugin: InstalledPlugin;
  onToggle: (key: string, enabled: boolean) => void;
  onUninstall: (key: string) => void;
}>(({ plugin, onToggle, onUninstall }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('plugins');

  return (
    <Flexbox
      horizontal
      align="center"
      className={styles.card}
      gap={12}
    >
      <PluginAvatar avatar="MCP_AVATAR" size={36} />
      <Flexbox flex={1} gap={2}>
        <Text weight={500} ellipsis>
          {plugin.pluginName}
        </Text>
        {plugin.marketplaceName && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {plugin.marketplaceName}
          </Text>
        )}
      </Flexbox>
      <Switch
        size="small"
        checked={plugin.enabled}
        onChange={(checked) => onToggle(plugin.key, checked)}
      />
      <ActionIcon
        icon={Trash2}
        size={{ blockSize: 28, size: 14 }}
        title={t('installed.uninstall')}
        onClick={() => onUninstall(plugin.key)}
      />
    </Flexbox>
  );
});

const MarketplacePluginCard = memo<{
  plugin: MarketplacePlugin;
  installed: boolean;
}>(({ plugin, installed }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('plugins');

  return (
    <Flexbox horizontal align="center" className={styles.card} gap={12}>
      <PluginAvatar avatar={plugin.icon || 'MCP_AVATAR'} size={36} />
      <Flexbox flex={1} gap={2}>
        <Flexbox horizontal align="center" gap={6}>
          <Text weight={500} ellipsis>
            {plugin.name}
          </Text>
          {plugin.categories?.map((cat) => (
            <span key={cat} className={styles.badge}>
              {cat}
            </span>
          ))}
        </Flexbox>
        <Text
          type="secondary"
          style={{ fontSize: 12 }}
          ellipsis
        >
          {plugin.description}
        </Text>
      </Flexbox>
      {installed ? (
        <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
          {t('discover.enabled')}
        </Text>
      ) : (
        plugin.homepage && (
          <ActionIcon
            icon={ExternalLink}
            size={{ blockSize: 28, size: 14 }}
            title={t('discover.viewHomepage')}
            onClick={() => window.open(plugin.homepage, '_blank')}
          />
        )
      )}
    </Flexbox>
  );
});

const McpToolCard = memo<{
  name: string;
  badge: string;
  summary: string;
}>(({ name, badge, summary }) => {
  const { styles } = useStyles();

  return (
    <Flexbox className={styles.mcpCard} gap={8}>
      <Flexbox horizontal align="center" gap={8}>
        <PluginAvatar avatar="MCP_AVATAR" size={28} />
        <Text weight={500}>{name}</Text>
        <span className={styles.badge}>{badge}</span>
      </Flexbox>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {summary}
      </Text>
    </Flexbox>
  );
});

// ─── tabs ────────────────────────────────────────────────────────────────────

const DiscoverTab = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('plugins');
  const [searchQuery, setSearchQuery] = useState('');

  const marketplaceSources = usePluginsStore((s) => s.marketplaceSources);
  const catalogs = usePluginsStore((s) => s.catalogs);
  const enabledPlugins = usePluginsStore((s) => s.enabledPlugins);
  const fetchCatalog = usePluginsStore((s) => s.fetchCatalog);

  useEffect(() => {
    for (const [name, source] of Object.entries(marketplaceSources)) {
      if (source.catalogUrl && !catalogs[name]) {
        void fetchCatalog(source.catalogUrl, name);
      }
    }
  }, [marketplaceSources, catalogs, fetchCatalog]);

  const allMarketplacePlugins = useMemo(() => {
    const result: MarketplacePlugin[] = [];
    for (const [marketplace, catalog] of Object.entries(catalogs)) {
      for (const plugin of catalog.plugins) {
        result.push({ ...plugin, marketplace });
      }
    }
    return result;
  }, [catalogs]);

  const filteredPlugins = useMemo(() => {
    if (!searchQuery.trim()) return allMarketplacePlugins;
    const q = searchQuery.toLowerCase();
    return allMarketplacePlugins.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [allMarketplacePlugins, searchQuery]);

  return (
    <Flexbox gap={24}>
      {/* 推荐 MCP */}
      <Flexbox gap={12}>
        <Text weight={500}>{t('publicMcp.title')}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('publicMcp.description')}
        </Text>
        <Flexbox horizontal gap={12} style={{ flexWrap: 'wrap' }}>
          <McpToolCard
            name={t('publicMcp.tools.figma.name')}
            badge={t('publicMcp.tools.figma.badge')}
            summary={t('publicMcp.tools.figma.summary')}
          />
          <McpToolCard
            name={t('publicMcp.tools.pencil.name')}
            badge={t('publicMcp.tools.pencil.badge')}
            summary={t('publicMcp.tools.pencil.summary')}
          />
        </Flexbox>
      </Flexbox>

      {/* 市场插件 */}
      <Flexbox gap={12}>
        <Flexbox horizontal align="center" justify="space-between">
          <Text weight={500}>{t('discover.marketplacePlugins')}</Text>
          <Input.Search
            placeholder={t('discover.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
        </Flexbox>
        {Object.keys(marketplaceSources).length === 0 && (
          <div className={styles.emptyState}>
            <Text type="secondary">{t('discover.noMarketplaces')}</Text>
          </div>
        )}
        {filteredPlugins.length > 0 && (
          <Flexbox gap={8}>
            {filteredPlugins.map((plugin) => (
              <MarketplacePluginCard
                key={`${plugin.marketplace}:${plugin.id}`}
                plugin={plugin}
                installed={
                  !!enabledPlugins[
                    `${plugin.name}@${plugin.marketplace}`
                  ]
                }
              />
            ))}
          </Flexbox>
        )}
        {Object.keys(marketplaceSources).length > 0 &&
          filteredPlugins.length === 0 && (
            <div className={styles.emptyState}>
              <Text type="secondary">{t('discover.noPlugins')}</Text>
            </div>
          )}
      </Flexbox>
    </Flexbox>
  );
});

const InstalledTab = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('plugins');
  const enabledPlugins = usePluginsStore((s) => s.enabledPlugins);
  const togglePlugin = usePluginsStore((s) => s.togglePlugin);
  const uninstallPlugin = usePluginsStore((s) => s.uninstallPlugin);

  const plugins = useMemo(
    () => toInstalledPlugins(enabledPlugins),
    [enabledPlugins],
  );

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

  if (plugins.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text type="secondary">{t('installed.empty')}</Text>
      </div>
    );
  }

  return (
    <Flexbox gap={8}>
      {plugins.map((plugin) => (
        <PluginItem
          key={plugin.key}
          plugin={plugin}
          onToggle={handleToggle}
          onUninstall={handleUninstall}
        />
      ))}
    </Flexbox>
  );
});

const MarketplacesTab = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('plugins');
  const marketplaceSources = usePluginsStore((s) => s.marketplaceSources);
  const addSource = usePluginsStore((s) => s.addMarketplaceSource);
  const removeSource = usePluginsStore((s) => s.removeMarketplaceSource);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const handleAdd = useCallback(async () => {
    if (!formName.trim() || !formUrl.trim()) return;
    try {
      await addSource(
        formName.trim(),
        { source: 'url', url: formUrl.trim() },
        formUrl.trim(),
      );
      toast.success(t('toast.marketplaceAdded', { name: formName.trim() }));
      setAddDialogOpen(false);
      setFormName('');
      setFormUrl('');
    } catch (err) {
      toast.error(
        t('toast.marketplaceAddFailed', {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }, [addSource, formName, formUrl, t]);

  const handleRemove = useCallback(
    async (name: string) => {
      try {
        await removeSource(name);
        toast.success(t('toast.marketplaceRemoved', { name }));
      } catch (err) {
        toast.error(
          t('toast.marketplaceRemoveFailed', {
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    },
    [removeSource, t],
  );

  const entries = Object.entries(marketplaceSources);

  return (
    <Flexbox gap={16}>
      <Flexbox gap={4}>
        <Text weight={500}>{t('marketplaces.title')}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('marketplaces.description')}
        </Text>
      </Flexbox>

      {entries.length === 0 ? (
        <div className={styles.emptyState}>
          <Text type="secondary">{t('marketplaces.empty')}</Text>
        </div>
      ) : (
        <Flexbox gap={8}>
          {entries.map(([name, source]) => (
            <Flexbox
              key={name}
              horizontal
              align="center"
              className={styles.sourceCard}
              gap={12}
            >
              <Globe size={18} style={{ flexShrink: 0, opacity: 0.6 }} />
              <Flexbox flex={1} gap={2}>
                <Text weight={500}>{name}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {source.catalogUrl || source.source?.url || '—'}
                </Text>
              </Flexbox>
              <ActionIcon
                icon={Trash2}
                size={{ blockSize: 28, size: 14 }}
                title={t('marketplaces.remove')}
                onClick={() => handleRemove(name)}
              />
            </Flexbox>
          ))}
        </Flexbox>
      )}

      <Flexbox horizontal>
        <ActionIcon
          icon={Plus}
          size={{ blockSize: 32, size: 16 }}
          title={t('marketplaces.addSource')}
          onClick={() => setAddDialogOpen(true)}
        />
      </Flexbox>

      <Modal
        title={t('marketplaces.addDialog.title')}
        open={addDialogOpen}
        onOk={handleAdd}
        onCancel={() => {
          setAddDialogOpen(false);
          setFormName('');
          setFormUrl('');
        }}
        okText={t('marketplaces.addDialog.confirm')}
        cancelText={t('marketplaces.addDialog.cancel')}
      >
        <Flexbox gap={12} style={{ paddingBlock: 12 }}>
          <Flexbox gap={4}>
            <Text>{t('marketplaces.addDialog.nameLabel')}</Text>
            <Input
              placeholder={t('marketplaces.addDialog.namePlaceholder')}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </Flexbox>
          <Flexbox gap={4}>
            <Text>{t('marketplaces.addDialog.catalogUrlLabel')}</Text>
            <Input
              placeholder={t('marketplaces.addDialog.catalogUrlPlaceholder')}
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
            />
          </Flexbox>
        </Flexbox>
      </Modal>
    </Flexbox>
  );
});

// ─── page ────────────────────────────────────────────────────────────────────

export function Plugins() {
  const { styles } = useStyles();
  const { t } = useTranslation('plugins');

  const fetchInstalledPlugins = usePluginsStore(
    (s) => s.fetchInstalledPlugins,
  );
  const fetchMarketplaceSources = usePluginsStore(
    (s) => s.fetchMarketplaceSources,
  );
  const loading = usePluginsStore((s) => s.loading);

  useEffect(() => {
    void fetchInstalledPlugins();
    void fetchMarketplaceSources();
  }, [fetchInstalledPlugins, fetchMarketplaceSources]);

  const handleRefresh = useCallback(async () => {
    try {
      await fetchInstalledPlugins();
      await fetchMarketplaceSources();
    } catch {
      toast.error(t('toast.failedRefresh'));
    }
  }, [fetchInstalledPlugins, fetchMarketplaceSources, t]);

  return (
    <div className={styles.page}>
      <Flexbox className={styles.header} gap={8}>
        <Flexbox horizontal align="center" justify="space-between">
          <Text style={{ fontSize: 20, fontWeight: 600 }}>{t('title')}</Text>
          <ActionIcon
            icon={RefreshCw}
            size={{ blockSize: 32, size: 16 }}
            title={t('actions.refresh')}
            loading={loading}
            onClick={handleRefresh}
          />
        </Flexbox>
      </Flexbox>

      <Tabs
        defaultActiveKey="discover"
        items={[
          {
            key: 'discover',
            label: t('tabs.discover'),
            children: <DiscoverTab />,
          },
          {
            key: 'installed',
            label: t('tabs.installed'),
            children: <InstalledTab />,
          },
          {
            key: 'marketplaces',
            label: t('tabs.marketplaces'),
            children: <MarketplacesTab />,
          },
        ]}
      />
    </div>
  );
}

export default Plugins;
