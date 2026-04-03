/**
 * Settings State Store
 * Manages application settings
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';
import { hostApiFetch } from '@/lib/host-api';
import { DEFAULT_CODE_AGENT_RUNTIME_CONFIG, type CodeAgentRuntimeConfig } from '../../shared/code-agent';
import { resolveSupportedLanguage } from '../../shared/language';
import {
  normalizePetCompanion,
  type StoredPetCompanion,
} from '../../shared/pet-companion';
import { DEFAULT_PET_ANIMATION, type PetAnimation } from '../../shared/pet';
import {
  cloudLogin,
  cloudLogout,
  getCloudApiBase,
  getCloudSession,
  setCloudSession,
  isCloudSessionValid,
  type CloudSession,
} from '@/lib/cloud-api';

type Theme = 'light' | 'dark' | 'system';
type UpdateChannel = 'stable' | 'beta' | 'dev';

// ---------------------------------------------------------------------------
// Cloud auth / bootstrap state — kept separate from local UI preferences so
// login readiness and local prefs can evolve independently.
// ---------------------------------------------------------------------------

export interface CloudAuthState {
  /** Whether the user has successfully authenticated with the cloud. */
  cloudLoggedIn: boolean;
  /** Whether the cloud workspace bootstrap (runtime provisioning) is done. */
  cloudBootstrapped: boolean;
  /** Opaque auth token — NOT persisted in zustand/localStorage, lives in cloud-api. */
  cloudUserId: string | null;
  cloudWorkspaceId: string | null;
}

interface SettingsState extends CloudAuthState {
  // General
  theme: Theme;
  language: string;
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

  // Gateway
  gatewayAutoStart: boolean;
  gatewayPort: number;
  /** Remote gateway WebSocket URL. When set, the local process is skipped. */
  remoteGatewayUrl: string;
  /** Optional auth token for the remote gateway. */
  remoteGatewayToken: string;
  proxyEnabled: boolean;
  proxyServer: string;
  proxyHttpServer: string;
  proxyHttpsServer: string;
  proxyAllServer: string;
  proxyBypassRules: string;
  codeAgent: CodeAgentRuntimeConfig;

  // Update
  updateChannel: UpdateChannel;
  autoCheckUpdate: boolean;
  autoDownloadUpdate: boolean;

  // UI State
  sidebarCollapsed: boolean;
  devModeUnlocked: boolean;

  // Setup
  setupComplete: boolean;

  // Actions
  init: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;
  setStartMinimized: (value: boolean) => void;
  setLaunchAtStartup: (value: boolean) => void;
  setTelemetryEnabled: (value: boolean) => void;
  setPetEnabled: (value: boolean) => void;
  setPetAnimation: (value: PetAnimation) => void;
  setPetCompanion: (value: StoredPetCompanion, seed?: string) => void;
  setXiaojiuEnabled: (value: boolean) => void;
  setJizhiEnabled: (value: boolean) => void;
  setGatewayAutoStart: (value: boolean) => void;
  setGatewayPort: (port: number) => void;
  setRemoteGatewayUrl: (url: string) => void;
  setRemoteGatewayToken: (token: string) => void;
  setProxyEnabled: (value: boolean) => void;
  setProxyServer: (value: string) => void;
  setProxyHttpServer: (value: string) => void;
  setProxyHttpsServer: (value: string) => void;
  setProxyAllServer: (value: string) => void;
  setProxyBypassRules: (value: string) => void;
  setCodeAgent: (value: CodeAgentRuntimeConfig) => void;
  setUpdateChannel: (channel: UpdateChannel) => void;
  setAutoCheckUpdate: (value: boolean) => void;
  setAutoDownloadUpdate: (value: boolean) => void;
  setSidebarCollapsed: (value: boolean) => void;
  setDevModeUnlocked: (value: boolean) => void;
  markSetupComplete: () => void;
  resetSettings: () => void;

  // Cloud auth actions
  loginCloud: (username: string, password: string) => Promise<void>;
  logoutCloud: () => Promise<void>;
  markCloudBootstrapped: () => void;
  /** Re-hydrate cloud auth state from persisted session token on startup. */
  hydrateCloudAuth: () => void;
  applyCloudSession: (session: CloudSession) => void;
}

