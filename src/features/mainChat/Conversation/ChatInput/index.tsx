import { Alert, Flexbox } from '@lobehub/ui';
import { useRef } from 'react';
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
import { ChatInput } from '../../ChatInput';
import type { ChatInputEditorApi } from '../../ChatInput/types';
import { useConversationContext } from '../ConversationProvider';
import { QueueTray } from './QueueTray';

export function ConversationChatInput() {
  const { agentId, error, isInputLoading, leftActions, mentionItems, rightActions, sessionId, sendMessage, stopGenerating } = useConversationContext();
  const currentTopicId = useChatStore((s) => s.currentTopicId);
  const gatewayStatus = useGatewayStore((s) => s.status);
  const editorRef = useRef<ChatInputEditorApi | null>(null);

  return (
    <Flexbox gap={10} style={{ width: '100%' }}>
      {error ? <Alert message={error} type="error" /> : null}
      <QueueTray sessionKey={sessionId} />
      <ChatInput
        agentId={agentId}
        allowExpand
        chatInputEditorRef={editorRef}
        disabled={gatewayStatus.state !== 'running'}
        leftActions={leftActions}
        mentionItems={mentionItems}
        rightActions={rightActions}
        onSend={async ({ attachments, clearAttachments, clearContent, getMarkdownContent }) => {
          const markdown = getMarkdownContent().trim();
          const readyAttachments = attachments
            .filter((attachment) => attachment.status === 'ready')
            .map(({ fileName, fileSize, mimeType, preview, stagedPath }) => ({
              fileName,
              fileSize,
              mimeType,
              preview,
              stagedPath,
            }));
          if (!markdown && readyAttachments.length === 0) return;
          await sendMessage(markdown, readyAttachments, agentId);
          clearContent();
          clearAttachments();
        }}
        onStop={stopGenerating}
        sending={isInputLoading}
      />
      {currentTopicId ? <div style={{ display: 'none' }}>{currentTopicId}</div> : null}
    </Flexbox>
  );
}
