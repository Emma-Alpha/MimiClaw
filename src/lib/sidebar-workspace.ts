export type NormalizedWorkspacePath = string;

function trimTrailingSeparators(value: string): string {
  return value.replace(/[\\/]+$/, '');
}

export function normalizeWorkspacePath(input: string): NormalizedWorkspacePath {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const unified = trimTrailingSeparators(trimmed.replace(/\\/g, '/'));
  const platform = window.electron?.platform;
  if (platform === 'win32') {
    return unified.toLowerCase();
  }
  return unified;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function fallbackHashHex(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1)
      + (hash << 4)
      + (hash << 7)
      + (hash << 8)
      + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').repeat(8);
}

export async function hashWorkspacePath(normalizedPath: string): Promise<string> {
  if (!normalizedPath) return '';
  try {
    const bytes = new TextEncoder().encode(normalizedPath);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return toHex(new Uint8Array(digest));
  } catch {
    return fallbackHashHex(normalizedPath);
  }
}

export async function buildWorkspaceId(rootPath: string): Promise<string> {
  const normalized = normalizeWorkspacePath(rootPath);
  if (!normalized) return '';
  const hash = await hashWorkspacePath(normalized);
  return hash.slice(0, 20);
}

export function deriveWorkspaceName(rootPath: string): string {
  const normalized = normalizeWorkspacePath(rootPath);
  if (!normalized) return '';
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? normalized;
}
