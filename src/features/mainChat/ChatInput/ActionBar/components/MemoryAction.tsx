import { Brain } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { labPreferSelectors, useSettingsStore } from '@/stores/settings';
import { chatInputStoreSelectors, useChatInputStore } from '../../store';
import { ActionWrapper } from './ActionWrapper';

export function MemoryAction() {
  const memoryEnabled = useSettingsStore(labPreferSelectors.enabled('memory'));
  const memoryTurnEnabled = useChatInputStore(chatInputStoreSelectors.memoryTurnEnabled);
  const setMemoryTurnEnabled = useChatInputStore((s) => s.setMemoryTurnEnabled);

  const handleClick = useCallback(() => {
    if (!memoryEnabled) return;
    const next = !memoryTurnEnabled;
    setMemoryTurnEnabled(next);
    toast.success(next ? 'Memory enabled for this turn' : 'Memory disabled for this turn');
  }, [memoryEnabled, memoryTurnEnabled, setMemoryTurnEnabled]);

  return (
    <ActionWrapper
      active={memoryTurnEnabled}
      disabled={!memoryEnabled}
      icon={Brain}
      onClick={handleClick}
      title="Memory"
    />
  );
}
