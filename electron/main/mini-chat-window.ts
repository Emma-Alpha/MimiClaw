import { app, BrowserWindow, screen } from "electron";
import { join } from "node:path";
import { getPetWindow } from "./pet-window";
import {
	DEFAULT_PET_WINDOW_BOUNDS,
	PET_WINDOW_WIDTH,
} from "./pet-layout";
import { loadWindowRoute } from "./window-loader";

let miniChatWindow: BrowserWindow | null = null;
let isCreatingMiniChatWindow = false;

const MINI_CHAT_WINDOW_WIDTH = 420;
const MINI_CHAT_WINDOW_HEIGHT = 600;

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
	const gap = 8;
	const catLeft = refBounds.x;
	const catRight = catLeft + PET_WINDOW_WIDTH;

	let y = refBounds.y + refBounds.height - MINI_CHAT_WINDOW_HEIGHT;
	y = Math.max(
		workArea.y + gap,
		Math.min(
			y,
			workArea.y + workArea.height - MINI_CHAT_WINDOW_HEIGHT - gap,
		),
	);

	const leftX = catLeft - MINI_CHAT_WINDOW_WIDTH - gap;
	const rightX = catRight + gap;

	let x: number;
	if (leftX >= workArea.x + gap) {
		x = leftX;
	} else {
		x = Math.min(
			rightX,
			workArea.x + workArea.width - MINI_CHAT_WINDOW_WIDTH - gap,
		);
	}

	return { x, y };
}

async function createMiniChatWindow(): Promise<BrowserWindow> {
	const isMac = process.platform === "darwin";
	const pos = computeMiniChatPosition();

	const win = new BrowserWindow({
		width: MINI_CHAT_WINDOW_WIDTH,
		height: MINI_CHAT_WINDOW_HEIGHT,
		x: pos.x,
		y: pos.y,
		useContentSize: true,
		frame: true,
		titleBarStyle: isMac ? "hiddenInset" : "default",
		trafficLightPosition: isMac ? { x: 12, y: 12 } : undefined,
		transparent: false,
		resizable: true,
		minimizable: true,
		maximizable: false,
		fullscreenable: false,
		skipTaskbar: false,
		alwaysOnTop: true,
		hasShadow: true,
		minWidth: 360,
		minHeight: 400,
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
		isMac ? "floating" : "floating",
	);

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
	await loadWindowRoute(win, route, { windowName: "mini-chat-window" });

	miniChatWindow = win;
	return win;
}

export async function openMiniChatWindow(): Promise<void> {
	if (miniChatWindow && !miniChatWindow.isDestroyed()) {
		miniChatWindow.show();
		miniChatWindow.focus();
		return;
	}

	if (isCreatingMiniChatWindow) return;

	isCreatingMiniChatWindow = true;
	try {
		await createMiniChatWindow();
	} finally {
		isCreatingMiniChatWindow = false;
	}
}

export async function toggleMiniChatWindow(): Promise<void> {
	if (miniChatWindow && !miniChatWindow.isDestroyed()) {
		if (miniChatWindow.isVisible()) {
			miniChatWindow.hide();
			return;
		}
		miniChatWindow.show();
		miniChatWindow.focus();
		return;
	}

	await openMiniChatWindow();
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
