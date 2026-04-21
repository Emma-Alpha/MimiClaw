import type { ActionHandlerContext } from '../context';

export async function handleFileUploadAction({ pickFiles }: ActionHandlerContext) {
  await pickFiles();
}
