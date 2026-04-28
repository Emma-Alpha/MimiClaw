import type { IncomingMessage, ServerResponse } from 'http';
import { app } from 'electron';
import { stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { getAllSettings } from '../../utils/store';
import {
  addMarketplaceSource,
  getEnabledPlugins,
  getMarketplaceSources,
  removeMarketplaceSource,
  removePlugin,
  setPluginEnabled,
} from '../../utils/claude-plugin-settings';
import { proxyAwareFetch } from '../../utils/proxy-fetch';

// ---------------------------------------------------------------------------
// Public-MCP helpers (kept as-is)
// ---------------------------------------------------------------------------

type ConnectPublicMcpBody = {
  serverConfig?: unknown;
  serverName?: unknown;
  workspaceRoot?: unknown;
};

type PublicMcpStatusBody = {
  serverNames?: unknown;
  workspaceRoot?: unknown;
};

type McpServerConfig = Record<string, unknown>;
type McpConfigFile = Record<string, unknown> & {
  mcpServers?: Record<string, McpServerConfig>;
};

type PublicMcpConnectionSnapshot = {
  fileExists: boolean;
  filePath: string;
  statuses: Record<string, boolean>;
  workspaceResolved: boolean;
  workspaceRoot: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function pathIsDirectory(pathLike: string): Promise<boolean> {
  try {
    const directoryStat = await stat(pathLike);
    return directoryStat.isDirectory();
  } catch {
    return false;
  }
}

async function pathIsFile(pathLike: string): Promise<boolean> {
  try {
    const fileStat = await stat(pathLike);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

function normalizeWorkspaceRootCandidate(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Replace __RESOURCES_PATH__ placeholder in MCP server config with the actual
 * resources path. In development this is the project root `resources/` dir;
 * in production it is `process.resourcesPath/resources/`.
 */
function resolveResourcesPlaceholder(config: McpServerConfig): McpServerConfig {
  const resourcesDir = app.isPackaged
    ? join(process.resourcesPath, 'resources')
    : join(__dirname, '../../../resources');

  const replacePlaceholder = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return value.replaceAll('__RESOURCES_PATH__', resourcesDir);
    }
    if (Array.isArray(value)) {
      return value.map(replacePlaceholder);
    }
    if (isRecord(value)) {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = replacePlaceholder(v);
      }
      return result;
    }
    return value;
  };

  return replacePlaceholder(config) as McpServerConfig;
}

function resolveWorkspaceRoot(
  requestedWorkspaceRoot: string,
  settings: Awaited<ReturnType<typeof getAllSettings>>,
): string {
  const workspaceRoots = Array.isArray(settings.sidebarThreadWorkspaces)
    ? settings.sidebarThreadWorkspaces
        .map((workspace) => workspace.rootPath.trim())
        .filter((rootPath) => rootPath.length > 0)
    : [];

  const requestedResolved = requestedWorkspaceRoot ? resolve(requestedWorkspaceRoot) : '';

  if (requestedResolved) {
    return requestedResolved;
  }

  if (workspaceRoots.length === 0) {
    throw new Error('No thread workspace found. Please open a thread workspace first.');
  }

  const preferredWorkspace = [...settings.sidebarThreadWorkspaces]
    .filter((workspace) => typeof workspace.rootPath === 'string' && workspace.rootPath.trim().length > 0)
    .sort((left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0))[0];

  const fallbackWorkspaceRoot = preferredWorkspace?.rootPath?.trim() || workspaceRoots[0];
  return resolve(fallbackWorkspaceRoot);
}

async function readMcpConfig(filePath: string): Promise<McpConfigFile> {
  const fs = await import('node:fs/promises');
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      throw new Error('existing .mcp.json is not a JSON object');
    }
    return parsed as McpConfigFile;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOENT')) {
      return {};
    }
    throw error;
  }
}

