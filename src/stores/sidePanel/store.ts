import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { flattenActions } from '@/stores/utils/flattenActions';
import { createSidePanelSlice } from './action';
import { initialSidePanelState } from './initialState';
import type { SidePanelStore, SidePanelAction } from './types';

export const useSidePanelStore = createWithEqualityFn<SidePanelStore>()(
  (...params) => ({
    ...initialSidePanelState,
    ...flattenActions<SidePanelAction>([
      createSidePanelSlice(...params),
    ]),
  }),
  shallow,
);
