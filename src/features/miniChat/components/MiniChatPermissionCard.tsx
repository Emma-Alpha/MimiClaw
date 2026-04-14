import { createStyles } from "antd-style";
import { ShieldAlert } from "lucide-react";
import type { CodeAgentPermissionRequest } from "../../../../shared/code-agent";

const useStyles = createStyles(({ css, token }) => ({
	card: css`
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 10px;
		background: ${token.colorFillTertiary};
		border: 1px solid ${token.colorBorderSecondary};
	`,
	header: css`
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		color: ${token.colorWarning};
	`,
	title: css`
		font-size: 12px;
		font-weight: 600;
		color: ${token.colorText};
	`,
	summary: css`
		font-size: 11px;
		color: ${token.colorTextSecondary};
		font-family: monospace;
		background: ${token.colorFillSecondary};
		padding: 4px 8px;
		border-radius: 6px;
		word-break: break-all;
		max-height: 60px;
		overflow: hidden;
		text-overflow: ellipsis;
	`,
	actions: css`
		display: flex;
		gap: 6px;
		justify-content: flex-end;
	`,
	btn: css`
		padding: 3px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: opacity 0.15s;
		&:hover { opacity: 0.8; }
	`,
	allowBtn: css`
		background: ${token.colorPrimary};
		color: #fff;
	`,
	denyBtn: css`
		background: ${token.colorFillSecondary};
		color: ${token.colorText};
		border-color: ${token.colorBorderSecondary};
	`,
}));

interface Props {
	request: CodeAgentPermissionRequest;
	onDecision: (requestId: string, decision: "allow" | "deny") => void;
}

export function MiniChatPermissionCard({ request, onDecision }: Props) {
	const { styles } = useStyles();

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<ShieldAlert size={13} />
				<span className={styles.title}>
					允许 {request.toolName} 操作？
				</span>
			</div>
			{request.inputSummary && (
				<div className={styles.summary}>{request.inputSummary}</div>
			)}
			<div className={styles.actions}>
				<button
					type="button"
					className={`${styles.btn} ${styles.denyBtn}`}
					onClick={() => onDecision(request.requestId, "deny")}
				>
					拒绝
				</button>
				<button
					type="button"
					className={`${styles.btn} ${styles.allowBtn}`}
					onClick={() => onDecision(request.requestId, "allow")}
				>
					允许
				</button>
			</div>
		</div>
	);
}
