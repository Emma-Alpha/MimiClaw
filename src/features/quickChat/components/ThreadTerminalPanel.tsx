import { ActionIcon } from "@lobehub/ui";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { Plus, X } from "lucide-react";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { invokeIpc } from "@/lib/api-client";
import { subscribeHostEvent } from "@/lib/host-events";
import { useMiniChatStyles } from "../styles";

type ThreadTerminalPanelProps = {
	branchLabel?: string;
	workspaceRoot: string;
	onClose?: () => void;
};

type ThreadTerminalShellOption = {
	id: string;
	label: string;
	shell: string;
};

type ThreadTerminalListShellsResult = {
	success: boolean;
	shells: ThreadTerminalShellOption[];
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

type TerminalTabDefinition = {
	id: string;
	title: string;
	shell: string;
	shellLabel: string;
};

type TerminalTabMeta = {
	connected: boolean;
	cwd: string;
	lastExitCode: number | null;
	shellName: string;
	startError: string;
};

type TerminalTabViewProps = {
	tab: TerminalTabDefinition;
	workspaceRoot: string;
	focused: boolean;
	visible: boolean;
	layoutStyle?: CSSProperties;
	onMetaChange: (tabId: string, meta: TerminalTabMeta) => void;
	onRequestFocus: (tabId: string) => void;
};

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 24;
const DEFAULT_PANEL_HEIGHT = 280;
const MIN_PANEL_HEIGHT = 180;
const MAX_PANEL_HEIGHT = 520;

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

function getTerminalTheme(host: HTMLElement) {
	const computed = window.getComputedStyle(host);
	const foreground = computed.color || "#111827";

	return {
		background: "#00000000",
		cursor: foreground,
		cursorAccent: "#00000000",
		foreground,
		selectionBackground: "rgba(59, 130, 246, 0.22)",
	};
}

function clampPanelHeight(nextHeight: number): number {
	return Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, Math.round(nextHeight)));
}

