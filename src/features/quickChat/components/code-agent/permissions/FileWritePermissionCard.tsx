import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";
import { truncateText, usePermissionContentStyles } from "./shared";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css }) => ({
	pathValue: css`
		max-width: 100%;
	`,
}));

export function FileWritePermissionCard({ rawInput, onDecision }: Props) {
	const { styles, cx } = useStyles();
	const { styles: contentStyles } = usePermissionContentStyles();
	const filePath = String(rawInput.file_path || rawInput.path || "");
	const content = String(rawInput.content || "");
	const preview = truncateText(content.split("\n").slice(0, 12).join("\n"), 480);

	return (
		<PermissionCardShell toolDisplayName="FileWrite" onDecision={onDecision}>
			<div className={contentStyles.stack}>
				{filePath && (
					<div className={contentStyles.metaStack}>
						<div className={contentStyles.metaLine}>
							<span className={contentStyles.metaLabel}>文件: </span>
							<span className={cx(contentStyles.metaValue, contentStyles.codeValue, styles.pathValue)}>
								{filePath}
							</span>
						</div>
					</div>
				)}
				{preview && (
					<div className={cx(contentStyles.block, contentStyles.blockCode)}>{preview}</div>
				)}
			</div>
		</PermissionCardShell>
	);
}
