import type { ActionHandlerContext } from '../context';

export async function handleModelAction({
  defaultAccountId,
  enabledModels,
  setDefaultAccount,
}: ActionHandlerContext) {
  if (enabledModels.length === 0) return;
  const currentIndex = enabledModels.findIndex((item) => item.id === defaultAccountId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % enabledModels.length : 0;
  const nextModel = enabledModels[nextIndex];
  if (!nextModel) return;
  await setDefaultAccount(nextModel.id);
}