function createTerminalTab(
	shellOption: ThreadTerminalShellOption | null,
	existingTabs: TerminalTabDefinition[],
): TerminalTabDefinition {
	const baseLabel = shellOption?.label || "shell";
	const shell = shellOption?.shell || "";
	const duplicateCount = existingTabs.filter((tab) => tab.shellLabel === baseLabel).length;
	const suffix = duplicateCount > 0 ? ` ${duplicateCount + 1}` : "";

	return {
		id: `terminal:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
		title: `${baseLabel}${suffix}`,
		shell,
		shellLabel: baseLabel,
	};
}

function moveTab<T>(items: T[], fromIndex: number, toIndex: number): T[] {
	if (fromIndex === toIndex) return items;
	const nextItems = [...items];
	const [moved] = nextItems.splice(fromIndex, 1);
	nextItems.splice(toIndex, 0, moved);
	return nextItems;
}

function TerminalTabView({
	tab,
	workspaceRoot,
	focused,
	visible,
	layoutStyle,
	onMetaChange,
	onRequestFocus,
}: TerminalTabViewProps) {
	const { styles, cx } = useMiniChatStyles();
	const terminalViewportRef = useRef<HTMLDivElement | null>(null);
	const terminalRef = useRef<Terminal | null>(null);
	const fitAddonRef = useRef<FitAddon | null>(null);
	const resizeFrameRef = useRef<number | null>(null);
	const sessionKeyRef = useRef("");
	const [sessionKey, setSessionKey] = useState("");
	const [shellName, setShellName] = useState(tab.shellLabel);
	const [cwd, setCwd] = useState(workspaceRoot.trim());
	const [connected, setConnected] = useState(false);
	const [startError, setStartError] = useState("");
	const [lastExitCode, setLastExitCode] = useState<number | null>(null);

	useEffect(() => {
		sessionKeyRef.current = sessionKey;
	}, [sessionKey]);

	useEffect(() => {
		onMetaChange(tab.id, {
			connected,
			cwd,
			lastExitCode,
			shellName,
			startError,
		});
	}, [connected, cwd, lastExitCode, onMetaChange, shellName, startError, tab.id]);

	const fitTerminal = useCallback(() => {
		const terminal = terminalRef.current;
		const fitAddon = fitAddonRef.current;
		if (!terminal || !fitAddon) {
			return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };
		}

		try {
			fitAddon.fit();
		} catch {
			return { cols: terminal.cols || DEFAULT_COLS, rows: terminal.rows || DEFAULT_ROWS };
		}

		return {
			cols: terminal.cols || DEFAULT_COLS,
			rows: terminal.rows || DEFAULT_ROWS,
		};
	}, []);

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

	const resizePty = useCallback(() => {
		if (!visible) return;
		const activeSessionKey = sessionKeyRef.current;
		if (!activeSessionKey) return;

		const { cols, rows } = fitTerminal();
		void invokeIpc<{ success: boolean }>("thread-terminal:resize", {
			sessionKey: activeSessionKey,
			cols,
			rows,
		}).catch(() => {});
	}, [fitTerminal, visible]);

	const scheduleResize = useCallback(() => {
		if (!visible) return;
		if (resizeFrameRef.current != null) {
			cancelAnimationFrame(resizeFrameRef.current);
		}

		resizeFrameRef.current = requestAnimationFrame(() => {
			resizeFrameRef.current = null;
			resizePty();
		});
	}, [resizePty, visible]);

	useEffect(() => {
		const container = terminalViewportRef.current;
		if (!container || terminalRef.current) return;

		const terminal = new Terminal({
			allowTransparency: true,
			convertEol: false,
			cursorBlink: true,
			disableStdin: true,
			fontFamily: window.getComputedStyle(container).fontFamily || "Menlo, Monaco, Consolas, monospace",
			fontSize: 12,
			lineHeight: 1.4,
			scrollback: 5000,
			theme: getTerminalTheme(container),
		});
		const fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);
		terminal.open(container);
		terminal.textarea?.setAttribute("aria-label", `${tab.title} 输入`);
		terminal.onData(writeInput);

		terminalRef.current = terminal;
		fitAddonRef.current = fitAddon;

		const focusFrame = requestAnimationFrame(() => {
			if (!focused || !visible) return;
			fitTerminal();
			terminal.focus();
		});

		return () => {
			cancelAnimationFrame(focusFrame);
			if (resizeFrameRef.current != null) {
				cancelAnimationFrame(resizeFrameRef.current);
				resizeFrameRef.current = null;
			}
			const activeSessionKey = sessionKeyRef.current;
			if (activeSessionKey) {
				void invokeIpc<{ success: boolean }>("thread-terminal:close", {
					sessionKey: activeSessionKey,
				}).catch(() => {});
			}
			fitAddonRef.current = null;
			terminalRef.current = null;
			terminal.dispose();
		};
	}, [fitTerminal, focused, tab.title, visible, writeInput]);

	useEffect(() => {
		const terminal = terminalRef.current;
		if (!terminal) return;

		const targetWorkspaceRoot = workspaceRoot.trim();
		if (!targetWorkspaceRoot) return;

		let cancelled = false;

		const startSession = async () => {
			sessionKeyRef.current = "";
			setSessionKey("");
			setShellName(tab.shellLabel);
			setCwd(targetWorkspaceRoot);
			setConnected(false);
			setStartError("");
			setLastExitCode(null);
			terminal.options.disableStdin = true;
			terminal.reset();
			terminal.writeln(`[Connecting] ${targetWorkspaceRoot}`);

			const { cols, rows } = fitTerminal();

			try {
				const result = await invokeIpc<ThreadTerminalStartResult>("thread-terminal:start", {
					workspaceRoot: targetWorkspaceRoot,
					terminalId: tab.id,
					shell: tab.shell,
					cols,
					rows,
				});
				if (cancelled) return;

				sessionKeyRef.current = result.sessionKey;
				setSessionKey(result.sessionKey);
				setShellName(result.shell || tab.shellLabel);
				setCwd(result.cwd || targetWorkspaceRoot);
				setConnected(true);
				setStartError("");
				setLastExitCode(null);
				terminal.reset();
				if (result.history) {
					terminal.write(result.history);
				}
				terminal.options.disableStdin = !focused;
				if (visible) {
					scheduleResize();
				}
				if (focused && visible) {
					requestAnimationFrame(() => {
						terminal.focus();
					});
				}
			} catch (error) {
				if (cancelled) return;
				const message = String(error);
				setConnected(false);
				setStartError(message);
				terminal.reset();
				terminal.writeln(`[Terminal start failed] ${message}`);
			}
		};

		void startSession();
		return () => {
			cancelled = true;
			terminal.options.disableStdin = true;
		};
	}, [fitTerminal, focused, scheduleResize, tab.id, tab.shell, tab.shellLabel, visible, workspaceRoot]);

	useEffect(() => {
		const unsubscribeData = subscribeHostEvent<ThreadTerminalDataEvent>(
			"thread-terminal:data",
			(payload) => {
				if (!payload || payload.sessionKey !== sessionKeyRef.current) return;
				terminalRef.current?.write(payload.data);
				setConnected(true);
			},
		);

		const unsubscribeExit = subscribeHostEvent<ThreadTerminalExitEvent>(
			"thread-terminal:exit",
			(payload) => {
				if (!payload || payload.sessionKey !== sessionKeyRef.current) return;
				setConnected(false);
				setLastExitCode(payload.exitCode);
				terminalRef.current?.writeln(`\r\n[Process exited ${payload.exitCode}]`);
			},
		);

		return () => {
			unsubscribeData();
			unsubscribeExit();
		};
	}, []);

	useEffect(() => {
		const terminal = terminalRef.current;
		if (!terminal) return;
		terminal.options.disableStdin = !focused || !connected || Boolean(startError);
		if (visible && connected && !startError) {
			scheduleResize();
		}
		if (focused && visible && connected && !startError) {
			requestAnimationFrame(() => {
				terminal.focus();
			});
		}
	}, [connected, focused, scheduleResize, startError, visible]);

	useEffect(() => {
		const container = terminalViewportRef.current;
		if (!container || !visible) return;

		const handleResize = () => {
			scheduleResize();
		};

		handleResize();
		window.addEventListener("resize", handleResize);

		if (typeof ResizeObserver === "undefined") {
			return () => {
				window.removeEventListener("resize", handleResize);
			};
		}

		const observer = new ResizeObserver(handleResize);
		observer.observe(container);
		return () => {
			window.removeEventListener("resize", handleResize);
			observer.disconnect();
		};
	}, [scheduleResize, visible]);

	return (
		<div
			className={cx(
				styles.threadTerminalView,
				visible ? styles.threadTerminalViewActive : styles.threadTerminalViewHidden,
				focused && visible && styles.threadTerminalViewFocused,
			)}
			style={layoutStyle}
			onMouseDown={() => {
				onRequestFocus(tab.id);
				terminalRef.current?.focus();
			}}
		>
			<div ref={terminalViewportRef} className={styles.threadTerminalViewport} />
		</div>
	);
}

export function ThreadTerminalPanel({
	branchLabel,
	workspaceRoot,
	onClose,
}: ThreadTerminalPanelProps) {
	const { styles, cx } = useMiniChatStyles();
	const hasWorkspaceRoot = workspaceRoot.trim().length > 0;
	const [shellOptions, setShellOptions] = useState<ThreadTerminalShellOption[]>([]);
	const [tabs, setTabs] = useState<TerminalTabDefinition[]>([]);
	const [focusedTabId, setFocusedTabId] = useState("");
	const [tabMeta, setTabMeta] = useState<Record<string, TerminalTabMeta>>({});
	const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
	const resizeStateRef = useRef<{ startHeight: number; startY: number } | null>(null);
	const [isResizing, setIsResizing] = useState(false);
	const [draggedTabId, setDraggedTabId] = useState("");
	const focusedTab = tabs.find((tab) => tab.id === focusedTabId) ?? tabs[0] ?? null;
	const focusedMeta = focusedTab ? tabMeta[focusedTab.id] : null;
	const activeTabId = focusedTab?.id || "";
	const panelTitle = !hasWorkspaceRoot
		? "先选择工作目录"
		: branchLabel?.trim()
			? `git:${branchLabel.trim()}`
			: compactPath(focusedMeta?.cwd || workspaceRoot);

	const createTab = useCallback((shellOverride?: string) => {
		if (!hasWorkspaceRoot) return;
		let createdTabId = "";
		const preferredShell = shellOverride || focusedTab?.shell || shellOptions[0]?.shell || "";

		setTabs((previous) => {
			const shellOption = shellOptions.find((option) => option.shell === preferredShell)
				?? shellOptions[0]
				?? null;
			const createdTab = createTerminalTab(shellOption, previous);
			createdTabId = createdTab.id;
			return [...previous, createdTab];
		});

		if (createdTabId) {
			setFocusedTabId(createdTabId);
		}
	}, [focusedTab?.shell, hasWorkspaceRoot, shellOptions]);

	useEffect(() => {
		if (!hasWorkspaceRoot) {
			setShellOptions([]);
			setTabs([]);
			setFocusedTabId("");
			setTabMeta({});
			return;
		}

		let cancelled = false;

		const loadShells = async () => {
			try {
				const result = await invokeIpc<ThreadTerminalListShellsResult>("thread-terminal:list-shells");
				if (cancelled) return;
				const nextShellOptions = result.shells.length > 0
					? result.shells
					: [{ id: "default-shell", label: "shell", shell: "" }];
				const initialTab = createTerminalTab(nextShellOptions[0] ?? null, []);
				setShellOptions(nextShellOptions);
				setTabs([initialTab]);
				setFocusedTabId(initialTab.id);
				setTabMeta({});
			} catch {
				if (cancelled) return;
				const fallbackShell = { id: "default-shell", label: "shell", shell: "" };
				const initialTab = createTerminalTab(fallbackShell, []);
				setShellOptions([fallbackShell]);
				setTabs([initialTab]);
				setFocusedTabId(initialTab.id);
				setTabMeta({});
			}
		};

		void loadShells();
		return () => {
			cancelled = true;
		};
	}, [hasWorkspaceRoot, workspaceRoot]);

	useEffect(() => {
		if (!isResizing) return;

		const handleMouseMove = (event: MouseEvent) => {
			const currentState = resizeStateRef.current;
			if (!currentState) return;
			const deltaY = currentState.startY - event.clientY;
			setPanelHeight(clampPanelHeight(currentState.startHeight + deltaY));
		};

		const handleMouseUp = () => {
			resizeStateRef.current = null;
			setIsResizing(false);
		};

		document.body.style.cursor = "ns-resize";
		document.body.style.userSelect = "none";
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizing]);

	const handleRequestFocus = useCallback((tabId: string) => {
		setFocusedTabId(tabId);
	}, []);

	const handleCloseTab = useCallback((tabId: string) => {
		const closedIndex = tabs.findIndex((tab) => tab.id === tabId);
		const nextTabs = tabs.filter((tab) => tab.id !== tabId);
		setTabs(nextTabs);
		setTabMeta((previous) => {
			const nextMeta = { ...previous };
			delete nextMeta[tabId];
			return nextMeta;
		});

		if (nextTabs.length === 0) {
			createTab();
			return;
		}

		if (focusedTabId === tabId) {
			const fallbackTab = nextTabs[Math.min(closedIndex, nextTabs.length - 1)] ?? nextTabs[0];
			setFocusedTabId(fallbackTab.id);
		}
	}, [createTab, focusedTabId, tabs]);

	const handleTabMetaChange = useCallback((tabId: string, meta: TerminalTabMeta) => {
		setTabMeta((previous) => {
			const current = previous[tabId];
			if (
				current
				&& current.connected === meta.connected
				&& current.cwd === meta.cwd
				&& current.lastExitCode === meta.lastExitCode
				&& current.shellName === meta.shellName
				&& current.startError === meta.startError
			) {
				return previous;
			}

			return {
				...previous,
				[tabId]: meta,
			};
		});
	}, []);

	const handleTabSelect = useCallback((tabId: string) => {
		setFocusedTabId(tabId);
	}, []);

	const handleTabDrop = useCallback((targetTabId: string) => {
		if (!draggedTabId || draggedTabId === targetTabId) return;
		setTabs((previous) => {
			const fromIndex = previous.findIndex((tab) => tab.id === draggedTabId);
			const toIndex = previous.findIndex((tab) => tab.id === targetTabId);
			if (fromIndex < 0 || toIndex < 0) return previous;
			return moveTab(previous, fromIndex, toIndex);
		});
		setDraggedTabId("");
	}, [draggedTabId]);

	return (
		<div className={styles.threadTerminalPanel}>
			<div
				className={styles.threadTerminalResizeHandle}
				onMouseDown={(event) => {
					resizeStateRef.current = {
						startHeight: panelHeight,
						startY: event.clientY,
					};
					setIsResizing(true);
				}}
			>
				<span className={styles.threadTerminalResizeGrip} />
			</div>
			<div className={styles.threadTerminalCard} style={{ height: panelHeight }} title={panelTitle}>
				<div className={styles.threadTerminalHeader}>
					<div
						className={styles.threadTerminalTabs}
						role="tablist"
						aria-label="终端标签页"
						title={panelTitle}
					>
						{tabs.map((tab) => {
							const isFocused = tab.id === activeTabId;
							return (
								<div
									key={tab.id}
									className={cx(
										styles.threadTerminalTab,
										isFocused && styles.threadTerminalTabActive,
									)}
									role="tab"
									aria-selected={isFocused}
									draggable
									onDragStart={() => {
										setDraggedTabId(tab.id);
									}}
									onDragOver={(event) => {
										event.preventDefault();
									}}
									onDrop={() => {
										handleTabDrop(tab.id);
									}}
									onDragEnd={() => {
										setDraggedTabId("");
									}}
								>
									<button
										type="button"
										className={styles.threadTerminalTabButton}
										onClick={() => handleTabSelect(tab.id)}
									>
										<span className={styles.threadTerminalTabLabel}>{tab.title}</span>
									</button>
									<button
										type="button"
										className={styles.threadTerminalTabClose}
										onClick={() => handleCloseTab(tab.id)}
										aria-label={`关闭 ${tab.title}`}
										title={`关闭 ${tab.title}`}
									>
										<X size={12} />
									</button>
								</div>
							);
						})}
					</div>
					<div className={styles.threadTerminalHeaderRight}>
						{hasWorkspaceRoot ? (
							<ActionIcon
								icon={Plus}
								size="small"
								className={styles.threadTerminalActionButton}
								onClick={() => createTab()}
								title="新建终端"
							/>
						) : null}
						{onClose ? (
							<ActionIcon
								icon={X}
								size="small"
								className={styles.threadTerminalHeaderClose}
								onClick={onClose}
								title="关闭终端面板"
							/>
						) : null}
					</div>
				</div>
				<div className={styles.threadTerminalBody}>
					{hasWorkspaceRoot ? (
						<div className={styles.threadTerminalViewportStack}>
							{tabs.map((tab) => {
								const visible = tab.id === activeTabId;
								return (
									<TerminalTabView
										key={tab.id}
										tab={tab}
										workspaceRoot={workspaceRoot}
										focused={tab.id === activeTabId}
										visible={visible}
										onMetaChange={handleTabMetaChange}
										onRequestFocus={handleRequestFocus}
									/>
								);
							})}
						</div>
					) : (
						<div className={styles.threadTerminalEmptyState}>
							<div className={styles.threadTerminalEmptyTitle}>先选择工作目录</div>
							<div className={styles.threadTerminalEmptyDescription}>
								选择工作目录后，这里会启动真实终端会话。
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
