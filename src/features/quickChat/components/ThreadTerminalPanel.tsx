import { ActionIcon } from "@lobehub/ui";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { Columns2, Plus, X } from "lucide-react";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
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
const DEFAULT_SPLIT_RATIO = 0.5;
const MIN_SPLIT_RATIO = 0.28;
const MAX_SPLIT_RATIO = 0.72;

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

function clampSplitRatio(nextRatio: number): number {
	return Math.max(MIN_SPLIT_RATIO, Math.min(MAX_SPLIT_RATIO, nextRatio));
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

function getFallbackTabId(
	tabs: TerminalTabDefinition[],
	excludedTabIds: string[],
): string {
	for (const tab of tabs) {
		if (!excludedTabIds.includes(tab.id)) {
			return tab.id;
		}
	}
	return tabs[0]?.id || "";
}

function normalizePaneState(
	tabs: TerminalTabDefinition[],
	paneTabIds: string[],
	focusedPaneIndex: number,
): { focusedPaneIndex: number; paneTabIds: string[] } {
	if (tabs.length === 0) {
		return { focusedPaneIndex: 0, paneTabIds: [] };
	}

	const visibleTabs = paneTabIds
		.map((paneTabId) => tabs.find((tab) => tab.id === paneTabId)?.id)
		.filter((paneTabId): paneTabId is string => Boolean(paneTabId));

	if (visibleTabs.length === 0) {
		return { focusedPaneIndex: 0, paneTabIds: [tabs[0].id] };
	}

	if (visibleTabs.length === 1) {
		return { focusedPaneIndex: 0, paneTabIds: [visibleTabs[0]] };
	}

	if (visibleTabs[0] === visibleTabs[1]) {
		const fallbackTabId = getFallbackTabId(tabs, [visibleTabs[0]]);
		return {
			focusedPaneIndex: Math.min(1, focusedPaneIndex),
			paneTabIds: [visibleTabs[0], fallbackTabId],
		};
	}

	return {
		focusedPaneIndex: Math.min(1, focusedPaneIndex),
		paneTabIds: visibleTabs.slice(0, 2),
	};
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
	const [shellOptions, setShellOptions] = useState<ThreadTerminalShellOption[]>([]);
	const [selectedShell, setSelectedShell] = useState("");
	const [tabs, setTabs] = useState<TerminalTabDefinition[]>([]);
	const [paneTabIds, setPaneTabIds] = useState<string[]>([]);
	const [focusedPaneIndex, setFocusedPaneIndex] = useState(0);
	const [tabMeta, setTabMeta] = useState<Record<string, TerminalTabMeta>>({});
	const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
	const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT_RATIO);
	const resizeStateRef = useRef<{ startHeight: number; startY: number } | null>(null);
	const splitResizeStateRef = useRef<{ containerWidth: number; containerLeft: number } | null>(null);
	const [isResizing, setIsResizing] = useState(false);
	const [isSplitResizing, setIsSplitResizing] = useState(false);
	const [draggedTabId, setDraggedTabId] = useState("");
	const splitContainerRef = useRef<HTMLDivElement | null>(null);

	const createTab = useCallback((shellOverride?: string, options?: { asSecondPane?: boolean }) => {
		let createdTab: TerminalTabDefinition | null = null;

		setTabs((previous) => {
			const shellOption = shellOptions.find((option) => option.shell === (shellOverride || selectedShell))
				?? shellOptions[0]
				?? null;
			createdTab = createTerminalTab(shellOption, previous);
			return createdTab ? [...previous, createdTab] : previous;
		});

		if (!createdTab) return;

		if (options?.asSecondPane) {
			setPaneTabIds((previous) => {
				const current = previous[0] || createdTab?.id || "";
				return current ? [current, createdTab!.id] : [createdTab!.id];
			});
			setFocusedPaneIndex(1);
		} else {
			setPaneTabIds((previous) => {
				if (previous.length >= 2) {
					const nextPaneTabIds = [...previous];
					nextPaneTabIds[Math.min(focusedPaneIndex, nextPaneTabIds.length - 1)] = createdTab!.id;
					return nextPaneTabIds;
				}
				return [createdTab!.id];
			});
			setFocusedPaneIndex((previous) => (options?.asSecondPane ? 1 : Math.min(previous, 1)));
		}
	}, [focusedPaneIndex, selectedShell, shellOptions]);

	useEffect(() => {
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
				setSelectedShell(nextShellOptions[0]?.shell || "");
				setTabs([initialTab]);
				setPaneTabIds([initialTab.id]);
				setFocusedPaneIndex(0);
				setTabMeta({});
			} catch {
				if (cancelled) return;
				const fallbackShell = { id: "default-shell", label: "shell", shell: "" };
				const initialTab = createTerminalTab(fallbackShell, []);
				setShellOptions([fallbackShell]);
				setSelectedShell(fallbackShell.shell);
				setTabs([initialTab]);
				setPaneTabIds([initialTab.id]);
				setFocusedPaneIndex(0);
				setTabMeta({});
			}
		};

		void loadShells();
		return () => {
			cancelled = true;
		};
	}, [workspaceRoot]);

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

	useEffect(() => {
		if (!isSplitResizing) return;

		const handleMouseMove = (event: MouseEvent) => {
			const currentState = splitResizeStateRef.current;
			if (!currentState || currentState.containerWidth <= 0) return;
			const nextRatio = (event.clientX - currentState.containerLeft) / currentState.containerWidth;
			setSplitRatio(clampSplitRatio(nextRatio));
		};

		const handleMouseUp = () => {
			splitResizeStateRef.current = null;
			setIsSplitResizing(false);
		};

		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isSplitResizing]);

	const normalizedPaneState = useMemo(
		() => normalizePaneState(tabs, paneTabIds, focusedPaneIndex),
		[focusedPaneIndex, paneTabIds, tabs],
	);
	const visiblePaneTabIds = normalizedPaneState.paneTabIds;
	const visibleTabs = visiblePaneTabIds
		.map((paneTabId) => tabs.find((tab) => tab.id === paneTabId) ?? null)
		.filter((tab): tab is TerminalTabDefinition => Boolean(tab));
	const isSplitView = visibleTabs.length === 2;
	const focusedTabId = visiblePaneTabIds[normalizedPaneState.focusedPaneIndex] || visiblePaneTabIds[0] || "";
	const focusedTab = tabs.find((tab) => tab.id === focusedTabId) ?? visibleTabs[0] ?? null;
	const focusedMeta = focusedTab ? tabMeta[focusedTab.id] : null;
	const metaLabel = useMemo(() => {
		if (branchLabel?.trim()) return `git:${branchLabel.trim()}`;
		return compactPath(focusedMeta?.cwd || workspaceRoot);
	}, [branchLabel, focusedMeta?.cwd, workspaceRoot]);
	const statusLabel = focusedMeta?.startError
		? "启动失败"
		: focusedMeta?.connected
			? "已连接"
			: focusedMeta?.lastExitCode == null
				? "连接中"
				: `已退出 (${focusedMeta.lastExitCode})`;
	const headerMetaLabel = `${statusLabel} · ${metaLabel}`;

	const handleRequestFocus = useCallback((tabId: string) => {
		const paneIndex = visiblePaneTabIds.findIndex((paneTabId) => paneTabId === tabId);
		if (paneIndex >= 0) {
			setFocusedPaneIndex(paneIndex);
			return;
		}

		setPaneTabIds((previous) => {
			if (previous.length >= 2) {
				const nextPaneTabIds = [...previous];
				nextPaneTabIds[Math.min(normalizedPaneState.focusedPaneIndex, nextPaneTabIds.length - 1)] = tabId;
				return nextPaneTabIds;
			}
			return [tabId];
		});
	}, [normalizedPaneState.focusedPaneIndex, visiblePaneTabIds]);

	const handleCloseTab = useCallback((tabId: string) => {
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

		const nextVisiblePaneTabIds = visiblePaneTabIds.filter((paneTabId) => paneTabId !== tabId);
		if (nextVisiblePaneTabIds.length === 0) {
			setPaneTabIds([nextTabs[0].id]);
			setFocusedPaneIndex(0);
			return;
		}

		if (nextVisiblePaneTabIds.length === 1) {
			setPaneTabIds([nextVisiblePaneTabIds[0]]);
			setFocusedPaneIndex(0);
			return;
		}

		setPaneTabIds(nextVisiblePaneTabIds.slice(0, 2));
		setFocusedPaneIndex(Math.min(normalizedPaneState.focusedPaneIndex, 1));
	}, [createTab, normalizedPaneState.focusedPaneIndex, tabs, visiblePaneTabIds]);

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
		const existingPaneIndex = visiblePaneTabIds.findIndex((paneTabId) => paneTabId === tabId);
		if (existingPaneIndex >= 0) {
			setFocusedPaneIndex(existingPaneIndex);
			return;
		}

		if (visiblePaneTabIds.length >= 2) {
			setPaneTabIds((previous) => {
				const nextPaneTabIds = [...previous];
				nextPaneTabIds[Math.min(normalizedPaneState.focusedPaneIndex, nextPaneTabIds.length - 1)] = tabId;
				return nextPaneTabIds;
			});
			return;
		}

		setPaneTabIds([tabId]);
		setFocusedPaneIndex(0);
	}, [normalizedPaneState.focusedPaneIndex, visiblePaneTabIds]);

	const handleSplitView = useCallback(() => {
		if (visiblePaneTabIds.length >= 2) {
			setPaneTabIds([visiblePaneTabIds[Math.min(normalizedPaneState.focusedPaneIndex, visiblePaneTabIds.length - 1)] || visiblePaneTabIds[0]]);
			setFocusedPaneIndex(0);
			return;
		}

		const primaryTabId = focusedTabId || tabs[0]?.id || "";
		const secondaryTabId = tabs.find((tab) => tab.id !== primaryTabId)?.id;
		if (primaryTabId && secondaryTabId) {
			setPaneTabIds([primaryTabId, secondaryTabId]);
			setFocusedPaneIndex(1);
			return;
		}

		createTab(undefined, { asSecondPane: true });
	}, [createTab, focusedTabId, normalizedPaneState.focusedPaneIndex, tabs, visiblePaneTabIds]);

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

	const paneLayouts = useMemo(() => {
		if (!isSplitView) {
			return visiblePaneTabIds[0]
				? {
					[visiblePaneTabIds[0]]: { inset: 0 },
				}
				: {};
		}

		const leftPercent = splitRatio * 100;
		return {
			[visiblePaneTabIds[0]]: {
				left: 0,
				top: 0,
				bottom: 0,
				width: `calc(${leftPercent}% - 4px)`,
			},
			[visiblePaneTabIds[1]]: {
				left: `calc(${leftPercent}% + 4px)`,
				top: 0,
				bottom: 0,
				right: 0,
			},
		} as Record<string, CSSProperties>;
	}, [isSplitView, splitRatio, visiblePaneTabIds]);

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
			<div className={styles.threadTerminalCard} style={{ height: panelHeight }}>
				<div className={styles.threadTerminalHeader}>
					<div className={styles.threadTerminalTabs} role="tablist" aria-label="终端标签页">
						{tabs.map((tab) => {
							const meta = tabMeta[tab.id];
							const isVisible = visiblePaneTabIds.includes(tab.id);
							const isFocused = tab.id === focusedTabId;
							return (
								<div
									key={tab.id}
									className={cx(
										styles.threadTerminalTab,
										isFocused && styles.threadTerminalTabActive,
										isVisible && styles.threadTerminalTabVisible,
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
											<span
												className={cx(
													styles.threadTerminalStatusDot,
												meta?.connected
													? styles.threadTerminalStatusDotLive
													: styles.threadTerminalStatusDotIdle,
											)}
											aria-hidden="true"
										/>
										<span className={styles.threadTerminalTabLabel}>{meta?.shellName || tab.title}</span>
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
					<div className={styles.threadTerminalHeaderMeta} title={focusedMeta?.cwd || workspaceRoot}>
						<span className={styles.threadTerminalHeaderMetaShell}>
							{focusedMeta?.shellName || focusedTab?.shellLabel || "shell"}
						</span>
						<span className={styles.threadTerminalHeaderMetaText}>{headerMetaLabel}</span>
					</div>
					<div className={styles.threadTerminalHeaderRight}>
						<ActionIcon
							icon={Plus}
							size="small"
							className={cx(
								styles.threadTerminalActionButton,
							)}
							onClick={() => createTab()}
							title="新建终端"
						/>
						<label className={styles.threadTerminalShellSelectWrap} title="默认新建 shell">
							<select
								className={styles.threadTerminalShellSelect}
								value={selectedShell}
								onChange={(event) => setSelectedShell(event.target.value)}
							>
								{shellOptions.map((option) => (
									<option key={option.id} value={option.shell}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<ActionIcon
							icon={Columns2}
							size="small"
							className={cx(
								styles.threadTerminalActionButton,
								isSplitView && styles.threadTerminalActionButtonActive,
							)}
							onClick={handleSplitView}
							title={isSplitView ? "退出分屏" : "分屏显示"}
						/>
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
				<div ref={splitContainerRef} className={styles.threadTerminalBody}>
					<div className={styles.threadTerminalViewportStack}>
						{tabs.map((tab) => {
							const paneIndex = visiblePaneTabIds.findIndex((paneTabId) => paneTabId === tab.id);
							const visible = paneIndex >= 0;
							return (
								<TerminalTabView
									key={tab.id}
									tab={tab}
									workspaceRoot={workspaceRoot}
									focused={tab.id === focusedTabId}
									visible={visible}
									layoutStyle={visible ? paneLayouts[tab.id] : undefined}
									onMetaChange={handleTabMetaChange}
									onRequestFocus={handleRequestFocus}
								/>
							);
						})}
						{isSplitView ? (
							<div
								className={styles.threadTerminalSplitHandle}
								style={{ left: `${splitRatio * 100}%` }}
								onMouseDown={() => {
									const rect = splitContainerRef.current?.getBoundingClientRect();
									if (!rect) return;
									splitResizeStateRef.current = {
										containerLeft: rect.left,
										containerWidth: rect.width,
									};
									setIsSplitResizing(true);
								}}
							>
								<span className={styles.threadTerminalSplitGrip} />
							</div>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
