import { ActionIcon } from "@lobehub/ui";
import { Globe, Loader2, RotateCcw, X } from "lucide-react";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { invokeIpc } from "@/lib/api-client";
import { subscribeHostEvent } from "@/lib/host-events";
import type { BrowserUseCursorEvent, BrowserUseStatus } from "../../../../../shared/browser-use";
import { useCodeChatStyles } from "../styles";

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

	// ─── Webview lifecycle ─────────────────────────────────────────────────────

	useEffect(() => {
		const webview = webviewRef.current;
		if (!webview) return;

		const handleDomReady = () => {
			try {
				const webContentsId = (webview as unknown as { getWebContentsId(): number }).getWebContentsId();
				void invokeIpc("browser-use:attach", webContentsId).then(() => {
					setAttached(true);
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
			void invokeIpc("browser-use:detach").catch(() => {});
			setAttached(false);
		};
	}, []);

	// ─── Subscribe to status events ────────────────────────────────────────────

	useEffect(() => {
		return subscribeHostEvent<BrowserUseStatus>("browser-use:status-changed", (status) => {
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
		void invokeIpc("browser-use:detach").catch(() => {});
		onClose?.();
	}, [onClose]);

	// ─── Render ────────────────────────────────────────────────────────────────

	const panelStyle: CSSProperties = {
		width: `${panelWidth}px`,
	};

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
				<div className={styles.browserUseBody}>
					<webview
						ref={webviewRef}
						className={styles.browserUseWebview}
						partition="persist:browser-use"
						src="about:blank"
					/>

					{/* AI cursor overlay */}
					{cursorEvent && (
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
				</div>
			</div>
		</div>
	);
}
