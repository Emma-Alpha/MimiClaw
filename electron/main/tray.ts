/**
 * System Tray Management
 * Creates and manages the system tray icon and menu
 */
import { Tray, Menu, BrowserWindow, app, nativeImage, screen } from 'electron';
import type { MenuItemConstructorOptions, NativeImage, Rectangle, TitleOptions } from 'electron';
import { join } from 'path';
import { execFileSync } from 'node:child_process';
import { loadWindowRoute } from './window-loader';
import {
  isTrayRecentUserInteraction,
  markTrayMenuOpened,
  markTrayClosed,
  markTrayPanelClosed,
  requestTrayMenuOpen,
  requestTrayPanelToggle,
  resetTrayInteractionState,
  type TrayInteractionReason,
} from './tray-interaction-center';
import {
  getUnifiedSessionActiveThreads,
  getUnifiedSessionGatewayState,
  getUnifiedSessionMostRecentActiveThread,
  getUnifiedSessionPressure,
  getUnifiedSessionRuntimeSnapshot,
  getUnifiedSessionRuntimeThreadById,
  normalizeAgentIdFromSessionKey,
  resetUnifiedSessionState,
  subscribeUnifiedSessionState,
  type UnifiedGatewayLifecycleState,
  type UnifiedRuntimeSnapshot,
  type UnifiedRuntimeThread,
  type UnifiedRuntimeThreadSnapshot,
} from './session-state-center';

let tray: Tray | null = null;
let trayMainWindow: BrowserWindow | null = null;
let trayRuntimeWindow: BrowserWindow | null = null;
let trayContextMenu: Menu | null = null;
let lastTrayBounds: Rectangle | null = null;
let unsubscribeSessionState: (() => void) | null = null;

export type TrayRuntimeThreadSnapshot = UnifiedRuntimeThreadSnapshot;
export type TrayRuntimeSnapshot = UnifiedRuntimeSnapshot;

const MAX_VISIBLE_RUNNING_THREADS = 5;
const TRAY_ICON_SIZE = 18;
const TRAY_RING_STROKE = 2.2;
const TRAY_METRIC_REFRESH_MS = 1_000;
const TRAY_METRIC_ANIMATION_MS = 300;
const TRAY_METRIC_ANIMATION_TICK_MS = 50;
const MONITOR_EMPTY_LABEL = '暂无运行中的会话';
const MORE_THREADS_LABEL_PREFIX = '还有 ';
const TRAY_PANEL_WIDTH = 372;
const TRAY_PANEL_HEIGHT = 560;
const TRAY_PANEL_GAP = 8;
const TRAY_AUTO_ATTENTION_COOLDOWN_MS = 12_000;
const TRAY_RECENT_MANUAL_GUARD_MS = 2_000;
const FRONTMOST_APP_SCRIPT = 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true';
const TERMINAL_BUNDLE_IDS = new Set<string>([
  'com.apple.Terminal',
  'com.googlecode.iterm2',
  'dev.warp.Warp-Stable',
  'dev.warp.Warp',
  'com.mitchellh.ghostty',
  'com.vandyke.SecureCRT',
  'com.microsoft.VSCode',
  'com.todesktop.230313mzl4w4u92',
]);

let trayMetricTarget = 0;
let trayMetricRendered = 0;
let trayMetricAnimationFrom = 0;
let trayMetricAnimationStartMs = 0;
let trayMetricRefreshTimer: NodeJS.Timeout | null = null;
let trayMetricAnimationTimer: NodeJS.Timeout | null = null;
let trayMetricIsError = false;
let trayLastVisualKey = '';
const trayIconCache = new Map<string, NativeImage>();
let trayAutoAttentionCooldownUntil = 0;
let trayLastAttentionGatewayState: UnifiedGatewayLifecycleState = 'stopped';
let trayLastAttentionActiveThreadIds = new Set<string>();

