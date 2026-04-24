import { Bot } from 'lucide-react';
import { useCallback } from 'react';
import { useChatStore } from '@/stores/chat';
import { ActionWrapper } from './ActionWrapper';

export function AgentModeAction() {
  const mode = useChatStore((s) => s.mode);
  const setChatMode = useChatStore((s) => s.setChatMode);

  const handleClick = useCallback(() => {
    setChatMode(mode === 'agent' ? 'chat' : 'agent');
  }, [mode, setChatMode]);

  return <ActionWrapper active={mode === 'agent'} icon={Bot} onClick={handleClick} title="Agent mode" />;
}
