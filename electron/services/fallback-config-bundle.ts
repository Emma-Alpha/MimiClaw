import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { getAllSettings, type AppSettings } from '../utils/store';
import {
  exportVolcengineSpeechStoredConfig,
  importVolcengineSpeechStoredConfig,
  type VolcengineSpeechStoredConfig,
} from './speech-config';
import {
  exportVoiceChatRealtimeStoredConfig,
  importVoiceChatRealtimeStoredConfig,
  type VoiceChatRealtimeStoredConfig,
} from './voice-chat-store';

const BUNDLE_VERSION = 1;
const BUNDLE_FILENAME = 'default-fallback-profile.json';

export type FallbackBundleSource = 'local' | 'bundled';
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';

const SETTINGS_KEYS: ReadonlyArray<keyof AppSettings> = [
  'gatewayAutoStart',
  'gatewayPort',
  'gatewayToken',
  'remoteGatewayUrl',
  'remoteGatewayToken',
  'cloudApiUrl',
  'cloudApiToken',
  'jizhiToken',
  'proxyEnabled',
  'proxyServer',
  'proxyHttpServer',
  'proxyHttpsServer',
  'proxyAllServer',
  'proxyBypassRules',
];

export interface FallbackBundlePlainPayload {
  settings: Partial<Pick<AppSettings, (typeof SETTINGS_KEYS)[number]>>;
  speech: VolcengineSpeechStoredConfig;
  voiceChat: VoiceChatRealtimeStoredConfig;
}

interface FallbackBundleEncryptedBlock {
  algorithm: 'aes-256-gcm';
  kdf: {
    name: 'pbkdf2';
    hash: 'sha256';
    iterations: number;
    salt: string;
  };
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface FallbackConfigBundle {
  schema: 'mimiclaw-fallback-config';
  version: number;
  createdAt: string;
  encrypted: true;
  encryptedPayload: FallbackBundleEncryptedBlock;
}

function toBase64(input: Buffer | Uint8Array): string {
  return Buffer.from(input).toString('base64');
}

function fromBase64(value: string): Buffer {
  return Buffer.from(value, 'base64');
}

function deriveKey(password: string, salt: Buffer, iterations: number): Buffer {
  return pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST);
}

function pickSettingsSubset(settings: AppSettings): FallbackBundlePlainPayload['settings'] {
  return SETTINGS_KEYS.reduce<FallbackBundlePlainPayload['settings']>((acc, key) => {
    acc[key] = settings[key] as never;
    return acc;
  }, {});
}

export function getDefaultFallbackBundlePath(): string {
  return join(app.getPath('userData'), BUNDLE_FILENAME);
}

export function getBundledFallbackBundlePath(): string {
  return join(process.resourcesPath, 'resources', 'fallback', BUNDLE_FILENAME);
}

export async function buildFallbackBundle(password: string): Promise<FallbackConfigBundle> {
  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    throw new Error('Password is required');
  }

  const settings = await getAllSettings();
  const [speech, voiceChat] = await Promise.all([
    exportVolcengineSpeechStoredConfig(),
    exportVoiceChatRealtimeStoredConfig(),
  ]);

  const payload: FallbackBundlePlainPayload = {
    settings: pickSettingsSubset(settings),
    speech,
    voiceChat,
  };

  const hasAnyValue = Object.values(payload.settings).some((value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'boolean') return value;
    return value != null;
  })
    || Boolean(payload.speech.appId || payload.speech.cluster || payload.speech.token)
    || Boolean(payload.voiceChat.appId || payload.voiceChat.accessKey);

  if (!hasAnyValue) {
    throw new Error('没有可导出的配置内容，请先在设置页填写语音/ASR/Gateway配置');
  }

  const serializedPayload = JSON.stringify(payload);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(normalizedPassword, salt, PBKDF2_ITERATIONS);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(serializedPayload, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    schema: 'mimiclaw-fallback-config',
    version: BUNDLE_VERSION,
    createdAt: new Date().toISOString(),
    encrypted: true,
    encryptedPayload: {
      algorithm: 'aes-256-gcm',
      kdf: {
        name: 'pbkdf2',
        hash: 'sha256',
        iterations: PBKDF2_ITERATIONS,
        salt: toBase64(salt),
      },
      iv: toBase64(iv),
      authTag: toBase64(authTag),
      ciphertext: toBase64(ciphertext),
    },
  };
}

