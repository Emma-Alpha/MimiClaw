import type { ProviderStore } from './types';

export const aiModelSelectors = {
  modelById: (id: string) => (state: ProviderStore) => {
    const account = state.accounts.find((item) => item.id === id);
    if (!account) return undefined;
    return {
      id: account.id,
      model: account.model,
      providerId: account.vendorId,
      enabled: account.enabled,
      contextWindow: account.vendorId === 'anthropic' ? 200_000 : 128_000,
    };
  },
  supportsSearch: (id: string) => (state: ProviderStore) => {
    const account = state.accounts.find((item) => item.id === id);
    return account?.vendorId === 'google' || account?.vendorId === 'openai';
  },
  supportsFunctionCalling: (id: string) => (state: ProviderStore) => {
    const account = state.accounts.find((item) => item.id === id);
    return account?.vendorId !== 'ollama';
  },
};

export const aiProviderSelectors = {
  enabledProviders: (state: ProviderStore) => state.accounts.filter((account) => account.enabled),
  fcSearchModels: (state: ProviderStore) =>
    state.accounts
      .filter((account) => account.enabled && account.vendorId !== 'ollama')
      .map((account) => ({
        id: account.id,
        label: account.label,
        model: account.model,
        providerId: account.vendorId,
      })),
};
