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
  packageName?: string;
  installPath?: string;
}

export interface PluginsSnapshot {
  plugins: PluginSummary[];
  mcpPlugins: PluginSummary[];
  extensionsDir: string;
}
