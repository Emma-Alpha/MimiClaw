/**
 * Cloud Config Bridge — main-process helper that forwards openclaw config
 * mutations to the cloud control-plane API instead of (or in addition to)
 * writing to the local ~/.openclaw/openclaw.json.
 *
 * When `cloudApiUrl` and `cloudApiToken` are set in the app settings, all
 * write operations are routed to the cloud backend.  Reads are also proxied
 * so that pages can display up-to-date cloud state even in remote mode.
 */

import { getSetting } from './store.js';
import { logger } from './logger.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function summarizeBodyPreview(value: string, maxLength = 120): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '<empty>';
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}

async function parseJsonResponse<T>(
  response: Response,
  requestLabel: string,
): Promise<T | null> {
  const rawText = await response.text().catch(() => '');
  if (!rawText.trim()) {
    return null;
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const looksLikeJson = rawText.trim().startsWith('{') || rawText.trim().startsWith('[');
  if (!contentType.includes('application/json') && !looksLikeJson) {
    logger.warn(
      `[cloud-config] ${requestLabel} returned non-JSON content (${contentType || 'unknown'}): ${summarizeBodyPreview(rawText)}`,
    );
    return null;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch (error) {
    logger.warn(
      `[cloud-config] ${requestLabel} returned invalid JSON: ${summarizeBodyPreview(rawText)}`,
      error,
    );
    return null;
  }
}

async function getCloudCredentials(): Promise<{ apiUrl: string; token: string } | null> {
  const [apiUrl, token] = await Promise.all([
    getSetting('cloudApiUrl'),
    getSetting('cloudApiToken'),
  ]);

  if (!apiUrl || !token) {
    return null;
  }

  return { apiUrl: apiUrl.replace(/\/$/, ''), token };
}

async function cloudFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T | null> {
  const creds = await getCloudCredentials();
  if (!creds) {
    return null;
  }

  const url = `${creds.apiUrl}${path}`;
  const requestLabel = `${init.method ?? 'GET'} ${url}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.token}`,
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn(`[cloud-config] ${requestLabel} → ${res.status}: ${summarizeBodyPreview(body)}`);
      return null;
    }

    if (res.status === 204) {
      return null;
    }

    return await parseJsonResponse<T>(res, requestLabel);
  } catch (err) {
    logger.warn(`[cloud-config] Failed to call cloud API (${requestLabel}):`, err);
    return null;
  }
}

// ── Cloud mode detection ──────────────────────────────────────────────────────

/** Returns true when the app is configured to use a cloud control-plane. */
export async function isCloudMode(): Promise<boolean> {
  const creds = await getCloudCredentials();
  return creds !== null;
}

// ── Config read/write ─────────────────────────────────────────────────────────

export type OpenClawCloudConfig = Record<string, unknown>;

/** Fetch the full openclaw config from the cloud backend for the current user. */
export async function getCloudConfig(): Promise<OpenClawCloudConfig | null> {
  return cloudFetch<OpenClawCloudConfig>('/api/config', { method: 'GET' });
}

/**
 * Shallow-merge `patch` into the cloud openclaw config.
 * A `null` value in the patch removes the top-level key.
 */
export async function patchCloudConfig(
  patch: Record<string, unknown>,
): Promise<boolean> {
  const result = await cloudFetch<{ ok: boolean }>('/api/config', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return result?.ok === true;
}

/** Replace the entire openclaw config in the cloud backend. */
export async function putCloudConfig(
  config: OpenClawCloudConfig,
): Promise<boolean> {
  const result = await cloudFetch<{ ok: boolean }>('/api/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
  return result?.ok === true;
}

// ── Section helpers ───────────────────────────────────────────────────────────

/**
 * Merge `data` into the `channels.<channelType>` section of the cloud config.
 * Passing `null` removes the channel section entirely.
 */
export async function patchCloudChannelConfig(
  channelType: string,
  data: Record<string, unknown> | null,
): Promise<boolean> {
  const current = await getCloudConfig();
  if (current === null) {
    return false;
  }

  const channels = (current.channels ?? {}) as Record<string, unknown>;
  if (data === null) {
    delete channels[channelType];
  } else {
    channels[channelType] = data;
  }

  return patchCloudConfig({ channels });
}

/**
 * Merge `entry` into `skills.entries.<skillKey>` of the cloud config.
 * Passing `null` removes the entry.
 */
export async function patchCloudSkillConfig(
  skillKey: string,
  entry: Record<string, unknown> | null,
): Promise<boolean> {
  const current = await getCloudConfig();
  if (current === null) {
    return false;
  }

  const skills = (current.skills ?? {}) as Record<string, unknown>;
  const entries = (skills.entries ?? {}) as Record<string, unknown>;

  if (entry === null) {
    delete entries[skillKey];
  } else {
    entries[skillKey] = { ...(entries[skillKey] as Record<string, unknown> ?? {}), ...entry };
  }

  skills.entries = entries;
  return patchCloudConfig({ skills });
}

/**
 * Merge `providerConfig` into `providers.<providerKey>` of the cloud config.
 * Also updates the `env` section with the provider API key if given.
 * Passing `null` removes the provider entry.
 */
export async function patchCloudProviderConfig(
  providerKey: string,
  providerConfig: Record<string, unknown> | null,
  opts?: { envKey?: string; envValue?: string },
): Promise<boolean> {
  const current = await getCloudConfig();
  if (current === null) {
    return false;
  }

  const providers = (current.providers ?? {}) as Record<string, unknown>;
  if (providerConfig === null) {
    delete providers[providerKey];
  } else {
    providers[providerKey] = {
      ...(providers[providerKey] as Record<string, unknown> ?? {}),
      ...providerConfig,
    };
  }

  const patch: Record<string, unknown> = { providers };

  if (opts?.envKey) {
    const env = (current.env ?? {}) as Record<string, unknown>;
    if (opts.envValue) {
      env[opts.envKey] = opts.envValue;
    } else {
      delete env[opts.envKey];
    }
    patch.env = env;
  }

  return patchCloudConfig(patch);
}

// ── Gateway status ────────────────────────────────────────────────────────────

export interface CloudGatewayStatus {
  workspaceId: string;
  gatewayState: 'stopped' | 'starting' | 'running' | 'error';
  gatewayWsUrl: string | null;
  gatewayPort: number | null;
  gatewayError: string | null;
}

/** Get the current gateway state from the cloud backend. */
export async function getCloudGatewayStatus(): Promise<CloudGatewayStatus | null> {
  return cloudFetch<CloudGatewayStatus>('/api/gateway/status', { method: 'GET' });
}

/** Ask the cloud backend to start the gateway for the current workspace. */
export async function startCloudGateway(): Promise<{ ok: boolean; gatewayWsUrl?: string } | null> {
  return cloudFetch('/api/gateway/start', { method: 'POST', body: '{}' });
}

/** Ask the cloud backend to stop the gateway for the current workspace. */
export async function stopCloudGateway(): Promise<{ ok: boolean } | null> {
  return cloudFetch('/api/gateway/stop', { method: 'POST', body: '{}' });
}

/** Ask the cloud backend to restart the gateway for the current workspace. */
export async function restartCloudGateway(): Promise<{ ok: boolean; gatewayWsUrl?: string } | null> {
  return cloudFetch('/api/gateway/restart', { method: 'POST', body: '{}' });
}
