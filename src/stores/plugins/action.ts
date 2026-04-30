import { hostApiFetch } from '@/lib/host-api';
import { fetchClaudeCodeSkills } from '@/lib/code-agent';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type {
  MarketplaceCatalog,
  PluginRequirement,
  PreflightResponse,
} from '@/types/claude-plugin';
import type { PluginsStore, PluginsStoreAction } from './types';

type Setter = StoreSetter<PluginsStore>;
type Getter = StoreGetter<PluginsStore>;

// ─── response shapes ─────────────────────────────────────────────────────────

interface EnabledPluginsResponse {
  success: boolean;
  enabledPlugins: Record<string, boolean>;
}

interface MarketplacesResponse {
  success: boolean;
  marketplaces: PluginsStore['marketplaceSources'];
}

interface CatalogResponse {
  success: boolean;
  catalog: MarketplaceCatalog;
}

interface McpStatusResponse {
  success: boolean;
  fileExists: boolean;
  filePath: string;
  statuses: Record<string, boolean>;
  workspaceResolved: boolean;
  workspaceRoot: string;
}

// ─── action class ────────────────────────────────────────────────────────────

export class PluginsActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  // ── plugin actions ───────────────────────────────────────────────────

  fetchInstalledPlugins = async () => {
    this.#set({ loading: true, error: null });
    try {
      const res = await hostApiFetch<EnabledPluginsResponse>(
        '/api/plugins/claude/installed',
      );
      this.#set({ enabledPlugins: res.enabledPlugins, loading: false });
    } catch (err) {
      this.#set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
    }
  };

  togglePlugin = async (key: string, enabled: boolean) => {
    const prev = this.#get().enabledPlugins;
    this.#set({ enabledPlugins: { ...prev, [key]: enabled } });
    try {
      const res = await hostApiFetch<EnabledPluginsResponse>(
        '/api/plugins/claude/toggle',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, enabled }),
        },
      );
      this.#set({ enabledPlugins: res.enabledPlugins });
    } catch {
      this.#set({ enabledPlugins: prev });
    }
  };

  uninstallPlugin = async (key: string) => {
    const prev = this.#get().enabledPlugins;
    const next = { ...prev };
    delete next[key];
    this.#set({ enabledPlugins: next });
    try {
      const res = await hostApiFetch<EnabledPluginsResponse>(
        '/api/plugins/claude/uninstall',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        },
      );
      this.#set({ enabledPlugins: res.enabledPlugins });
    } catch {
      this.#set({ enabledPlugins: prev });
    }
  };

  fetchMarketplaceSources = async () => {
    try {
      const res = await hostApiFetch<MarketplacesResponse>(
        '/api/plugins/claude/marketplaces',
      );
      this.#set({ marketplaceSources: res.marketplaces });
    } catch {
      // silent
    }
  };

  fetchCatalog = async (catalogUrl: string, marketplaceName: string) => {
    try {
      const res = await hostApiFetch<CatalogResponse>(
        '/api/plugins/claude/catalog',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ catalogUrl, marketplaceName }),
        },
      );
      this.#set((state) => ({
        catalogs: { ...state.catalogs, [marketplaceName]: res.catalog },
      }));
    } catch {
      // silent
    }
  };

  addMarketplaceSource = async (
    name: string,
    source: unknown,
    catalogUrl?: string,
  ) => {
    const res = await hostApiFetch<MarketplacesResponse>(
      '/api/plugins/claude/marketplaces',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, source, catalogUrl }),
      },
    );
    this.#set({ marketplaceSources: res.marketplaces });
  };

  removeMarketplaceSource = async (name: string) => {
    const res = await hostApiFetch<MarketplacesResponse>(
      '/api/plugins/claude/marketplaces',
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      },
    );
    this.#set({ marketplaceSources: res.marketplaces });
  };

  // ── skills actions ───────────────────────────────────────────────────

  fetchSkills = async (workspaceRoot: string) => {
    this.#set({ skillsLoading: true });
    try {
      const skills = await fetchClaudeCodeSkills(workspaceRoot);
      this.#set({ skills, skillsLoading: false });
    } catch {
      this.#set({ skillsLoading: false });
    }
  };

  // ── MCP actions ──────────────────────────────────────────────────────

  fetchMcpStatus = async (serverNames: string[], workspaceRoot: string) => {
    try {
      const res = await hostApiFetch<McpStatusResponse>(
        '/api/plugins/public-mcp/status',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverNames, workspaceRoot }),
        },
      );
      this.#set({ mcpStatuses: res.statuses });
    } catch {
      // silent
    }
  };

  connectMcp = async (
    serverName: string,
    serverConfig: Record<string, unknown>,
    workspaceRoot: string,
  ) => {
    await hostApiFetch('/api/plugins/public-mcp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverName, serverConfig, workspaceRoot }),
    });
    await this.fetchMcpStatus([serverName], workspaceRoot);
  };

  disconnectMcp = async (serverName: string, workspaceRoot: string) => {
    await hostApiFetch('/api/plugins/public-mcp/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverName, workspaceRoot }),
    });
    await this.fetchMcpStatus([serverName], workspaceRoot);
  };

  // ── preflight ────────────────────────────────────────────────────────

  runPreflight = async (
    requirements: PluginRequirement[],
  ): Promise<PreflightResponse> => {
    const res = await hostApiFetch<PreflightResponse & { success: boolean }>(
      '/api/plugins/preflight',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements }),
      },
    );
    return { ok: res.ok, platform: res.platform, results: res.results };
  };

  // ── UI actions ───────────────────────────────────────────────────────

  setMode = (mode: 'browse' | 'manage') => this.#set({ mode });

  setActiveTab = (tab: 'plugins' | 'skills') => this.#set({ activeTab: tab });

  setManageTab = (tab: 'plugins' | 'skills' | 'mcps') =>
    this.#set({ manageTab: tab });

  setSearchQuery = (query: string) => this.#set({ searchQuery: query });

  setSelectedMarketplace = (marketplace: string | null) =>
    this.#set({ selectedMarketplace: marketplace });

  setSelectedCategory = (category: string | null) =>
    this.#set({ selectedCategory: category });
}

export type PluginsAction = StorePublicActions<PluginsActionImpl>;

export const createPluginsSlice = (
  set: Setter,
  get: Getter,
  api?: unknown,
): PluginsStoreAction => new PluginsActionImpl(set, get, api);
