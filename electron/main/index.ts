/**
 * Electron Main Process Entry
 * Manages window creation, system tray, and IPC handlers
 */
import '../load-env';
import { app, autoUpdater as electronAutoUpdater, BrowserWindow, globalShortcut, ipcMain, nativeImage, session, shell } from 'electron';
import type { Server } from 'node:http';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { CodeAgentManager } from '../code-agent/manager';
import { browserUseManager } from '../browser-use/manager';
// GatewayManager removed — using stub for compatibility
class GatewayManager {
  on(_event: string, _handler: (...args: unknown[]) => void) { return this; }
  async start() {}
  async stop() {}
  async restart() {}
  async rpc(_method: string, _params?: unknown) { return {}; }
  debouncedRestart() {}
  debouncedReload() {}
}
import { registerBrowserUseHandlers, registerIpcHandlers } from './ipc-handlers';
import {
  createTray,
} from './tray';
import {
  recordUnifiedCodeActivity,
  recordUnifiedCodeRunFinished,
  recordUnifiedCodeRunStarted,
  recordUnifiedGatewayCompleted,
  recordUnifiedGatewayProgress,
  recordUnifiedGatewayStarted,
  setUnifiedGatewayLifecycleState,
} from './session-state-center';
import { createMenu } from './menu';

import { appUpdater, registerUpdateHandlers } from './updater';
import { logger } from '../utils/logger';
import { warmupNetworkOptimization } from '../utils/uv-env';
import { initTelemetry } from '../utils/telemetry';

// OpenClaw utilities removed — using stubs
class SkillsCliRunner {}
const ensureMimiClawContext = async () => {};
const repairMimiClawOnlyBootstrapFiles = async () => {};
const autoInstallCliIfNeeded = async () => {};
const generateCompletionCache = async () => {};
const installCompletionToProfile = async () => {};
import { isInstallingUpdate, isQuitting, setInstallingUpdate, setQuitting } from './app-state';
import { applyProxySettings } from './proxy';
import { syncLaunchAtStartupSettingFromStore } from './launch-at-startup';
import { syncPetWindowFromSettings, getPetWindow } from './pet-window';
import { getCodeChatWindow, forwardDroppedPathToCodeChat, ensureCodeChatWindowForDroppedPath } from './code-assistant-launcher';
import { registerPetRuntime } from './pet-runtime';
import { startVoiceShortcutMonitor, stopVoiceShortcutMonitor } from './voice-shortcut';
import {
  clearPendingSecondInstanceFocus,
  consumeMainWindowReady,
  createMainWindowFocusState,
  requestSecondInstanceFocus,
} from './main-window-focus';
import {
  createQuitLifecycleState,
  markQuitCleanupCompleted,
  requestQuitLifecycleAction,
} from './quit-lifecycle';
import { createSignalQuitHandler } from './signal-quit';
import { acquireProcessInstanceFileLock } from './process-instance-lock';
import { getSetting } from '../utils/store';
import { setSetting } from '../utils/store';
// Skills/plugins/OpenClaw presence checks removed — using stubs
const ensureBuiltinSkillsInstalled = async () => {};
const ensurePreinstalledSkillsInstalled = async () => {};
const ensureAllBundledPluginsInstalled = async () => {};
const isOpenClawPresent = () => false;
import { startHostApiServer } from '../api/server';
import { HostEventBus } from '../api/event-bus';
import { deviceOAuthManager } from '../utils/device-oauth';
import { browserOAuthManager } from '../utils/browser-oauth';
import { whatsAppLoginManager } from '../utils/whatsapp-login';
// Provider runtime sync removed — OpenClaw no longer exists
const syncAllProviderAuthToRuntime = async () => {};
import { completeXiaojiuAuthCallback } from '../utils/xiaojiu-auth';
import type { CloudSession } from '../../shared/cloud-auth';
import { isBenignDevWindowLoadRejection, loadWindowRoute, type WindowLoadRoute } from './window-loader';

const WINDOWS_APP_USER_MODEL_ID = 'com.jizhi.gz4399';
const APP_PROTOCOL = 'jizhi';
const STARTUP_UPDATE_CHECK_DELAY_MS = 10_000;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function parseAgentNotification(payload: unknown): {
  runId?: string;
  sessionKey?: string;
  phase?: string;
  state?: string;
  message?: unknown;
  startedAt?: unknown;
} | null {
  const notification = asRecord(payload);
  if (notification.method !== 'agent') return null;

  const params = asRecord(notification.params);
  const data = asRecord(params.data);
  const runId = params.runId ?? data.runId;
  const sessionKey = params.sessionKey ?? data.sessionKey;
  const phase = params.phase ?? data.phase;
  const state = params.state ?? data.state;
  const message = params.message ?? data.message;
  const startedAt = params.startedAt ?? data.startedAt;

  const normalizedRunId = typeof runId === 'string' ? runId.trim() : '';
  const normalizedSessionKey = typeof sessionKey === 'string' ? sessionKey.trim() : '';
  if (!normalizedRunId && !normalizedSessionKey) return null;

  return {
    runId: normalizedRunId || undefined,
    sessionKey: normalizedSessionKey || undefined,
    phase: typeof phase === 'string' ? phase.trim().toLowerCase() : undefined,
    state: typeof state === 'string' ? state.trim().toLowerCase() : undefined,
    message,
    startedAt,
  };
}

