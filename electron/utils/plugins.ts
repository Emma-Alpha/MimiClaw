import { constants } from 'fs';
import { access, readdir, readFile, realpath } from 'fs/promises';
import { homedir } from 'os';
import { join, resolve } from 'path';

import { readOpenClawConfig } from './channel-config';
import {
  ensureDingTalkPluginInstalled,
  ensureFeishuPluginInstalled,
  ensureQQBotPluginInstalled,
  ensureWeChatPluginInstalled,
  ensureWeComPluginInstalled,
} from './plugin-install';

const OPENCLAW_EXTENSIONS_DIR = join(homedir(), '.openclaw', 'extensions');

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

interface PluginInstallMeta {
  installPath?: string;
  source?: string;
  sourcePath?: string;
  spec?: string;
}

interface PluginEntryState {
  enabled?: boolean;
  [key: string]: unknown;
}

interface KnownPluginDefinition {
  aliases: string[];
  description: string;
  dirName: string;
  key: string;
  name: string;
  packageName: string;
  pluginId: string;
  supportsMcp: boolean;
}

interface PluginManifestFile {
  description?: string;
  id?: string;
  name?: string;
}

interface PluginPackageFile {
  description?: string;
  name?: string;
  version?: string;
}

const KNOWN_PLUGIN_DEFINITIONS = [
  {
    key: 'dingtalk',
    pluginId: 'dingtalk',
    dirName: 'dingtalk',
    name: 'DingTalk',
    packageName: '@soimy/dingtalk',
    description: 'DingTalk channel plugin for OpenClaw.',
    supportsMcp: false,
    aliases: ['dingtalk', '@soimy/dingtalk'],
  },
  {
    key: 'wecom',
    pluginId: 'wecom',
    dirName: 'wecom',
    name: 'WeCom',
    packageName: '@wecom/wecom',
    description: 'Official WeCom plugin with enterprise workflow integrations.',
    supportsMcp: true,
    aliases: ['wecom', 'wecom-openclaw-plugin', '@wecom/wecom', '@wecom/wecom-openclaw-plugin'],
  },
  {
    key: 'openclaw-lark',
    pluginId: 'openclaw-lark',
    dirName: 'feishu-openclaw-plugin',
    name: 'Feishu / Lark',
    packageName: '@larksuite/openclaw-lark',
    description: 'Feishu / Lark channel plugin with document MCP tools.',
    supportsMcp: true,
    aliases: [
      'feishu',
      'lark',
      'openclaw-lark',
      'feishu-openclaw-plugin',
      '@larksuite/openclaw-lark',
      '@openclaw/feishu',
    ],
  },
  {
    key: 'qqbot',
    pluginId: 'qqbot',
    dirName: 'qqbot',
    name: 'QQ Bot',
    packageName: '@sliverp/qqbot',
    description: 'QQ Bot channel plugin for OpenClaw.',
    supportsMcp: false,
    aliases: ['qqbot', '@sliverp/qqbot'],
  },
  {
    key: 'openclaw-weixin',
    pluginId: 'openclaw-weixin',
    dirName: 'openclaw-weixin',
    name: 'WeChat',
    packageName: '@tencent-weixin/openclaw-weixin',
    description: 'WeChat channel plugin bundled with MimiClaw.',
    supportsMcp: false,
    aliases: ['wechat', 'weixin', 'openclaw-weixin', '@tencent-weixin/openclaw-weixin'],
  },
] as const satisfies KnownPluginDefinition[];

const KNOWN_PLUGIN_BY_ALIAS = new Map(
  KNOWN_PLUGIN_DEFINITIONS.flatMap((definition) =>
    definition.aliases.map((alias) => [normalizePluginKey(alias), definition] as const),
  ),
);

const INSTALLERS: Record<string, () => { installed: boolean; warning?: string }> = {
  dingtalk: ensureDingTalkPluginInstalled,
  wecom: ensureWeComPluginInstalled,
  'openclaw-lark': ensureFeishuPluginInstalled,
  'feishu-openclaw-plugin': ensureFeishuPluginInstalled,
  feishu: ensureFeishuPluginInstalled,
  qqbot: ensureQQBotPluginInstalled,
  'openclaw-weixin': ensureWeChatPluginInstalled,
  wechat: ensureWeChatPluginInstalled,
};

