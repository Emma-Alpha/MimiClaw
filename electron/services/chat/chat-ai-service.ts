/**
 * Direct AI API calling service for the Electron main process.
 * Replaces the OpenClaw Gateway for chat operations.
 */

import type { BrowserWindow } from 'electron';
import type { ProviderProtocol } from '../../shared/providers/types';
import { getProviderConfig } from '../../utils/provider-registry';
import { getProviderSecret } from '../secrets/secret-store';
import {
  getDefaultProviderAccountId,
  getProviderAccount,
} from '../providers/provider-store';
import { proxyAwareFetch } from '../../utils/proxy-fetch';
import { formatMessagesForProvider } from './message-formatter';
import {
  parseSSEStream,
  parseOpenAIChunk,
  parseAnthropicEvent,
  type OpenAIDelta,
} from './sse-parser';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ChatStreamEvent {
  state: 'started' | 'delta' | 'final' | 'error' | 'aborted';
  runId: string;
  sessionKey: string;
  message?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  model?: string;
  provider?: string;
  elapsed?: number;
  performance?: { ttft?: number; tps?: number };
  errorMessage?: string;
}

export interface ChatSendParams {
  sessionKey: string;
  messages: Array<{ role: string; content: unknown; toolCallId?: string; toolName?: string }>;
  model?: string;
  providerId?: string;
  thinkingLevel?: string;
  maxTokens?: number;
}

/**
 * Map ThinkingLevel ('none'|'low'|'medium'|'high') to OpenAI reasoning_effort.
 * Returns undefined when reasoning should not be requested.
 * OpenAI supports: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
 */
function mapThinkingToReasoningEffort(thinkingLevel?: string): string | undefined {
  if (!thinkingLevel || thinkingLevel === 'none') return undefined;
  if (thinkingLevel === 'low') return 'low';
  if (thinkingLevel === 'medium') return 'medium';
  return 'high'; // 'high' or any other value → 'high'
}

// ── Service ─────────────────────────────────────────────────────────────────

