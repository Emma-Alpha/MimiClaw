import { fetchProviderSnapshot } from '@/lib/provider-accounts';
import { hostApiFetch } from '@/lib/host-api';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type {
  ProviderAccount,
  ProviderConfig,
  ProviderStore,
  ProviderStoreAction,
  ProviderValidationOptions,
} from './types';

type Setter = StoreSetter<ProviderStore>;
type Getter = StoreGetter<ProviderStore>;

export class ProviderActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  refreshProviderSnapshot = async () => {
    this.#set({ loading: true, error: null });

    try {
      const snapshot = await fetchProviderSnapshot();

      this.#set({
        statuses: snapshot.statuses ?? [],
        accounts: snapshot.accounts ?? [],
        vendors: snapshot.vendors ?? [],
        defaultAccountId: snapshot.defaultAccountId ?? null,
        loading: false,
      });
    } catch (error) {
      this.#set({ error: String(error), loading: false });
    }
  };

  fetchProviders = async () => this.#get().refreshProviderSnapshot();

  addProvider = async (
    config: Omit<ProviderConfig, 'createdAt' | 'updatedAt'>,
    apiKey?: string,
  ) => {
    try {
      const now = new Date().toISOString();
      const fullConfig: ProviderConfig = {
        ...config,
        createdAt: now,
        updatedAt: now,
      };

      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/providers', {
        method: 'POST',
        body: JSON.stringify({ config: fullConfig, apiKey }),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save provider');
      }

      await this.#get().refreshProviderSnapshot();
    } catch (error) {
      console.error('Failed to add provider:', error);
      throw error;
    }
  };

  createAccount = async (account: ProviderAccount, apiKey?: string) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/provider-accounts', {
        method: 'POST',
        body: JSON.stringify({ account, apiKey }),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create provider account');
      }

      await this.#get().refreshProviderSnapshot();
    } catch (error) {
      console.error('Failed to add account:', error);
      throw error;
    }
  };

  addAccount = async (account: ProviderAccount, apiKey?: string) =>
    this.#get().createAccount(account, apiKey);

  updateProvider = async (
    providerId: string,
    updates: Partial<ProviderConfig>,
    apiKey?: string,
  ) => {
    try {
      const existing = this.#get().statuses.find((item) => item.id === providerId);
      if (!existing) {
        throw new Error('Provider not found');
      }

      const { hasKey: _hasKey, keyMasked: _keyMasked, ...providerConfig } = existing;
      void _hasKey;
      void _keyMasked;

      const updatedConfig: ProviderConfig = {
        ...providerConfig,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const result = await hostApiFetch<{ success: boolean; error?: string }>(
        `/api/providers/${encodeURIComponent(providerId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ updates: updatedConfig, apiKey }),
        },
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update provider');
      }

      await this.#get().refreshProviderSnapshot();
    } catch (error) {
      console.error('Failed to update provider:', error);
      throw error;
    }
  };

  updateAccount = async (
    accountId: string,
    updates: Partial<ProviderAccount>,
    apiKey?: string,
  ) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>(
        `/api/provider-accounts/${encodeURIComponent(accountId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ updates, apiKey }),
        },
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update provider account');
      }

      await this.#get().refreshProviderSnapshot();
    } catch (error) {
      console.error('Failed to update account:', error);
      throw error;
    }
  };

  deleteProvider = async (providerId: string) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>(
        `/api/providers/${encodeURIComponent(providerId)}`,
        { method: 'DELETE' },
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete provider');
      }

      await this.#get().refreshProviderSnapshot();
    } catch (error) {
      console.error('Failed to delete provider:', error);
      throw error;
    }
  };

  removeAccount = async (accountId: string) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>(
        `/api/provider-accounts/${encodeURIComponent(accountId)}`,
        { method: 'DELETE' },
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete provider account');
      }

      await this.#get().refreshProviderSnapshot();
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  };

  deleteAccount = async (accountId: string) => this.#get().removeAccount(accountId);

  setApiKey = async (providerId: string, apiKey: string) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>(
        `/api/providers/${encodeURIComponent(providerId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ updates: {}, apiKey }),
        },
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to set API key');
      }

      await this.#get().refreshProviderSnapshot();
    } catch (error) {
      console.error('Failed to set API key:', error);
      throw error;
    }
  };

  updateProviderWithKey = async (
    providerId: string,
    updates: Partial<ProviderConfig>,
    apiKey?: string,
  ) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>(
        `/api/providers/${encodeURIComponent(providerId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ updates, apiKey }),
        },
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update provider');
      }

      await this.#get().refreshProviderSnapshot();
    } catch (error) {
      console.error('Failed to update provider with key:', error);
      throw error;
    }
  };

  deleteApiKey = async (providerId: string) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>(
        `/api/providers/${encodeURIComponent(providerId)}?apiKeyOnly=1`,
        { method: 'DELETE' },
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete API key');
      }

      await this.#get().refreshProviderSnapshot();
    } catch (error) {
      console.error('Failed to delete API key:', error);
      throw error;
    }
  };

  setDefaultProvider = async (providerId: string) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/providers/default', {
        method: 'PUT',
        body: JSON.stringify({ providerId }),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to set default provider');
      }

      this.#set({ defaultAccountId: providerId });
    } catch (error) {
      console.error('Failed to set default provider:', error);
      throw error;
    }
  };

  setDefaultAccount = async (accountId: string) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>(
        '/api/provider-accounts/default',
        {
          method: 'PUT',
          body: JSON.stringify({ accountId }),
        },
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to set default provider account');
      }

      this.#set({ defaultAccountId: accountId });
    } catch (error) {
      console.error('Failed to set default account:', error);
      throw error;
    }
  };

  validateAccountApiKey = async (
    providerId: string,
    apiKey: string,
    options?: ProviderValidationOptions,
  ) => {
    try {
      return await hostApiFetch<{ valid: boolean; error?: string }>('/api/providers/validate', {
        method: 'POST',
        body: JSON.stringify({ providerId, apiKey, options }),
      });
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  };

  validateApiKey = async (
    providerId: string,
    apiKey: string,
    options?: ProviderValidationOptions,
  ) => this.#get().validateAccountApiKey(providerId, apiKey, options);

  getAccountApiKey = async (providerId: string) => {
    try {
      const result = await hostApiFetch<{ apiKey: string | null }>(
        `/api/providers/${encodeURIComponent(providerId)}/api-key`,
      );
      return result.apiKey;
    } catch {
      return null;
    }
  };

  getApiKey = async (providerId: string) => this.#get().getAccountApiKey(providerId);
}

export type ProviderAction = StorePublicActions<ProviderActionImpl>;

export const createProviderSlice = (
  set: Setter,
  get: Getter,
  api?: unknown,
): ProviderStoreAction => new ProviderActionImpl(set, get, api);