// Disable GPU hardware acceleration globally for maximum stability across
// all GPU configurations (no GPU, integrated, discrete).
//
// Rationale (following VS Code's philosophy):
// - Page/file loading is async data fetching — zero GPU dependency.
// - The original per-platform GPU branching was added to avoid CPU rendering
//   competing with sync I/O on Windows, but all file I/O is now async
//   (fs/promises), so that concern no longer applies.
// - Software rendering is deterministic across all hardware; GPU compositing
//   behaviour varies between vendors (Intel, AMD, NVIDIA, Apple Silicon) and
//   driver versions, making it the #1 source of rendering bugs in Electron.
//
// Users who want GPU acceleration can pass `--enable-gpu` on the CLI or
// set `"disable-hardware-acceleration": false` in the app config (future).
app.disableHardwareAcceleration();
app.setName('极智');

// On Linux, set CHROME_DESKTOP so Chromium can find the correct .desktop file.
// On Wayland this maps the running window to mimiclaw.desktop (→ icon + app grouping);
// on X11 it supplements the StartupWMClass matching.
// Must be called before app.whenReady() / before any window is created.
if (process.platform === 'linux') {
  app.setDesktopName('jizhi.desktop');
}

// Prevent multiple instances of the app from running simultaneously.
// Without this, two instances each spawn their own gateway process on the
// same port, then each treats the other's gateway as "orphaned" and kills
// it — creating an infinite kill/restart loop on Windows.
// The losing process must exit immediately so it never reaches Gateway startup.
const gotElectronLock = app.requestSingleInstanceLock();
if (!gotElectronLock) {
  console.info('[MimiClaw] Another instance already holds the single-instance lock; exiting duplicate process');
  app.exit(0);
}
let releaseProcessInstanceFileLock: () => void = () => {};
let gotFileLock = true;
if (gotElectronLock) {
  try {
    const fileLock = acquireProcessInstanceFileLock({
      userDataDir: app.getPath('userData'),
      lockName: 'mimiclaw',
    });
    gotFileLock = fileLock.acquired;
    releaseProcessInstanceFileLock = fileLock.release;
    if (!fileLock.acquired) {
      const ownerDescriptor = fileLock.ownerPid
        ? `${fileLock.ownerFormat ?? 'legacy'} pid=${fileLock.ownerPid}`
        : fileLock.ownerFormat === 'unknown'
          ? 'unknown lock format/content'
          : 'unknown owner';
      console.info(
        `[MimiClaw] Another instance already holds process lock (${fileLock.lockPath}, ${ownerDescriptor}); exiting duplicate process`,
      );
      app.exit(0);
    }
  } catch (error) {
    console.warn('[MimiClaw] Failed to acquire process instance file lock; continuing with Electron single-instance lock only', error);
  }
}
const gotTheLock = gotElectronLock && gotFileLock;

// Global references
let mainWindow: BrowserWindow | null = null;
let gatewayManager!: GatewayManager;
let codeAgentManager!: CodeAgentManager;
let skillsCliRunner!: SkillsCliRunner;
let hostEventBus!: HostEventBus;
let hostApiServer: Server | null = null;
let pendingDeepLinkUrl: string | null = null;
const mainWindowFocusState = createMainWindowFocusState();
const quitLifecycleState = createQuitLifecycleState();
const macDockIconSyncTimeouts = new Set<ReturnType<typeof setTimeout>>();

function notifyCloudAuthSuccess(session: CloudSession): void {
  hostEventBus.emit('cloud:auth-success', session);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cloud:auth-success', session);
  }
}

function notifyCloudAuthError(message: string): void {
  const payload = { message };
  hostEventBus.emit('cloud:auth-error', payload);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cloud:auth-error', payload);
  }
}

function registerAppProtocolClient(): void {
  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [resolve(process.argv[1])]);
    return;
  }

  app.setAsDefaultProtocolClient(APP_PROTOCOL);
}

function extractProtocolUrl(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${APP_PROTOCOL}://`)) ?? null;
}

function isXiaojiuAuthDeepLink(url: URL): boolean {
  return url.protocol === `${APP_PROTOCOL}:`
    && url.hostname === 'auth'
    && url.pathname === '/xiaojiu/callback';
}

function isJizhiAuthDeepLink(url: URL): boolean {
  return url.protocol === `${APP_PROTOCOL}:`
    && url.hostname === 'auth'
    && url.pathname === '/jizhi/callback';
}

async function handleJizhiAuthDeepLink(url: URL): Promise<void> {
  const token = url.searchParams.get('token')?.trim() || '';
  if (!token) {
    logger.warn('[jizhi-auth] Deep link missing token parameter');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('jizhi:auth-error', { message: '极智登录回调缺少 token 参数' });
    }
    return;
  }

  try {
    await setSetting('jizhiToken', token);
    logger.info('[jizhi-auth] jizhiToken saved from deep link');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('jizhi:auth-success', {});
    }
    focusMainWindow();
  } catch (error) {
    logger.error('[jizhi-auth] Failed to save jizhiToken:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('jizhi:auth-error', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function handleDeepLink(urlString: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch (error) {
    logger.warn('[oauth] Ignoring invalid deep link URL:', error);
    return;
  }

  if (isJizhiAuthDeepLink(url)) {
    await handleJizhiAuthDeepLink(url);
    return;
  }

  if (!isXiaojiuAuthDeepLink(url)) {
    return;
  }

  try {
    const result = await completeXiaojiuAuthCallback({
      code: url.searchParams.get('code'),
      state: url.searchParams.get('state'),
      error: url.searchParams.get('error'),
      errorMessage: url.searchParams.get('error_description'),
    });

    if (!result.success) {
      notifyCloudAuthError(result.message);
      return;
    }

    await Promise.all([
      setSetting('cloudApiUrl', result.cloudApiBase),
      setSetting('cloudApiToken', result.session.token),
    ]);
    notifyCloudAuthSuccess(result.session);
    focusMainWindow();
  } catch (error) {
    notifyCloudAuthError(error instanceof Error ? error.message : String(error));
  }
}

