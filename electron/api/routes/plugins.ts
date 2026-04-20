import type { IncomingMessage, ServerResponse } from 'http';
import { stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { installPlugin, listPluginsSnapshot } from '../../utils/plugins';
import { getAllSettings } from '../../utils/store';

type ConnectPublicMcpBody = {
  serverConfig?: unknown;
  serverName?: unknown;
  workspaceRoot?: unknown;
};

type McpServerConfig = Record<string, unknown>;
type McpConfigFile = Record<string, unknown> & {
  mcpServers?: Record<string, McpServerConfig>;
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

function scheduleGatewayReload(ctx: HostApiContext): void {
  if (ctx.gatewayManager.getStatus().state === 'stopped') return;
  ctx.gatewayManager.debouncedReload();
}

export async function handlePluginRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/plugins' && req.method === 'GET') {
    sendJson(res, 200, { success: true, ...(await listPluginsSnapshot()) });
    return true;
  }

  if (url.pathname === '/api/plugins/install' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ key: string }>(req);
      const snapshot = await installPlugin(body.key);
      scheduleGatewayReload(ctx);
      sendJson(res, 200, { success: true, ...snapshot });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

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

      const nextConfig: McpConfigFile = {
        ...existingConfig,
        mcpServers: {
          ...existingServers,
          [body.serverName]: body.serverConfig,
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

  return false;
}
