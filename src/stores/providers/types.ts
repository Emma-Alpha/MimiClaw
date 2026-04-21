import type {
  ProviderAccount,
  ProviderConfig,
  ProviderVendorInfo,
  ProviderWithKeyInfo,
} from '@/lib/providers';

export interface ProviderValidationOptions {
  baseUrl?: string;
  apiProtocol?: ProviderAccount['apiProtocol'];
}

export interface ProviderStoreState {
  statuses: ProviderWithKeyInfo[];
  accounts: ProviderAccount[];
  vendors: ProviderVendorInfo[];
  defaultAccountId: string | null;
  loading: boolean;
  error: string | null;
}

export interface ProviderStoreAction {
  refreshProviderSnapshot: () => Promise<void>;
  createAccount: (account: ProviderAccount, apiKey?: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  validateAccountApiKey: (
    accountId: string,
    apiKey: string,
    options?: ProviderValidationOptions,
  ) => Promise<{ valid: boolean; error?: string }>;
  getAccountApiKey: (accountId: string) => Promise<string | null>;
  fetchProviders: () => Promise<void>;
  addProvider: (config: Omit<ProviderConfig, 'createdAt' | 'updatedAt'>, apiKey?: string) => Promise<void>;
  addAccount: (account: ProviderAccount, apiKey?: string) => Promise<void>;
  updateProvider: (providerId: string, updates: Partial<ProviderConfig>, apiKey?: string) => Promise<void>;
  updateAccount: (accountId: string, updates: Partial<ProviderAccount>, apiKey?: string) => Promise<void>;
  deleteProvider: (providerId: string) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  setApiKey: (providerId: string, apiKey: string) => Promise<void>;
  updateProviderWithKey: (
    providerId: string,
    updates: Partial<ProviderConfig>,
    apiKey?: string,
  ) => Promise<void>;
  deleteApiKey: (providerId: string) => Promise<void>;
  setDefaultProvider: (providerId: string) => Promise<void>;
  setDefaultAccount: (accountId: string) => Promise<void>;
  validateApiKey: (
    providerId: string,
    apiKey: string,
    options?: ProviderValidationOptions,
  ) => Promise<{ valid: boolean; error?: string }>;
  getApiKey: (providerId: string) => Promise<string | null>;
}

export type ProviderStore = ProviderStoreState & ProviderStoreAction;

export type {
  ProviderAccount,
  ProviderConfig,
  ProviderVendorInfo,
  ProviderWithKeyInfo,
} from '@/lib/providers';
export type { ProviderSnapshot } from '@/lib/provider-accounts';
