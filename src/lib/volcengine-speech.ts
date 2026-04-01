import { hostApiFetch } from '@/lib/host-api';

export type VolcengineSpeechLanguage = 'zh-CN' | 'en-US' | 'ja-JP';

export interface VolcengineSpeechConfigState {
  provider: 'volcengine-asr';
  configured: boolean;
  appId: string;
  cluster: string;
  language: VolcengineSpeechLanguage;
  endpoint: string;
  hasToken: boolean;
  tokenMasked: string | null;
}

export interface PetAsrEventPayload {
  sessionId: string;
  type: 'partial' | 'final' | 'error' | 'status';
  text?: string;
  message?: string;
  status?: 'connecting' | 'connected' | 'closed';
}

export async function fetchVolcengineSpeechConfig(): Promise<VolcengineSpeechConfigState> {
  return await hostApiFetch<VolcengineSpeechConfigState>('/api/speech/volcengine-config');
}

export async function saveVolcengineSpeechConfig(input: {
  appId?: string;
  cluster?: string;
  token?: string;
  language?: VolcengineSpeechLanguage;
  endpoint?: string;
  clearToken?: boolean;
}): Promise<VolcengineSpeechConfigState> {
  return await hostApiFetch<VolcengineSpeechConfigState>('/api/speech/volcengine-config', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function interleaveToMono(inputBuffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(inputBuffer.length);
  const channels = Math.max(1, inputBuffer.numberOfChannels);

  for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
    const channelData = inputBuffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < inputBuffer.length; sampleIndex += 1) {
      mono[sampleIndex] += (channelData[sampleIndex] ?? 0) / channels;
    }
  }

  return mono;
}

export function mixToMono(channelData: Float32Array[]): Float32Array {
  if (channelData.length <= 1) {
    return channelData[0]?.slice() ?? new Float32Array(0);
  }

  const length = channelData[0]?.length ?? 0;
  const mono = new Float32Array(length);
  for (let channelIndex = 0; channelIndex < channelData.length; channelIndex += 1) {
    const channel = channelData[channelIndex];
    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      mono[sampleIndex] += (channel?.[sampleIndex] ?? 0) / channelData.length;
    }
  }
  return mono;
}

export function resampleLinear(samples: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) {
    return samples.slice();
  }

  const outputLength = Math.max(1, Math.round(samples.length * outputRate / inputRate));
  const output = new Float32Array(outputLength);
  const ratio = inputRate / outputRate;

  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1);
    const weight = position - leftIndex;
    const left = samples[leftIndex] ?? 0;
    const right = samples[rightIndex] ?? left;
    output[index] = left + (right - left) * weight;
  }

  return output;
}

export function float32ToPcm16Bytes(samples: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Uint8Array(buffer);
}
