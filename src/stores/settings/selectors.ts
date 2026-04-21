import type { HotkeyEnum, LabPreferenceSettings, SettingsStore } from './types';

export const preferenceSelectors = {
  useCmdEnterToSend: (state: SettingsStore) => state.preference.useCmdEnterToSend,
  hotkeyById: (id: HotkeyEnum) => (state: SettingsStore) => state.preference.hotkeys[id],
};

export const userGeneralSettingsSelectors = {
  config: (state: SettingsStore) => ({
    isDevMode: state.preference.isDevMode,
  }),
};

export const labPreferSelectors = {
  config: (state: SettingsStore) => state.labPreferences,
  enabled: (key: keyof LabPreferenceSettings) => (state: SettingsStore) => state.labPreferences[key],
};
