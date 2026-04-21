import { ActionIcon, Alert, Empty, Flexbox } from '@lobehub/ui';
import { Play, Trash2, X } from 'lucide-react';
import { useChatStore, queueSelectors } from '@/stores/chat';

export function QueueTray({ sessionKey }: { sessionKey: string }) {
  const queuedMessages = useChatStore(queueSelectors.queuedMessages(sessionKey));
  const sendMessage = useChatStore((s) => s.sendMessage);

  const removeQueuedMessage = (id: string) => {
    useChatStore.setState((state) => ({
      queuedMessages: {
        ...state.queuedMessages,
        [sessionKey]: (state.queuedMessages[sessionKey] ?? []).filter((item) => item.id !== id),
      },
    }));
  };

  const clearQueuedMessages = () => {
    useChatStore.setState((state) => ({
      queuedMessages: {
        ...state.queuedMessages,
        [sessionKey]: [],
      },
    }));
  };

  const sendQueuedMessageNow = async (id: string) => {
    const item = useChatStore.getState().queuedMessages[sessionKey]?.find((queued) => queued.id === id);
    if (!item) return;
    await sendMessage(item.message, item.attachments, item.targetAgentId);
    removeQueuedMessage(id);
  };

  if (queuedMessages.length === 0) {
    return <Empty description="No queued messages" />;
  }

  return (
    <Flexbox gap={8}>
      <Flexbox align="center" horizontal justify="space-between">
        <span style={{ fontSize: 12, opacity: 0.7 }}>Queued messages</span>
        <ActionIcon icon={Trash2} onClick={clearQueuedMessages} size="small" title="Clear queue" />
      </Flexbox>
      {queuedMessages.map((item) => (
        <Alert
          key={item.id}
          extra={(
            <Flexbox align="center" gap={8} horizontal>
              <ActionIcon icon={Play} onClick={() => void sendQueuedMessageNow(item.id)} size="small" title="Send now" />
              <ActionIcon icon={X} onClick={() => removeQueuedMessage(item.id)} size="small" title="Discard queued message" />
            </Flexbox>
          )}
          message={item.message || 'Queued attachment'}
          type="info"
        />
      ))}
    </Flexbox>
  );
}
