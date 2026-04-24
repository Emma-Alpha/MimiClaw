import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";
import { truncateText, usePermissionContentStyles } from "./shared";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

export function NotebookEditPermissionCard({ rawInput, onDecision }: Props) {
	const { styles, cx } = usePermissionContentStyles();
	const path = String(rawInput.notebook_path || rawInput.file_path || rawInput.path || "");
	const cellIdx = rawInput.cell_index != null ? String(rawInput.cell_index) : null;
	const source = String(rawInput.source || rawInput.new_source || "");

	return (
		<PermissionCardShell toolDisplayName="NotebookEdit" onDecision={onDecision}>
			<div className={styles.stack}>
				<div className={styles.metaStack}>
					<div className={styles.metaLine}>
						<span className={styles.metaLabel}>Notebook: </span>
						<span className={cx(styles.metaValue, styles.codeValue)}>
							{path}
							{cellIdx != null ? ` · Cell ${cellIdx}` : ""}
						</span>
					</div>
				</div>
				{source && <div className={`${styles.block} ${styles.blockText}`}>{truncateText(source, 200)}</div>}
			</div>
		</PermissionCardShell>
	);
}
