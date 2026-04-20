export type PluginSource = 'bundled' | 'detected' | 'npm' | 'path';

export interface PluginSummary {
  key: string;
  pluginId: string;
  dirName: string;
  name: string;
  description: string;
  version: string | null;
  installed: boolean;
  enabled: boolean;
  installable: boolean;
  supportsMcp: boolean;
  source: PluginSource;
  icon?: string;
  packageName?: string;
  installPath?: string;
}

export interface PluginsSnapshot {
  plugins: PluginSummary[];
  mcpPlugins: PluginSummary[];
  extensionsDir: string;
}

export interface PublicMcpConnectionSnapshot {
  fileExists: boolean;
  filePath: string;
  statuses: Record<string, boolean>;
  workspaceResolved: boolean;
  workspaceRoot: string;
}
