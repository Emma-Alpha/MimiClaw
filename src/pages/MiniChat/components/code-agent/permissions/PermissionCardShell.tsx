import { createStyles } from "antd-style";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
	toolDisplayName: string;
	children: ReactNode;
	onAllow: () => void;
	onDeny: () => void;
}

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
	content: css``,
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

export function PermissionCardShell({ toolDisplayName, children, onAllow, onDeny }: Props) {
	const { styles } = useStyles();
	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<ShieldAlert size={13} />
				<span>允许 {toolDisplayName} 操作？</span>
			</div>
			<div className={styles.content}>{children}</div>
			<div className={styles.actions}>
				<button type="button" className={`${styles.btn} ${styles.denyBtn}`} onClick={onDeny}>
					拒绝
				</button>
				<button type="button" className={`${styles.btn} ${styles.allowBtn}`} onClick={onAllow}>
					允许
				</button>
			</div>
		</div>
	);
}
