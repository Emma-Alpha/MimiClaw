import type { UpdateReleaseTier } from '@/lib/update-policy';

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

export type PendingForceModalOptions = {
  allowDismiss: boolean;
  title?: string;
  message?: string;
  learnMoreUrl?: string;
};

export type IncomingUpdateSnapshot = {
  status: UpdateStatus;
  info?: UpdateInfo;
  progress?: ProgressInfo;
  error?: string;
};

export interface UpdateStoreState {
  status: UpdateStatus;
  currentVersion: string;
  updateInfo: UpdateInfo | null;
  availableUpdateTier: UpdateReleaseTier | null;
  progress: ProgressInfo | null;
  error: string | null;
  isInitialized: boolean;
  isUpdateAvailablePopupOpen: boolean;
  dismissedUpdateVersion: string | null;
  autoInstallCountdown: number | null;
  forcedUpdateModal: ForcedUpdateModalState | null;
  pendingForceModalWhenAvailable: boolean;
  pendingForceModalOptions: PendingForceModalOptions | null;
  updatePolicyBootstrapDone: boolean;
}

export interface UpdateStoreAction {
  init: () => Promise<void>;
  applyRemoteUpdatePolicy: () => Promise<void>;
  openForcedUpdateModal: (opts: {
    title?: string;
    message?: string;
    blockDismiss?: boolean;
    learnMoreUrl?: string;
    reason?: 'below-minimum' | 'update-available';
  }) => void;
  openUpdateAvailablePopup: () => void;
  dismissUpdateAvailablePopup: () => void;
  dismissForcedUpdateModal: () => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  cancelAutoInstall: () => Promise<void>;
  setChannel: (channel: 'stable' | 'beta' | 'dev') => Promise<void>;
  setAutoDownload: (enable: boolean) => Promise<void>;
  clearError: () => void;
}

export type UpdateStore = UpdateStoreState & UpdateStoreAction;
