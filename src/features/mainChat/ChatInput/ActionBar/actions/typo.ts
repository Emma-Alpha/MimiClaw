import type { ActionHandlerContext } from '../context';

export function handleTypoAction({ setExpanded }: ActionHandlerContext) {
  setExpanded(true);
}
