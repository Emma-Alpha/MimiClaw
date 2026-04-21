import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";
import { formatPreviewJson, truncateText, usePermissionContentStyles } from "./shared";

interface Props {
	toolName: string;
	rawInput: Record<string, unknown>;
	title?: string;
	description?: string;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

export function McpToolPermissionCard({ toolName, rawInput, title, description, onDecision }: Props) {
	const { styles, cx } = usePermissionContentStyles();
	const parts = toolName.split("__");
	const serverName = parts.length > 1 ? parts[0] : "";
	const shortToolName = parts.length > 1 ? parts.slice(1).join("__") : toolName;
	const detailText = title || description || "";

	return (
		<PermissionCardShell toolDisplayName={`MCP: ${toolName}`} onDecision={onDecision}>
			<div className={styles.stack}>
				<div className={styles.metaStack}>
					{serverName && (
						<div className={styles.metaLine}>
							<span className={styles.metaLabel}>Server: </span>
							<span className={cx(styles.metaValue, styles.codeValue)}>{serverName}</span>
						</div>
					)}
					<div className={styles.metaLine}>
						<span className={styles.metaLabel}>Tool: </span>
						<span className={cx(styles.metaValue, styles.codeValue)}>{shortToolName}</span>
					</div>
				</div>
				{detailText && (
					<div className={`${styles.block} ${styles.blockText}`}>
						{truncateText(detailText, 220)}
					</div>
				)}
				<div className={cx(styles.block, styles.blockCode)}>
					{formatPreviewJson(rawInput, 560)}
				</div>
			</div>
		</PermissionCardShell>
	);
}
