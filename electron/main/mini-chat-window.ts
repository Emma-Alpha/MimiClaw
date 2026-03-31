import { app, BrowserWindow, screen } from 'electron';
import { join } from 'node:path';
import { getPetWindow } from './pet-window';

let miniChatWindow: BrowserWindow | null = null;

const MINI_CHAT_WIDTH = 360;
const MINI_CHAT_HEIGHT = 520;

function getMiniChatWindowUrl():
  | { type: 'url'; value: string }
  | { type: 'file'; value: string; hash: string } {
  if (process.env.VITE_DEV_SERVER_URL) {
    return {
      type: 'url',
      value: `${process.env.VITE_DEV_SERVER_URL}#/mini-chat`,
    };
  }
  return {
    type: 'file',
    value: join(__dirname, '../../dist/index.html'),
    hash: '/mini-chat',
  };
}

function computeMiniChatPosition(): { x: number; y: number } {
  const petWin = getPetWindow();
  let refBounds = { x: 0, y: 0, width: 320, height: 280 };

  if (petWin && !petWin.isDestroyed()) {
    refBounds = petWin.getBounds();
  }

  const display = screen.getDisplayNearestPoint({
    x: refBounds.x + refBounds.width / 2,
    y: refBounds.y + refBounds.height / 2,
  });
  const workArea = display.workArea;

  // Center horizontally over the pet, position above it
  let x = refBounds.x + Math.round((refBounds.width - MINI_CHAT_WIDTH) / 2);
  let y = refBounds.y - MINI_CHAT_HEIGHT - 12;

  // Clamp to screen work area
  x = Math.max(workArea.x + 8, Math.min(x, workArea.x + workArea.width - MINI_CHAT_WIDTH - 8));
  y = Math.max(workArea.y + 8, Math.min(y, workArea.y + workArea.height - MINI_CHAT_HEIGHT - 8));

  return { x, y };
}

async function createMiniChatWindow(): Promise<BrowserWindow> {
  const pos = computeMiniChatPosition();

  const win = new BrowserWindow({
    width: MINI_CHAT_WIDTH,
    height: MINI_CHAT_HEIGHT,
    x: pos.x,
    y: pos.y,
    useContentSize: true,
    frame: false,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
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

  win.setAlwaysOnTop(
    true,
    process.platform === 'darwin' ? 'screen-saver' : 'floating',
  );
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) {
      win.show();
      win.focus();
    }
  });

  win.on('closed', () => {
    if (miniChatWindow === win) {
      miniChatWindow = null;
    }
  });

  const route = getMiniChatWindowUrl();
  if (route.type === 'url') {
    await win.loadURL(route.value);
  } else {
    await win.loadFile(route.value, { hash: route.hash });
  }

  miniChatWindow = win;
  return win;
}

export async function toggleMiniChatWindow(): Promise<void> {
  if (miniChatWindow && !miniChatWindow.isDestroyed()) {
    miniChatWindow.close();
    return;
  }
  await createMiniChatWindow();
}

export function closeMiniChatWindow(): void {
  if (miniChatWindow && !miniChatWindow.isDestroyed()) {
    miniChatWindow.close();
  }
}

export function getMiniChatWindow(): BrowserWindow | null {
  if (miniChatWindow?.isDestroyed()) {
    miniChatWindow = null;
  }
  return miniChatWindow;
}

app.on('before-quit', () => {
  closeMiniChatWindow();
});
