#!/usr/bin/env node
/**
 * Browser-Use MCP Server
 *
 * A zero-dependency MCP (Model Context Protocol) server that bridges
 * Claude Code's tool calls to MimiClaw's in-app browser via the Host API.
 *
 * Protocol: JSON-RPC 2.0 over stdin/stdout (MCP standard)
 * Backend:  http://127.0.0.1:{PORT}/api/browser-use/*
 */

import { createInterface } from 'node:readline';
import http from 'node:http';

const HOST_API_PORT = process.env.MIMICLAW_HOST_API_PORT || 3210;
const HOST_API_BASE = `http://127.0.0.1:${HOST_API_PORT}`;

// ─── Host API client ─────────────────────────────────────────────────────────

function hostApiFetch(path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, HOST_API_BASE);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: body ? 'POST' : 'GET',
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'browser_navigate',
    description: 'Navigate the in-app browser to a URL. The browser panel will open automatically in MimiClaw.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_click',
    description: 'Click at a specific position in the browser. Provide either (x, y) coordinates or a CSS selector.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate to click' },
        y: { type: 'number', description: 'Y coordinate to click' },
        selector: { type: 'string', description: 'CSS selector of the element to click (alternative to x/y)' },
      },
    },
  },
  {
    name: 'browser_type',
    description: 'Type text into the currently focused element in the browser.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to type' },
      },
      required: ['text'],
    },
  },
  {
    name: 'browser_scroll',
    description: 'Scroll the browser page.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate of the scroll position (default: 400)', default: 400 },
        y: { type: 'number', description: 'Y coordinate of the scroll position (default: 300)', default: 300 },
        deltaX: { type: 'number', description: 'Horizontal scroll amount (positive = right)', default: 0 },
        deltaY: { type: 'number', description: 'Vertical scroll amount (positive = down)', default: 300 },
      },
    },
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current browser page. Returns a base64-encoded PNG image.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_read_content',
    description: 'Read the text content of the current browser page. Returns the page title, URL, and body text.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_evaluate',
    description: 'Execute JavaScript code in the browser page and return the result.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'JavaScript expression to evaluate' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'browser_go_back',
    description: 'Navigate back in the browser history.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_go_forward',
    description: 'Navigate forward in the browser history.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_close',
    description: 'Close the in-app browser panel.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ─── Tool name → browser-use command mapping ─────────────────────────────────

function mapToolToCommand(toolName, args) {
  const commandId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  switch (toolName) {
    case 'browser_navigate':
      return { commandId, kind: 'navigate', params: { url: args.url } };
    case 'browser_click':
      return { commandId, kind: 'click', params: { x: args.x ?? 0, y: args.y ?? 0, selector: args.selector } };
    case 'browser_type':
      return { commandId, kind: 'type', params: { text: args.text } };
    case 'browser_scroll':
      return { commandId, kind: 'scroll', params: { x: args.x ?? 400, y: args.y ?? 300, deltaX: args.deltaX ?? 0, deltaY: args.deltaY ?? 300 } };
    case 'browser_screenshot':
      return { commandId, kind: 'screenshot', params: {} };
    case 'browser_read_content':
      return { commandId, kind: 'read_content', params: {} };
    case 'browser_evaluate':
      return { commandId, kind: 'evaluate', params: { expression: args.expression } };
    case 'browser_go_back':
      return { commandId, kind: 'go_back', params: {} };
    case 'browser_go_forward':
      return { commandId, kind: 'go_forward', params: {} };
    case 'browser_close':
      return { commandId, kind: 'close', params: {} };
    default:
      return null;
  }
}

// ─── MCP JSON-RPC handler ────────────────────────────────────────────────────

async function handleRequest(method, params, id) {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'browser-use',
          version: '1.0.0',
        },
      };

    case 'notifications/initialized':
      // No response needed for notifications
      return undefined;

    case 'tools/list':
      return { tools: TOOLS };

    case 'tools/call': {
      const { name, arguments: args = {} } = params;
      const command = mapToolToCommand(name, args);

      if (!command) {
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }

      try {
        const result = await hostApiFetch('/api/browser-use/execute', command);

        if (!result.success) {
          return {
            content: [{ type: 'text', text: `Browser action failed: ${result.error || 'Unknown error'}` }],
            isError: true,
          };
        }

        // Special handling for screenshot — return as image
        if (command.kind === 'screenshot' && result.data?.base64) {
          return {
            content: [
              {
                type: 'image',
                data: result.data.base64,
                mimeType: 'image/png',
              },
              {
                type: 'text',
                text: `Screenshot captured (${result.data.width}x${result.data.height})`,
              },
            ],
          };
        }

        // For other commands, return as text
        const text = typeof result.data === 'object'
          ? JSON.stringify(result.data, null, 2)
          : String(result.data ?? 'OK');

        return {
          content: [{ type: 'text', text }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text',
            text: `Failed to communicate with MimiClaw: ${err.message}. Make sure MimiClaw is running.`,
          }],
          isError: true,
        };
      }
    }

    default:
      throw { code: -32601, message: `Method not found: ${method}` };
  }
}

// ─── stdio JSON-RPC transport ────────────────────────────────────────────────

function sendResponse(id, result) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write(msg + '\n');
}

function sendError(id, code, message) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
  process.stdout.write(msg + '\n');
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (line) => {
  if (!line.trim()) return;

  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    sendError(null, -32700, 'Parse error');
    return;
  }

  const { id, method, params } = parsed;

  try {
    const result = await handleRequest(method, params || {}, id);
    // Notifications (no id) don't get a response
    if (id !== undefined && id !== null && result !== undefined) {
      sendResponse(id, result);
    }
  } catch (err) {
    if (id !== undefined && id !== null) {
      sendError(id, err.code || -32603, err.message || 'Internal error');
    }
  }
});

rl.on('close', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
