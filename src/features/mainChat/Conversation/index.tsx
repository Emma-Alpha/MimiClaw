import type { ChatInputActionKey } from '../ChatInput/types';
import { ConversationView } from '../components/ConversationView';
import { ConversationChatInput } from './ChatInput';
import { ConversationProvider } from './ConversationProvider';
import { InterventionBar } from './InterventionBar';
import { ConversationStoreUpdater } from './StoreUpdater';

export function MainConversationInput({
  agentId,
  leftActions,
  rightActions,
  sessionId,
  topicId,
}: {
  agentId: string;
  leftActions?: ChatInputActionKey[];
  rightActions?: ChatInputActionKey[];
  sessionId: string;
  topicId: string | null;
}) {
  return (
    <ConversationProvider
      agentId={agentId}
      leftActions={leftActions}
      rightActions={rightActions}
      sessionId={sessionId}
      topicId={topicId}
    >
      <ConversationStoreUpdater />
      <InterventionBar />
      <ConversationChatInput />
    </ConversationProvider>
  );
}

export { ConversationView };
