import { createStyles } from "antd-style";
import { ShieldAlert } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

export type PermissionDecision = "allow" | "allow-session" | "deny";

interface Props {
	toolDisplayName: string;
	children: ReactNode;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css, token }) => ({
	card: css`
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px 12px 10px;
		border-radius: 16px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
		box-shadow:
			0 1px 2px rgba(15, 23, 42, 0.03),
			0 8px 24px rgba(15, 23, 42, 0.04);
	`,
	header: css`
		display: flex;
		align-items: center;
		gap: 6px;
	`,
	headerIcon: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		color: ${token.colorWarning};
	`,
	headerText: css`
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	`,
	eyebrow: css`
		display: none;
		font-size: calc(${token.fontSizeSM}px - 1px);
		line-height: 1.35;
		font-weight: 600;
		color: ${token.colorWarning};
	`,
	title: css`
		font-size: ${token.fontSizeSM}px;
		line-height: 1.35;
		font-weight: 600;
		color: ${token.colorWarning};
	`,
	content: css`
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	`,
	optionList: css`
		display: flex;
		flex-direction: column;
		gap: 2px;
	`,
	option: css`
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 34px;
		padding: 6px 8px;
		border-radius: 8px;
		font-size: ${token.fontSizeSM}px;
		cursor: pointer;
		border: 1px solid transparent;
		background: transparent;
		color: ${token.colorText};
		text-align: left;
		width: 100%;
		transition:
			background 0.16s ease,
			border-color 0.16s ease;
		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
	optionActive: css`
		background: ${token.colorFillTertiary};
		color: ${token.colorText};
		border-color: ${token.colorBorderSecondary};
		font-weight: 600;
		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
	optionIndex: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		text-align: center;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: ${token.colorTextSecondary};
		border-radius: 5px;
	`,
	optionLabel: css`
		flex: 1;
	`,
	feedbackRow: css`
		margin-top: 2px;
	`,
	feedbackInput: css`
		width: 100%;
		height: 30px;
		padding: 0 8px;
		border-radius: 8px;
		font-size: ${token.fontSizeSM}px;
		border: 1px solid ${token.colorBorderSecondary};
		background: transparent;
		color: ${token.colorText};
		outline: none;
		transition:
			border-color 0.16s ease,
			box-shadow 0.16s ease;
		&:focus {
			border-color: ${token.colorPrimaryBorder};
			box-shadow: 0 0 0 2px color-mix(in srgb, ${token.colorPrimaryBg} 60%, transparent);
		}
		&::placeholder {
			color: ${token.colorTextQuaternary};
		}
	`,
	hint: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		color: ${token.colorTextQuaternary};
		margin-top: 0;
	`,
}));

const OPTIONS: { value: PermissionDecision; label: string }[] = [
	{ value: "allow", label: "允许" },
	{ value: "allow-session", label: "允许，本次会话不再询问此类操作" },
	{ value: "deny", label: "拒绝" },
];

function getPlaceholder(active: PermissionDecision): string {
	return active === "deny"
		? "告诉 Claude 应该怎么做..."
		: "告诉 Claude 接下来做什么...";
}

export function PermissionCardShell({ toolDisplayName, children, onDecision }: Props) {
	const { styles, cx } = useStyles();
	const [activeIndex, setActiveIndex] = useState(0);
	const [feedback, setFeedback] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const activeOption = OPTIONS[activeIndex];

	const submit = useCallback(() => {
		const trimmed = feedback.trim();
		onDecision(activeOption.value, trimmed || undefined);
	}, [feedback, activeOption, onDecision]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveIndex((i) => (i > 0 ? i - 1 : OPTIONS.length - 1));
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				setActiveIndex((i) => (i < OPTIONS.length - 1 ? i + 1 : 0));
			} else if (e.key === "Enter") {
				const isInputFocused = document.activeElement === inputRef.current;
				if (!isInputFocused || feedback.trim() !== "") {
					e.preventDefault();
					submit();
				} else if (isInputFocused && feedback.trim() === "") {
					e.preventDefault();
					submit();
				}
			} else if (e.key === "Escape") {
				e.preventDefault();
				onDecision("deny");
			} else if (e.key >= "1" && e.key <= "3") {
				const idx = Number.parseInt(e.key, 10) - 1;
				if (idx >= 0 && idx < OPTIONS.length) {
					setActiveIndex(idx);
				}
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [feedback, submit, onDecision]);

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<span className={styles.headerIcon}>
					<ShieldAlert size={13} />
				</span>
				<div className={styles.headerText}>
					<span className={styles.eyebrow}>权限确认</span>
					<span className={styles.title}>允许 {toolDisplayName} 操作？</span>
				</div>
			</div>
			<div className={styles.content}>{children}</div>
			<div className={styles.optionList}>
				{OPTIONS.map((opt, i) => (
					<button
						key={opt.value}
						type="button"
						className={cx(styles.option, i === activeIndex && styles.optionActive)}
						onClick={() => {
							setActiveIndex(i);
							onDecision(opt.value, feedback.trim() || undefined);
						}}
						onMouseEnter={() => setActiveIndex(i)}
					>
						<span className={styles.optionIndex}>{i + 1}</span>
						<span className={styles.optionLabel}>{opt.label}</span>
					</button>
				))}
			</div>
			<div className={styles.feedbackRow}>
				<input
					ref={inputRef}
					type="text"
					className={styles.feedbackInput}
					placeholder={getPlaceholder(activeOption.value)}
					value={feedback}
					onChange={(e) => setFeedback(e.target.value)}
				/>
			</div>
			<div className={styles.hint}>按 1/2/3 选择，Enter 提交，Esc 拒绝</div>
		</div>
	);
}
