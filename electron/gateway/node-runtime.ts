/**
 * Ensures a Node.js + npx runtime for `npx skills@…` (Vercel skills CLI).
 * Prefers system npx; otherwise downloads Node LTS into ~/.mimiclaw/runtime/node.
 */
import { createWriteStream, existsSync, readdirSync, rmSync } from 'node:fs';
import { chmod, mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import https from 'node:https';
import { createHash } from 'node:crypto';
import { app } from 'electron';
import { getMimiClawConfigDir, ensureDir } from '../utils/paths';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

/** LTS line used by npx skills; bump intentionally when upgrading toolchains. */
export const BUNDLED_NODE_VERSION = '22.14.0';

export type NodeRuntimeState = 'idle' | 'detecting' | 'downloading' | 'ready' | 'error';

export interface NodeRuntimeStatus {
  state: NodeRuntimeState;
  progress?: number;
  error?: string;
  nodePath?: string;
  npxPath?: string;
}

function getRuntimeRoot(): string {
  return join(getMimiClawConfigDir(), 'runtime', 'node');
}

function getBundledNodePaths(): { nodePath: string; npxPath: string } {
  const root = getRuntimeRoot();
  const bin = join(root, 'bin');
  const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';
  const npxName = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return {
    nodePath: join(bin, nodeName),
    npxPath: join(bin, npxName),
  };
}

async function fileExists(path: string): Promise<boolean> {
  return existsSync(path);
}

/**
 * Resolve `npx` on PATH (returns absolute path to executable).
 */
export async function detectSystemNpx(): Promise<string | null> {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'where' : 'which';
  const arg = isWin ? ['npx.cmd'] : ['npx'];
  try {
    const { stdout } = await execFileAsync(cmd, arg, { encoding: 'utf8' });
    const line = stdout.trim().split(/\r?\n/)[0]?.trim();
    if (line && existsSync(line)) {
      return line;
    }
  } catch {
    // ignore
  }
  return null;
}

function distArchiveForPlatform(): { url: string; extractSubdir: string; ext: 'tar.gz' | 'zip' } {
  const v = BUNDLED_NODE_VERSION;
  const base = `https://nodejs.org/dist/v${v}`;
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    const a = arch === 'arm64' ? 'arm64' : 'x64';
    const name = `node-v${v}-darwin-${a}`;
    return {
      url: `${base}/${name}.tar.gz`,
      extractSubdir: name,
      ext: 'tar.gz',
    };
  }
  if (platform === 'linux') {
    const a = arch === 'arm64' ? 'arm64' : 'x64';
    const name = `node-v${v}-linux-${a}`;
    return {
      url: `${base}/${name}.tar.gz`,
      extractSubdir: name,
      ext: 'tar.gz',
    };
  }
  if (platform === 'win32') {
    const a = arch === 'arm64' ? 'arm64' : 'x64';
    const name = `node-v${v}-win-${a}`;
    return {
      url: `${base}/${name}.zip`,
      extractSubdir: name,
      ext: 'zip',
    };
  }
  throw new Error(`Unsupported platform for bundled Node: ${platform}`);
}

async function downloadToFile(url: string, dest: string, onProgress?: (pct: number) => void): Promise<void> {
  await mkdir(dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  await new Promise<void>((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const loc = res.headers.location;
          if (!loc) {
            reject(new Error('Redirect without Location'));
            return;
          }
          void downloadToFile(loc, dest, onProgress).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const total = Number(res.headers['content-length'] || 0);
        let done = 0;
        const file = createWriteStream(tmp);
        res.on('data', (chunk: Buffer) => {
          done += chunk.length;
          if (total > 0 && onProgress) {
            onProgress(Math.min(99, Math.round((done / total) * 100)));
          }
        });
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
        res.on('error', reject);
        file.on('error', reject);
      })
      .on('error', reject);
  });
  await rename(tmp, dest);
}

async function extractTarGz(archive: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  const { spawn } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    const child = spawn('tar', ['-xzf', archive, '-C', destDir], {
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar exited ${code}`));
    });
  });
}

async function extractZip(archive: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  const { spawn } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    const child = spawn('tar', ['-xf', archive, '-C', destDir], {
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar -xf zip exited ${code}`));
    });
  });
}

