export const DEFAULT_VOICE_CHAT_ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/realtime/dialogue';
export const DEFAULT_VOICE_CHAT_APP_KEY = 'PlgvMymc7f3tQnJ6';
export const DEFAULT_VOICE_CHAT_RESOURCE_ID = 'volc.speech.dialog';
export const DEFAULT_VOICE_CHAT_MODEL = '1.2.1.1';
export const DEFAULT_VOICE_CHAT_SPEAKER = 'zh_female_vv_jupiter_bigtts';

export type VoiceDialogWindowState = 'idle' | 'connecting' | 'connected';

export interface VoiceChatConfigState {
  provider: 'volcengine-realtime';
  configured: boolean;
  appId: string;
  endpoint: string;
  hasAccessKey: boolean;
  accessKeyMasked: string | null;
  accessKeySource: 'voice-chat' | 'speech-asr' | null;
  resourceId: string;
  appKey: string;
}

export interface VoiceChatSessionSummary {
  id: string;
  title: string;
  startedAt: number;
  lastActivityAt: number;
  endedAt: number | null;
  status: 'active' | 'completed' | 'failed';
}

export interface VoiceChatHistoryMessage {
  id: string;
  sessionId: string;
  groupId: string;
  role: 'user' | 'assistant';
  text: string;
  interrupted: boolean;
  createdAt: number;
}

export interface VoiceChatWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VoiceRealtimeServerEvent {
  type: string;
  [key: string]: unknown;
}
