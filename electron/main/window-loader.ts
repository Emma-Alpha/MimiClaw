import type { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

export type WindowLoadRoute =
  | { type: 'url'; value: string }
  | { type: 'file'; value: string; hash?: string };

type LoadWindowRouteOptions = {
  windowName: string;
  maxAttempts?: number;
  initialRetryDelayMs?: number;
};

const RETRYABLE_LOAD_ERROR_NAMES = new Set([
  'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_RESET',
  'ERR_CONNECTION_CLOSED',
  'ERR_NETWORK_CHANGED',
  'ERR_TIMED_OUT',
  'ERR_ABORTED',
]);

const RETRYABLE_LOAD_ERROR_NUMBERS = new Set([
  -102, // ERR_CONNECTION_REFUSED
  -101, // ERR_CONNECTION_RESET
  -100, // ERR_CONNECTION_CLOSED
  -21,  // ERR_NETWORK_CHANGED
  -7,   // ERR_TIMED_OUT
  -3,   // ERR_ABORTED
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isLocalDevServerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function parsePort(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return null;
  }
  return parsed;
}

function inferDefaultPort(parsed: URL): number | null {
  if (parsed.protocol === 'http:') return 80;
  if (parsed.protocol === 'https:') return 443;
  return null;
}

function buildDevServerPortFallbackUrls(url: string, maxOffset = 3): string[] {
  try {
    const parsed = new URL(url);
    const originalPort = parsePort(parsed.port) ?? inferDefaultPort(parsed);
    if (!originalPort) return [];

    const candidates: string[] = [];
    for (let offset = 1; offset <= maxOffset; offset += 1) {
      const nextPort = originalPort + offset;
      if (nextPort > 65535) break;
      const candidate = new URL(url);
      candidate.port = String(nextPort);
      candidates.push(candidate.toString());
    }
    return candidates;
  } catch {
    return [];
  }
}

function updateDevServerBaseUrlEnv(resolvedUrl: string): void {
  try {
    const parsed = new URL(resolvedUrl);
    parsed.pathname = '/';
    parsed.search = '';
    parsed.hash = '';
    process.env.VITE_DEV_SERVER_URL = parsed.toString();
  } catch {
    // Ignore malformed URLs; keep existing env untouched.
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

function getNumericErrorCode(error: unknown, message: string): number | null {
  const candidate = (error as { errno?: unknown } | null)?.errno;
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return Math.trunc(candidate);
  }

  const match = message.match(/\((-?\d+)\)/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasRetryableLoadErrorToken(message: string): boolean {
  const upper = message.toUpperCase();
  for (const token of RETRYABLE_LOAD_ERROR_NAMES) {
    if (upper.includes(token)) {
      return true;
    }
  }
  return false;
}

function isRetryableWindowLoadError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const numericCode = getNumericErrorCode(error, message);

  if (numericCode !== null && RETRYABLE_LOAD_ERROR_NUMBERS.has(numericCode)) {
    return true;
  }

  return hasRetryableLoadErrorToken(message);
}

export function isBenignDevWindowLoadRejection(reason: unknown): boolean {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (!devServerUrl || !isLocalDevServerUrl(devServerUrl)) {
    return false;
  }

  if (!isRetryableWindowLoadError(reason)) {
    return false;
  }

  const message = getErrorMessage(reason).toUpperCase();
  const normalizedDevServerUrl = devServerUrl.replace(/\/+$/, '').toUpperCase();
  return (
    message.includes(`LOADING '${normalizedDevServerUrl}`) ||
    message.includes(`LOADING "${normalizedDevServerUrl}`) ||
    message.includes(normalizedDevServerUrl)
  );
}

export async function loadWindowRoute(
  win: BrowserWindow,
  route: WindowLoadRoute,
  options: LoadWindowRouteOptions,
): Promise<void> {
  if (route.type === 'file') {
    await win.loadFile(route.value, route.hash ? { hash: route.hash } : undefined);
    return;
  }

  const isRetryEnabled = isLocalDevServerUrl(route.value);
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? (isRetryEnabled ? 25 : 1)));
  let retryDelayMs = Math.max(50, Math.floor(options.initialRetryDelayMs ?? 120));
  const fallbackDevUrls = isRetryEnabled ? buildDevServerPortFallbackUrls(route.value) : [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await win.loadURL(route.value);
      return;
    } catch (error) {
      const shouldRetry = isRetryEnabled && isRetryableWindowLoadError(error) && attempt < maxAttempts;
      if (!shouldRetry || win.isDestroyed()) {
        if (isRetryEnabled && !win.isDestroyed() && isRetryableWindowLoadError(error)) {
          for (const fallbackUrl of fallbackDevUrls) {
            try {
              logger.warn(
                `[window-load] ${options.windowName} trying fallback dev URL "${fallbackUrl}" after failing "${route.value}"`,
              );
              await win.loadURL(fallbackUrl);
              updateDevServerBaseUrlEnv(fallbackUrl);
              return;
            } catch (fallbackError) {
              logger.warn(
                `[window-load] ${options.windowName} fallback dev URL failed: "${fallbackUrl}"`,
                fallbackError,
              );
            }
          }
        }
        throw error;
      }

      logger.warn(
        `[window-load] ${options.windowName} failed to load "${route.value}" (attempt ${attempt}/${maxAttempts}); retrying in ${retryDelayMs}ms`,
        error,
      );
      await sleep(retryDelayMs);
      retryDelayMs = Math.min(1000, Math.floor(retryDelayMs * 1.5));
    }
  }
}
