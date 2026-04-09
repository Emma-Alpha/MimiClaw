import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { getAllSettings } from "../utils/store";
import { PET_WINDOW_HEIGHT, PET_WINDOW_WIDTH } from "./pet-layout";
import {
	closePetBubbleWindow,
	ensurePetBubbleWindow,
	setPetBubbleVisible,
	syncPetBubbleWindowToPet,
} from "./pet-bubble-window";
import { loadWindowRoute } from "./window-loader";

let petWindow: BrowserWindow | null = null;

function getPetWindowUrl():
	| { type: "url"; value: string }
	| { type: "file"; value: string; hash: string } {
	if (process.env.VITE_DEV_SERVER_URL) {
		return {
			type: "url",
			value: `${process.env.VITE_DEV_SERVER_URL}#/pet`,
		};
	}

	return {
		type: "file",
		value: join(__dirname, "../../dist/index.html"),
		hash: "/pet",
	};
}

async function createPetWindow(): Promise<BrowserWindow> {
	const win = new BrowserWindow({
		width: PET_WINDOW_WIDTH,
		height: PET_WINDOW_HEIGHT,
		minWidth: PET_WINDOW_WIDTH,
		minHeight: PET_WINDOW_HEIGHT,
		maxWidth: PET_WINDOW_WIDTH,
		maxHeight: PET_WINDOW_HEIGHT,
		useContentSize: true,
		frame: false,
		transparent: true,
		resizable: false,
		maximizable: false,
		minimizable: false,
		fullscreenable: false,
		skipTaskbar: true,
		alwaysOnTop: true,
		hasShadow: false,
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
	win.setContentSize(PET_WINDOW_WIDTH, PET_WINDOW_HEIGHT);
	win.on("move", () => {
		syncPetBubbleWindowToPet(win);
	});
	win.on("resize", () => {
		syncPetBubbleWindowToPet(win);
	});
	win.on("show", () => {
		syncPetBubbleWindowToPet(win);
	});
	win.on("hide", () => {
		void setPetBubbleVisible(false);
	});
	win.once("ready-to-show", () => {
		if (!win.isDestroyed()) {
			syncPetBubbleWindowToPet(win);
			win.showInactive();
		}
	});

	win.on("closed", () => {
		closePetBubbleWindow();
		if (petWindow === win) {
			petWindow = null;
		}
	});

	const route = getPetWindowUrl();
	await loadWindowRoute(win, route, { windowName: "pet-window" });

	petWindow = win;
	void ensurePetBubbleWindow().then(() => {
		syncPetBubbleWindowToPet(win);
	}).catch(() => {});
	return win;
}

export async function ensurePetWindow(): Promise<BrowserWindow> {
	if (petWindow && !petWindow.isDestroyed()) {
		return petWindow;
	}

	return await createPetWindow();
}

export function getPetWindow(): BrowserWindow | null {
	if (petWindow?.isDestroyed()) {
		petWindow = null;
	}
	return petWindow;
}

export async function syncPetWindowFromSettings(): Promise<void> {
	const settings = await getAllSettings();
	const enabled = settings.petEnabled;

	if (!enabled) {
		const existingWindow = getPetWindow();
		if (existingWindow) {
			existingWindow.close();
		}
		return;
	}

	const win = await ensurePetWindow();
	if (!win.isVisible()) {
		win.showInactive();
	}
}

export function closePetWindow(): void {
	const win = getPetWindow();
	if (win) {
		win.close();
	}
}

app.on("before-quit", () => {
	closePetWindow();
});
