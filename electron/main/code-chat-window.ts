import { app, BrowserWindow, screen } from "electron";
import { join, basename } from "node:path";
import { stat } from "node:fs/promises";
import type { PetCodeChatSeed } from "../../shared/pet";
import {
	DEFAULT_PET_WINDOW_BOUNDS,
	PET_WINDOW_WIDTH,
} from "./pet-layout";
import { getPetWindow } from "./pet-window";
import { loadWindowRoute } from "./window-loader";

let codeChatWindow: BrowserWindow | null = null;
let isCreatingCodeChat = false;
/** Seed payload queued from pet interactions; consumed once by CodeChat on mount. */
let pendingInitialPayload: PetCodeChatSeed | null = null;
let pendingDroppedPaths: string[] = [];

const CODE_CHAT_WIDTH = 360;
const CODE_CHAT_HEIGHT = 520;
const CODE_CHAT_MIN_WIDTH = 300;
const CODE_CHAT_MIN_HEIGHT = 360;

function getCodeChatWindowUrl():
	| { type: "url"; value: string }
	| { type: "file"; value: string; hash: string } {
	if (process.env.VITE_DEV_SERVER_URL) {
		return {
			type: "url",
			value: `${process.env.VITE_DEV_SERVER_URL}#/quick-chat`,
		};
	}
	return {
		type: "file",
		value: join(__dirname, "../../dist/index.html"),
		hash: "/quick-chat",
	};
}

function computeCodeChatPosition(): { x: number; y: number } {
	const petWin = getPetWindow();
	let refBounds = { ...DEFAULT_PET_WINDOW_BOUNDS };

	if (petWin && !petWin.isDestroyed()) {
		refBounds = petWin.getBounds();
	}

	const display = screen.getDisplayNearestPoint({
		x: refBounds.x + refBounds.width / 2,
		y: refBounds.y + refBounds.height / 2,
	});
	const workArea = display.workArea;
	const GAP = 8;
	const catLeft = refBounds.x;
	const catRight = catLeft + PET_WINDOW_WIDTH;

	// Vertical: align code chat bottom with pet bottom, clamped to work area
	let y = refBounds.y + refBounds.height - CODE_CHAT_HEIGHT;
	y = Math.max(
		workArea.y + GAP,
		Math.min(y, workArea.y + workArea.height - CODE_CHAT_HEIGHT - GAP),
	);

	// Prefer left side (flush with cat's left edge); fall back to right
	const leftX = catLeft - CODE_CHAT_WIDTH - GAP;
	const rightX = catRight + GAP;

	let x: number;
	if (leftX >= workArea.x + GAP) {
		x = leftX;
	} else {
		x = Math.min(rightX, workArea.x + workArea.width - CODE_CHAT_WIDTH - GAP);
	}

	return { x, y };
}

function normalizeCodeChatSeed(seed: string | PetCodeChatSeed): PetCodeChatSeed {
	if (typeof seed === "string") {
		return {
			text: seed,
			autoSend: true,
		};
	}

	return {
		text: seed.text || "",
		attachments: seed.attachments ?? [],
		autoSend: seed.autoSend ?? true,
		target: seed.target === "code" ? "code" : seed.target === "chat" ? "chat" : undefined,
		persistTarget: seed.persistTarget === true,
	};
}

function parseDroppedFileUrl(url: string): string | null {
	if (!url.startsWith("file://")) return null;
	try {
		return decodeURIComponent(new URL(url).pathname);
	} catch {
		return null;
	}
}

function queueDroppedPath(path: string): void {
	const normalized = path.trim();
	if (!normalized) return;
	if (!pendingDroppedPaths.includes(normalized)) {
		pendingDroppedPaths.push(normalized);
	}
}

