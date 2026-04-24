/**
 * Path Utilities
 * Cross-platform path resolution helpers
 */
import { app } from 'electron';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'fs';
import { logger } from './logger';

export {
  quoteForCmd,
  needsWinShell,
  prepareWinSpawn,
  normalizeNodeRequirePathForNodeOptions,
  appendNodeRequireToNodeOptions,
} from './win-shell';

/**
 * Expand ~ to home directory
 */
export function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return path.replace('~', homedir());
  }
  return path;
}

/**
 * Get OpenClaw config directory
 */
export function getOpenClawConfigDir(): string {
  return join(homedir(), '.openclaw');
}

/**
 * Get OpenClaw skills directory
 */
export function getOpenClawSkillsDir(): string {
  return join(getOpenClawConfigDir(), 'skills');
}

/**
 * Get MimiClaw config directory
 */
export function getMimiClawConfigDir(): string {
  return join(homedir(), '.mimiclaw');
}

/**
 * Get MimiClaw logs directory
 */
export function getLogsDir(): string {
  return join(app.getPath('userData'), 'logs');
}

/**
 * Get MimiClaw data directory
 */
export function getDataDir(): string {
  return app.getPath('userData');
}

/**
 * Ensure directory exists
 */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get the isolated Claude Code config directory.
 * This prevents MimiClaw's bundled Claude CLI from reading/writing
 * the user's own ~/.claude/ config (used by their locally installed CLI).
 */
export function getClaudeCodeConfigDir(): string {
  const dir = join(app.getPath('userData'), 'claude-code-config');
  ensureDir(dir);
  return dir;
}

/**
 * Get the bundled Claude Code CLI binary path.
 * - Packaged: from app.asar.unpacked/node_modules/@anthropic-ai/claude-code/
 * - Development: from node_modules/@anthropic-ai/claude-code/
 *
 * Returns the path to cli-wrapper.cjs which resolves the correct
 * platform-specific native binary at runtime.
 */
export function getBundledClaudeCliPath(): string {
  if (app.isPackaged) {
    return join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      '@anthropic-ai',
      'claude-code',
      'cli-wrapper.cjs',
    );
  }
  return join(__dirname, '..', '..', 'node_modules', '@anthropic-ai', 'claude-code', 'cli-wrapper.cjs');
}

/**
 * Get resources directory (for bundled assets)
 */
export function getResourcesDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources');
  }
  return join(__dirname, '../../resources');
}

/**
 * Get preload script path
 */
export function getPreloadPath(): string {
  return join(__dirname, '../preload/index.js');
}

/**
 * Get OpenClaw package directory
 * - Production (packaged): from resources/openclaw (copied by electron-builder extraResources)
 * - Development: from node_modules/openclaw
 */
export function getOpenClawDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'openclaw');
  }
  // Development: use node_modules/openclaw
  return join(__dirname, '../../node_modules/openclaw');
}

/**
 * Get OpenClaw package directory resolved to a real path.
 * Useful when consumers need deterministic module resolution under pnpm symlinks.
 */
export function getOpenClawResolvedDir(): string {
  const dir = getOpenClawDir();
  if (!existsSync(dir)) {
    return dir;
  }
  try {
    return realpathSync(dir);
  } catch {
    return dir;
  }
}

/**
 * Get OpenClaw entry script path (openclaw.mjs)
 */
export function getOpenClawEntryPath(): string {
  return join(getOpenClawDir(), 'openclaw.mjs');
}

/**
 * Check if OpenClaw package exists
 */
export function isOpenClawPresent(): boolean {
  const dir = getOpenClawDir();
  const pkgJsonPath = join(dir, 'package.json');
  return existsSync(dir) && existsSync(pkgJsonPath);
}

/**
 * Check if OpenClaw is built (has dist folder)
 * For the npm package, this should always be true since npm publishes the built dist.
 */
export function isOpenClawBuilt(): boolean {
  const dir = getOpenClawDir();
  const distDir = join(dir, 'dist');
  const hasDist = existsSync(distDir);
  return hasDist;
}

/**
 * Get OpenClaw status for environment check
 */
export interface OpenClawStatus {
  packageExists: boolean;
  isBuilt: boolean;
  entryPath: string;
  dir: string;
  version?: string;
}

export function getOpenClawStatus(): OpenClawStatus {
  const dir = getOpenClawDir();
  let version: string | undefined;

  // Try to read version from package.json
  try {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      version = pkg.version;
    }
  } catch {
    // Ignore version read errors
  }

  const status: OpenClawStatus = {
    packageExists: isOpenClawPresent(),
    isBuilt: isOpenClawBuilt(),
    entryPath: getOpenClawEntryPath(),
    dir,
    version,
  };

  logger.info('OpenClaw status:', status);
  return status;
}
