import { useEffect, useState } from "react";
import { createStyles } from "antd-style";

interface Props {
	resetsAt: number | null;
	utilization: number | null;
	status: string;
}

const useStyles = createStyles(({ css, token }) => ({
	row: css`
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-family: ${token.fontFamilyCode};
		padding: 2px 0;
	`,
	warning: css`color: ${token.colorWarning};`,
	error: css`color: ${token.colorError};`,
}));

function useCountdown(resetsAt: number | null) {
	const [remaining, setRemaining] = useState(() =>
		resetsAt != null ? Math.max(0, Math.ceil((resetsAt - Date.now()) / 1000)) : null,
	);

	useEffect(() => {
		if (resetsAt == null) return;
		const timer = setInterval(() => {
			const secs = Math.max(0, Math.ceil((resetsAt - Date.now()) / 1000));
			setRemaining(secs);
			if (secs === 0) clearInterval(timer);
		}, 1000);
		return () => clearInterval(timer);
	}, [resetsAt]);

	return remaining;
}

export function RateLimitNotice({ resetsAt, utilization, status }: Props) {
	const { styles } = useStyles();
	const remaining = useCountdown(resetsAt);
	const isRejected = status === "rejected";
	const cls = `${styles.row} ${isRejected ? styles.error : styles.warning}`;

	const util = utilization != null ? ` (使用率 ${Math.round(utilization * 100)}%)` : "";
	const countdown = remaining != null && remaining > 0 ? ` · 等待 ${remaining}s` : "";

	return (
		<div className={cls}>
			⏳ API {isRejected ? "限流" : "速率警告"}{countdown}{util}
		</div>
	);
}