function summarizeSessionKey(sessionKey?: string): string {
  const raw = typeof sessionKey === 'string' ? sessionKey.trim() : '';
  if (!raw) return 'main';
  if (!raw.startsWith('agent:')) return raw.length > 26 ? `${raw.slice(0, 25)}…` : raw;
  const parts = raw.split(':');
  const suffix = parts.slice(2).join(':') || 'main';
  if (suffix.length <= 18) return suffix;
  return `${suffix.slice(0, 17)}…`;
}

function trimSingleLine(value: string, maxLength = 46): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function formatRelativeAge(ms: number): string {
  const seconds = Math.max(1, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getThreadDisplayName(thread: UnifiedRuntimeThread): string {
  if (thread.source === 'gateway') {
    return `Agent ${thread.agentId || normalizeAgentIdFromSessionKey(thread.sessionKey)}`;
  }
  return `CLI ${thread.sessionId?.trim() || 'current'}`;
}

function buildRecentThreadActionLabel(thread: UnifiedRuntimeThread | null): string {
  if (!thread) return '打开最近活跃会话';
  const target = trimSingleLine(getThreadDisplayName(thread), 20);
  return `打开最近活跃会话 · ${target}`;
}

function buildThreadMenuLabel(thread: UnifiedRuntimeThread, now = Date.now()): string {
  const detail = thread.detail || summarizeSessionKey(thread.sessionKey);
  const name = getThreadDisplayName(thread);
  const age = formatRelativeAge(now - thread.updatedAt);
  return `  ${trimSingleLine(`${name} · ${detail} · ${age}`, 62)}`;
}

function clampPressure(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pressureColor(pressure: number): string {
  if (pressure >= 70) return '#ff4d4f';
  if (pressure >= 40) return '#f5c344';
  return '#2f87ff';
}

function ringIconFor(pressure: number, isError: boolean): NativeImage {
  const normalized = clampPressure(pressure);
  const key = isError ? 'err' : `p:${normalized}`;
  const cached = trayIconCache.get(key);
  if (cached && !cached.isEmpty()) {
    return cached;
  }

  const size = TRAY_ICON_SIZE;
  const center = size / 2;
  const radius = center - TRAY_RING_STROKE;
  const circumference = 2 * Math.PI * radius;
  const progress = isError ? 100 : normalized;
  const dash = (progress / 100) * circumference;
  const gap = Math.max(0, circumference - dash);
  const trackColor = isError ? 'rgba(255,77,79,0.28)' : 'rgba(151,166,191,0.28)';
  const activeColor = isError ? '#ff4d4f' : pressureColor(normalized);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${trackColor}" stroke-width="${TRAY_RING_STROKE}" />
  <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${activeColor}" stroke-width="${TRAY_RING_STROKE}" stroke-linecap="round" stroke-dasharray="${dash} ${gap}" transform="rotate(-90 ${center} ${center})" />
</svg>`;
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`).resize({ height: TRAY_ICON_SIZE });
  icon.setTemplateImage(false);
  trayIconCache.set(key, icon);
  return icon;
}

function formatTrayTitle(pressure: number, isError: boolean): { title: string; options: TitleOptions } {
  if (isError) {
    return { title: ' ERR', options: { fontType: 'monospaced' } };
  }
  return { title: `${clampPressure(pressure)}%`.padStart(4, ' '), options: { fontType: 'monospacedDigit' } };
}

function computeTargetPressure(now = Date.now()): number {
  return getUnifiedSessionPressure(now);
}

function applyTrayMetricVisual(pressure: number, isError: boolean): void {
  if (!tray || process.platform !== 'darwin') return;
  const icon = ringIconFor(pressure, isError);
  const { title, options } = formatTrayTitle(pressure, isError);
  const key = `${isError ? 'err' : 'ok'}:${title}`;
  if (key === trayLastVisualKey) return;
  tray.setImage(icon);
  tray.setPressedImage(icon);
  tray.setTitle(title, options);
  trayLastVisualKey = key;
}

function stopTrayMetricAnimation(): void {
  if (!trayMetricAnimationTimer) return;
  clearInterval(trayMetricAnimationTimer);
  trayMetricAnimationTimer = null;
}

function tickTrayMetricAnimation(): void {
  if (trayMetricIsError) {
    trayMetricRendered = 0;
    stopTrayMetricAnimation();
    applyTrayMetricVisual(0, true);
    return;
  }
  const elapsed = Date.now() - trayMetricAnimationStartMs;
  const progress = Math.max(0, Math.min(1, elapsed / TRAY_METRIC_ANIMATION_MS));
  const next = clampPressure(trayMetricAnimationFrom + (trayMetricTarget - trayMetricAnimationFrom) * progress);
  trayMetricRendered = next;
  applyTrayMetricVisual(next, false);
  if (progress >= 1 || next === trayMetricTarget) {
    trayMetricRendered = trayMetricTarget;
    stopTrayMetricAnimation();
    applyTrayMetricVisual(trayMetricTarget, false);
  }
}

function refreshTrayMetrics(now = Date.now()): void {
  if (!tray || process.platform !== 'darwin') return;
  const isError = getUnifiedSessionGatewayState() === 'error';
  trayMetricIsError = isError;
  if (isError) {
    trayMetricTarget = 0;
    trayMetricRendered = 0;
    stopTrayMetricAnimation();
    applyTrayMetricVisual(0, true);
    return;
  }

  const nextTarget = computeTargetPressure(now);
  if (nextTarget === trayMetricTarget && !trayMetricAnimationTimer) {
    applyTrayMetricVisual(trayMetricRendered, false);
    return;
  }

  trayMetricAnimationFrom = trayMetricRendered;
  trayMetricTarget = nextTarget;
  trayMetricAnimationStartMs = Date.now();
  stopTrayMetricAnimation();
  trayMetricAnimationTimer = setInterval(tickTrayMetricAnimation, TRAY_METRIC_ANIMATION_TICK_MS);
  tickTrayMetricAnimation();
}

function ensureTrayMetricRefreshLoop(): void {
  if (!tray || process.platform !== 'darwin') return;
  if (trayMetricRefreshTimer) return;
  trayMetricRefreshTimer = setInterval(() => {
    refreshTrayMetrics(Date.now());
  }, TRAY_METRIC_REFRESH_MS);
}

function stopTrayMetricRefreshLoop(): void {
  if (trayMetricRefreshTimer) {
    clearInterval(trayMetricRefreshTimer);
    trayMetricRefreshTimer = null;
  }
  stopTrayMetricAnimation();
}

function getTrayRuntimeWindowRoute():
  | { type: 'url'; value: string }
  | { type: 'file'; value: string; hash: string } {
  if (process.env.VITE_DEV_SERVER_URL) {
    return {
      type: 'url',
      value: `${process.env.VITE_DEV_SERVER_URL}#/tray-runtime`,
    };
  }
  return {
    type: 'file',
    value: join(__dirname, '../../dist/index.html'),
    hash: '/tray-runtime',
  };
}

function computeTrayRuntimeWindowPosition(bounds?: Rectangle): { x: number; y: number } {
  const fallbackDisplay = screen.getPrimaryDisplay();
  const referenceBounds = bounds ?? lastTrayBounds ?? {
    x: fallbackDisplay.workArea.x + fallbackDisplay.workArea.width - 28,
    y: fallbackDisplay.workArea.y,
    width: 20,
    height: 20,
  };

  const display = screen.getDisplayNearestPoint({
    x: Math.round(referenceBounds.x + referenceBounds.width / 2),
    y: Math.round(referenceBounds.y + referenceBounds.height / 2),
  });
  const workArea = display.workArea;

  let x = Math.round(referenceBounds.x + referenceBounds.width / 2 - TRAY_PANEL_WIDTH / 2);
  x = Math.max(workArea.x + 8, Math.min(x, workArea.x + workArea.width - TRAY_PANEL_WIDTH - 8));

  let y = Math.round(referenceBounds.y + referenceBounds.height + TRAY_PANEL_GAP);
  if (y + TRAY_PANEL_HEIGHT > workArea.y + workArea.height - 8) {
    y = Math.round(referenceBounds.y - TRAY_PANEL_HEIGHT - TRAY_PANEL_GAP);
  }
  y = Math.max(workArea.y + 8, Math.min(y, workArea.y + workArea.height - TRAY_PANEL_HEIGHT - 8));

  return { x, y };
}

function notifyTrayRuntimeWindow(): void {
  if (!trayRuntimeWindow || trayRuntimeWindow.isDestroyed()) return;
  trayRuntimeWindow.webContents.send('tray-runtime:state', getTrayRuntimeSnapshot());
}

function isLikelyTerminalBundle(bundleId: string): boolean {
  const normalized = bundleId.trim();
  if (!normalized) return false;
  if (TERMINAL_BUNDLE_IDS.has(normalized)) return true;
  const lowered = normalized.toLowerCase();
  return lowered.includes('terminal')
    || lowered.includes('iterm')
    || lowered.includes('warp')
    || lowered.includes('ghostty');
}

function getFrontmostAppBundleIdSync(): string | null {
  if (process.platform !== 'darwin') return null;
  try {
    const output = execFileSync('/usr/bin/osascript', ['-e', FRONTMOST_APP_SCRIPT], {
      encoding: 'utf8',
      timeout: 300,
      maxBuffer: 8 * 1024,
    });
    const normalized = String(output || '').trim();
    return normalized || null;
  } catch {
    return null;
  }
}

function shouldSuppressProgrammaticAttentionOpen(now = Date.now()): boolean {
  if (process.platform !== 'darwin') return true;
  if (isTrayRecentUserInteraction(TRAY_RECENT_MANUAL_GUARD_MS, now)) return true;

  const anyAppWindowFocused = BrowserWindow.getAllWindows()
    .some((win) => !win.isDestroyed() && win.isFocused());
  if (anyAppWindowFocused) return true;

  const frontmostBundleId = getFrontmostAppBundleIdSync();
  if (frontmostBundleId && isLikelyTerminalBundle(frontmostBundleId)) return true;

  return false;
}

function refreshTrayAttentionBaseline(now = Date.now()): void {
  const activeThreads = getUnifiedSessionActiveThreads(now);
  trayLastAttentionActiveThreadIds = new Set(activeThreads.map((thread) => thread.id));
  trayLastAttentionGatewayState = getUnifiedSessionGatewayState();
}

function maybeOpenTrayAttentionMenu(now = Date.now()): void {
  if (process.platform !== 'darwin' || !tray || !trayContextMenu) return;

  const gatewayState = getUnifiedSessionGatewayState();
  const activeThreads = getUnifiedSessionActiveThreads(now);
  const activeThreadIds = new Set(activeThreads.map((thread) => thread.id));

  const gatewayBecameError = trayLastAttentionGatewayState !== 'error' && gatewayState === 'error';
  const becameNonEmpty = trayLastAttentionActiveThreadIds.size === 0 && activeThreadIds.size > 0;

  trayLastAttentionGatewayState = gatewayState;
  trayLastAttentionActiveThreadIds = activeThreadIds;

  if (!gatewayBecameError && !becameNonEmpty) return;
  if (now < trayAutoAttentionCooldownUntil) return;
  if (shouldSuppressProgrammaticAttentionOpen(now)) return;

  trayAutoAttentionCooldownUntil = now + TRAY_AUTO_ATTENTION_COOLDOWN_MS;
  popTrayContextMenu('programmatic');
}

function closeTrayContextMenuWithState(reason: TrayInteractionReason = 'programmatic'): void {
  if (!tray) return;
  tray.closeContextMenu();
  markTrayClosed(reason, Date.now());
}

function popTrayContextMenu(reason: TrayInteractionReason): void {
  if (!tray || !trayContextMenu) return;
  const decision = requestTrayMenuOpen(reason, Date.now());
  if (!decision.allow) return;

  if (decision.closePanelFirst) {
    hideTrayRuntimePanel('programmatic');
  }
  if (decision.closeMenuFirst) {
    closeTrayContextMenuWithState('programmatic');
  }
  refreshTrayMenu();
  tray.popUpContextMenu(trayContextMenu);
  markTrayMenuOpened(reason, Date.now());
}

async function ensureTrayRuntimeWindow(): Promise<BrowserWindow> {
  if (trayRuntimeWindow && !trayRuntimeWindow.isDestroyed()) {
    return trayRuntimeWindow;
  }

  const win = new BrowserWindow({
    width: TRAY_PANEL_WIDTH,
    height: TRAY_PANEL_HEIGHT,
    useContentSize: true,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  win.excludedFromShownWindowsMenu = true;
  win.setAlwaysOnTop(true, process.platform === 'darwin' ? 'floating' : 'normal');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.on('closed', () => {
    if (trayRuntimeWindow === win) {
      trayRuntimeWindow = null;
    }
    markTrayPanelClosed('programmatic', Date.now());
  });
  win.on('blur', () => {
    if (!win.isDestroyed()) {
      hideTrayRuntimePanel('panel-blur');
    }
  });

  await loadWindowRoute(win, getTrayRuntimeWindowRoute(), {
    windowName: 'tray-runtime-window',
    maxAttempts: 10,
    initialRetryDelayMs: 150,
  });

  trayRuntimeWindow = win;
  return win;
}

function hideTrayRuntimePanel(reason: TrayInteractionReason = 'programmatic'): void {
  if (trayRuntimeWindow && !trayRuntimeWindow.isDestroyed()) {
    trayRuntimeWindow.hide();
  }
  markTrayPanelClosed(reason, Date.now());
}

export async function toggleTrayRuntimePanel(bounds?: Rectangle): Promise<void> {
  const nextBounds = bounds ?? lastTrayBounds;
  if (nextBounds) {
    lastTrayBounds = nextBounds;
  }

  const decision = requestTrayPanelToggle('panel-toggle', Date.now());
  if (decision.action === 'noop') {
    return;
  }
  if (decision.action === 'close') {
    hideTrayRuntimePanel('panel-toggle');
    return;
  }

  if (decision.closeMenuFirst) {
    closeTrayContextMenuWithState('programmatic');
  }

  const win = await ensureTrayRuntimeWindow();

  const position = computeTrayRuntimeWindowPosition(nextBounds ?? undefined);
  win.setPosition(position.x, position.y, false);
  win.show();
  win.focus();
  notifyTrayRuntimeWindow();
}

function openWindowAndNavigate(path: string): void {
  markTrayClosed('programmatic', Date.now());
  hideTrayRuntimePanel('programmatic');
  const mainWindow = trayMainWindow;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('navigate', path);
}

function openRuntimeThread(thread: UnifiedRuntimeThread): void {
  if (thread.source === 'gateway') {
    const sessionKey = thread.sessionKey?.trim();
    if (sessionKey) {
      openWindowAndNavigate(`/?sessionKey=${encodeURIComponent(sessionKey)}`);
      return;
    }
    openWindowAndNavigate('/');
    return;
  }

  const sessionId = thread.sessionId?.trim();
  if (sessionId) {
    openWindowAndNavigate(`/chat/code?sessionId=${encodeURIComponent(sessionId)}`);
    return;
  }
  openWindowAndNavigate('/chat/code');
}

function gatewayStateLabel(state: UnifiedGatewayLifecycleState): string {
  if (state === 'running') return 'Running';
  if (state === 'starting') return 'Starting';
  if (state === 'reconnecting') return 'Reconnecting';
  if (state === 'error') return 'Error';
  return 'Stopped';
}

function gatewayStateLabelZh(state: UnifiedGatewayLifecycleState): string {
  if (state === 'running') return '运行中';
  if (state === 'starting') return '启动中';
  if (state === 'reconnecting') return '重连中';
  if (state === 'error') return '异常';
  return '已停止';
}

function pressureBandLabel(pressure: number, isError: boolean): string {
  if (isError) return '异常';
  if (pressure >= 70) return '紧张';
  if (pressure >= 40) return '关注';
  return '正常';
}

function buildRuntimeThreadMenuItems(threads: UnifiedRuntimeThread[], now = Date.now()): MenuItemConstructorOptions[] {
  if (threads.length === 0) {
    return [{
      label: `  ${MONITOR_EMPTY_LABEL}`,
      enabled: false,
    }];
  }

  return threads.map((thread) => ({
    label: buildThreadMenuLabel(thread, now),
    click: () => openRuntimeThread(thread),
  }));
}

function refreshTrayMenu(): void {
  if (!tray) return;
  const mainWindow = trayMainWindow;

  const showWindow = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
  };

  const now = Date.now();
  const activeThreads = getUnifiedSessionActiveThreads(now);
  const visibleThreads = activeThreads.slice(0, MAX_VISIBLE_RUNNING_THREADS);
  const recentThread = getUnifiedSessionMostRecentActiveThread(now);
  const hiddenThreadCount = Math.max(0, activeThreads.length - visibleThreads.length);
  const gatewayState = getUnifiedSessionGatewayState();
  const pressure = computeTargetPressure(now);
  const gatewayIsError = gatewayState === 'error';
  const pressureBand = pressureBandLabel(pressure, gatewayIsError);
  const recentThreadActionItems: MenuItemConstructorOptions[] = recentThread
    ? [{
        label: buildRecentThreadActionLabel(recentThread),
        click: () => {
          openRuntimeThread(recentThread);
        },
      }]
    : [];

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `会话活跃度压力值：${gatewayIsError ? 'ERR' : `${pressure}%`} · ${pressureBand}`,
      enabled: false,
    },
    {
      label: `网关状态：${gatewayStateLabelZh(gatewayState)}`,
      enabled: false,
    },
    {
      type: 'separator',
    },
    ...recentThreadActionItems,
    {
      label: '显示主窗口（MiniClaw）',
      click: showWindow,
    },
    {
      type: 'separator',
    },
    {
      label: `运行中的会话 (${activeThreads.length})`,
      enabled: false,
    },
    ...buildRuntimeThreadMenuItems(visibleThreads, now),
    ...(hiddenThreadCount > 0
      ? [
          {
            label: `${MORE_THREADS_LABEL_PREFIX}${hiddenThreadCount}条...`,
            click: showWindow,
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      type: 'separator',
    },
    {
      label: 'Quick Actions',
      submenu: [
        {
          label: 'Open Chat',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            mainWindow.show();
            mainWindow.webContents.send('navigate', '/');
          },
        },
        {
          label: 'Open Settings',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            mainWindow.show();
            mainWindow.webContents.send('navigate', '/settings');
          },
        },
        {
          label: 'Take Screenshot',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            mainWindow.show();
            mainWindow.webContents.send('navigate', '/chat');
            mainWindow.webContents.send('screenshot:capture');
          },
        },
      ],
    },
    {
      type: 'separator',
    },
    {
      label: 'Check for Updates...',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.send('update:check');
      },
    },
    {
      type: 'separator',
    },
    {
      label: '退出极智',
      click: () => {
        app.quit();
      },
    },
  ]);

  trayContextMenu = contextMenu;
  if (process.platform !== 'darwin') {
    tray.setContextMenu(contextMenu);
  }

  if (process.platform === 'darwin') {
    if (gatewayState === 'error') {
      tray.setToolTip('极智 - ERR');
    } else {
      tray.setToolTip(`极智 - ${computeTargetPressure(now)}%`);
    }
  } else {
    if (visibleThreads.length > 0) {
      tray.setToolTip(`极智 - ${activeThreads.length} 个任务运行中`);
    } else {
      tray.setToolTip(`极智 - ${gatewayStateLabel(gatewayState)}`);
    }
  }
  notifyTrayRuntimeWindow();
}

