import type { BrowserUseNavigationConfig } from '../../shared/browser-use';

const BLOCKED_SCHEMES = new Set(['javascript:', 'data:', 'file:', 'vbscript:']);

const LOCALHOST_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
  '::1',
]);

function isLocalhostUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return (
    LOCALHOST_HOSTS.has(hostname) ||
    hostname.endsWith('.localhost')
  );
}

export function isNavigationAllowed(
  rawUrl: string,
  config: BrowserUseNavigationConfig,
): boolean {
  // Always allow about:blank
  if (rawUrl === 'about:blank' || rawUrl === '') {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  // Block dangerous schemes
  if (BLOCKED_SCHEMES.has(parsed.protocol)) {
    return false;
  }

  // Only allow http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  switch (config.mode) {
    case 'unrestricted':
      return true;

    case 'allowlist': {
      if (isLocalhostUrl(parsed)) return true;
      const origin = parsed.origin.toLowerCase();
      return config.allowedOrigins.some(
        (allowed) => origin === allowed.toLowerCase(),
      );
    }

    case 'localhost-only':
    default:
      return isLocalhostUrl(parsed);
  }
}
