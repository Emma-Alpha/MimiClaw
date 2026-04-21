import { ActionIcon, Alert, Flexbox } from '@lobehub/ui';
import { Play, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useChatStore, queueSelectors } from '@/stores/chat';

export function QueueTray({ sessionKey }: { sessionKey: string }) {
  const queuedMessages = useChatStore(queueSelectors.queuedMessages(sessionKey));
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sending = useChatStore((s) => s.sending);
  const autoFlushingRef = useRef(false);

  const removeQueuedMessage = useCallback((id: string) => {
    useChatStore.setState((state) => ({
      queuedMessages: {
        ...state.queuedMessages,
        [sessionKey]: (state.queuedMessages[sessionKey] ?? []).filter((item) => item.id !== id),
      },
    }));
  }, [sessionKey]);

  const clearQueuedMessages = useCallback(() => {
    useChatStore.setState((state) => ({
      queuedMessages: {
        ...state.queuedMessages,
        [sessionKey]: [],
      },
    }));
  }, [sessionKey]);

  const sendQueuedMessageNow = useCallback(async (id: string) => {
    if (autoFlushingRef.current) return;
    const item = useChatStore.getState().queuedMessages[sessionKey]?.find((queued) => queued.id === id);
    if (!item) return;
    autoFlushingRef.current = true;
    try {
      await sendMessage({
        files: item.attachments,
        message: item.message,
      });
      removeQueuedMessage(id);
    } catch (error) {
      console.error('Failed to send queued message:', error);
    } finally {
      autoFlushingRef.current = false;
    }
  }, [removeQueuedMessage, sendMessage, sessionKey]);

  useEffect(() => {
    const next = queuedMessages[0];
    if (!next || sending || autoFlushingRef.current) return;
    autoFlushingRef.current = true;

    void (async () => {
      try {
        await sendMessage({
          files: next.attachments,
          message: next.message,
        });
        removeQueuedMessage(next.id);
      } catch (error) {
        console.error('Failed to flush queued message:', error);
      } finally {
        autoFlushingRef.current = false;
      }
    })();
  }, [queuedMessages, removeQueuedMessage, sendMessage, sending]);

  if (queuedMessages.length === 0) {
    return null;
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