function getIconDirCandidates(): string[] {
  const candidates = [
    // Packaged: icons are in extraResources → process.resourcesPath/resources/icons
    join(process.resourcesPath, 'resources', 'icons'),
    // Packaged fallback: app bundle resources.
    join(process.resourcesPath, 'icons'),
    // Development: when main is bundled into dist-electron/main/.
    join(__dirname, '../../resources/icons'),
    // Development fallback: repository root (works with unusual launch cwd/layout).
    join(app.getAppPath(), 'resources', 'icons'),
    join(process.cwd(), 'resources', 'icons'),
  ];

  return [...new Set(candidates)];
}

function resolveExistingIconPaths(filePaths: string[]): string[] {
  const resolvedPaths: string[] = [];
  const seen = new Set<string>();

  for (const filePath of filePaths) {
    if (!filePath || seen.has(filePath) || !existsSync(filePath)) {
      continue;
    }

    seen.add(filePath);
    resolvedPaths.push(filePath);
  }

  return resolvedPaths;
}

function loadNativeImageFromPaths(filePaths: string[]): { icon: Electron.NativeImage; sourcePath: string } | null {
  for (const iconPath of resolveExistingIconPaths(filePaths)) {
    // Prefer loading from bytes so paths containing Unicode/symlinks remain robust.
    try {
      const icon = nativeImage.createFromBuffer(readFileSync(iconPath));
      if (!icon.isEmpty()) {
        return { icon, sourcePath: iconPath };
      }
    } catch {
      // Fall through to path loader.
    }

    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      return { icon, sourcePath: iconPath };
    }
  }

  return null;
}

function loadNativeImageFromCandidates(fileCandidates: string[]): { icon: Electron.NativeImage; sourcePath: string } | null {
  const iconPaths: string[] = [];
  const iconDirs = getIconDirCandidates();
  for (const iconDir of iconDirs) {
    for (const candidate of fileCandidates) {
      iconPaths.push(join(iconDir, candidate));
    }
  }

  return loadNativeImageFromPaths(iconPaths);
}

function getMacDockIconPathCandidates(): string[] {
  if (app.isPackaged) {
    // Prefer the bundle's .icns file first. When users overwrite the existing
    // .app in place, LaunchServices/Dock can momentarily surface a stale cached
    // icon; explicitly re-applying the bundle icon at runtime is the most
    // reliable way to override that cache.
    return resolveExistingIconPaths([
      join(process.resourcesPath, 'icon.icns'),
      join(process.resourcesPath, 'resources', 'icons', 'icon.icns'),
      join(process.resourcesPath, 'icons', 'icon.icns'),
      join(process.resourcesPath, 'resources', 'icons', 'icon.png'),
      join(process.resourcesPath, 'resources', 'icons', '512x512.png'),
      join(process.resourcesPath, 'icons', 'icon.png'),
      join(process.resourcesPath, 'icons', '512x512.png'),
    ]);
  }

  return resolveExistingIconPaths([
    join(__dirname, '../../resources/icons', 'icon.png'),
    join(__dirname, '../../resources/icons', '512x512.png'),
    join(__dirname, '../../resources/icons', 'icon.icns'),
    join(app.getAppPath(), 'resources', 'icons', 'icon.png'),
    join(app.getAppPath(), 'resources', 'icons', '512x512.png'),
    join(app.getAppPath(), 'resources', 'icons', 'icon.icns'),
    join(process.cwd(), 'resources', 'icons', 'icon.png'),
    join(process.cwd(), 'resources', 'icons', '512x512.png'),
    join(process.cwd(), 'resources', 'icons', 'icon.icns'),
  ]);
}

function clearMacDockIconSyncTimeouts(): void {
  for (const timeout of macDockIconSyncTimeouts) {
    clearTimeout(timeout);
  }
  macDockIconSyncTimeouts.clear();
}

/**
 * Get the app icon for the current platform
 */
function getAppIcon(): Electron.NativeImage | undefined {
  if (process.platform === 'darwin') return undefined; // macOS uses the app bundle icon

  const resolved = process.platform === 'win32'
    ? loadNativeImageFromCandidates(['icon.ico', 'icon.png'])
    : loadNativeImageFromCandidates(['icon.png', '512x512.png']);
  return resolved?.icon;
}

/**
 * Create the main application window
 */
function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';
  const useCustomTitleBar = isWindows;

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    icon: getAppIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true, // Enable <webview> for embedding OpenClaw Control UI
      navigateOnDragDrop: false,
    },
    titleBarStyle: isMac ? 'hiddenInset' : useCustomTitleBar ? 'hidden' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    frame: isMac || !useCustomTitleBar,
    show: false,
    // macOS: native window material, aligned with Codex-style frosted chrome.
    ...(isMac ? {
      vibrancy: 'under-window' as const,
      visualEffectState: 'active' as const,
      backgroundColor: '#00000000',
    } : {}),
  });

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const route: WindowLoadRoute = process.env.VITE_DEV_SERVER_URL
    ? { type: 'url', value: process.env.VITE_DEV_SERVER_URL }
    : { type: 'file', value: join(__dirname, '../../dist/index.html') };
  void loadWindowRoute(win, route, { windowName: 'main-window' }).catch((error) => {
    logger.error('[window-load] Failed to load main window route:', error);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools();
  }

  return win;
}

function focusWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return;
  }

  if (win.isMinimized()) {
    win.restore();
  }

  win.show();
  win.focus();
}

function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  clearPendingSecondInstanceFocus(mainWindowFocusState);
  focusWindow(mainWindow);
}

