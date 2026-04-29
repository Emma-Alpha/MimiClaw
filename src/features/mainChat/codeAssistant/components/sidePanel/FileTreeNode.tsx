import { memo, useCallback } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { Dropdown, type MenuProps } from "antd";
import { invokeIpc } from "@/lib/api-client";
import { useSidePanelStore } from "@/stores/sidePanel";
import type { FileTreeNodeData } from "@/stores/sidePanel/types";
import { useCodeChatStyles } from "../../styles";

type FileTreeNodeProps = {
	node: FileTreeNodeData;
	depth: number;
	workspaceRoot: string;
};

function getFileExtension(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function getMimeTypeFromExt(ext: string): string {
	const map: Record<string, string> = {
		".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
		".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
		".bmp": "image/bmp", ".ico": "image/x-icon",
		".ts": "text/typescript", ".tsx": "text/typescript", ".js": "text/javascript",
		".jsx": "text/javascript", ".json": "application/json", ".md": "text/markdown",
		".css": "text/css", ".html": "text/html", ".py": "text/x-python",
		".rs": "text/x-rust", ".go": "text/x-go", ".yaml": "text/yaml",
		".yml": "text/yaml", ".toml": "text/toml", ".xml": "application/xml",
		".txt": "text/plain", ".sh": "text/x-sh", ".bash": "text/x-sh",
	};
	return map[ext] || "text/plain";
}

function FileTreeNodeImpl({ node, depth, workspaceRoot }: FileTreeNodeProps) {
	const { styles } = useCodeChatStyles();
	const expandedPaths = useSidePanelStore((s) => s.expandedPaths);
	const toggleExpanded = useSidePanelStore((s) => s.toggleExpanded);
	const loadDirectoryChildren = useSidePanelStore((s) => s.loadDirectoryChildren);
	const setPreviewTarget = useSidePanelStore((s) => s.setPreviewTarget);
	const setActiveTab = useSidePanelStore((s) => s.setActiveTab);

	const isExpanded = expandedPaths.includes(node.absolutePath);

	const handleClick = useCallback(() => {
		if (node.isDirectory) {
			toggleExpanded(node.absolutePath);
			if (!isExpanded && !node.loaded) {
				void loadDirectoryChildren(workspaceRoot, node.relativePath, node.absolutePath);
			}
		} else {
			const ext = getFileExtension(node.name);
			setPreviewTarget({
				absolutePath: node.absolutePath,
				relativePath: node.relativePath,
				mimeType: getMimeTypeFromExt(ext),
			});
			setActiveTab("preview");
		}
	}, [node, isExpanded, workspaceRoot, toggleExpanded, loadDirectoryChildren, setPreviewTarget, setActiveTab]);

	const contextMenuItems: MenuProps["items"] = [
		{
			key: "reveal",
			label: "在 Finder 中显示",
			onClick: () => {
				void invokeIpc("shell:showItemInFolder", node.absolutePath);
			},
		},
		{
			key: "copy-path",
			label: "复制路径",
			onClick: () => {
				void navigator.clipboard.writeText(node.absolutePath);
			},
		},
		{
			key: "copy-relative",
			label: "复制相对路径",
			onClick: () => {
				void navigator.clipboard.writeText(node.relativePath);
			},
		},
	];

	const FolderIcon = isExpanded ? FolderOpen : Folder;

	return (
		<>
			<Dropdown menu={{ items: contextMenuItems }} trigger={["contextMenu"]}>
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: tree node */}
				<div
					className={styles.fileTreeNode}
					style={{ paddingLeft: `${8 + depth * 16}px` }}
					onClick={handleClick}
					title={node.relativePath}
				>
					{node.isDirectory ? (
						<span className={styles.fileTreeNodeChevron}>
							{isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
						</span>
					) : (
						<span className={styles.fileTreeNodeChevron} />
					)}
					<span className={styles.fileTreeNodeIcon}>
						{node.isDirectory ? (
							<FolderIcon size={14} />
						) : (
							<FileText size={14} />
						)}
					</span>
					<span className={styles.fileTreeNodeName}>{node.name}</span>
				</div>
			</Dropdown>
			{node.isDirectory && isExpanded && node.children
				? node.children.map((child) => (
					<FileTreeNodeMemo
						key={child.absolutePath}
						node={child}
						depth={depth + 1}
						workspaceRoot={workspaceRoot}
					/>
				))
				: null}
		</>
	);
}

const FileTreeNodeMemo = memo(FileTreeNodeImpl);
export { FileTreeNodeMemo as FileTreeNode };
