import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";
import { formatPreviewJson, usePermissionContentStyles } from "./shared";

interface Props {
	toolName: string;
	rawInput: Record<string, unknown>;
	title?: string;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

export function FallbackPermissionCard({ toolName, rawInput, onDecision }: Props) {
	const { styles, cx } = usePermissionContentStyles();
	const json = formatPreviewJson(rawInput, 520);

	return (
		<PermissionCardShell toolDisplayName={toolName} onDecision={onDecision}>
			<div className={styles.stack}>
				<div className={cx(styles.block, styles.blockCode)}>{json}</div>
			</div>
		</PermissionCardShell>
	);
}
