import { createStyles } from "antd-style";

interface Props {
	text: string;
	variant?: "info" | "warning" | "error";
}

const useStyles = createStyles(({ css, token }) => ({
	row: css`
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: ${token.colorTextTertiary};
		padding: 2px 0;
		font-family: ${token.fontFamilyCode};
	`,
	warning: css`color: ${token.colorWarning};`,
	error: css`color: ${token.colorError};`,
}));

export function SystemNotice({ text, variant = "info" }: Props) {
	const { styles } = useStyles();
	const cls = variant === "warning"
		? `${styles.row} ${styles.warning}`
		: variant === "error"
			? `${styles.row} ${styles.error}`
			: styles.row;

	return <div className={cls}>{text}</div>;
}