/**
 * Resolve the icons directory path (works in both dev and packaged mode)
 */
function getIconsDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources', 'icons');
  }
  return join(__dirname, '../../resources/icons');
}

/**
 * Create system tray icon and menu
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  trayMainWindow = mainWindow;
  resetTrayInteractionState();
  const icon = process.platform === 'darwin' ? ringIconFor(0, false) : (() => {
    const iconsDir = getIconsDir();
    const iconCandidates =
      process.platform === 'win32'
        ? ['icon.ico', 'icon.png']
        : ['32x32.png', 'icon.png'];

    let resolved = nativeImage.createFromPath('');
    for (const candidate of iconCandidates) {
      resolved = nativeImage.createFromPath(join(iconsDir, candidate));
      if (!resolved.isEmpty()) {
        break;
      }
    }
    return resolved;
  })();
  
  tray = new Tray(icon);
  
  // Set tooltip
  tray.setToolTip('极智 - AI 助手');
  if (process.platform === 'darwin') {
    tray.setIgnoreDoubleClickEvents(true);
    tray.setTitle('  0%', { fontType: 'monospacedDigit' });
  }
  if (!unsubscribeSessionState) {
    unsubscribeSessionState = subscribeUnifiedSessionState(() => {
      refreshTrayMenu();
      refreshTrayMetrics(Date.now());
      maybeOpenTrayAttentionMenu(Date.now());
    });
  }
  refreshTrayAttentionBaseline(Date.now());
  refreshTrayMenu();
  ensureTrayMetricRefreshLoop();
  refreshTrayMetrics(Date.now());
  
  // Click to show menu on macOS, toggle main window on Windows/Linux.
  tray.on('click', (_event, bounds) => {
    if (bounds) {
      lastTrayBounds = bounds;
    }
    if (process.platform === 'darwin') {
      popTrayContextMenu('left-click');
      return;
    }
    if (mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  // Double-click to show window (Windows)
  tray.on('double-click', () => {
    if (mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
  });

  tray.on('right-click', (_event, bounds) => {
    if (bounds) {
      lastTrayBounds = bounds;
    }
    if (process.platform === 'darwin') {
      popTrayContextMenu('right-click');
      return;
    }
    hideTrayRuntimePanel('programmatic');
  });
  
  return tray;
}

/**
 * Update tray tooltip with Gateway status
 */
