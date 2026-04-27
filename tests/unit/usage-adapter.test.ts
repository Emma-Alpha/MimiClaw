import { describe, expect, it } from 'vitest';

import { normalizeUsageRecord, isOpenAIModel } from '@/lib/usageAdapter';

describe('isOpenAIModel', () => {
  it('detects GPT models', () => {
    expect(isOpenAIModel('gpt-4o')).toBe(true);
    expect(isOpenAIModel('gpt-4o-mini')).toBe(true);
    expect(isOpenAIModel('gpt-4-turbo')).toBe(true);
    expect(isOpenAIModel('GPT-4')).toBe(true);
  });

  it('detects o-series models', () => {
    expect(isOpenAIModel('o1')).toBe(true);
    expect(isOpenAIModel('o1-mini')).toBe(true);
    expect(isOpenAIModel('o3')).toBe(true);
    expect(isOpenAIModel('o4-mini')).toBe(true);
  });

  it('does not match Anthropic models', () => {
    expect(isOpenAIModel('claude-sonnet-4-6')).toBe(false);
    expect(isOpenAIModel('claude-opus-4-6')).toBe(false);
    expect(isOpenAIModel('claude-3-5-sonnet')).toBe(false);
  });

  it('handles null/undefined/empty', () => {
    expect(isOpenAIModel(null)).toBe(false);
    expect(isOpenAIModel(undefined)).toBe(false);
    expect(isOpenAIModel('')).toBe(false);
  });
});

describe('normalizeUsageRecord', () => {
  describe('auto detection', () => {
    it('passes through Anthropic-native fields unchanged', () => {
      const raw = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_input_tokens: 200,
        cache_creation_input_tokens: 50,
      };
      const result = normalizeUsageRecord(raw);
      expect(result.cache_read_input_tokens).toBe(200);
      expect(result.cache_creation_input_tokens).toBe(50);
      // Anthropic converter computes total_input_tokens
      expect(result.total_input_tokens).toBe(1250); // 1000 + 200 + 50
    });

    it('flattens OpenAI nested details when detected', () => {
      const raw = {
        input_tokens: 1000,
        output_tokens: 500,
        prompt_tokens_details: {
          cached_tokens: 300,
        },
        completion_tokens_details: {
          reasoning_tokens: 200,
        },
      };
      const result = normalizeUsageRecord(raw);
      expect(result.cache_read_input_tokens).toBe(300);
      expect(result.output_reasoning_tokens).toBe(200);
      expect(result.total_input_tokens).toBe(1000); // OpenAI: input_tokens IS the total
      expect(result.input_cache_miss_tokens).toBe(700); // 1000 - 300
    });
  });

  describe('explicit anthropic-messages protocol', () => {
    it('uses Anthropic converter even with OpenAI-like fields', () => {
      const raw = {
        input_tokens: 800,
        output_tokens: 500,
        cache_read_input_tokens: 200,
        cache_creation_input_tokens: 50,
      };
      const result = normalizeUsageRecord(raw, 'anthropic-messages');
      expect(result.total_input_tokens).toBe(1050); // 800 + 200 + 50
    });
  });

  describe('explicit openai-completions protocol', () => {
    it('flattens nested details and computes derived fields', () => {
      const raw = {
        input_tokens: 2000,
        output_tokens: 800,
        prompt_tokens_details: {
          cached_tokens: 500,
          audio_tokens: 100,
        },
        completion_tokens_details: {
          reasoning_tokens: 150,
          audio_tokens: 50,
          image_tokens: 30,
        },
      };
      const result = normalizeUsageRecord(raw, 'openai-completions');
      expect(result.cache_read_input_tokens).toBe(500);
      expect(result.input_cache_miss_tokens).toBe(1500); // 2000 - 500
      expect(result.input_audio_tokens).toBe(100);
      expect(result.output_reasoning_tokens).toBe(150);
      expect(result.output_audio_tokens).toBe(50);
      expect(result.output_image_tokens).toBe(30);
      expect(result.total_input_tokens).toBe(2000);
    });

    it('handles GPT model with no nested details', () => {
      const raw = {
        input_tokens: 1000,
        output_tokens: 500,
      };
      const result = normalizeUsageRecord(raw, 'openai-completions');
      expect(result.total_input_tokens).toBe(1000);
      // No cache info available
      expect(result.cache_read_input_tokens).toBeUndefined();
    });
  });

  describe('auto detection with model name', () => {
    it('detects OpenAI protocol for GPT models', () => {
      const raw = {
        input_tokens: 1000,
        output_tokens: 500,
      };
      // No OpenAI-specific fields, but model name is GPT
      const result = normalizeUsageRecord(raw, 'auto', 'gpt-4o');
      // OpenAI converter sets total_input_tokens = input_tokens
      expect(result.total_input_tokens).toBe(1000);
    });

    it('defaults to Anthropic for Claude models', () => {
      const raw = {
        input_tokens: 800,
        output_tokens: 500,
        cache_read_input_tokens: 200,
      };
      const result = normalizeUsageRecord(raw, 'auto', 'claude-sonnet-4-6');
      // Anthropic converter: total = input + cache_read
      expect(result.total_input_tokens).toBe(1000); // 800 + 200
    });
  });

  describe('edge cases', () => {
    it('does not overwrite existing top-level fields', () => {
      const raw = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_input_tokens: 999,
        prompt_tokens_details: { cached_tokens: 300 },
      };
      const result = normalizeUsageRecord(raw, 'openai-completions');
      // Existing cache_read_input_tokens should NOT be overwritten
      expect(result.cache_read_input_tokens).toBe(999);
    });

    it('handles camelCase nested detail keys', () => {
      const raw = {
        input_tokens: 1000,
        output_tokens: 500,
        promptTokensDetails: { cachedTokens: 300 },
        completionTokensDetails: { reasoningTokens: 200 },
      };
      const result = normalizeUsageRecord(raw, 'openai-completions');
      expect(result.cache_read_input_tokens).toBe(300);
      expect(result.output_reasoning_tokens).toBe(200);
    });

    it('handles empty details objects gracefully', () => {
      const raw = {
        input_tokens: 1000,
        output_tokens: 500,
        prompt_tokens_details: {},
        completion_tokens_details: {},
      };
      const result = normalizeUsageRecord(raw, 'openai-completions');
      expect(result.cache_read_input_tokens).toBeUndefined();
      expect(result.output_reasoning_tokens).toBeUndefined();
    });

    it('does not mutate the original record', () => {
      const raw = {
        input_tokens: 1000,
        prompt_tokens_details: { cached_tokens: 300 },
      };
      const originalKeys = Object.keys(raw);
      normalizeUsageRecord(raw, 'openai-completions');
      expect(Object.keys(raw)).toEqual(originalKeys);
      expect((raw as any).cache_read_input_tokens).toBeUndefined();
    });

    it('handles DeepSeek-style prompt_cache_hit_tokens', () => {
      const raw = {
        input_tokens: 1000,
        output_tokens: 500,
        prompt_cache_hit_tokens: 400,
      };
      const result = normalizeUsageRecord(raw, 'openai-completions');
      expect(result.cache_read_input_tokens).toBe(400);
      expect(result.input_cache_miss_tokens).toBe(600); // 1000 - 400
    });
  });
});
