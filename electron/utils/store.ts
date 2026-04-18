/**
 * Persistent Storage
 * Electron-store wrapper for application settings
 */

import { randomBytes } from 'crypto';
import { app } from 'electron';
import { DEFAULT_CODE_AGENT_RUNTIME_CONFIG, type CodeAgentRuntimeConfig } from '../../shared/code-agent';
import { resolveSupportedLanguage } from '../../shared/language';
import type { StoredPetCompanion } from '../../shared/pet-companion';
import { DEFAULT_PET_ANIMATION, type PetAnimation } from '../../shared/pet';

// Lazy-load electron-store (ESM module)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let settingsStoreInstance: any = null;

/**
 * Generate a random token for gateway authentication
 */
function generateToken(): string {
  return `mimiclaw-${randomBytes(16).toString('hex')}`;
}

/**
 * Application settings schema
 */
export interface AppSettings {
  // General
  theme: 'light' | 'dark' | 'system';
  language: string;
  primaryColor?: string;
  neutralColor?: string;
  fontSize: number;
  highlighterTheme: string;
  mermaidTheme: string;
  transitionMode: 'none' | 'fadeIn' | 'smooth';
  animationMode: 'disabled' | 'agile' | 'elegant';
  contextMenuMode: 'disabled' | 'default';
  responseLanguage: string;
  enableAutoScrollOnStreaming: boolean;
  startMinimized: boolean;
  launchAtStartup: boolean;
  telemetryEnabled: boolean;
  petEnabled: boolean;
  petAnimation: PetAnimation;
  petCompanionSeed: string;
  petCompanion: StoredPetCompanion | null;
  xiaojiuEnabled: boolean;
  jizhiEnabled: boolean;
  machineId: string;
  hasReportedInstall: boolean;

  // Gateway
  gatewayAutoStart: boolean;
  gatewayPort: number;
  gatewayToken: string;
  /** When set, skip local process and connect to this remote gateway WebSocket URL */
  remoteGatewayUrl: string;
  /** Optional auth token for the remote gateway */
  remoteGatewayToken: string;
  /** Cloud control-plane API base URL (e.g. http://localhost:3000) */
  cloudApiUrl: string;
  /** JWT token obtained after cloud login, used by main-process cloud API calls */
  cloudApiToken: string;
  /** Session cookie value (jizhi_token) obtained after Jizhi website login */
  jizhiToken: string;
  proxyEnabled: boolean;
  proxyServer: string;
  proxyHttpServer: string;
  proxyHttpsServer: string;
  proxyAllServer: string;
  proxyBypassRules: string;
  codeAgent: CodeAgentRuntimeConfig;

  // Update
  updateChannel: 'stable' | 'beta' | 'dev';
  autoCheckUpdate: boolean;
  autoDownloadUpdate: boolean;
  skippedVersions: string[];

  // UI State
  sidebarCollapsed: boolean;
  sidebarThreadWorkspaces: Array<{
    id: string;
    rootPath: string;
    name: string;
    createdAt: number;
    lastUsedAt: number;
  }>;
  sidebarThreadWorkspaceExpanded: Record<string, boolean>;
  devModeUnlocked: boolean;

  // Presets
  selectedBundles: string[];
  enabledSkills: string[];
  disabledSkills: string[];
}

/**
 * Default settings
 */
function getSystemLocale(): string {
  const preferredLanguages = typeof app.getPreferredSystemLanguages === 'function'
    ? app.getPreferredSystemLanguages()
    : [];
  return preferredLanguages[0]
    || (typeof app.getLocale === 'function' ? app.getLocale() : '')
    || Intl.DateTimeFormat().resolvedOptions().locale
    || 'en';
}

function createDefaultSettings(): AppSettings {
  return {
    // General
    theme: 'system',
    language: resolveSupportedLanguage(getSystemLocale()),
    fontSize: 14,
    highlighterTheme: 'lobe-theme',
    mermaidTheme: 'lobe-theme',
    transitionMode: 'smooth',
    animationMode: 'agile',
    contextMenuMode: 'default',
    responseLanguage: '',
    enableAutoScrollOnStreaming: true,
    startMinimized: false,
    launchAtStartup: false,
    telemetryEnabled: true,
    petEnabled: true,
    petAnimation: DEFAULT_PET_ANIMATION,
    petCompanionSeed: '',
    petCompanion: null,
    xiaojiuEnabled: false,
    jizhiEnabled: false,
    machineId: '',
    hasReportedInstall: false,

    // Gateway
    gatewayAutoStart: true,
    gatewayPort: 18789,
    gatewayToken: generateToken(),
    remoteGatewayUrl: '',
    remoteGatewayToken: '',
    cloudApiUrl: '',
    cloudApiToken: '',
    jizhiToken: '',
    proxyEnabled: false,
    proxyServer: '',
    proxyHttpServer: '',
    proxyHttpsServer: '',
    proxyAllServer: '',
    proxyBypassRules: '<local>;localhost;127.0.0.1;::1',
    codeAgent: { ...DEFAULT_CODE_AGENT_RUNTIME_CONFIG },

    // Update
    updateChannel: 'stable',
    autoCheckUpdate: true,
    autoDownloadUpdate: false,
    skippedVersions: [],

    // UI State
    sidebarCollapsed: false,
    sidebarThreadWorkspaces: [],
    sidebarThreadWorkspaceExpanded: {},
    devModeUnlocked: false,

    // Presets
    selectedBundles: ['productivity', 'developer'],
    enabledSkills: [],
    disabledSkills: [],
  };
}

/**
 * Get the settings store instance (lazy initialization)
 */
async function getSettingsStore() {
  if (!settingsStoreInstance) {
    const Store = (await import('electron-store')).default;
    settingsStoreInstance = new Store<AppSettings>({
      name: 'settings',
      defaults: createDefaultSettings(),
    });
  }
  return settingsStoreInstance;
}

/**
 * Get a setting value
 */
export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const store = await getSettingsStore();
  return store.get(key);
}

/**
 * Set a setting value
 */
export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const store = await getSettingsStore();
  if (value === undefined) {
    store.delete(key);
    return;
  }
  store.set(key, value);
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<AppSettings> {
  const store = await getSettingsStore();
  return store.store;
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<void> {
  const store = await getSettingsStore();
  store.clear();
}

/**
 * Export settings to JSON
 */
export async function exportSettings(): Promise<string> {
  const store = await getSettingsStore();
  return JSON.stringify(store.store, null, 2);
}

/**
 * Import settings from JSON
 */
export async function importSettings(json: string): Promise<void> {
  try {
    const settings = JSON.parse(json);
    const store = await getSettingsStore();
    store.set(settings);
  } catch {
    throw new Error('Invalid settings JSON');
  }
}
