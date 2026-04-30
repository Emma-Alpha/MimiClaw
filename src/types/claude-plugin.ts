/** A bundled skill entry within a plugin */
export interface PluginSkillEntry {
  name: string;
  description: string;
  overview?: string;
  badge?: string;
}

/** A runtime dependency a plugin needs on the user's machine */
export interface PluginRequirement {
  /** Binary name to look up on PATH, e.g. 'node', 'ffmpeg', 'python3' */
  name: string;
  /** Optional minimum version, e.g. '22' for node ≥ 22 */
  minVersion?: string;
  /** Friendly label shown to the user when missing */
  label?: string;
  /** Override install commands per platform; falls back to a built-in table */
  installCommand?: {
    darwin?: string;
    win32?: string;
    linux?: string;
  };
}

/** Result of a single requirement check */
export interface PreflightCheckResult {
  name: string;
  ok: boolean;
  /** Detected version when found */
  version?: string;
  /** Reason for failure: 'missing' | 'version-too-old' */
  reason?: 'missing' | 'version-too-old';
  label?: string;
  installCommand?: {
    darwin?: string;
    win32?: string;
    linux?: string;
  };
}

/** Aggregate preflight response */
export interface PreflightResponse {
  ok: boolean;
  platform: 'darwin' | 'win32' | 'linux';
  results: PreflightCheckResult[];
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
  /** Capability labels */
  capabilities?: string[];
  /** Developer name override */
  developerName?: string;
  /** MCP server name used as key in .mcp.json (e.g. "computer-use") */
  mcpServerName?: string;
  /** MCP server config object to write into .mcp.json mcpServers */
  mcpServerConfig?: Record<string, unknown>;
  /** Runtime dependencies the user must have installed; checked before install */
  requirements?: PluginRequirement[];
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
