/** A bundled skill entry within a plugin */
export interface PluginSkillEntry {
  name: string;
  description: string;
  overview?: string;
  badge?: string;
}

/** Plugin entry from a remote marketplace catalog */
export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  icon?: string;
  categories?: string[];
  components?: string[];
  homepage?: string;
  /** Long description shown on the detail page */
  longDescription?: string;
  /** Hero image URL or gradient identifier */
  heroImage?: string;
  /** Bundled skills within this plugin */
  skills?: PluginSkillEntry[];
  /** Default prompt for "Try in chat" */
  defaultPrompt?: string;
  /** Marketplace name this plugin belongs to (injected at fetch time) */
  marketplace: string;
}

/** Shape of the remote marketplace.json */
export interface MarketplaceCatalog {
  name: string;
  description?: string;
  plugins: Omit<MarketplacePlugin, 'marketplace'>[];
}

export type CatalogPlugin = Omit<MarketplacePlugin, 'marketplace'>;

/** Source descriptor for a marketplace */
export interface MarketplaceSourceDescriptor {
  source: 'github' | 'git' | 'url' | 'local';
  repo?: string;
  url?: string;
  path?: string;
}

/** A registered marketplace entry stored in settings.json */
export interface MarketplaceSource {
  name: string;
  source: MarketplaceSourceDescriptor;
  /** Optional: explicit URL to fetch the marketplace.json catalog */
  catalogUrl?: string;
}

/** Plugin-related fields in Claude Code's settings.json */
export interface ClaudePluginSettings {
  enabledPlugins?: Record<string, boolean>;
  extraKnownMarketplaces?: Record<string, {
    source: MarketplaceSourceDescriptor;
    catalogUrl?: string;
  }>;
  [key: string]: unknown;
}

/** View model for an installed/enabled plugin */
export interface InstalledPlugin {
  /** Full key, e.g. "github@claude-plugins-official" */
  key: string;
  /** Part before @, e.g. "github" */
  pluginName: string;
  /** Part after @, e.g. "claude-plugins-official" */
  marketplaceName: string;
  enabled: boolean;
}
