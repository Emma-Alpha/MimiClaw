import type { FileStoreState, UploadJob } from './types';

export const initialFileState: FileStoreState = {
  chatUploadFileList: [],
  chatContextSelections: [],
  uploadQueue: new Map<string, UploadJob>(),
};
