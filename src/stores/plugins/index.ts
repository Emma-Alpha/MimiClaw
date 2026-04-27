import { create } from 'zustand';

import { hostApiFetch } from '@/lib/host-api';
import { fetchClaudeCodeSkills } from '@/lib/code-agent';
import type { ClaudeCodeSkillEntry } from '@/lib/code-agent';
import type {
  MarketplaceCatalog,
  MarketplacePlugin,
  MarketplaceSourceDescriptor,
} from '@/types/claude-plugin';
import {
  builtinCatalog,
  BUILTIN_MARKETPLACE_NAME,
} from '@/pages/Plugins/builtin-catalog';

// ─── response shapes ─────────────────────────────────────────────────────────

interface EnabledPluginsResponse {
  success: boolean;
  enabledPlugins: Record<string, boolean>;
}

interface MarketplacesResponse {
  success: boolean;
  marketplaces: Record<
    string,
    { source: MarketplaceSourceDescriptor; catalogUrl?: string }
  >;
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

// ─── store types ─────────────────────────────────────────────────────────────

interface PluginsStoreState {
  // plugin data
  enabledPlugins: Record<string, boolean>;
  marketplaceSources: Record<
    string,
    { source: MarketplaceSourceDescriptor; catalogUrl?: string }
  >;
  catalogs: Record<string, MarketplaceCatalog>;
  loading: boolean;
  error: string | null;

  // skills data
  skills: { global: ClaudeCodeSkillEntry[]; project: ClaudeCodeSkillEntry[] };
  skillsLoading: boolean;

  // MCP data
  mcpStatuses: Record<string, boolean>;

  // UI state
  mode: 'browse' | 'manage';
  activeTab: 'plugins' | 'skills';
  manageTab: 'plugins' | 'skills' | 'mcps';
  searchQuery: string;
  selectedMarketplace: string | null;
  selectedCategory: string | null;
}

interface PluginsStoreAction {
  // plugin actions
  fetchInstalledPlugins: () => Promise<void>;
  togglePlugin: (key: string, enabled: boolean) => Promise<void>;
  uninstallPlugin: (key: string) => Promise<void>;
  fetchMarketplaceSources: () => Promise<void>;
  fetchCatalog: (catalogUrl: string, marketplaceName: string) => Promise<void>;
  addMarketplaceSource: (
    name: string,
    source: MarketplaceSourceDescriptor,
    catalogUrl?: string,
  ) => Promise<void>;
  removeMarketplaceSource: (name: string) => Promise<void>;

  // skills actions
  fetchSkills: (workspaceRoot: string) => Promise<void>;

  // MCP actions
  fetchMcpStatus: (
    serverNames: string[],
    workspaceRoot: string,
  ) => Promise<void>;
  connectMcp: (
    serverName: string,
    serverConfig: Record<string, unknown>,
    workspaceRoot: string,
  ) => Promise<void>;

