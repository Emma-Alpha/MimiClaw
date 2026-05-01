/**
 * Reasoning Gateway — a local HTTP proxy for OpenAI-compatible models that:
 *
 * 1. Converts Anthropic-format requests (/v1/messages) to OpenAI format
 *    (/v1/chat/completions) and injects `reasoning_effort`.
 * 2. Converts OpenAI SSE responses back to Anthropic SSE format, mapping
 *    `reasoning_content` → `thinking` content blocks so the CLI/UI can
 *    display the model's reasoning process.
 * 3. Uses proxyAwareFetch() to honor user proxy settings.
 *
 * For non-OpenAI models (Claude, etc.), requests pass through unchanged.
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { proxyAwareFetch } from '../utils/proxy-fetch';
import { logger } from '../utils/logger';

// ── Model detection ──────────────────────────────────────────────────────

const OPENAI_MODEL_RE = /^(gpt-|o[134]-|o[134]$|chatgpt-)/i;

export function isOpenAIModel(model: string): boolean {
  return OPENAI_MODEL_RE.test(model);
}

/** Map Claude thinking mode → OpenAI reasoning_effort */
export function mapThinkingToReasoningEffort(
  thinking?: string,
): string | undefined {
  if (!thinking || thinking === 'disabled') return undefined;
  if (thinking === 'adaptive') return 'medium';
  return 'high'; // 'enabled' → 'high'
}

// ── Gateway server ───────────────────────────────────────────────────────

export interface ReasoningGatewayOptions {
  targetBaseUrl: string;
  reasoningEffort: string;
}

