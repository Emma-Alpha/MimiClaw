import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css, token }) => ({
	path: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		font-family: ${token.fontFamilyCode};
		color: ${token.colorTextSecondary};
		margin-bottom: 6px;
	`,
	diff: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		font-family: ${token.fontFamilyCode};
		background: ${token.colorFillSecondary};
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 6px;
		overflow: auto;
		max-height: 140px;
	`,
	lineAdded: css`
		display: block;
		background: rgba(46,160,67,0.12);
		color: #2ea043;
		padding: 0 8px;
		white-space: pre;
	`,
	lineRemoved: css`
		display: block;
		background: rgba(218,54,51,0.12);
		color: #da3633;
		padding: 0 8px;
		white-space: pre;
	`,
	lineContext: css`
		display: block;
		padding: 0 8px;
		color: ${token.colorTextTertiary};
		white-space: pre;
	`,
}));

function buildMiniDiff(oldStr: string, newStr: string) {
	const oldLines = oldStr.split("\n").slice(0, 8);
	const newLines = newStr.split("\n").slice(0, 8);
	const result: Array<{ type: "add" | "remove" | "context"; text: string }> = [];
	const maxLen = Math.max(oldLines.length, newLines.length);
	for (let i = 0; i < maxLen; i++) {
		if (i < oldLines.length && i < newLines.length) {
			if (oldLines[i] !== newLines[i]) {
				result.push({ type: "remove", text: `-${oldLines[i]}` });
				result.push({ type: "add", text: `+${newLines[i]}` });
			} else {
				result.push({ type: "context", text: ` ${oldLines[i]}` });
			}
		} else if (i < newLines.length) {
			result.push({ type: "add", text: `+${newLines[i]}` });
		} else {
			result.push({ type: "remove", text: `-${oldLines[i]}` });
		}
	}
	return result;
}

export function FileEditPermissionCard({ rawInput, onDecision }: Props) {
	const { styles } = useStyles();
	const filePath = String(rawInput.file_path || rawInput.path || "");
	const oldContent = String(rawInput.old_content || rawInput.old_string || "");
	const newContent = String(rawInput.new_content || rawInput.new_string || "");
	const diffLines = buildMiniDiff(oldContent, newContent);

	return (
		<PermissionCardShell toolDisplayName="FileEdit" onDecision={onDecision}>
			{filePath && <div className={styles.path}>✏️ {filePath}</div>}
			{diffLines.length > 0 && (
				<div className={styles.diff}>
					{diffLines.map((line, i) => (
						<span
							key={i}
							className={
								line.type === "add"
									? styles.lineAdded
									: line.type === "remove"
										? styles.lineRemoved
										: styles.lineContext
							}
						>
							{line.text}
						</span>
					))}
				</div>
			)}
		</PermissionCardShell>
	);
}
