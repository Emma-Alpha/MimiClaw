export interface ChatUploadFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  stagedPath: string;
  preview: string | null;
  status: 'staging' | 'ready' | 'error';
  error?: string;
}

export interface ChatContextContent {
  id: string;
  type: 'file' | 'text';
  title?: string;
  content?: string;
}

export interface UploadJob {
  id: string;
  fileName: string;
  status: 'queued' | 'staging' | 'ready' | 'error';
  stagedPath?: string;
  error?: string;
}

export interface FileStoreState {
  chatUploadFileList: ChatUploadFile[];
  chatContextSelections: ChatContextContent[];
  uploadQueue: Map<string, UploadJob>;
}

export interface FileStoreAction {
  setChatContextSelections: (items: ChatContextContent[]) => void;
  addChatUploadFiles: (files: ChatUploadFile[]) => void;
  removeChatUploadFile: (id: string) => void;
  clearChatUploadFiles: () => void;
  clearUploadQueue: () => void;
  stagePathFiles: (filePaths: string[]) => Promise<ChatUploadFile[]>;
  stageBufferFile: (file: File) => Promise<ChatUploadFile>;
}

export type FileStore = FileStoreState & FileStoreAction;

export type FileStatePublic = Pick<FileStore, keyof FileStoreAction>;

export interface StagedFilePayload {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  stagedPath: string;
  preview: string | null;
}
