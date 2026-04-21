import { ActionIcon, Alert, Flexbox } from '@lobehub/ui';
import { Check, X } from 'lucide-react';
import { useChatStore } from '@/stores/chat';

export function InterventionBar() {
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const pendingInterventions = useChatStore((s) =>
    s.pendingInterventions.filter((item) => item.sessionKey === currentSessionKey),
  );
  const approveIntervention = useChatStore((s) => s.approveIntervention);
  const rejectIntervention = useChatStore((s) => s.rejectIntervention);

  if (pendingInterventions.length === 0) return null;

  return (
    <Flexbox gap={8}>
      {pendingInterventions.map((item) => (
        <Alert
          key={item.id}
          extra={(
            <Flexbox align="center" gap={8} horizontal>
              <ActionIcon icon={Check} onClick={() => approveIntervention(item.id)} size="small" title="Approve tool call" />
              <ActionIcon icon={X} onClick={() => rejectIntervention(item.id)} size="small" title="Reject tool call" />
            </Flexbox>
          )}
          message={`${item.toolName} requires approval`}
          type="warning"
        />
      ))}
    </Flexbox>
  );
}
