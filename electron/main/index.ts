/**
 * Electron Main Process Entry
 * Manages window creation, system tray, and IPC handlers
 */
import '../load-env';
import { app, autoUpdater as electronAutoUpdater, BrowserWindow, globalShortcut, ipcMain, nativeImage, session, shell } from 'electron';
import type { Server } from 'node:http';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { CodeAgentManager } from '../code-agent/manager';
import { GatewayManager } from '../gateway/manager';
import { registerIpcHandlers } from './ipc-handlers';
import { createTray } from './tray';
import { createMenu } from './menu';

import { appUpdater, registerUpdateHandlers } from './updater';
import { logger } from '../utils/logger';
import { warmupNetworkOptimization } from '../utils/uv-env';
import { initTelemetry } from '../utils/telemetry';

import { ClawHubService } from '../gateway/clawhub';
import { ensureClawXContext, repairClawXOnlyBootstrapFiles } from '../utils/openclaw-workspace';
import { autoInstallCliIfNeeded, generateCompletionCache, installCompletionToProfile } from '../utils/openclaw-cli';
import { isInstallingUpdate, isQuitting, setInstallingUpdate, setQuitting } from './app-state';
import { applyProxySettings } from './proxy';
import { syncLaunchAtStartupSettingFromStore } from './launch-at-startup';
import { syncPetWindowFromSettings, getPetWindow } from './pet-window';
import { getMiniChatWindow, forwardDroppedPathToMiniChat, ensureMiniChatWindowForDroppedPath } from './mini-chat-window';
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
import { ensureBuiltinSkillsInstalled, ensurePreinstalledSkillsInstalled } from '../utils/skill-config';
import { ensureAllBundledPluginsInstalled } from '../utils/plugin-install';
import { isOpenClawPresent } from '../utils/paths';
import { startHostApiServer } from '../api/server';
import { HostEventBus } from '../api/event-bus';
import { deviceOAuthManager } from '../utils/device-oauth';
import { browserOAuthManager } from '../utils/browser-oauth';
import { whatsAppLoginManager } from '../utils/whatsapp-login';
import { syncAllProviderAuthToRuntime } from '../services/providers/provider-runtime-sync';
import { completeXiaojiuAuthCallback } from '../utils/xiaojiu-auth';
import type { CloudSession } from '../../shared/cloud-auth';

const WINDOWS_APP_USER_MODEL_ID = 'com.jizhi.gz4399';
const APP_PROTOCOL = 'jizhi';

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
// On Wayland this maps the running window to clawx.desktop (→ icon + app grouping);
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
  console.info('[ClawX] Another instance already holds the single-instance lock; exiting duplicate process');
  app.exit(0);
}
let releaseProcessInstanceFileLock: () => void = () => {};
let gotFileLock = true;
if (gotElectronLock) {
  try {
    const fileLock = acquireProcessInstanceFileLock({
      userDataDir: app.getPath('userData'),
      lockName: 'clawx',
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
        `[ClawX] Another instance already holds process lock (${fileLock.lockPath}, ${ownerDescriptor}); exiting duplicate process`,
      );
      app.exit(0);
    }
  } catch (error) {
    console.warn('[ClawX] Failed to acquire process instance file lock; continuing with Electron single-instance lock only', error);
  }
}
const gotTheLock = gotElectronLock && gotFileLock;

// Global references
let mainWindow: BrowserWindow | null = null;
let gatewayManager!: GatewayManager;
let codeAgentManager!: CodeAgentManager;
let clawHubService!: ClawHubService;
let hostEventBus!: HostEventBus;
let hostApiServer: Server | null = null;
let pendingDeepLinkUrl: string | null = null;
const mainWindowFocusState = createMainWindowFocusState();
const quitLifecycleState = createQuitLifecycleState();

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

/**
 * Resolve the icons directory path (works in both dev and packaged mode)
 */
function getIconsDir(): string {
  if (app.isPackaged) {
    // Packaged: icons are in extraResources → process.resourcesPath/resources/icons
    return join(process.resourcesPath, 'resources', 'icons');
  }
  // Development: relative to dist-electron/main/
  return join(__dirname, '../../resources/icons');
}