const defaultSettings = {
  theme: 'system' as Theme,
  language: resolveSupportedLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined),
  startMinimized: false,
  launchAtStartup: false,
  telemetryEnabled: true,
  petEnabled: true,
  petAnimation: DEFAULT_PET_ANIMATION,
  petCompanionSeed: '',
  petCompanion: null as StoredPetCompanion | null,
  xiaojiuEnabled: false,
  jizhiEnabled: false,
  machineId: '',
  gatewayAutoStart: true,
  gatewayPort: 18789,
  remoteGatewayUrl: '',
  remoteGatewayToken: '',
  proxyEnabled: false,
  proxyServer: '',
  proxyHttpServer: '',
  proxyHttpsServer: '',
  proxyAllServer: '',
  proxyBypassRules: '<local>;localhost;127.0.0.1;::1',
  codeAgent: { ...DEFAULT_CODE_AGENT_RUNTIME_CONFIG },
  updateChannel: 'stable' as UpdateChannel,
  autoCheckUpdate: true,
  autoDownloadUpdate: false,
  sidebarCollapsed: false,
  devModeUnlocked: false,
  setupComplete: false,
  // Cloud auth defaults — not persisted in zustand store,
  // restored at runtime by hydrateCloudAuth().
  cloudLoggedIn: false,
  cloudBootstrapped: false,
  cloudUserId: null as string | null,
  cloudWorkspaceId: null as string | null,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      init: async () => {
        try {
          const settings = await hostApiFetch<Partial<typeof defaultSettings>>('/api/settings');
          const codeAgent = settings.codeAgent
            ? {
                ...settings.codeAgent,
                permissionMode: settings.codeAgent.permissionMode === 'default'
                  ? DEFAULT_CODE_AGENT_RUNTIME_CONFIG.permissionMode
                  : settings.codeAgent.permissionMode,
              }
            : undefined;
          const petCompanion = settings.petCompanion
            ? normalizePetCompanion(settings.petCompanion)
            : null;
          const resolvedLanguage = settings.language
            ? resolveSupportedLanguage(settings.language)
            : undefined;
          set((state) => ({
            ...state,
            ...settings,
            ...(codeAgent ? { codeAgent } : {}),
            ...(petCompanion ? { petCompanion } : {}),
            ...(resolvedLanguage ? { language: resolvedLanguage } : {}),
          }));
          if (resolvedLanguage) {
            i18n.changeLanguage(resolvedLanguage);
          }
        } catch {
          // Keep renderer-persisted settings as a fallback when the main
          // process store is not reachable.
        }
      },

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => {
        const resolvedLanguage = resolveSupportedLanguage(language);
        i18n.changeLanguage(resolvedLanguage);
        set({ language: resolvedLanguage });
        void hostApiFetch('/api/settings/language', {
          method: 'PUT',
          body: JSON.stringify({ value: resolvedLanguage }),
        }).catch(() => { });
      },
      setStartMinimized: (startMinimized) => set({ startMinimized }),
      setLaunchAtStartup: (launchAtStartup) => {
        set({ launchAtStartup });
        void hostApiFetch('/api/settings/launchAtStartup', {
          method: 'PUT',
          body: JSON.stringify({ value: launchAtStartup }),
        }).catch(() => { });
      },
      setTelemetryEnabled: (telemetryEnabled) => {
        set({ telemetryEnabled });
        void hostApiFetch('/api/settings/telemetryEnabled', {
          method: 'PUT',
          body: JSON.stringify({ value: telemetryEnabled }),
        }).catch(() => { });
      },
      setPetEnabled: (petEnabled) => {
        set({ petEnabled });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ petEnabled }),
        }).catch(() => { });
      },
      setPetAnimation: (petAnimation) => {
        set({ petAnimation });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ petAnimation }),
        }).catch(() => { });
      },
      setPetCompanion: (petCompanion, seed) => {
        const normalizedCompanion = normalizePetCompanion(petCompanion);
        const patch = {
          petCompanion: normalizedCompanion,
          petCompanionSeed: seed ?? normalizedCompanion.seed,
        };
        set(patch);
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify(patch),
        }).catch(() => { });
      },
      setXiaojiuEnabled: (xiaojiuEnabled) => {
        set({ xiaojiuEnabled });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ xiaojiuEnabled }),
        }).catch(() => { });
      },
      setJizhiEnabled: (jizhiEnabled) => {
        set({ jizhiEnabled });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ jizhiEnabled }),
        }).catch(() => { });
      },
      setGatewayAutoStart: (gatewayAutoStart) => {
        set({ gatewayAutoStart });
        void hostApiFetch('/api/settings/gatewayAutoStart', {
          method: 'PUT',
          body: JSON.stringify({ value: gatewayAutoStart }),
        }).catch(() => { });
      },
      setGatewayPort: (gatewayPort) => {
        set({ gatewayPort });
        void hostApiFetch('/api/settings/gatewayPort', {
          method: 'PUT',
          body: JSON.stringify({ value: gatewayPort }),
        }).catch(() => { });
      },
      setRemoteGatewayUrl: (remoteGatewayUrl) => {
        set({ remoteGatewayUrl });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ remoteGatewayUrl }),
        }).catch(() => { });
      },
      setRemoteGatewayToken: (remoteGatewayToken) => {
        set({ remoteGatewayToken });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ remoteGatewayToken }),
        }).catch(() => { });
      },
      setProxyEnabled: (proxyEnabled) => set({ proxyEnabled }),
      setProxyServer: (proxyServer) => set({ proxyServer }),
      setProxyHttpServer: (proxyHttpServer) => set({ proxyHttpServer }),
      setProxyHttpsServer: (proxyHttpsServer) => set({ proxyHttpsServer }),
      setProxyAllServer: (proxyAllServer) => set({ proxyAllServer }),
      setProxyBypassRules: (proxyBypassRules) => set({ proxyBypassRules }),
      setCodeAgent: (codeAgent) => {
        set({ codeAgent });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ codeAgent }),
        }).catch(() => { });
      },
      setUpdateChannel: (updateChannel) => set({ updateChannel }),
      setAutoCheckUpdate: (autoCheckUpdate) => set({ autoCheckUpdate }),
      setAutoDownloadUpdate: (autoDownloadUpdate) => set({ autoDownloadUpdate }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setDevModeUnlocked: (devModeUnlocked) => {
        set({ devModeUnlocked });
        void hostApiFetch('/api/settings/devModeUnlocked', {
          method: 'PUT',
          body: JSON.stringify({ value: devModeUnlocked }),
        }).catch(() => { });
      },
      markSetupComplete: () => set({ setupComplete: true }),
      resetSettings: () => set(defaultSettings),

      // ------------------------------------------------------------------
      // Cloud auth actions
      // ------------------------------------------------------------------

      hydrateCloudAuth: () => {
        if (isCloudSessionValid()) {
          const session = getCloudSession();
          set({
            cloudLoggedIn: true,
            cloudUserId: session?.userId ?? null,
            cloudWorkspaceId: session?.workspaceId ?? null,
          });
        } else {
          set({ cloudLoggedIn: false, cloudUserId: null, cloudWorkspaceId: null });
        }
      },

      applyCloudSession: (session: CloudSession) => {
        setCloudSession(session);
        set({
          cloudLoggedIn: true,
          cloudUserId: session.userId,
          cloudWorkspaceId: session.workspaceId,
        });
      },

      loginCloud: async (username: string, password: string) => {
        const session = await cloudLogin(username, password);
        set({
          cloudLoggedIn: true,
          cloudUserId: session.userId,
          cloudWorkspaceId: session.workspaceId,
        });
        // Persist cloud credentials to the main-process settings store so that
        // cloud-config-bridge.ts can use them for server-side API calls.
        const cloudApiBase = (() => {
          try {
            const override = window.localStorage.getItem('clawx:cloud-api-base');
            if (override) return override.replace(/\/$/, '');
          } catch { /* ignore */ }
          return getCloudApiBase();
        })();
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({
            cloudApiUrl: cloudApiBase,
            cloudApiToken: session.token,
          }),
        }).catch(() => { });
      },

      logoutCloud: async () => {
        await cloudLogout();
        set({
          cloudLoggedIn: false,
          cloudBootstrapped: false,
          cloudUserId: null,
          cloudWorkspaceId: null,
        });
        // Clear cloud credentials from main-process settings store.
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ cloudApiUrl: '', cloudApiToken: '' }),
        }).catch(() => { });
      },

      markCloudBootstrapped: () => set({ cloudBootstrapped: true }),
    }),
    {
      name: 'clawx-settings',
    }
  )
);
