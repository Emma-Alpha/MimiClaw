import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";
import { usePermissionContentStyles } from "./shared";

interface Props {
	toolName: string;
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

export function FilesystemPermissionCard({ toolName, rawInput, onDecision }: Props) {
	const { styles, cx } = usePermissionContentStyles();
	const path = String(rawInput.path || rawInput.target_directory || rawInput.file_path || "");
	const pattern = String(rawInput.pattern || rawInput.glob_pattern || "");
	const display = pattern ? `"${pattern}"${path ? ` in ${path}` : ""}` : path;
	const kind = toolName.toLowerCase() === "grep" ? "匹配" : toolName.toLowerCase() === "glob" ? "遍历" : "路径";

	return (
		<PermissionCardShell toolDisplayName={toolName} onDecision={onDecision}>
			<div className={styles.stack}>
				<div className={styles.metaStack}>
					<div className={styles.metaLine}>
						<span className={styles.metaLabel}>{kind}: </span>
						<span className={styles.metaValue}>{display}</span>
					</div>
				</div>
				<div className={cx(styles.block, styles.blockCode)}>{display}</div>
			</div>
		</PermissionCardShell>
	);
}
