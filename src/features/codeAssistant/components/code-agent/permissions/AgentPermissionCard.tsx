import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";
import { truncateText, usePermissionContentStyles } from "./shared";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

export function AgentPermissionCard({ rawInput, onDecision }: Props) {
	const { styles } = usePermissionContentStyles();
	const description = String(rawInput.description || rawInput.prompt || rawInput.task || "");

	return (
		<PermissionCardShell toolDisplayName="Agent/Task" onDecision={onDecision}>
			{description && (
				<div className={styles.stack}>
					<div className={styles.metaStack}>
						<div className={styles.metaLine}>
							<span className={styles.metaLabel}>任务</span>
						</div>
					</div>
					<div className={`${styles.block} ${styles.blockText}`}>{truncateText(description, 240)}</div>
				</div>
			)}
		</PermissionCardShell>
	);
}
