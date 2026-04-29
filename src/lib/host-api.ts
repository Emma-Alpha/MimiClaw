import { invokeIpc } from '@/lib/api-client';
import { trackUiEvent } from './telemetry';
import { normalizeAppError } from './error-model';
export { cloudApiFetch, cloudLogin, cloudLogout, getCloudSession, setCloudSession, isCloudSessionValid } from './cloud-api';
export type { CloudSession, CloudLoginResult, WorkspaceStatus } from './cloud-api';

const HOST_API_PORT = 3210;
const HOST_API_BASE = `http://127.0.0.1:${HOST_API_PORT}`;

type HostApiProxyResponse = {
  ok?: boolean;
  data?: {
    status?: number;
    ok?: boolean;
    json?: unknown;
    text?: string;
  };
  error?: { message?: string } | string;
  // backward compatibility fields
  success: boolean;
  status?: number;
  json?: unknown;
  text?: string;
};

type HostApiProxyData = {
  status?: number;
  ok?: boolean;
  json?: unknown;
  text?: string;
};

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json() as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // ignore body parse failure
    }
    throw normalizeAppError(new Error(message), {
      source: 'browser-fallback',
      status: response.status,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
}

function resolveProxyErrorMessage(error: HostApiProxyResponse['error']): string {
  return typeof error === 'string'
    ? error
    : (error?.message || 'Host API proxy request failed');
}

function parseUnifiedProxyResponse<T>(
  response: HostApiProxyResponse,
  path: string,
  method: string,
  startedAt: number,
): T {
  if (!response.ok) {
    throw new Error(resolveProxyErrorMessage(response.error));
  }

  const data: HostApiProxyData = response.data ?? {};
  const httpStatus = data.status ?? 200;
  trackUiEvent('hostapi.fetch', {
    path,
    method,
    source: 'ipc-proxy',
    durationMs: Date.now() - startedAt,
    status: httpStatus,
  });

  if (httpStatus === 204) return undefined as T;

  if (httpStatus >= 400) {
    const errorBody = data.json as Record<string, unknown> | undefined;
    const msg = typeof errorBody?.error === 'string'
      ? errorBody.error
      : typeof errorBody?.message === 'string'
        ? errorBody.message
        : `Host API returned HTTP ${httpStatus}`;
    throw normalizeAppError(new Error(msg), { source: 'ipc-proxy', path, method, status: httpStatus });
  }

  if (data.json !== undefined) return data.json as T;
  return data.text as T;
}

function parseLegacyProxyResponse<T>(
  response: HostApiProxyResponse,
  path: string,
  method: string,
  startedAt: number,
): T {
  if (!response.success) {
    throw new Error(resolveProxyErrorMessage(response.error));
  }

  if (!response.ok) {
    const message = response.text
      || (typeof response.json === 'object' && response.json != null && 'error' in (response.json as Record<string, unknown>)
        ? String((response.json as Record<string, unknown>).error)
        : `HTTP ${response.status ?? 'unknown'}`);
    throw new Error(message);
  }

  trackUiEvent('hostapi.fetch', {
    path,
    method,
    source: 'ipc-proxy-legacy',
    durationMs: Date.now() - startedAt,
    status: response.status ?? 200,
  });

  if (response.status === 204) return undefined as T;
  if (response.json !== undefined) return response.json as T;
  return response.text as T;
}

function shouldFallbackToBrowser(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('invalid ipc channel: hostapi:fetch')
    || normalized.includes("no handler registered for 'hostapi:fetch'")
    || normalized.includes('no handler registered for "hostapi:fetch"')
    || normalized.includes('no handler registered for hostapi:fetch')
    || normalized.includes('window is not defined');
}

function allowLocalhostFallback(): boolean {
  try {
    return window.localStorage.getItem('mimiclaw:allow-localhost-fallback') === '1';
  } catch {
    return false;
  }
}

export async function hostApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const startedAt = Date.now();
  const method = init?.method || 'GET';
  // In Electron renderer, always proxy through main process to avoid CORS.
  try {
    const response = await invokeIpc<HostApiProxyResponse>('hostapi:fetch', {
      path,
      method,
      headers: headersToRecord(init?.headers),
      body: init?.body ?? null,
    });

    if (typeof response?.ok === 'boolean' && 'data' in response) {
      return parseUnifiedProxyResponse<T>(response, path, method, startedAt);
    }

    return parseLegacyProxyResponse<T>(response, path, method, startedAt);
  } catch (error) {
    const normalized = normalizeAppError(error, { source: 'ipc-proxy', path, method });
    const message = normalized.message;
    trackUiEvent('hostapi.fetch_error', {
      path,
      method,
      source: 'ipc-proxy',
      durationMs: Date.now() - startedAt,
      message,
      code: normalized.code,
    });
    if (!shouldFallbackToBrowser(message)) {
      throw normalized;
    }
    if (!allowLocalhostFallback()) {
      trackUiEvent('hostapi.fetch_error', {
        path,
        method,
        source: 'ipc-proxy',
        durationMs: Date.now() - startedAt,
        message: 'localhost fallback blocked by policy',
        code: 'CHANNEL_UNAVAILABLE',
      });
      throw normalized;
    }
  }

  // Browser-only fallback (non-Electron environments).
  const response = await fetch(`${HOST_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  trackUiEvent('hostapi.fetch', {
    path,
    method,
    source: 'browser-fallback',
    durationMs: Date.now() - startedAt,
    status: response.status,
  });
  try {
    return await parseResponse<T>(response);
  } catch (error) {
    throw normalizeAppError(error, { source: 'browser-fallback', path, method });
  }
}

export function createHostEventSource(path = '/api/events'): EventSource {
  return new EventSource(`${HOST_API_BASE}${path}`);
}

export function getHostApiBase(): string {
  return HOST_API_BASE;
}

// ── Cloud control-plane helpers (proxied through host-api) ─────────────────

export interface CloudConfigState {
  cloudMode: boolean;
  config: Record<string, unknown> | null;
}

export interface CloudGatewayState {
  cloudMode: boolean;
  gatewayState?: 'stopped' | 'starting' | 'running' | 'error';
  gatewayWsUrl?: string | null;
  gatewayPort?: number | null;
  gatewayError?: string | null;
}

/** Fetch the current cloud config (no-op if not in cloud mode). */
export async function fetchCloudConfig(): Promise<CloudConfigState> {
  return hostApiFetch<CloudConfigState>('/api/cloud/config');
}

/** Shallow-merge `patch` into the cloud config. */
export async function patchCloudConfigFromRenderer(
  patch: Record<string, unknown>,
): Promise<{ success: boolean }> {
  return hostApiFetch<{ success: boolean }>('/api/cloud/config', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** Get cloud gateway status. */
export async function fetchCloudGatewayStatus(): Promise<CloudGatewayState> {
  return hostApiFetch<CloudGatewayState>('/api/cloud/gateway/status');
}

/** Start the cloud gateway. */
export async function startCloudGatewayFromRenderer(): Promise<{ ok: boolean; gatewayWsUrl?: string }> {
  return hostApiFetch('/api/cloud/gateway/start', { method: 'POST' });
}

/** Stop the cloud gateway. */
export async function stopCloudGatewayFromRenderer(): Promise<{ ok: boolean }> {
  return hostApiFetch('/api/cloud/gateway/stop', { method: 'POST' });
}

/** Restart the cloud gateway. */
export async function restartCloudGatewayFromRenderer(): Promise<{ ok: boolean; gatewayWsUrl?: string }> {
  return hostApiFetch('/api/cloud/gateway/restart', { method: 'POST' });
}
