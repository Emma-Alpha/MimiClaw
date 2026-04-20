import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";
import { usePermissionContentStyles } from "./shared";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

export function WebFetchPermissionCard({ rawInput, onDecision }: Props) {
	const { styles, cx } = usePermissionContentStyles();
	const url = String(rawInput.url || "");

	return (
		<PermissionCardShell toolDisplayName="WebFetch" onDecision={onDecision}>
			<div className={styles.stack}>
				<div className={styles.metaStack}>
					<div className={styles.metaLine}>
						<span className={styles.metaLabel}>URL: </span>
						<span className={styles.metaValue}>{url}</span>
					</div>
				</div>
				<div className={cx(styles.block, styles.blockCode)}>{url}</div>
			</div>
		</PermissionCardShell>
	);
}
