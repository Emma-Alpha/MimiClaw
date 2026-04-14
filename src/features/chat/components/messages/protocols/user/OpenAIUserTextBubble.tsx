import type { UserTextBubbleProps } from './types';

export function OpenAIUserTextBubble({ className, text }: UserTextBubbleProps) {
  return <div className={className}>{text}</div>;
}
