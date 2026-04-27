/**
 * SSE stream parser for AI provider APIs.
 * Handles OpenAI-compatible and Anthropic streaming formats.
 */

export interface SSEEvent {
  event?: string;
  data: string;
}

/**
 * Parse an SSE stream from a ReadableStream<Uint8Array>.
 * Yields individual SSE events as they arrive.
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double newlines (SSE event boundaries)
      const parts = buffer.split('\n\n');
      // Keep the last partial chunk in the buffer
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        let event: string | undefined;
        let data = '';

        for (const line of trimmed.split('\n')) {
          if (line.startsWith('event: ')) {
            event = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            data += (data ? '\n' : '') + line.slice(6);
          } else if (line.startsWith('data:')) {
            data += (data ? '\n' : '') + line.slice(5);
          }
        }

        if (data) {
          yield { event, data };
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      let event: string | undefined;
      let data = '';
      for (const line of buffer.trim().split('\n')) {
        if (line.startsWith('event: ')) {
          event = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          data += (data ? '\n' : '') + line.slice(6);
        } else if (line.startsWith('data:')) {
          data += (data ? '\n' : '') + line.slice(5);
        }
      }
      if (data) {
        yield { event, data };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── OpenAI format parsing ───────────────────────────────────────────────────

export interface OpenAIDelta {
  role?: string;
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

export interface OpenAIChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: OpenAIDelta;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: Record<string, number>;
    completion_tokens_details?: Record<string, number>;
  };
  model?: string;
}

export function parseOpenAIChunk(data: string): OpenAIChunk | null {
  if (data === '[DONE]') return null;
  try {
    return JSON.parse(data) as OpenAIChunk;
  } catch {
    return null;
  }
}

// ── Anthropic format parsing ────────────────────────────────────────────────

export interface AnthropicStreamEvent {
  type: string;
  message?: {
    id: string;
    model: string;
    role: string;
    content: Array<{ type: string; text?: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };
  index?: number;
  content_block?: { type: string; text?: string };
  delta?: {
    type: string;
    text?: string;
    stop_reason?: string;
    usage?: { output_tokens: number };
  };
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function parseAnthropicEvent(data: string): AnthropicStreamEvent | null {
  try {
    return JSON.parse(data) as AnthropicStreamEvent;
  } catch {
    return null;
  }
}
