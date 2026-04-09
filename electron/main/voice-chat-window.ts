import { app, BrowserWindow, screen } from 'electron';
import { join } from 'node:path';
import {
  type VoiceDialogWindowState,
  type VoiceChatWindowBounds,
} from '../../shared/voice-chat';
import { PET_WINDOW_WIDTH } from './pet-layout';
import { getPetWindow } from './pet-window';
import {
  getVoiceChatWindowBounds,
  saveVoiceChatWindowBounds,
} from '../services/voice-chat-store';
import { loadWindowRoute } from './window-loader';

let voiceChatWindow: BrowserWindow | null = null;
let voiceDialogState: VoiceDialogWindowState = 'idle';
let isCreatingVoiceChatWindow = false;

const VOICE_CHAT_WINDOW_WIDTH = 300;
const VOICE_CHAT_WINDOW_HEIGHT = 540;

function getVoiceChatWindowUrl():
  | { type: 'url'; value: string }
  | { type: 'file'; value: string; hash: string } {
  if (process.env.VITE_DEV_SERVER_URL) {
    return {
      type: 'url',
      value: `${process.env.VITE_DEV_SERVER_URL}#/voice-dialog`,
    };
  }

  return {
    type: 'file',
    value: join(__dirname, '../../dist/index.html'),
    hash: '/voice-dialog',
  };
}

async function computeVoiceChatPosition(): Promise<VoiceChatWindowBounds> {
  const savedBounds = await getVoiceChatWindowBounds();
  if (savedBounds) {
    return {
      ...savedBounds,
      width: VOICE_CHAT_WINDOW_WIDTH,
      height: VOICE_CHAT_WINDOW_HEIGHT,
    };
  }

  const petWindow = getPetWindow();
  const petBounds = petWindow && !petWindow.isDestroyed()
    ? petWindow.getBounds()
    : { x: 80, y: 120, width: PET_WINDOW_WIDTH, height: 220 };
  const display = screen.getDisplayNearestPoint({
    x: petBounds.x + petBounds.width / 2,
    y: petBounds.y + petBounds.height / 2,
  });
  const workArea = display.workArea;
  const gap = 12;
  const leftX = petBounds.x - VOICE_CHAT_WINDOW_WIDTH - gap;
  const rightX = petBounds.x + petBounds.width + gap;

  let x = leftX >= workArea.x + gap
    ? leftX
    : Math.min(rightX, workArea.x + workArea.width - VOICE_CHAT_WINDOW_WIDTH - gap);
  let y = Math.max(
    workArea.y + gap,
    Math.min(petBounds.y + petBounds.height - VOICE_CHAT_WINDOW_HEIGHT, workArea.y + workArea.height - VOICE_CHAT_WINDOW_HEIGHT - gap),
  );

  x = Math.max(workArea.x + gap, x);
  y = Math.max(workArea.y + gap, y);

  return {
    x,
    y,
    width: VOICE_CHAT_WINDOW_WIDTH,
    height: VOICE_CHAT_WINDOW_HEIGHT,
  };
}

async function createVoiceChatWindow(): Promise<BrowserWindow> {
  const bounds = await computeVoiceChatPosition();
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    useContentSize: true,
    frame: false,
    transparent: false,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundColor: '#0B1017',
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

  win.on('move', () => {
    const current = win.getBounds();
    void saveVoiceChatWindowBounds({
      x: current.x,
      y: current.y,
      width: current.width,
      height: current.height,
    });
  });

  win.on('resize', () => {
    const current = win.getBounds();
    void saveVoiceChatWindowBounds({
      x: current.x,
      y: current.y,
      width: current.width,
      height: current.height,
    });
  });

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) {
      win.show();
      win.focus();
    }
  });

  win.on('closed', () => {
    if (voiceChatWindow === win) {
      voiceChatWindow = null;
      voiceDialogState = 'idle';
    }
  });

  const route = getVoiceChatWindowUrl();
  await loadWindowRoute(win, route, { windowName: 'voice-chat-window' });

  voiceChatWindow = win;
  return win;
}

export function getVoiceChatWindow(): BrowserWindow | null {
  if (voiceChatWindow?.isDestroyed()) {
    voiceChatWindow = null;
    voiceDialogState = 'idle';
  }
  return voiceChatWindow;
}

export function getVoiceDialogState(): VoiceDialogWindowState {
  return voiceDialogState;
}

export function setVoiceDialogState(state: VoiceDialogWindowState): void {
  voiceDialogState = state;
}

export async function openVoiceChatWindow(): Promise<BrowserWindow> {
  const existing = getVoiceChatWindow();
  if (existing && !existing.isDestroyed()) {
    if (voiceDialogState === 'connected') {
      existing.show();
      existing.focus();
      return existing;
    }

    existing.close();
  }

  if (isCreatingVoiceChatWindow) {
    throw new Error('Voice Chat window is already being created');
  }

  isCreatingVoiceChatWindow = true;
  try {
    return await createVoiceChatWindow();
  } finally {
    isCreatingVoiceChatWindow = false;
  }
}

export function closeVoiceChatWindow(): void {
  const existing = getVoiceChatWindow();
  if (existing && !existing.isDestroyed()) {
    existing.close();
  }
}

app.on('before-quit', () => {
  closeVoiceChatWindow();
});