export function updateTrayStatus(status: string): void {
  if (tray) {
    if (process.platform === 'darwin') {
      refreshTrayMenu();
      return;
    }
    tray.setToolTip(`极智 - ${status}`);
  }
}

export function getTrayRuntimeSnapshot(): TrayRuntimeSnapshot {
  return getUnifiedSessionRuntimeSnapshot(Date.now());
}

export function openTrayRuntimeThread(threadId: string): boolean {
  const thread = getUnifiedSessionRuntimeThreadById(threadId);
  if (!thread) return false;
  openRuntimeThread(thread);
  hideTrayRuntimePanel();
  return true;
}

/**
 * Destroy tray icon
 */
export function destroyTray(): void {
  stopTrayMetricRefreshLoop();
  if (unsubscribeSessionState) {
    unsubscribeSessionState();
    unsubscribeSessionState = null;
  }
  if (trayRuntimeWindow && !trayRuntimeWindow.isDestroyed()) {
    trayRuntimeWindow.destroy();
  }
  trayRuntimeWindow = null;
  lastTrayBounds = null;
  trayContextMenu = null;
  trayMetricTarget = 0;
  trayMetricRendered = 0;
  trayMetricAnimationFrom = 0;
  trayMetricAnimationStartMs = 0;
  trayMetricIsError = false;
  trayLastVisualKey = '';
  trayAutoAttentionCooldownUntil = 0;
  trayLastAttentionGatewayState = 'stopped';
  trayLastAttentionActiveThreadIds = new Set<string>();
  trayIconCache.clear();
  resetTrayInteractionState();
  resetUnifiedSessionState();
  trayMainWindow = null;
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