let ensureInFlight: Promise<{ nodePath: string; npxPath: string }> | null = null;

/**
 * Returns system npx if available, else bundled ~/.mimiclaw/runtime/node after download.
 */
export async function ensureNode(onProgress?: (s: NodeRuntimeStatus) => void): Promise<{
  nodePath: string;
  npxPath: string;
}> {
  if (ensureInFlight) {
    return ensureInFlight;
  }

  ensureInFlight = (async () => {
    onProgress?.({ state: 'detecting' });

    const systemNpx = await detectSystemNpx();
    if (systemNpx) {
      const nodePath = join(dirname(systemNpx), process.platform === 'win32' ? 'node.exe' : 'node');
      const status: NodeRuntimeStatus = {
        state: 'ready',
        nodePath,
        npxPath: systemNpx,
      };
      onProgress?.(status);
      return { nodePath, npxPath: systemNpx };
    }

    const bundled = getBundledNodePaths();
    if (await fileExists(bundled.npxPath) && await fileExists(bundled.nodePath)) {
      onProgress?.({ state: 'ready', ...bundled });
      return bundled;
    }

    const { url, extractSubdir, ext } = distArchiveForPlatform();
    const runtimeRoot = getRuntimeRoot();
    ensureDir(join(runtimeRoot, '..'));
    const archivePath = join(
      runtimeRoot,
      `node-download-${createHash('sha256').update(url).digest('hex').slice(0, 8)}.${ext === 'tar.gz' ? 'tar.gz' : 'zip'}`,
    );
    const extractRoot = join(runtimeRoot, '_extract');

    onProgress?.({ state: 'downloading', progress: 0 });

    try {
      if (existsSync(extractRoot)) {
        rmSync(extractRoot, { recursive: true, force: true });
      }
      await downloadToFile(url, archivePath, (pct) => {
        onProgress?.({ state: 'downloading', progress: pct });
      });

      if (ext === 'tar.gz') {
        await extractTarGz(archivePath, extractRoot);
      } else {
        await extractZip(archivePath, extractRoot);
      }

      const extracted = join(extractRoot, extractSubdir);
      if (!existsSync(extracted)) {
        const entries = readdirSync(extractRoot);
        throw new Error(`Expected ${extractSubdir} under extract, got: ${entries.join(', ')}`);
      }

      if (existsSync(runtimeRoot)) {
        rmSync(runtimeRoot, { recursive: true, force: true });
      }
      await rename(extracted, runtimeRoot);
      rmSync(extractRoot, { recursive: true, force: true });
      try {
        rmSync(archivePath, { force: true });
      } catch {
        // ignore
      }

      if (process.platform !== 'win32') {
        await chmod(bundled.nodePath, 0o755).catch(() => {});
        await chmod(bundled.npxPath, 0o755).catch(() => {});
      }

      onProgress?.({ state: 'ready', progress: 100, ...bundled });
      return bundled;
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      logger.error('[node-runtime] ensureNode failed:', e);
      onProgress?.({ state: 'error', error: err });
      throw e;
    }
  })();

  try {
    return await ensureInFlight;
  } finally {
    ensureInFlight = null;
  }
}

export function getBundledRuntimePaths(): { nodePath: string; npxPath: string } {
  return getBundledNodePaths();
}

export function getNodeRuntimeStatusSync(): NodeRuntimeStatus {
  const bundled = getBundledNodePaths();
  if (existsSync(bundled.npxPath) && existsSync(bundled.nodePath)) {
    return { state: 'ready', nodePath: bundled.nodePath, npxPath: bundled.npxPath };
  }
  return { state: 'idle' };
}

export async function probeNodeRuntime(): Promise<NodeRuntimeStatus> {
  const sys = await detectSystemNpx();
  if (sys) {
    const nodePath = join(dirname(sys), process.platform === 'win32' ? 'node.exe' : 'node');
    return { state: 'ready', nodePath, npxPath: sys };
  }
  return getNodeRuntimeStatusSync();
}

export function getAppVersionForLogs(): string {
  try {
    return app.getVersion();
  } catch {
    return 'unknown';
  }
}
