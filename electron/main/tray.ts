/**
 * System Tray Management
 * Creates and manages the system tray icon and menu
 */
import { Tray, Menu, BrowserWindow, app, nativeImage, screen } from 'electron';
import type { MenuItemConstructorOptions, Rectangle } from 'electron';
import { join } from 'path';
import type { CodeAgentRunRecord } from '../../shared/code-agent';
import { loadWindowRoute } from './window-loader';

let tray: Tray | null = null;
let trayMainWindow: BrowserWindow | null = null;
let trayRuntimeWindow: BrowserWindow | null = null;
let gatewayLifecycleState: 'stopped' | 'starting' | 'running' | 'error' | 'reconnecting' = 'stopped';
let lastTrayBounds: Rectangle | null = null;

type RuntimeThreadSource = 'gateway' | 'code';

type RuntimeThread = {
  id: string;
  source: RuntimeThreadSource;
  runId?: string;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
  detail: string;
  startedAt: number;
  updatedAt: number;
};

export type TrayRuntimeThreadSnapshot = {
  id: string;
  source: RuntimeThreadSource;
  runId?: string;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
  detail: string;
  startedAt: number;
  updatedAt: number;
  stale: boolean;
};

export type TrayRuntimeSnapshot = {
  gatewayState: 'stopped' | 'starting' | 'running' | 'error' | 'reconnecting';
  activeCount: number;
  threads: TrayRuntimeThreadSnapshot[];
  updatedAt: number;
};

const runtimeThreads = new Map<string, RuntimeThread>();
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;
const MAX_VISIBLE_RUNNING_THREADS = 2;
const RUN_STALE_AFTER_MS = 90_000;
const RUN_REMOVE_AFTER_MS = 180_000;
const SPINNER_INTERVAL_MS = 800;
const TRAY_PANEL_WIDTH = 372;
const TRAY_PANEL_HEIGHT = 560;
const TRAY_PANEL_GAP = 8;

let spinnerFrame = 0;
let spinnerTimer: NodeJS.Timeout | null = null;

function normalizeAgentIdFromSessionKey(sessionKey?: string): string {
  const raw = typeof sessionKey === 'string' ? sessionKey.trim() : '';
  if (!raw.startsWith('agent:')) return 'main';
  const [, agentId] = raw.split(':');
  return agentId?.trim() || 'main';
}

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

function extractToolLineFromMessage(message: Record<string, unknown>): string {
  const content = message.content;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const item = block as Record<string, unknown>;
      if (item.type === 'tool_use' || item.type === 'toolCall') {
        const toolName = String(item.name ?? item.function ?? '').trim();
        const input = item.input && typeof item.input === 'object'
          ? item.input as Record<string, unknown>
          : {};
        const command = input.command ?? input.cmd ?? input.script ?? input.code;
        if (typeof command === 'string' && command.trim()) {
          return trimSingleLine(`${toolName || 'tool'} ${command.split('\n')[0]}`, 48);
        }
        const pathLike = input.path ?? input.file_path ?? input.filepath;
        if (typeof pathLike === 'string' && pathLike.trim()) {
          const compactPath = pathLike.split(/[\\/]/).slice(-2).join('/');
          return trimSingleLine(`${toolName || 'tool'} ${compactPath}`, 48);
        }
        if (toolName) return trimSingleLine(toolName, 48);
      }
    }

    for (let index = content.length - 1; index >= 0; index -= 1) {
      const block = content[index];
      if (!block || typeof block !== 'object') continue;
      const item = block as Record<string, unknown>;
      if (item.type === 'text' && typeof item.text === 'string' && item.text.trim()) {
        const lastLine = item.text.trim().split('\n').filter(Boolean).pop();
        if (lastLine) return trimSingleLine(lastLine, 48);
      }
    }
  }

  if (typeof content === 'string' && content.trim()) {
    const lastLine = content.trim().split('\n').filter(Boolean).pop();
    if (lastLine) return trimSingleLine(lastLine, 48);
  }

  const toolCalls = (message.tool_calls ?? message.toolCalls) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const firstCall = toolCalls[0] as Record<string, unknown>;
    const fn = firstCall.function as Record<string, unknown> | undefined;
    const toolName = String(fn?.name ?? firstCall.name ?? '').trim();
    if (toolName) return trimSingleLine(toolName, 48);
  }

  return '';
}

