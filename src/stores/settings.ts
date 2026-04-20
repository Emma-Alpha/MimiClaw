/**
 * Settings State Store
 * Manages application settings
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';
import { hostApiFetch } from '@/lib/host-api';
import { clampSidebarWidth, SIDEBAR_DEFAULT_WIDTH } from '@/lib/sidebar-layout';
import { DEFAULT_CODE_AGENT_RUNTIME_CONFIG, type CodeAgentRuntimeConfig } from '../../shared/code-agent';
import {
  clampChatFontSize,
  DEFAULT_APP_THEME_MODE,
  DEFAULT_CHAT_FONT_SIZE,
  DEFAULT_NEUTRAL_COLOR,
} from '../../shared/appearance';
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
  isCloudSessionValid,
  isLocalCloudSession,
  setCloudSession,
  type CloudSession,
} from '@/lib/cloud-api';

type Theme = 'light' | 'dark' | 'system';
type UpdateChannel = 'stable' | 'beta' | 'dev';
export type AnimationMode = 'disabled' | 'agile' | 'elegant';
export type ContextMenuMode = 'disabled' | 'default';
export type TransitionMode = 'none' | 'fadeIn' | 'smooth';
export type SidebarProject = {
  id: string;
  name: string;
  createdAt: number;
};

export type SidebarThreadWorkspace = {
  id: string;
  rootPath: string;
  name: string;
  createdAt: number;
  lastUsedAt: number;
};

export type SidebarActiveContext = {
  kind: 'thread' | 'openclaw' | 'realtimeVoice';
  workspaceId: string | null;
};

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
  primaryColor?: string;
  neutralColor?: string;
  translucentSidebar: boolean;
  fontSize: number;
  highlighterTheme: string;
  mermaidTheme: string;
  transitionMode: TransitionMode;
  animationMode: AnimationMode;
  contextMenuMode: ContextMenuMode;
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
  sidebarFolderExpanded: Record<string, boolean>;
  sidebarThreadWorkspaces: SidebarThreadWorkspace[];
  sidebarThreadWorkspaceExpanded: Record<string, boolean>;
  sidebarActiveContext: SidebarActiveContext;
  sidebarBetaEnabled: boolean;
  sidebarWidth: number;
  sidebarProjects: SidebarProject[];
  sidebarProjectExpanded: Record<string, boolean>;
  sidebarThreadProjectMap: Record<string, string>;
  sidebarThreadFirstSeenAt: Record<string, number>;
  devModeUnlocked: boolean;

  // Setup
  setupComplete: boolean;

  // Actions
  init: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;
  setPrimaryColor: (value?: string) => void;
  setNeutralColor: (value?: string) => void;
  setTranslucentSidebar: (value: boolean) => void;
  setFontSize: (value: number) => void;
  setHighlighterTheme: (value: string) => void;
  setMermaidTheme: (value: string) => void;
  setTransitionMode: (value: TransitionMode) => void;
  setAnimationMode: (value: AnimationMode) => void;
  setContextMenuMode: (value: ContextMenuMode) => void;
  setResponseLanguage: (value: string) => void;
  setEnableAutoScrollOnStreaming: (value: boolean) => void;
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
  setSidebarFolderExpanded: (folder: string, expanded: boolean) => void;
  setSidebarThreadWorkspaces: (workspaces: SidebarThreadWorkspace[]) => void;
  upsertSidebarThreadWorkspace: (workspace: SidebarThreadWorkspace) => void;
  renameSidebarThreadWorkspace: (workspaceId: string, name: string) => void;
  removeSidebarThreadWorkspace: (workspaceId: string) => void;
  touchSidebarThreadWorkspace: (workspaceId: string, lastUsedAt?: number) => void;
  setSidebarThreadWorkspaceExpanded: (workspaceId: string, expanded: boolean) => void;
  setSidebarActiveContext: (context: SidebarActiveContext) => void;
  setSidebarBetaEnabled: (value: boolean) => void;
  setSidebarWidth: (value: number) => void;
  addSidebarProject: (name: string) => string;
  renameSidebarProject: (projectId: string, name: string) => void;
  removeSidebarProject: (projectId: string) => void;
  setSidebarProjectExpanded: (projectId: string, expanded: boolean) => void;
  setSidebarThreadProject: (threadId: string, projectId: string) => void;
  rememberSidebarThreadFirstSeen: (threadIds: string[], now?: number) => void;
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
  theme: DEFAULT_APP_THEME_MODE as Theme,
  language: resolveSupportedLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined),
  primaryColor: undefined as string | undefined,
  neutralColor: DEFAULT_NEUTRAL_COLOR as string | undefined,
  translucentSidebar: false,
  fontSize: DEFAULT_CHAT_FONT_SIZE,
  highlighterTheme: 'lobe-theme',
  mermaidTheme: 'lobe-theme',
  transitionMode: 'smooth' as TransitionMode,
  animationMode: 'agile' as AnimationMode,
  contextMenuMode: 'default' as ContextMenuMode,
  responseLanguage: '',
  enableAutoScrollOnStreaming: true,
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
  sidebarFolderExpanded: {
    chat: true,
    cli: true,
    thread: true,
    openclaw: true,
    realtimeVoice: true,
    jizhi: true,
    xiaojiu: true,
    voice: true,
  },
  sidebarThreadWorkspaces: [] as SidebarThreadWorkspace[],
  sidebarThreadWorkspaceExpanded: {} as Record<string, boolean>,
  sidebarActiveContext: {
    kind: 'openclaw' as const,
    workspaceId: null,
  },
  sidebarBetaEnabled: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  sidebarProjects: [],
  sidebarProjectExpanded: {
    'system-inbox': true,
  },
  sidebarThreadProjectMap: {},
  sidebarThreadFirstSeenAt: {},
  devModeUnlocked: false,
  setupComplete: false,
  // Cloud auth defaults — not persisted in zustand store,
  // restored at runtime by hydrateCloudAuth().
  cloudLoggedIn: false,
  cloudBootstrapped: false,
  cloudUserId: null as string | null,
  cloudWorkspaceId: null as string | null,
};

const MAIN_PROCESS_SETTINGS_KEYS = [
  'theme',
  'language',
  'primaryColor',
  'neutralColor',
  'translucentSidebar',
  'fontSize',
  'highlighterTheme',
  'mermaidTheme',
  'transitionMode',
  'animationMode',
  'contextMenuMode',
  'responseLanguage',
  'enableAutoScrollOnStreaming',
  'startMinimized',
  'launchAtStartup',
  'telemetryEnabled',
  'petEnabled',
  'petAnimation',
  'petCompanionSeed',
  'petCompanion',
  'xiaojiuEnabled',
  'jizhiEnabled',
  'machineId',
  'gatewayAutoStart',
  'gatewayPort',
  'remoteGatewayUrl',
  'remoteGatewayToken',
  'proxyEnabled',
  'proxyServer',
  'proxyHttpServer',
  'proxyHttpsServer',
  'proxyAllServer',
  'proxyBypassRules',
  'codeAgent',
  'updateChannel',
  'autoCheckUpdate',
  'autoDownloadUpdate',
  'sidebarCollapsed',
  'sidebarThreadWorkspaces',
  'sidebarThreadWorkspaceExpanded',
  'devModeUnlocked',
] as const satisfies ReadonlyArray<keyof typeof defaultSettings>;

type MainProcessSettingsPatch = Partial<
  Pick<typeof defaultSettings, (typeof MAIN_PROCESS_SETTINGS_KEYS)[number]>
>;

function pickMainProcessSettings(raw: Record<string, unknown>): MainProcessSettingsPatch {
  const patch: MainProcessSettingsPatch = {};
  for (const key of MAIN_PROCESS_SETTINGS_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    (patch as Record<string, unknown>)[key] = raw[key];
  }
  return patch;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => {
      const syncSidebarThreadState = () => {
        const {
          sidebarThreadWorkspaces,
          sidebarThreadWorkspaceExpanded,
        } = get();
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({
            sidebarThreadWorkspaces,
            sidebarThreadWorkspaceExpanded,
          }),
        }).catch(() => { });
      };

      return {
        ...defaultSettings,

      init: async () => {
        try {
          const rawSettings = await hostApiFetch<Record<string, unknown>>('/api/settings');
          const settings = pickMainProcessSettings(rawSettings);
          const currentState = get();
          const remoteThreadWorkspaces = Array.isArray(settings.sidebarThreadWorkspaces)
            ? settings.sidebarThreadWorkspaces
            : [];
          const remoteThreadExpanded = settings.sidebarThreadWorkspaceExpanded
            && typeof settings.sidebarThreadWorkspaceExpanded === 'object'
            ? settings.sidebarThreadWorkspaceExpanded
            : {};
          const localThreadWorkspaces = currentState.sidebarThreadWorkspaces;
          const localThreadExpanded = currentState.sidebarThreadWorkspaceExpanded;
          const shouldBackfillThreadWorkspaces =
            remoteThreadWorkspaces.length === 0
            && localThreadWorkspaces.length > 0;
          const shouldBackfillThreadExpanded =
            Object.keys(remoteThreadExpanded).length === 0
            && Object.keys(localThreadExpanded).length > 0;
          const mergedThreadWorkspaces = shouldBackfillThreadWorkspaces
            ? localThreadWorkspaces
            : remoteThreadWorkspaces;
          const mergedThreadExpanded = shouldBackfillThreadExpanded
            ? localThreadExpanded
            : remoteThreadExpanded;
          const nextSettings: MainProcessSettingsPatch = {
            ...settings,
            ...(!Object.prototype.hasOwnProperty.call(rawSettings, 'primaryColor')
              ? { primaryColor: undefined }
              : {}),
            ...(!Object.prototype.hasOwnProperty.call(rawSettings, 'neutralColor')
              ? { neutralColor: DEFAULT_NEUTRAL_COLOR }
              : {}),
            sidebarThreadWorkspaces: mergedThreadWorkspaces,
            sidebarThreadWorkspaceExpanded: mergedThreadExpanded,
          };
          const codeAgent = settings.codeAgent
            ? {
                ...DEFAULT_CODE_AGENT_RUNTIME_CONFIG,
                ...settings.codeAgent,
                permissionMode: settings.codeAgent.permissionMode === 'default'
                  ? DEFAULT_CODE_AGENT_RUNTIME_CONFIG.permissionMode
                  : settings.codeAgent.permissionMode ?? DEFAULT_CODE_AGENT_RUNTIME_CONFIG.permissionMode,
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
            ...nextSettings,
            ...(codeAgent ? { codeAgent } : {}),
            ...(petCompanion ? { petCompanion } : {}),
            ...(resolvedLanguage ? { language: resolvedLanguage } : {}),
          }));
          if (shouldBackfillThreadWorkspaces || shouldBackfillThreadExpanded) {
            void hostApiFetch('/api/settings', {
              method: 'PUT',
              body: JSON.stringify({
                sidebarThreadWorkspaces: mergedThreadWorkspaces,
                sidebarThreadWorkspaceExpanded: mergedThreadExpanded,
              }),
            }).catch(() => { });
          }
          if (resolvedLanguage) {
            i18n.changeLanguage(resolvedLanguage);
          }
        } catch {
          // Keep renderer-persisted settings as a fallback when the main
          // process store is not reachable.
        }
      },

      setTheme: (theme) => {
        set({ theme });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ theme }),
        }).catch(() => { });
      },
      setLanguage: (language) => {
        const resolvedLanguage = resolveSupportedLanguage(language);
        i18n.changeLanguage(resolvedLanguage);
        set({ language: resolvedLanguage });
        void hostApiFetch('/api/settings/language', {
          method: 'PUT',
          body: JSON.stringify({ value: resolvedLanguage }),
        }).catch(() => { });
      },
      setPrimaryColor: (primaryColor) => {
        set({ primaryColor });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ primaryColor: primaryColor ?? null }),
        }).catch(() => { });
      },
      setNeutralColor: (neutralColor) => {
        set({ neutralColor });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ neutralColor: neutralColor ?? null }),
        }).catch(() => { });
      },
      setTranslucentSidebar: (translucentSidebar) => {
        set({ translucentSidebar });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ translucentSidebar }),
        }).catch(() => { });
      },
      setFontSize: (fontSize) => {
        const normalized = clampChatFontSize(fontSize);
        set({ fontSize: normalized });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ fontSize: normalized }),
        }).catch(() => { });
      },
      setHighlighterTheme: (highlighterTheme) => {
        set({ highlighterTheme });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ highlighterTheme }),
        }).catch(() => { });
      },
      setMermaidTheme: (mermaidTheme) => {
        set({ mermaidTheme });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ mermaidTheme }),
        }).catch(() => { });
      },
      setTransitionMode: (transitionMode) => {
        set({ transitionMode });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ transitionMode }),
        }).catch(() => { });
      },
      setAnimationMode: (animationMode) => {
        set({ animationMode });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ animationMode }),
        }).catch(() => { });
      },
      setContextMenuMode: (contextMenuMode) => {
        set({ contextMenuMode });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ contextMenuMode }),
        }).catch(() => { });
      },
      setResponseLanguage: (responseLanguage) => {
        set({ responseLanguage });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ responseLanguage }),
        }).catch(() => { });
      },
      setEnableAutoScrollOnStreaming: (enableAutoScrollOnStreaming) => {
        set({ enableAutoScrollOnStreaming });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ enableAutoScrollOnStreaming }),
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
      setUpdateChannel: (updateChannel) => {
        set({ updateChannel });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ updateChannel }),
        }).catch(() => { });
      },
      setAutoCheckUpdate: (autoCheckUpdate) => {
        set({ autoCheckUpdate });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ autoCheckUpdate }),
        }).catch(() => { });
      },
      setAutoDownloadUpdate: (autoDownloadUpdate) => {
        set({ autoDownloadUpdate });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ autoDownloadUpdate }),
        }).catch(() => { });
      },
      setSidebarCollapsed: (sidebarCollapsed) => {
        set({ sidebarCollapsed });
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ sidebarCollapsed }),
        }).catch(() => { });
      },
      setSidebarFolderExpanded: (folder, expanded) => set((state) => ({
        sidebarFolderExpanded: {
          ...state.sidebarFolderExpanded,
          [folder]: expanded,
        },
      })),
      setSidebarThreadWorkspaces: (workspaces) => {
        const nextWorkspaces = [...workspaces].sort(
          (left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0),
        );
        set({
          sidebarThreadWorkspaces: nextWorkspaces,
        });
        syncSidebarThreadState();
      },
      upsertSidebarThreadWorkspace: (workspace) => {
        if (!workspace.id || !workspace.rootPath) return;
        set((state) => {
          const index = state.sidebarThreadWorkspaces.findIndex(
            (item) => item.id === workspace.id,
          );
          if (index === -1) {
            return {
              sidebarThreadWorkspaces: [...state.sidebarThreadWorkspaces, workspace].sort(
                (left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0),
              ),
              sidebarThreadWorkspaceExpanded: {
                ...state.sidebarThreadWorkspaceExpanded,
                [workspace.id]: state.sidebarThreadWorkspaceExpanded[workspace.id] ?? true,
              },
            };
          }

          const updated = [...state.sidebarThreadWorkspaces];
          updated[index] = {
            ...updated[index],
            ...workspace,
          };
          updated.sort((left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0));
          return { sidebarThreadWorkspaces: updated };
        });
        syncSidebarThreadState();
      },
      renameSidebarThreadWorkspace: (workspaceId, name) => {
        const trimmed = name.trim();
        if (!workspaceId || !trimmed) return;
        set((state) => ({
          sidebarThreadWorkspaces: state.sidebarThreadWorkspaces.map((workspace) =>
            workspace.id === workspaceId
              ? { ...workspace, name: trimmed }
              : workspace
          ),
        }));
        syncSidebarThreadState();
      },
      removeSidebarThreadWorkspace: (workspaceId) => {
        if (!workspaceId) return;
        set((state) => {
          const { [workspaceId]: _removed, ...restExpanded } = state.sidebarThreadWorkspaceExpanded;
          void _removed;
          const nextActiveContext =
            state.sidebarActiveContext.kind === 'thread'
            && state.sidebarActiveContext.workspaceId === workspaceId
              ? { kind: 'openclaw' as const, workspaceId: null }
              : state.sidebarActiveContext;
          return {
            sidebarThreadWorkspaces: state.sidebarThreadWorkspaces.filter(
              (workspace) => workspace.id !== workspaceId,
            ),
            sidebarThreadWorkspaceExpanded: restExpanded,
            sidebarActiveContext: nextActiveContext,
          };
        });
        syncSidebarThreadState();
      },
      touchSidebarThreadWorkspace: (workspaceId, lastUsedAt = Date.now()) => {
        if (!workspaceId) return;
        set((state) => {
          const updated = state.sidebarThreadWorkspaces.map((workspace) =>
            workspace.id === workspaceId
              ? { ...workspace, lastUsedAt }
              : workspace
          );
          updated.sort((left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0));
          return { sidebarThreadWorkspaces: updated };
        });
        syncSidebarThreadState();
      },
      setSidebarThreadWorkspaceExpanded: (workspaceId, expanded) => {
        if (!workspaceId) return;
        set((state) => ({
          sidebarThreadWorkspaceExpanded: {
            ...state.sidebarThreadWorkspaceExpanded,
            [workspaceId]: expanded,
          },
        }));
        syncSidebarThreadState();
      },
      setSidebarActiveContext: (context) => {
        const kind = context.kind === 'thread'
          ? 'thread'
          : context.kind === 'realtimeVoice'
            ? 'realtimeVoice'
            : 'openclaw';
        set({
          sidebarActiveContext: {
            kind,
            workspaceId: kind === 'thread' ? context.workspaceId ?? null : null,
          },
        });
      },
      setSidebarBetaEnabled: (sidebarBetaEnabled) => set({ sidebarBetaEnabled }),
      setSidebarWidth: (sidebarWidth) => set({
        sidebarWidth: clampSidebarWidth(
          sidebarWidth,
          typeof window === 'undefined' ? Number.POSITIVE_INFINITY : window.innerWidth,
        ),
      }),
      addSidebarProject: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return '';
        const id = `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          sidebarProjects: [
            ...state.sidebarProjects,
            {
              id,
              name: trimmed,
              createdAt: Date.now(),
            },
          ],
          sidebarProjectExpanded: {
            ...state.sidebarProjectExpanded,
            [id]: true,
          },
        }));
        return id;
      },
      renameSidebarProject: (projectId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          sidebarProjects: state.sidebarProjects.map((project) =>
            project.id === projectId ? { ...project, name: trimmed } : project
          ),
        }));
      },
      removeSidebarProject: (projectId) => {
        if (!projectId || projectId === 'system-inbox') return;
        set((state) => {
          const nextThreadProjectMap = Object.fromEntries(
            Object.entries(state.sidebarThreadProjectMap).map(([threadId, mappedProjectId]) => [
              threadId,
              mappedProjectId === projectId ? 'system-inbox' : mappedProjectId,
            ]),
          );
          const { [projectId]: _removedProjectExpanded, ...remainingProjectExpanded } = state.sidebarProjectExpanded;
          void _removedProjectExpanded;
          return {
            sidebarProjects: state.sidebarProjects.filter((project) => project.id !== projectId),
            sidebarThreadProjectMap: nextThreadProjectMap,
            sidebarProjectExpanded: remainingProjectExpanded,
          };
        });
      },
      setSidebarProjectExpanded: (projectId, expanded) => set((state) => ({
        sidebarProjectExpanded: {
          ...state.sidebarProjectExpanded,
          [projectId]: expanded,
        },
      })),
      setSidebarThreadProject: (threadId, projectId) => {
        if (!threadId) return;
        set((state) => ({
          sidebarThreadProjectMap: {
            ...state.sidebarThreadProjectMap,
            [threadId]: projectId || 'system-inbox',
          },
        }));
      },
      rememberSidebarThreadFirstSeen: (threadIds, now = Date.now()) => {
        if (!Array.isArray(threadIds) || threadIds.length === 0) return;
        set((state) => {
          let changed = false;
          const next = { ...state.sidebarThreadFirstSeenAt };
          for (const threadId of threadIds) {
            if (!threadId) continue;
            if (!Object.prototype.hasOwnProperty.call(next, threadId)) {
              next[threadId] = now;
              changed = true;
            }
          }
          return changed ? { sidebarThreadFirstSeenAt: next } : {};
        });
      },
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
        const isLocalSession = isLocalCloudSession(session);
        set({
          cloudLoggedIn: true,
          cloudUserId: session.userId,
          cloudWorkspaceId: session.workspaceId,
        });
        // Persist cloud credentials to the main-process settings store so that
        // cloud-config-bridge.ts can use them for server-side API calls.
        // The local admin/admin bypass intentionally keeps these empty.
        const cloudApiBase = (() => {
          try {
            const override = window.localStorage.getItem('mimiclaw:cloud-api-base');
            if (override) return override.replace(/\/$/, '');
          } catch { /* ignore */ }
          return getCloudApiBase();
        })();
        void hostApiFetch('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({
            cloudApiUrl: isLocalSession ? '' : cloudApiBase,
            cloudApiToken: isLocalSession ? '' : session.token,
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
      };
    },
    {
      name: 'mimiclaw-settings',
    }
  )
);
