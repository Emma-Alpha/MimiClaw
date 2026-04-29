import i18n from '@/i18n';
import { hostApiFetch } from '@/lib/host-api';
import { clampSidebarWidth } from '@/lib/sidebar-layout';
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
import { bootstrapCloudDefaults as bootstrapCloudDefaultsFn } from '@/lib/cloud-bootstrap';
import type { StoreGetter, StoreSetter } from '@/stores/types';
import {
  clampChatFontSize,
  DEFAULT_NEUTRAL_COLOR,
} from '../../../shared/appearance';
import { DEFAULT_CODE_AGENT_RUNTIME_CONFIG } from '../../../shared/code-agent';
import { resolveSupportedLanguage } from '../../../shared/language';
import { normalizePetCompanion } from '../../../shared/pet-companion';
import { initialSettingsState, pickMainProcessSettings } from './initialState';
import type {
  LabPreferenceSettings,
  MainProcessSettingsPatch,
  PreferenceSettings,
  SettingsStore,
  SettingsStoreAction,
} from './types';

type Setter = StoreSetter<SettingsStore>;
type Getter = StoreGetter<SettingsStore>;

export function createSettingsActions(set: Setter, get: Getter): SettingsStoreAction {
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
          preference: {
            ...state.preference,
            ...(typeof rawSettings.preference === 'object' && rawSettings.preference
              ? rawSettings.preference as Partial<PreferenceSettings>
              : {}),
            isDevMode: typeof rawSettings.devModeUnlocked === 'boolean'
              ? rawSettings.devModeUnlocked
              : state.preference.isDevMode,
          },
          labPreferences: {
            ...state.labPreferences,
            ...(typeof rawSettings.labPreferences === 'object' && rawSettings.labPreferences
              ? rawSettings.labPreferences as Partial<LabPreferenceSettings>
              : {}),
          },
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
        // Keep renderer-persisted settings as fallback.
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
    setAihubApiUrl: (aihubApiUrl) => {
      set({ aihubApiUrl });
      void hostApiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ aihubApiUrl }),
      }).catch(() => { });
    },
    setAihubApiKey: (aihubApiKey) => {
      set({ aihubApiKey });
      void hostApiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ aihubApiKey }),
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
            : workspace,
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
            ? { kind: 'chat' as const, workspaceId: null }
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
      // Skip update if workspace is already the most recent — avoids
      // creating a new array reference and cascading re-renders.
      const { sidebarThreadWorkspaces } = get();
      if (sidebarThreadWorkspaces[0]?.id === workspaceId) return;
      set((state) => {
        const updated = state.sidebarThreadWorkspaces.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, lastUsedAt }
            : workspace,
        );
        updated.sort((left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0));
        return { sidebarThreadWorkspaces: updated };
      });
      syncSidebarThreadState();
    },
    setSidebarThreadWorkspaceExpanded: (workspaceId, expanded) => {
      if (!workspaceId) return;
      // Skip update + network sync if value is already correct
      if (get().sidebarThreadWorkspaceExpanded[workspaceId] === expanded) return;
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
          : 'chat';
      const workspaceId = kind === 'thread' ? context.workspaceId ?? null : null;
      const current = get().sidebarActiveContext;
      if (current.kind === kind && current.workspaceId === workspaceId) return;
      set({
        sidebarActiveContext: { kind, workspaceId },
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
          project.id === projectId ? { ...project, name: trimmed } : project,
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
      set((state) => ({
        devModeUnlocked,
        preference: {
          ...state.preference,
          isDevMode: devModeUnlocked,
        },
      }));
      void hostApiFetch('/api/settings/devModeUnlocked', {
        method: 'PUT',
        body: JSON.stringify({ value: devModeUnlocked }),
      }).catch((error) => {
        console.error('Failed to persist dev mode setting:', error);
      });
    },
    markSetupComplete: () => set({ setupComplete: true }),
    resetSettings: () => set(initialSettingsState),
    hydrateCloudAuth: () => {
      const raw = window.localStorage.getItem('mimiclaw:cloud-session');
      console.log('[settings] hydrateCloudAuth: raw localStorage =', raw);
      if (isCloudSessionValid()) {
        const session = getCloudSession();
        console.log('[settings] hydrateCloudAuth: session valid, userId=%s', session?.userId);
        set({
          cloudLoggedIn: true,
          cloudUserId: session?.userId ?? null,
          cloudWorkspaceId: session?.workspaceId ?? null,
        });
      } else {
        console.log('[settings] hydrateCloudAuth: session invalid or missing, redirecting to login');
        set({ cloudLoggedIn: false, cloudUserId: null, cloudWorkspaceId: null });
      }
    },
    applyCloudSession: (session: CloudSession) => {
      console.log('[settings] applyCloudSession: saving session, token=%s..., userId=%s', session.token?.slice(0, 20), session.userId);
      setCloudSession(session);
      console.log('[settings] applyCloudSession: localStorage after save =', window.localStorage.getItem('mimiclaw:cloud-session')?.slice(0, 100));
      set({
        cloudLoggedIn: true,
        cloudUserId: session.userId,
        cloudWorkspaceId: session.workspaceId,
      });
      // Write cloudApiUrl/cloudApiToken to backend settings (matching loginCloud behavior)
      if (!isLocalCloudSession(session)) {
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
            cloudApiUrl: cloudApiBase,
            cloudApiToken: session.token,
          }),
        }).catch(() => { });
      }
    },
    loginCloud: async (username: string, password: string) => {
      const session = await cloudLogin(username, password);
      const isLocalSession = isLocalCloudSession(session);
      set({
        cloudLoggedIn: true,
        cloudUserId: session.userId,
        cloudWorkspaceId: session.workspaceId,
      });
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
      void hostApiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ cloudApiUrl: '', cloudApiToken: '' }),
      }).catch(() => { });
    },
    markCloudBootstrapped: () => set({ cloudBootstrapped: true }),
    bootstrapCloudDefaults: async () => {
      const state = get();
      if (state.cloudBootstrapped || !state.cloudLoggedIn) return;
      // Mark immediately to prevent concurrent runs
      set({ cloudBootstrapped: true });
      try {
        const result = await bootstrapCloudDefaultsFn({
          codeAgent: state.codeAgent,
          aihubApiUrl: state.aihubApiUrl,
          aihubApiKey: state.aihubApiKey,
          setCodeAgent: get().setCodeAgent,
          setAihubApiUrl: get().setAihubApiUrl,
          setAihubApiKey: get().setAihubApiKey,
        });
        if (result.codeAgentPatched || result.aihubPatched || result.speechPatched || result.voiceChatPatched) {
          console.log('[settings] bootstrapCloudDefaults applied:', result);
        }
      } catch (error) {
        console.warn('[settings] bootstrapCloudDefaults failed:', error);
      }
    },
  };
}