function summarizeGatewayDetail(message: unknown): string {
  if (!message || typeof message !== 'object') return '等待响应';
  const line = extractToolLineFromMessage(message as Record<string, unknown>);
  return line || '处理中';
}

function summarizeCodePrompt(prompt: unknown): string {
  if (typeof prompt !== 'string' || !prompt.trim()) return '处理中';
  return trimSingleLine(prompt.split('\n').filter(Boolean)[0] || prompt, 48);
}

function withSpinnerPrefix(isPrimary: boolean): string {
  if (isPrimary) {
    return SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length] || '•';
  }
  return '•';
}

function upsertRuntimeThread(next: RuntimeThread): void {
  runtimeThreads.set(next.id, next);
  refreshTrayMenu();
}

function removeRuntimeThreadById(id: string): void {
  if (!runtimeThreads.delete(id)) return;
  refreshTrayMenu();
}

function pruneRuntimeThreads(now = Date.now()): void {
  let changed = false;
  for (const [id, thread] of runtimeThreads) {
    if (now - thread.updatedAt > RUN_REMOVE_AFTER_MS) {
      runtimeThreads.delete(id);
      changed = true;
    }
  }
  if (changed) {
    refreshTrayMenu();
  }
}

function getVisibleRuntimeThreads(now = Date.now()): RuntimeThread[] {
  pruneRuntimeThreads(now);
  return [...runtimeThreads.values()]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_VISIBLE_RUNNING_THREADS);
}

function isThreadStale(thread: RuntimeThread, now = Date.now()): boolean {
  return now - thread.updatedAt > RUN_STALE_AFTER_MS;
}

function ensureSpinnerTicking(): void {
  if (spinnerTimer) return;
  spinnerTimer = setInterval(() => {
    spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
    if (runtimeThreads.size === 0) {
      if (spinnerTimer) {
        clearInterval(spinnerTimer);
        spinnerTimer = null;
      }
      return;
    }
    refreshTrayMenu();
  }, SPINNER_INTERVAL_MS);
}