export interface ReasoningGateway {
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startReasoningGateway(
  opts: ReasoningGatewayOptions,
): Promise<ReasoningGateway> {
  const { targetBaseUrl, reasoningEffort } = opts;

  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    res.on('error', (e) => logger.error(`[reasoning-gateway] res error on ${req.method} ${req.url}: ${e.message}`));
    req.on('error', (e) => logger.error(`[reasoning-gateway] req error on ${req.method} ${req.url}: ${e.message}`));
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      void handleRequest(req, res, Buffer.concat(chunks), targetBaseUrl, reasoningEffort);
    });
  });
  server.on('clientError', (err, socket) => {
    logger.error(`[reasoning-gateway] clientError: ${err.message}`);
    try { socket.destroy(); } catch { /* ignore */ }
  });

  return new Promise<ReasoningGateway>((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Failed to bind gateway server'));
        return;
      }
      const baseUrl = `http://127.0.0.1:${addr.port}`;
      logger.info(`[reasoning-gateway] listening on ${baseUrl} → ${targetBaseUrl} (effort=${reasoningEffort})`);
      resolve({
        baseUrl,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────

const HOP_BY_HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'proxy-connection', 'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

function buildTargetUrl(reqPath: string, targetBaseUrl: string): string {
  const base = new URL(targetBaseUrl);
  const basePath = base.pathname.replace(/\/+$/, '');
  const incoming = reqPath || '/';
  if (basePath && incoming.startsWith(basePath)) {
    return `${base.origin}${incoming}`;
  }
  return `${base.origin}${basePath}${incoming}`;
}

function copyHeaders(req: IncomingMessage): Record<string, string> {
  const fwd: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (key === 'host' || key === 'content-length') continue;
    if (HOP_BY_HOP_HEADERS.has(key)) continue;
    fwd[key] = Array.isArray(value) ? value.join(', ') : value;
  }
  return fwd;
}

// ── Anthropic → OpenAI request conversion ────────────────────────────────

interface AnthropicRequestBody {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  system?: string;
  max_tokens?: number;
  stream?: boolean;
  [key: string]: unknown;
}

function convertAnthropicToOpenAI(
  body: AnthropicRequestBody,
  reasoningEffort: string,
): Record<string, unknown> {
  const openaiMessages: Array<{ role: string; content: string }> = [];

  // System prompt → system message
  if (body.system) {
    openaiMessages.push({ role: 'system', content: body.system });
  }

  // Convert each message
  for (const msg of body.messages || []) {
    const role = msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user';
    let content = '';
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Extract text from content blocks
      content = (msg.content as Array<Record<string, unknown>>)
        .map((b) => {
          if (b.type === 'text' && typeof b.text === 'string') return b.text;
          if (b.type === 'thinking' && typeof b.thinking === 'string') return b.thinking;
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    openaiMessages.push({ role, content });
  }

  return {
    model: body.model,
    messages: openaiMessages,
    max_tokens: body.max_tokens || 8192,
    stream: true,
    stream_options: { include_usage: true },
    reasoning_effort: reasoningEffort,
  };
}

// ── OpenAI SSE → Anthropic SSE response conversion ──────────────────────

/**
 * Converts an OpenAI streaming response to Anthropic streaming format.
 * Maps `reasoning_content` delta → thinking content blocks.
 */
async function streamOpenAIToAnthropic(
  upstream: Response,
  res: ServerResponse,
  model: string,
): Promise<void> {
  // Write Anthropic SSE headers
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    'connection': 'keep-alive',
  });

  // Anthropic SSE requires both `event:` and `data:` lines
  const sendSSE = (data: Record<string, unknown>) => {
    const eventType = data.type as string;
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Emit message_start
  const msgId = `msg_gw_${Date.now().toString(36)}`;
  sendSSE({
    type: 'message_start',
    message: {
      id: msgId,
      type: 'message',
      role: 'assistant',
      model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  });

  // State tracking
  let blockIndex = 0;
  let inThinking = false;
  let thinkingStarted = false;
  let textStarted = false;
  let inputTokens = 0;
  let outputTokens = 0;

  // Read the upstream SSE stream
  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let sseBuffer = '';

  let chunkCount = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const rawChunk = decoder.decode(value, { stream: true });
      sseBuffer += rawChunk;
      if (chunkCount === 0) {
        logger.info(`[reasoning-gateway] first upstream chunk (${rawChunk.length} bytes): ${rawChunk.substring(0, 300)}`);
      }
      chunkCount++;

      // Process complete SSE lines
      while (true) {
        const lineEnd = sseBuffer.indexOf('\n');
        if (lineEnd === -1) break;
        const line = sseBuffer.slice(0, lineEnd).trim();
        sseBuffer = sseBuffer.slice(lineEnd + 1);

        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;

        let chunk: Record<string, unknown>;
        try {
          chunk = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          logger.warn(`[reasoning-gateway] failed to parse SSE payload: ${payload.substring(0, 200)}`);
          continue;
        }

        const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
        if (!choices || choices.length === 0) {
          // May contain usage info at the end
          const usage = chunk.usage as Record<string, number> | undefined;
          if (usage) {
            inputTokens = usage.prompt_tokens || inputTokens;
            outputTokens = usage.completion_tokens || outputTokens;
          }
          continue;
        }

        const choice = choices[0];
        const delta = choice.delta as Record<string, unknown> | undefined;
        const finishReason = choice.finish_reason as string | null;

        if (delta) {
          const reasoningContent = delta.reasoning_content as string | undefined;
          const textContent = delta.content as string | undefined;

          // Handle reasoning_content → thinking block
          if (reasoningContent) {
            if (!thinkingStarted) {
              thinkingStarted = true;
              inThinking = true;
              sendSSE({
                type: 'content_block_start',
                index: blockIndex,
                content_block: { type: 'thinking', thinking: '' },
              });
            }
            sendSSE({
              type: 'content_block_delta',
              index: blockIndex,
              delta: { type: 'thinking_delta', thinking: reasoningContent },
            });
          }

          // Handle content → text block
          if (textContent) {
            // Close thinking block first if open
            if (inThinking) {
              sendSSE({ type: 'content_block_stop', index: blockIndex });
              blockIndex++;
              inThinking = false;
            }
            if (!textStarted) {
              textStarted = true;
              sendSSE({
                type: 'content_block_start',
                index: blockIndex,
                content_block: { type: 'text', text: '' },
              });
            }
            sendSSE({
              type: 'content_block_delta',
              index: blockIndex,
              delta: { type: 'text_delta', text: textContent },
            });
          }
        }

        // Handle finish
        if (finishReason) {
          const usage = choice.usage as Record<string, number> | undefined;
          if (usage) {
            inputTokens = usage.prompt_tokens || inputTokens;
            outputTokens = usage.completion_tokens || outputTokens;
          }
        }
      }
    }
  } catch (err) {
    logger.error(`[reasoning-gateway] stream read error: ${err instanceof Error ? err.message : String(err)}`);
  }

  logger.info(`[reasoning-gateway] stream done: ${chunkCount} chunks, thinkingStarted=${thinkingStarted}, textStarted=${textStarted}`);

  // Close any open block
  if (inThinking || textStarted) {
    sendSSE({ type: 'content_block_stop', index: blockIndex });
  }

  // Emit message_delta + message_stop
  sendSSE({
    type: 'message_delta',
    delta: { stop_reason: 'end_turn', stop_sequence: null },
    usage: { output_tokens: outputTokens },
  });
  sendSSE({ type: 'message_stop' });

  res.end();
}

// ── Main request handler ─────────────────────────────────────────────────

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  rawBody: Buffer,
  targetBaseUrl: string,
  reasoningEffort: string,
): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const reqPath = req.url || '/';
  const remote = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
  logger.info(`[reasoning-gateway] incoming ${method} ${reqPath} from ${remote} (bodyBytes=${rawBody.length})`);

  // Check if this is an Anthropic messages request with an OpenAI model
  const isMessagesEndpoint = /^\/v1\/messages/.test(reqPath);
  let body: Record<string, unknown> | null = null;

  if (hasBody) {
    try {
      body = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    } catch { /* not JSON */ }
  }

  const reqModel = typeof body?.model === 'string' ? body.model : '';
  const needsConversion = isMessagesEndpoint && isOpenAIModel(reqModel) && hasBody && body;

  if (needsConversion) {
    // ── Protocol conversion: Anthropic → OpenAI ──
    const openaiBody = convertAnthropicToOpenAI(body as AnthropicRequestBody, reasoningEffort);
    const openaiBodyStr = JSON.stringify(openaiBody);

    // Rewrite path: /v1/messages?... → /v1/chat/completions
    const targetUrl = buildTargetUrl('/v1/chat/completions', targetBaseUrl);

    const fwdHeaders = copyHeaders(req);
    fwdHeaders['content-type'] = 'application/json';
    fwdHeaders['content-length'] = Buffer.byteLength(openaiBodyStr).toString();
    // Convert Anthropic auth (x-api-key) → OpenAI auth (Authorization: Bearer)
    const apiKey = req.headers['x-api-key'];
    if (apiKey && !fwdHeaders['authorization']) {
      fwdHeaders['authorization'] = `Bearer ${Array.isArray(apiKey) ? apiKey[0] : apiKey}`;
    }
    // Remove Anthropic-specific headers
    delete fwdHeaders['anthropic-version'];
    delete fwdHeaders['x-api-key'];

    logger.info(`[reasoning-gateway] CONVERT ${reqModel}: /v1/messages → ${targetUrl} (effort=${reasoningEffort})`);

    try {
      const upstream = await proxyAwareFetch(targetUrl, {
        method: 'POST',
        headers: fwdHeaders,
        body: openaiBodyStr,
      });

      if (!upstream.ok) {
        // Forward error as-is
        const errText = await upstream.text();
        logger.error(`[reasoning-gateway] upstream error ${upstream.status}: ${errText.substring(0, 200)}`);
        res.writeHead(upstream.status, { 'content-type': 'application/json' });
        res.end(errText);
        return;
      }

      // Convert OpenAI SSE → Anthropic SSE
      await streamOpenAIToAnthropic(upstream, res, reqModel);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[reasoning-gateway] forward error: ${message}`);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end(`Gateway error: ${message}`);
    }
    return;
  }

  // ── Passthrough: non-OpenAI models or non-messages endpoints ──
  let bodyStr = rawBody.toString();

  const targetUrl = buildTargetUrl(reqPath, targetBaseUrl);
  const fwdHeaders = copyHeaders(req);
  if (hasBody) {
    fwdHeaders['content-length'] = Buffer.byteLength(bodyStr).toString();
  }

  logger.info(`[reasoning-gateway] PASSTHROUGH ${method} ${reqPath} → ${targetUrl}`);

  try {
    const upstream = await proxyAwareFetch(targetUrl, {
      method,
      headers: fwdHeaders,
      body: hasBody ? bodyStr : undefined,
    });

    const resHeaders: Record<string, string> = {};
    upstream.headers.forEach((v, k) => { resHeaders[k] = v; });
    res.writeHead(upstream.status, resHeaders);

    if (upstream.body) {
      logger.info(`[reasoning-gateway] passthrough body=stream status=${upstream.status}`);
      const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      const text = await upstream.text();
      logger.info(`[reasoning-gateway] passthrough body=null status=${upstream.status} bytes=${text.length}`);
      res.end(text);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[reasoning-gateway] forward error: ${message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end(`Gateway error: ${message}`);
  }
}
