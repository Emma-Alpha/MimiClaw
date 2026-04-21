import type { ActionHandlerContext } from '../context';

export function handleAgentModeAction({ mode, setChatMode }: ActionHandlerContext) {
  setChatMode(mode === 'agent' ? 'chat' : 'agent');
}
