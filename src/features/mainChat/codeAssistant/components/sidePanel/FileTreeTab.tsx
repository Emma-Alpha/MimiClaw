import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSidePanelStore } from "@/stores/sidePanel";
import { fetchProjectMentionEntries, type ProjectMentionEntry } from "@/lib/code-agent";
import { useCodeChatStyles } from "../../styles";
import { FileTreeNode } from "./FileTreeNode";

type FileTreeTabProps = {
	workspaceRoot: string;
};

export function FileTreeTab({ workspaceRoot }: FileTreeTabProps) {
	const { styles } = useCodeChatStyles();
	const fileTreeRoots = useSidePanelStore((s) => s.fileTreeRoots);
	const fileTreeLoading = useSidePanelStore((s) => s.fileTreeLoading);
	const loadFileTreeRoot = useSidePanelStore((s) => s.loadFileTreeRoot);
	const setPreviewTarget = useSidePanelStore((s) => s.setPreviewTarget);
	const setActiveTab = useSidePanelStore((s) => s.setActiveTab);

	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<ProjectMentionEntry[] | null>(null);
	const [searchLoading, setSearchLoading] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Load tree root on mount
	useEffect(() => {
		if (workspaceRoot && fileTreeRoots.length === 0) {
			void loadFileTreeRoot(workspaceRoot);
		}
	}, [workspaceRoot]); // eslint-disable-line react-hooks/exhaustive-deps

	// Debounced search
	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const q = e.target.value;
			setSearchQuery(q);

			if (debounceRef.current) clearTimeout(debounceRef.current);

			if (!q.trim()) {
				setSearchResults(null);
				setSearchLoading(false);
				return;
			}

			setSearchLoading(true);
			debounceRef.current = setTimeout(() => {
				void fetchProjectMentionEntries(workspaceRoot, q.trim())
					.then((entries) => {
						setSearchResults(entries);
						setSearchLoading(false);
					})
					.catch(() => {
						setSearchResults([]);
						setSearchLoading(false);
					});
			}, 250);
		},
		[workspaceRoot],
	);

	const handleSearchResultClick = useCallback(
		(entry: ProjectMentionEntry) => {
			if (entry.isDirectory) return;
			const ext = entry.name.includes(".") ? entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase() : "";
			setPreviewTarget({
				absolutePath: entry.absolutePath,
				relativePath: entry.relativePath,
				mimeType: ext ? `text/${ext.slice(1)}` : "text/plain",
			});
			setActiveTab("preview");
		},
		[setPreviewTarget, setActiveTab],
	);

	return (
		<div className={styles.fileTreeContainer}>
			{/* Search */}
			<div className={styles.fileTreeSearch}>
				<input
					type="text"
					className={styles.fileTreeSearchInput}
					placeholder="搜索文件..."
					value={searchQuery}
					onChange={handleSearchChange}
				/>
			</div>

			{/* Content */}
			<div className={styles.fileTreeList}>
				{fileTreeLoading || searchLoading ? (
					<div className={styles.fileTreeLoading}>
						<Loader2 size={14} className="animate-spin" />
						<span>加载中...</span>
					</div>
				) : searchResults !== null ? (
					// Search results (flat list)
					searchResults.length === 0 ? (
						<div className={styles.fileTreeEmpty}>未找到匹配文件</div>
					) : (
						searchResults.map((entry) => (
							// biome-ignore lint/a11y/useKeyWithClickEvents: search result item
							<div
								key={entry.absolutePath}
								className={styles.fileTreeNode}
								style={{ paddingLeft: "12px" }}
								onClick={() => handleSearchResultClick(entry)}
								title={entry.relativePath}
							>
								<span className={styles.fileTreeNodeName}>
									{entry.relativePath}
								</span>
							</div>
						))
					)
				) : fileTreeRoots.length === 0 ? (
					<div className={styles.fileTreeEmpty}>
						{workspaceRoot ? "空目录" : "请先选择工作区"}
					</div>
				) : (
					fileTreeRoots.map((node) => (
						<FileTreeNode
							key={node.absolutePath}
							node={node}
							depth={0}
							workspaceRoot={workspaceRoot}
						/>
					))
				)}
			</div>
		</div>
	);
}
