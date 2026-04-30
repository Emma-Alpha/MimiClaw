import { app, BrowserWindow, screen } from "electron";
import { join } from "node:path";
import {
	DEFAULT_PET_WINDOW_BOUNDS,
	PET_WINDOW_WIDTH,
} from "./pet-layout";
import { getPetWindow } from "./pet-window";
import { loadWindowRoute } from "./window-loader";

let petCompanionWindow: BrowserWindow | null = null;
let isCreatingPetCompanionWindow = false;

const PET_COMPANION_WINDOW_WIDTH = 460;
const PET_COMPANION_WINDOW_HEIGHT = 600;

function getPetCompanionWindowUrl():
	| { type: "url"; value: string }
	| { type: "file"; value: string; hash: string } {
	if (process.env.VITE_DEV_SERVER_URL) {
		return {
			type: "url",
			value: `${process.env.VITE_DEV_SERVER_URL}#/pet-companion`,
		};
	}

	return {
		type: "file",
		value: join(__dirname, "../../dist/index.html"),
		hash: "/pet-companion",
	};
}

function computePetCompanionPosition(): { x: number; y: number } {
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

	let y = refBounds.y + refBounds.height - PET_COMPANION_WINDOW_HEIGHT;
	y = Math.max(
		workArea.y + gap,
		Math.min(
			y,
			workArea.y + workArea.height - PET_COMPANION_WINDOW_HEIGHT - gap,
		),
	);

	const leftX = catLeft - PET_COMPANION_WINDOW_WIDTH - gap;
	const rightX = catRight + gap;

	let x: number;
	if (leftX >= workArea.x + gap) {
		x = leftX;
	} else {
		x = Math.min(
			rightX,
			workArea.x + workArea.width - PET_COMPANION_WINDOW_WIDTH - gap,
		);
	}

	return { x, y };
}

async function createPetCompanionWindow(): Promise<BrowserWindow> {
	const pos = computePetCompanionPosition();

	const win = new BrowserWindow({
		width: PET_COMPANION_WINDOW_WIDTH,
		height: PET_COMPANION_WINDOW_HEIGHT,
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
		backgroundColor: "#0B1118",
		show: false,
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: false,
		},
	});

	win.excludedFromShownWindowsMenu = true;
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
		if (petCompanionWindow === win) {
			petCompanionWindow = null;
		}
	});

	const route = getPetCompanionWindowUrl();
	await loadWindowRoute(win, route, { windowName: "pet-companion-window" });

	petCompanionWindow = win;
	return win;
}

export async function openPetCompanionWindow(): Promise<void> {
	if (petCompanionWindow && !petCompanionWindow.isDestroyed()) {
		petCompanionWindow.show();
		petCompanionWindow.focus();
		return;
	}

	if (isCreatingPetCompanionWindow) return;

	isCreatingPetCompanionWindow = true;
	try {
		await createPetCompanionWindow();
	} finally {
		isCreatingPetCompanionWindow = false;
	}
}

export function closePetCompanionWindow(): void {
	if (petCompanionWindow && !petCompanionWindow.isDestroyed()) {
		petCompanionWindow.close();
	}
}

export function getPetCompanionWindow(): BrowserWindow | null {
	if (petCompanionWindow?.isDestroyed()) {
		petCompanionWindow = null;
	}
	return petCompanionWindow;
}

app.on("before-quit", () => {
	closePetCompanionWindow();
});
