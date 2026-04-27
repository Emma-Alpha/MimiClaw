import { create } from 'zustand';

import { hostApiFetch } from '@/lib/host-api';
import type {
  MarketplaceCatalog,
  MarketplaceSourceDescriptor,
} from '@/types/claude-plugin';

// ─── types ───────────────────────────────────────────────────────────────────

interface PluginsStoreState {
  enabledPlugins: Record<string, boolean>;
  marketplaceSources: Record<
    string,
    { source: MarketplaceSourceDescriptor; catalogUrl?: string }
  >;
  catalogs: Record<string, MarketplaceCatalog>;
  loading: boolean;
  error: string | null;
}

interface PluginsStoreAction {
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
}

type PluginsStore = PluginsStoreState & PluginsStoreAction;

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

// ─── store ───────────────────────────────────────────────────────────────────

export const usePluginsStore = create<PluginsStore>((set, get) => ({
  // state
  enabledPlugins: {},
  marketplaceSources: {},
  catalogs: {},
  loading: false,
  error: null,

  // actions
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
    // optimistic update
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
      // rollback
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
    try {
      const res = await hostApiFetch<MarketplacesResponse>(
        '/api/plugins/claude/marketplaces',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, source, catalogUrl }),
        },
      );
      set({ marketplaceSources: res.marketplaces });
    } catch {
      throw new Error('Failed to add marketplace source');
    }
  },

  removeMarketplaceSource: async (name) => {
    try {
      const res = await hostApiFetch<MarketplacesResponse>(
        '/api/plugins/claude/marketplaces',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
      );
      set({ marketplaceSources: res.marketplaces });
    } catch {
      throw new Error('Failed to remove marketplace source');
    }
  },
}));
