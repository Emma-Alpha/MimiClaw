import { BrowserWindow } from 'electron';
import { basename } from 'node:path';
import { stat } from 'node:fs/promises';
import type { PetCodeChatSeed, PetCodeChatSeedAttachment } from '../../shared/pet';

let pendingInitialPayload: PetCodeChatSeed | null = null;

const MAIN_WINDOW_BLOCKLIST_ROUTES = [
  '#/pet',
  '#/pet-bubble',
  '#/pet-companion',
  '#/voice-dialog',
  '#/tray-runtime',
  '#/mini-chat',
];

function normalizeCodeChatSeed(seed: string | PetCodeChatSeed): PetCodeChatSeed {
  if (typeof seed === 'string') {
    return {
      autoSend: true,
      text: seed,
    };
  }

  return {
    attachments: seed.attachments ?? [],
    autoSend: seed.autoSend ?? true,
    persistTarget: seed.persistTarget === true,
    target: seed.target === 'code' ? 'code' : seed.target === 'chat' ? 'chat' : undefined,
    text: seed.text || '',
  };
}

function mergeAttachments(
  current: PetCodeChatSeedAttachment[] | undefined,
  incoming: PetCodeChatSeedAttachment[] | undefined,
): PetCodeChatSeedAttachment[] {
  const result = [...(current ?? [])];
  const existing = new Set(result.map((item) => item.stagedPath));

  for (const item of incoming ?? []) {
    const stagedPath = item.stagedPath?.trim();
    if (!stagedPath || existing.has(stagedPath)) continue;
    existing.add(stagedPath);
    result.push(item);
  }

  return result;
}

function queueInitialPayload(seed: PetCodeChatSeed): void {
  if (!pendingInitialPayload) {
    pendingInitialPayload = seed;
    return;
  }

  pendingInitialPayload = {
    attachments: mergeAttachments(pendingInitialPayload.attachments, seed.attachments),
    autoSend: seed.autoSend ?? pendingInitialPayload.autoSend,
    persistTarget: seed.persistTarget ?? pendingInitialPayload.persistTarget,
    target: seed.target ?? pendingInitialPayload.target,
    text: seed.text || pendingInitialPayload.text,
  };
}

function getMainWindowCandidate(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed());

  for (const win of windows) {
    const url = win.webContents.getURL();
    if (MAIN_WINDOW_BLOCKLIST_ROUTES.some((route) => url.includes(route))) {
      continue;
    }
    return win;
  }

  return null;
}

function focusMainWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

function navigateMainWindowToCodeChat(win: BrowserWindow): void {
  win.webContents.send('navigate', '/chat/code');
}

function parseDroppedFileUrl(url: string): string | null {
  if (!url.startsWith('file://')) return null;
  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    return null;
  }
}

async function createAttachmentFromPath(path: string): Promise<PetCodeChatSeedAttachment | null> {
  const normalized = path.trim();
  if (!normalized) return null;

  const info = await stat(normalized).catch(() => null);
  if (!info || info.isDirectory()) return null;

  return {
    fileName: basename(normalized) || normalized,
    fileSize: Number.isFinite(info.size) ? info.size : 0,
    id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mimeType: 'application/octet-stream',
    preview: null,
    stagedPath: normalized,
    status: 'ready',
  };
}

/**
 * Kept for compatibility with existing callers.
 * We no longer create a dedicated code-chat BrowserWindow.
 */
export function getCodeChatWindow(): BrowserWindow | null {
  return null;
}

export async function openCodeChatWithMessage(text: string): Promise<void> {
  await openCodeChatWithPayload({ autoSend: true, text });
}

export async function openCodeChatWithPayload(seed: string | PetCodeChatSeed): Promise<void> {
  const payload = normalizeCodeChatSeed(seed);
  queueInitialPayload(payload);

  const mainWindow = getMainWindowCandidate();
  if (!mainWindow) return;

  focusMainWindow(mainWindow);
  navigateMainWindowToCodeChat(mainWindow);
  mainWindow.webContents.send('quick-chat:initial-message', payload);
}

export function consumePendingInitialMessage(): PetCodeChatSeed | null {
  const payload = pendingInitialPayload;
  pendingInitialPayload = null;
  return payload;
}

export function queueDroppedPathForCodeChat(path: string): void {
  void ensureCodeChatWindowForDroppedPath(path);
}

export async function ensureCodeChatWindowForDroppedPath(path: string): Promise<void> {
  const attachment = await createAttachmentFromPath(path);
  if (!attachment) {
    return;
  }

  await openCodeChatWithPayload({
    attachments: [attachment],
    autoSend: false,
    persistTarget: true,
    target: 'code',
    text: '',
  });
}

export async function toggleCodeChatWindow(): Promise<void> {
  const mainWindow = getMainWindowCandidate();
  if (!mainWindow) return;

  focusMainWindow(mainWindow);
  navigateMainWindowToCodeChat(mainWindow);
}

export function closeCodeChatWindow(): void {
  const mainWindow = getMainWindowCandidate();
  if (!mainWindow) return;
  mainWindow.webContents.send('navigate', '/chat/openclaw');
}

export async function openCodeChatDevTools(): Promise<void> {
  const mainWindow = getMainWindowCandidate();
  if (!mainWindow) return;

  focusMainWindow(mainWindow);
  mainWindow.webContents.openDevTools({ activate: true, mode: 'detach' });
}

export function forwardDroppedPathToCodeChat(url: string): boolean {
  const absolutePath = parseDroppedFileUrl(url);
  if (!absolutePath) return false;

  void ensureCodeChatWindowForDroppedPath(absolutePath);
  return true;
}
