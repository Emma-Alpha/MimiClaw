import { Skeleton } from "antd";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ css, token }) => ({
	root: css`
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding-top: 16px;
	`,
	row: css`
		display: flex;
		gap: 12px;
		align-items: flex-start;
	`,
	rowUser: css`
		justify-content: flex-end;
	`,
	assistantAvatar: css`
		flex: none;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		background: ${token.colorFillTertiary};
		margin-top: 4px;
	`,
	card: css`
		border-radius: ${token.borderRadiusLG}px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
		padding: 12px 14px;
	`,
	cardUser: css`
		width: min(72%, 520px);
	`,
	cardAssistant: css`
		flex: 1;
	`,
	tagRow: css`
		display: flex;
		gap: 8px;
		margin-top: 10px;
	`,
	tag: css`
		height: 20px;
		border-radius: 999px;
		background: ${token.colorFillTertiary};
	`,
	tagWide: css`
		width: 84px;
	`,
	tagNarrow: css`
		width: 64px;
	`,
}));

export function ChatSkeletonList() {
	const { styles, cx } = useStyles();

	return (
		<div className={styles.root} aria-label="chat-skeleton-loading">
			<div className={cx(styles.row, styles.rowUser)}>
				<div className={cx(styles.card, styles.cardUser)}>
					<Skeleton active title={false} paragraph={{ rows: 3, width: ["92%", "86%", "58%"] }} />
				</div>
			</div>

			<div className={styles.row}>
				<div className={styles.assistantAvatar} />
				<div className={cx(styles.card, styles.cardAssistant)}>
					<Skeleton
						active
						title={{ width: "32%" }}
						paragraph={{ rows: 3, width: ["94%", "84%", "66%"] }}
					/>
					<div className={styles.tagRow}>
						<div className={cx(styles.tag, styles.tagWide)} />
						<div className={cx(styles.tag, styles.tagNarrow)} />
					</div>
				</div>
			</div>

			<div className={styles.row}>
				<div className={styles.assistantAvatar} />
				<div className={cx(styles.card, styles.cardAssistant)}>
					<Skeleton
						active
						title={{ width: "26%" }}
						paragraph={{ rows: 2, width: ["90%", "74%"] }}
					/>
				</div>
			</div>
		</div>
	);
}

