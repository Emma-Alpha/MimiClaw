import { useCallback } from "react";
import { FileText, GitCompareArrows } from "lucide-react";
import { useSidePanelStore } from "@/stores/sidePanel";
import type { ChangedFileEntry } from "@/stores/sidePanel/selectors";
import { useCodeChatStyles } from "../../styles";

type ChangedFilesTabProps = {
	changedFiles: ChangedFileEntry[];
	workspaceRoot: string;
};

function getFileName(filePath: string): string {
	const parts = filePath.split(/[\\/]/);
	return parts[parts.length - 1] || filePath;
}

function getRelativePath(filePath: string, workspaceRoot: string): string {
	if (workspaceRoot && filePath.startsWith(workspaceRoot)) {
		const rel = filePath.slice(workspaceRoot.length);
		return rel.startsWith("/") ? rel.slice(1) : rel;
	}
	return filePath;
}

export function ChangedFilesTab({ changedFiles, workspaceRoot }: ChangedFilesTabProps) {
	const { styles } = useCodeChatStyles();
	const setPreviewTarget = useSidePanelStore((s) => s.setPreviewTarget);
	const setActiveTab = useSidePanelStore((s) => s.setActiveTab);

	const handleClick = useCallback(
		(entry: ChangedFileEntry) => {
			setPreviewTarget({
				absolutePath: entry.filePath,
				relativePath: getRelativePath(entry.filePath, workspaceRoot),
				mimeType: "text/plain",
				diffPatch: entry.patch,
			});
			setActiveTab("preview");
		},
		[workspaceRoot, setPreviewTarget, setActiveTab],
	);

	if (changedFiles.length === 0) {
		return (
			<div className={styles.changedFilesEmpty}>
				<GitCompareArrows size={24} />
				<span>本次会话暂无文件变更</span>
			</div>
		);
	}

	return (
		<div className={styles.changedFilesList}>
			{changedFiles.map((entry) => {
				const name = getFileName(entry.filePath);
				const rel = getRelativePath(entry.filePath, workspaceRoot);
				return (
					// biome-ignore lint/a11y/useKeyWithClickEvents: changed file row
					<div
						key={entry.filePath}
						className={styles.changedFileRow}
						onClick={() => handleClick(entry)}
						title={rel}
					>
						<span className={styles.changedFileIcon}>
							<FileText size={14} />
						</span>
						<span className={styles.changedFileName}>{rel || name}</span>
						<span
							className={
								entry.changeType === "added"
									? styles.changedFileBadgeAdded
									: styles.changedFileBadgeModified
							}
						>
							{entry.changeType === "added" ? "A" : "M"}
						</span>
						<span className={styles.changedFileStats}>
							{entry.additions > 0 ? `+${entry.additions}` : ""}
							{entry.additions > 0 && entry.deletions > 0 ? " " : ""}
							{entry.deletions > 0 ? `-${entry.deletions}` : ""}
						</span>
					</div>
				);
			})}
		</div>
	);
}
