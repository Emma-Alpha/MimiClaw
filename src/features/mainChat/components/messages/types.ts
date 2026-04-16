export type MessageProtocol = 'anthropic' | 'openai' | 'generic';

export interface StreamingToolStatus {
  id?: string;
  toolCallId?: string;
  name: string;
  status: 'running' | 'completed' | 'error';
  durationMs?: number;
  summary?: string;
}

export interface ExtractedImage {
  url?: string;
  data?: string;
  mimeType: string;
}

export interface LightboxImage {
  src: string;
  fileName: string;
  filePath?: string;
  base64?: string;
  mimeType?: string;
}
