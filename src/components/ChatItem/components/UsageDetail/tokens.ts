import type { ModelUsage } from '../../types';

export const getDetailsToken = (usage: ModelUsage) => {
  const inputTextTokens = usage.inputTextTokens ?? usage.inputTokens ?? 0;
  const totalInputTokens = usage.totalInputTokens ?? usage.inputTokens ?? 0;
  const totalOutputTokens = usage.totalOutputTokens ?? usage.outputTokens ?? 0;
  const outputReasoningTokens = usage.outputReasoningTokens ?? 0;
  const outputImageTokens = usage.outputImageTokens ?? 0;
  const inputToolTokens = usage.inputToolTokens ?? 0;

  const outputTextTokens =
    typeof usage.outputTextTokens === 'number'
      ? usage.outputTextTokens
      : Math.max(
          0,
          totalOutputTokens -
            outputReasoningTokens -
            (usage.outputAudioTokens ?? 0) -
            outputImageTokens,
        );

  const inputWriteCacheTokens = usage.inputWriteCacheTokens ?? 0;
  const inputCacheTokens = usage.inputCachedTokens ?? 0;

  const inputCacheMissTokens = usage.inputCacheMissTokens
    ? usage.inputCacheMissTokens
    : totalInputTokens - inputCacheTokens - inputToolTokens;

  return {
    inputAudio: usage.inputAudioTokens ? usage.inputAudioTokens : undefined,
    inputCacheMiss: inputCacheMissTokens > 0 ? inputCacheMissTokens : undefined,
    inputCached: inputCacheTokens > 0 ? inputCacheTokens : undefined,
    inputCachedWrite: inputWriteCacheTokens > 0 ? inputWriteCacheTokens : undefined,
    inputCitation: usage.inputCitationTokens ? usage.inputCitationTokens : undefined,
    inputText: inputTextTokens > 0 ? inputTextTokens : undefined,
    inputTool: inputToolTokens > 0 ? inputToolTokens : undefined,
    outputAudio: usage.outputAudioTokens ? usage.outputAudioTokens : undefined,
    outputImage: outputImageTokens > 0 ? outputImageTokens : undefined,
    outputReasoning: outputReasoningTokens > 0 ? outputReasoningTokens : undefined,
    outputText: outputTextTokens > 0 ? outputTextTokens : undefined,
    totalInput: totalInputTokens > 0 ? totalInputTokens : undefined,
    totalOutput: totalOutputTokens > 0 ? totalOutputTokens : undefined,
  };
};
