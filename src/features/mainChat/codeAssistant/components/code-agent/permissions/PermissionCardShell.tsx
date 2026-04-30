import { createStyles } from "antd-style";
import { ArrowDown, ArrowUp, CornerDownLeft } from "lucide-react";
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
		padding: 14px 16px 12px;
		border-radius: 16px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
		box-shadow:
			0 1px 2px rgba(15, 23, 42, 0.03),
			0 8px 24px rgba(15, 23, 42, 0.04);
	`,
	question: css`
		font-size: ${token.fontSize}px;
		line-height: 1.55;
		color: ${token.colorText};
		word-break: break-word;
	`,
	content: css`
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	`,
	optionList: css`
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-top: 2px;
	`,
	option: css`
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 34px;
		padding: 6px 12px;
		border-radius: 8px;
		font-size: ${token.fontSizeSM}px;
		line-height: 1.5;
		cursor: pointer;
		border: 0;
		background: transparent;
		color: ${token.colorText};
		text-align: left;
		width: 100%;
		transition: background 0.16s ease;
		&:hover {
			background: ${token.colorFillQuaternary};
		}
	`,
	optionActive: css`
		background: ${token.colorFillTertiary};
		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
	optionIndex: css`
		flex-shrink: 0;
		width: 14px;
		text-align: left;
		color: ${token.colorTextSecondary};
		font-variant-numeric: tabular-nums;
	`,
	optionLabel: css`
		flex: 1;
		min-width: 0;
		color: ${token.colorText};
		word-break: break-word;
	`,
	arrowHints: css`
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
		color: ${token.colorTextTertiary};
	`,
	feedbackRow: css`
		margin-top: 2px;
	`,
	feedbackInput: css`
		width: 100%;
		height: 32px;
		padding: 0 10px;
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
	footer: css`
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 2px;
	`,
	skipButton: css`
		padding: 4px 10px;
		border: 0;
		background: transparent;
		color: ${token.colorTextTertiary};
		font-size: ${token.fontSizeSM}px;
		border-radius: 6px;
		cursor: pointer;
		transition: color 0.16s ease;
		&:hover {
			color: ${token.colorText};
		}
	`,
	submitButton: css`
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		border-radius: 999px;
		border: 0;
		background: ${token.colorTextBase};
		color: ${token.colorBgBase};
		font-size: ${token.fontSizeSM}px;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.16s ease;
		&:hover {
			opacity: 0.85;
		}
	`,
	submitIcon: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		opacity: 0.85;
	`,
}));

const OPTIONS: { value: PermissionDecision; label: string }[] = [
	{ value: "allow", label: "是" },
	{ value: "allow-session", label: "是，本次会话不再询问此类操作" },
	{ value: "deny", label: "否，请告知 Claude 如何调整" },
];

export function PermissionCardShell({ toolDisplayName, children, onDecision }: Props) {
	const { styles, cx } = useStyles();
	const [activeIndex, setActiveIndex] = useState(0);
	const [feedback, setFeedback] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const activeOption = OPTIONS[activeIndex];
	const isDenyActive = activeOption.value === "deny";

	const submit = useCallback(() => {
		const trimmed = feedback.trim();
		onDecision(activeOption.value, trimmed || undefined);
	}, [feedback, activeOption, onDecision]);

	const skip = useCallback(() => {
		onDecision("deny");
	}, [onDecision]);

	useEffect(() => {
		if (isDenyActive) {
			inputRef.current?.focus();
		}
	}, [isDenyActive]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const isInputFocused = document.activeElement === inputRef.current;
			if (e.key === "ArrowUp" && !isInputFocused) {
				e.preventDefault();
				setActiveIndex((i) => (i > 0 ? i - 1 : OPTIONS.length - 1));
			} else if (e.key === "ArrowDown" && !isInputFocused) {
				e.preventDefault();
				setActiveIndex((i) => (i < OPTIONS.length - 1 ? i + 1 : 0));
			} else if (e.key === "Enter") {
				e.preventDefault();
				submit();
			} else if (e.key === "Escape") {
				e.preventDefault();
				skip();
			} else if (!isInputFocused && e.key >= "1" && e.key <= "3") {
				const idx = Number.parseInt(e.key, 10) - 1;
				if (idx >= 0 && idx < OPTIONS.length) {
					setActiveIndex(idx);
				}
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [submit, skip]);

	return (
		<div className={styles.card}>
			<div className={styles.question}>
				是否允许 Claude 执行下面的 {toolDisplayName} 操作？
			</div>
			<div className={styles.content}>{children}</div>
			<div className={styles.optionList}>
				{OPTIONS.map((opt, i) => (
					<button
						key={opt.value}
						type="button"
						className={cx(styles.option, i === activeIndex && styles.optionActive)}
						onClick={() => setActiveIndex(i)}
						onMouseEnter={() => setActiveIndex(i)}
					>
						<span className={styles.optionIndex}>{i + 1}.</span>
						<span className={styles.optionLabel}>{opt.label}</span>
						{i === activeIndex && (
							<span className={styles.arrowHints} aria-hidden>
								<ArrowUp size={12} />
								<ArrowDown size={12} />
							</span>
						)}
					</button>
				))}
			</div>
			{isDenyActive && (
				<div className={styles.feedbackRow}>
					<input
						ref={inputRef}
						type="text"
						className={styles.feedbackInput}
						placeholder="告诉 Claude 应该怎么做..."
						value={feedback}
						onChange={(e) => setFeedback(e.target.value)}
					/>
				</div>
			)}
			<div className={styles.footer}>
				<button type="button" className={styles.skipButton} onClick={skip}>
					跳过
				</button>
				<button type="button" className={styles.submitButton} onClick={submit}>
					<span>提交</span>
					<span className={styles.submitIcon}>
						<CornerDownLeft size={12} />
					</span>
				</button>
			</div>
		</div>
	);
}
