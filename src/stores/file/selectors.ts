import type { FileStore } from './types';

export const fileChatSelectors = {
  chatUploadFileListHasItem: (state: FileStore) => state.chatUploadFileList.length > 0,
  chatContextSelectionHasItem: (state: FileStore) => state.chatContextSelections.length > 0,
  isUploadingFiles: (state: FileStore) =>
    [...state.uploadQueue.values()].some((job) => job.status === 'queued' || job.status === 'staging'),
  chatUploadFileList: (state: FileStore) => state.chatUploadFileList,
  chatContextSelections: (state: FileStore) => state.chatContextSelections,
};
