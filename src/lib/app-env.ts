export type ClawXAppEnv = 'development' | 'test' | 'production';

type RuntimeEnv = Partial<ImportMetaEnv> & {
  MODE?: string;
  DEV?: boolean;
  PROD?: boolean;
};

const DEV_CLOUD_API_BASE_URL = 'http://localhost:3000';
const PROD_CLOUD_API_BASE_URL = 'https://api.jizhiai.gz4399.com';
const DEV_REMOTE_JIZHI_CHAT_URL = 'https://local-jizhiai-main.gz4399.com/';
const PROD_REMOTE_JIZHI_CHAT_URL = 'https://jizhiai.gz4399.com/';

function normalizeEnvName(value: string | undefined): ClawXAppEnv | null {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'development' || normalized === 'dev' || normalized === 'local') {
    return 'development';
  }
  if (normalized === 'test' || normalized === 'testing' || normalized === 'staging' || normalized === 'stage') {
    return 'test';
  }
  if (normalized === 'production' || normalized === 'prod') {
    return 'production';
  }
  return null;
}

function normalizeBaseUrl(value: string | undefined): string | null {
  const normalized = (value || '').trim();
  return normalized ? normalized.replace(/\/$/, '') : null;
}

function normalizeAppUrl(value: string | undefined): string | null {
  const normalized = (value || '').trim();
  if (!normalized) return null;
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function normalizeBooleanFlag(value: string | undefined): boolean {
  const normalized = (value || '').trim().toLowerCase();
  return normalized === '1'
    || normalized === 'true'
    || normalized === 'yes'
    || normalized === 'on';
}

export function resolveClawXAppEnv(env: RuntimeEnv = import.meta.env): ClawXAppEnv {
  const explicit = normalizeEnvName(env.VITE_APP_ENV);
  if (explicit) return explicit;

  const mode = normalizeEnvName(env.MODE);
  if (mode) return mode;

  if (env.PROD) return 'production';
  return 'development';
}

export function resolveDefaultCloudApiBase(env: RuntimeEnv = import.meta.env): string {
  const explicit = normalizeBaseUrl(env.VITE_CLOUD_API_BASE_URL);
  if (explicit) return explicit;

  return resolveClawXAppEnv(env) === 'development'
    ? DEV_CLOUD_API_BASE_URL
    : PROD_CLOUD_API_BASE_URL;
}

export function resolveRemoteJizhiChatUrl(env: RuntimeEnv = import.meta.env): string {
  const explicit = normalizeAppUrl(env.VITE_REMOTE_JIZHI_CHAT_URL);
  if (explicit) return explicit;

  return resolveClawXAppEnv(env) === 'development'
    ? DEV_REMOTE_JIZHI_CHAT_URL
    : PROD_REMOTE_JIZHI_CHAT_URL;
}

export function resolveCloudOnlyMode(env: RuntimeEnv = import.meta.env): boolean {
  return normalizeBooleanFlag(env.VITE_CLAWX_CLOUD_ONLY);
}
