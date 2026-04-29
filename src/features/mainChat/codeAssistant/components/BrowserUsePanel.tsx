import { ActionIcon } from "@lobehub/ui";
import { Code2, Crop, Globe, Loader2, MousePointer2, RotateCcw, X } from "lucide-react";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { invokeIpc } from "@/lib/api-client";
import { subscribeHostEvent } from "@/lib/host-events";
import { useInspectorStore } from "@/stores/inspector";
import type { BrowserUseCursorEvent, BrowserUseStatus } from "../../../../../shared/browser-use";
import type { InspectorElementData, InspectorMode, AreaScreenshotResult } from "../../../../../shared/browser-inspector";
import { useCodeChatStyles } from "../styles";
import { InspectorSidebar } from "./InspectorSidebar";

type BrowserUsePanelProps = {
	onClose?: () => void;
};

const DEFAULT_PANEL_WIDTH = 480;
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 800;

function clampPanelWidth(next: number): number {
	return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, Math.round(next)));
}

export function BrowserUsePanel({ onClose }: BrowserUsePanelProps) {
	const { styles, cx } = useCodeChatStyles();
	const webviewRef = useRef<HTMLWebViewElement | null>(null);

	const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
	const [currentUrl, setCurrentUrl] = useState("about:blank");
	const [title, setTitle] = useState("");
	const [loading, setLoading] = useState(false);
	const [cursorEvent, setCursorEvent] = useState<BrowserUseCursorEvent | null>(null);
	const [cursorAction, setCursorAction] = useState<"move" | "click" | "scroll">("move");
	const [attached, setAttached] = useState(false);

	const resizingRef = useRef(false);
	const startXRef = useRef(0);
	const startWidthRef = useRef(DEFAULT_PANEL_WIDTH);
	const attachedRef = useRef(false);

	// Inspector store
	const inspectorMode = useInspectorStore((s) => s.mode);
	const inspectorEnabled = useInspectorStore((s) => s.enabled);
	const sidebarVisible = useInspectorStore((s) => s.sidebarVisible);
	const inspectorEnable = useInspectorStore((s) => s.enable);
	const inspectorDisable = useInspectorStore((s) => s.disable);
	const inspectorSetMode = useInspectorStore((s) => s.setMode);
	const inspectorToggleSidebar = useInspectorStore((s) => s.toggleSidebar);
	const inspectorSelectElement = useInspectorStore((s) => s.selectElement);
	const inspectorHoverElement = useInspectorStore((s) => s.hoverElement);
	const inspectorSetAreaScreenshot = useInspectorStore((s) => s.setAreaScreenshot);

	// ─── Webview lifecycle ─────────────────────────────────────────────────────

	useEffect(() => {
		const webview = webviewRef.current;
		if (!webview) return;

		const handleDomReady = () => {
			try {
				const webContentsId = (webview as unknown as { getWebContentsId(): number }).getWebContentsId();
				void invokeIpc("browser-use:attach", webContentsId).then(() => {
					attachedRef.current = true;
					setAttached(true);
					// Enable inspector after browser-use attaches
					void inspectorEnable(webContentsId);
				}).catch((err) => {
					console.error("[BrowserUsePanel] Failed to attach:", err);
				});
			} catch (err) {
				console.error("[BrowserUsePanel] Failed to get webContentsId:", err);
			}
		};

		webview.addEventListener("dom-ready", handleDomReady);

		return () => {
			webview.removeEventListener("dom-ready", handleDomReady);
			if (attachedRef.current) {
				attachedRef.current = false;
				void invokeIpc("browser-use:detach").catch(() => {});
			}
			void inspectorDisable();
			setAttached(false);
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// ─── Subscribe to status events ────────────────────────────────────────────

	useEffect(() => {
		return subscribeHostEvent<BrowserUseStatus>("browser-use:status", (status) => {
			setCurrentUrl(status.currentUrl || "about:blank");
			setTitle(status.title || "");
			setLoading(status.loading);
		});
	}, []);

	// ─── Subscribe to cursor events ────────────────────────────────────────────

	useEffect(() => {
		return subscribeHostEvent<BrowserUseCursorEvent>("browser-use:cursor", (event) => {
			setCursorEvent(event);
			setCursorAction(event.action);

			if (event.action === "click") {
				setTimeout(() => setCursorAction("move"), 300);
			}
		});
	}, []);

	// ─── Subscribe to inspector events ─────────────────────────────────────────

	useEffect(() => {
		const unsubs = [
			subscribeHostEvent<InspectorElementData>("inspector:element-selected", (data) => {
				inspectorSelectElement(data);
			}),
			subscribeHostEvent<InspectorElementData>("inspector:element-hovered", (data) => {
				inspectorHoverElement(data);
			}),
			subscribeHostEvent<InspectorMode>("inspector:mode-changed", (mode) => {
				useInspectorStore.setState({ mode });
			}),
			subscribeHostEvent<AreaScreenshotResult>("inspector:area-screenshot", (data) => {
				inspectorSetAreaScreenshot(data);
			}),
		];
		return () => {
			for (const unsub of unsubs) unsub();
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// ─── Horizontal resize ────────────────────────────────────────────────────

	const handleResizeStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		resizingRef.current = true;
		startXRef.current = e.clientX;
		startWidthRef.current = panelWidth;

		const handleMouseMove = (moveEvent: MouseEvent) => {
			if (!resizingRef.current) return;
			// Dragging left → panel grows (negative deltaX)
			const deltaX = startXRef.current - moveEvent.clientX;
			setPanelWidth(clampPanelWidth(startWidthRef.current + deltaX));
		};

		const handleMouseUp = () => {
			resizingRef.current = false;
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	}, [panelWidth]);

	// ─── Actions ───────────────────────────────────────────────────────────────

	const handleReload = useCallback(() => {
		if (!attached) return;
		void invokeIpc("browser-use:execute", {
			commandId: `reload-${Date.now()}`,
			kind: "reload",
			params: {},
		}).catch(() => {});
	}, [attached]);

	const handleClose = useCallback(() => {
		if (attachedRef.current) {
			attachedRef.current = false;
			void invokeIpc("browser-use:detach").catch(() => {});
		}
		void inspectorDisable();
		onClose?.();
	}, [onClose, inspectorDisable]);

	const handleTogglePicker = useCallback(() => {
		if (!inspectorEnabled) return;
		void inspectorSetMode(inspectorMode === "picker" ? "off" : "picker");
	}, [inspectorEnabled, inspectorMode, inspectorSetMode]);

	const handleToggleAreaScreenshot = useCallback(() => {
		if (!inspectorEnabled) return;
		void inspectorSetMode(inspectorMode === "area-screenshot" ? "off" : "area-screenshot");
	}, [inspectorEnabled, inspectorMode, inspectorSetMode]);

	// ─── Render ────────────────────────────────────────────────────────────────

	const panelStyle: CSSProperties = {
		width: `${panelWidth}px`,
	};

	const isPickerActive = inspectorMode === "picker";
	const isAreaActive = inspectorMode === "area-screenshot";

	return (
		<div className={styles.browserUsePanel} style={panelStyle}>
			{/* Resize handle (left edge) */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: resize drag handle */}
			<div className={styles.browserUseResizeHandle} onMouseDown={handleResizeStart}>
				<div className={styles.browserUseResizeGrip} />
			</div>

			<div className={styles.browserUseCard}>
				{/* Header: URL bar + controls */}
				<div className={styles.browserUseHeader}>
					<div className={styles.browserUseUrlBar}>
						<span className={styles.browserUseUrlIcon}>
							{loading ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
						</span>
						<span className={styles.browserUseUrlText} title={title || currentUrl}>
							{currentUrl}
						</span>
					</div>
					<div className={styles.browserUseHeaderRight}>
						<ActionIcon
							icon={MousePointer2}
							onClick={handleTogglePicker}
							size="small"
							title="Element Picker"
							active={isPickerActive}
						/>
						<ActionIcon
							icon={Code2}
							onClick={inspectorToggleSidebar}
							size="small"
							title="DOM Tree"
							active={sidebarVisible}
						/>
						<ActionIcon
							icon={Crop}
							onClick={handleToggleAreaScreenshot}
							size="small"
							title="Area Screenshot"
							active={isAreaActive}
						/>
						<ActionIcon
							icon={RotateCcw}
							onClick={handleReload}
							size="small"
							title="Reload"
						/>
						<ActionIcon
							icon={X}
							onClick={handleClose}
							size="small"
							title="Close"
						/>
					</div>
				</div>

				{/* Browser body */}
				<div className={cx(styles.browserUseBody, isPickerActive && styles.inspectorPickerActive)}>
					<webview
						ref={webviewRef}
						className={styles.browserUseWebview}
						partition="persist:browser-use"
						src="about:blank"
					/>

					{/* AI cursor overlay — hidden during picker mode */}
					{cursorEvent && !isPickerActive && (
						<div
							className={styles.browserUseCursor}
							style={{ left: cursorEvent.x, top: cursorEvent.y }}
						>
							<div
								className={cx(
									styles.browserUseCursorDot,
									cursorAction === "click" && styles.browserUseCursorClick,
								)}
							/>
						</div>
					)}

					{/* Inspector sidebar */}
					{sidebarVisible && <InspectorSidebar />}
				</div>
			</div>
		</div>
	);
}
