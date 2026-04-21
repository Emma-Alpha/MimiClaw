import type { CodeAgentRuntimeConfig } from '../../../shared/code-agent';
import type { CloudSession } from '@/lib/cloud-api';
import type { StoredPetCompanion } from '../../../shared/pet-companion';
import type { PetAnimation } from '../../../shared/pet';

export type Theme = 'light' | 'dark' | 'system';
export type UpdateChannel = 'stable' | 'beta' | 'dev';
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

export type HotkeyEnum = 'saveTopic';

export interface PreferenceSettings {
  useCmdEnterToSend: boolean;
  isDevMode: boolean;
  autoApproveTools: boolean;
  hotkeys: Record<HotkeyEnum, string>;
}

export interface LabPreferenceSettings {
  memory: boolean;
  intervention: boolean;
  promptTransform: boolean;
  stt: boolean;
}

export interface CloudAuthState {
  cloudLoggedIn: boolean;
  cloudBootstrapped: boolean;
  cloudUserId: string | null;
  cloudWorkspaceId: string | null;
}

export interface SettingsStoreState extends CloudAuthState {
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
  preference: PreferenceSettings;
  labPreferences: LabPreferenceSettings;
  gatewayAutoStart: boolean;
  gatewayPort: number;
  remoteGatewayUrl: string;
  remoteGatewayToken: string;
  proxyEnabled: boolean;
  proxyServer: string;
  proxyHttpServer: string;
  proxyHttpsServer: string;
  proxyAllServer: string;
  proxyBypassRules: string;
  codeAgent: CodeAgentRuntimeConfig;
  updateChannel: UpdateChannel;
  autoCheckUpdate: boolean;
  autoDownloadUpdate: boolean;
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
  setupComplete: boolean;
}

export interface SettingsStoreAction {
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
  loginCloud: (username: string, password: string) => Promise<void>;
  logoutCloud: () => Promise<void>;
  markCloudBootstrapped: () => void;
  hydrateCloudAuth: () => void;
  applyCloudSession: (session: CloudSession) => void;
}

export type SettingsStore = SettingsStoreState & SettingsStoreAction;

export type MainProcessSettingsPatch = Partial<
  Pick<SettingsStoreState, 'theme' | 'language' | 'primaryColor' | 'neutralColor'
    | 'translucentSidebar' | 'fontSize' | 'highlighterTheme' | 'mermaidTheme' | 'transitionMode'
    | 'animationMode' | 'contextMenuMode' | 'responseLanguage' | 'enableAutoScrollOnStreaming'
    | 'startMinimized' | 'launchAtStartup' | 'telemetryEnabled' | 'petEnabled'
    | 'petAnimation' | 'petCompanionSeed' | 'petCompanion' | 'xiaojiuEnabled' | 'jizhiEnabled'
    | 'machineId' | 'gatewayAutoStart' | 'gatewayPort' | 'remoteGatewayUrl' | 'remoteGatewayToken'
    | 'proxyEnabled' | 'proxyServer' | 'proxyHttpServer' | 'proxyHttpsServer' | 'proxyAllServer'
    | 'proxyBypassRules' | 'codeAgent' | 'updateChannel' | 'autoCheckUpdate' | 'autoDownloadUpdate'
    | 'sidebarCollapsed' | 'sidebarThreadWorkspaces' | 'sidebarThreadWorkspaceExpanded'
    | 'devModeUnlocked'>
>;
