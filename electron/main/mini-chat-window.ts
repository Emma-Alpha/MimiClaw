import { app, BrowserWindow, screen } from "electron";
import { join } from "node:path";
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

const MINI_CHAT_WIDTH = 360;
const MINI_CHAT_HEIGHT = 520;

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
	};
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
			preload: join(__dirname, "../preload/index.js"),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: false,
		},
	});

	win.setAlwaysOnTop(
		true,
		process.platform === "darwin" ? "screen-saver" : "floating",
	);
	win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

	win.once("ready-to-show", () => {
		if (!win.isDestroyed()) {
			win.show();
			win.focus();
		}
	});

	win.on("closed", () => {
		if (miniChatWindow === win) {
			miniChatWindow = null;
		}
	});

	const route = getMiniChatWindowUrl();
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

app.on("before-quit", () => {
	closeMiniChatWindow();
});
