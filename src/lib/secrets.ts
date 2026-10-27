import type { ProviderId, SecretStore } from '../ai/types.ts';

/** Pass the imported expo-secure-store module. No API key ever enters Zustand or SQLite. */
export interface SecureStoreModule {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export function createSecretStore(secureStore: SecureStoreModule, profileId: string): SecretStore {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(profileId)) throw new Error('Invalid profile ID');
  const key = (provider: ProviderId) => `ckai.${profileId}.${provider}.api-key`;
  return {
    get: provider => secureStore.getItemAsync(key(provider)),
    async set(provider, value) {
      const cleaned = value.trim();
      if (!cleaned || /[\r\n]/.test(cleaned)) throw new Error('Invalid key');
      await secureStore.setItemAsync(key(provider), cleaned);
    },
    remove: provider => secureStore.deleteItemAsync(key(provider)),
  };
}