export class ChatAiService {
  private activeControllers = new Map<string, AbortController>();
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  private emit(event: ChatStreamEvent): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('chat:stream-event', event);
    }
  }

  async send(params: ChatSendParams): Promise<{ runId: string }> {
    const runId = crypto.randomUUID();
    const { sessionKey } = params;

    // Resolve provider account
    const accountId = params.providerId || await getDefaultProviderAccountId();
    if (!accountId) {
      this.emit({
        state: 'error',
        runId,
        sessionKey,
        errorMessage: 'No provider configured. Please add a provider in Settings.',
      });
      return { runId };
    }

    const account = await getProviderAccount(accountId);
    if (!account) {
      this.emit({
        state: 'error',
        runId,
        sessionKey,
        errorMessage: `Provider account "${accountId}" not found.`,
      });
      return { runId };
    }

    // Resolve API key
    const secret = await getProviderSecret(accountId);
    const apiKey = secret
      ? (secret.type === 'api_key' ? secret.apiKey
        : secret.type === 'oauth' ? secret.accessToken
          : secret.type === 'local' ? (secret.apiKey || '')
            : '')
      : '';

    // Resolve config
    const config = getProviderConfig(account.vendorId);
    const baseUrl = (account.baseUrl || config?.baseUrl || '').replace(/\/+$/, '');
    const protocol = (account.apiProtocol || config?.api || 'openai-completions') as ProviderProtocol;
    const model = params.model || account.model || '';
    const extraHeaders = config?.headers || {};

    if (!baseUrl) {
      this.emit({
        state: 'error',
        runId,
        sessionKey,
        errorMessage: `No base URL configured for provider "${account.label}".`,
      });
      return { runId };
    }

    // Fire off the streaming request in the background
    void this.#executeStream({
      runId,
      sessionKey,
      params,
      protocol,
      baseUrl,
      apiKey,
      model,
      extraHeaders,
      providerLabel: account.label,
      vendorId: account.vendorId,
    });

    return { runId };
  }

  async abort(runId: string): Promise<void> {
    const controller = this.activeControllers.get(runId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(runId);
    }
  }

  // ── Internal stream execution ───────────────────────────────────────────

  async #executeStream(opts: {
    runId: string;
    sessionKey: string;
    params: ChatSendParams;
    protocol: ProviderProtocol;
    baseUrl: string;
    apiKey: string;
    model: string;
    extraHeaders: Record<string, string>;
    providerLabel: string;
    vendorId: string;
  }): Promise<void> {
    const { runId, sessionKey, params, protocol, baseUrl, apiKey, model, extraHeaders, providerLabel, vendorId } = opts;
    const controller = new AbortController();
    this.activeControllers.set(runId, controller);

    const startTime = Date.now();

    this.emit({ state: 'started', runId, sessionKey });

    try {
      const { url, headers, body } = this.#buildRequest({
        protocol,
        baseUrl,
        apiKey,
        model,
        messages: params.messages,
        maxTokens: params.maxTokens,
        thinkingLevel: params.thinkingLevel,
        extraHeaders,
      });

      const response = await proxyAwareFetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.emit({
          state: 'error',
          runId,
          sessionKey,
          errorMessage: `API error ${response.status}: ${errorText}`,
        });
        return;
      }

      if (!response.body) {
        this.emit({
          state: 'error',
          runId,
          sessionKey,
          errorMessage: 'No response body received from API.',
        });
        return;
      }

      if (protocol === 'anthropic-messages') {
        await this.#handleAnthropicStream(response.body, runId, sessionKey, model, vendorId, startTime);
      } else {
        await this.#handleOpenAIStream(response.body, runId, sessionKey, model, vendorId, startTime);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        this.emit({ state: 'aborted', runId, sessionKey });
      } else {
        this.emit({
          state: 'error',
          runId,
          sessionKey,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      this.activeControllers.delete(runId);
    }
  }

  // ── Request building ──────────────────────────────────────────────────

  #buildRequest(opts: {
    protocol: ProviderProtocol;
    baseUrl: string;
    apiKey: string;
    model: string;
    messages: Array<{ role: string; content: unknown; toolCallId?: string; toolName?: string }>;
    maxTokens?: number;
    thinkingLevel?: string;
    extraHeaders: Record<string, string>;
  }): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
    const { protocol, baseUrl, apiKey, model, messages, maxTokens, thinkingLevel, extraHeaders } = opts;

    const formatted = formatMessagesForProvider(messages, protocol);

    switch (protocol) {
      case 'anthropic-messages': {
        const url = `${baseUrl}/v1/messages`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          ...extraHeaders,
        };
        const body: Record<string, unknown> = {
          model,
          messages: formatted.messages,
          max_tokens: maxTokens || 8192,
          stream: true,
        };
        if (formatted.system) {
          body.system = formatted.system;
        }
        return { url, headers, body };
      }

      case 'openai-responses': {
        const url = `${baseUrl}/responses`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...extraHeaders,
        };
        const body: Record<string, unknown> = {
          model,
          input: formatted.messages,
          stream: true,
        };
        const responsesEffort = mapThinkingToReasoningEffort(thinkingLevel);
        if (responsesEffort) {
          body.reasoning = { effort: responsesEffort };
        }
        return { url, headers, body };
      }

      case 'openai-completions':
      default: {
        const url = `${baseUrl}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...extraHeaders,
        };
        const body: Record<string, unknown> = {
          model,
          messages: formatted.messages,
          max_tokens: maxTokens || 8192,
          stream: true,
          stream_options: { include_usage: true },
        };
        const completionsEffort = mapThinkingToReasoningEffort(thinkingLevel);
        if (completionsEffort) {
          body.reasoning_effort = completionsEffort;
        }
        return { url, headers, body };
      }
    }
  }

  // ── OpenAI-compatible stream handling ─────────────────────────────────

  async #handleOpenAIStream(
    stream: ReadableStream<Uint8Array>,
    runId: string,
    sessionKey: string,
    model: string,
    vendorId: string,
    startTime: number,
  ): Promise<void> {
    let fullContent = '';
    let reasoningContent = '';
    let firstDeltaAt = 0;
    let usage: Record<string, unknown> | undefined;

    for await (const sseEvent of parseSSEStream(stream)) {
      const chunk = parseOpenAIChunk(sseEvent.data);
      if (!chunk) continue;

      // Extract usage from final chunk
      if (chunk.usage) {
        usage = {
          input_tokens: chunk.usage.prompt_tokens,
          output_tokens: chunk.usage.completion_tokens,
          total_tokens: chunk.usage.total_tokens,
          ...chunk.usage.prompt_tokens_details,
          ...chunk.usage.completion_tokens_details,
        };
      }

      const choice = chunk.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;
      if (delta.content) {
        if (firstDeltaAt === 0) firstDeltaAt = Date.now();
        fullContent += delta.content;
        this.emit({
          state: 'delta',
          runId,
          sessionKey,
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: fullContent }],
          },
        });
      }

      if (delta.reasoning_content) {
        if (firstDeltaAt === 0) firstDeltaAt = Date.now();
        reasoningContent += delta.reasoning_content;
      }

      if (choice.finish_reason) {
        const elapsed = Date.now() - startTime;
        const outputTokens = (usage?.output_tokens as number) || 0;
        const performance: Record<string, unknown> = {};
        if (firstDeltaAt > 0) performance.ttft = firstDeltaAt - startTime;
        if (outputTokens > 0 && elapsed > 0) performance.tps = outputTokens / (elapsed / 1000);

        const contentBlocks: Array<Record<string, unknown>> = [];
        if (reasoningContent) {
          contentBlocks.push({ type: 'thinking', thinking: reasoningContent });
        }
        contentBlocks.push({ type: 'text', text: fullContent });

        this.emit({
          state: 'final',
          runId,
          sessionKey,
          message: {
            role: 'assistant',
            content: contentBlocks,
            id: runId,
          },
          usage,
          model: chunk.model || model,
          provider: vendorId,
          elapsed,
          performance: Object.keys(performance).length > 0 ? performance : undefined,
        });
        return;
      }
    }

    // Stream ended without finish_reason — still emit final
    const elapsed = Date.now() - startTime;
    const outputTokens = (usage?.output_tokens as number) || 0;
    const performance: Record<string, unknown> = {};
    if (firstDeltaAt > 0) performance.ttft = firstDeltaAt - startTime;
    if (outputTokens > 0 && elapsed > 0) performance.tps = outputTokens / (elapsed / 1000);

    const contentBlocks: Array<Record<string, unknown>> = [];
    if (reasoningContent) {
      contentBlocks.push({ type: 'thinking', thinking: reasoningContent });
    }
    contentBlocks.push({ type: 'text', text: fullContent });

    this.emit({
      state: 'final',
      runId,
      sessionKey,
      message: {
        role: 'assistant',
        content: contentBlocks,
        id: runId,
      },
      usage,
      model,
      provider: vendorId,
      elapsed,
      performance: Object.keys(performance).length > 0 ? performance : undefined,
    });
  }

  // ── Anthropic stream handling ─────────────────────────────────────────

  async #handleAnthropicStream(
    stream: ReadableStream<Uint8Array>,
    runId: string,
    sessionKey: string,
    model: string,
    vendorId: string,
    startTime: number,
  ): Promise<void> {
    let fullContent = '';
    let firstDeltaAt = 0;
    let usage: Record<string, unknown> = {};
    let responseModel = model;

    for await (const sseEvent of parseSSEStream(stream)) {
      const parsed = parseAnthropicEvent(sseEvent.data);
      if (!parsed) continue;

      switch (parsed.type) {
        case 'message_start': {
          if (parsed.message?.model) responseModel = parsed.message.model;
          if (parsed.message?.usage) {
            usage = { ...usage, input_tokens: parsed.message.usage.input_tokens };
          }
          break;
        }
        case 'content_block_delta': {
          if (parsed.delta?.text) {
            if (firstDeltaAt === 0) firstDeltaAt = Date.now();
            fullContent += parsed.delta.text;
            this.emit({
              state: 'delta',
              runId,
              sessionKey,
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: fullContent }],
              },
            });
          }
          break;
        }
        case 'message_delta': {
          if (parsed.usage) {
            usage = { ...usage, ...parsed.usage };
          }
          if (parsed.delta?.usage) {
            usage = { ...usage, output_tokens: (parsed.delta.usage as Record<string, unknown>).output_tokens };
          }
          break;
        }
        case 'message_stop': {
          const elapsed = Date.now() - startTime;
          const outputTokens = (usage.output_tokens as number) || 0;
          const performance: Record<string, unknown> = {};
          if (firstDeltaAt > 0) performance.ttft = firstDeltaAt - startTime;
          if (outputTokens > 0 && elapsed > 0) performance.tps = outputTokens / (elapsed / 1000);

          this.emit({
            state: 'final',
            runId,
            sessionKey,
            message: {
              role: 'assistant',
              content: [{ type: 'text', text: fullContent }],
              id: runId,
            },
            usage,
            model: responseModel,
            provider: vendorId,
            elapsed,
            performance: Object.keys(performance).length > 0 ? performance : undefined,
          });
          return;
        }
        case 'error': {
          const errorData = parsed as Record<string, unknown>;
          const errorMsg = (errorData.error as Record<string, unknown>)?.message || 'Anthropic API error';
          this.emit({
            state: 'error',
            runId,
            sessionKey,
            errorMessage: String(errorMsg),
          });
          return;
        }
      }
    }

    // Stream ended without message_stop — emit final with what we have
    const elapsed = Date.now() - startTime;
    this.emit({
      state: 'final',
      runId,
      sessionKey,
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: fullContent }],
        id: runId,
      },
      usage,
      model: responseModel,
      provider: vendorId,
      elapsed,
    });
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let instance: ChatAiService | null = null;

export function getChatAiService(): ChatAiService {
  if (!instance) {
    instance = new ChatAiService();
  }
  return instance;
}
