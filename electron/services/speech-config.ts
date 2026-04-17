const DEFAULT_VOLCENGINE_ASR_ENDPOINT = 'wss://openspeech.bytedance.com/api/v2/asr';

export type VolcengineSpeechLanguage = 'zh-CN' | 'en-US' | 'ja-JP';

interface SpeechConfigStoreShape {
  volcengine: {
    appId: string;
    cluster: string;
    token: string;
    language: VolcengineSpeechLanguage;
    endpoint: string;
  };
}

export interface VolcengineSpeechConfigState {
  provider: 'volcengine-asr';
  configured: boolean;
  appId: string;
  cluster: string;
  language: VolcengineSpeechLanguage;
  endpoint: string;
  hasToken: boolean;
  tokenMasked: string | null;
}

export interface VolcengineSpeechCredentials {
  appId: string;
  cluster: string;
  token: string;
  language: VolcengineSpeechLanguage;
  endpoint: string;
}

export interface VolcengineSpeechStoredConfig {
  appId: string;
  cluster: string;
  token: string;
  language: VolcengineSpeechLanguage;
  endpoint: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let speechStoreInstance: any = null;

async function getSpeechStore() {
  if (!speechStoreInstance) {
    const Store = (await import('electron-store')).default;
    speechStoreInstance = new Store<SpeechConfigStoreShape>({
      name: 'speech',
      defaults: {
        volcengine: {
          appId: '',
          cluster: '',
          token: '',
          language: 'zh-CN',
          endpoint: DEFAULT_VOLCENGINE_ASR_ENDPOINT,
        },
      },
    });
  }

  return speechStoreInstance;
}

function normalizeEndpoint(value: string): string {
  const trimmed = value.trim();
  return trimmed || DEFAULT_VOLCENGINE_ASR_ENDPOINT;
}

function maskSecret(secret: string): string | null {
  const trimmed = secret.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}***`;
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
}

export async function getVolcengineSpeechConfigState(): Promise<VolcengineSpeechConfigState> {
  const store = await getSpeechStore();
  const value = store.get('volcengine');
  const appId = value.appId.trim();
  const cluster = value.cluster.trim();
  const token = value.token.trim();
  const endpoint = normalizeEndpoint(value.endpoint);

  return {
    provider: 'volcengine-asr',
    configured: Boolean(appId && cluster && token),
    appId,
    cluster,
    language: value.language,
    endpoint,
    hasToken: Boolean(token),
    tokenMasked: maskSecret(token),
  };
}

export async function saveVolcengineSpeechConfig(input: {
  appId?: string;
  cluster?: string;
  token?: string;
  language?: string;
  endpoint?: string;
  clearToken?: boolean;
}): Promise<VolcengineSpeechConfigState> {
  const store = await getSpeechStore();
  const current = store.get('volcengine');
  const nextToken = input.clearToken
    ? ''
    : typeof input.token === 'string' && input.token.trim()
      ? input.token.trim()
      : current.token;
  const nextLanguage = input.language === 'en-US' || input.language === 'ja-JP' || input.language === 'zh-CN'
    ? input.language
    : current.language;

  store.set('volcengine', {
    appId: typeof input.appId === 'string' ? input.appId.trim() : current.appId,
    cluster: typeof input.cluster === 'string' ? input.cluster.trim() : current.cluster,
    token: nextToken,
    language: nextLanguage,
    endpoint: typeof input.endpoint === 'string' ? normalizeEndpoint(input.endpoint) : normalizeEndpoint(current.endpoint),
  });

  return await getVolcengineSpeechConfigState();
}

export async function getVolcengineSpeechCredentials(): Promise<VolcengineSpeechCredentials> {
  const store = await getSpeechStore();
  const value = store.get('volcengine');
  const appId = value.appId.trim();
  const cluster = value.cluster.trim();
  const token = value.token.trim();
  const endpoint = normalizeEndpoint(value.endpoint);

  if (!appId || !cluster || !token) {
    throw new Error('Volcengine ASR is not configured. Please fill in App ID, Access Token, and Cluster first.');
  }

  return {
    appId,
    cluster,
    token,
    language: value.language,
    endpoint,
  };
}

export async function getVolcengineSpeechAccessToken(): Promise<string> {
  const store = await getSpeechStore();
  const value = store.get('volcengine');
  return value.token.trim();
}

export async function exportVolcengineSpeechStoredConfig(): Promise<VolcengineSpeechStoredConfig> {
  const store = await getSpeechStore();
  const value = store.get('volcengine');
  return {
    appId: value.appId.trim(),
    cluster: value.cluster.trim(),
    token: value.token.trim(),
    language: value.language,
    endpoint: normalizeEndpoint(value.endpoint),
  };
}

export async function importVolcengineSpeechStoredConfig(input: Partial<VolcengineSpeechStoredConfig>): Promise<void> {
  const store = await getSpeechStore();
  const current = store.get('volcengine');
  const nextLanguage = input.language === 'en-US' || input.language === 'ja-JP' || input.language === 'zh-CN'
    ? input.language
    : current.language;

  store.set('volcengine', {
    appId: typeof input.appId === 'string' ? input.appId.trim() : current.appId,
    cluster: typeof input.cluster === 'string' ? input.cluster.trim() : current.cluster,
    token: typeof input.token === 'string' ? input.token.trim() : current.token,
    language: nextLanguage,
    endpoint: typeof input.endpoint === 'string' ? normalizeEndpoint(input.endpoint) : normalizeEndpoint(current.endpoint),
  });
}
