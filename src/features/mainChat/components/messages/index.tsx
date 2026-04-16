import { memo } from 'react';

import { useEnhancedMarkdownProps } from '@/lib/markdown-enhancements';
import type { RawMessage } from '@/stores/chat';
import {
  extractImages,
  extractText,
  extractThinking,
  extractToolUse,
} from '../../lib/message-utils';
import { detectMessageProtocol } from './protocols/detectMessageProtocol';
import { AssistantMessage } from './AssistantMessage';
import { ToolResultMessage } from './ToolResultMessage';
import type { StreamingToolStatus } from './types';
import { UserMessage } from './UserMessage';

export interface ChatMessageProps {
  isStreaming?: boolean;
  message: RawMessage;
  showThinking: boolean;
  streamingTools?: StreamingToolStatus[];
}

export const ChatMessage = memo(function ChatMessage({
  isStreaming = false,
  message,
  showThinking,
  streamingTools = [],
}: ChatMessageProps) {
  const markdownProps = useEnhancedMarkdownProps();

  const isUser = message.role === 'user';
  const role = typeof message.role === 'string' ? message.role.toLowerCase() : '';
  const isToolResult = role === 'toolresult' || role === 'tool_result';
  const protocol = detectMessageProtocol(message);

  const text = extractText(message);
  const hasText = text.trim().length > 0;
  const thinking = extractThinking(message);
  const visibleThinking = showThinking ? thinking : null;
  const images = extractImages(message);
  const tools = extractToolUse(message);
  const attachedFiles = message._attachedFiles || [];
  const hasStreamingToolStatus = isStreaming && streamingTools.length > 0;

  if (isToolResult) {
    return <ToolResultMessage message={message} />;
  }

  if (
    !hasText
    && !visibleThinking
    && images.length === 0
    && tools.length === 0
    && attachedFiles.length === 0
    && !hasStreamingToolStatus
  ) {
    return null;
  }

  if (isUser) {
    return (
      <UserMessage
        attachedFiles={attachedFiles}
        hasText={hasText}
        images={images}
        message={message}
        protocol={protocol}
        text={text}
      />
    );
  }

  return (
    <AssistantMessage
      attachedFiles={attachedFiles}
      hasText={hasText}
      images={images}
      isStreaming={isStreaming}
      markdownProps={markdownProps}
      message={message}
      protocol={protocol}
      showThinking={showThinking}
      streamingTools={streamingTools}
      text={text}
      thinking={thinking}
      tools={tools}
    />
  );
});
