/**
 * Cloud Bootstrap — auto-fill default API keys from environment variables
 * on first login when the user hasn't configured them yet.
 */

import { hostApiFetch } from '@/lib/host-api';
import type { CodeAgentRuntimeConfig } from '../../shared/code-agent';
import type { VolcengineSpeechConfigState } from '@/lib/volcengine-speech';
import type { VoiceChatConfigState } from '../../shared/voice-chat';

export interface CloudBootstrapResult {
  codeAgentPatched: boolean;
  aihubPatched: boolean;
  speechPatched: boolean;
  voiceChatPatched: boolean;
}

export interface BootstrapContext {
  codeAgent: CodeAgentRuntimeConfig;
  aihubApiUrl: string;
  aihubApiKey: string;
  setCodeAgent: (config: CodeAgentRuntimeConfig) => void;
  setAihubApiUrl: (url: string) => void;
  setAihubApiKey: (key: string) => void;
}

function envStr(key: string): string {
  return ((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim();
}

/**
 * Auto-fill API keys from VITE_DEFAULT_* env vars when the user hasn't
 * configured them yet. Called once per session after login is confirmed.
 */
export async function bootstrapCloudDefaults(ctx: BootstrapContext): Promise<CloudBootstrapResult> {
  console.log('[cloud-bootstrap] starting, current state:', {
    codeAgent: { baseUrl: ctx.codeAgent.baseUrl || '(empty)', apiKey: ctx.codeAgent.apiKey ? '***' : '(empty)', model: ctx.codeAgent.model || '(empty)' },
    aihubApiUrl: ctx.aihubApiUrl || '(empty)',
    aihubApiKey: ctx.aihubApiKey ? '***' : '(empty)',
  });

  const result: CloudBootstrapResult = {
    codeAgentPatched: false,
    aihubPatched: false,
    speechPatched: false,
    voiceChatPatched: false,
  };

  // --- A. Code Agent ---
  const defaultBaseUrl = envStr('VITE_DEFAULT_CODE_AGENT_BASE_URL');
  const defaultApiKey = envStr('VITE_DEFAULT_CODE_AGENT_API_KEY');
  const defaultModel = envStr('VITE_DEFAULT_CODE_AGENT_MODEL');

  if (defaultBaseUrl || defaultApiKey || defaultModel) {
    const current = ctx.codeAgent;
    const needsBaseUrl = !current.baseUrl && defaultBaseUrl;
    const needsApiKey = !current.apiKey && defaultApiKey;
    const needsModel = !current.model && defaultModel;

    if (needsBaseUrl || needsApiKey || needsModel) {
      ctx.setCodeAgent({
        ...current,
        ...(needsBaseUrl ? { baseUrl: defaultBaseUrl } : {}),
        ...(needsApiKey ? { apiKey: defaultApiKey } : {}),
        ...(needsModel ? { model: defaultModel } : {}),
      });
      result.codeAgentPatched = true;
    } else {
      console.log('[cloud-bootstrap] Code Agent: skipped (already configured)');
    }
  }

  // --- B. AIHub API ---
  const defaultAihubUrl = envStr('VITE_DEFAULT_AIHUB_API_URL');
  const defaultAihubKey = envStr('VITE_DEFAULT_AIHUB_API_KEY');

  if (defaultAihubUrl && !ctx.aihubApiUrl) {
    ctx.setAihubApiUrl(defaultAihubUrl);
    result.aihubPatched = true;
  }
  if (defaultAihubKey && !ctx.aihubApiKey) {
    ctx.setAihubApiKey(defaultAihubKey);
    result.aihubPatched = true;
  }

  // --- C. VolcEngine Speech ---
  const defaultSpeechAppId = envStr('VITE_DEFAULT_SPEECH_APP_ID');
  const defaultSpeechCluster = envStr('VITE_DEFAULT_SPEECH_CLUSTER');
  const defaultSpeechToken = envStr('VITE_DEFAULT_SPEECH_TOKEN');

  if (defaultSpeechAppId || defaultSpeechCluster || defaultSpeechToken) {
    try {
      const speechConfig = await hostApiFetch<VolcengineSpeechConfigState>(
        '/api/speech/volcengine-config',
      );

      if (!speechConfig.configured) {
        console.log('[cloud-bootstrap] Speech: not configured, applying defaults');
        const patch: Record<string, string> = {};
        if (!speechConfig.appId && defaultSpeechAppId) patch.appId = defaultSpeechAppId;
        if (!speechConfig.cluster && defaultSpeechCluster) patch.cluster = defaultSpeechCluster;
        if (!speechConfig.hasToken && defaultSpeechToken) patch.token = defaultSpeechToken;

        if (Object.keys(patch).length > 0) {
          await hostApiFetch('/api/speech/volcengine-config', {
            method: 'PUT',
            body: JSON.stringify(patch),
          });
          result.speechPatched = true;
        }
      } else {
        console.log('[cloud-bootstrap] Speech: skipped (already configured)');
      }
    } catch (error) {
      console.warn('[cloud-bootstrap] Speech config auto-fill failed:', error);
    }
  }

  // --- D. Voice Chat ---
  const defaultVoiceChatAppId = envStr('VITE_DEFAULT_VOICE_CHAT_APP_ID');
  const defaultVoiceChatAccessKey = envStr('VITE_DEFAULT_VOICE_CHAT_ACCESS_KEY');

  if (defaultVoiceChatAppId || defaultVoiceChatAccessKey) {
    try {
      const voiceConfig = await hostApiFetch<VoiceChatConfigState>(
        '/api/voice-chat/config',
      );

      if (!voiceConfig.configured) {
        console.log('[cloud-bootstrap] Voice Chat: not configured, applying defaults');
        const patch: Record<string, string> = {};
        if (!voiceConfig.appId && defaultVoiceChatAppId) patch.appId = defaultVoiceChatAppId;
        if (!voiceConfig.hasAccessKey && defaultVoiceChatAccessKey) patch.accessKey = defaultVoiceChatAccessKey;

        if (Object.keys(patch).length > 0) {
          await hostApiFetch('/api/voice-chat/config', {
            method: 'PUT',
            body: JSON.stringify(patch),
          });
          result.voiceChatPatched = true;
        }
      } else {
        console.log('[cloud-bootstrap] Voice Chat: skipped (already configured)');
      }
    } catch (error) {
      console.warn('[cloud-bootstrap] Voice chat config auto-fill failed:', error);
    }
  }

  console.log('[cloud-bootstrap] done:', result);
  return result;
}
