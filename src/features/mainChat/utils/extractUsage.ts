import type { RawMessage } from '@/stores/chat';
import type { ModelUsage } from '@/components/ChatItem/types';

/**
 * Extract usage information from a RawMessage.
 * Supports multiple formats from different providers (Anthropic, OpenAI, etc.)
 *
 * Data locations:
 * - Assistant messages: message.usage (top-level)
 * - Tool result messages: message.details.usage
 */
export function extractUsageFromMessage(message: RawMessage): ModelUsage | undefined {
  // Try to get usage from top-level (assistant messages)
  let usage: Record<string, unknown> | undefined;

  if (message && typeof message === 'object') {
    const msg = message as Record<string, unknown>;
    if (msg.usage && typeof msg.usage === 'object') {
      usage = msg.usage as Record<string, unknown>;
    }
  }

  // Fallback to details.usage (tool result messages)
  if (!usage && message.details && typeof message.details === 'object') {
    const details = message.details as Record<string, unknown>;
    if (details.usage && typeof details.usage === 'object') {
      usage = details.usage as Record<string, unknown>;
    }
  }

  if (!usage) {
    return undefined;
  }

  // Helper to safely extract number
  const getNumber = (key: string): number | undefined => {
    const val = usage[key];
    return typeof val === 'number' && Number.isFinite(val) ? val : undefined;
  };

  // Extract basic token counts (support multiple field names)
  const inputTokens =
    getNumber('input_tokens') ??
    getNumber('inputTokens') ??
    getNumber('input') ??
    getNumber('promptTokens');

  const outputTokens =
    getNumber('output_tokens') ??
    getNumber('outputTokens') ??
    getNumber('output') ??
    getNumber('completionTokens');

  const totalTokens =
    getNumber('total_tokens') ??
    getNumber('totalTokens') ??
    getNumber('total');

  // Extract detailed input breakdown
  const totalInputTokens = getNumber('total_input_tokens') ?? getNumber('totalInputTokens');
  const inputTextTokens = getNumber('input_text_tokens') ?? getNumber('inputTextTokens');
  const inputAudioTokens = getNumber('input_audio_tokens') ?? getNumber('inputAudioTokens');
  const inputCitationTokens = getNumber('input_citation_tokens') ?? getNumber('inputCitationTokens');

  // Cache tokens
  const inputCachedTokens =
    getNumber('cache_read_input_tokens') ??
    getNumber('cacheReadInputTokens') ??
    getNumber('cacheRead') ??
    getNumber('input_cached_tokens') ??
    getNumber('inputCachedTokens');

  const inputWriteCacheTokens =
    getNumber('cache_creation_input_tokens') ??
    getNumber('cacheCreationInputTokens') ??
    getNumber('cacheWrite') ??
    getNumber('input_write_cache_tokens') ??
    getNumber('inputWriteCacheTokens');

  const inputCacheMissTokens = getNumber('input_cache_miss_tokens') ?? getNumber('inputCacheMissTokens');
  const inputToolTokens = getNumber('input_tool_tokens') ?? getNumber('inputToolTokens');

  // Extract detailed output breakdown
  const totalOutputTokens = getNumber('total_output_tokens') ?? getNumber('totalOutputTokens');
  const outputTextTokens = getNumber('output_text_tokens') ?? getNumber('outputTextTokens');
  const outputReasoningTokens = getNumber('output_reasoning_tokens') ?? getNumber('outputReasoningTokens');
  const outputAudioTokens = getNumber('output_audio_tokens') ?? getNumber('outputAudioTokens');
  const outputImageTokens = getNumber('output_image_tokens') ?? getNumber('outputImageTokens');

  // If no valid tokens found, return undefined
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    totalTokens === undefined &&
    totalInputTokens === undefined &&
    totalOutputTokens === undefined
  ) {
    return undefined;
  }

  // Build the usage object with only defined values
  const result: ModelUsage = {};

  if (inputTokens !== undefined) result.inputTokens = inputTokens;
  if (outputTokens !== undefined) result.outputTokens = outputTokens;
  if (totalTokens !== undefined) result.totalTokens = totalTokens;

  if (totalInputTokens !== undefined) result.totalInputTokens = totalInputTokens;
  if (inputTextTokens !== undefined) result.inputTextTokens = inputTextTokens;
  if (inputAudioTokens !== undefined) result.inputAudioTokens = inputAudioTokens;
  if (inputCitationTokens !== undefined) result.inputCitationTokens = inputCitationTokens;
  if (inputCachedTokens !== undefined) result.inputCachedTokens = inputCachedTokens;
  if (inputWriteCacheTokens !== undefined) result.inputWriteCacheTokens = inputWriteCacheTokens;
  if (inputCacheMissTokens !== undefined) result.inputCacheMissTokens = inputCacheMissTokens;
  if (inputToolTokens !== undefined) result.inputToolTokens = inputToolTokens;

  if (totalOutputTokens !== undefined) result.totalOutputTokens = totalOutputTokens;
  if (outputTextTokens !== undefined) result.outputTextTokens = outputTextTokens;
  if (outputReasoningTokens !== undefined) result.outputReasoningTokens = outputReasoningTokens;
  if (outputAudioTokens !== undefined) result.outputAudioTokens = outputAudioTokens;
  if (outputImageTokens !== undefined) result.outputImageTokens = outputImageTokens;

  // Calculate totalTokens if not provided
  // Include all token types: input, output, cache read, cache write
  if (result.totalTokens === undefined) {
    const input = result.inputTokens ?? 0;
    const output = result.outputTokens ?? 0;
    const cacheRead = result.inputCachedTokens ?? 0;
    const cacheWrite = result.inputWriteCacheTokens ?? 0;

    // Only set totalTokens if we have at least one non-zero value
    if (input > 0 || output > 0 || cacheRead > 0 || cacheWrite > 0) {
      result.totalTokens = input + output + cacheRead + cacheWrite;
    }
  }

  return result;
}

/**
 * Extract model name from message details or top-level
 */
export function extractModelFromMessage(message: RawMessage): string | undefined {
  // Try top-level first (assistant messages)
  if (message && typeof message === 'object') {
    const msg = message as Record<string, unknown>;
    const topModel = msg.model ?? msg.modelRef;
    if (typeof topModel === 'string') {
      return topModel;
    }
  }

  // Fallback to details (tool result messages)
  if (!message.details || typeof message.details !== 'object') {
    return undefined;
  }

  const details = message.details as Record<string, unknown>;
  const model = details.model ?? details.modelRef;

  return typeof model === 'string' ? model : undefined;
}

/**
 * Extract provider name from message details or top-level
 */
export function extractProviderFromMessage(message: RawMessage): string | undefined {
  // Try top-level first (assistant messages)
  if (message && typeof message === 'object') {
    const msg = message as Record<string, unknown>;
    if (typeof msg.provider === 'string') {
      return msg.provider;
    }
  }

  // Fallback to details (tool result messages)
  if (!message.details || typeof message.details !== 'object') {
    return undefined;
  }

  const details = message.details as Record<string, unknown>;
  const provider = details.provider;

  return typeof provider === 'string' ? provider : undefined;
}