function normalizeOpenedPath(candidate: string): string | null {
  const value = candidate.trim();
  if (!value || value.startsWith('-')) {
    return null;
  }

  if (value.startsWith(`${APP_PROTOCOL}://`)) {
    return null;
  }

  if (value.startsWith('file://')) {
    try {
      const parsed = decodeURIComponent(new URL(value).pathname);
      return parsed && existsSync(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  const resolvedPath = resolve(value);
  return existsSync(resolvedPath) ? resolvedPath : null;
}

function isInternalAppFileUrl(url: string): boolean {
  if (!url.startsWith('file://')) {
    return false;
  }

  try {
    const parsed = decodeURIComponent(new URL(url).pathname);
    if (!parsed) {
      return false;
    }

    // Ignore app-internal files (especially packaged app.asar paths).
    // These are legitimate app navigations and must never be rerouted as
    // user-dropped files.
    const appPath = app.getAppPath();
    if (parsed === appPath || parsed.startsWith(`${appPath}/`)) {
      return true;
    }

    const resourcesPath = process.resourcesPath;
    if (parsed === resourcesPath || parsed.startsWith(`${resourcesPath}/`)) {
      return true;
    }

    if (parsed.includes('/app.asar/') || parsed.endsWith('/app.asar')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function extractOpenedPaths(argv: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const arg of argv) {
    const normalized = normalizeOpenedPath(arg);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    results.push(normalized);
  }

  return results;
}

async function routePathToCodeChat(candidate: string): Promise<boolean> {
  const normalizedPath = normalizeOpenedPath(candidate);
  if (!normalizedPath) {
    return false;
  }

  const codeChatWindow = getCodeChatWindow();
  if (codeChatWindow) {
    codeChatWindow.focus();
    return forwardDroppedPathToCodeChat(`file://${encodeURI(normalizedPath)}`);
  }

  await ensureCodeChatWindowForDroppedPath(normalizedPath);
  return true;
}

function closeNonCodeChatOwnerWindow(contents: Electron.WebContents): void {
  const codeChatWindow = getCodeChatWindow();
  const ownerWindow = BrowserWindow.fromWebContents(contents);
  if (!ownerWindow || ownerWindow.isDestroyed()) {
    return;
  }
  if (codeChatWindow && ownerWindow === codeChatWindow) {
    return;
  }
  ownerWindow.close();
}

function createMainWindow(): BrowserWindow {
  const win = createWindow();

  win.once('ready-to-show', () => {
    if (mainWindow !== win) {
      return;
    }

    syncMacDockIcon('main-window-ready-to-show');

    const action = consumeMainWindowReady(mainWindowFocusState);
    if (action === 'focus') {
      focusWindow(win);
      return;
    }

    win.show();
  });

  win.on('close', (event) => {
    if (!isQuitting()) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  mainWindow = win;
  return win;
}

function syncMacDockIcon(reason = 'unspecified'): void {
  if (process.platform !== 'darwin' || !app.dock) return;

  const iconPaths = getMacDockIconPathCandidates();
  if (iconPaths.length === 0) {
    logger.warn(`Failed to resolve macOS Dock icon during "${reason}". Checked: ${getIconDirCandidates().join(', ')}, ${process.resourcesPath}`);
    return;
  }

  app.setActivationPolicy('regular');
  app.dock.show();

  let selectedPath: string | null = null;
  for (const iconPath of iconPaths) {
    try {
      app.dock.setIcon(iconPath);
      selectedPath = iconPath;
      logger.debug(`macOS Dock icon path set during "${reason}" to: ${iconPath}`);
      break;
    } catch (error) {
      logger.warn(`Failed to set macOS Dock icon from path "${iconPath}"`, error);
    }
  }

  // Path updates are not always enough: development mode can miss the refresh,
  // and packaged apps that were overwritten in place can briefly keep Dock's
  // stale cached icon. Re-apply via nativeImage as a best-effort correction.
  const resolved = loadNativeImageFromPaths(iconPaths);
  if (resolved) {
    try {
      app.dock.setIcon(resolved.icon);
      logger.debug(`macOS Dock icon nativeImage fallback set during "${reason}" from: ${resolved.sourcePath}`);
    } catch (error) {
      logger.warn(`Failed to set macOS Dock icon from nativeImage "${resolved.sourcePath}"`, error);
    }
  }

  const delayedIconPath = selectedPath ?? iconPaths[0];
  const reapplyDelaysMs = app.isPackaged ? [750, 3000, 8000] : [500, 2000];
  clearMacDockIconSyncTimeouts();

  // Give Dock a few more opportunities to adopt the icon, especially after
  // packaged app upgrades where LaunchServices caches can lag behind startup.
  for (const delayMs of reapplyDelaysMs) {
    const timeout = setTimeout(() => {
      macDockIconSyncTimeouts.delete(timeout);
      if (!app.isReady() || process.platform !== 'darwin' || !app.dock) return;
      try {
        app.dock.setIcon(delayedIconPath);
        logger.debug(`macOS Dock icon re-applied during "${reason}" (${delayMs}ms) from path: ${delayedIconPath}`);
      } catch (error) {
        logger.warn(`Failed to re-apply macOS Dock icon (${delayMs}ms) from "${delayedIconPath}"`, error);
      }
    }, delayMs);
    macDockIconSyncTimeouts.add(timeout);
  }
}

function performBestEffortQuitCleanup(): void {
  hostEventBus?.closeAll();
  hostApiServer?.close();
  void gatewayManager?.stop().catch((err) => {
    logger.warn('gatewayManager.stop() error during quit:', err);
  });
  void codeAgentManager?.stop().catch((err) => {
    logger.warn('codeAgentManager.stop() error during quit:', err);
  });
}

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  // Initialize logger first
  logger.init();
  const openclawAvailable = isOpenClawPresent();
  logger.info('=== MimiClaw Application Starting ===');
  logger.debug(
    `Runtime: platform=${process.platform}/${process.arch}, electron=${process.versions.electron}, node=${process.versions.node}, packaged=${app.isPackaged}, pid=${process.pid}, ppid=${process.ppid}`
  );
  if (!openclawAvailable) {
    logger.info('OpenClaw runtime not bundled; local Gateway and CLI features will be skipped until a runtime is available.');
  }

  // Warm up network optimization (non-blocking)
  void warmupNetworkOptimization();

  // Initialize Telemetry early
  await initTelemetry();

  // Apply persisted proxy settings before creating windows or network requests.
  await applyProxySettings();
  await syncLaunchAtStartupSettingFromStore();

  // Set application menu
  createMenu();
  syncMacDockIcon('initialize-after-menu');

  // Register browser-use IPC handlers early, before the window loads content,
  // to prevent "No handler registered" errors during renderer startup / HMR.
  registerBrowserUseHandlers();

  // Create the main window
  const window = createMainWindow();
  syncMacDockIcon('initialize-after-main-window');

  // Register IPC handlers immediately after window creation, before content
  // finishes loading, to prevent "No handler registered" errors from the
  // renderer during startup / HMR.
  registerIpcHandlers(gatewayManager, window);
  registerUpdateHandlers(appUpdater, window);

  // Create system tray
  createTray(window);

  // Override security headers ONLY for the OpenClaw Gateway Control UI.
  // The URL filter ensures this callback only fires for gateway requests,
  // avoiding unnecessary overhead on every other HTTP response.
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['http://127.0.0.1:18789/*', 'http://localhost:18789/*'] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      delete headers['X-Frame-Options'];
      delete headers['x-frame-options'];
      if (headers['Content-Security-Policy']) {
        headers['Content-Security-Policy'] = headers['Content-Security-Policy'].map(
          (csp) => csp.replace(/frame-ancestors\s+'none'/g, "frame-ancestors 'self' *")
        );
      }
      if (headers['content-security-policy']) {
        headers['content-security-policy'] = headers['content-security-policy'].map(
          (csp) => csp.replace(/frame-ancestors\s+'none'/g, "frame-ancestors 'self' *")
        );
      }
      callback({ responseHeaders: headers });
    },
  );

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['file://*/*'] },
    (details, callback) => {
      // Restrict interception to top-level file navigations only.
      // Subresource file:// requests are often app-internal assets.
      if (details.resourceType !== 'mainFrame') {
        callback({ cancel: false });
        return;
      }

      // Never intercept app-internal packaged files.
      if (isInternalAppFileUrl(details.url)) {
        callback({ cancel: false });
        return;
      }

      const normalizedPath = normalizeOpenedPath(details.url);
      if (!normalizedPath) {
        callback({ cancel: false });
        return;
      }

      void routePathToCodeChat(normalizedPath).catch((error) => {
        logger.warn(`Failed to route dropped file path "${normalizedPath}" to code chat:`, error);
      });
      callback({ cancel: true });
    },
  );

  hostApiServer = await startHostApiServer({
    gatewayManager,
    codeAgentManager,
    skillsCliRunner,
    eventBus: hostEventBus,
    mainWindow: window,
  });

  await syncPetWindowFromSettings();
  void startVoiceShortcutMonitor();

  // DEBUG: Log all windows after startup to identify duplicate Dock entries
  setTimeout(() => {
    const allWindows = BrowserWindow.getAllWindows();
    logger.info(`[DEBUG] Total BrowserWindows: ${allWindows.length}`);
    for (const w of allWindows) {
      if (w.isDestroyed()) continue;
      logger.info(`[DEBUG] Window id=${w.id} title="${w.getTitle()}" visible=${w.isVisible()} excluded=${w.excludedFromShownWindowsMenu} url=${w.webContents.getURL()}`);
    }
  }, 5000);

  void (async () => {
    try {
      const [updateChannel, autoCheckUpdate, autoDownloadUpdate] = await Promise.all([
        getSetting('updateChannel'),
        getSetting('autoCheckUpdate'),
        getSetting('autoDownloadUpdate'),
      ]);

      appUpdater.setChannel(updateChannel);
      appUpdater.setAutoDownload(autoDownloadUpdate);

      if (!autoCheckUpdate) return;
      if (!app.isPackaged) {
        logger.info('[Updater] Skip startup auto-check because app is not packaged');
        return;
      }

      setTimeout(() => {
        void appUpdater.checkForUpdates().catch((error) => {
          logger.warn('[Updater] Startup auto-check failed:', error);
        });
      }, STARTUP_UPDATE_CHECK_DELAY_MS);
    } catch (error) {
      logger.warn('[Updater] Failed to bootstrap startup update settings:', error);
    }
  })();

  // Repair any bootstrap files that only contain MimiClaw markers (no OpenClaw
  // template content). This fixes a race condition where ensureMimiClawContext()
  // previously created the file before the gateway could seed the full template.
  void repairMimiClawOnlyBootstrapFiles().catch((error) => {
    logger.warn('Failed to repair bootstrap files:', error);
  });

  // Pre-deploy built-in skills (feishu-doc, feishu-drive, feishu-perm, feishu-wiki)
  // to ~/.openclaw/skills/ so they are immediately available without manual install.
  void ensureBuiltinSkillsInstalled().catch((error) => {
    logger.warn('Failed to install built-in skills:', error);
  });

  // Pre-deploy bundled third-party skills from resources/preinstalled-skills.
  // This installs full skill directories (not only SKILL.md) in an idempotent,
  // non-destructive way and never blocks startup.
  void ensurePreinstalledSkillsInstalled().catch((error) => {
    logger.warn('Failed to install preinstalled skills:', error);
  });

  // Pre-deploy/upgrade bundled OpenClaw plugins (dingtalk, wecom, qqbot, feishu, wechat)
  // to ~/.openclaw/extensions/ so they are always up-to-date after an app update.
  void ensureAllBundledPluginsInstalled().catch((error) => {
    logger.warn('Failed to install/upgrade bundled plugins:', error);
  });

  // Bridge gateway and host-side events before any auto-start logic runs, so
  // renderer subscribers observe the full startup lifecycle.
  registerPetRuntime(gatewayManager);

  gatewayManager.on('status', (status: { state: string }) => {
    hostEventBus.emit('gateway:status', status);
    setUnifiedGatewayLifecycleState(status.state);
    if (status.state === 'running') {
      void ensureMimiClawContext().catch((error) => {
        logger.warn('Failed to re-merge MimiClaw context after gateway reconnect:', error);
      });
    }
  });

  gatewayManager.on('error', (error) => {
    hostEventBus.emit('gateway:error', { message: error.message });
  });

  gatewayManager.on('notification', (notification) => {
    hostEventBus.emit('gateway:notification', notification);
    const parsed = parseAgentNotification(notification);
    if (!parsed) return;

    const phase = parsed.phase || '';
    const state = parsed.state || '';
    if (phase === 'started') {
      recordUnifiedGatewayStarted(parsed);
      return;
    }
    if (phase === 'completed' || phase === 'done' || phase === 'finished' || phase === 'end') {
      recordUnifiedGatewayCompleted(parsed);
      return;
    }
    if (state === 'error' || state === 'aborted') {
      recordUnifiedGatewayCompleted(parsed);
      return;
    }
    recordUnifiedGatewayProgress(parsed);
  });

  gatewayManager.on('chat:message', (data) => {
    hostEventBus.emit('gateway:chat-message', data);
  });

  gatewayManager.on('channel:status', (data) => {
    hostEventBus.emit('gateway:channel-status', data);
  });

  gatewayManager.on('exit', (code) => {
    hostEventBus.emit('gateway:exit', { code });
  });

  codeAgentManager.on('status', (status) => {
    hostEventBus.emit('code-agent:status', status);
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:status', status);
      }
    }
  });

  codeAgentManager.on('error', (error) => {
    const payload = { message: error instanceof Error ? error.message : String(error) };
    hostEventBus.emit('code-agent:error', payload);
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:error', payload);
      }
    }
  });

  codeAgentManager.on('stderr', (line) => {
    hostEventBus.emit('code-agent:stderr', { line });
  });

  codeAgentManager.on('exit', (payload) => {
    hostEventBus.emit('code-agent:exit', payload);
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:exit', payload);
      }
    }
  });

  codeAgentManager.on('run:started', (payload) => {
    recordUnifiedCodeRunStarted(payload);
    hostEventBus.emit('code-agent:run-started', payload);
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:run-started', payload);
      }
    }
  });

  codeAgentManager.on('run:completed', (payload) => {
    recordUnifiedCodeRunFinished();
    hostEventBus.emit('code-agent:run-completed', payload);
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:run-completed', payload);
      }
    }
  });

  codeAgentManager.on('run:failed', (payload) => {
    recordUnifiedCodeRunFinished();
    hostEventBus.emit('code-agent:run-failed', payload);
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:run-failed', payload);
      }
    }
  });

  codeAgentManager.on('run:token', (payload) => {
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:token', payload);
      }
    }
  });

  codeAgentManager.on('run:activity', (payload) => {
    recordUnifiedCodeActivity(payload as { toolName?: string; inputSummary?: string });
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:activity', payload);
      }
    }
  });

  codeAgentManager.on('run:tool-result', (payload) => {
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:tool-result', payload);
      }
    }
  });

  codeAgentManager.on('run:permission-request', (payload) => {
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:permission-request', payload);
      }
    }
  });

  codeAgentManager.on('run:sdk-message', (payload) => {
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:sdk-message', payload);
      }
    }
  });

  ipcMain.handle('code-agent:respond-permission', async (_event, payload: { requestId: string; decision: string; feedback?: string }) => {
    await codeAgentManager.respondPermission(payload.requestId, payload.decision, payload.feedback);
    return { ok: true };
  });

  ipcMain.handle('code-agent:respond-elicitation', async (_event, payload: { elicitationId: string; action: string; content?: Record<string, unknown> }) => {
    await codeAgentManager.respondElicitation(payload.elicitationId, payload.action, payload.content);
    return { ok: true };
  });

  // ─── Browser-Use event wiring ───────────────────────────────────────────────

  browserUseManager.on('status', (status: unknown) => {
    hostEventBus.emit('browser-use:status', status);
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('browser-use:status-changed', status);
      }
    }
  });

  browserUseManager.on('cursor', (cursorEvent: unknown) => {
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('browser-use:cursor', cursorEvent);
      }
    }
  });

  browserUseManager.on('error', (error: unknown) => {
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('browser-use:error', error);
      }
    }
  });

  browserUseManager.on('request-open', () => {
    const wins = [mainWindow, getCodeChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('browser-use:request-open');
      }
    }
  });

  deviceOAuthManager.on('oauth:code', (payload) => {
    hostEventBus.emit('oauth:code', payload);
  });

  deviceOAuthManager.on('oauth:start', (payload) => {
    hostEventBus.emit('oauth:start', payload);
  });

  deviceOAuthManager.on('oauth:success', (payload) => {
    hostEventBus.emit('oauth:success', { ...payload, success: true });
  });

  deviceOAuthManager.on('oauth:error', (error) => {
    hostEventBus.emit('oauth:error', error);
  });

  browserOAuthManager.on('oauth:start', (payload) => {
    hostEventBus.emit('oauth:start', payload);
  });

  browserOAuthManager.on('oauth:code', (payload) => {
    hostEventBus.emit('oauth:code', payload);
  });

  browserOAuthManager.on('oauth:success', (payload) => {
    hostEventBus.emit('oauth:success', { ...payload, success: true });
  });

  browserOAuthManager.on('oauth:error', (error) => {
    hostEventBus.emit('oauth:error', error);
  });

  whatsAppLoginManager.on('qr', (data) => {
    hostEventBus.emit('channel:whatsapp-qr', data);
  });

  whatsAppLoginManager.on('success', (data) => {
    hostEventBus.emit('channel:whatsapp-success', data);
  });

  whatsAppLoginManager.on('error', (error) => {
    hostEventBus.emit('channel:whatsapp-error', error);
  });

  // Defer gateway auto-start until the renderer has fully loaded.
  // This guarantees that:
  //   1. The Host API server (port 3210) is definitely listening before the
  //      renderer calls initGateway() → GET /api/gateway/status.
  //   2. The renderer has had time to mount React, call initGateway(), and
  //      subscribe to gateway:status-changed IPC events before the first
  //      state transition fires — so no status event is silently dropped.
  window.webContents.once('did-finish-load', () => {
    syncMacDockIcon('main-window-did-finish-load');
    void (async () => {
      // Start Gateway automatically (this seeds missing bootstrap files with full templates)
      const gatewayAutoStart = await getSetting('gatewayAutoStart');
      const remoteGatewayUrl = await getSetting('remoteGatewayUrl');
      const hasRemoteGateway = !!(remoteGatewayUrl && String(remoteGatewayUrl).trim());
      // Allow auto-start when either a local runtime exists OR a remote gateway URL is configured.
      if (gatewayAutoStart && (openclawAvailable || hasRemoteGateway)) {
        try {
          // Provider auth sync only applies to the local openclaw runtime.
          if (openclawAvailable) {
            await syncAllProviderAuthToRuntime();
          }
          logger.debug('Auto-starting Gateway...');
          await gatewayManager.start();
          logger.info('Gateway auto-start succeeded');
        } catch (error) {
          logger.error('Gateway auto-start failed:', error);
          if (!window.isDestroyed()) {
            window.webContents.send('gateway:error', String(error));
          }
        }
      } else if (gatewayAutoStart && !openclawAvailable && !hasRemoteGateway) {
        logger.info('Gateway auto-start skipped because no bundled OpenClaw runtime is available');
      } else {
        logger.info('Gateway auto-start disabled in settings');
      }

      // Auto-start Code Agent sidecar (independent of gateway).
      void codeAgentManager.start().catch((error) => {
        logger.warn('Code agent auto-start failed:', error);
      });

      // Merge MimiClaw context snippets into the workspace bootstrap files.
      // The gateway seeds workspace files asynchronously after its HTTP server
      // is ready, so ensureMimiClawContext will retry until the target files appear.
      void ensureMimiClawContext().catch((error) => {
        logger.warn('Failed to merge MimiClaw context into workspace:', error);
      });
    })();
  });

  // Auto-install openclaw CLI and shell completions (non-blocking, no renderer dependency).
  if (openclawAvailable) {
    void autoInstallCliIfNeeded((installedPath) => {
      mainWindow?.webContents.send('openclaw:cli-installed', installedPath);
    }).then(() => {
      generateCompletionCache();
      installCompletionToProfile();
    }).catch((error) => {
      logger.warn('CLI auto-install failed:', error);
    });
  }
}

