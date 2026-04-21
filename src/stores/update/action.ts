import { invokeIpc } from '@/lib/api-client';
import {
  getUpdateReleaseTier,
  isVersionBelow,
  parseUpdatePolicy,
} from '@/lib/update-policy';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type {
  IncomingUpdateSnapshot,
  UpdateStore,
  UpdateStoreAction,
  UpdateStoreState,
  UpdateStatus,
} from './types';

type Setter = StoreSetter<UpdateStore>;
type Getter = StoreGetter<UpdateStore>;

function shouldAutoOpenUpdatePopup(
  tier: UpdateStoreState['availableUpdateTier'],
  version: string | null,
  dismissedVersion: string | null,
) {
  if (!version || dismissedVersion === version) return false;
  return tier !== 'patch';
}

function buildIncomingUpdatePatch(
  state: Pick<
    UpdateStore,
    | 'currentVersion'
    | 'dismissedUpdateVersion'
    | 'forcedUpdateModal'
    | 'isUpdateAvailablePopupOpen'
    | 'pendingForceModalOptions'
    | 'pendingForceModalWhenAvailable'
    | 'updateInfo'
  >,
  incoming: IncomingUpdateSnapshot,
): Partial<UpdateStore> {
  const nextInfo = incoming.info || null;
  const nextTier = nextInfo ? getUpdateReleaseTier(state.currentVersion, nextInfo.version) : null;
  const nextVersion = nextInfo?.version ?? null;
  const isSameVersion = nextVersion != null && nextVersion === state.updateInfo?.version;

  const patch: Partial<UpdateStore> = {
    status: incoming.status,
    updateInfo: nextInfo,
    availableUpdateTier: nextTier,
    progress: incoming.progress || null,
    error: incoming.error || null,
  };

  if (incoming.status === 'available') {
    patch.isUpdateAvailablePopupOpen = (isSameVersion && state.isUpdateAvailablePopupOpen)
      || shouldAutoOpenUpdatePopup(nextTier, nextVersion, state.dismissedUpdateVersion);
  } else {
    patch.isUpdateAvailablePopupOpen = false;
  }

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
}

export class UpdateActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  init = async () => {
    if (this.#get().isInitialized) return;

    try {
      const version = await invokeIpc<string>('update:version');
      this.#set({ currentVersion: version as string });
    } catch (error) {
      console.error('Failed to get version:', error);
    }

    try {
      const status = await invokeIpc<{
        status: UpdateStatus;
        info?: IncomingUpdateSnapshot['info'];
        progress?: IncomingUpdateSnapshot['progress'];
        error?: string;
      }>('update:status');
      this.#set((state) => buildIncomingUpdatePatch(state, status));
    } catch (error) {
      console.error('Failed to get update status:', error);
    }

    window.electron.ipcRenderer.on('update:status-changed', (data) => {
      const incoming = data as IncomingUpdateSnapshot;
      this.#set((state) => buildIncomingUpdatePatch(state, incoming));
    });

    window.electron.ipcRenderer.on('update:auto-install-countdown', (data) => {
      const { seconds, cancelled } = data as { seconds: number; cancelled?: boolean };
      this.#set({ autoInstallCountdown: cancelled ? null : seconds });
    });

    this.#set({ isInitialized: true });
  };

