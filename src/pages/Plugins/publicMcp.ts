type McpServerConfig = Record<string, unknown>;

export type PublicMcpId = 'figma' | 'pencil';

export interface ParsedMcpServer {
  serverConfig: McpServerConfig;
  serverName: string;
}

type ClipboardBasedPublicMcpOption = {
  id: PublicMcpId;
  serverName: string;
  setupMode: 'clipboard';
  template: string;
};

type TemplateBasedPublicMcpOption = {
  id: PublicMcpId;
  serverConfig: McpServerConfig;
  serverName: string;
  setupMode: 'template';
  template: string;
};

export type PublicMcpOption = ClipboardBasedPublicMcpOption | TemplateBasedPublicMcpOption;

const FIGMA_MCP_CONFIG = {
  type: 'http',
  url: 'http://127.0.0.1:3845/mcp',
} satisfies McpServerConfig;

const PENCIL_MCP_TEMPLATE = `{
  "mcpServers": {
    "pencil": {
      "command": "REPLACE_WITH_PENCIL_COMMAND",
      "args": [
        "REPLACE_WITH_PENCIL_ARGS"
      ]
    }
  }
}`;

function buildMcpTemplate(serverName: string, serverConfig: McpServerConfig): string {
  return JSON.stringify(
    {
      mcpServers: {
        [serverName]: serverConfig,
      },
    },
    null,
    2,
  );
}

export const PUBLIC_MCP_OPTIONS = [
  {
    id: 'figma',
    serverName: 'figma-desktop',
    serverConfig: FIGMA_MCP_CONFIG,
    setupMode: 'template',
    template: buildMcpTemplate('figma-desktop', FIGMA_MCP_CONFIG),
  },
  {
    id: 'pencil',
    serverName: 'pencil',
    setupMode: 'clipboard',
    template: PENCIL_MCP_TEMPLATE,
  },
] as const satisfies ReadonlyArray<PublicMcpOption>;

export const PUBLIC_MCP_SERVER_NAMES = PUBLIC_MCP_OPTIONS.map(({ serverName }) => serverName);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseClipboardMcpServer(rawText: string, preferredServerName: string): ParsedMcpServer | null {
  if (!rawText.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;

  const mcpServers = isRecord(parsed.mcpServers) ? parsed.mcpServers : null;
  if (mcpServers) {
    const preferred = mcpServers[preferredServerName];
    if (isRecord(preferred)) {
      return { serverName: preferredServerName, serverConfig: preferred };
    }
    for (const [name, config] of Object.entries(mcpServers)) {
      if (isRecord(config)) {
        return { serverName: String(name), serverConfig: config };
      }
    }
  }

  if (isRecord(parsed[preferredServerName])) {
    return {
      serverName: preferredServerName,
      serverConfig: parsed[preferredServerName] as Record<string, unknown>,
    };
  }

  if (typeof parsed.command === 'string' || typeof parsed.url === 'string') {
    return {
      serverName: preferredServerName,
      serverConfig: parsed,
    };
  }

  return null;
}

export function resolvePublicMcpServer(option: PublicMcpOption, rawClipboardText: string): ParsedMcpServer | null {
  if (option.setupMode === 'template') {
    return {
      serverName: option.serverName,
      serverConfig: option.serverConfig,
    };
  }

  return parseClipboardMcpServer(rawClipboardText, option.serverName);
}
