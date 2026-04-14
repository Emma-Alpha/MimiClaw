import { createStyles } from "antd-style";
import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css, token }) => ({
	desc: css`
		font-size: 12px;
		color: ${token.colorTextSecondary};
		background: ${token.colorFillSecondary};
		padding: 5px 8px;
		border-radius: 6px;
		border: 1px solid ${token.colorBorderSecondary};
		word-break: break-word;
	`,
}));

export function AgentPermissionCard({ rawInput, onDecision }: Props) {
	const { styles } = useStyles();
	const description = String(rawInput.description || rawInput.prompt || rawInput.task || "");

	return (
		<PermissionCardShell toolDisplayName="Agent/Task" onDecision={onDecision}>
			{description && <div className={styles.desc}>⚙️ {description.slice(0, 200)}</div>}
		</PermissionCardShell>
	);
}
