import { memo } from 'react';

import type { MentionTag } from '@/components/MentionChip';
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
import { NewAssistantMessage } from './NewAssistantMessage';
import { NewUserMessage } from './NewUserMessage';
import { ToolResultMessage } from './ToolResultMessage';
import type { StreamingToolStatus } from './types';
import { UserMessage } from './UserMessage';
import { SubagentTimelineCard } from '@/features/mainChat/codeAssistant/components/code-agent/SubagentCard';

export interface ChatMessageProps {
  isStreaming?: boolean;
  message: RawMessage;
  showThinking: boolean;
  streamingTools?: StreamingToolStatus[];
  useNewUI?: boolean; // 新增：控制是否使用新 UI
}

export const ChatMessage = memo(function ChatMessage({
  isStreaming = false,
  message,
  showThinking,
  streamingTools = [],
  useNewUI = true, // 默认使用新 UI
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

  // Render subagent task card inline
  if (message._subagentTask) {
    const task = message._subagentTask;
    return (
      <SubagentTimelineCard
        taskId={task.taskId}
        description={task.description}
        parentTaskId={task.parentTaskId}
        endStatus={task.status !== 'running' ? task.status : undefined}
        endSummary={task.summary}
        endDurationMs={task.durationMs}
      />
    );
  }

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
    const mentionTags = message._mentionTags as MentionTag[] | undefined;
    if (useNewUI) {
      return (
        <NewUserMessage
          attachedFiles={attachedFiles}
          hasText={hasText}
          images={images}
          mentionTags={mentionTags}
          message={message}
          protocol={protocol}
          text={text}
        />
      );
    }
    return (
      <UserMessage
        attachedFiles={attachedFiles}
        hasText={hasText}
        images={images}
        mentionTags={mentionTags}
        message={message}
        protocol={protocol}
        text={text}
      />
    );
  }

  if (useNewUI) {
    return (
      <NewAssistantMessage
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