if (gotTheLock) {
  const requestQuitOnSignal = createSignalQuitHandler({
    logInfo: (message) => logger.info(message),
    requestQuit: () => app.quit(),
  });

  process.on('exit', () => {
    releaseProcessInstanceFileLock();
  });

  process.once('SIGINT', () => requestQuitOnSignal('SIGINT'));
  process.once('SIGTERM', () => requestQuitOnSignal('SIGTERM'));

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopVoiceShortcutMonitor();
    clearMacDockIconSyncTimeouts();
    releaseProcessInstanceFileLock();
  });

  if (process.platform === 'win32') {
    app.setAppUserModelId(WINDOWS_APP_USER_MODEL_ID);
  }

  gatewayManager = new GatewayManager();
  codeAgentManager = new CodeAgentManager();
  skillsCliRunner = new SkillsCliRunner();
  hostEventBus = new HostEventBus();
  pendingDeepLinkUrl = extractProtocolUrl(process.argv);

  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (!app.isReady()) {
      pendingDeepLinkUrl = url;
      return;
    }
    void handleDeepLink(url);
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    void routePathToCodeChat(filePath).catch((error) => {
      logger.warn(`Failed to route open-file path "${filePath}" to code chat:`, error);
    });
  });

  // When a second instance is launched, focus the existing window instead.
  app.on('second-instance', (_event, argv) => {
    logger.info('Second MimiClaw instance detected; redirecting to the existing window');
    const deepLinkUrl = extractProtocolUrl(argv);
    if (deepLinkUrl) {
      void handleDeepLink(deepLinkUrl);
    }

    const openedPaths = extractOpenedPaths(argv);
    for (const openedPath of openedPaths) {
      void routePathToCodeChat(openedPath).catch((error) => {
        logger.warn(`Failed to route second-instance path "${openedPath}" to code chat:`, error);
      });
    }

    const focusRequest = requestSecondInstanceFocus(
      mainWindowFocusState,
      Boolean(mainWindow && !mainWindow.isDestroyed()),
    );

    if (focusRequest === 'focus-now') {
      focusMainWindow();
      return;
    }

    logger.debug('Main window is not ready yet; deferring second-instance focus until ready-to-show');
  });

  // Application lifecycle
  app.whenReady().then(() => {
    // Prevent default Chromium navigation for dropped files across all windows.
    // Without this, dropping a file/folder onto any window (especially the main
    // window or an unhandled area) will cause Chromium to navigate to file:///...
    // and crash the app UI with ERR_FILE_NOT_FOUND or ERR_BLOCKED_BY_CLIENT.
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-navigate', (navEvent, navigationUrl) => {
      console.log("[App DEBUG] will-navigate globally:", navigationUrl);
      if (navigationUrl.startsWith('file://')) {
        if (!navigationUrl.includes('index.html')) {
          navEvent.preventDefault();
          closeNonCodeChatOwnerWindow(contents);
          void routePathToCodeChat(navigationUrl).catch((error) => {
            logger.warn(`Failed to route navigation drop URL "${navigationUrl}" to code chat:`, error);
          });
          logger.debug(`[App] Prevented navigation to dropped file: ${navigationUrl}`);
        }
      }
    });

    contents.on('did-fail-provisional-load', (e, code, desc, url, isMainFrame) => {
      console.log(`[App DEBUG] did-fail-provisional-load globally: code=${code}, url=${url}, isMainFrame=${isMainFrame}`);
      if (isMainFrame && url.startsWith('file://') && !url.includes('index.html')) {
        closeNonCodeChatOwnerWindow(contents);
        void routePathToCodeChat(url).catch((error) => {
          logger.warn(`Failed to recover from did-fail-provisional-load URL "${url}":`, error);
        });
      }
    });

    contents.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
      console.log(`[App DEBUG] did-fail-load globally: code=${code}, url=${url}, isMainFrame=${isMainFrame}`);
      if (isMainFrame && url.startsWith('file://') && !url.includes('index.html')) {
        closeNonCodeChatOwnerWindow(contents);
        void routePathToCodeChat(url).catch((error) => {
          logger.warn(`Failed to recover from did-fail-load URL "${url}":`, error);
        });
      }
    });
  });

    registerAppProtocolClient();
    void initialize().catch((error) => {
      logger.error('Application initialization failed:', error);
    }).finally(() => {
      if (pendingDeepLinkUrl) {
        const deepLinkUrl = pendingDeepLinkUrl;
        pendingDeepLinkUrl = null;
        void handleDeepLink(deepLinkUrl);
      }
    });

    // Register activate handler AFTER app is ready to prevent
    // "Cannot create BrowserWindow before app is ready" on macOS.
    app.on('activate', () => {
      syncMacDockIcon('app-activate');
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      } else {
        focusMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  electronAutoUpdater.on('before-quit-for-update', () => {
    setInstallingUpdate();
    setQuitting();
  });

  app.on('before-quit', (event) => {
    setQuitting();

    if (isInstallingUpdate()) {
      performBestEffortQuitCleanup();
      return;
    }

    const action = requestQuitLifecycleAction(quitLifecycleState);

    if (action === 'allow-quit') {
      return;
    }

    event.preventDefault();

    if (action === 'cleanup-in-progress') {
      logger.debug('Quit requested while cleanup already in progress; waiting for shutdown task to finish');
      return;
    }

    hostEventBus.closeAll();
    hostApiServer?.close();

    const stopPromise = gatewayManager.stop().catch((err) => {
      logger.warn('gatewayManager.stop() error during quit:', err);
    });
    const stopCodeAgentPromise = codeAgentManager.stop().catch((err) => {
      logger.warn('codeAgentManager.stop() error during quit:', err);
    });
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), 5000);
    });

    void Promise.race([
      Promise.allSettled([stopPromise, stopCodeAgentPromise]).then(() => 'stopped' as const),
      timeoutPromise,
    ]).then((result) => {
      if (result === 'timeout') {
        logger.warn('Gateway shutdown timed out during app quit; proceeding with forced quit');
        void gatewayManager.forceTerminateOwnedProcessForQuit().then((terminated) => {
          if (terminated) {
            logger.warn('Forced gateway process termination completed after quit timeout');
          }
        }).catch((err) => {
          logger.warn('Forced gateway termination failed after quit timeout:', err);
        });
      }
      markQuitCleanupCompleted(quitLifecycleState);
      app.quit();
    });
  });

  // Best-effort Gateway cleanup on unexpected crashes.
  // These handlers attempt to terminate the Gateway child process within a
  // short timeout before force-exiting, preventing orphaned processes.
  const emergencyGatewayCleanup = (reason: string, error: unknown): void => {
    logger.error(`${reason}:`, error);
    try {
      void gatewayManager?.stop().catch(() => { /* ignore */ });
    } catch {
      // ignore — stop() may not be callable if state is corrupted
    }
    try {
      void codeAgentManager?.stop().catch(() => { /* ignore */ });
    } catch {
      // ignore — stop() may not be callable if state is corrupted
    }
    // Give Gateway stop a brief window, then force-exit.
    setTimeout(() => {
      process.exit(1);
    }, 3000).unref();
  };

  process.on('uncaughtException', (error) => {
    emergencyGatewayCleanup('Uncaught exception in main process', error);
  });

  process.on('unhandledRejection', (reason) => {
    if (isBenignDevWindowLoadRejection(reason)) {
      logger.warn('Ignoring transient dev-server window load rejection:', reason);
      return;
    }
    emergencyGatewayCleanup('Unhandled promise rejection in main process', reason);
  });
}

// Export for testing
export { mainWindow, gatewayManager };