  // UI actions
  setMode: (mode: 'browse' | 'manage') => void;
  setActiveTab: (tab: 'plugins' | 'skills') => void;
  setManageTab: (tab: 'plugins' | 'skills' | 'mcps') => void;
  setSearchQuery: (query: string) => void;
  setSelectedMarketplace: (marketplace: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
}

export type PluginsStore = PluginsStoreState & PluginsStoreAction;

// ─── helpers ─────────────────────────────────────────────────────────────────

export function getAllMarketplacePlugins(
  catalogs: Record<string, MarketplaceCatalog>,
): MarketplacePlugin[] {
  const result: MarketplacePlugin[] = [];
  for (const [marketplace, catalog] of Object.entries(catalogs)) {
    for (const plugin of catalog.plugins) {
      result.push({ ...plugin, marketplace });
    }
  }
  return result;
}

export function getCategories(plugins: MarketplacePlugin[]): string[] {
  const set = new Set<string>();
  for (const p of plugins) {
    for (const cat of p.categories ?? []) set.add(cat);
  }
  return [...set].sort();
}

// ─── store ───────────────────────────────────────────────────────────────────

export const usePluginsStore = create<PluginsStore>((set, get) => ({
  // state — built-in catalog pre-loaded so the page is never empty
  enabledPlugins: {},
  marketplaceSources: {},
  catalogs: { [BUILTIN_MARKETPLACE_NAME]: builtinCatalog },
  loading: false,
  error: null,
  skills: { global: [], project: [] },
  skillsLoading: false,
  mcpStatuses: {},
  mode: 'browse',
  activeTab: 'plugins',
  manageTab: 'plugins',
  searchQuery: '',
  selectedMarketplace: null,
  selectedCategory: null,

  // ── plugin actions ─────────────────────────────────────────────────────

  fetchInstalledPlugins: async () => {
    set({ loading: true, error: null });
    try {
      const res = await hostApiFetch<EnabledPluginsResponse>(
        '/api/plugins/claude/installed',
      );
      set({ enabledPlugins: res.enabledPlugins, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
    }
  },

  togglePlugin: async (key, enabled) => {
    const prev = get().enabledPlugins;
    set({ enabledPlugins: { ...prev, [key]: enabled } });
    try {
      const res = await hostApiFetch<EnabledPluginsResponse>(
        '/api/plugins/claude/toggle',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, enabled }),
        },
      );
      set({ enabledPlugins: res.enabledPlugins });
    } catch {
      set({ enabledPlugins: prev });
    }
  },

  uninstallPlugin: async (key) => {
    const prev = get().enabledPlugins;
    const next = { ...prev };
    delete next[key];
    set({ enabledPlugins: next });
    try {
      const res = await hostApiFetch<EnabledPluginsResponse>(
        '/api/plugins/claude/uninstall',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        },
      );
      set({ enabledPlugins: res.enabledPlugins });
    } catch {
      set({ enabledPlugins: prev });
    }
  },

  fetchMarketplaceSources: async () => {
    try {
      const res = await hostApiFetch<MarketplacesResponse>(
        '/api/plugins/claude/marketplaces',
      );
      set({ marketplaceSources: res.marketplaces });
    } catch {
      // silent
    }
  },

  fetchCatalog: async (catalogUrl, marketplaceName) => {
    try {
      const res = await hostApiFetch<CatalogResponse>(
        '/api/plugins/claude/catalog',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ catalogUrl, marketplaceName }),
        },
      );
      set((state) => ({
        catalogs: { ...state.catalogs, [marketplaceName]: res.catalog },
      }));
    } catch {
      // silent
    }
  },

  addMarketplaceSource: async (name, source, catalogUrl) => {
    const res = await hostApiFetch<MarketplacesResponse>(
      '/api/plugins/claude/marketplaces',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, source, catalogUrl }),
      },
    );
    set({ marketplaceSources: res.marketplaces });
  },

  removeMarketplaceSource: async (name) => {
    const res = await hostApiFetch<MarketplacesResponse>(
      '/api/plugins/claude/marketplaces',
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      },
    );
    set({ marketplaceSources: res.marketplaces });
  },

  // ── skills actions ─────────────────────────────────────────────────────

  fetchSkills: async (workspaceRoot) => {
    set({ skillsLoading: true });
    try {
      const skills = await fetchClaudeCodeSkills(workspaceRoot);
      set({ skills, skillsLoading: false });
    } catch {
      set({ skillsLoading: false });
    }
  },

  // ── MCP actions ────────────────────────────────────────────────────────

  fetchMcpStatus: async (serverNames, workspaceRoot) => {
    try {
      const res = await hostApiFetch<McpStatusResponse>(
        '/api/plugins/public-mcp/status',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverNames, workspaceRoot }),
        },
      );
      set({ mcpStatuses: res.statuses });
    } catch {
      // silent
    }
  },

  connectMcp: async (serverName, serverConfig, workspaceRoot) => {
    await hostApiFetch('/api/plugins/public-mcp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverName, serverConfig, workspaceRoot }),
    });
    // refresh statuses after connect
    await get().fetchMcpStatus([serverName], workspaceRoot);
  },

  // ── UI actions ─────────────────────────────────────────────────────────

  setMode: (mode) => set({ mode }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setManageTab: (tab) => set({ manageTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedMarketplace: (marketplace) =>
    set({ selectedMarketplace: marketplace }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
}));