export function decryptFallbackBundle(bundle: FallbackConfigBundle, password: string): FallbackBundlePlainPayload {
  if (bundle.schema !== 'mimiclaw-fallback-config') {
    throw new Error('Unsupported fallback bundle schema');
  }
  if (bundle.version !== BUNDLE_VERSION) {
    throw new Error(`Unsupported fallback bundle version: ${bundle.version}`);
  }
  if (!bundle.encrypted || !bundle.encryptedPayload) {
    throw new Error('Fallback bundle payload is missing');
  }

  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    throw new Error('Password is required');
  }

  const { encryptedPayload } = bundle;
  const iterations = encryptedPayload.kdf?.iterations ?? PBKDF2_ITERATIONS;
  const salt = fromBase64(encryptedPayload.kdf.salt);
  const iv = fromBase64(encryptedPayload.iv);
  const authTag = fromBase64(encryptedPayload.authTag);
  const ciphertext = fromBase64(encryptedPayload.ciphertext);

  try {
    const key = deriveKey(normalizedPassword, salt, iterations);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
    const parsed = JSON.parse(plaintext) as FallbackBundlePlainPayload;

    return {
      settings: parsed.settings ?? {},
      speech: parsed.speech ?? {
        appId: '',
        cluster: '',
        token: '',
        language: 'zh-CN',
        endpoint: 'wss://openspeech.bytedance.com/api/v2/asr',
      },
      voiceChat: parsed.voiceChat ?? {
        appId: '',
        accessKey: '',
        endpoint: 'wss://openspeech.bytedance.com/api/v3/realtime/dialogue',
      },
    };
  } catch {
    throw new Error('Invalid password or corrupted fallback bundle');
  }
}

export async function applyFallbackBundlePayload(payload: FallbackBundlePlainPayload): Promise<void> {
  const { setSetting } = await import('../utils/store');

  const settingEntries = Object.entries(payload.settings ?? {}) as Array<[keyof AppSettings, AppSettings[keyof AppSettings]]>;
  for (const [key, value] of settingEntries) {
    await setSetting(key, value);
  }

  await importVolcengineSpeechStoredConfig(payload.speech ?? {});
  await importVoiceChatRealtimeStoredConfig(payload.voiceChat ?? {});
}

export async function saveFallbackBundleToFile(bundle: FallbackConfigBundle, outputPath = getDefaultFallbackBundlePath()): Promise<string> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(bundle, null, 2), 'utf8');
  return outputPath;
}

export async function readFallbackBundleFromFile(filePath = getDefaultFallbackBundlePath()): Promise<FallbackConfigBundle | null> {
  try {
    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as FallbackConfigBundle;
    if (parsed?.schema !== 'mimiclaw-fallback-config') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function readFallbackBundlePreferLocalThenBundled(): Promise<{ bundle: FallbackConfigBundle | null; path: string | null; source: FallbackBundleSource | null }> {
  const localPath = getDefaultFallbackBundlePath();
  const localBundle = await readFallbackBundleFromFile(localPath);
  if (localBundle) {
    return { bundle: localBundle, path: localPath, source: 'local' };
  }

  const bundledPath = getBundledFallbackBundlePath();
  const bundledBundle = await readFallbackBundleFromFile(bundledPath);
  if (bundledBundle) {
    return { bundle: bundledBundle, path: bundledPath, source: 'bundled' };
  }

  return { bundle: null, path: null, source: null };
}
