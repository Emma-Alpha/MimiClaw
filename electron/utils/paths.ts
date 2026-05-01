/**
 * Path Utilities
 * Cross-platform path resolution helpers
 */
import { app } from 'electron';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, realpathSync } from 'fs';

import {
  CLAUDE_CODE_RUNTIME_VERSION,
  getBinaryFilename,
} from '../../shared/claude-code-runtime';

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
 * Get the path to the runtime-installed Claude CLI native binary.
 *
 * The CLI is no longer bundled with the app. It's downloaded on first run
 * into {userData}/runtime/claude-code/{version}/{claude|claude.exe} by the
 * runtime install service (electron/services/claude-code-runtime.ts).
 *
 * Returns the canonical path even if the file doesn't exist yet, so callers
 * can surface a clear "CLI not installed" error rather than spawning a bare
 * `claude` from PATH (which would conflict with the user's own install).
 */
export function getBundledClaudeCliPath(): string {
  const canonical = join(
    app.getPath('userData'),
    'runtime',
    'claude-code',
    CLAUDE_CODE_RUNTIME_VERSION,
    getBinaryFilename(process.platform),
  );

  if (existsSync(canonical)) {
    try {
      return realpathSync(canonical);
    } catch {
      return canonical;
    }
  }

  return canonical;
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

