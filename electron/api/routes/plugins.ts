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
import { runPreflight, type RequirementInput } from '../../utils/preflight';

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
    : join(__dirname, '../../resources');

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

/**
 * Register an MCP server globally in `.claude.json`.
 *
 * Writes the server config into the top-level `mcpServers` field so it is
 * available to ALL projects, not just a single workspace root.
 */
async function registerMcpServerInCliSettings(
  serverName: string,
  serverConfig: McpServerConfig,
): Promise<void> {
  const { readFile, writeFile } = await import('node:fs/promises');
  const { getClaudeCodeConfigDir } = await import('../../utils/paths');
  const claudeJsonPath = join(getClaudeCodeConfigDir(), '.claude.json');

  let claudeJson: Record<string, unknown> = {};
  try {
    const raw = await readFile(claudeJsonPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed)) claudeJson = parsed;
  } catch { /* file may not exist yet */ }

  const mcpServers = (isRecord(claudeJson.mcpServers) ? { ...claudeJson.mcpServers } : {}) as Record<string, McpServerConfig>;
  mcpServers[serverName] = serverConfig;
  claudeJson.mcpServers = mcpServers;

  await writeFile(claudeJsonPath, `${JSON.stringify(claudeJson, null, 2)}\n`, 'utf8');
  console.log(`[plugins] MCP server "${serverName}" registered globally in .claude.json`);
}

/** Remove an MCP server from the global config in `.claude.json`. */
async function unregisterMcpServerFromCliSettings(
  serverName: string,
): Promise<void> {
  const { readFile, writeFile } = await import('node:fs/promises');
  const { getClaudeCodeConfigDir } = await import('../../utils/paths');
  const claudeJsonPath = join(getClaudeCodeConfigDir(), '.claude.json');

  let claudeJson: Record<string, unknown> = {};
  try {
    const raw = await readFile(claudeJsonPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed)) claudeJson = parsed;
  } catch { return; }

  if (!isRecord(claudeJson.mcpServers)) return;

  const mcpServers = { ...claudeJson.mcpServers as Record<string, unknown> };
  delete mcpServers[serverName];
  claudeJson.mcpServers = mcpServers;

  await writeFile(claudeJsonPath, `${JSON.stringify(claudeJson, null, 2)}\n`, 'utf8');
  console.log(`[plugins] MCP server "${serverName}" unregistered globally from .claude.json`);
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

/**
 * Read globally registered MCP servers from `.claude.json`.
 * This is the sole source of truth for MCP server registrations.
 */
async function readRegisteredMcpServers(): Promise<Record<string, McpServerConfig>> {
  const { readFile } = await import('node:fs/promises');
  const { getClaudeCodeConfigDir } = await import('../../utils/paths');
  const claudeJsonPath = join(getClaudeCodeConfigDir(), '.claude.json');

  try {
    const raw = await readFile(claudeJsonPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    if (!isRecord(parsed.mcpServers)) return {};
    return parsed.mcpServers as Record<string, McpServerConfig>;
  } catch {
    return {};
  }
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
  let workspaceRoot: string;

  try {
    workspaceRoot = resolveWorkspaceRoot(body.workspaceRoot, settings);
  } catch {
    return createEmptyPublicMcpConnectionSnapshot(body.serverNames);
  }

  if (!(await pathIsDirectory(workspaceRoot))) {
    return createEmptyPublicMcpConnectionSnapshot(body.serverNames);
  }

  // Read MCP server registrations from .claude.json (the sole source of truth)
  const registeredServers = await readRegisteredMcpServers();

  return {
    fileExists: Object.keys(registeredServers).length > 0,
    filePath: '',
    statuses: Object.fromEntries(
      body.serverNames.map((serverName) => [serverName, isRecord(registeredServers[serverName])]),
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

      // Resolve __RESOURCES_PATH__ placeholder in MCP server config args
      const resolvedConfig = resolveResourcesPlaceholder(body.serverConfig);

      // Check if server already exists in .claude.json
      const existingServers = await readRegisteredMcpServers();
      const existed = Object.prototype.hasOwnProperty.call(existingServers, body.serverName);

      // Register the MCP server in .claude.json — the sole source of truth.
      // This pre-approves the server so the non-interactive sidecar can use it.
      await registerMcpServerInCliSettings(body.serverName, resolvedConfig);

      sendJson(res, 200, {
        success: true,
        existed,
        serverName: body.serverName,
        workspaceRoot,
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/plugins/public-mcp/disconnect — remove an MCP server from .claude.json
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

      // Check if server existed before removal
      const existingServers = await readRegisteredMcpServers();
      const existed = Object.prototype.hasOwnProperty.call(existingServers, serverName);

      // Remove the MCP server from .claude.json
      await unregisterMcpServerFromCliSettings(serverName);

      sendJson(res, 200, {
        success: true,
        existed,
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

  // POST /api/plugins/preflight — check runtime dependencies for a plugin
  if (url.pathname === '/api/plugins/preflight' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ requirements?: unknown }>(req);
      const requirements = sanitizeRequirements(body.requirements);
      const result = await runPreflight(requirements);
      sendJson(res, 200, { success: true, ...result });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}

function sanitizeRequirements(raw: unknown): RequirementInput[] {
  if (!Array.isArray(raw)) return [];
  const out: RequirementInput[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) continue;
    const req: RequirementInput = { name };
    if (typeof item.minVersion === 'string' && item.minVersion.trim()) {
      req.minVersion = item.minVersion.trim();
    }
    if (typeof item.label === 'string' && item.label.trim()) {
      req.label = item.label.trim();
    }
    if (isRecord(item.installCommand)) {
      const ic = item.installCommand as Record<string, unknown>;
      req.installCommand = {
        ...(typeof ic.darwin === 'string' ? { darwin: ic.darwin } : {}),
        ...(typeof ic.win32 === 'string' ? { win32: ic.win32 } : {}),
        ...(typeof ic.linux === 'string' ? { linux: ic.linux } : {}),
      };
    }
    out.push(req);
  }
  return out;
}
