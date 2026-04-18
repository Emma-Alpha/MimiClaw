import { Accordion, AccordionItem, ScrollShadow } from "@lobehub/ui";
import { createStyles } from "antd-style";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Atom, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type ThinkingPanelVariant = "compact" | "card";

interface ThinkingPanelProps {
	content?: string | ReactNode;
	isThinking?: boolean;
	isRedacted?: boolean;
	durationMs?: number;
	variant?: ThinkingPanelVariant;
	maxHeight?: number;
	showStreamingCursor?: boolean;
	className?: string;
	bodyClassName?: string;
	renderContent?: (content: string) => ReactNode;
}

const useStyles = createStyles(({ css, token }) => {
	const panelRadius = token.borderRadiusLG + 2;

	return {
	container: css`
		border-radius: ${panelRadius}px;
	`,
	containerCard: css`
		width: 100%;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
	`,
	accordionRoot: css`
		width: 100%;
	`,
	title: css`
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 24px;
		color: ${token.colorTextSecondary};
		font-size: ${token.fontSizeSM}px;
	`,
	indicatorShell: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 18px;
		height: 18px;
		border-radius: 9px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgContainer};
		color: ${token.colorTextTertiary};
	`,
	indicatorThinking: css`
		color: ${token.colorPrimary};
	`,
	spinner: css`
		animation: panelSpin 1s linear infinite;
		@keyframes panelSpin {
			from { transform: rotate(0deg); }
			to { transform: rotate(360deg); }
		}
	`,
	label: css`
		font-weight: 500;
	`,
	redacted: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		color: ${token.colorTextQuaternary};
	`,
	scroll: css`
		padding: 0 10px 10px;
	`,
	bodyDefault: css`
		font-size: ${token.fontSizeSM}px;
		line-height: 1.6;
		color: ${token.colorTextSecondary};
		white-space: pre-wrap;
		word-break: break-word;
	`,
	cursor: css`
		display: inline-block;
		width: 0.5em;
		height: 1em;
		margin-left: 1px;
		vertical-align: text-bottom;
		background: ${token.colorTextSecondary};
		animation: caretBlink 1s step-end infinite;
		@keyframes caretBlink {
			0%, 100% { opacity: 1; }
			50% { opacity: 0; }
		}
	`,
	};
});

export function ThinkingPanel({
	content = "",
	isThinking = false,
	isRedacted = false,
	durationMs,
	variant = "compact",
	maxHeight = 320,
	showStreamingCursor = false,
	className,
	bodyClassName,
	renderContent,
}: ThinkingPanelProps) {
	const { styles, cx } = useStyles();
	const { t } = useTranslation("chat");
	const [isExpanded, setIsExpanded] = useState(isThinking);
	const [userHasScrolled, setUserHasScrolled] = useState(false);
	const previousThinkingRef = useRef(isThinking);
	const hasUserToggledRef = useRef(false);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	const contentString = typeof content === "string" ? content : "";
	const hasContent =
		typeof content === "string"
			? content.trim().length > 0
			: content !== null && content !== undefined;

	useEffect(() => {
		if (isThinking && !previousThinkingRef.current) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setIsExpanded(true);
			setUserHasScrolled(false);
			hasUserToggledRef.current = false;
		}

		if (!isThinking && previousThinkingRef.current && !hasUserToggledRef.current) {
			setIsExpanded(false);
		}

		previousThinkingRef.current = isThinking;
	}, [isThinking]);

	useEffect(() => {
		if (!(isThinking && isExpanded) || userHasScrolled) return;
		const el = scrollRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [content, isThinking, isExpanded, userHasScrolled]);

	const handleScroll = () => {
		const el = scrollRef.current;
		if (!el) return;
		const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		setUserHasScrolled(distanceToBottom > 120);
	};

	const durationSeconds = useMemo(() => {
		if (typeof durationMs !== "number" || durationMs <= 0) return null;
		return (durationMs / 1000).toFixed(1);
	}, [durationMs]);

	const statusLabel = isThinking
		? t("thinking.titleThinking", { defaultValue: "Thinking" })
		: durationSeconds
			? t("thinking.titleDoneWithDuration", {
				defaultValue: "Thought for {{seconds}}s",
				seconds: durationSeconds,
			})
			: t("thinking.titleDone", { defaultValue: "Thought" });

	if (isRedacted) {
		return (
			<div className={cx(styles.container, variant === "card" && styles.containerCard, className)}>
				<div className={styles.title}>
					<span className={styles.indicatorShell} aria-hidden="true">
						<Atom size={12} />
					</span>
					<span className={styles.label}>{t("thinking.title", { defaultValue: "Thinking" })}</span>
					<span className={styles.redacted}>
						{t("thinking.redacted", { defaultValue: "Part of the reasoning process is hidden" })}
					</span>
				</div>
			</div>
		);
	}

	if (!hasContent && !isThinking) return null;

	return (
		<div className={cx(styles.container, variant === "card" && styles.containerCard, className)}>
			<Accordion
				className={styles.accordionRoot}
				expandedKeys={isExpanded ? ["thinking"] : []}
				gap={4}
				onExpandedChange={(keys) => {
					hasUserToggledRef.current = true;
					setIsExpanded(keys.length > 0);
				}}
			>
				<AccordionItem
					itemKey="thinking"
					paddingBlock={6}
					paddingInline={6}
					title={(
						<div className={styles.title}>
							<span
								className={cx(styles.indicatorShell, isThinking && styles.indicatorThinking)}
								aria-hidden="true"
							>
								{isThinking ? <Loader2 size={12} className={styles.spinner} /> : <Atom size={12} />}
							</span>
							<span className={styles.label}>{statusLabel}</span>
						</div>
					)}
				>
					<ScrollShadow
						className={styles.scroll}
						offset={12}
						size={12}
						style={{ maxHeight: `min(40vh, ${maxHeight}px)` }}
						ref={scrollRef}
						onScroll={handleScroll}
					>
						<div className={cx(styles.bodyDefault, bodyClassName)}>
							{typeof content === "string"
								? (renderContent ? renderContent(contentString) : contentString || " ")
								: content}
							{showStreamingCursor && isThinking && (
								<span className={styles.cursor} aria-hidden="true" />
							)}
						</div>
					</ScrollShadow>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
