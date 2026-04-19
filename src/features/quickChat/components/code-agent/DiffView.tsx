import { createStyles } from "antd-style";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { LobePatchDiff } from "@/components/common/LobePatchDiff";
import type { DiffFile } from "@/stores/code-agent";

interface Props {
	files: DiffFile[];
	workspaceRoot?: string;
}

const PREVIEW_BODY_HEIGHT = 220;
const PREVIEW_LINE_THRESHOLD = 8;

const useStyles = createStyles(({ css, token }) => ({
	item: css`
		margin: 6px 0;
	`,
	expandBtn: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		margin-top: 4px;
		padding: 4px 0;
		border: none;
		background: transparent;
		color: ${token.colorTextTertiary};
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		border-radius: 8px;

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

function normalizePath(path: string) {
	return path.replace(/\\/g, "/");
}

function getDisplayPath(filePath: string, workspaceRoot?: string) {
	const normalizedPath = normalizePath(filePath);
	if (!workspaceRoot) return normalizedPath;

	const normalizedRoot = normalizePath(workspaceRoot).replace(/\/$/, "");
	if (!normalizedPath.startsWith(`${normalizedRoot}/`)) return normalizedPath;

	return normalizedPath.slice(normalizedRoot.length + 1);
}

function DiffFileCard({
	file,
	styles,
	workspaceRoot,
}: {
	file: DiffFile;
	styles: ReturnType<typeof useStyles>["styles"];
	workspaceRoot?: string;
}) {
	const [expanded, setExpanded] = useState(false);
	const displayPath = useMemo(
		() => getDisplayPath(file.filePath, workspaceRoot),
		[file.filePath, workspaceRoot],
	);
	const needsExpand = useMemo(
		() => Math.max(0, file.patch.split("\n").length - 3) > PREVIEW_LINE_THRESHOLD,
		[file.patch],
	);

	return (
		<div className={styles.item}>
			<LobePatchDiff
				fileName={displayPath}
				maxBodyHeight={expanded ? undefined : PREVIEW_BODY_HEIGHT}
				patch={file.patch}
			/>

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

export function DiffView({ files, workspaceRoot }: Props) {
	const { styles } = useStyles();
	if (!files.length) return null;

	return (
		<>
			{files.map((file) => (
				<DiffFileCard
					key={file.filePath}
					file={file}
					styles={styles}
					workspaceRoot={workspaceRoot}
				/>
			))}
		</>
	);
}
