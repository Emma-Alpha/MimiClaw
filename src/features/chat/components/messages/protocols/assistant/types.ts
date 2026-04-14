import type { EnhancedMarkdownProps } from '@/lib/markdown-enhancements';
import type { AttachedFileMeta } from '@/stores/chat';
import type { ExtractedImage, LightboxImage, StreamingToolStatus } from '../../types';

export interface AssistantToolEntry {
  id: string;
  input: unknown;
  name: string;
}

export interface AssistantProtocolAboveProps {
  isStreaming: boolean;
  markdownProps: EnhancedMarkdownProps;
  showThinking: boolean;
  streamingTools: StreamingToolStatus[];
  thinking: string | null;
  tools: AssistantToolEntry[];
}

export interface AssistantProtocolBelowProps {
  attachedFiles: AttachedFileMeta[];
  images: ExtractedImage[];
  onPreview: (payload: LightboxImage) => void;
}
