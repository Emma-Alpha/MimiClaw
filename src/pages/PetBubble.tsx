import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { invokeIpc } from "@/lib/api-client";
import type { PetRuntimeState } from "../../shared/pet";

const FALLBACK_RUNTIME_STATE: PetRuntimeState = {
	animation: "static",
	activity: "idle",
	showTerminal: false,
	terminalLines: [],
	updatedAt: 0,
};

const BUBBLE_CHIP_MAX = 3;
const BUBBLE_CHIP_LABEL_MAX = 12;
const BUBBLE_TEXT_LINE_MAX = 32;
const BUBBLE_ERROR_PATTERN = /(error|failed|failure|aborted|timeout|timed out|异常|失败|报错|超时|中断)/i;
const BUBBLE_DONE_PATTERN = /(done|completed|success|finished|uploaded|created|saved|成功|完成|已上传|已创建|已保存)/i;

function truncateBubbleText(value: string, maxLength: number) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function toBubbleMarkdownLine(line: string) {
	return truncateBubbleText(
		line
			.replace(/\r/g, "")
			.replace(/```+/g, "")
			.trim(),
		BUBBLE_TEXT_LINE_MAX,
	);
}

function resolveChipPhase(label: string): "done" | "running" {
	return BUBBLE_DONE_PATTERN.test(label) ? "done" : "running";
}

function PetBubbleContent({
	lines,
	showDots = false,
	errorText,
}: {
	lines?: string[];
	showDots?: boolean;
	errorText?: string;
}) {
	const allLines = (lines ?? []).map((line) => line.trim()).filter(Boolean);
	const errorCandidateLines = allLines
		.filter((line) => !line.startsWith("›"))
		.slice()
		.reverse();
	const derivedErrorText = errorText
		?? errorCandidateLines.find((line) => BUBBLE_ERROR_PATTERN.test(line));
	const chipLabels = Array.from(
		new Set(
			allLines
				.filter((line) => line.startsWith("›"))
				.map((line) => line.replace(/^›\s*/, "").trim())
				.filter(Boolean),
		),
	);
	const hiddenChipCount = Math.max(0, chipLabels.length - BUBBLE_CHIP_MAX);
	const chipLines = chipLabels
		.slice(-BUBBLE_CHIP_MAX)
		.map((line, index) => ({
			id: `${index}-${line}`,
			label: truncateBubbleText(line, BUBBLE_CHIP_LABEL_MAX),
			phase: resolveChipPhase(line),
		}))
		.filter((item) => item.label.length > 0);
	const textLines = allLines
		.filter((line) => !line.startsWith("›"))
		.filter((line) => !BUBBLE_ERROR_PATTERN.test(line))
		.map((line) => toBubbleMarkdownLine(line))
		.filter(Boolean)
		.slice(-3);
	const displayText = textLines.length > 0
		? textLines
		: chipLines.length === 0 && !showDots
			? allLines
				.filter((line) => !line.startsWith("›"))
				.map((line) => toBubbleMarkdownLine(line))
				.filter(Boolean)
				.slice(-2)
			: [];
	const markdownText = displayText
		.join("\n");

	return (
		<>
			<style>{`
				* { margin: 0; padding: 0; box-sizing: border-box; }
				html, body, #root {
					width: 100%;
					height: 100%;
					overflow: hidden;
					background: transparent !important;
				}
				body {
					font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
				}
				@keyframes bubbleIn {
					from { opacity: 0; transform: translateY(5px); }
					to { opacity: 1; transform: translateY(0); }
				}
				@keyframes chipPulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.5; }
				}
				@keyframes dotPulse {
					0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
					40% { opacity: 1; transform: scale(1); }
				}

				.bubble-root {
					position: fixed;
					inset: 0;
					display: flex;
					align-items: flex-end;
					padding: 0 0 4px 8px;
					pointer-events: none;
				}

				.bubble {
					display: inline-block;
					max-width: 106px;
					max-height: 98px;
					overflow: hidden;
					background: rgba(14, 14, 16, 0.95);
					border: 1px solid rgba(255, 255, 255, 0.08);
					border-radius: 11px 11px 11px 3px;
					padding: 6px 9px 8px;
					backdrop-filter: blur(16px);
					-webkit-backdrop-filter: blur(16px);
					pointer-events: none;
					position: relative;
					animation: bubbleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
				}

				.bubble--error {
					background: rgba(48, 16, 18, 0.96);
					border-color: rgba(239, 68, 68, 0.3);
				}

				.bubble-tail {
					position: absolute;
					bottom: -7px;
					left: 12px;
					width: 12px;
					height: 8px;
					background: rgba(14, 14, 16, 0.95);
					clip-path: polygon(0 0, 100% 0, 0 100%);
				}

				.bubble--error .bubble-tail {
					background: rgba(48, 16, 18, 0.96);
				}

				.bubble-tools {
					display: flex;
					flex-wrap: wrap;
					gap: 3px;
					margin-bottom: 3px;
					flex-shrink: 0;
				}

				.bubble-chip {
					display: inline-flex;
					align-items: center;
					gap: 4px;
					max-width: 100%;
					font-size: 9.5px;
					font-weight: 500;
					padding: 2px 6px;
					border-radius: 20px;
					white-space: nowrap;
					border: 1px solid transparent;
					overflow: hidden;
					text-overflow: ellipsis;
				}

				.bubble-chip-label {
					overflow: hidden;
					text-overflow: ellipsis;
				}

				.bubble-chip-dot {
					width: 4px;
					height: 4px;
					border-radius: 50%;
					flex-shrink: 0;
				}

				.bubble-chip.done {
					background: rgba(74, 222, 128, 0.12);
					color: #4ade80;
					border-color: rgba(74, 222, 128, 0.2);
				}

				.bubble-chip.done .bubble-chip-dot {
					background: #4ade80;
				}

				.bubble-chip.running {
					background: rgba(96, 165, 250, 0.1);
					color: #60a5fa;
					border-color: rgba(96, 165, 250, 0.18);
					animation: chipPulse 1.4s ease-in-out infinite;
				}

				.bubble-chip.running .bubble-chip-dot {
					background: #60a5fa;
					animation: dotPulse 1.2s ease-in-out infinite;
				}

				.bubble-chip-more {
					display: inline-flex;
					align-items: center;
					white-space: nowrap;
					border-radius: 20px;
					border: 1px solid rgba(255, 255, 255, 0.08);
					background: rgba(255, 255, 255, 0.04);
					padding: 2px 5px;
					font-size: 9px;
					font-weight: 500;
					color: rgba(255, 255, 255, 0.45);
				}

				.bubble-dots {
					display: flex;
					gap: 3px;
					padding: 2px 0;
				}

				.bubble-dots span {
					display: inline-block;
					width: 5px;
					height: 5px;
					border-radius: 50%;
					background: rgba(255, 255, 255, 0.35);
					animation: dotPulse 1.2s ease-in-out infinite;
				}

				.bubble-dots span:nth-child(2) { animation-delay: 0.2s; }
				.bubble-dots span:nth-child(3) { animation-delay: 0.4s; }

				.bubble-text {
					font-size: 11px;
					line-height: 1.45;
					color: rgba(255, 255, 255, 0.85);
					word-break: break-word;
					font-family: inherit;
					max-height: 68px;
					overflow: hidden;
				}

				.bubble-text p {
					margin: 0 0 3px;
				}

				.bubble-text p:last-child {
					margin: 0;
				}

				.bubble-text strong {
					color: #fff;
					font-weight: 600;
				}

				.bubble-text em {
					opacity: 0.85;
					font-style: italic;
				}

				.bubble-text code {
					background: rgba(255, 255, 255, 0.1);
					padding: 1px 4px;
					border-radius: 3px;
					font-size: 10px;
					font-family: "SF Mono", Menlo, monospace;
					color: rgba(255, 255, 255, 0.92);
				}

				.bubble-text ul,
				.bubble-text ol {
					margin: 2px 0;
					padding-left: 14px;
				}

				.bubble-text li {
					margin-bottom: 1px;
				}

				.bubble-text a {
					color: #60a5fa;
					text-decoration: none;
				}

				.bubble-text h1,
				.bubble-text h2,
				.bubble-text h3 {
					font-size: 11px;
					font-weight: 600;
					margin: 2px 0;
					color: #fff;
				}

				.bubble-error-row {
					display: flex;
					align-items: flex-start;
					gap: 5px;
				}

				.bubble-error-dot {
					margin-top: 3px;
					display: inline-block;
					width: 5px;
					height: 5px;
					flex-shrink: 0;
					border-radius: 50%;
					background: #f87171;
				}

				.bubble-error-text {
					font-size: 11px;
					line-height: 1.45;
					color: #f87171;
					font-weight: 500;
				}
			`}</style>
			<div className="bubble-root">
				<div
					className={derivedErrorText ? "bubble bubble--error" : "bubble"}
				>
					{derivedErrorText ? (
						<div className="bubble-error-row">
							<span className="bubble-error-dot" />
							<span className="bubble-error-text">
								{truncateBubbleText(derivedErrorText.replace(/^!\s*/, ""), 34)}
							</span>
						</div>
					) : null}

					{!derivedErrorText && chipLines.length > 0 ? (
						<div className="bubble-tools">
							{chipLines.map((chip) => (
								<span
									key={chip.id}
									className={`bubble-chip ${chip.phase}`}
								>
									<span className="bubble-chip-dot" />
									<span className="bubble-chip-label">{chip.label}</span>
								</span>
							))}
							{hiddenChipCount > 0 ? (
								<span className="bubble-chip-more">
									+{hiddenChipCount}
								</span>
							) : null}
						</div>
					) : null}

					{!derivedErrorText && showDots ? (
						<div className="bubble-dots">
							<span />
							<span />
							<span />
						</div>
					) : null}

					{!derivedErrorText && markdownText ? (
						<div className="bubble-text">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{markdownText}
							</ReactMarkdown>
						</div>
					) : null}

					<div className="bubble-tail" />
				</div>
			</div>
		</>
	);
}

export function PetBubble() {
	const [runtimeState, setRuntimeState] = useState<PetRuntimeState>(FALLBACK_RUNTIME_STATE);

	useEffect(() => {
		const htmlStyle = document.documentElement.style;
		const bodyStyle = document.body.style;
		const rootStyle = document.getElementById("root")?.style;
		const prev = {
			htmlBg: htmlStyle.background,
			bodyBg: bodyStyle.background,
			rootBg: rootStyle?.background ?? "",
			bodyOverflow: bodyStyle.overflow,
			bodyMargin: bodyStyle.margin,
		};
		htmlStyle.background = "transparent";
		bodyStyle.background = "transparent";
		bodyStyle.overflow = "hidden";
		bodyStyle.margin = "0";
		if (rootStyle) rootStyle.background = "transparent";
		return () => {
			htmlStyle.background = prev.htmlBg;
			bodyStyle.background = prev.bodyBg;
			bodyStyle.overflow = prev.bodyOverflow;
			bodyStyle.margin = prev.bodyMargin;
			if (rootStyle) rootStyle.background = prev.rootBg;
		};
	}, []);

	useEffect(() => {
		void invokeIpc<PetRuntimeState>("pet:getRuntimeState")
			.then((state) => {
				if (state && typeof state === "object") {
					setRuntimeState(state);
				}
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:runtime-state",
			(payload) => {
				if (payload && typeof payload === "object") {
					setRuntimeState(payload as PetRuntimeState);
				}
			},
		);

		return () => {
			unsubscribe?.();
		};
	}, []);

	const showBubble = useMemo(
		() => runtimeState.activity === "listening" || runtimeState.showTerminal,
		[runtimeState.activity, runtimeState.showTerminal],
	);

	useEffect(() => {
		void invokeIpc("pet:setBubbleVisible", { visible: showBubble }).catch(() => {});
	}, [showBubble]);

	useEffect(() => {
		return () => {
			void invokeIpc("pet:setBubbleVisible", { visible: false }).catch(() => {});
		};
	}, []);

	if (!showBubble) {
		return null;
	}

	return (
		<PetBubbleContent
			lines={runtimeState.terminalLines}
			showDots={runtimeState.activity === "listening" || runtimeState.terminalLines.length === 0}
		/>
	);
}
