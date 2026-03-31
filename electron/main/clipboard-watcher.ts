/**
 * Clipboard watcher
 * Polls the system clipboard and notifies the pet window when text changes,
 * so the pet can offer a quick-translate action.
 *
 * Also provides `triggerTranslateFromSelection()` which sends a synthetic
 * Ctrl/Cmd+C to the current foreground window (via platform-native tools),
 * reads the resulting clipboard text, and fires the translate bubble —
 * so the user only needs to SELECT text, not manually copy it.
 */
import { clipboard } from 'electron';
import { execFile } from 'node:child_process';
import { getPetWindow } from './pet-window';

const POLL_INTERVAL_MS = 800;
const MIN_TEXT_LEN = 5;
const MAX_TEXT_LEN = 1000;

let watcherTimer: NodeJS.Timeout | null = null;
let lastText = '';

function looksTranslatable(text: string): boolean {
  // Skip bare URLs
  if (/^https?:\/\/\S+$/.test(text.trim())) return false;
  // Must contain at least one letter or CJK character
  return /[a-zA-Z\u4e00-\u9fff\u3040-\u30ff]/.test(text);
}

export function startClipboardWatcher(): void {
  if (watcherTimer) return;

  watcherTimer = setInterval(() => {
    try {
      const text = clipboard.readText().trim();
      if (
        text &&
        text !== lastText &&
        text.length >= MIN_TEXT_LEN &&
        text.length <= MAX_TEXT_LEN &&
        looksTranslatable(text)
      ) {
        lastText = text;
        const petWin = getPetWindow();
        if (petWin && !petWin.isDestroyed()) {
          petWin.webContents.send('pet:clipboard-changed', { text });
        }
      }
    } catch {
      // Clipboard read can fail on some platforms; silently ignore
    }
  }, POLL_INTERVAL_MS);
}

export function stopClipboardWatcher(): void {
  if (watcherTimer) {
    clearInterval(watcherTimer);
    watcherTimer = null;
  }
}

export function resetClipboardWatcher(): void {
  lastText = '';
}

// ── Proactive selection detection ────────────────────────────────────────────

/** Send a synthetic copy keystroke to the foreground application. */
function sendCopyToForeground(): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      // osascript targets the frontmost app, not the Electron process
      execFile(
        'osascript',
        ['-e', 'tell application "System Events" to keystroke "c" using command down'],
        () => resolve(),
      );
    } else if (process.platform === 'win32') {
      const script =
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^c")';
      execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], () =>
        resolve(),
      );
    } else {
      // Linux / other: try xdotool if available, otherwise fall back to clipboard poll
      execFile('xdotool', ['key', '--clearmodifiers', 'ctrl+c'], () => resolve());
    }
  });
}

function broadcastTranslate(text: string): void {
  lastText = text; // sync with poll loop to avoid duplicate bubble
  const petWin = getPetWindow();
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send('pet:clipboard-changed', { text });
  }
}

/**
 * Triggered by the global hotkey (default: Alt+Shift+T).
 * Simulates Ctrl/Cmd+C in the foreground app so the user only needs to
 * SELECT text, not copy it manually, before pressing the hotkey.
 */
export async function triggerTranslateFromSelection(): Promise<void> {
  const previousText = clipboard.readText();

  await sendCopyToForeground();

  // Wait for the clipboard to be populated by the OS
  await new Promise((resolve) => setTimeout(resolve, 150));

  try {
    const newText = clipboard.readText().trim();

    // If clipboard changed and is translatable, show the bubble
    if (
      newText &&
      newText !== previousText.trim() &&
      newText.length >= MIN_TEXT_LEN &&
      newText.length <= MAX_TEXT_LEN &&
      looksTranslatable(newText)
    ) {
      broadcastTranslate(newText);
      return;
    }

    // Clipboard didn't change (nothing selected) but there's existing translatable text —
    // still offer translation so the hotkey remains useful without re-copying
    const existing = previousText.trim();
    if (
      existing &&
      existing.length >= MIN_TEXT_LEN &&
      existing.length <= MAX_TEXT_LEN &&
      looksTranslatable(existing)
    ) {
      broadcastTranslate(existing);
    }
  } catch {
    // Clipboard read can fail; silently ignore
  }
}
