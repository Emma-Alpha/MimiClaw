import { toast } from 'sonner';
import type { ActionHandlerContext } from '../context';

const HISTORY_COUNT_STEPS = [0, 8, 16, 32] as const;

export function handleHistoryAction({ historyCount, setHistoryCount }: ActionHandlerContext) {
  const index = HISTORY_COUNT_STEPS.indexOf(historyCount as (typeof HISTORY_COUNT_STEPS)[number]);
  const nextIndex = index >= 0 ? (index + 1) % HISTORY_COUNT_STEPS.length : 1;
  const nextCount = HISTORY_COUNT_STEPS[nextIndex] ?? 8;
  setHistoryCount(nextCount);
  toast.success(
    nextCount > 0
      ? `Include the latest ${nextCount} turns in context`
      : 'History context disabled',
  );
}
