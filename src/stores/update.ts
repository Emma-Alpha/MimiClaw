/**
 * Update State Store
 * Manages application update state
 */
import { create } from 'zustand';
import { useSettingsStore } from './settings';
import { invokeIpc } from '@/lib/api-client';
import { isVersionBelow, parseUpdatePolicy } from '@/lib/update-policy';

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | null;
}

export interface ProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export type ForcedUpdateModalState = {
  title?: string;
  message?: string;
  blockDismiss: boolean;
  learnMoreUrl?: string;
  reason?: 'below-minimum' | 'update-available';
};

type PendingForceModalOptions = {
  allowDismiss: boolean;
  title?: string;
  message?: string;
  learnMoreUrl?: string;
};

interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  updateInfo: UpdateInfo | null;
  progress: ProgressInfo | null;
  error: string | null;
  isInitialized: boolean;
  /** Seconds remaining before auto-install, or null if inactive. */
  autoInstallCountdown: number | null;

  forcedUpdateModal: ForcedUpdateModalState | null;
  pendingForceModalWhenAvailable: boolean;
  pendingForceModalOptions: PendingForceModalOptions | null;
  updatePolicyBootstrapDone: boolean;

  // Actions
  init: () => Promise<void>;
  applyRemoteUpdatePolicy: () => Promise<void>;
  /** Programmatically show the update modal (e.g. debug or feature flag). */
  openForcedUpdateModal: (opts: {
    title?: string;
    message?: string;
    blockDismiss?: boolean;
    learnMoreUrl?: string;
    reason?: 'below-minimum' | 'update-available';
  }) => void;
  dismissForcedUpdateModal: () => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  cancelAutoInstall: () => Promise<void>;
  setChannel: (channel: 'stable' | 'beta' | 'dev') => Promise<void>;
  setAutoDownload: (enable: boolean) => Promise<void>;
  clearError: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  currentVersion: '0.0.0',
  updateInfo: null,
  progress: null,
  error: null,
  isInitialized: false,
  autoInstallCountdown: null,

  forcedUpdateModal: null,
  pendingForceModalWhenAvailable: false,
  pendingForceModalOptions: null,
  updatePolicyBootstrapDone: false,

  init: async () => {
    if (get().isInitialized) return;

    // Get current version
    try {
      const version = await invokeIpc<string>('update:version');
      set({ currentVersion: version as string });
    } catch (error) {
      console.error('Failed to get version:', error);
    }

    // Get current status
    try {
      const status = await invokeIpc<{
        status: UpdateStatus;
        info?: UpdateInfo;
        progress?: ProgressInfo;
        error?: string;
      }>('update:status');
      set({
        status: status.status,
        updateInfo: status.info || null,
        progress: status.progress || null,
        error: status.error || null,
      });
    } catch (error) {
      console.error('Failed to get update status:', error);
    }

    // Listen for update events
    // Single source of truth: listen only to update:status-changed
    // (sent by AppUpdater.updateStatus() in the main process)
    window.electron.ipcRenderer.on('update:status-changed', (data) => {
      const incoming = data as {
        status: UpdateStatus;
        info?: UpdateInfo;
        progress?: ProgressInfo;
        error?: string;
      };
      set((state) => {
        const patch: Partial<UpdateState> = {
          status: incoming.status,
          updateInfo: incoming.info || null,
          progress: incoming.progress || null,
          error: incoming.error || null,
        };
        if (state.pendingForceModalWhenAvailable && incoming.status === 'available') {
          const opt = state.pendingForceModalOptions;
          patch.forcedUpdateModal = {
            title: opt?.title,
            message: opt?.message,
            blockDismiss: !opt?.allowDismiss,
            learnMoreUrl: opt?.learnMoreUrl,
            reason: 'update-available',
          };
          console.log('✅ Update available! Creating forcedUpdateModal:', {
            optAllowDismiss: opt?.allowDismiss,
            blockDismiss: !opt?.allowDismiss,
          });
          patch.pendingForceModalWhenAvailable = false;
          patch.pendingForceModalOptions = null;
        } else if (
          state.pendingForceModalWhenAvailable
          && (incoming.status === 'not-available' || incoming.status === 'error')
        ) {
          patch.pendingForceModalWhenAvailable = false;
          patch.pendingForceModalOptions = null;
        }
        return patch;
      });
    });

    window.electron.ipcRenderer.on('update:auto-install-countdown', (data) => {
      const { seconds, cancelled } = data as { seconds: number; cancelled?: boolean };
      set({ autoInstallCountdown: cancelled ? null : seconds });
    });

    set({ isInitialized: true });

    // Apply persisted settings from the settings store
    const { autoCheckUpdate, autoDownloadUpdate } = useSettingsStore.getState();

    // Sync auto-download preference to the main process
    if (autoDownloadUpdate) {
      invokeIpc('update:setAutoDownload', true).catch(() => {});
    }

    // Auto-check for updates on startup (respects user toggle)
    if (autoCheckUpdate) {
      setTimeout(() => {
        get().checkForUpdates().catch(() => {});
      }, 10000);
    }
  },

  applyRemoteUpdatePolicy: async () => {
    if (get().updatePolicyBootstrapDone) return;

    const url = (import.meta.env.VITE_UPDATE_POLICY_URL || '').trim();
    if (!url) {
      set({ updatePolicyBootstrapDone: true });
      return;
    }

    try {
      const result = await invokeIpc<{ success: boolean; json?: unknown; error?: string }>(
        'update:fetchPolicy',
        url,
      );
      if (!result.success) {
        set({ updatePolicyBootstrapDone: true });
        return;
      }

      const policy = parseUpdatePolicy(result.json);
      console.log('🔍 Remote update policy loaded:', {
        rawJson: result.json,
        parsedPolicy: policy,
      });
      if (!policy || (!policy.minimumVersion && !policy.forceUpdateModalWhenAvailable)) {
        set({ updatePolicyBootstrapDone: true });
        return;
      }

      const current = get().currentVersion;

      if (policy.minimumVersion && isVersionBelow(current, policy.minimumVersion)) {
        console.log('⚠️ Version below minimum! Current:', current, 'Minimum:', policy.minimumVersion);
        set({
          updatePolicyBootstrapDone: true,
          pendingForceModalWhenAvailable: false,
          pendingForceModalOptions: null,
          forcedUpdateModal: {
            title: policy.title,
            message: policy.message,
            blockDismiss: policy.allowDismiss !== true, // Respect allowDismiss even for minimum version
            learnMoreUrl: policy.learnMoreUrl,
            reason: 'below-minimum',
          },
        });
        console.log('📋 Created forcedUpdateModal (below-minimum):', {
          policyAllowDismiss: policy.allowDismiss,
          blockDismiss: policy.allowDismiss !== true,
        });
        void get().checkForUpdates().catch(() => {});
        return;
      }

      if (policy.forceUpdateModalWhenAvailable) {
        set({
          updatePolicyBootstrapDone: true,
          pendingForceModalWhenAvailable: true,
          pendingForceModalOptions: {
            allowDismiss: policy.allowDismiss !== false, // Default to true
            title: policy.title,
            message: policy.message,
            learnMoreUrl: policy.learnMoreUrl,
          },
        });
        console.log('📋 Set pendingForceModalOptions:', {
          allowDismiss: policy.allowDismiss !== false,
          policyAllowDismiss: policy.allowDismiss,
        });
        void get().checkForUpdates().catch(() => {});
        return;
      }
    } catch {
      // ignore network / parse failures
    }

    set({ updatePolicyBootstrapDone: true });
  },

  openForcedUpdateModal: (opts) => {
    set({
      forcedUpdateModal: {
        title: opts.title,
        message: opts.message,
        blockDismiss: opts.blockDismiss !== false,
        learnMoreUrl: opts.learnMoreUrl,
        reason: opts.reason,
      },
    });
  },

  dismissForcedUpdateModal: () => {
    const m = get().forcedUpdateModal;
    if (m?.blockDismiss) return;
    set({ forcedUpdateModal: null });
  },

  checkForUpdates: async () => {
    set({ status: 'checking', error: null });

    try {
      const result = await Promise.race([
        invokeIpc('update:check'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Update check timed out')), 30000)),
      ]) as {
        success: boolean;
        error?: string;
        status?: {
          status: UpdateStatus;
          info?: UpdateInfo;
          progress?: ProgressInfo;
          error?: string;
        };
      };

      const resolvedStatus = result.status;
      if (resolvedStatus) {
        set((state) => {
          const incoming = resolvedStatus;
          const patch: Partial<UpdateState> = {
            status: incoming.status,
            updateInfo: incoming.info || null,
            progress: incoming.progress || null,
            error: incoming.error || null,
          };
          if (state.pendingForceModalWhenAvailable && incoming.status === 'available') {
            const opt = state.pendingForceModalOptions;
            patch.forcedUpdateModal = {
              title: opt?.title,
              message: opt?.message,
              blockDismiss: !opt?.allowDismiss,
              learnMoreUrl: opt?.learnMoreUrl,
              reason: 'update-available',
            };
            patch.pendingForceModalWhenAvailable = false;
            patch.pendingForceModalOptions = null;
          } else if (
            state.pendingForceModalWhenAvailable
            && (incoming.status === 'not-available' || incoming.status === 'error')
          ) {
            patch.pendingForceModalWhenAvailable = false;
            patch.pendingForceModalOptions = null;
          }
          return patch;
        });
      } else if (!result.success) {
        set({
          status: 'error',
          error: result.error || 'Failed to check for updates',
          pendingForceModalWhenAvailable: false,
          pendingForceModalOptions: null,
        });
      }
    } catch (error) {
      set({
        status: 'error',
        error: String(error),
        pendingForceModalWhenAvailable: false,
        pendingForceModalOptions: null,
      });
    } finally {
      // In dev mode autoUpdater skips without emitting events, so the
      // status may still be 'checking' or even 'idle'. Catch both.
      const currentStatus = get().status;
      if (currentStatus === 'checking' || currentStatus === 'idle') {
        set({
          status: 'error',
          error: 'Update check completed without a result. This usually means the app is running in dev mode.',
          pendingForceModalWhenAvailable: false,
          pendingForceModalOptions: null,
        });
      }
    }
  },

  downloadUpdate: async () => {
    set({ status: 'downloading', error: null });

    try {
      const result = await invokeIpc<{
        success: boolean;
        error?: string;
      }>('update:download');

      if (!result.success) {
        set({ status: 'error', error: result.error || 'Failed to download update' });
      }
    } catch (error) {
      set({ status: 'error', error: String(error) });
    }
  },

  installUpdate: async () => {
    try {
      const result = await invokeIpc<{ success?: boolean; error?: string }>('update:install');
      if (result && result.success === false) {
        set({ status: 'error', error: result.error || 'Failed to install update' });
      }
    } catch (error) {
      set({ status: 'error', error: String(error) });
    }
  },

  cancelAutoInstall: async () => {
    try {
      await invokeIpc('update:cancelAutoInstall');
    } catch (error) {
      console.error('Failed to cancel auto-install:', error);
    }
  },

  setChannel: async (channel) => {
    try {
      await invokeIpc('update:setChannel', channel);
    } catch (error) {
      console.error('Failed to set update channel:', error);
    }
  },

  setAutoDownload: async (enable) => {
    try {
      await invokeIpc('update:setAutoDownload', enable);
    } catch (error) {
      console.error('Failed to set auto-download:', error);
    }
  },

  clearError: () => set({ error: null, status: 'idle' }),
}));
