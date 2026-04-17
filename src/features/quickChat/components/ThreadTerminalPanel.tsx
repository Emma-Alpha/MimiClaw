import { X } from "lucide-react";
import {
	type ClipboardEvent,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { invokeIpc } from "@/lib/api-client";
import { subscribeHostEvent } from "@/lib/host-events";
import { useMiniChatStyles } from "../styles";

const MAX_TERMINAL_TEXT_CHARS = 220_000;
const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 24;
const TERMINAL_CHAR_WIDTH = 8.2;
const TERMINAL_LINE_HEIGHT = 18;

type ThreadTerminalPanelProps = {
	branchLabel?: string;
	workspaceRoot: string;
	onClose?: () => void;
};

type ThreadTerminalStartResult = {
	success: boolean;
	sessionKey: string;
	workspaceRoot: string;
	cwd: string;
	shell: string;
	pid: number;
	history: string;
	reused: boolean;
};

type ThreadTerminalDataEvent = {
	sessionKey: string;
	data: string;
};

type ThreadTerminalExitEvent = {
	sessionKey: string;
	exitCode: number;
	signal: number;
};

function toPosixPath(path: string): string {
	return path.replaceAll("\\", "/");
}

function compactPath(path: string): string {
	const normalized = toPosixPath(path);
	if (normalized.length <= 64) return normalized;
	const parts = normalized.split("/").filter(Boolean);
	if (parts.length <= 3) return `...${normalized.slice(-58)}`;
	return `.../${parts.slice(-3).join("/")}`;
}

function stripAnsiCodes(text: string): string {
	return text
		// OSC
		.replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, "")
		// CSI
		.replace(/\u001B\[[0-9;?]*[ -/]*[@-~]/g, "")
		// DCS / PM / APC
		.replace(/\u001B[PX^_].*?\u001B\\/g, "");
}

function normalizeTerminalChunk(raw: string): string {
	if (!raw) return "";

	let value = stripAnsiCodes(raw)
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	// Apply backspace semantics to keep interactive typing readable.
	// Re-run until stable because a chunk can contain multiple consecutive backspaces.
	let previous = "";
	while (previous !== value) {
		previous = value;
		value = value
			.replace(/[^\n]\u0008/g, "")
			.replace(/\u0008/g, "");
	}

	return value;
}

function appendTerminalText(previous: string, chunk: string): string {
	const normalized = normalizeTerminalChunk(chunk);
	if (!normalized) return previous;
	const combined = previous + normalized;
	return combined.length > MAX_TERMINAL_TEXT_CHARS
		? combined.slice(-MAX_TERMINAL_TEXT_CHARS)
		: combined;
}

function computeTerminalSize(element: HTMLElement | null): { cols: number; rows: number } {
	if (!element) return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
	const width = Math.max(0, element.clientWidth - 20);
	const height = Math.max(0, element.clientHeight - 14);

	return {
		cols: Math.max(40, Math.floor(width / TERMINAL_CHAR_WIDTH) || DEFAULT_COLS),
		rows: Math.max(8, Math.floor(height / TERMINAL_LINE_HEIGHT) || DEFAULT_ROWS),
	};
}

function getSpecialKeyInput(event: KeyboardEvent<HTMLTextAreaElement>): string | null {
	if (event.key === "Enter") return "\r";
	if (event.key === "Backspace") return "\x7f";
	if (event.key === "Tab") return "\t";
	if (event.key === "Escape") return "\x1b";
	if (event.key === "ArrowUp") return "\x1b[A";
	if (event.key === "ArrowDown") return "\x1b[B";
	if (event.key === "ArrowRight") return "\x1b[C";
	if (event.key === "ArrowLeft") return "\x1b[D";
	if (event.key === "Home") return "\x1b[H";
	if (event.key === "End") return "\x1b[F";
	if (event.key === "Delete") return "\x1b[3~";
	if (event.key === "PageUp") return "\x1b[5~";
	if (event.key === "PageDown") return "\x1b[6~";
	return null;
}

function getCtrlInput(event: KeyboardEvent<HTMLTextAreaElement>): string | null {
	if (!event.ctrlKey || event.metaKey) return null;
	if (event.key === " ") return "\x00";
	if (event.key.length !== 1) return null;
	const lower = event.key.toLowerCase();
	if (lower < "a" || lower > "z") return null;
	return String.fromCharCode(lower.charCodeAt(0) - 96);
}

export function ThreadTerminalPanel({
	branchLabel,
	workspaceRoot,
	onClose,
}: ThreadTerminalPanelProps) {
	const { styles, cx } = useMiniChatStyles();
	const bodyRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const sessionKeyRef = useRef("");
	const [sessionKey, setSessionKey] = useState("");
	const [shellName, setShellName] = useState("");
	const [cwd, setCwd] = useState(workspaceRoot.trim());
	const [output, setOutput] = useState("");
	const [connected, setConnected] = useState(false);
	const [lastExitCode, setLastExitCode] = useState<number | null>(null);

	useEffect(() => {
		sessionKeyRef.current = sessionKey;
	}, [sessionKey]);

	const writeInput = useCallback((input: string) => {
		const activeSessionKey = sessionKeyRef.current;
		if (!activeSessionKey || !input) return;
		void invokeIpc<{ success: boolean }>("thread-terminal:input", {
			sessionKey: activeSessionKey,
			input,
		}).catch(() => {
			setConnected(false);
		});
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>) => {
			const ctrlInput = getCtrlInput(event);
			if (ctrlInput) {
				event.preventDefault();
				writeInput(ctrlInput);
				return;
			}

			const specialInput = getSpecialKeyInput(event);
			if (specialInput) {
				event.preventDefault();
				writeInput(specialInput);
				return;
			}

			if (event.metaKey) return;
			if (event.key.length !== 1) return;

			event.preventDefault();
			if (event.altKey) {
				writeInput(`\x1b${event.key}`);
				return;
			}
			writeInput(event.key);
		},
		[writeInput],
	);

	const handlePaste = useCallback(
		(event: ClipboardEvent<HTMLTextAreaElement>) => {
			const text = event.clipboardData.getData("text");
			if (!text) return;
			event.preventDefault();
			writeInput(text);
		},
		[writeInput],
	);

	useEffect(() => {
		const targetWorkspaceRoot = workspaceRoot.trim();
		if (!targetWorkspaceRoot) return;

		let cancelled = false;
		const startSession = async () => {
			const { cols, rows } = computeTerminalSize(bodyRef.current);
			try {
				const result = await invokeIpc<ThreadTerminalStartResult>("thread-terminal:start", {
					workspaceRoot: targetWorkspaceRoot,
					cols,
					rows,
				});
				if (cancelled) return;

				setSessionKey(result.sessionKey);
				setShellName(result.shell || "");
				setCwd(result.cwd || targetWorkspaceRoot);
				setOutput(appendTerminalText("", result.history || ""));
				setConnected(true);
				setLastExitCode(null);
			} catch (error) {
				if (cancelled) return;
				setConnected(false);
				setOutput((previous) => appendTerminalText(previous, `\n[Terminal start failed] ${String(error)}\n`));
			}
		};

		void startSession();
		return () => {
			cancelled = true;
		};
	}, [workspaceRoot]);

	useEffect(() => {
		const unsubscribeData = subscribeHostEvent<ThreadTerminalDataEvent>(
			"thread-terminal:data",
			(payload) => {
				if (!payload || payload.sessionKey !== sessionKeyRef.current) return;
				setOutput((previous) => appendTerminalText(previous, payload.data));
				setConnected(true);
			},
		);

		const unsubscribeExit = subscribeHostEvent<ThreadTerminalExitEvent>(
			"thread-terminal:exit",
			(payload) => {
				if (!payload || payload.sessionKey !== sessionKeyRef.current) return;
				setConnected(false);
				setLastExitCode(payload.exitCode);
			},
		);

		return () => {
			unsubscribeData();
			unsubscribeExit();
		};
	}, []);

	useEffect(() => {
		const container = bodyRef.current;
		if (!container) return;
		container.scrollTop = container.scrollHeight;
	}, [output]);

	useEffect(() => {
		if (!sessionKey) return;
		const container = bodyRef.current;
		if (!container) return;

		const resizeTerminal = () => {
			const nextSessionKey = sessionKeyRef.current;
			if (!nextSessionKey) return;
			const { cols, rows } = computeTerminalSize(container);
			void invokeIpc<{ success: boolean }>("thread-terminal:resize", {
				sessionKey: nextSessionKey,
				cols,
				rows,
			}).catch(() => {});
		};

		resizeTerminal();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(resizeTerminal);
		observer.observe(container);
		return () => observer.disconnect();
	}, [sessionKey]);

	useEffect(() => {
		if (!sessionKey) return;
		const raf = requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
		return () => cancelAnimationFrame(raf);
	}, [sessionKey]);

	const metaLabel = useMemo(() => {
		if (branchLabel?.trim()) return `git:${branchLabel.trim()}`;
		return compactPath(cwd);
	}, [branchLabel, cwd]);

	const statusLabel = connected
		? "已连接"
		: lastExitCode == null
			? "连接中"
			: `已退出 (${lastExitCode})`;

	return (
		<div className={styles.threadTerminalPanel}>
			<div className={styles.threadTerminalCard}>
				<div className={styles.threadTerminalHeader}>
					<div className={styles.threadTerminalTitle}>
						<span>终端</span>
						<span className={styles.threadTerminalShellBadge}>{shellName || "shell"}</span>
						<span
							className={cx(
								styles.threadTerminalStatusDot,
								connected ? styles.threadTerminalStatusDotLive : styles.threadTerminalStatusDotIdle,
							)}
							aria-hidden="true"
						/>
						<span className={styles.threadTerminalStatusLabel}>{statusLabel}</span>
					</div>
					<div className={styles.threadTerminalHeaderRight}>
						<div className={styles.threadTerminalMeta} title={cwd || undefined}>
							{metaLabel}
						</div>
						{onClose ? (
							<button
								type="button"
								className={styles.threadTerminalHeaderClose}
								onClick={onClose}
								aria-label="关闭终端"
								title="关闭终端"
							>
								<X size={12} />
							</button>
						) : null}
					</div>
				</div>
				<div
					ref={bodyRef}
					className={styles.threadTerminalBody}
					onMouseDown={() => {
						inputRef.current?.focus();
					}}
				>
					<pre className={styles.threadTerminalOutput}>{output || " "}</pre>
					<div className={styles.threadTerminalPromptRow}>
						<span className={styles.threadTerminalPromptGlyph}>$</span>
						<span className={styles.threadTerminalCursor} />
					</div>
					<textarea
						ref={inputRef}
						className={styles.threadTerminalHiddenInput}
						autoCapitalize="off"
						autoCorrect="off"
						autoComplete="off"
						spellCheck={false}
						onKeyDown={handleKeyDown}
						onPaste={handlePaste}
						onChange={() => {}}
						value=""
						aria-label="线程终端输入"
					/>
				</div>
			</div>
		</div>
	);
}
