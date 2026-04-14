import type { ContentBlock, RawMessage } from '@/stores/chat';
import type { MessageProtocol } from '../types';

function hasOpenAIToolCalls(message: RawMessage): boolean {
  const msg = message as unknown as Record<string, unknown>;
  const toolCalls = msg.tool_calls ?? msg.toolCalls;
  return Array.isArray(toolCalls) && toolCalls.length > 0;
}

export function detectMessageProtocol(message: RawMessage): MessageProtocol {
  if (hasOpenAIToolCalls(message)) return 'openai';

  if (!Array.isArray(message.content)) return 'generic';

  let hasAnthropicMarkers = false;
  let hasOpenAIMarkers = false;

  for (const block of message.content as ContentBlock[]) {
    const type = block?.type;
    if (!type) continue;

    if (type === 'toolCall' || type === 'toolResult') {
      hasOpenAIMarkers = true;
      continue;
    }

    if (type === 'thinking' || type === 'tool_use' || type === 'tool_result') {
      hasAnthropicMarkers = true;
    }
  }

  if (hasAnthropicMarkers) return 'anthropic';
  if (hasOpenAIMarkers) return 'openai';

  return 'generic';
}