async function writeMcpConfig(filePath: string, config: McpConfigFile): Promise<void> {
  const fs = await import('node:fs/promises');
  await fs.writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function normalizeConnectBody(body: ConnectPublicMcpBody): {
  serverConfig: McpServerConfig;
  serverName: string;
  workspaceRoot: string;
} {
  const serverName = typeof body.serverName === 'string' ? body.serverName.trim() : '';
  if (!serverName) {
    throw new Error('serverName is required');
  }

  if (!isRecord(body.serverConfig)) {
    throw new Error('serverConfig must be a JSON object');
  }

  const workspaceRoot = normalizeWorkspaceRootCandidate(body.workspaceRoot);
  return {
    serverConfig: body.serverConfig as McpServerConfig,
    serverName,
    workspaceRoot,
  };
}

function normalizeStatusBody(body: PublicMcpStatusBody): {
  serverNames: string[];
  workspaceRoot: string;
} {
  const serverNames = Array.isArray(body.serverNames)
    ? body.serverNames
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : [];

  if (serverNames.length === 0) {
    throw new Error('serverNames is required');
  }

  return {
    serverNames,
    workspaceRoot: normalizeWorkspaceRootCandidate(body.workspaceRoot),
  };
}

function createEmptyPublicMcpConnectionSnapshot(serverNames: string[]): PublicMcpConnectionSnapshot {
  return {
    fileExists: false,
    filePath: '',
    statuses: Object.fromEntries(serverNames.map((serverName) => [serverName, false])),
    workspaceResolved: false,
    workspaceRoot: '',
  };
}

async function readPublicMcpConnectionSnapshot(
  body: ReturnType<typeof normalizeStatusBody>,
  settings: Awaited<ReturnType<typeof getAllSettings>>,
): Promise<PublicMcpConnectionSnapshot> {
  let workspaceRoot = '';

  try {
    workspaceRoot = resolveWorkspaceRoot(body.workspaceRoot, settings);
  } catch {
    return createEmptyPublicMcpConnectionSnapshot(body.serverNames);
  }

  if (!(await pathIsDirectory(workspaceRoot))) {
    return createEmptyPublicMcpConnectionSnapshot(body.serverNames);
  }

  const mcpConfigPath = join(workspaceRoot, '.mcp.json');
  const fileExists = await pathIsFile(mcpConfigPath);
  const config = await readMcpConfig(mcpConfigPath);
  const existingServers = isRecord(config.mcpServers)
    ? config.mcpServers as Record<string, McpServerConfig>
    : {};

  return {
    fileExists,
    filePath: mcpConfigPath,
    statuses: Object.fromEntries(
      body.serverNames.map((serverName) => [serverName, isRecord(existingServers[serverName])]),
    ),
    workspaceResolved: true,
    workspaceRoot,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function handlePluginRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  // -----------------------------------------------------------------------
  // Claude Code plugin management
  // -----------------------------------------------------------------------

  // GET /api/plugins/claude/installed — list enabled plugins
  if (url.pathname === '/api/plugins/claude/installed' && req.method === 'GET') {
    try {
      const enabledPlugins = await getEnabledPlugins();
      sendJson(res, 200, { success: true, enabledPlugins });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // PUT /api/plugins/claude/toggle — enable or disable a plugin
  if (url.pathname === '/api/plugins/claude/toggle' && req.method === 'PUT') {
    try {
      const body = await parseJsonBody<{ key?: string; enabled?: boolean }>(req);
      const key = typeof body.key === 'string' ? body.key.trim() : '';
      if (!key) throw new Error('key is required');
      const enabled = body.enabled !== false;
      const enabledPlugins = await setPluginEnabled(key, enabled);
      sendJson(res, 200, { success: true, enabledPlugins });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // DELETE /api/plugins/claude/uninstall — remove a plugin entry
  if (url.pathname === '/api/plugins/claude/uninstall' && req.method === 'DELETE') {
    try {
      const body = await parseJsonBody<{ key?: string }>(req);
      const key = typeof body.key === 'string' ? body.key.trim() : '';
      if (!key) throw new Error('key is required');
      const enabledPlugins = await removePlugin(key);
      sendJson(res, 200, { success: true, enabledPlugins });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // GET /api/plugins/claude/marketplaces — list marketplace sources
  if (url.pathname === '/api/plugins/claude/marketplaces' && req.method === 'GET') {
    try {
      const marketplaces = await getMarketplaceSources();
      sendJson(res, 200, { success: true, marketplaces });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/plugins/claude/marketplaces — add a marketplace source
  if (url.pathname === '/api/plugins/claude/marketplaces' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        name?: string;
        source?: unknown;
        catalogUrl?: string;
      }>(req);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) throw new Error('name is required');
      if (!isRecord(body.source)) throw new Error('source must be a JSON object');
      const marketplaces = await addMarketplaceSource(name, {
        source: body.source as { source: 'github' | 'git' | 'url' | 'local'; repo?: string; url?: string; path?: string },
        catalogUrl: typeof body.catalogUrl === 'string' ? body.catalogUrl.trim() : undefined,
      });
      sendJson(res, 200, { success: true, marketplaces });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // DELETE /api/plugins/claude/marketplaces — remove a marketplace source
  if (url.pathname === '/api/plugins/claude/marketplaces' && req.method === 'DELETE') {
    try {
      const body = await parseJsonBody<{ name?: string }>(req);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) throw new Error('name is required');
      const marketplaces = await removeMarketplaceSource(name);
      sendJson(res, 200, { success: true, marketplaces });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/plugins/claude/catalog — fetch a marketplace catalog from a remote URL
  if (url.pathname === '/api/plugins/claude/catalog' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ catalogUrl?: string }>(req);
      const catalogUrl = typeof body.catalogUrl === 'string' ? body.catalogUrl.trim() : '';
      if (!catalogUrl) throw new Error('catalogUrl is required');

      const response = await proxyAwareFetch(catalogUrl, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch catalog: ${response.status} ${response.statusText}`);
      }
      const catalog: unknown = await response.json();
      if (!isRecord(catalog)) {
        throw new Error('Catalog response is not a valid JSON object');
      }
      sendJson(res, 200, { success: true, catalog });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // -----------------------------------------------------------------------
  // Public MCP routes (preserved)
  // -----------------------------------------------------------------------

  if (url.pathname === '/api/plugins/public-mcp/connect' && req.method === 'POST') {
    try {
      const body = normalizeConnectBody(await parseJsonBody<ConnectPublicMcpBody>(req));
      const settings = await getAllSettings();
      const workspaceRoot = resolveWorkspaceRoot(body.workspaceRoot, settings);

      if (!(await pathIsDirectory(workspaceRoot))) {
        throw new Error(`workspaceRoot does not exist or is not a directory: ${workspaceRoot}`);
      }

      const mcpConfigPath = join(workspaceRoot, '.mcp.json');
      const existingConfig = await readMcpConfig(mcpConfigPath);
      const existingServers = isRecord(existingConfig.mcpServers)
        ? existingConfig.mcpServers as Record<string, McpServerConfig>
        : {};
      const existed = Object.prototype.hasOwnProperty.call(existingServers, body.serverName);

      // Resolve __RESOURCES_PATH__ placeholder in MCP server config args
      const resolvedConfig = resolveResourcesPlaceholder(body.serverConfig);

      const nextConfig: McpConfigFile = {
        ...existingConfig,
        mcpServers: {
          ...existingServers,
          [body.serverName]: resolvedConfig,
        },
      };

      await writeMcpConfig(mcpConfigPath, nextConfig);
      sendJson(res, 200, {
        success: true,
        existed,
        filePath: mcpConfigPath,
        serverName: body.serverName,
        workspaceRoot,
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/plugins/public-mcp/disconnect — remove an MCP server from .mcp.json
  if (url.pathname === '/api/plugins/public-mcp/disconnect' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ serverName?: unknown; workspaceRoot?: unknown }>(req);
      const serverName = typeof body.serverName === 'string' ? body.serverName.trim() : '';
      if (!serverName) throw new Error('serverName is required');
      const workspaceRoot = normalizeWorkspaceRootCandidate(body.workspaceRoot);
      const settings = await getAllSettings();
      const resolvedRoot = resolveWorkspaceRoot(workspaceRoot, settings);

      if (!(await pathIsDirectory(resolvedRoot))) {
        throw new Error(`workspaceRoot does not exist or is not a directory: ${resolvedRoot}`);
      }

      const mcpConfigPath = join(resolvedRoot, '.mcp.json');
      const existingConfig = await readMcpConfig(mcpConfigPath);
      const existingServers = isRecord(existingConfig.mcpServers)
        ? { ...existingConfig.mcpServers as Record<string, McpServerConfig> }
        : {};
      const existed = Object.prototype.hasOwnProperty.call(existingServers, serverName);
      delete existingServers[serverName];

      const nextConfig: McpConfigFile = {
        ...existingConfig,
        mcpServers: existingServers,
      };

      await writeMcpConfig(mcpConfigPath, nextConfig);
      sendJson(res, 200, {
        success: true,
        existed,
        filePath: mcpConfigPath,
        serverName,
        workspaceRoot: resolvedRoot,
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/plugins/public-mcp/status' && req.method === 'POST') {
    try {
      const body = normalizeStatusBody(await parseJsonBody<PublicMcpStatusBody>(req));
      const settings = await getAllSettings();
      const snapshot = await readPublicMcpConnectionSnapshot(body, settings);
      sendJson(res, 200, { success: true, ...snapshot });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
