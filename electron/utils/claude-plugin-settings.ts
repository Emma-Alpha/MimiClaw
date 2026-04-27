/**
 * Read/write Claude Code settings.json for plugin & marketplace management.
 *
 * Uses the isolated config directory (`getClaudeCodeConfigDir()`) so that
 * the user's own ~/.claude/settings.json is never touched.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getClaudeCodeConfigDir } from './paths';

type MarketplaceSourceDescriptor = {
  source: 'github' | 'git' | 'url' | 'local';
  repo?: string;
  url?: string;
  path?: string;
};

type ClaudeSettings = Record<string, unknown> & {
  enabledPlugins?: Record<string, boolean>;
  extraKnownMarketplaces?: Record<string, {
    source: MarketplaceSourceDescriptor;
    catalogUrl?: string;
  }>;
};

function getSettingsPath(): string {
  return join(getClaudeCodeConfigDir(), 'settings.json');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Core read / write
// ---------------------------------------------------------------------------

export async function readClaudeSettings(): Promise<ClaudeSettings> {
  try {
    const raw = await readFile(getSettingsPath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    return parsed as ClaudeSettings;
  } catch {
    return {};
  }
}

export async function writeClaudeSettings(settings: ClaudeSettings): Promise<void> {
  await writeFile(getSettingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// enabledPlugins helpers
// ---------------------------------------------------------------------------

export async function getEnabledPlugins(): Promise<Record<string, boolean>> {
  const settings = await readClaudeSettings();
  return isRecord(settings.enabledPlugins) ? (settings.enabledPlugins as Record<string, boolean>) : {};
}

export async function setPluginEnabled(key: string, enabled: boolean): Promise<Record<string, boolean>> {
  const settings = await readClaudeSettings();
  const plugins = isRecord(settings.enabledPlugins)
    ? { ...(settings.enabledPlugins as Record<string, boolean>) }
    : {};
  plugins[key] = enabled;
  settings.enabledPlugins = plugins;
  await writeClaudeSettings(settings);
  return plugins;
}

export async function removePlugin(key: string): Promise<Record<string, boolean>> {
  const settings = await readClaudeSettings();
  const plugins = isRecord(settings.enabledPlugins)
    ? { ...(settings.enabledPlugins as Record<string, boolean>) }
    : {};
  delete plugins[key];
  settings.enabledPlugins = plugins;
  await writeClaudeSettings(settings);
  return plugins;
}

// ---------------------------------------------------------------------------
// extraKnownMarketplaces helpers
// ---------------------------------------------------------------------------

type MarketplaceEntry = {
  source: MarketplaceSourceDescriptor;
  catalogUrl?: string;
};

export async function getMarketplaceSources(): Promise<Record<string, MarketplaceEntry>> {
  const settings = await readClaudeSettings();
  return isRecord(settings.extraKnownMarketplaces)
    ? (settings.extraKnownMarketplaces as Record<string, MarketplaceEntry>)
    : {};
}

export async function addMarketplaceSource(
  name: string,
  entry: MarketplaceEntry,
): Promise<Record<string, MarketplaceEntry>> {
  const settings = await readClaudeSettings();
  const marketplaces = isRecord(settings.extraKnownMarketplaces)
    ? { ...(settings.extraKnownMarketplaces as Record<string, MarketplaceEntry>) }
    : {};
  marketplaces[name] = entry;
  settings.extraKnownMarketplaces = marketplaces;
  await writeClaudeSettings(settings);
  return marketplaces;
}

export async function removeMarketplaceSource(name: string): Promise<Record<string, MarketplaceEntry>> {
  const settings = await readClaudeSettings();
  const marketplaces = isRecord(settings.extraKnownMarketplaces)
    ? { ...(settings.extraKnownMarketplaces as Record<string, MarketplaceEntry>) }
    : {};
  delete marketplaces[name];
  settings.extraKnownMarketplaces = marketplaces;
  await writeClaudeSettings(settings);
  return marketplaces;
}
