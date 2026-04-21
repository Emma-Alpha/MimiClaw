import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSettingsActions } from './action';
import { initialSettingsState } from './initialState';
import type { SettingsStore } from './types';

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...initialSettingsState,
      ...createSettingsActions(set, get),
    }),
    {
      name: 'mimiclaw-settings',
    },
  ),
);
