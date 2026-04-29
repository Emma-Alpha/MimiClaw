import { create } from 'zustand';
import { initialInspectorState } from './initialState';
import { createInspectorActions } from './action';
import type { InspectorStore } from './types';

export const useInspectorStore = create<InspectorStore>()((set, get) => ({
  ...initialInspectorState,
  ...createInspectorActions(set, get),
}));
