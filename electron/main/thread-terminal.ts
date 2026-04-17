import { BrowserWindow } from "electron";
import { accessSync, constants as fsConstants, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import { spawn as spawnPty, type IPty } from "node-pty";
import { logger } from "../utils/logger";

const MIN_TERMINAL_COLS = 40;
const MIN_TERMINAL_ROWS = 8;
const MAX_TERMINAL_HISTORY_CHARS = 260_000;

export type ThreadTerminalStartPayload = {
	workspaceRoot?: string;
	cols?: number;
	rows?: number;
};

export type ThreadTerminalInputPayload = {
	sessionKey?: string;
	input?: string;
};

export type ThreadTerminalResizePayload = {
	sessionKey?: string;
	cols?: number;
	rows?: number;
};

export type ThreadTerminalClosePayload = {
	sessionKey?: string;
};

export type ThreadTerminalDataEvent = {
	sessionKey: string;
	data: string;
};

export type ThreadTerminalExitEvent = {
	sessionKey: string;
	exitCode: number;
	signal: number;
};

export type ThreadTerminalStartResult = {
	success: boolean;
	sessionKey: string;
	workspaceRoot: string;
	cwd: string;
	shell: string;
	pid: number;
	history: string;
	reused: boolean;
};

type ThreadTerminalSession = {
	sessionKey: string;
	workspaceRoot: string;
	cwd: string;
	shell: string;
	pty: IPty;
	history: string;
	subscribers: Set<number>;
};

const sessions = new Map<string, ThreadTerminalSession>();

function normalizeWorkspaceRoot(workspaceRoot: string): string {
	return resolve(workspaceRoot.trim());
}

function clampColsRows(cols?: number, rows?: number): { cols: number; rows: number } {
	const nextCols = Number.isFinite(cols) ? Math.floor(cols as number) : 120;
	const nextRows = Number.isFinite(rows) ? Math.floor(rows as number) : 24;

	return {
		cols: Math.max(MIN_TERMINAL_COLS, nextCols),
		rows: Math.max(MIN_TERMINAL_ROWS, nextRows),
	};
}

function canExecute(path: string): boolean {
	const candidate = path.trim();
	if (!candidate) return false;
	try {
		accessSync(candidate, fsConstants.X_OK);
		return true;
	} catch {
		return false;
	}
}

function getPosixShellArgs(shell: string): string[] {
	const shellName = basename(shell).toLowerCase();
	return shellName === "sh" ? [] : ["-l"];
}

function resolveShellCandidates(): Array<{ shell: string; args: string[] }> {
	if (process.platform === "win32") {
		// On Windows, COMSPEC is guaranteed by the OS and avoids optional pwsh dependency.
		return [{
			shell: process.env.COMSPEC?.trim() || "cmd.exe",
			args: [],
		}];
	}

	const defaultCandidates = process.platform === "darwin"
		? ["/bin/zsh", "/bin/bash", "/bin/sh"]
		: ["/bin/bash", "/bin/sh"];
	const envShell = process.env.SHELL?.trim() || "";
	const uniqueCandidates = Array.from(new Set([envShell, ...defaultCandidates].filter(Boolean)));

	return uniqueCandidates
		.filter(canExecute)
		.map((shell) => ({ shell, args: getPosixShellArgs(shell) }));
}

function normalizeCwd(targetCwd: string): string {
	const rawTarget = targetCwd.trim();
	if (rawTarget) {
		try {
			const stat = statSync(rawTarget);
			if (stat.isDirectory()) {
				return rawTarget;
			}
		} catch {
			// Fall back to home/current working directory below.
		}
	}

	const home = homedir().trim();
	if (home) {
		try {
			const stat = statSync(home);
			if (stat.isDirectory()) {
				return home;
			}
		} catch {
			// Fall back to process cwd.
		}
	}

	return process.cwd();
}

function appendHistory(session: ThreadTerminalSession, chunk: string): void {
	if (!chunk) return;
	const combined = session.history + chunk;
	session.history = combined.length > MAX_TERMINAL_HISTORY_CHARS
		? combined.slice(-MAX_TERMINAL_HISTORY_CHARS)
		: combined;
}

function sendToSubscribers(session: ThreadTerminalSession, channel: string, payload: unknown): void {
	const staleIds: number[] = [];

	for (const webContentsId of session.subscribers) {
		let delivered = false;
		for (const win of BrowserWindow.getAllWindows()) {
			if (win.isDestroyed()) continue;
			if (win.webContents.id !== webContentsId) continue;
			win.webContents.send(channel, payload);
			delivered = true;
			break;
		}
		if (!delivered) {
			staleIds.push(webContentsId);
		}
	}

	for (const staleId of staleIds) {
		session.subscribers.delete(staleId);
	}
}

function detachWebContentsFromAllSessions(webContentsId: number): void {
	for (const session of sessions.values()) {
		session.subscribers.delete(webContentsId);
	}
}

function createSession(workspaceRoot: string, cols: number, rows: number): ThreadTerminalSession {
	const shellCandidates = resolveShellCandidates();
	if (shellCandidates.length === 0) {
		throw new Error("No executable shell candidate found");
	}

	const cwd = normalizeCwd(workspaceRoot);
	let pty: IPty | null = null;
	let selectedShell = shellCandidates[0].shell;
	let launchError = "";

	for (const candidate of shellCandidates) {
		try {
			pty = spawnPty(candidate.shell, candidate.args, {
				cwd,
				cols,
				rows,
				name: "xterm-256color",
				env: {
					...process.env,
					TERM: "xterm-256color",
					FORCE_COLOR: "0",
					CLICOLOR: "0",
					NO_COLOR: "1",
				},
			});
			selectedShell = candidate.shell;
			break;
		} catch (error) {
			launchError = String(error);
		}
	}

	if (!pty) {
		throw new Error(
			`Unable to start terminal shell (cwd=${cwd}, candidates=${shellCandidates.map((it) => it.shell).join(", ")}): ${launchError}`,
		);
	}

	const session: ThreadTerminalSession = {
		sessionKey: normalizeWorkspaceRoot(workspaceRoot),
		workspaceRoot,
		cwd,
		shell: basename(selectedShell) || selectedShell,
		pty,
		history: "",
		subscribers: new Set<number>(),
	};

	pty.onData((data) => {
		appendHistory(session, data);
		sendToSubscribers(session, "thread-terminal:data", {
			sessionKey: session.sessionKey,
			data,
		} satisfies ThreadTerminalDataEvent);
	});

	pty.onExit((event) => {
		sessions.delete(session.sessionKey);
		sendToSubscribers(session, "thread-terminal:exit", {
			sessionKey: session.sessionKey,
			exitCode: event.exitCode,
			signal: event.signal,
		} satisfies ThreadTerminalExitEvent);
	});

	return session;
}

export function startOrReuseThreadTerminalSession(
	webContentsId: number,
	payload: ThreadTerminalStartPayload,
): ThreadTerminalStartResult {
	const rawWorkspaceRoot = payload.workspaceRoot?.trim() || "";
	if (!rawWorkspaceRoot) {
		throw new Error("workspaceRoot is required");
	}

	const workspaceRoot = normalizeWorkspaceRoot(rawWorkspaceRoot);
	const { cols, rows } = clampColsRows(payload.cols, payload.rows);
	const existing = sessions.get(workspaceRoot);

	if (existing) {
		existing.subscribers.add(webContentsId);
		try {
			existing.pty.resize(cols, rows);
		} catch {
			// Ignore resize errors from a transient pty state.
		}
		return {
			success: true,
			sessionKey: existing.sessionKey,
			workspaceRoot: existing.workspaceRoot,
			cwd: existing.cwd,
			shell: existing.shell,
			pid: existing.pty.pid,
			history: existing.history,
			reused: true,
		};
	}

	const session = createSession(workspaceRoot, cols, rows);
	session.subscribers.add(webContentsId);
	sessions.set(session.sessionKey, session);

	logger.info(`[thread-terminal] started session key=${session.sessionKey} pid=${session.pty.pid}`);

	return {
		success: true,
		sessionKey: session.sessionKey,
		workspaceRoot: session.workspaceRoot,
		cwd: session.cwd,
		shell: session.shell,
		pid: session.pty.pid,
		history: session.history,
		reused: false,
	};
}

export function writeThreadTerminalInput(payload: ThreadTerminalInputPayload): { success: boolean } {
	const sessionKey = payload.sessionKey?.trim() || "";
	const input = payload.input ?? "";
	if (!sessionKey || !input) return { success: false };

	const session = sessions.get(sessionKey);
	if (!session) return { success: false };

	session.pty.write(input);
	return { success: true };
}

export function resizeThreadTerminal(payload: ThreadTerminalResizePayload): { success: boolean } {
	const sessionKey = payload.sessionKey?.trim() || "";
	if (!sessionKey) return { success: false };

	const session = sessions.get(sessionKey);
	if (!session) return { success: false };

	const { cols, rows } = clampColsRows(payload.cols, payload.rows);
	try {
		session.pty.resize(cols, rows);
		return { success: true };
	} catch {
		return { success: false };
	}
}

export function closeThreadTerminal(payload: ThreadTerminalClosePayload): { success: boolean } {
	const sessionKey = payload.sessionKey?.trim() || "";
	if (!sessionKey) return { success: false };

	const session = sessions.get(sessionKey);
	if (!session) return { success: true };

	try {
		session.pty.kill();
	} catch (error) {
		logger.warn(`[thread-terminal] failed to kill session key=${sessionKey}:`, error);
	}
	sessions.delete(sessionKey);
	return { success: true };
}

export function detachThreadTerminalSubscriber(webContentsId: number): void {
	detachWebContentsFromAllSessions(webContentsId);
}
