import { createStyles } from "antd-style";
import { useMemo, useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import type { DiffFile } from "@/stores/code-agent";

interface Props {
	files: DiffFile[];
	workspaceRoot?: string;
}

const PREVIEW_LINES = 4;

const useStyles = createStyles(({ css, token }) => ({
	card: css`
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 10px;
		overflow: hidden;
		background: ${token.colorBgContainer};
		margin: 6px 0;
	`,
	header: css`
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		font-size: ${token.fontSizeSM}px;
		font-weight: 600;
		color: ${token.colorText};
		border-bottom: 1px solid ${token.colorBorderSecondary};
	`,
	headerIcon: css`
		color: ${token.colorTextTertiary};
		flex-shrink: 0;
	`,
	fileName: css`
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	`,
	stat: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		font-weight: 600;
		margin-left: 2px;
		flex-shrink: 0;
	`,
	statAdd: css`
		color: ${token.colorSuccess};
	`,
	statDel: css`
		color: ${token.colorError};
	`,
	codeWrap: css`
		position: relative;
		overflow: hidden;
		font-family: ${token.fontFamilyCode};
		font-size: ${token.fontSizeSM}px;
		line-height: 1.65;
	`,
	codeWrapCollapsed: css`
		mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
	`,
	line: css`
		display: block;
		padding: 0 12px;
		white-space: pre;
		min-height: 1.65em;
	`,
	lineAdd: css`
		background: ${token.colorSuccessBg};
		color: ${token.colorSuccessText};
	`,
	lineDel: css`
		background: ${token.colorErrorBg};
		color: ${token.colorErrorText};
		text-decoration: line-through;
		opacity: 0.7;
	`,
	lineCtx: css`
		color: ${token.colorTextSecondary};
	`,
	lineHunk: css`
		background: ${token.colorFillQuaternary};
		color: ${token.colorTextQuaternary};
		font-size: calc(${token.fontSizeSM}px - 1px);
	`,
	expandBtn: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 4px 0;
		border: none;
		border-top: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorFillQuaternary};
		color: ${token.colorTextTertiary};
		cursor: pointer;
		transition: background 0.15s, color 0.15s;

		&:hover {
			background: ${token.colorFillSecondary};
			color: ${token.colorTextSecondary};
		}
	`,
	expandBtnOpen: css`
		svg {
			transform: rotate(180deg);
		}
	`,
}));

function parseDiffLines(patch: string) {
	return patch.split("\n").slice(2);
}

function getBaseName(filePath: string) {
	const normalized = filePath.replace(/\\/g, "/");
	return normalized.split("/").pop() || normalized;
}

function DiffFileCard({
	file,
	styles,
}: {
	file: DiffFile;
	styles: ReturnType<typeof useStyles>["styles"];
}) {
	const [expanded, setExpanded] = useState(false);
	const allLines = useMemo(() => parseDiffLines(file.patch), [file.patch]);

	const contentLines = useMemo(
		() => allLines.filter((l) => l.length > 0 || allLines.indexOf(l) < allLines.length - 1),
		[allLines],
	);

	const needsExpand = contentLines.length > PREVIEW_LINES;
	const visibleLines = expanded ? contentLines : contentLines.slice(0, PREVIEW_LINES);
	const baseName = getBaseName(file.filePath);

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<FileText className={styles.headerIcon} style={{ width: 14, height: 14 }} />
				<span className={styles.fileName}>{baseName}</span>
				{file.additions > 0 && (
					<span className={`${styles.stat} ${styles.statAdd}`}>+{file.additions}</span>
				)}
				{file.deletions > 0 && (
					<span className={`${styles.stat} ${styles.statDel}`}>-{file.deletions}</span>
				)}
			</div>

			{contentLines.length > 0 && (
				<div
					className={`${styles.codeWrap} ${needsExpand && !expanded ? styles.codeWrapCollapsed : ""}`}
				>
					{visibleLines.map((line, i) => {
						const key = `l-${i}`;
						if (line.startsWith("@@")) {
							return (
								<span key={key} className={`${styles.line} ${styles.lineHunk}`}>
									{line}
								</span>
							);
						}
						if (line.startsWith("+")) {
							return (
								<span key={key} className={`${styles.line} ${styles.lineAdd}`}>
									{line.slice(1)}
								</span>
							);
						}
						if (line.startsWith("-")) {
							return (
								<span key={key} className={`${styles.line} ${styles.lineDel}`}>
									{line.slice(1)}
								</span>
							);
						}
						return (
							<span key={key} className={`${styles.line} ${styles.lineCtx}`}>
								{line.slice(1) || " "}
							</span>
						);
					})}
				</div>
			)}

			{needsExpand && (
				<button
					type="button"
					className={`${styles.expandBtn} ${expanded ? styles.expandBtnOpen : ""}`}
					onClick={() => setExpanded((v) => !v)}
				>
					<ChevronDown style={{ width: 16, height: 16 }} />
				</button>
			)}
		</div>
	);
}

export function DiffView({ files }: Props) {
	const { styles } = useStyles();
	if (!files.length) return null;

	return (
		<>
			{files.map((file) => (
				<DiffFileCard key={file.filePath} file={file} styles={styles} />
			))}
		</>
	);
}