function syncSpinnerLifecycle(): void {
  if (runtimeThreads.size > 0) {
    ensureSpinnerTicking();
    return;
  }
  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    spinnerTimer = null;
  }
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

  win.setAlwaysOnTop(true, process.platform === 'darwin' ? 'floating' : 'normal');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.on('closed', () => {
    if (trayRuntimeWindow === win) {
      trayRuntimeWindow = null;
    }
  });
  win.on('blur', () => {
    if (!win.isDestroyed()) {
      win.hide();
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

function hideTrayRuntimePanel(): void {
  if (!trayRuntimeWindow || trayRuntimeWindow.isDestroyed()) return;
  trayRuntimeWindow.hide();
}

export async function toggleTrayRuntimePanel(bounds?: Rectangle): Promise<void> {
  const nextBounds = bounds ?? lastTrayBounds;
  if (nextBounds) {
    lastTrayBounds = nextBounds;
  }

  const win = await ensureTrayRuntimeWindow();
  if (win.isVisible()) {
    win.hide();
    return;
  }

  const position = computeTrayRuntimeWindowPosition(nextBounds ?? undefined);
  win.setPosition(position.x, position.y, false);
  win.show();
  win.focus();
  notifyTrayRuntimeWindow();
}

function openWindowAndNavigate(path: string): void {
  hideTrayRuntimePanel();
  const mainWindow = trayMainWindow;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('navigate', path);
}

function openRuntimeThread(thread: RuntimeThread): void {
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
    openWindowAndNavigate(`/code-agent/chat?sessionId=${encodeURIComponent(sessionId)}`);
    return;
  }
  openWindowAndNavigate('/code-agent/chat');
}

function gatewayStateLabel(state: typeof gatewayLifecycleState): string {
  if (state === 'running') return 'Running';
  if (state === 'starting') return 'Starting';
  if (state === 'reconnecting') return 'Reconnecting';
  if (state === 'error') return 'Error';
  return 'Stopped';
}

function buildRuntimeThreadMenuItems(): MenuItemConstructorOptions[] {
  const now = Date.now();
  const visible = getVisibleRuntimeThreads(now);
  if (visible.length === 0) {
    return [{
      label: '  No running threads',
      enabled: false,
    }];
  }

  return visible.map((thread, index) => {
    const sourceLabel = thread.source === 'gateway' ? 'Agent' : 'CLI';
    const agentLabel = thread.source === 'gateway'
      ? (thread.agentId || normalizeAgentIdFromSessionKey(thread.sessionKey))
      : (thread.sessionId?.trim() || 'current');
    const detail = thread.detail || summarizeSessionKey(thread.sessionKey);
    const staleSuffix = isThreadStale(thread, now) ? ' · stale' : '';
    return {
      label: `  ${withSpinnerPrefix(index === 0)} ${sourceLabel} · ${agentLabel} · ${detail}${staleSuffix}`,
      click: () => openRuntimeThread(thread),
    };
  });
}

function refreshTrayMenu(): void {
  syncSpinnerLifecycle();
  if (!tray) return;
  const mainWindow = trayMainWindow;

  const showWindow = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
  };

  const visibleThreads = getVisibleRuntimeThreads();
  const activeCount = runtimeThreads.size;
  const spinner = SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length] || '•';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示极智',
      click: showWindow,
    },
    {
      type: 'separator',
    },
    {
      label: 'Gateway Status',
      enabled: false,
    },
    {
      label: `  ${gatewayStateLabel(gatewayLifecycleState)}`,
      type: 'checkbox',
      checked: gatewayLifecycleState === 'running',
      enabled: false,
    },
    {
      type: 'separator',
    },
    {
      label: activeCount > 0
        ? `${spinner} Active Threads (${activeCount})`
        : 'Active Threads',
      enabled: false,
    },
    ...buildRuntimeThreadMenuItems(),
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

  tray.setContextMenu(contextMenu);

  if (visibleThreads.length > 0) {
    tray.setToolTip(`极智 - ${activeCount} 个任务运行中`);
  } else {
    tray.setToolTip(`极智 - ${gatewayStateLabel(gatewayLifecycleState)}`);
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
  const iconsDir = getIconsDir();
  const iconCandidates =
    process.platform === 'win32'
      ? ['icon.ico', 'icon.png']
      : process.platform === 'darwin'
        ? ['tray-icon.png', 'icon.png', '32x32.png']
        : ['32x32.png', 'icon.png'];

  let icon = nativeImage.createFromPath('');
  for (const candidate of iconCandidates) {
    icon = nativeImage.createFromPath(join(iconsDir, candidate));
    if (!icon.isEmpty()) {
      break;
    }
  }

  if (process.platform === 'darwin' && !icon.isEmpty()) {
    // We want a colorful menu bar icon, not a monochrome template icon.
    icon = icon.resize({ height: 18 });
    icon.setTemplateImage(false);
  }
  
  tray = new Tray(icon);
  
  // Set tooltip
  tray.setToolTip('极智 - AI 助手');
  refreshTrayMenu();
  
  // Click to show window (Windows/Linux)
  tray.on('click', (_event, bounds) => {
    if (bounds) {
      lastTrayBounds = bounds;
    }
    if (process.platform === 'darwin') {
      void toggleTrayRuntimePanel(bounds);
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

  tray.on('right-click', () => {
    hideTrayRuntimePanel();
  });
  
  return tray;
}

/**
 * Update tray tooltip with Gateway status
 */
export function updateTrayStatus(status: string): void {
  if (tray) {
    tray.setToolTip(`极智 - ${status}`);
  }
}

export function updateTrayGatewayState(state: string | undefined): void {
  if (state === 'running' || state === 'starting' || state === 'reconnecting' || state === 'error' || state === 'stopped') {
    gatewayLifecycleState = state;
  } else {
    gatewayLifecycleState = 'stopped';
  }
  if (gatewayLifecycleState === 'stopped') {
    for (const [id, thread] of runtimeThreads) {
      if (thread.source === 'gateway') {
        runtimeThreads.delete(id);
      }
    }
  }
  refreshTrayMenu();
}

function resolveGatewayThreadId(runId?: string, sessionKey?: string): string | null {
  const normalizedRunId = typeof runId === 'string' ? runId.trim() : '';
  if (normalizedRunId) return `gateway:${normalizedRunId}`;
  const normalizedSessionKey = typeof sessionKey === 'string' ? sessionKey.trim() : '';
  if (normalizedSessionKey) return `gateway:${normalizedSessionKey}`;
  return null;
}

export function recordTrayGatewayStarted(payload: {
  runId?: string;
  sessionKey?: string;
  message?: unknown;
  startedAt?: unknown;
}): void {
  const threadId = resolveGatewayThreadId(payload.runId, payload.sessionKey);
  if (!threadId) return;
  const now = Date.now();
  const startedAt = typeof payload.startedAt === 'number' && Number.isFinite(payload.startedAt)
    ? payload.startedAt
    : now;
  const sessionKey = payload.sessionKey?.trim();
  upsertRuntimeThread({
    id: threadId,
    source: 'gateway',
    runId: payload.runId?.trim() || undefined,
    sessionKey,
    agentId: normalizeAgentIdFromSessionKey(sessionKey),
    detail: summarizeGatewayDetail(payload.message),
    startedAt,
    updatedAt: now,
  });
}

export function recordTrayGatewayProgress(payload: {
  runId?: string;
  sessionKey?: string;
  message?: unknown;
}): void {
  const threadId = resolveGatewayThreadId(payload.runId, payload.sessionKey);
  if (!threadId) return;
  const existing = runtimeThreads.get(threadId);
  const now = Date.now();
  const sessionKey = payload.sessionKey?.trim() || existing?.sessionKey;
  upsertRuntimeThread({
    id: threadId,
    source: 'gateway',
    runId: payload.runId?.trim() || existing?.runId,
    sessionKey,
    agentId: existing?.agentId || normalizeAgentIdFromSessionKey(sessionKey),
    detail: summarizeGatewayDetail(payload.message) || existing?.detail || '处理中',
    startedAt: existing?.startedAt || now,
    updatedAt: now,
  });
}

export function recordTrayGatewayCompleted(payload: {
  runId?: string;
  sessionKey?: string;
}): void {
  const threadId = resolveGatewayThreadId(payload.runId, payload.sessionKey);
  if (!threadId) return;
  removeRuntimeThreadById(threadId);
}

const CODE_THREAD_ID = 'code-agent:active';

export function recordTrayCodeRunStarted(payload: CodeAgentRunRecord | null | undefined): void {
  const now = Date.now();
  const sessionId = payload?.request?.sessionId?.trim() || undefined;
  upsertRuntimeThread({
    id: CODE_THREAD_ID,
    source: 'code',
    sessionId,
    detail: summarizeCodePrompt(payload?.request?.prompt),
    startedAt: payload?.startedAt && Number.isFinite(payload.startedAt) ? payload.startedAt : now,
    updatedAt: now,
  });
}

export function recordTrayCodeActivity(payload: { toolName?: string; inputSummary?: string } | null | undefined): void {
  const existing = runtimeThreads.get(CODE_THREAD_ID);
  if (!existing) return;
  const tool = typeof payload?.toolName === 'string' ? payload.toolName.trim() : '';
  const summary = typeof payload?.inputSummary === 'string' ? payload.inputSummary.trim() : '';
  const nextDetail = trimSingleLine([tool, summary].filter(Boolean).join(' '), 48) || existing.detail;
  upsertRuntimeThread({
    ...existing,
    detail: nextDetail,
    updatedAt: Date.now(),
  });
}

export function recordTrayCodeRunFinished(): void {
  removeRuntimeThreadById(CODE_THREAD_ID);
}

export function getTrayRuntimeSnapshot(): TrayRuntimeSnapshot {
  const now = Date.now();
  pruneRuntimeThreads(now);
  const threads = [...runtimeThreads.values()]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map((thread) => ({
      ...thread,
      stale: isThreadStale(thread, now),
    }));

  return {
    gatewayState: gatewayLifecycleState,
    activeCount: threads.length,
    threads,
    updatedAt: now,
  };
}

export function openTrayRuntimeThread(threadId: string): boolean {
  const normalized = threadId.trim();
  if (!normalized) return false;
  const thread = runtimeThreads.get(normalized);
  if (!thread) return false;
  openRuntimeThread(thread);
  hideTrayRuntimePanel();
  return true;
}

/**
 * Destroy tray icon
 */
export function destroyTray(): void {
  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    spinnerTimer = null;
  }
  if (trayRuntimeWindow && !trayRuntimeWindow.isDestroyed()) {
    trayRuntimeWindow.destroy();
  }
  trayRuntimeWindow = null;
  lastTrayBounds = null;
  runtimeThreads.clear();
  trayMainWindow = null;
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
