import type { UserTextBubbleProps } from './types';

export function AnthropicUserTextBubble({ className, text }: UserTextBubbleProps) {
  return <div className={className}>{text}</div>;
}
