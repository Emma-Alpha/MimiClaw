import { BrowserWindow } from "electron";
import { accessSync, chmodSync, constants as fsConstants, statSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawn as spawnPty, type IPty } from "node-pty";
import { logger } from "../utils/logger";

const MIN_TERMINAL_COLS = 40;
const MIN_TERMINAL_ROWS = 8;
const MAX_TERMINAL_HISTORY_CHARS = 260_000;
const require = createRequire(import.meta.url);

export type ThreadTerminalStartPayload = {
	workspaceRoot?: string;
	terminalId?: string;
	shell?: string;
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

export type ThreadTerminalShellOption = {
	id: string;
	label: string;
	shell: string;
};

export type ThreadTerminalListShellsResult = {
	success: boolean;
	shells: ThreadTerminalShellOption[];
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

type ThreadTerminalShellCandidate = {
	shell: string;
	args: string[];
	label: string;
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

function normalizeSessionKey(terminalId: string | undefined, workspaceRoot: string): string {
	const explicitTerminalId = terminalId?.trim();
	return explicitTerminalId || normalizeWorkspaceRoot(workspaceRoot);
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

function ensureNodePtySpawnHelperExecutable(): void {
	if (process.platform === "win32") {
		return;
	}

	try {
		const nodePtyPackagePath = require.resolve("node-pty/package.json");
		const nodePtyRoot = dirname(nodePtyPackagePath);
		const helperPath = join(nodePtyRoot, "prebuilds", `${process.platform}-${process.arch}`, "spawn-helper");
		const candidatePaths = Array.from(
			new Set([
				helperPath,
				helperPath.replace("app.asar", "app.asar.unpacked"),
				helperPath.replace("node_modules.asar", "node_modules.asar.unpacked"),
			]),
		);

		for (const candidatePath of candidatePaths) {
			try {
				accessSync(candidatePath, fsConstants.F_OK);
			} catch {
				continue;
			}

			if (!canExecute(candidatePath)) {
				chmodSync(candidatePath, 0o755);
				logger.info(`[thread-terminal] restored execute bit on node-pty spawn-helper: ${candidatePath}`);
			}
			return;
		}
	} catch (error) {
		logger.warn("[thread-terminal] failed to ensure node-pty spawn-helper permissions:", error);
	}
}

function getPosixShellArgs(shell: string): string[] {
	const shellName = basename(shell).toLowerCase();
	return shellName === "sh" ? [] : ["-l"];
}

function getShellDisplayName(shell: string, fallback?: string): string {
	const normalized = basename(shell.trim());
	if (normalized) return normalized;
	return fallback?.trim() || "shell";
}

function buildTerminalEnv(): Record<string, string> {
	const envEntries = Object.entries(process.env).filter(
		(entry): entry is [string, string] => typeof entry[1] === "string",
	);

	return {
		...Object.fromEntries(envEntries),
		TERM: "xterm-256color",
		FORCE_COLOR: "0",
		CLICOLOR: "0",
		NO_COLOR: "1",
	};
}

function resolveShellCandidates(): ThreadTerminalShellCandidate[] {
	if (process.platform === "win32") {
		return [{
			shell: process.env.COMSPEC?.trim() || "cmd.exe",
			args: [],
			label: basename(process.env.COMSPEC?.trim() || "cmd.exe") || "cmd.exe",
		}];
	}

	const defaultCandidates = process.platform === "darwin"
		? ["/bin/zsh", "/bin/bash", "/bin/sh"]
		: ["/bin/bash", "/bin/sh"];
	const envShell = process.env.SHELL?.trim() || "";
	const shells = [envShell, ...defaultCandidates].filter(Boolean);
	const candidates: ThreadTerminalShellCandidate[] = [];
	const seen = new Set<string>();

	for (const shell of shells) {
		if (canExecute(shell)) {
			const directKey = `${shell}::${getPosixShellArgs(shell).join(" ")}`;
			if (!seen.has(directKey)) {
				seen.add(directKey);
				candidates.push({ shell, args: getPosixShellArgs(shell), label: basename(shell) || shell });
			}
		}

		const shellName = basename(shell);
		const envWrapper = "/usr/bin/env";
		if (shellName && canExecute(envWrapper)) {
			const wrappedArgs = [shellName, ...getPosixShellArgs(shellName)];
			const wrappedKey = `${envWrapper}::${wrappedArgs.join(" ")}`;
			if (!seen.has(wrappedKey)) {
				seen.add(wrappedKey);
				candidates.push({ shell: envWrapper, args: wrappedArgs, label: shellName });
			}
		}
	}

	return candidates;
}

function listThreadTerminalShells(): ThreadTerminalShellOption[] {
	const options: ThreadTerminalShellOption[] = [];
	const seen = new Set<string>();

	for (const candidate of resolveShellCandidates()) {
		const resolvedShell = candidate.shell === "/usr/bin/env"
			? candidate.args[0] || candidate.label
			: candidate.shell;
		const optionLabel = getShellDisplayName(resolvedShell, candidate.label);
		const optionId = optionLabel.toLowerCase();
		if (seen.has(optionId)) continue;
		seen.add(optionId);
		options.push({
			id: optionId,
			label: optionLabel,
			shell: resolvedShell,
		});
	}

	return options;
}

function prioritizeShellCandidates(
	candidates: ThreadTerminalShellCandidate[],
	preferredShell?: string,
): ThreadTerminalShellCandidate[] {
	const normalizedPreferredShell = preferredShell?.trim();
	if (!normalizedPreferredShell) {
		return candidates;
	}

	const preferredName = basename(normalizedPreferredShell).toLowerCase();
	const matching: ThreadTerminalShellCandidate[] = [];
	const fallback: ThreadTerminalShellCandidate[] = [];

	for (const candidate of candidates) {
		const candidateName = basename(candidate.shell === "/usr/bin/env" ? candidate.args[0] || "" : candidate.shell).toLowerCase();
		const isMatch = candidate.shell === normalizedPreferredShell
			|| candidate.label.toLowerCase() === preferredName
			|| candidateName === preferredName;
		if (isMatch) {
			matching.push(candidate);
		} else {
			fallback.push(candidate);
		}
	}

	return matching.length > 0 ? [...matching, ...fallback] : candidates;
}

function resolveExistingDirectory(targetPath: string): string | null {
	let current = resolve(targetPath.trim());

	while (true) {
		try {
			const stat = statSync(current);
			if (stat.isDirectory()) {
				return current;
			}
		} catch {
			// Keep climbing until we find an existing parent directory.
		}

		const parent = dirname(current);
		if (parent === current) {
			return null;
		}
		current = parent;
	}
}

function normalizeCwd(targetCwd: string): string {
	const rawTarget = targetCwd.trim();
	if (rawTarget) {
		const nearestExisting = resolveExistingDirectory(rawTarget);
		if (nearestExisting) {
			return nearestExisting;
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

function createSession(
	sessionKey: string,
	workspaceRoot: string,
	cols: number,
	rows: number,
	preferredShell?: string,
): ThreadTerminalSession {
	ensureNodePtySpawnHelperExecutable();

	const shellCandidates = prioritizeShellCandidates(resolveShellCandidates(), preferredShell);
	if (shellCandidates.length === 0) {
		throw new Error("No executable shell candidate found");
	}

	const cwd = normalizeCwd(workspaceRoot);
	let pty: IPty | null = null;
	let selectedShell = shellCandidates[0].label;
	const launchErrors: string[] = [];
	const env = buildTerminalEnv();

	for (const candidate of shellCandidates) {
		try {
			pty = spawnPty(candidate.shell, candidate.args, {
				cwd,
				cols,
				rows,
				name: "xterm-256color",
				env,
			});
			selectedShell = candidate.label;
			break;
		} catch (error) {
			launchErrors.push(`${candidate.shell} ${candidate.args.join(" ")} => ${String(error)}`.trim());
		}
	}

	if (!pty) {
		throw new Error(
			`Unable to start terminal shell (cwd=${cwd}, candidates=${shellCandidates.map((it) => it.shell).join(", ")}): ${launchErrors.join(" | ")}`,
		);
	}

	const session: ThreadTerminalSession = {
		sessionKey,
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

export function listAvailableThreadTerminalShells(): ThreadTerminalListShellsResult {
	return {
		success: true,
		shells: listThreadTerminalShells(),
	};
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
	const sessionKey = normalizeSessionKey(payload.terminalId, workspaceRoot);
	const { cols, rows } = clampColsRows(payload.cols, payload.rows);
	const existing = sessions.get(sessionKey);

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

	const session = createSession(sessionKey, workspaceRoot, cols, rows, payload.shell);
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
