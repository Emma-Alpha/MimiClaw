import { hostApiFetch } from '@/lib/host-api';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type {
  ChatContextContent,
  ChatUploadFile,
  FileStore,
  FileStoreAction,
  StagedFilePayload,
} from './types';

type Setter = StoreSetter<FileStore>;
type Getter = StoreGetter<FileStore>;

async function readFileAsBase64(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new Error(`Empty base64 for ${file.name}`));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Failed to read: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export class FileActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  setChatContextSelections = (items: ChatContextContent[]) => {
    this.#set({ chatContextSelections: items });
  };

  addChatUploadFiles = (files: ChatUploadFile[]) => {
    this.#set((state) => ({
      chatUploadFileList: [...state.chatUploadFileList, ...files],
    }));
  };

  removeChatUploadFile = (id: string) => {
    this.#set((state) => ({
      chatUploadFileList: state.chatUploadFileList.filter((file) => file.id !== id),
      uploadQueue: new Map([...state.uploadQueue].filter(([key]) => key !== id)),
    }));
  };

  clearChatUploadFiles = () => {
    this.#set({ chatUploadFileList: [] });
  };

  clearUploadQueue = () => {
    this.#set({ uploadQueue: new Map() });
  };

  stagePathFiles = async (filePaths: string[]): Promise<ChatUploadFile[]> => {
    if (filePaths.length === 0) return [];

    const tempUploads = filePaths.map((filePath) => {
      const id = crypto.randomUUID();
      const fileName = filePath.split(/[\\/]/).pop() || 'file';
      return {
        id,
        fileName,
        mimeType: '',
        fileSize: 0,
        stagedPath: '',
        preview: null,
        status: 'staging' as const,
      };
    });

    const nextQueue = new Map(this.#get().uploadQueue);
    for (const file of tempUploads) {
      nextQueue.set(file.id, {
        id: file.id,
        fileName: file.fileName,
        status: 'staging',
      });
    }

    this.#set((state) => ({
      chatUploadFileList: [...state.chatUploadFileList, ...tempUploads],
      uploadQueue: nextQueue,
    }));

    try {
      const staged = await hostApiFetch<StagedFilePayload[]>('/api/files/stage-paths', {
        method: 'POST',
        body: JSON.stringify({ filePaths }),
      });

      const byTempId = new Map<string, StagedFilePayload | undefined>(
        tempUploads.map((file, index) => [file.id, staged[index]]),
      );

      this.#set((state) => {
        const uploadQueue = new Map(state.uploadQueue);
        const chatUploadFileList = state.chatUploadFileList.map((file) => {
          const payload = byTempId.get(file.id);
          if (!payload) {
            uploadQueue.set(file.id, {
              id: file.id,
              fileName: file.fileName,
              status: 'error',
              error: 'Staging failed',
            });
            return {
              ...file,
              status: 'error' as const,
              error: 'Staging failed',
            };
          }

          uploadQueue.set(file.id, {
            id: payload.id,
            fileName: payload.fileName,
            status: 'ready',
            stagedPath: payload.stagedPath,
          });

          return {
            ...payload,
            status: 'ready' as const,
          };
        });

        return { chatUploadFileList, uploadQueue };
      });

      return this.#get().chatUploadFileList.filter((file) =>
        tempUploads.some((temp) => temp.id === file.id),
      );
    } catch (error) {
      this.#set((state) => {
        const uploadQueue = new Map(state.uploadQueue);
        const chatUploadFileList = state.chatUploadFileList.map((file) => {
          if (!tempUploads.some((temp) => temp.id === file.id)) return file;

          uploadQueue.set(file.id, {
            id: file.id,
            fileName: file.fileName,
            status: 'error',
            error: String(error),
          });

          return {
            ...file,
            status: 'error' as const,
            error: String(error),
          };
        });
        return { chatUploadFileList, uploadQueue };
      });
      throw error;
    }
  };

  stageBufferFile = async (file: File): Promise<ChatUploadFile> => {
    const tempId = crypto.randomUUID();
    const placeholder: ChatUploadFile = {
      id: tempId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      stagedPath: '',
      preview: null,
      status: 'staging',
    };

    this.#set((state) => {
      const uploadQueue = new Map(state.uploadQueue);
      uploadQueue.set(tempId, {
        id: tempId,
        fileName: file.name,
        status: 'staging',
      });

      return {
        chatUploadFileList: [...state.chatUploadFileList, placeholder],
        uploadQueue,
      };
    });

    try {
      const base64 = await readFileAsBase64(file);
      const staged = await hostApiFetch<StagedFilePayload>('/api/files/stage-buffer', {
        method: 'POST',
        body: JSON.stringify({
          base64,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
        }),
      });

      const readyFile: ChatUploadFile = {
        ...staged,
        status: 'ready',
      };

      this.#set((state) => {
        const uploadQueue = new Map(state.uploadQueue);
        uploadQueue.set(tempId, {
          id: tempId,
          fileName: file.name,
          status: 'ready',
          stagedPath: staged.stagedPath,
        });

        return {
          chatUploadFileList: state.chatUploadFileList.map((item) =>
            item.id === tempId ? readyFile : item,
          ),
          uploadQueue,
        };
      });

      return readyFile;
    } catch (error) {
      this.#set((state) => {
        const uploadQueue = new Map(state.uploadQueue);
        uploadQueue.set(tempId, {
          id: tempId,
          fileName: file.name,
          status: 'error',
          error: String(error),
        });

        return {
          chatUploadFileList: state.chatUploadFileList.map((item) =>
            item.id === tempId
              ? { ...item, status: 'error' as const, error: String(error) }
              : item,
          ),
          uploadQueue,
        };
      });
      throw error;
    }
  };
}

export type FileAction = StorePublicActions<FileActionImpl>;

export const createFileSlice = (set: Setter, get: Getter, api?: unknown): FileStoreAction =>
  new FileActionImpl(set, get, api);
