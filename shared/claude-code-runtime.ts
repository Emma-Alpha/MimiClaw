/**
 * Constants and platform resolution for the runtime-installed Claude CLI.
 *
 * The CLI is downloaded from Anthropic's official release CDN on first run
 * (or version mismatch) into the app's userData directory, NOT into the user's
 * shell PATH. This keeps it isolated from any system-installed `claude`.
 *
 * Source of truth: this version is bumped together with app releases. The
 * downloader requires an exact match — it does NOT fetch "stable" or "latest".
 */
export const CLAUDE_CODE_RUNTIME_VERSION = '2.1.118';

export const CLAUDE_CODE_RELEASES_BASE_URL = 'https://downloads.claude.ai/claude-code-releases';

export type ClaudeCodePlatformId =
  | 'darwin-arm64'
  | 'darwin-x64'
  | 'linux-arm64'
  | 'linux-x64'
  | 'linux-arm64-musl'
  | 'linux-x64-musl'
  | 'win32-arm64'
  | 'win32-x64';

export interface ClaudeCodeManifestEntry {
  binary: string;
  checksum: string;
  size: number;
}

export interface ClaudeCodeManifest {
  version: string;
  commit?: string;
  buildDate?: string;
  platforms: Record<ClaudeCodePlatformId, ClaudeCodeManifestEntry>;
}

export type ClaudeCodeInstallStage =
  | 'idle'
  | 'fetching-manifest'
  | 'downloading'
  | 'verifying'
  | 'finalizing'
  | 'complete'
  | 'error';

export interface ClaudeCodeInstallProgress {
  stage: ClaudeCodeInstallStage;
  version: string;
  platform: ClaudeCodePlatformId;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  message?: string;
  error?: string;
}

export interface ClaudeCodeRuntimeStatus {
  installed: boolean;
  installedVersion: string | null;
  installedBinaryPath: string | null;
  expectedVersion: string;
  customCliPath: string | null;
  customCliPathValid: boolean;
}

export function getBinaryFilename(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'claude.exe' : 'claude';
}

/**
 * Resolve the platform identifier used by Anthropic's release CDN.
 *
 * @param libcVariant — only consulted on Linux. Pass 'musl' if the host is
 *   musl-based (Alpine etc.); defaults to glibc.
 */
export function resolvePlatformId(
  platform: NodeJS.Platform,
  arch: string,
  libcVariant: 'glibc' | 'musl' = 'glibc',
): ClaudeCodePlatformId {
  if (arch !== 'x64' && arch !== 'arm64') {
    throw new Error(`Unsupported arch for Claude CLI runtime: ${arch}`);
  }

  if (platform === 'darwin' || platform === 'win32') {
    return `${platform}-${arch}` as ClaudeCodePlatformId;
  }

  if (platform === 'linux') {
    return libcVariant === 'musl'
      ? (`linux-${arch}-musl` as ClaudeCodePlatformId)
      : (`linux-${arch}` as ClaudeCodePlatformId);
  }

  throw new Error(`Unsupported platform for Claude CLI runtime: ${platform}`);
}

export function buildManifestUrl(version: string): string {
  return `${CLAUDE_CODE_RELEASES_BASE_URL}/${version}/manifest.json`;
}

export function buildBinaryUrl(version: string, platformId: ClaudeCodePlatformId, binaryFilename: string): string {
  return `${CLAUDE_CODE_RELEASES_BASE_URL}/${version}/${platformId}/${binaryFilename}`;
}
