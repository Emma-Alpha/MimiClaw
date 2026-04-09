/**
 * Logger Utility
 * Centralized logging with levels, file output, and log retrieval for UI.
 *
 * File writes use an async buffered writer so that high-frequency logging
 * (e.g. during gateway startup) never blocks the Electron main thread.
 * Only the final `process.on('exit')` handler uses synchronous I/O to
 * guarantee the last few messages are flushed before the process exits.
 */
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { appendFile, open, readdir, stat } from 'fs/promises';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Current log level (can be changed at runtime)
 */
// Default to INFO in packaged builds to reduce sync-like overhead from
// high-volume DEBUG logging.  In dev mode, keep DEBUG for diagnostics.
// Note: app.isPackaged may not be available before app.isReady(), but the
// logger is initialised after that point so this is safe.
let currentLevel = LogLevel.DEBUG;

/**
 * Log file path
 */
let logFilePath: string | null = null;
let logDir: string | null = null;

/**
 * In-memory ring buffer for recent logs (useful for UI display)
 */
const RING_BUFFER_SIZE = 500;
const recentLogs: string[] = [];

// ── Async write buffer ───────────────────────────────────────────

/** Pending log lines waiting to be flushed to disk. */
let writeBuffer: string[] = [];
/** Timer for the next scheduled flush. */
let flushTimer: NodeJS.Timeout | null = null;
/** Whether a flush is currently in progress. */
let flushing = false;

const FLUSH_INTERVAL_MS = 500;
const FLUSH_SIZE_THRESHOLD = 20;

async function flushBuffer(): Promise<void> {
  if (flushing || writeBuffer.length === 0 || !logFilePath) return;
  flushing = true;
  const batch = writeBuffer.join('');
  writeBuffer = [];
  try {
    await appendFile(logFilePath, batch);
  } catch {
    // Silently fail if we can't write to file
  } finally {
    flushing = false;
  }
}

/** Synchronous flush for the `exit` handler — guaranteed to write. */
function flushBufferSync(): void {
  if (writeBuffer.length === 0 || !logFilePath) return;
  try {
    appendFileSync(logFilePath, writeBuffer.join(''));
  } catch {
    // Silently fail
  }
  writeBuffer = [];
}

// Ensure all buffered data reaches disk before the process exits.
process.on('exit', flushBufferSync);

// ── Initialisation ───────────────────────────────────────────────

/**
 * Initialize logger — safe to call before app.isReady()
 */
export function initLogger(): void {
  try {
    // In production, default to INFO to reduce log volume and overhead.
    if (app.isPackaged && currentLevel < LogLevel.INFO) {
      currentLevel = LogLevel.INFO;
    }

    logDir = join(app.getPath('userData'), 'logs');

    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    logFilePath = join(logDir, `mimiclaw-${timestamp}.log`);

    // Write a separator for new session (sync is OK — happens once at startup)
    const sessionHeader = `\n${'='.repeat(80)}\n[${new Date().toISOString()}] === MimiClaw Session Start (v${app.getVersion()}) ===\n${'='.repeat(80)}\n`;
    appendFileSync(logFilePath, sessionHeader);
  } catch (error) {
    console.error('Failed to initialize logger:', error);
  }
}

// ── Level / path accessors ───────────────────────────────────────

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogDir(): string | null {
  return logDir;
}

export function getLogFilePath(): string | null {
  return logFilePath;
}

// ── ANSI color codes (terminal output only) ──────────────────────

const A = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  gray:    '\x1b[90m',
  white:   '\x1b[97m',
};

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: A.gray,
  INFO:  A.cyan,
  WARN:  A.yellow,
  ERROR: A.red + A.bold,
};

/** Return ANSI-colored level badge for terminal display. */
function colorLevel(level: string): string {
  const color = LEVEL_COLORS[level.trim()] ?? '';
  return `${color}[${level.padEnd(5)}]${A.reset}`;
}

/**
 * Color-annotate a jizhi-trace step for terminal display.
 * Segments like `[jizhi-trace][service]` get distinct hues so
 * the eye can skim them quickly.
 */
function colorMessage(message: string): string {
  return message
    .replace(/(\[jizhi-trace\])/, `${A.blue}$1${A.reset}`)
    .replace(/(\[code-agent trace\])/, `${A.magenta}$1${A.reset}`)
    .replace(/(\[stdout\]|\[stderr\]|\[prompt\]|\[final-output\])/, `${A.gray}$1${A.reset}`)
    .replace(/(\[route\]|\[service\])/, `${A.gray}$1${A.reset}`)
    .replace(/(request:start|stream:start)/, `${A.green}$1${A.reset}`)
    .replace(/(process:spawn|process:close|result:final)/, `${A.green}$1${A.reset}`)
    .replace(/(process:timeout|process:error)/, `${A.yellow}$1${A.reset}`)
    .replace(/(request:response)/, `${A.cyan}$1${A.reset}`)
    .replace(/(request:payload)/, `${A.dim}$1${A.reset}`)
    .replace(/(stream:event)/, `${A.magenta}$1${A.reset}`)
    .replace(/(stream:complete|:success)/, `${A.green}$1${A.reset}`)
    .replace(/(stream aborted|:error)/, `${A.yellow}$1${A.reset}`);
}

// ── Formatting ───────────────────────────────────────────────────

function serializeArg(arg: unknown): string {
  if (arg instanceof Error) return `${arg.message}\n${arg.stack || ''}`;
  if (typeof arg === 'object') {
    try { return JSON.stringify(arg, null, 2); } catch { return String(arg); }
  }
  return String(arg);
}

