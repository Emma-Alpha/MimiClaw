import { useState } from "react";
import { createStyles } from "antd-style";
import { invokeIpc } from "@/lib/api-client";
import type { DiffFile } from "@/stores/code-agent";

interface Props {
	files: DiffFile[];
	workspaceRoot?: string;
}

const useStyles = createStyles(({ css, token }) => ({
	wrap: css`
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 6px;
		overflow: hidden;
		font-family: ${token.fontFamilyCode};
		font-size: 11px;
		margin: 4px 0;
	`,
	fileHeader: css`
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		background: ${token.colorFillTertiary};
		cursor: pointer;
		user-select: none;
		&:hover { background: ${token.colorFillSecondary}; }
	`,
	filePath: css`
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: ${token.colorText};
		font-weight: 500;
	`,
	badge: css`
		font-size: 10px;
		padding: 1px 5px;
		border-radius: 4px;
		font-weight: 600;
	`,
	addBadge: css`
		background: rgba(46,160,67,0.15);
		color: #2ea043;
	`,
	delBadge: css`
		background: rgba(218,54,51,0.15);
		color: #da3633;
	`,
	chevron: css`
		color: ${token.colorTextTertiary};
		font-size: 10px;
		transition: transform 0.15s;
	`,
	chevronOpen: css`transform: rotate(90deg);`,
	diffBody: css`
		overflow-x: auto;
		max-height: 320px;
		overflow-y: auto;
	`,
	diffTable: css`
		width: 100%;
		border-collapse: collapse;
	`,
	lineAdded: css`
		background: rgba(46,160,67,0.1);
		td { color: #2ea043; }
	`,
	lineRemoved: css`
		background: rgba(218,54,51,0.1);
		td { color: #da3633; }
	`,
	lineContext: css``,
	lineHunk: css`
		background: ${token.colorFillTertiary};
		td { color: ${token.colorTextTertiary}; font-style: italic; }
	`,
	lineNum: css`
		width: 32px;
		min-width: 32px;
		padding: 0 4px;
		text-align: right;
		color: ${token.colorTextQuaternary};
		border-right: 1px solid ${token.colorBorderSecondary};
		user-select: none;
	`,
	lineContent: css`
		padding: 0 6px;
		white-space: pre;
	`,
	openBtn: css`
		flex-shrink: 0;
		font-size: 10px;
		padding: 1px 6px;
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 4px;
		background: transparent;
		color: ${token.colorTextSecondary};
		cursor: pointer;
		&:hover { background: ${token.colorFillSecondary}; }
	`,
}));

function parsePatch(patch: string) {
	return patch.split("\n").slice(2); // skip --- and +++ header lines
}

function DiffFileView({ file, workspaceRoot, styles }: { file: DiffFile; workspaceRoot?: string; styles: ReturnType<typeof useStyles>["styles"] }) {
	const [open, setOpen] = useState(false);
	const lines = open ? parsePatch(file.patch) : [];

	const handleOpenEditor = async (e: React.MouseEvent) => {
		e.stopPropagation();
		await invokeIpc("code-agent:open-in-editor", {
			filePath: file.filePath,
			workspaceRoot: workspaceRoot ?? "",
		}).catch(() => {});
	};

	let oldLine = 0;
	let newLine = 0;

	return (
		<div>
			<button
				type="button"
				className={styles.fileHeader}
				onClick={() => setOpen((v) => !v)}
			>
				<span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>▶</span>
				<span className={styles.filePath}>📄 {file.filePath}</span>
				{file.additions > 0 && (
					<span className={`${styles.badge} ${styles.addBadge}`}>+{file.additions}</span>
				)}
				{file.deletions > 0 && (
					<span className={`${styles.badge} ${styles.delBadge}`}>-{file.deletions}</span>
				)}
				<button
					type="button"
					className={styles.openBtn}
					onClick={handleOpenEditor}
					title="在编辑器中打开"
				>
					打开
				</button>
			</button>
			{open && (
				<div className={styles.diffBody}>
					<table className={styles.diffTable}>
						<tbody>
							{lines.map((line, i) => {
								// Use a compound key combining index with a prefix for stable rendering
								const lineKey = `line-${i}`;
								let rowClass = styles.lineContext;
								let sign = " ";
								let lineNumDisplay = "";

								if (line.startsWith("@@")) {
									rowClass = styles.lineHunk;
									const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/);
									if (match) {
										oldLine = parseInt(match[1], 10) - 1;
										newLine = parseInt(match[2], 10) - 1;
									}
									return (
										<tr key={lineKey} className={rowClass}>
											<td className={styles.lineNum} />
											<td className={styles.lineNum} />
											<td className={styles.lineContent}>{line}</td>
										</tr>
									);
								} else if (line.startsWith("+")) {
									rowClass = styles.lineAdded;
									sign = "+";
									newLine++;
									lineNumDisplay = String(newLine);
									return (
										<tr key={lineKey} className={rowClass}>
											<td className={styles.lineNum} />
											<td className={styles.lineNum}>{lineNumDisplay}</td>
											<td className={styles.lineContent}>{sign}{line.slice(1)}</td>
										</tr>
									);
								} else if (line.startsWith("-")) {
									rowClass = styles.lineRemoved;
									sign = "-";
									oldLine++;
									lineNumDisplay = String(oldLine);
									return (
										<tr key={lineKey} className={rowClass}>
											<td className={styles.lineNum}>{lineNumDisplay}</td>
											<td className={styles.lineNum} />
											<td className={styles.lineContent}>{sign}{line.slice(1)}</td>
										</tr>
									);
								} else {
									oldLine++;
									newLine++;
									return (
										<tr key={lineKey} className={rowClass}>
											<td className={styles.lineNum}>{oldLine}</td>
											<td className={styles.lineNum}>{newLine}</td>
											<td className={styles.lineContent}> {line.slice(1)}</td>
										</tr>
									);
								}
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

export function DiffView({ files, workspaceRoot }: Props) {
	const { styles } = useStyles();
	if (!files.length) return null;

	return (
		<div className={styles.wrap}>
			{files.map((file) => (
				<DiffFileView
					key={file.filePath}
					file={file}
					workspaceRoot={workspaceRoot}
					styles={styles}
				/>
			))}
		</div>
	);
}
