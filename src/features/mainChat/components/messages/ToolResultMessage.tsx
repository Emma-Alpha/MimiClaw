import { extractText } from '../../lib/message-utils';
import type { RawMessage } from '@/stores/chat';
import { ToolResultAccordionItem } from './ToolAccordion';

interface ToolResultMessageProps {
  message: RawMessage;
}

export function ToolResultMessage({ message }: ToolResultMessageProps) {
  const text = extractText(message);
  if (!text) return null;

  return (
    <ToolResultAccordionItem
      toolName={message.toolName}
      result={text}
      isError={message.isError}
      toolCallId={message.toolCallId}
    />
  );
}
