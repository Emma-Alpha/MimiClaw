import { Alert, Flexbox } from '@lobehub/ui';
import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
import { useSkillsStore } from '@/stores/skills';
import { ChatInput } from '../../ChatInput';
import { chatInputStoreSelectors, useChatInputStore } from '../../ChatInput/store';
import type { ChatInputEditorApi } from '../../ChatInput/types';
import { useConversationContext } from '../ConversationProvider';
import { QueueTray } from './QueueTray';

export function ConversationChatInput() {
  const { agentId, error, isInputLoading, leftActions, mentionItems, rightActions, sessionId, sendMessage, stopGenerating } = useConversationContext();
  const enqueueMessage = useChatStore((s) => s.enqueueMessage);
  const gatewayStatus = useGatewayStore((s) => s.status);
  const searchEnabled = useChatInputStore(chatInputStoreSelectors.searchEnabled);
  const memoryTurnEnabled = useChatInputStore(chatInputStoreSelectors.memoryTurnEnabled);
  const historyCount = useChatInputStore(chatInputStoreSelectors.historyCount);
  const modelParams = useChatInputStore(chatInputStoreSelectors.modelParams);
  const enabledSkills = useSkillsStore(useShallow((s) => s.skills.filter((skill) => skill.enabled).map((skill) => skill.id)));
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
        onSend={async ({ attachments, clearAttachments, clearContent, getEditorData, getMarkdownContent }) => {
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
          if (isInputLoading) {
            enqueueMessage(sessionId, {
              message: markdown,
              attachments: readyAttachments,
            });
            clearContent();
            clearAttachments();
            return;
          }
          const editorData = getEditorData();
          const runtimeOptions = {
            enabledSkills,
            historyCount,
            memoryTurnEnabled,
            modelParams,
            searchEnabled,
          };

          await sendMessage({
            editorData: {
              ...(editorData || {}),
              __mimiRuntime: runtimeOptions,
            },
            files: readyAttachments,
            message: markdown,
            pageSelections: [],
          });
          clearContent();
          clearAttachments();
        }}
        onStop={stopGenerating}
        sending={isInputLoading}
      />
    </Flexbox>
  );
}
