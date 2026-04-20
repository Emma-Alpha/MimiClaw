import { describe, expect, it } from 'vitest';

import {
  PUBLIC_MCP_OPTIONS,
  parseClipboardMcpServer,
  resolvePublicMcpServer,
} from '@/pages/Plugins/publicMcp';

describe('publicMcp helpers', () => {
  it('uses the built-in Figma remote config without clipboard input', () => {
    const figmaOption = PUBLIC_MCP_OPTIONS.find(({ id }) => id === 'figma');

    expect(figmaOption).toBeDefined();
    expect(resolvePublicMcpServer(figmaOption!, '')).toEqual({
      serverConfig: {
        type: 'http',
        url: 'https://mcp.figma.com/mcp',
      },
      serverName: 'figma',
    });
  });

  it('parses clipboard mcpServers config for clipboard-based public MCP entries', () => {
    const pencilOption = PUBLIC_MCP_OPTIONS.find(({ id }) => id === 'pencil');
    const clipboardText = JSON.stringify({
      mcpServers: {
        pencil: {
          args: ['server.js'],
          command: 'node',
        },
      },
    });

    expect(pencilOption).toBeDefined();
    expect(resolvePublicMcpServer(pencilOption!, clipboardText)).toEqual({
      serverConfig: {
        args: ['server.js'],
        command: 'node',
      },
      serverName: 'pencil',
    });
  });

  it('returns null when clipboard content is not a valid MCP config payload', () => {
    expect(parseClipboardMcpServer('not json', 'pencil')).toBeNull();
    expect(parseClipboardMcpServer(JSON.stringify({ foo: 'bar' }), 'pencil')).toBeNull();
  });
});
