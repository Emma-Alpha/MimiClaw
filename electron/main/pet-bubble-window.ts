import { app, BrowserWindow, Rectangle, screen } from "electron";
import { join } from "node:path";
import {
	DEFAULT_PET_WINDOW_BOUNDS,
	PET_BUBBLE_BOTTOM_OFFSET,
	PET_BUBBLE_OFFSET_X,
	PET_BUBBLE_WINDOW_GAP,
	PET_BUBBLE_WINDOW_HEIGHT,
	PET_BUBBLE_WINDOW_WIDTH,
} from "./pet-layout";

let petBubbleWindow: BrowserWindow | null = null;
let lastPetBounds: Rectangle | null = null;

function getPetBubbleWindowUrl():
	| { type: "url"; value: string }
	| { type: "file"; value: string; hash: string } {
	if (process.env.VITE_DEV_SERVER_URL) {
		return {
			type: "url",
			value: `${process.env.VITE_DEV_SERVER_URL}#/pet-bubble`,
		};
	}

	return {
		type: "file",
		value: join(__dirname, "../../dist/index.html"),
		hash: "/pet-bubble",
	};
}

function computePetBubblePosition(bounds: Rectangle): { x: number; y: number } {
	lastPetBounds = bounds;
	const display = screen.getDisplayNearestPoint({
		x: bounds.x + Math.round(bounds.width / 2),
		y: bounds.y + Math.round(bounds.height / 2),
	});
	const workArea = display.workArea;
	const unclampedX = bounds.x + PET_BUBBLE_OFFSET_X;
	const unclampedY =
		bounds.y - PET_BUBBLE_WINDOW_HEIGHT + PET_BUBBLE_BOTTOM_OFFSET;

	const x = Math.max(
		workArea.x + PET_BUBBLE_WINDOW_GAP,
		Math.min(
			unclampedX,
			workArea.x + workArea.width - PET_BUBBLE_WINDOW_WIDTH - PET_BUBBLE_WINDOW_GAP,
		),
	);
	const y = Math.max(
		workArea.y + PET_BUBBLE_WINDOW_GAP,
		Math.min(
			unclampedY,
			workArea.y + workArea.height - PET_BUBBLE_WINDOW_HEIGHT - PET_BUBBLE_WINDOW_GAP,
		),
	);

	return { x, y };
}

async function createPetBubbleWindow(): Promise<BrowserWindow> {
	const bounds = lastPetBounds ?? DEFAULT_PET_WINDOW_BOUNDS;
	const pos = computePetBubblePosition(bounds);
	const win = new BrowserWindow({
		width: PET_BUBBLE_WINDOW_WIDTH,
		height: PET_BUBBLE_WINDOW_HEIGHT,
		x: pos.x,
		y: pos.y,
		useContentSize: true,
		frame: false,
		transparent: true,
		resizable: false,
		maximizable: false,
		minimizable: false,
		fullscreenable: false,
		focusable: false,
		skipTaskbar: true,
		alwaysOnTop: true,
		hasShadow: true,
		show: false,
		backgroundColor: "#00000000",
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
	win.setIgnoreMouseEvents(true, { forward: true });

	win.on("closed", () => {
		if (petBubbleWindow === win) {
			petBubbleWindow = null;
		}
	});

	const route = getPetBubbleWindowUrl();
	if (route.type === "url") {
		await win.loadURL(route.value);
	} else {
		await win.loadFile(route.value, { hash: route.hash });
	}

	petBubbleWindow = win;
	return win;
}

export async function ensurePetBubbleWindow(): Promise<BrowserWindow> {
	if (petBubbleWindow && !petBubbleWindow.isDestroyed()) {
		return petBubbleWindow;
	}

	return createPetBubbleWindow();
}

export function getPetBubbleWindow(): BrowserWindow | null {
	if (petBubbleWindow?.isDestroyed()) {
		petBubbleWindow = null;
	}
	return petBubbleWindow;
}

export function syncPetBubbleWindowToPet(petWindow: BrowserWindow | null): void {
	if (!petWindow || petWindow.isDestroyed()) return;
	const bubbleWindow = getPetBubbleWindow();
	const bounds = petWindow.getBounds();
	const pos = computePetBubblePosition(bounds);

	if (bubbleWindow && !bubbleWindow.isDestroyed()) {
		bubbleWindow.setPosition(pos.x, pos.y);
	}
}

export async function setPetBubbleVisible(visible: boolean): Promise<void> {
	if (!visible) {
		const existing = getPetBubbleWindow();
		if (existing && !existing.isDestroyed() && existing.isVisible()) {
			existing.hide();
		}
		return;
	}

	const win = await ensurePetBubbleWindow();
	if (lastPetBounds) {
		const pos = computePetBubblePosition(lastPetBounds);
		win.setPosition(pos.x, pos.y);
	}

	if (!win.isVisible()) {
		win.showInactive();
	}
}

export function closePetBubbleWindow(): void {
	const win = getPetBubbleWindow();
	if (win) {
		win.close();
	}
}

app.on("before-quit", () => {
	closePetBubbleWindow();
});
