import { describe, expect, it } from 'vitest';

import { deriveContextUsageFromRawMessages } from '@/stores/code-agent';

function textBlock(text: string) {
  return { type: 'text', text };
}

describe('deriveContextUsageFromRawMessages', () => {
  it('falls back to rough transcript estimation when usage is output-only', () => {
    const largeToolResult = 'line '.repeat(18_000);
    const rawMessages = [
      {
        type: 'user',
        message: {
          role: 'user',
          content: [textBlock('请分析这个项目')],
        },
      },
      {
        type: 'assistant',
        message: {
          id: 'msg-a',
          role: 'assistant',
          model: 'claude-sonnet-4-6',
          content: [
            {
              type: 'tool_use',
              id: 'tool-a',
              name: 'read_file',
              input: { path: '/tmp/a.ts' },
            },
          ],
          usage: {
            input_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            output_tokens: 24,
          },
        },
      },
      {
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-a',
              content: largeToolResult,
            },
          ],
        },
      },
      {
        type: 'assistant',
        message: {
          id: 'msg-b',
          role: 'assistant',
          model: 'claude-sonnet-4-6',
          content: [textBlock('已读取并开始分析。')],
          usage: {
            input_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            output_tokens: 12,
          },
        },
      },
    ];

    const usage = deriveContextUsageFromRawMessages(rawMessages, null);
    expect(usage).not.toBeNull();
    expect(usage?.usedTokens ?? 0).toBeGreaterThan(2_000);
    expect(usage?.remainingTokens ?? 0).toBeLessThan(198_000);
  });

  it('keeps vendor current-usage footprint when input/cache tokens are available', () => {
    const rawMessages = [
      {
        type: 'assistant',
        message: {
          id: 'msg-c',
          role: 'assistant',
          model: 'claude-sonnet-4-6',
          content: [textBlock('done')],
          usage: {
            input_tokens: 12_345,
            cache_creation_input_tokens: 2_222,
            cache_read_input_tokens: 3_333,
            output_tokens: 777,
          },
        },
      },
    ];

    const usage = deriveContextUsageFromRawMessages(rawMessages, null);
    expect(usage).not.toBeNull();
    expect(usage?.usedTokens).toBe(17_900);
    expect(usage?.remainingTokens).toBe(182_100);
    expect(usage?.usedPercentage).toBe(9);
  });
});
