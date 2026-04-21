import type { ProviderStoreState } from './types';

export const initialProviderState: ProviderStoreState = {
  statuses: [],
  accounts: [],
  vendors: [],
  defaultAccountId: null,
  loading: false,
  error: null,
};
