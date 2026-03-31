/**
 * Auto-Updater Module
 * Handles automatic application updates using a COS-hosted manifest + assets.
 *
 * Windows/Linux use electron-updater with a generic COS provider.
 * macOS uses a custom COS manifest -> app.asar flow so unsigned builds can
 * replace the packaged asar after the app exits, then relaunch the app bundle.
 */
import { autoUpdater, type UpdateInfo, type ProgressInfo, type UpdateDownloadedEvent } from 'electron-updater';
import { type BrowserWindow, app, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import semver from 'semver';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { setInstallingUpdate, setQuitting } from './app-state';

/** COS bucket base URL for update manifest and assets. */
const COS_UPDATES_BASE = 'https://cobot-1254397474.cos.ap-guangzhou.myqcloud.com/jizhi/updates';

/** Manifest JSON hosted at {COS_UPDATES_BASE}/channels/{channel}.json */
type CosUpdateManifest = {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | null;
  releaseUrl?: string;
  files: Record<string, {
    name: string;
    url: string;
    size: number;
    sha256Url: string;
  }>;
};

type MacAsarUpdate = {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | null;
  releaseUrl: string;
  assetName: string;
  assetUrl: string;
  assetSize: number;
  sha256AssetName: string;
  sha256AssetUrl: string;
  downloadedFilePath?: string;
};

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: UpdateInfo;
  progress?: ProgressInfo;
  error?: string;
}

export interface UpdaterEvents {
  'status-changed': (status: UpdateStatus) => void;
  'checking-for-update': () => void;
  'update-available': (info: UpdateInfo) => void;
  'update-not-available': (info: UpdateInfo) => void;
  'download-progress': (progress: ProgressInfo) => void;
  'update-downloaded': (event: UpdateDownloadedEvent | UpdateInfo) => void;
  'error': (error: Error) => void;
}

/**
 * Detect the update channel from a semver version string.
 * e.g. "0.1.8-alpha.0" → "alpha", "1.0.0-beta.1" → "beta", "1.0.0" → "latest"
 */
function detectChannel(version: string): string {
  const match = version.match(/-([a-zA-Z]+)/);
  return match ? match[1] : 'latest';
}

function normalizeChannel(channel: string): string {
  return channel === 'stable' || channel === 'dev' ? 'latest' : channel;
}

/**
 * Full semver from bundled package.json. On macOS, `app.getVersion()` follows
 * CFBundleShortVersionString (x.y.z only), which drops prerelease tags like
 * -beta.N — that would mis-detect the updater channel as `latest` and request
 * latest-mac.yml while CI publishes beta-mac.yml for prerelease builds.
 */
function getAppSemverVersion(): string {
  if (app.isPackaged) {
    try {
      const pkgPath = path.join(app.getAppPath(), 'package.json');
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw) as { version?: string };
      if (typeof pkg.version === 'string' && pkg.version.length > 0) {
        return pkg.version;
      }
    } catch {
      // fall through
    }
  }
  return app.getVersion();
}

function parseComparableVersion(version: string): string | null {
  const valid = semver.valid(version);
  if (valid) return valid;
  const cleaned = semver.clean(version);
  return cleaned && semver.valid(cleaned) ? cleaned : null;
}