/**
 * Get the app icon for the current platform
 */
function getAppIcon(): Electron.NativeImage | undefined {
  if (process.platform === 'darwin') return undefined; // macOS uses the app bundle icon

  const iconsDir = getIconsDir();
  const iconPath =
    process.platform === 'win32'
      ? join(iconsDir, 'icon.ico')
      : join(iconsDir, 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  return icon.isEmpty() ? undefined : icon;
}

function getMacDockIcon(): Electron.NativeImage | undefined {
  if (process.platform !== 'darwin') return undefined;

  const iconsDir = getIconsDir();
  for (const candidate of ['icon.png', 'icon.icns', '512x512.png']) {
    const icon = nativeImage.createFromPath(join(iconsDir, candidate));
    if (!icon.isEmpty()) {
      return icon;
    }
  }

  return undefined;
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
  });

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, '../../dist/index.html'));
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

async function routePathToMiniChat(candidate: string): Promise<boolean> {
  const normalizedPath = normalizeOpenedPath(candidate);
  if (!normalizedPath) {
    return false;
  }

  const miniChatWindow = getMiniChatWindow();
  if (miniChatWindow) {
    miniChatWindow.focus();
    return forwardDroppedPathToMiniChat(`file://${encodeURI(normalizedPath)}`);
  }

  await ensureMiniChatWindowForDroppedPath(normalizedPath);
  return true;
}

