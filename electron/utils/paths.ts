/**
 * Path Utilities
 * Cross-platform path resolution helpers
 */
import { app } from 'electron';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';

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

