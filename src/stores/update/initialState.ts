import type { UpdateStoreState } from './types';

export const initialUpdateState: UpdateStoreState = {
  status: 'idle',
  currentVersion: '0.0.0',
  updateInfo: null,
  availableUpdateTier: null,
  progress: null,
  error: null,
  isInitialized: false,
  isUpdateAvailablePopupOpen: false,
  dismissedUpdateVersion: null,
  autoInstallCountdown: null,
  forcedUpdateModal: null,
  pendingForceModalWhenAvailable: false,
  pendingForceModalOptions: null,
  updatePolicyBootstrapDone: false,
};