function closeNonMiniChatOwnerWindow(contents: Electron.WebContents): void {
  const miniChatWindow = getMiniChatWindow();
  const ownerWindow = BrowserWindow.fromWebContents(contents);
  if (!ownerWindow || ownerWindow.isDestroyed()) {
    return;
  }
  if (miniChatWindow && ownerWindow === miniChatWindow) {
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

function syncMacDockIcon(): void {
  if (process.platform !== 'darwin' || !app.dock) return;

  const icon = getMacDockIcon();
  if (!icon) {
    logger.warn('Failed to resolve macOS Dock icon from resources/icons');
    return;
  }

  app.setActivationPolicy('regular');
  app.dock.show();
  app.dock.setIcon(icon);
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
  logger.info('=== ClawX Application Starting ===');
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
  syncMacDockIcon();

  // Create the main window
  const window = createMainWindow();
  syncMacDockIcon();

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
      const normalizedPath = normalizeOpenedPath(details.url);
      if (!normalizedPath) {
        callback({ cancel: false });
        return;
      }

      void routePathToMiniChat(normalizedPath);
      callback({ cancel: true });
    },
  );

  // Register IPC handlers
  registerIpcHandlers(gatewayManager, clawHubService, window);

  hostApiServer = await startHostApiServer({
    gatewayManager,
    codeAgentManager,
    clawHubService,
    eventBus: hostEventBus,
    mainWindow: window,
  });

  await syncPetWindowFromSettings();
  void startVoiceShortcutMonitor();

  // Register update handlers
  registerUpdateHandlers(appUpdater, window);

  // Note: Auto-check for updates is driven by the renderer (update store init)
  // so it respects the user's "Auto-check for updates" setting.

  // Repair any bootstrap files that only contain ClawX markers (no OpenClaw
  // template content). This fixes a race condition where ensureClawXContext()
  // previously created the file before the gateway could seed the full template.
  void repairClawXOnlyBootstrapFiles().catch((error) => {
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
    if (status.state === 'running') {
      void ensureClawXContext().catch((error) => {
        logger.warn('Failed to re-merge ClawX context after gateway reconnect:', error);
      });
    }
  });

  gatewayManager.on('error', (error) => {
    hostEventBus.emit('gateway:error', { message: error.message });
  });

  gatewayManager.on('notification', (notification) => {
    hostEventBus.emit('gateway:notification', notification);
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('code-agent:status', status);
    }
  });

  codeAgentManager.on('error', (error) => {
    hostEventBus.emit('code-agent:error', { message: error instanceof Error ? error.message : String(error) });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('code-agent:error', { message: error instanceof Error ? error.message : String(error) });
    }
  });

  codeAgentManager.on('stderr', (line) => {
    hostEventBus.emit('code-agent:stderr', { line });
  });

  codeAgentManager.on('exit', (payload) => {
    hostEventBus.emit('code-agent:exit', payload);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('code-agent:exit', payload);
    }
  });

  codeAgentManager.on('run:started', (payload) => {
    hostEventBus.emit('code-agent:run-started', payload);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('code-agent:run-started', payload);
    }
  });

  codeAgentManager.on('run:completed', (payload) => {
    hostEventBus.emit('code-agent:run-completed', payload);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('code-agent:run-completed', payload);
    }
  });

  codeAgentManager.on('run:failed', (payload) => {
    hostEventBus.emit('code-agent:run-failed', payload);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('code-agent:run-failed', payload);
    }
  });

  codeAgentManager.on('run:token', (payload) => {
    const wins = [mainWindow, getMiniChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:token', payload);
      }
    }
  });

  codeAgentManager.on('run:activity', (payload) => {
    const wins = [mainWindow, getMiniChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:activity', payload);
      }
    }
  });

  codeAgentManager.on('run:tool-result', (payload) => {
    const wins = [mainWindow, getMiniChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:tool-result', payload);
      }
    }
  });

  codeAgentManager.on('run:permission-request', (payload) => {
    const wins = [mainWindow, getMiniChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:permission-request', payload);
      }
    }
  });

  codeAgentManager.on('run:sdk-message', (payload) => {
    const wins = [mainWindow, getMiniChatWindow(), getPetWindow()];
    for (const win of wins) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('code-agent:sdk-message', payload);
      }
    }
  });

  ipcMain.handle('code-agent:respond-permission', async (_event, payload: { requestId: string; decision: string }) => {
    await codeAgentManager.respondPermission(payload.requestId, payload.decision);
    return { ok: true };
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

      // Merge ClawX context snippets into the workspace bootstrap files.
      // The gateway seeds workspace files asynchronously after its HTTP server
      // is ready, so ensureClawXContext will retry until the target files appear.
      void ensureClawXContext().catch((error) => {
        logger.warn('Failed to merge ClawX context into workspace:', error);
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
    releaseProcessInstanceFileLock();
  });

  if (process.platform === 'win32') {
    app.setAppUserModelId(WINDOWS_APP_USER_MODEL_ID);
  }

  gatewayManager = new GatewayManager();
  codeAgentManager = new CodeAgentManager();
  clawHubService = new ClawHubService();
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
    void routePathToMiniChat(filePath);
  });

  // When a second instance is launched, focus the existing window instead.
  app.on('second-instance', (_event, argv) => {
    logger.info('Second ClawX instance detected; redirecting to the existing window');
    const deepLinkUrl = extractProtocolUrl(argv);
    if (deepLinkUrl) {
      void handleDeepLink(deepLinkUrl);
    }

    const openedPaths = extractOpenedPaths(argv);
    for (const openedPath of openedPaths) {
      void routePathToMiniChat(openedPath);
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
          closeNonMiniChatOwnerWindow(contents);
          void routePathToMiniChat(navigationUrl);
          logger.debug(`[App] Prevented navigation to dropped file: ${navigationUrl}`);
        }
      }
    });

    contents.on('did-fail-provisional-load', (e, code, desc, url, isMainFrame) => {
      console.log(`[App DEBUG] did-fail-provisional-load globally: code=${code}, url=${url}, isMainFrame=${isMainFrame}`);
      if (isMainFrame && url.startsWith('file://') && !url.includes('index.html')) {
        closeNonMiniChatOwnerWindow(contents);
        void routePathToMiniChat(url);
      }
    });

    contents.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
      console.log(`[App DEBUG] did-fail-load globally: code=${code}, url=${url}, isMainFrame=${isMainFrame}`);
      if (isMainFrame && url.startsWith('file://') && !url.includes('index.html')) {
        closeNonMiniChatOwnerWindow(contents);
        void routePathToMiniChat(url);
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
    emergencyGatewayCleanup('Unhandled promise rejection in main process', reason);
  });
}

// Export for testing
export { mainWindow, gatewayManager };
