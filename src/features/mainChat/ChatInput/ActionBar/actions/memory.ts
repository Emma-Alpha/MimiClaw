import { toast } from 'sonner';
import type { ActionHandlerContext } from '../context';

export function handleMemoryAction({
  memoryEnabled,
  memoryTurnEnabled,
  setMemoryTurnEnabled,
}: ActionHandlerContext) {
  if (!memoryEnabled) return;
  const next = !memoryTurnEnabled;
  setMemoryTurnEnabled(next);
  toast.success(next ? 'Memory enabled for this turn' : 'Memory disabled for this turn');
}