function isNewerVersion(candidate: string, current: string): boolean {
  const next = parseComparableVersion(candidate);
  const existing = parseComparableVersion(current);
  if (!next || !existing) {
    logger.warn(`[Updater] Unable to compare versions candidate=${candidate} current=${current}`);
    return candidate !== current;
  }
  return semver.gt(next, existing);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Fetch remote JSON update policy (HTTPS only). Used by renderer via IPC to avoid CORS.
 */
export async function fetchUpdatePolicyJson(urlString: string): Promise<unknown> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error('Invalid update policy URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('Update policy URL must use HTTPS');
  }
  const res = await fetch(urlString, {
    redirect: 'follow',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Update policy request failed (${res.status})`);
  }
  return await res.json();
}

export class AppUpdater extends EventEmitter {
  private mainWindow: BrowserWindow | null = null;
  private status: UpdateStatus = { status: 'idle' };
  private autoInstallTimer: NodeJS.Timeout | null = null;
  private autoInstallCountdown = 0;
  private currentChannel = 'latest';
  private autoDownloadEnabled = false;
  private pendingMacAsarUpdate: MacAsarUpdate | null = null;

  /** Delay (in seconds) before auto-installing a downloaded update. */
  private static readonly AUTO_INSTALL_DELAY_SECONDS = 5;

  constructor() {
    super();

    // EventEmitter treats an unhandled 'error' event as fatal. Keep a default
    // listener so updater failures surface in logs/UI without terminating main.
    this.on('error', (error: Error) => {
      logger.error('[Updater] AppUpdater emitted error:', error);
    });

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.logger = {
      info: (msg: string) => logger.info('[Updater]', msg),
      warn: (msg: string) => logger.warn('[Updater]', msg),
      error: (msg: string) => logger.error('[Updater]', msg),
      debug: (msg: string) => logger.debug('[Updater]', msg),
    };

    const version = getAppSemverVersion();
    const detectedChannel = normalizeChannel(detectChannel(version));
    this.currentChannel = detectedChannel;

    logger.info(`[Updater] Version: ${version}, channel: ${detectedChannel}, provider: cos (${COS_UPDATES_BASE})`);

    // Windows/Linux: use generic COS provider so electron-updater reads
    // {COS_UPDATES_BASE}/{channel}.yml instead of hitting GitHub API.
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: COS_UPDATES_BASE,
      channel: detectedChannel,
    } as Parameters<typeof autoUpdater.setFeedURL>[0]);

    autoUpdater.channel = detectedChannel;
    autoUpdater.allowPrerelease = detectedChannel !== 'latest';

    this.setupListeners();
  }

  /**
   * Set the main window for sending update events
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Get current update status
   */
  getStatus(): UpdateStatus {
    return this.status;
  }

  /**
   * Setup auto-updater event listeners
   */
  private setupListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      this.updateStatus({ status: 'checking' });
      this.emit('checking-for-update');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.updateStatus({ status: 'available', info });
      this.emit('update-available', info);
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.updateStatus({ status: 'not-available', info });
      this.emit('update-not-available', info);
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.updateStatus({ status: 'downloading', progress });
      this.emit('download-progress', progress);
    });

    autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
      this.updateStatus({ status: 'downloaded', info: event });
      this.emit('update-downloaded', event);

      if (this.autoDownloadEnabled) {
        this.startAutoInstallCountdown();
      }
    });

    autoUpdater.on('error', (error: Error) => {
      this.updateStatus({ status: 'error', error: error.message });
      this.emit('error', error);
    });
  }

  private updateStatus(newStatus: Partial<UpdateStatus>): void {
    const nextStatus = newStatus.status ?? this.status.status;
    const shouldPreserveInfo = newStatus.info === undefined
      && ['available', 'downloading', 'downloaded', 'error'].includes(nextStatus);
    const shouldPreserveProgress = newStatus.progress === undefined && nextStatus === 'downloading';
    const shouldPreserveError = newStatus.error === undefined && nextStatus === 'error';

    if (nextStatus !== 'downloaded' && this.autoInstallTimer) {
      this.clearAutoInstallTimer();
      this.sendToRenderer('update:auto-install-countdown', { seconds: -1, cancelled: true });
    }

    this.status = {
      status: nextStatus,
      info: newStatus.info ?? (shouldPreserveInfo ? this.status.info : undefined),
      progress: newStatus.progress ?? (shouldPreserveProgress ? this.status.progress : undefined),
      error: newStatus.error ?? (shouldPreserveError ? this.status.error : undefined),
    };
    this.sendToRenderer('update:status-changed', this.status);
    this.emit('status-changed', this.status);
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  private isMacAsarFlow(): boolean {
    return process.platform === 'darwin';
  }

  /**
   * Fetch the COS update manifest for the current channel.
   * URL pattern: {COS_UPDATES_BASE}/channels/{channel}.json
   */
  private async fetchCosManifest(): Promise<CosUpdateManifest> {
    const channel = this.currentChannel === 'latest' ? 'latest' : this.currentChannel;
    const url = `${COS_UPDATES_BASE}/channels/${channel}.json`;
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`COS update manifest request failed (${response.status})`);
    }
    return await response.json() as CosUpdateManifest;
  }

  private async resolveMacAsarRelease(): Promise<MacAsarUpdate | null> {
    const manifest = await this.fetchCosManifest();
    const version = manifest.version;
    const currentVersion = getAppSemverVersion();

    if (!isNewerVersion(version, currentVersion)) {
      return null;
    }

    const archEntry = manifest.files?.[process.arch];
    if (!archEntry) {
      throw new Error(
        `Release v${version} is missing the macOS ${process.arch} .asar update assets.`,
      );
    }

    return {
      version,
      releaseDate: manifest.releaseDate,
      releaseNotes: manifest.releaseNotes ?? null,
      releaseUrl: manifest.releaseUrl ?? '',
      assetName: archEntry.name,
      assetUrl: archEntry.url,
      assetSize: archEntry.size,
      sha256AssetName: `${archEntry.name}.sha256`,
      sha256AssetUrl: archEntry.sha256Url,
    };
  }

  private toUpdateInfo(update: MacAsarUpdate): UpdateInfo {
    return {
      version: update.version,
      releaseDate: update.releaseDate,
      releaseNotes: update.releaseNotes,
    };
  }

  private getMacAsarUpdateDir(): string {
    return path.join(app.getPath('userData'), 'updates', 'mac-asar');
  }

  private async verifyMacAsarChecksum(update: MacAsarUpdate, digest: string): Promise<void> {
    const response = await fetch(update.sha256AssetUrl, { redirect: 'follow' });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${update.sha256AssetName} (${response.status})`);
    }

    const body = (await response.text()).trim();
    const expected = body.split(/\s+/)[0]?.toLowerCase();
    if (!expected || !/^[a-f0-9]{64}$/.test(expected)) {
      throw new Error(`Invalid checksum in ${update.sha256AssetName}`);
    }

    if (digest.toLowerCase() !== expected) {
      throw new Error(`Checksum mismatch for ${update.assetName}`);
    }
  }

  private async downloadMacAsarUpdateAsset(update: MacAsarUpdate): Promise<string> {
    await fs.promises.mkdir(this.getMacAsarUpdateDir(), { recursive: true });

    const finalPath = path.join(
      this.getMacAsarUpdateDir(),
      `${app.getName()}-${update.version}-${process.arch}.app.asar`,
    );
    const tempPath = `${finalPath}.download`;

    const response = await fetch(update.assetUrl, { redirect: 'follow' });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to download ${update.assetName} (${response.status})`);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    const total = contentLength > 0 ? contentLength : update.assetSize;
    const hash = createHash('sha256');
    let transferred = 0;
    const startedAt = Date.now();

    const progressTap = new Transform({
      transform: (chunk, _encoding, callback) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        transferred += buffer.length;
        hash.update(buffer);

        const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
        const progress: ProgressInfo = {
          total,
          delta: buffer.length,
          transferred,
          percent: total > 0 ? (transferred / total) * 100 : 0,
          bytesPerSecond: Math.round(transferred / elapsedSeconds),
        };

        this.updateStatus({ status: 'downloading', info: this.toUpdateInfo(update), progress });
        callback(null, buffer);
      },
    });

    try {
      await pipeline(
        Readable.fromWeb(response.body as globalThis.ReadableStream<Uint8Array>),
        progressTap,
        fs.createWriteStream(tempPath),
      );
      const digest = hash.digest('hex');
      await this.verifyMacAsarChecksum(update, digest);
      await fs.promises.rename(tempPath, finalPath);
      return finalPath;
    } catch (error) {
      await fs.promises.rm(tempPath, { force: true }).catch(() => {});
      throw error;
    }
  }

  private getMacAppBundlePath(): string {
    return path.resolve(process.resourcesPath, '..', '..');
  }

  private getMacTargetAsarPath(): string {
    return path.join(process.resourcesPath, 'app.asar');
  }

  private buildMacAsarInstallerScript(options: {
    pid: number;
    stagedAsarPath: string;
    targetAsarPath: string;
    appBundlePath: string;
    scriptPath: string;
  }): string {
    const { pid, stagedAsarPath, targetAsarPath, appBundlePath, scriptPath } = options;
    const backupPath = `${targetAsarPath}.bak`;
    const nextPath = `${targetAsarPath}.next`;
    const dialogTitle = `${app.getName()} Update Failed`;
    const dialogMessage = `Unable to apply the downloaded update automatically. Please reinstall ${app.getName()} manually if the app does not reopen.`;
    const dialogScript = `display dialog "${escapeAppleScriptString(dialogMessage)}" buttons {"OK"} default button "OK" with title "${escapeAppleScriptString(dialogTitle)}"`;

    return `#!/bin/sh
set -eu

PID=${pid}
STAGED_ASAR=${shellQuote(stagedAsarPath)}
TARGET_ASAR=${shellQuote(targetAsarPath)}
BACKUP_ASAR=${shellQuote(backupPath)}
NEXT_ASAR=${shellQuote(nextPath)}
APP_BUNDLE=${shellQuote(appBundlePath)}
SCRIPT_PATH=${shellQuote(scriptPath)}

show_error() {
  /usr/bin/osascript -e ${shellQuote(dialogScript)} >/dev/null 2>&1 || true
}

cleanup() {
  rm -f "$NEXT_ASAR" "$SCRIPT_PATH"
}

wait_count=0
while kill -0 "$PID" 2>/dev/null; do
  sleep 1
  wait_count=$((wait_count + 1))
  if [ "$wait_count" -ge 60 ]; then
    break
  fi
done

if [ ! -f "$STAGED_ASAR" ]; then
  show_error
  cleanup
  exit 1
fi

if ! cp "$STAGED_ASAR" "$NEXT_ASAR"; then
  show_error
  cleanup
  exit 1
fi

if [ -f "$TARGET_ASAR" ]; then
  mv "$TARGET_ASAR" "$BACKUP_ASAR"
fi

if ! mv "$NEXT_ASAR" "$TARGET_ASAR"; then
  if [ -f "$BACKUP_ASAR" ] && [ ! -f "$TARGET_ASAR" ]; then
    mv "$BACKUP_ASAR" "$TARGET_ASAR" || true
  fi
  show_error
  cleanup
  exit 1
fi

rm -f "$BACKUP_ASAR" "$STAGED_ASAR"
cleanup
/usr/bin/open -n "$APP_BUNDLE" >/dev/null 2>&1 || show_error
`;
  }

  private async stageMacAsarInstall(): Promise<void> {
    if (!app.isPackaged) {
      throw new Error('Asar updates require a packaged app build.');
    }

    const update = this.pendingMacAsarUpdate;
    if (!update?.downloadedFilePath) {
      throw new Error('No downloaded macOS update is ready to install.');
    }

    const stagedAsarPath = update.downloadedFilePath;
    const targetAsarPath = this.getMacTargetAsarPath();
    const appBundlePath = this.getMacAppBundlePath();
    const scriptDir = this.getMacAsarUpdateDir();
    const scriptPath = path.join(scriptDir, `apply-update-${Date.now()}.sh`);

    await fs.promises.mkdir(scriptDir, { recursive: true });
    await fs.promises.writeFile(
      scriptPath,
      this.buildMacAsarInstallerScript({
        pid: process.pid,
        stagedAsarPath,
        targetAsarPath,
        appBundlePath,
        scriptPath,
      }),
      { mode: 0o700 },
    );

    spawn('/bin/sh', [scriptPath], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    setInstallingUpdate();
    setQuitting();
    app.quit();
  }

  private async checkForMacAsarUpdates(): Promise<UpdateInfo | null> {
    this.pendingMacAsarUpdate = null;
    this.updateStatus({ status: 'checking', error: undefined, progress: undefined });

    if (!app.isPackaged) {
      this.updateStatus({
        status: 'error',
        error: 'Update check skipped (dev mode – app is not packaged)',
      });
      return null;
    }

    try {
      const update = await this.resolveMacAsarRelease();
      if (!update) {
        this.updateStatus({ status: 'not-available' });
        return null;
      }

      this.pendingMacAsarUpdate = update;
      const info = this.toUpdateInfo(update);
      this.updateStatus({ status: 'available', info });
      this.emit('update-available', info);

      if (this.autoDownloadEnabled) {
        void this.downloadUpdate().catch((error) => {
          logger.error('[Updater] Auto-download failed for macOS .asar update:', error);
        });
      }

      return info;
    } catch (error) {
      logger.error('[Updater] Check for macOS .asar updates failed:', error);
      this.updateStatus({ status: 'error', error: (error as Error).message || String(error) });
      throw error;
    }
  }

  /**
   * Check for updates.
   * electron-updater automatically tries providers defined in electron-builder.yml in order.
   *
   * In dev mode (not packed), autoUpdater.checkForUpdates() silently returns
   * null without emitting any events, so we must detect this and force a
   * final status so the UI never gets stuck in 'checking'.
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (this.isMacAsarFlow()) {
      return await this.checkForMacAsarUpdates();
    }

    try {
      const result = await autoUpdater.checkForUpdates();

      if (result == null) {
        this.updateStatus({
          status: 'error',
          error: 'Update check skipped (dev mode – app is not packaged)',
        });
        return null;
      }

      if (this.status.status === 'checking' || this.status.status === 'idle') {
        this.updateStatus({ status: 'not-available' });
      }

      return result.updateInfo || null;
    } catch (error) {
      logger.error('[Updater] Check for updates failed:', error);
      this.updateStatus({ status: 'error', error: (error as Error).message || String(error) });
      throw error;
    }
  }

  /**
   * Download available update
   */
  async downloadUpdate(): Promise<void> {
    if (this.isMacAsarFlow()) {
      try {
        const update = this.pendingMacAsarUpdate;
        if (!update) {
          throw new Error('No macOS update is available to download.');
        }

        this.updateStatus({ status: 'downloading', info: this.toUpdateInfo(update), progress: undefined, error: undefined });
        update.downloadedFilePath = await this.downloadMacAsarUpdateAsset(update);
        const info = this.toUpdateInfo(update);
        this.updateStatus({ status: 'downloaded', info, progress: undefined });
        this.emit('update-downloaded', info);

        if (this.autoDownloadEnabled) {
          this.startAutoInstallCountdown();
        }
      } catch (error) {
        logger.error('[Updater] Download macOS .asar update failed:', error);
        this.updateStatus({ status: 'error', error: (error as Error).message || String(error) });
        throw error;
      }
      return;
    }

    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      logger.error('[Updater] Download update failed:', error);
      throw error;
    }
  }

  /**
   * Install update and restart.
   *
   * macOS uses a custom post-quit app.asar replacement flow because unsigned
   * app bundles cannot use Squirrel.Mac's code-signature based installation.
   * Windows/Linux still rely on electron-updater's native install behavior.
   */
  quitAndInstall(): void {
    logger.info('[Updater] quitAndInstall called');

    if (this.isMacAsarFlow()) {
      void this.stageMacAsarInstall().catch((error) => {
        logger.error('[Updater] Failed to stage macOS .asar install:', error);
        this.updateStatus({ status: 'error', error: (error as Error).message || String(error) });
      });
      return;
    }

    setInstallingUpdate();
    setQuitting();
    autoUpdater.quitAndInstall();
  }

  /**
   * Start a countdown that auto-installs the downloaded update.
   * Sends `update:auto-install-countdown` events to the renderer each second.
   */
  private startAutoInstallCountdown(): void {
    this.clearAutoInstallTimer();
    this.autoInstallCountdown = AppUpdater.AUTO_INSTALL_DELAY_SECONDS;
    this.sendToRenderer('update:auto-install-countdown', { seconds: this.autoInstallCountdown });

    this.autoInstallTimer = setInterval(() => {
      this.autoInstallCountdown--;
      this.sendToRenderer('update:auto-install-countdown', { seconds: this.autoInstallCountdown });

      if (this.autoInstallCountdown <= 0) {
        this.clearAutoInstallTimer();
        this.quitAndInstall();
      }
    }, 1000);
  }

  cancelAutoInstall(): void {
    this.clearAutoInstallTimer();
    this.sendToRenderer('update:auto-install-countdown', { seconds: -1, cancelled: true });
  }

  private clearAutoInstallTimer(): void {
    if (this.autoInstallTimer) {
      clearInterval(this.autoInstallTimer);
      this.autoInstallTimer = null;
    }
  }

  /**
   * Set update channel (UI: stable / beta / dev).
   * electron-updater expects `latest` for stable, not the string `stable`.
   */
  setChannel(channel: 'stable' | 'beta' | 'dev'): void {
    const updaterChannel = normalizeChannel(channel);
    this.currentChannel = updaterChannel;
    autoUpdater.channel = updaterChannel;
    autoUpdater.allowPrerelease = updaterChannel !== 'latest';
  }

  /**
   * Set auto-download preference
   */
  setAutoDownload(enable: boolean): void {
    this.autoDownloadEnabled = enable;
    autoUpdater.autoDownload = enable;
  }

  /**
   * Get current version
   */
  getCurrentVersion(): string {
    return getAppSemverVersion();
  }
}

/**
 * Register IPC handlers for update operations
 */
export function registerUpdateHandlers(
  updater: AppUpdater,
  mainWindow: BrowserWindow
): void {
  updater.setMainWindow(mainWindow);

  ipcMain.handle('update:status', () => {
    return updater.getStatus();
  });

  ipcMain.handle('update:version', () => {
    return updater.getCurrentVersion();
  });

  ipcMain.handle('update:check', async () => {
    try {
      await updater.checkForUpdates();
      return { success: true, status: updater.getStatus() };
    } catch (error) {
      return { success: false, error: String(error), status: updater.getStatus() };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await updater.downloadUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('update:install', () => {
    updater.quitAndInstall();
    return { success: true };
  });

  ipcMain.handle('update:setChannel', (_, channel: 'stable' | 'beta' | 'dev') => {
    updater.setChannel(channel);
    return { success: true };
  });

  ipcMain.handle('update:setAutoDownload', (_, enable: boolean) => {
    updater.setAutoDownload(enable);
    return { success: true };
  });

  ipcMain.handle('update:cancelAutoInstall', () => {
    updater.cancelAutoInstall();
    return { success: true };
  });

  ipcMain.handle('update:fetchPolicy', async (_, url: unknown) => {
    try {
      if (typeof url !== 'string' || !url.trim()) {
        return { success: false, error: 'Invalid URL' };
      }
      const json = await fetchUpdatePolicyJson(url.trim());
      return { success: true, json };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

// Export singleton instance
export const appUpdater = new AppUpdater();
