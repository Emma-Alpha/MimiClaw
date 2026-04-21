import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";
import { usePermissionContentStyles } from "./shared";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css }) => ({
	cwdValue: css`
		max-width: 100%;
	`,
}));

export function BashPermissionCard({ rawInput, onDecision }: Props) {
	const { styles, cx } = useStyles();
	const { styles: contentStyles } = usePermissionContentStyles();
	const command = String(rawInput.command || rawInput.cmd || "");
	const cwd = String(rawInput.cwd || rawInput.working_directory || "");

	return (
		<PermissionCardShell toolDisplayName="Bash" onDecision={onDecision}>
			<div className={contentStyles.stack}>
				{cwd && (
					<div className={contentStyles.metaStack}>
						<div className={contentStyles.metaLine}>
							<span className={contentStyles.metaLabel}>目录: </span>
							<span className={cx(contentStyles.metaValue, contentStyles.codeValue, styles.cwdValue)}>
								{cwd}
							</span>
						</div>
					</div>
				)}
				<div className={cx(contentStyles.block, contentStyles.blockStrong, contentStyles.blockCode)}>
					$ {command}
				</div>
			</div>
		</PermissionCardShell>
	);
}