function flushPendingDroppedPaths(win: BrowserWindow): void {
	if (pendingDroppedPaths.length === 0 || win.isDestroyed()) return;

	const queuedPaths = [...pendingDroppedPaths];
	pendingDroppedPaths = [];

	void Promise.all(
		queuedPaths.map(async (absolutePath) => {
			const info = await stat(absolutePath).catch(() => null);
			return {
				absolutePath,
				name: basename(absolutePath),
				isDirectory: info?.isDirectory() ?? false,
			};
		}),
	)
		.then((payload) => {
			if (win.isDestroyed() || payload.length === 0) return;
			win.webContents.send("quick-chat:paths-dropped", payload);
		})
		.catch(() => {
			pendingDroppedPaths = queuedPaths.concat(pendingDroppedPaths);
		});
}

async function createCodeChatWindow(): Promise<BrowserWindow> {
	const pos = computeCodeChatPosition();

	const win = new BrowserWindow({
		width: CODE_CHAT_WIDTH,
		height: CODE_CHAT_HEIGHT,
		minWidth: CODE_CHAT_MIN_WIDTH,
		minHeight: CODE_CHAT_MIN_HEIGHT,
		x: pos.x,
		y: pos.y,
		useContentSize: true,
		frame: false,
		transparent: false,
		resizable: true,
		maximizable: false,
		minimizable: false,
		fullscreenable: false,
		skipTaskbar: true,
		alwaysOnTop: true,
		hasShadow: true,
		backgroundColor: "#000000",
		show: false,
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			nodeIntegration: false,
			contextIsolation: true,
			navigateOnDragDrop: false,
			sandbox: false,
		},
	});

	// Use "floating" level on macOS (not "screen-saver") so the window
	// participates in macOS's NSDraggingSession and can receive file/folder
	// drag-and-drop from Finder. "screen-saver" level is too high and the OS
	// will not route cross-app drags to windows above the application layer.
	win.setAlwaysOnTop(true, "floating");
	win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

	win.on("closed", () => {
		if (codeChatWindow === win) {
			codeChatWindow = null;
		}
	});

	// ── File / folder drag-and-drop interception ─────────────────────────────
	// When a file/folder is dropped, Chromium's renderer navigates to
	// file:///absolute/path.
	// We intercept this at the network level to extract the path and CANCEL the navigation,
	// so the React app doesn't unmount and we don't get an ugly ERR_FILE_NOT_FOUND log.

	const route = getCodeChatWindowUrl();

	/** Returns true when the URL is our own app URL (not a dropped path). */
	const isAppUrl = (url: string): boolean => {
		if (route.type === "url") {
			// Dev: app is on http://localhost:…, any file:// is a drop
			return !url.startsWith("file://");
		}
		// Prod: app is on file://…/index.html — check for index.html marker
		return url.includes("index.html");
	};

	const handleDroppedFileUrl = (url: string): void => {
		if (!url.startsWith("file://")) return;
		if (isAppUrl(url)) return;

		let absPath: string;
		try {
			absPath = decodeURIComponent(new URL(url).pathname);
		} catch {
			return;
		}

		console.log("[drop-debug main] file drop url:", url, "→ path:", absPath);

		void stat(absPath)
			.catch(() => null)
			.then((info) => {
				if (win.isDestroyed()) return;
				const payload = [
					{
						absolutePath: absPath,
						name: basename(absPath),
						isDirectory: info?.isDirectory() ?? false,
					},
				];
				console.log("[drop-debug main] sending quick-chat:paths-dropped", payload);

				setTimeout(() => {
					if (!win.isDestroyed()) {
						win.webContents.send("quick-chat:paths-dropped", payload);
					}
				}, 100);
			});
	};

	// Handle file drops that still arrive as a navigation fallback.
	win.webContents.on("will-navigate", (event, url) => {
		if (url.startsWith("file://") && !isAppUrl(url)) {
			event.preventDefault();
			console.log("[drop-debug main] will-navigate intercepted:", url);
			handleDroppedFileUrl(url);
		}
	});

	try {
		await loadWindowRoute(win, route, {
			windowName: "code-chat-window",
			maxAttempts: 10,
			initialRetryDelayMs: 150,
		});
	} catch (error) {
		// Keep UX clean when dev server is unavailable: do not leave a blank
		// code-chat window hanging around while retries fail.
		if (!win.isDestroyed()) {
			win.destroy();
		}
		throw error;
	}

	if (!win.isDestroyed()) {
		win.show();
		win.focus();
		flushPendingDroppedPaths(win);
	}

	codeChatWindow = win;
	return win;
}