function normalizePluginKey(value: string): string {
  return value.trim().toLowerCase();
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    if (!(await fileExists(filePath))) return null;
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function humanizeName(value: string): string {
  const lastSegment = value.split('/').pop() || value;
  return lastSegment
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function resolveKnownDefinition(values: Array<string | undefined>): KnownPluginDefinition | undefined {
  for (const value of values) {
    if (!value) continue;
    const definition = KNOWN_PLUGIN_BY_ALIAS.get(normalizePluginKey(value));
    if (definition) return definition;
  }
  return undefined;
}

function getInstallEntries(config: Awaited<ReturnType<typeof readOpenClawConfig>>): Record<string, PluginInstallMeta> {
  const installs = config.plugins?.installs;
  if (!installs || typeof installs !== 'object' || Array.isArray(installs)) {
    return {};
  }
  return installs as Record<string, PluginInstallMeta>;
}

function getPluginEntries(config: Awaited<ReturnType<typeof readOpenClawConfig>>): Record<string, PluginEntryState> {
  const entries = config.plugins?.entries;
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
    return {};
  }
  return entries as Record<string, PluginEntryState>;
}

function getLoadPaths(config: Awaited<ReturnType<typeof readOpenClawConfig>>): string[] {
  const rawPaths = config.plugins?.load;
  if (!rawPaths || typeof rawPaths !== 'object' || Array.isArray(rawPaths)) {
    return [];
  }
  const paths = (rawPaths as { paths?: unknown }).paths;
  if (!Array.isArray(paths)) {
    return [];
  }
  return paths.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function isPluginEnabled(
  pluginId: string,
  dirName: string,
  definition: KnownPluginDefinition | undefined,
  allowSet: Set<string>,
  entries: Record<string, PluginEntryState>,
): boolean {
  const candidateKeys = new Set<string>([
    pluginId,
    dirName,
    ...(definition?.aliases ?? []),
  ]);

  let sawConfiguredEntry = false;

  for (const candidateKey of candidateKeys) {
    const normalized = normalizePluginKey(candidateKey);
    const entry = entries[normalized];
    if (entry && typeof entry === 'object') {
      sawConfiguredEntry = true;
      if (entry.enabled === false) {
        return false;
      }
      if (entry.enabled === true) {
        return true;
      }
    }
  }

  for (const candidateKey of candidateKeys) {
    if (allowSet.has(normalizePluginKey(candidateKey))) {
      return true;
    }
  }

  return sawConfiguredEntry;
}

function resolvePluginSource(
  pluginPath: string,
  definition: KnownPluginDefinition | undefined,
  installs: Record<string, PluginInstallMeta>,
  normalizedLoadPaths: Set<string>,
): PluginSource {
  const normalizedPluginPath = resolve(pluginPath);

  for (const install of Object.values(installs)) {
    if (!install || typeof install !== 'object') continue;

    const candidatePaths = [install.installPath, install.sourcePath]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => resolve(value));

    if (!candidatePaths.includes(normalizedPluginPath)) continue;

    if (install.source === 'path') return 'path';
    if (install.source === 'npm') return 'npm';
  }

  if (normalizedLoadPaths.has(normalizedPluginPath)) {
    return 'path';
  }

  return definition ? 'bundled' : 'detected';
}

async function dedupePaths(paths: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of paths) {
    const resolvedPath = resolve(entry);
    const realPath = await realpath(entry).catch(() => resolvedPath);

    if (seen.has(realPath)) continue;
    seen.add(realPath);
    result.push(realPath);
  }

  return result;
}

async function listCandidatePluginPaths(config: Awaited<ReturnType<typeof readOpenClawConfig>>): Promise<string[]> {
  const discoveredPaths: string[] = [];

  try {
    const entries = await readdir(OPENCLAW_EXTENSIONS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      discoveredPaths.push(join(OPENCLAW_EXTENSIONS_DIR, entry.name));
    }
  } catch {
    // Ignore missing extensions directory.
  }

  discoveredPaths.push(...getLoadPaths(config));

  return dedupePaths(discoveredPaths);
}

