import type { ReactNode } from 'react';

export interface MetaData {
  avatar?: string | ReactNode;
  title?: string;
  backgroundColor?: string;
}

export interface ModelPerformance {
  /** Time to first token in milliseconds */
  ttft?: number;
  /** Tokens per second */
  tps?: number;
}

export interface ModelUsage {
  // Basic counts (always available)
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  // Detailed input breakdown
  totalInputTokens?: number;
  inputTextTokens?: number;
  inputAudioTokens?: number;
  inputCitationTokens?: number;
  inputCachedTokens?: number;
  inputWriteCacheTokens?: number;
  inputCacheMissTokens?: number;
  inputToolTokens?: number;
  // Detailed output breakdown
  totalOutputTokens?: number;
  outputTextTokens?: number;
  outputReasoningTokens?: number;
  outputAudioTokens?: number;
  outputImageTokens?: number;
}

export interface ChatItemProps {
  id?: string;
  avatar: MetaData;
  time?: number;
  showTitle?: boolean;
  showAvatar?: boolean;
  message?: ReactNode;
  messageExtra?: ReactNode;
  actions?: ReactNode;
  placement?: 'left' | 'right';
  loading?: boolean;
  editing?: boolean;
  error?: {
    message?: string;
    type?: 'error' | 'warning' | 'info';
  };
  model?: string;
  provider?: string;
  usage?: ModelUsage;
  performance?: ModelPerformance;
  className?: string;
  style?: React.CSSProperties;
  onAvatarClick?: () => void;
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
}