/** Plain-text format written to the log file (no ANSI). */
function formatMessage(level: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0
    ? ' ' + args.map(serializeArg).join(' ')
    : '';
  return `[${timestamp}] [${level.padEnd(5)}] ${message}${formattedArgs}`;
}

/** Colored format for console/terminal output only. */
function formatForTerminal(level: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const ts   = `${A.dim}[${timestamp}]${A.reset}`;
  const lvl  = colorLevel(level);
  const msg  = colorMessage(message);
  const formattedArgs = args.length > 0
    ? ' ' + args.map(arg => `${A.gray}${serializeArg(arg)}${A.reset}`).join(' ')
    : '';
  return `${ts} ${lvl} ${msg}${formattedArgs}`;
}

function shouldMuteTerminalOutput(message: string): boolean {
  return message.includes('[xiaojiu-trace]');
}

// ── Core write ───────────────────────────────────────────────────

/**
 * Write to ring buffer + schedule an async flush to disk.
 */
function writeLog(formatted: string): void {
  // Ring buffer (always synchronous — in-memory only)
  recentLogs.push(formatted);
  if (recentLogs.length > RING_BUFFER_SIZE) {
    recentLogs.shift();
  }

  // Async file write via buffer
  if (logFilePath) {
    writeBuffer.push(formatted + '\n');
    if (writeBuffer.length >= FLUSH_SIZE_THRESHOLD) {
      // Buffer is large enough — flush immediately (non-blocking)
      void flushBuffer();
    } else if (!flushTimer) {
      // Schedule a flush after a short delay
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushBuffer();
      }, FLUSH_INTERVAL_MS);
    }
  }
}

// ── Public log methods ───────────────────────────────────────────

export function debug(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.DEBUG) {
    const fileFormatted = formatMessage('DEBUG', message, ...args);
    if (!shouldMuteTerminalOutput(message)) {
      console.debug(formatForTerminal('DEBUG', message, ...args));
    }
    writeLog(fileFormatted);
  }
}

export function info(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.INFO) {
    const fileFormatted = formatMessage('INFO', message, ...args);
    if (!shouldMuteTerminalOutput(message)) {
      console.info(formatForTerminal('INFO', message, ...args));
    }
    writeLog(fileFormatted);
  }
}

export function warn(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.WARN) {
    const fileFormatted = formatMessage('WARN', message, ...args);
    if (!shouldMuteTerminalOutput(message)) {
      console.warn(formatForTerminal('WARN', message, ...args));
    }
    writeLog(fileFormatted);
  }
}

export function error(message: string, ...args: unknown[]): void {
  if (currentLevel <= LogLevel.ERROR) {
    const fileFormatted = formatMessage('ERROR', message, ...args);
    if (!shouldMuteTerminalOutput(message)) {
      console.error(formatForTerminal('ERROR', message, ...args));
    }
    writeLog(fileFormatted);
  }
}

// ── Log retrieval (for UI / diagnostics) ─────────────────────────

export function getRecentLogs(count?: number, minLevel?: LogLevel): string[] {
  const filtered = minLevel != null
    ? recentLogs.filter(line => {
      if (minLevel <= LogLevel.DEBUG) return true;
      if (minLevel === LogLevel.INFO) return !line.includes('] [DEBUG');
      if (minLevel === LogLevel.WARN) return line.includes('] [WARN') || line.includes('] [ERROR');
      return line.includes('] [ERROR');
    })
    : recentLogs;

  return count ? filtered.slice(-count) : [...filtered];
}

/**
 * Read the current day's log file content (last N lines).
 * Uses async I/O to avoid blocking.
 */
export async function readLogFile(tailLines = 200): Promise<string> {
  if (!logFilePath) return '(No log file found)';
  const safeTailLines = Math.max(1, Math.floor(tailLines));
  try {
    const file = await open(logFilePath, 'r');
    try {
      const fileStat = await file.stat();
      if (fileStat.size === 0) return '';

      const chunkSize = 64 * 1024;
      let position = fileStat.size;
      let content = '';
      let lineCount = 0;

      while (position > 0 && lineCount <= safeTailLines) {
        const bytesToRead = Math.min(chunkSize, position);
        position -= bytesToRead;
        const buffer = Buffer.allocUnsafe(bytesToRead);
        await file.read(buffer, 0, bytesToRead, position);
        content = `${buffer.toString('utf-8')}${content}`;
        lineCount = content.split('\n').length - 1;
      }

      const lines = content.split('\n');
      if (lines.length <= safeTailLines) return content;
      return lines.slice(-safeTailLines).join('\n');
    } finally {
      await file.close();
    }
  } catch (err) {
    return `(Failed to read log file: ${err})`;
  }
}

/**
 * List available log files.
 * Uses async I/O to avoid blocking.
 */
export async function listLogFiles(): Promise<Array<{ name: string; path: string; size: number; modified: string }>> {
  if (!logDir) return [];
  try {
    const files = await readdir(logDir);
    const results: Array<{ name: string; path: string; size: number; modified: string }> = [];
    for (const f of files) {
      if (!f.endsWith('.log')) continue;
      const fullPath = join(logDir, f);
      const s = await stat(fullPath);
      results.push({
        name: f,
        path: fullPath,
        size: s.size,
        modified: s.mtime.toISOString(),
      });
    }
    return results.sort((a, b) => b.modified.localeCompare(a.modified));
  } catch {
    return [];
  }
}

/**
 * Logger namespace export
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  setLevel: setLogLevel,
  init: initLogger,
  getLogDir,
  getLogFilePath,
  getRecentLogs,
  readLogFile,
  listLogFiles,
};
