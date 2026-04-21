import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createFileSlice } from './action';
import { initialFileState } from './initialState';
import type { FileStore, FileStoreAction } from './types';

export const useFileStore = createWithEqualityFn<FileStore>()(
  (...params) => ({
    ...initialFileState,
    ...flattenActions<FileStoreAction>([
      createFileSlice(...params),
    ]),
  }),
  shallow,
);
