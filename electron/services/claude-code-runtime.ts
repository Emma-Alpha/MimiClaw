/**
 * Runtime install service for the Claude Code CLI.
 *
 * Downloads the platform-matched binary from Anthropic's official release CDN
 * into the app's userData directory on first run (or version mismatch), then
 * exposes the binary path to callers (manager.ts, paths.ts).
 *
 * The binary is NOT placed on the user's PATH — it lives at
 *   {userData}/runtime/claude-code/{version}/{claude|claude.exe}
 * and is invoked by absolute path, so a user-installed `claude` elsewhere on
 * the system stays untouched.
 */
import { promises as fs, createWriteStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { app } from 'electron';

import {
  CLAUDE_CODE_RUNTIME_VERSION,
  buildBinaryUrl,
  buildManifestUrl,
  getBinaryFilename,
  resolvePlatformId,
  type ClaudeCodeInstallProgress,
  type ClaudeCodeInstallStage,
  type ClaudeCodeManifest,
  type ClaudeCodePlatformId,
  type ClaudeCodeRuntimeStatus,
} from '../../shared/claude-code-runtime';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

const VERSION_METADATA_FILE = '.version.json';
const PARTIAL_SUFFIX = '.partial';
const DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const HTTP_FOLLOW_REDIRECT_DEPTH = 5;

export type ProgressListener = (progress: ClaudeCodeInstallProgress) => void;

interface VersionMetadata {
  version: string;
  platform: ClaudeCodePlatformId;
  installedAt: string;
  checksum: string;
  size: number;
}

function getInstallRoot(): string {
  return join(app.getPath('userData'), 'runtime', 'claude-code');
}

function getVersionDir(version: string): string {
  return join(getInstallRoot(), version);
}

function getInstalledBinaryPath(version: string): string {
  return join(getVersionDir(version), getBinaryFilename(process.platform));
}

function getMetadataPath(version: string): string {
  return join(getVersionDir(version), VERSION_METADATA_FILE);
}

function detectLinuxLibc(): 'glibc' | 'musl' {
  if (process.platform !== 'linux') return 'glibc';
  // Match the heuristic used by Anthropic's install.sh — presence of musl libc files.
  const muslMarkers = [
    '/lib/libc.musl-x86_64.so.1',
    '/lib/libc.musl-aarch64.so.1',
    '/lib/ld-musl-x86_64.so.1',
    '/lib/ld-musl-aarch64.so.1',
  ];
  for (const marker of muslMarkers) {
    if (existsSync(marker)) return 'musl';
  }
  return 'glibc';
}

function getCurrentPlatformId(): ClaudeCodePlatformId {
  return resolvePlatformId(process.platform, process.arch, detectLinuxLibc());
}

async function readMetadata(version: string): Promise<VersionMetadata | null> {
  try {
    const raw = await fs.readFile(getMetadataPath(version), 'utf8');
    return JSON.parse(raw) as VersionMetadata;
  } catch {
    return null;
  }
}

async function writeMetadata(version: string, meta: VersionMetadata): Promise<void> {
  await fs.writeFile(getMetadataPath(version), JSON.stringify(meta, null, 2), 'utf8');
}

/** Whether the expected version is fully installed on disk. */
export async function isInstalled(version = CLAUDE_CODE_RUNTIME_VERSION): Promise<boolean> {
  const binary = getInstalledBinaryPath(version);
  if (!existsSync(binary)) return false;

  const meta = await readMetadata(version);
  if (!meta || meta.version !== version) return false;

  try {
    const stat = statSync(binary);
    if (stat.size !== meta.size) return false;
  } catch {
    return false;
  }

  return true;
}

/** Resolve the installed binary path for the canonical version, if installed. */
export async function getInstalledRuntimeBinary(): Promise<string | null> {
  if (!(await isInstalled(CLAUDE_CODE_RUNTIME_VERSION))) return null;
  return getInstalledBinaryPath(CLAUDE_CODE_RUNTIME_VERSION);
}

export async function getRuntimeStatus(customCliPath?: string | null): Promise<ClaudeCodeRuntimeStatus> {
  const installedVersions = await listInstalledVersions();
  const expected = CLAUDE_CODE_RUNTIME_VERSION;
  const isExpectedInstalled = installedVersions.includes(expected);

  let customValid = false;
  if (customCliPath && customCliPath.trim()) {
    try {
      customValid = existsSync(customCliPath.trim());
    } catch {
      customValid = false;
    }
  }

  return {
    installed: isExpectedInstalled,
    installedVersion: isExpectedInstalled ? expected : (installedVersions[0] ?? null),
    installedBinaryPath: isExpectedInstalled ? getInstalledBinaryPath(expected) : null,
    expectedVersion: expected,
    customCliPath: customCliPath?.trim() || null,
    customCliPathValid: customValid,
  };
}

async function listInstalledVersions(): Promise<string[]> {
  try {
    const entries = await fs.readdir(getInstallRoot(), { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => /^\d+\.\d+\.\d+/.test(name))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/**
 * Download `url` and stream into `destPath` while computing SHA-256 inline.
 * Reports progress via the provided callback. Returns the final hash hex.
 */
function downloadToFile(
  url: string,
  destPath: string,
  expectedTotalBytes: number,
  onChunk: (downloaded: number, total: number) => void,
  redirectsLeft = HTTP_FOLLOW_REDIRECT_DEPTH,
): Promise<{ hash: string; size: number }> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: 'GET' }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
        const location = res.headers.location;
        if (!location || redirectsLeft <= 0) {
          reject(new Error(`HTTP ${res.statusCode} redirect without usable Location header`));
          return;
        }
        res.resume();
        const nextUrl = new URL(location, url).toString();
        downloadToFile(nextUrl, destPath, expectedTotalBytes, onChunk, redirectsLeft - 1).then(resolve, reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        res.resume();
        return;
      }

      const total = Number(res.headers['content-length'] || expectedTotalBytes || 0);
      const hasher = createHash('sha256');
      const fileStream = createWriteStream(destPath, { flags: 'w' });
      let downloaded = 0;

      res.on('data', (chunk: Buffer) => {
        hasher.update(chunk);
        downloaded += chunk.length;
        onChunk(downloaded, total || expectedTotalBytes);
      });

      res.on('error', (err) => {
        fileStream.destroy();
        reject(err);
      });

      fileStream.on('error', (err) => {
        res.destroy();
        reject(err);
      });

      fileStream.on('finish', () => {
        resolve({ hash: hasher.digest('hex'), size: downloaded });
      });

      res.pipe(fileStream);
    });

    req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
      req.destroy(new Error(`Download timed out after ${DOWNLOAD_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
    req.end();
  });
}

function fetchJson<T>(url: string, redirectsLeft = HTTP_FOLLOW_REDIRECT_DEPTH): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: 'GET' }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
        const location = res.headers.location;
        if (!location || redirectsLeft <= 0) {
          reject(new Error(`HTTP ${res.statusCode} redirect without usable Location header`));
          return;
        }
        res.resume();
        const nextUrl = new URL(location, url).toString();
        fetchJson<T>(nextUrl, redirectsLeft - 1).then(resolve, reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        res.resume();
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch (err) {
          reject(new Error(`Failed to parse JSON from ${url}: ${(err as Error).message}`));
        }
      });
      res.on('error', reject);
    });
    req.setTimeout(60_000, () => req.destroy(new Error('Manifest fetch timed out')));
    req.on('error', reject);
    req.end();
  });
}

async function stripMacQuarantine(binaryPath: string): Promise<void> {
  if (process.platform !== 'darwin') return;
  try {
    await execFileAsync('xattr', ['-d', 'com.apple.quarantine', binaryPath]);
  } catch (err) {
    // Non-fatal: xattr may not be present, or attribute may not exist.
    // Gatekeeper will then prompt; we log and continue.
    logger.warn(`[claude-code-runtime] xattr cleanup skipped: ${(err as Error).message}`);
  }
}

/**
 * Install the canonical Claude CLI version into the app's userData directory.
 * Idempotent: returns immediately if already installed at the expected version.
 */
export async function install(
  version: string,
  onProgress?: ProgressListener,
): Promise<{ binaryPath: string; version: string }> {
  const platformId = getCurrentPlatformId();
  const versionDir = getVersionDir(version);
  const binaryPath = getInstalledBinaryPath(version);
  const partialPath = `${binaryPath}${PARTIAL_SUFFIX}`;

  const emit = (stage: ClaudeCodeInstallStage, partial: Partial<ClaudeCodeInstallProgress> = {}) => {
    if (!onProgress) return;
    const downloaded = partial.downloadedBytes ?? 0;
    const total = partial.totalBytes ?? 0;
    onProgress({
      stage,
      version,
      platform: platformId,
      downloadedBytes: downloaded,
      totalBytes: total,
      percent: total > 0 ? Math.min(100, (downloaded / total) * 100) : 0,
      message: partial.message,
      error: partial.error,
    });
  };

  if (await isInstalled(version)) {
    emit('complete', { message: 'Already installed' });
    return { binaryPath, version };
  }

  await fs.mkdir(versionDir, { recursive: true });

  // Step 1: fetch manifest
  emit('fetching-manifest');
  let manifest: ClaudeCodeManifest;
  try {
    manifest = await fetchJson<ClaudeCodeManifest>(buildManifestUrl(version));
  } catch (err) {
    emit('error', { error: `Failed to fetch manifest: ${(err as Error).message}` });
    throw err;
  }

  const platformEntry = manifest.platforms[platformId];
  if (!platformEntry) {
    const msg = `Manifest for v${version} does not list platform ${platformId}`;
    emit('error', { error: msg });
    throw new Error(msg);
  }

  // Step 2: download binary with progress + streaming hash
  emit('downloading', { totalBytes: platformEntry.size, message: 'Downloading Claude CLI…' });
  let lastReportedAt = 0;
  const PROGRESS_THROTTLE_MS = 200;
  let downloadResult: { hash: string; size: number };
  try {
    downloadResult = await downloadToFile(
      buildBinaryUrl(version, platformId, platformEntry.binary),
      partialPath,
      platformEntry.size,
      (downloaded, total) => {
        const now = Date.now();
        if (now - lastReportedAt < PROGRESS_THROTTLE_MS && downloaded < total) return;
        lastReportedAt = now;
        emit('downloading', { downloadedBytes: downloaded, totalBytes: total });
      },
    );
  } catch (err) {
    await fs.rm(partialPath, { force: true }).catch(() => undefined);
    emit('error', { error: `Download failed: ${(err as Error).message}` });
    throw err;
  }

  // Step 3: verify checksum + size
  emit('verifying', { message: 'Verifying integrity…' });
  if (downloadResult.hash !== platformEntry.checksum) {
    await fs.rm(partialPath, { force: true }).catch(() => undefined);
    const msg = `Checksum mismatch: expected ${platformEntry.checksum}, got ${downloadResult.hash}`;
    emit('error', { error: msg });
    throw new Error(msg);
  }
  if (downloadResult.size !== platformEntry.size) {
    await fs.rm(partialPath, { force: true }).catch(() => undefined);
    const msg = `Size mismatch: expected ${platformEntry.size}, got ${downloadResult.size}`;
    emit('error', { error: msg });
    throw new Error(msg);
  }

  // Step 4: atomic rename + permissions + xattr
  emit('finalizing', { message: 'Finalizing install…' });
  await fs.rm(binaryPath, { force: true }).catch(() => undefined);
  await fs.rename(partialPath, binaryPath);
  if (process.platform !== 'win32') {
    await fs.chmod(binaryPath, 0o755);
  }
  await stripMacQuarantine(binaryPath);

  await writeMetadata(version, {
    version,
    platform: platformId,
    installedAt: new Date().toISOString(),
    checksum: downloadResult.hash,
    size: downloadResult.size,
  });

  emit('complete', {
    downloadedBytes: downloadResult.size,
    totalBytes: downloadResult.size,
    message: 'Install complete',
  });
  logger.info(`[claude-code-runtime] Installed v${version} (${platformId}) at ${binaryPath}`);
  return { binaryPath, version };
}

/**
 * Remove installed versions other than the current expected one, keeping at
 * most `keepN` previous versions for rollback.
 */
export async function cleanupOldVersions(keepN = 1): Promise<number> {
  const versions = await listInstalledVersions();
  const protectedSet = new Set<string>([CLAUDE_CODE_RUNTIME_VERSION]);
  for (const v of versions.filter((v) => v !== CLAUDE_CODE_RUNTIME_VERSION).slice(0, keepN)) {
    protectedSet.add(v);
  }

  let removed = 0;
  for (const v of versions) {
    if (protectedSet.has(v)) continue;
    try {
      await fs.rm(getVersionDir(v), { recursive: true, force: true });
      removed++;
      logger.info(`[claude-code-runtime] Removed stale version ${v}`);
    } catch (err) {
      logger.warn(`[claude-code-runtime] Failed to remove ${v}: ${(err as Error).message}`);
    }
  }
  return removed;
}

export const __pathsForTesting = {
  getInstallRoot,
  getInstalledBinaryPath,
  getVersionDir,
};