  applyRemoteUpdatePolicy = async () => {
    if (this.#get().updatePolicyBootstrapDone) return;

    const url = (import.meta.env.VITE_UPDATE_POLICY_URL || '').trim();
    if (!url) {
      this.#set({ updatePolicyBootstrapDone: true });
      return;
    }

    try {
      const result = await invokeIpc<{ success: boolean; json?: unknown; error?: string }>(
        'update:fetchPolicy',
        url,
      );
      if (!result.success) {
        this.#set({ updatePolicyBootstrapDone: true });
        return;
      }

      const policy = parseUpdatePolicy(result.json);
      console.log('🔍 Remote update policy loaded:', {
        rawJson: result.json,
        parsedPolicy: policy,
      });
      if (!policy || (!policy.minimumVersion && !policy.forceUpdateModalWhenAvailable)) {
        this.#set({ updatePolicyBootstrapDone: true });
        return;
      }

      const current = this.#get().currentVersion;

      if (policy.minimumVersion && isVersionBelow(current, policy.minimumVersion)) {
        console.log('⚠️ Version below minimum! Current:', current, 'Minimum:', policy.minimumVersion);
        this.#set({
          updatePolicyBootstrapDone: true,
          pendingForceModalWhenAvailable: false,
          pendingForceModalOptions: null,
          forcedUpdateModal: {
            title: policy.title,
            message: policy.message,
            blockDismiss: policy.allowDismiss !== true,
            learnMoreUrl: policy.learnMoreUrl,
            reason: 'below-minimum',
          },
        });
        console.log('📋 Created forcedUpdateModal (below-minimum):', {
          policyAllowDismiss: policy.allowDismiss,
          blockDismiss: policy.allowDismiss !== true,
        });
        void this.#get().checkForUpdates().catch(() => {});
        return;
      }

      if (policy.forceUpdateModalWhenAvailable) {
        this.#set({
          updatePolicyBootstrapDone: true,
          pendingForceModalWhenAvailable: true,
          pendingForceModalOptions: {
            allowDismiss: policy.allowDismiss !== false,
            title: policy.title,
            message: policy.message,
            learnMoreUrl: policy.learnMoreUrl,
          },
        });
        console.log('📋 Set pendingForceModalOptions:', {
          allowDismiss: policy.allowDismiss !== false,
          policyAllowDismiss: policy.allowDismiss,
        });
        void this.#get().checkForUpdates().catch(() => {});
        return;
      }
    } catch {
      // ignore network / parse failures
    }

    this.#set({ updatePolicyBootstrapDone: true });
  };

  openForcedUpdateModal: UpdateStoreAction['openForcedUpdateModal'] = (opts) => {
    this.#set({
      forcedUpdateModal: {
        title: opts.title,
        message: opts.message,
        blockDismiss: opts.blockDismiss !== false,
        learnMoreUrl: opts.learnMoreUrl,
        reason: opts.reason,
      },
    });
  };

  openUpdateAvailablePopup = () => {
    if (this.#get().status !== 'available' || !this.#get().updateInfo) return;
    this.#set({ isUpdateAvailablePopupOpen: true });
  };

  dismissUpdateAvailablePopup = () => {
    const version = this.#get().updateInfo?.version ?? null;
    this.#set({
      dismissedUpdateVersion: version,
      isUpdateAvailablePopupOpen: false,
    });
  };

  dismissForcedUpdateModal = () => {
    const m = this.#get().forcedUpdateModal;
    if (m?.blockDismiss) return;
    this.#set({ forcedUpdateModal: null });
  };

  checkForUpdates = async () => {
    this.#set({ status: 'checking', error: null });

    try {
      const result = await Promise.race([
        invokeIpc('update:check'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Update check timed out')), 30000)),
      ]) as {
        success: boolean;
        error?: string;
        status?: IncomingUpdateSnapshot;
      };

      const resolvedStatus = result.status;
      if (resolvedStatus) {
        this.#set((state) => buildIncomingUpdatePatch(state, resolvedStatus));
      } else if (!result.success) {
        this.#set({
          status: 'error',
          error: result.error || 'Failed to check for updates',
          isUpdateAvailablePopupOpen: false,
          pendingForceModalWhenAvailable: false,
          pendingForceModalOptions: null,
        });
      }
    } catch (error) {
      this.#set({
        status: 'error',
        error: String(error),
        isUpdateAvailablePopupOpen: false,
        pendingForceModalWhenAvailable: false,
        pendingForceModalOptions: null,
      });
    } finally {
      const currentStatus = this.#get().status;
      if (currentStatus === 'checking' || currentStatus === 'idle') {
        this.#set({
          status: 'error',
          error: 'Update check completed without a result. This usually means the app is running in dev mode.',
          isUpdateAvailablePopupOpen: false,
          pendingForceModalWhenAvailable: false,
          pendingForceModalOptions: null,
        });
      }
    }
  };

  downloadUpdate = async () => {
    this.#set({ status: 'downloading', error: null });

    try {
      const result = await invokeIpc<{
        success: boolean;
        error?: string;
      }>('update:download');

      if (!result.success) {
        this.#set({
          status: 'error',
          error: result.error || 'Failed to download update',
          isUpdateAvailablePopupOpen: false,
        });
      }
    } catch (error) {
      this.#set({ status: 'error', error: String(error), isUpdateAvailablePopupOpen: false });
    }
  };

  installUpdate = async () => {
    try {
      const result = await invokeIpc<{ success?: boolean; error?: string }>('update:install');
      if (result && result.success === false) {
        this.#set({
          status: 'error',
          error: result.error || 'Failed to install update',
          isUpdateAvailablePopupOpen: false,
        });
      }
    } catch (error) {
      this.#set({ status: 'error', error: String(error), isUpdateAvailablePopupOpen: false });
    }
  };

  cancelAutoInstall = async () => {
    try {
      await invokeIpc('update:cancelAutoInstall');
    } catch (error) {
      console.error('Failed to cancel auto-install:', error);
    }
  };

  setChannel: UpdateStoreAction['setChannel'] = async (channel) => {
    try {
      await invokeIpc('update:setChannel', channel);
    } catch (error) {
      console.error('Failed to set update channel:', error);
    }
  };

  setAutoDownload: UpdateStoreAction['setAutoDownload'] = async (enable) => {
    try {
      await invokeIpc('update:setAutoDownload', enable);
    } catch (error) {
      console.error('Failed to set auto-download:', error);
    }
  };

  clearError = () => this.#set({
    error: null,
    status: 'idle',
    isUpdateAvailablePopupOpen: false,
  });
}

export type UpdateAction = StorePublicActions<UpdateActionImpl>;

export const createUpdateSlice = (set: Setter, get: Getter, api?: unknown): UpdateStoreAction =>
  new UpdateActionImpl(set, get, api);
