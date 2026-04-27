/**
 * Convert renderer RawMessage[] to the format expected by each AI provider API.
 */

import type { ProviderProtocol } from '../../shared/providers/types';

interface RawMessage {
  role: string;
  content: unknown;
  toolCallId?: string;
  toolName?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  source?: { type: string; media_type?: string; data?: string; url?: string };
  data?: string;
  mimeType?: string;
  id?: string;
  name?: string;
  input?: unknown;
  arguments?: unknown;
  content?: unknown;
}

// ── OpenAI format ───────────────────────────────────────────────────────────

interface OpenAIMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tool_call_id?: string;
  name?: string;
}

function contentBlocksToOpenAI(
  blocks: ContentBlock[],
): string | Array<{ type: string; text?: string; image_url?: { url: string } }> {
  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  let hasImage = false;

  for (const block of blocks) {
    if (block.type === 'text' && block.text) {
      parts.push({ type: 'text', text: block.text });
    } else if (block.type === 'thinking' && block.thinking) {
      // Include thinking as text for models that don't support native thinking
      parts.push({ type: 'text', text: block.thinking });
    } else if (block.type === 'image') {
      hasImage = true;
      const url = block.source?.url
        || (block.source?.data
          ? `data:${block.source.media_type || 'image/png'};base64,${block.source.data}`
          : block.data
            ? `data:${block.mimeType || 'image/png'};base64,${block.data}`
            : undefined);
      if (url) {
        parts.push({ type: 'image_url', image_url: { url } });
      }
    }
  }

  // If no images, return plain text
  if (!hasImage && parts.length > 0) {
    return parts.map((p) => p.text || '').join('\n');
  }

  return parts.length > 0 ? parts : '';
}

function toOpenAIMessages(messages: RawMessage[]): OpenAIMessage[] {
  const result: OpenAIMessage[] = [];

  for (const msg of messages) {
    // Skip tool results for now (complex to map properly)
    if (msg.role === 'toolresult') continue;

    const role = msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user';

    let content: OpenAIMessage['content'];
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      content = contentBlocksToOpenAI(msg.content as ContentBlock[]);
    } else {
      content = String(msg.content ?? '');
    }

    result.push({ role, content });
  }

  return result;
}

// ── Anthropic format ────────────────────────────────────────────────────────

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }>;
}

function contentBlocksToAnthropic(
  blocks: ContentBlock[],
): string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> {
  const parts: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];
  let hasImage = false;

  for (const block of blocks) {
    if (block.type === 'text' && block.text) {
      parts.push({ type: 'text', text: block.text });
    } else if (block.type === 'image') {
      hasImage = true;
      const data = block.source?.data || block.data;
      const mediaType = block.source?.media_type || block.mimeType || 'image/png';
      if (data) {
        parts.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data },
        });
      }
    }
  }

  if (!hasImage && parts.length > 0) {
    return parts.map((p) => p.text || '').join('\n');
  }

  return parts.length > 0 ? parts : '';
}

function toAnthropicMessages(messages: RawMessage[]): { system?: string; messages: AnthropicMessage[] } {
  let systemPrompt: string | undefined;
  const result: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = typeof msg.content === 'string'
        ? msg.content
        : Array.isArray(msg.content)
          ? (msg.content as ContentBlock[]).map((b) => b.text || '').join('\n')
          : String(msg.content ?? '');
      continue;
    }

    // Skip tool results
    if (msg.role === 'toolresult') continue;

    const role = msg.role === 'assistant' ? 'assistant' : 'user';

    let content: AnthropicMessage['content'];
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      content = contentBlocksToAnthropic(msg.content as ContentBlock[]);
    } else {
      content = String(msg.content ?? '');
    }

    result.push({ role, content });
  }

  return { system: systemPrompt, messages: result };
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface FormattedMessages {
  /** For OpenAI-compatible APIs */
  messages: Array<Record<string, unknown>>;
  /** For Anthropic (system extracted separately) */
  system?: string;
}

export function formatMessagesForProvider(
  messages: RawMessage[],
  protocol: ProviderProtocol,
): FormattedMessages {
  switch (protocol) {
    case 'anthropic-messages': {
      const { system, messages: formatted } = toAnthropicMessages(messages);
      return { messages: formatted, system };
    }
    case 'openai-completions':
    case 'openai-responses':
    default:
      return { messages: toOpenAIMessages(messages) };
  }
}
