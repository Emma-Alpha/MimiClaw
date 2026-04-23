import { describe, it, expect } from 'vitest';
import {
  extractUsageFromMessage,
  extractModelFromMessage,
  extractProviderFromMessage,
} from '@/features/mainChat/utils/extractUsage';
import type { RawMessage } from '@/stores/chat';

describe('extractUsageFromMessage', () => {
  it('should extract basic usage from top-level (assistant message)', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      usage: {
        input_tokens: 1234,
        output_tokens: 567,
        cache_read_input_tokens: 100,
        cache_creation_input_tokens: 50,
      },
    } as any;

    const usage = extractUsageFromMessage(message);
    expect(usage).toEqual({
      inputTokens: 1234,
      outputTokens: 567,
      inputCachedTokens: 100,
      inputWriteCacheTokens: 50,
      totalTokens: 1951, // 1234 + 567 + 100 + 50
    });
  });

  it('should extract basic usage from Anthropic format in details', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      details: {
        usage: {
          input_tokens: 1234,
          output_tokens: 567,
          cache_read_input_tokens: 100,
          cache_creation_input_tokens: 50,
        },
      },
    };

    const usage = extractUsageFromMessage(message);
    expect(usage).toEqual({
      inputTokens: 1234,
      outputTokens: 567,
      inputCachedTokens: 100,
      inputWriteCacheTokens: 50,
      totalTokens: 1951, // 1234 + 567 + 100 + 50
    });
  });

  it('should extract usage from OpenAI format', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      details: {
        usage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
        },
      },
    };

    const usage = extractUsageFromMessage(message);
    expect(usage).toEqual({
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    });
  });

  it('should extract detailed token breakdown', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      details: {
        usage: {
          input_tokens: 2000,
          output_tokens: 1000,
          input_text_tokens: 1800,
          input_audio_tokens: 200,
          output_text_tokens: 800,
          output_reasoning_tokens: 200,
          cache_read_input_tokens: 500,
          cache_creation_input_tokens: 100,
        },
      },
    };

    const usage = extractUsageFromMessage(message);
    expect(usage).toMatchObject({
      inputTokens: 2000,
      outputTokens: 1000,
      inputTextTokens: 1800,
      inputAudioTokens: 200,
      outputTextTokens: 800,
      outputReasoningTokens: 200,
      inputCachedTokens: 500,
      inputWriteCacheTokens: 100,
    });
  });

  it('should return undefined when no usage data', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
    };

    const usage = extractUsageFromMessage(message);
    expect(usage).toBeUndefined();
  });

  it('should return undefined when usage is empty', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      details: {
        usage: {},
      },
    };

    const usage = extractUsageFromMessage(message);
    expect(usage).toBeUndefined();
  });

  it('should handle camelCase field names', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      details: {
        usage: {
          inputTokens: 1234,
          outputTokens: 567,
          cacheReadInputTokens: 100,
          cacheCreationInputTokens: 50,
        },
      },
    };

    const usage = extractUsageFromMessage(message);
    expect(usage).toMatchObject({
      inputTokens: 1234,
      outputTokens: 567,
      inputCachedTokens: 100,
      inputWriteCacheTokens: 50,
    });
  });
});

describe('extractModelFromMessage', () => {
  it('should extract model from top-level (assistant message)', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      model: 'claude-sonnet-4-6',
    } as any;

    const model = extractModelFromMessage(message);
    expect(model).toBe('claude-sonnet-4-6');
  });

  it('should extract model from details', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      details: {
        model: 'claude-sonnet-4-6',
      },
    };

    const model = extractModelFromMessage(message);
    expect(model).toBe('claude-sonnet-4-6');
  });

  it('should extract model from modelRef', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      modelRef: 'gpt-4',
    } as any;

    const model = extractModelFromMessage(message);
    expect(model).toBe('gpt-4');
  });

  it('should prefer top-level over details', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      model: 'top-level-model',
      details: {
        model: 'details-model',
      },
    } as any;

    const model = extractModelFromMessage(message);
    expect(model).toBe('top-level-model');
  });

  it('should return undefined when no model', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
    };

    const model = extractModelFromMessage(message);
    expect(model).toBeUndefined();
  });
});

describe('extractProviderFromMessage', () => {
  it('should extract provider from top-level (assistant message)', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      provider: 'anthropic',
    } as any;

    const provider = extractProviderFromMessage(message);
    expect(provider).toBe('anthropic');
  });

  it('should extract provider from details', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      details: {
        provider: 'anthropic',
      },
    };

    const provider = extractProviderFromMessage(message);
    expect(provider).toBe('anthropic');
  });

  it('should prefer top-level over details', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
      provider: 'top-level-provider',
      details: {
        provider: 'details-provider',
      },
    } as any;

    const provider = extractProviderFromMessage(message);
    expect(provider).toBe('top-level-provider');
  });

  it('should return undefined when no provider', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: 'test',
    };

    const provider = extractProviderFromMessage(message);
    expect(provider).toBeUndefined();
  });
});
