/**
 * Protocol-aware usage adapters for normalizing AI provider response formats.
 *
 * Similar to lobe-chat's `usageConverters/`, this module provides per-protocol
 * converters that map provider-specific usage fields into a unified flat record
 * with Anthropic-compatible field names.
 *
 * Supported protocols:
 * - anthropic-messages: Anthropic Messages API (native format, pass-through)
 * - openai-completions: OpenAI Chat Completions API (flattens nested details)
 * - auto: detect protocol from field presence / model name
 */

import type { CodeAgentUsageProtocol } from '../../shared/code-agent';

type UsageRecord = Record<string, unknown>;

function asRecord(v: unknown): UsageRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as UsageRecord) : null;
}

function safeNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function pickNum(record: UsageRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const n = safeNumber(record[key]);
    if (n !== undefined) return n;
  }
  return undefined;
}

// ── Auto-detection ──────────────────────────────────────────────────────────

/** Known OpenAI / GPT model name patterns */
const OPENAI_MODEL_PATTERNS = [
  /^gpt-/i,
  /^o\d/i,           // o1, o3, o4-mini, etc.
  /^chatgpt-/i,
  /^ft:gpt-/i,       // fine-tuned GPT
  /^davinci/i,
  /^text-davinci/i,
];

export function isOpenAIModel(model: string | null | undefined): boolean {
  if (!model) return false;
  return OPENAI_MODEL_PATTERNS.some((pattern) => pattern.test(model));
}

function detectProtocol(raw: UsageRecord, model?: string | null): 'anthropic' | 'openai' {
  // OpenAI-specific nested detail objects
  if (
    raw.prompt_tokens_details ||
    raw.promptTokensDetails ||
    raw.completion_tokens_details ||
    raw.completionTokensDetails
  ) {
    return 'openai';
  }
  // OpenAI-specific field names
  if (raw.prompt_tokens !== undefined || raw.completion_tokens !== undefined) {
    return 'openai';
  }
  // Anthropic-specific fields
  if (
    raw.cache_creation_input_tokens !== undefined ||
    raw.cacheCreationInputTokens !== undefined
  ) {
    return 'anthropic';
  }
  // Infer from model name
  if (isOpenAIModel(model)) return 'openai';
  // Default: anthropic (the project's native format)
  return 'anthropic';
}

// ── OpenAI Converter ────────────────────────────────────────────────────────
// Maps OpenAI Chat Completions usage to Anthropic-compatible field names.
//
// Key semantic difference:
//   OpenAI:    input_tokens = total input (including cached)
//   Anthropic: input_tokens = cache miss only
//
// This converter flattens nested details AND computes derived fields so that
// downstream extraction functions get consistent data.

function convertOpenAIUsage(raw: UsageRecord): UsageRecord {
  const result = { ...raw };

  const promptDetails = asRecord(raw.prompt_tokens_details) ?? asRecord(raw.promptTokensDetails);
  const completionDetails =
    asRecord(raw.completion_tokens_details) ?? asRecord(raw.completionTokensDetails);

  // ── Input tokens ────────────────────────────────────────────────────────
  const totalInput =
    pickNum(raw, ['input_tokens', 'inputTokens', 'prompt_tokens', 'promptTokens']) ?? 0;

  // cached_tokens (cache read)
  const cachedTokens = promptDetails
    ? (pickNum(promptDetails, ['cached_tokens', 'cachedTokens']) ??
       pickNum(raw, ['prompt_cache_hit_tokens']) ??
       0)
    : (pickNum(raw, ['prompt_cache_hit_tokens']) ?? 0);

  // cache miss = total - cached
  const cacheMissTokens =
    pickNum(raw, ['prompt_cache_miss_tokens']) ??
    (cachedTokens > 0 ? totalInput - cachedTokens : undefined);

  // Map to Anthropic field names (only if not already set)
  if (result.cache_read_input_tokens == null && result.cacheReadInputTokens == null && cachedTokens > 0) {
    result.cache_read_input_tokens = cachedTokens;
  }
  if (result.input_cache_miss_tokens == null && result.inputCacheMissTokens == null && cacheMissTokens !== undefined && cacheMissTokens > 0) {
    result.input_cache_miss_tokens = cacheMissTokens;
  }

  // Ensure total_input_tokens is set (OpenAI input_tokens IS the total)
  if (result.total_input_tokens == null && result.totalInputTokens == null && totalInput > 0) {
    result.total_input_tokens = totalInput;
  }

  // Input audio
  if (promptDetails && result.input_audio_tokens == null && result.inputAudioTokens == null) {
    const v = pickNum(promptDetails, ['audio_tokens', 'audioTokens']);
    if (v !== undefined) result.input_audio_tokens = v;
  }

  // ── Output tokens ───────────────────────────────────────────────────────
  if (completionDetails) {
    if (result.output_reasoning_tokens == null && result.outputReasoningTokens == null) {
      const v = pickNum(completionDetails, ['reasoning_tokens', 'reasoningTokens']);
      if (v !== undefined) result.output_reasoning_tokens = v;
    }
    if (result.output_audio_tokens == null && result.outputAudioTokens == null) {
      const v = pickNum(completionDetails, ['audio_tokens', 'audioTokens']);
      if (v !== undefined) result.output_audio_tokens = v;
    }
    if (result.output_image_tokens == null && result.outputImageTokens == null) {
      const v = pickNum(completionDetails, ['image_tokens', 'imageTokens']);
      if (v !== undefined) result.output_image_tokens = v;
    }
  }

  return result;
}

// ── Anthropic Converter ─────────────────────────────────────────────────────
// Anthropic Messages format is the project's native format.
// Ensure total_input_tokens is computed if not present (for consistent downstream use).

function convertAnthropicUsage(raw: UsageRecord): UsageRecord {
  const result = { ...raw };

  // In Anthropic: totalInput = input_tokens + cache_read + cache_creation
  if (result.total_input_tokens == null && result.totalInputTokens == null) {
    const input = pickNum(raw, ['input_tokens', 'inputTokens']) ?? 0;
    const cacheRead = pickNum(raw, ['cache_read_input_tokens', 'cacheReadInputTokens', 'cacheRead']) ?? 0;
    const cacheWrite = pickNum(raw, ['cache_creation_input_tokens', 'cacheCreationInputTokens', 'cacheWrite']) ?? 0;
    const total = input + cacheRead + cacheWrite;
    if (total > 0) {
      result.total_input_tokens = total;
    }
  }

  return result;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Normalize a raw usage record based on the specified (or auto-detected) protocol.
 *
 * @param raw - The raw usage record from the API response
 * @param protocol - Which protocol to assume ('auto' detects from fields/model)
 * @param model - Optional model name for auto-detection (e.g. 'gpt-4o' → openai)
 */
export function normalizeUsageRecord(
  raw: UsageRecord,
  protocol: CodeAgentUsageProtocol = 'auto',
  model?: string | null,
): UsageRecord {
  const resolved =
    protocol === 'openai-completions'
      ? 'openai'
      : protocol === 'anthropic-messages'
        ? 'anthropic'
        : detectProtocol(raw, model);

  return resolved === 'openai' ? convertOpenAIUsage(raw) : convertAnthropicUsage(raw);
}
