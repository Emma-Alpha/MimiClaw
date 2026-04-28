import type { ClaudeCodeSkillEntry } from '@/lib/code-agent';
import type {
  MarketplaceCatalog,
  MarketplaceSourceDescriptor,
} from '@/types/claude-plugin';

// ─── state ───────────────────────────────────────────────────────────────────

export interface PluginsStoreState {
  activeTab: 'plugins' | 'skills';
  catalogs: Record<string, MarketplaceCatalog>;
  enabledPlugins: Record<string, boolean>;
  error: string | null;
  loading: boolean;
  manageTab: 'plugins' | 'skills' | 'mcps';
  marketplaceSources: Record<
    string,
    { source: MarketplaceSourceDescriptor; catalogUrl?: string }
  >;
  mcpStatuses: Record<string, boolean>;
  mode: 'browse' | 'manage';
  searchQuery: string;
  selectedCategory: string | null;
  selectedMarketplace: string | null;
  skills: { global: ClaudeCodeSkillEntry[]; project: ClaudeCodeSkillEntry[] };
  skillsLoading: boolean;
}

// ─── actions ─────────────────────────────────────────────────────────────────

export interface PluginsStoreAction {
  addMarketplaceSource: (
    name: string,
    source: MarketplaceSourceDescriptor,
    catalogUrl?: string,
  ) => Promise<void>;
  connectMcp: (
    serverName: string,
    serverConfig: Record<string, unknown>,
    workspaceRoot: string,
  ) => Promise<void>;
  disconnectMcp: (
    serverName: string,
    workspaceRoot: string,
  ) => Promise<void>;
  fetchCatalog: (catalogUrl: string, marketplaceName: string) => Promise<void>;
  fetchInstalledPlugins: () => Promise<void>;
  fetchMarketplaceSources: () => Promise<void>;
  fetchMcpStatus: (
    serverNames: string[],
    workspaceRoot: string,
  ) => Promise<void>;
  fetchSkills: (workspaceRoot: string) => Promise<void>;
  removeMarketplaceSource: (name: string) => Promise<void>;
  setActiveTab: (tab: 'plugins' | 'skills') => void;
  setManageTab: (tab: 'plugins' | 'skills' | 'mcps') => void;
  setMode: (mode: 'browse' | 'manage') => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedMarketplace: (marketplace: string | null) => void;
  togglePlugin: (key: string, enabled: boolean) => Promise<void>;
  uninstallPlugin: (key: string) => Promise<void>;
}

// ─── combined ────────────────────────────────────────────────────────────────

export type PluginsStore = PluginsStoreState & PluginsStoreAction;
