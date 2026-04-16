import type { UserTextBubbleProps } from './types';

export function GenericUserTextBubble({ className, text }: UserTextBubbleProps) {
  return <div className={className}>{text}</div>;
}