/**
 * Open the code chat window with a pre-filled message that will be auto-sent.
 * If the window is already open, sends the message directly to the renderer.
 */
export async function openCodeChatWithMessage(text: string): Promise<void> {
  await openCodeChatWithPayload({ text, autoSend: true });
}

export async function openCodeChatWithPayload(seed: string | PetCodeChatSeed): Promise<void> {
  const payload = normalizeCodeChatSeed(seed);

  if (codeChatWindow && !codeChatWindow.isDestroyed()) {
    codeChatWindow.webContents.send('quick-chat:initial-message', payload);
    codeChatWindow.focus();
    return;
  }

  if (isCreatingCodeChat) return;

  pendingInitialPayload = payload;
  isCreatingCodeChat = true;
  try {
    await createCodeChatWindow();
  } finally {
    isCreatingCodeChat = false;
  }
}

/** Consume the pending initial message (called once by CodeChat renderer on mount). */
export function consumePendingInitialMessage(): PetCodeChatSeed | null {
  const payload = pendingInitialPayload;
  pendingInitialPayload = null;
  return payload;
}

export function queueDroppedPathForCodeChat(path: string): void {
	queueDroppedPath(path);
}

export async function ensureCodeChatWindowForDroppedPath(path: string): Promise<void> {
	queueDroppedPath(path);

	const existingWindow = getCodeChatWindow();
	if (existingWindow) {
		existingWindow.focus();
		flushPendingDroppedPaths(existingWindow);
		return;
	}

	if (isCreatingCodeChat) return;

	isCreatingCodeChat = true;
	try {
		await createCodeChatWindow();
	} finally {
		isCreatingCodeChat = false;
	}
}

export async function toggleCodeChatWindow(): Promise<void> {
  // If a window is already being created, ignore rapid repeated calls (e.g. double-click)
  if (isCreatingCodeChat) return;

  if (codeChatWindow && !codeChatWindow.isDestroyed()) {
    codeChatWindow.close();
    return;
  }

  isCreatingCodeChat = true;
  try {
    await createCodeChatWindow();
  } finally {
    isCreatingCodeChat = false;
  }
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function waitForCodeChatWindow(timeoutMs = 2000): Promise<BrowserWindow | null> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const win = getCodeChatWindow();
		if (win) return win;
		if (!isCreatingCodeChat) break;
		await sleep(50);
	}
	return getCodeChatWindow();
}

export async function openCodeChatDevTools(): Promise<void> {
	let win = getCodeChatWindow();
	if (!win) {
		if (isCreatingCodeChat) {
			win = await waitForCodeChatWindow();
		} else {
			isCreatingCodeChat = true;
			try {
				win = await createCodeChatWindow();
			} finally {
				isCreatingCodeChat = false;
			}
		}
	}

	if (!win || win.isDestroyed()) return;
	if (win.isMinimized()) {
		win.restore();
	}
	if (!win.isVisible()) {
		win.show();
	}
	win.focus();
	win.webContents.openDevTools({ mode: "detach", activate: true });
}

export function closeCodeChatWindow(): void {
	if (codeChatWindow && !codeChatWindow.isDestroyed()) {
		codeChatWindow.close();
	}
}

export function getCodeChatWindow(): BrowserWindow | null {
	if (codeChatWindow?.isDestroyed()) {
		codeChatWindow = null;
	}
	return codeChatWindow;
}

export function forwardDroppedPathToCodeChat(url: string): boolean {
	const win = getCodeChatWindow();
	if (!win) return false;

	const absPath = parseDroppedFileUrl(url);
	if (!absPath) return false;

	queueDroppedPath(absPath);
	flushPendingDroppedPaths(win);
	return true;
}

app.on("before-quit", () => {
	closeCodeChatWindow();
});
