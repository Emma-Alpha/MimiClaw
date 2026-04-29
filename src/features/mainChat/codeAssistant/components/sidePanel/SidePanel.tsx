import {
	type CSSProperties,
	useCallback,
	useRef,
	useState,
} from "react";
import { ActionIcon } from "@lobehub/ui";
import { Files, GitCompareArrows, Globe, Eye, X } from "lucide-react";
import { useSidePanelStore } from "@/stores/sidePanel";
import { useChatStore } from "@/stores/chat";
import { deriveChangedFiles } from "@/stores/sidePanel/selectors";
import type { SidePanelTab } from "@/stores/sidePanel/types";
import { useCodeChatStyles } from "../../styles";
import { BrowserPanelContent } from "../BrowserUsePanel";
import { FileTreeTab } from "./FileTreeTab";
import { ChangedFilesTab } from "./ChangedFilesTab";
import { PreviewTab } from "./PreviewTab";

type SidePanelProps = {
	workspaceRoot: string;
	onClose?: () => void;
};

const DEFAULT_PANEL_WIDTH = 480;
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 800;

function clampPanelWidth(next: number): number {
	return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, Math.round(next)));
}

type TabDef = {
	key: SidePanelTab;
	label: string;
	icon: typeof Files;
};

const TABS: TabDef[] = [
	{ key: "files", label: "文件", icon: Files },
	{ key: "changes", label: "变更", icon: GitCompareArrows },
	{ key: "browser", label: "浏览器", icon: Globe },
	{ key: "preview", label: "预览", icon: Eye },
];

export function SidePanel({ workspaceRoot, onClose }: SidePanelProps) {
	const { styles, cx } = useCodeChatStyles();

	const activeTab = useSidePanelStore((s) => s.activeTab);
	const setActiveTab = useSidePanelStore((s) => s.setActiveTab);

	const items = useChatStore((s) => s.items);
	const changedFiles = deriveChangedFiles(items ?? []);
	const changedCount = changedFiles.length;

	const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
	const resizingRef = useRef(false);
	const startXRef = useRef(0);
	const startWidthRef = useRef(DEFAULT_PANEL_WIDTH);

	// ─── Horizontal resize ────────────────────────────────────────────────────

	const handleResizeStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		resizingRef.current = true;
		startXRef.current = e.clientX;
		startWidthRef.current = panelWidth;

		const handleMouseMove = (moveEvent: MouseEvent) => {
			if (!resizingRef.current) return;
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

			<div className={styles.sidePanelCard}>
				{/* Tab bar */}
				<div className={styles.sidePanelTabBar}>
					<div className={styles.sidePanelTabList}>
						{TABS.map((tab) => (
							<button
								key={tab.key}
								type="button"
								className={cx(
									styles.sidePanelTab,
									activeTab === tab.key && styles.sidePanelTabActive,
								)}
								onClick={() => setActiveTab(tab.key)}
								title={tab.label}
							>
								<tab.icon size={14} />
								<span className={styles.sidePanelTabLabel}>{tab.label}</span>
								{tab.key === "changes" && changedCount > 0 ? (
									<span className={styles.sidePanelTabBadge}>{changedCount}</span>
								) : null}
							</button>
						))}
					</div>
					<ActionIcon
						icon={X}
						onClick={onClose}
						size="small"
						title="关闭面板"
					/>
				</div>

				{/* Tab content */}
				<div className={styles.sidePanelContent}>
					{activeTab === "files" && (
						<FileTreeTab workspaceRoot={workspaceRoot} />
					)}
					{activeTab === "changes" && (
						<ChangedFilesTab changedFiles={changedFiles} workspaceRoot={workspaceRoot} />
					)}
					{/* Browser tab stays mounted for webview state preservation */}
					<div style={{ display: activeTab === "browser" ? "flex" : "none", flex: 1, flexDirection: "column", overflow: "hidden" }}>
						<BrowserPanelContent />
					</div>
					{activeTab === "preview" && (
						<PreviewTab workspaceRoot={workspaceRoot} />
					)}
				</div>
			</div>
		</div>
	);
}
