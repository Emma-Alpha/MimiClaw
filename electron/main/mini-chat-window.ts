import { app, BrowserWindow, screen } from "electron";
import { join, basename } from "node:path";
import { stat } from "node:fs/promises";
import type { PetMiniChatSeed } from "../../shared/pet";
import {
	DEFAULT_PET_WINDOW_BOUNDS,
	PET_WINDOW_WIDTH,
} from "./pet-layout";
import { getPetWindow } from "./pet-window";

let miniChatWindow: BrowserWindow | null = null;
let isCreatingMiniChat = false;
/** Seed payload queued from pet interactions; consumed once by MiniChat on mount. */
let pendingInitialPayload: PetMiniChatSeed | null = null;
let pendingDroppedPaths: string[] = [];

const MINI_CHAT_WIDTH = 360;
const MINI_CHAT_HEIGHT = 520;
const MINI_CHAT_MIN_WIDTH = 300;
const MINI_CHAT_MIN_HEIGHT = 360;

function getMiniChatWindowUrl():
	| { type: "url"; value: string }
	| { type: "file"; value: string; hash: string } {
	if (process.env.VITE_DEV_SERVER_URL) {
		return {
			type: "url",
			value: `${process.env.VITE_DEV_SERVER_URL}#/mini-chat`,
		};
	}
	return {
		type: "file",
		value: join(__dirname, "../../dist/index.html"),
		hash: "/mini-chat",
	};
}

function computeMiniChatPosition(): { x: number; y: number } {
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

	// Vertical: align mini chat bottom with pet bottom, clamped to work area
	let y = refBounds.y + refBounds.height - MINI_CHAT_HEIGHT;
	y = Math.max(
		workArea.y + GAP,
		Math.min(y, workArea.y + workArea.height - MINI_CHAT_HEIGHT - GAP),
	);

	// Prefer left side (flush with cat's left edge); fall back to right
	const leftX = catLeft - MINI_CHAT_WIDTH - GAP;
	const rightX = catRight + GAP;

	let x: number;
	if (leftX >= workArea.x + GAP) {
		x = leftX;
	} else {
		x = Math.min(rightX, workArea.x + workArea.width - MINI_CHAT_WIDTH - GAP);
	}

	return { x, y };
}

function normalizeMiniChatSeed(seed: string | PetMiniChatSeed): PetMiniChatSeed {
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
			win.webContents.send("mini-chat:paths-dropped", payload);
		})
		.catch(() => {
			pendingDroppedPaths = queuedPaths.concat(pendingDroppedPaths);
		});
}

async function createMiniChatWindow(): Promise<BrowserWindow> {
	const pos = computeMiniChatPosition();

	const win = new BrowserWindow({
		width: MINI_CHAT_WIDTH,
		height: MINI_CHAT_HEIGHT,
		minWidth: MINI_CHAT_MIN_WIDTH,
		minHeight: MINI_CHAT_MIN_HEIGHT,
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
		backgroundColor: "#0B1118",
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

	win.once("ready-to-show", () => {
		if (!win.isDestroyed()) {
			win.show();
			win.focus();
			flushPendingDroppedPaths(win);
		}
	});

	win.on("closed", () => {
		if (miniChatWindow === win) {
			miniChatWindow = null;
		}
	});

	// ── File / folder drag-and-drop interception ─────────────────────────────
	// When a file/folder is dropped, Chromium's renderer navigates to
	// file:///absolute/path.
	// We intercept this at the network level to extract the path and CANCEL the navigation,
	// so the React app doesn't unmount and we don't get an ugly ERR_FILE_NOT_FOUND log.

	const route = getMiniChatWindowUrl();

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
				console.log("[drop-debug main] sending mini-chat:paths-dropped", payload);

				setTimeout(() => {
					if (!win.isDestroyed()) {
						win.webContents.send("mini-chat:paths-dropped", payload);
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

	if (route.type === "url") {
		await win.loadURL(route.value);
	} else {
		await win.loadFile(route.value, { hash: route.hash });
	}

	miniChatWindow = win;
	return win;
}

/**
 * Open the mini chat window with a pre-filled message that will be auto-sent.
 * If the window is already open, sends the message directly to the renderer.
 */
export async function openMiniChatWithMessage(text: string): Promise<void> {
  await openMiniChatWithPayload({ text, autoSend: true });
}

export async function openMiniChatWithPayload(seed: string | PetMiniChatSeed): Promise<void> {
  const payload = normalizeMiniChatSeed(seed);

  if (miniChatWindow && !miniChatWindow.isDestroyed()) {
    miniChatWindow.webContents.send('mini-chat:initial-message', payload);
    miniChatWindow.focus();
    return;
  }

  if (isCreatingMiniChat) return;

  pendingInitialPayload = payload;
  isCreatingMiniChat = true;
  try {
    await createMiniChatWindow();
  } finally {
    isCreatingMiniChat = false;
  }
}

/** Consume the pending initial message (called once by MiniChat renderer on mount). */
export function consumePendingInitialMessage(): PetMiniChatSeed | null {
  const payload = pendingInitialPayload;
  pendingInitialPayload = null;
  return payload;
}

export function queueDroppedPathForMiniChat(path: string): void {
	queueDroppedPath(path);
}

export async function ensureMiniChatWindowForDroppedPath(path: string): Promise<void> {
	queueDroppedPath(path);

	const existingWindow = getMiniChatWindow();
	if (existingWindow) {
		existingWindow.focus();
		flushPendingDroppedPaths(existingWindow);
		return;
	}

	if (isCreatingMiniChat) return;

	isCreatingMiniChat = true;
	try {
		await createMiniChatWindow();
	} finally {
		isCreatingMiniChat = false;
	}
}

export async function toggleMiniChatWindow(): Promise<void> {
  // If a window is already being created, ignore rapid repeated calls (e.g. double-click)
  if (isCreatingMiniChat) return;

  if (miniChatWindow && !miniChatWindow.isDestroyed()) {
    miniChatWindow.close();
    return;
  }

  isCreatingMiniChat = true;
  try {
    await createMiniChatWindow();
  } finally {
    isCreatingMiniChat = false;
  }
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

export function forwardDroppedPathToMiniChat(url: string): boolean {
	const win = getMiniChatWindow();
	if (!win) return false;

	const absPath = parseDroppedFileUrl(url);
	if (!absPath) return false;

	queueDroppedPath(absPath);
	flushPendingDroppedPaths(win);
	return true;
}

app.on("before-quit", () => {
	closeMiniChatWindow();
});