async function readPluginSummaryFromPath(
  pluginPath: string,
  allowSet: Set<string>,
  entries: Record<string, PluginEntryState>,
  installs: Record<string, PluginInstallMeta>,
  normalizedLoadPaths: Set<string>,
): Promise<PluginSummary | null> {
  const manifest = await readJsonFile<PluginManifestFile>(join(pluginPath, 'openclaw.plugin.json'));
  const pkg = await readJsonFile<PluginPackageFile>(join(pluginPath, 'package.json'));

  if (!manifest && !pkg) {
    return null;
  }

  const dirName = pluginPath.split(/[\\/]/).at(-1) || pluginPath;
  const definition = resolveKnownDefinition([
    manifest?.id,
    manifest?.name,
    pkg?.name,
    dirName,
  ]);
  const pluginId = manifest?.id?.trim() || definition?.pluginId || dirName;
  const name =
    manifest?.name?.trim()
    || definition?.name
    || (pkg?.name?.trim() ? humanizeName(pkg.name) : '')
    || humanizeName(pluginId);
  const description =
    manifest?.description?.trim()
    || pkg?.description?.trim()
    || definition?.description
    || '';

  return {
    key: definition?.key || normalizePluginKey(pluginId),
    pluginId,
    dirName,
    name,
    description,
    version: pkg?.version?.trim() || null,
    installed: true,
    enabled: isPluginEnabled(pluginId, dirName, definition, allowSet, entries),
    installable: Boolean(definition),
    supportsMcp: definition?.supportsMcp ?? false,
    source: resolvePluginSource(pluginPath, definition, installs, normalizedLoadPaths),
    packageName: pkg?.name?.trim(),
    installPath: pluginPath,
  };
}

function createCatalogPlugin(
  definition: KnownPluginDefinition,
  allowSet: Set<string>,
  entries: Record<string, PluginEntryState>,
): PluginSummary {
  return {
    key: definition.key,
    pluginId: definition.pluginId,
    dirName: definition.dirName,
    name: definition.name,
    description: definition.description,
    version: null,
    installed: false,
    enabled: isPluginEnabled(definition.pluginId, definition.dirName, definition, allowSet, entries),
    installable: true,
    supportsMcp: definition.supportsMcp,
    source: 'bundled',
    packageName: definition.packageName,
  };
}

function sortPlugins(plugins: PluginSummary[]): PluginSummary[] {
  return [...plugins].sort((left, right) => {
    if (left.installed !== right.installed) {
      return Number(right.installed) - Number(left.installed);
    }
    if (left.enabled !== right.enabled) {
      return Number(right.enabled) - Number(left.enabled);
    }
    return left.name.localeCompare(right.name);
  });
}

export async function listPluginsSnapshot(): Promise<PluginsSnapshot> {
  const config = await readOpenClawConfig();
  const allowSet = new Set(
    Array.isArray(config.plugins?.allow)
      ? config.plugins.allow
          .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
          .map((entry) => normalizePluginKey(entry))
      : [],
  );
  const entries = Object.fromEntries(
    Object.entries(getPluginEntries(config)).map(([key, value]) => [normalizePluginKey(key), value]),
  );
  const installs = getInstallEntries(config);
  const loadPaths = getLoadPaths(config);
  const normalizedLoadPaths = new Set(loadPaths.map((entry) => resolve(entry)));
  const pluginMap = new Map<string, PluginSummary>();

  const pluginPaths = await listCandidatePluginPaths(config);
  for (const pluginPath of pluginPaths) {
    const summary = await readPluginSummaryFromPath(
      pluginPath,
      allowSet,
      entries,
      installs,
      normalizedLoadPaths,
    );
    if (!summary) continue;
    pluginMap.set(summary.key, summary);
  }

  for (const definition of KNOWN_PLUGIN_DEFINITIONS) {
    if (pluginMap.has(definition.key)) continue;
    pluginMap.set(definition.key, createCatalogPlugin(definition, allowSet, entries));
  }

  const plugins = sortPlugins([...pluginMap.values()]);

  return {
    plugins,
    mcpPlugins: sortPlugins(plugins.filter((plugin) => plugin.supportsMcp)),
    extensionsDir: OPENCLAW_EXTENSIONS_DIR,
  };
}

export async function installPlugin(pluginKey: string): Promise<PluginsSnapshot> {
  const installer = INSTALLERS[normalizePluginKey(pluginKey)];
  if (!installer) {
    throw new Error(`Unsupported plugin: ${pluginKey}`);
  }

  const result = installer();
  if (!result.installed) {
    throw new Error(result.warning || `Failed to install plugin: ${pluginKey}`);
  }

  return listPluginsSnapshot();
}
