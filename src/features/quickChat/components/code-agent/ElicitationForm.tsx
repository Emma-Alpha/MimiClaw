/**
 * MCP Elicitation form.
 *
 * Renders a dynamic form from a JSON Schema for MCP server elicitation requests.
 * Uses a lightweight built-in renderer (no external rjsf dependency required).
 */
import { createStyles } from "antd-style";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import type { PendingElicitation } from "@/stores/code-agent";

interface Props {
	elicitation: PendingElicitation;
	onClose?: () => void;
	onSubmit: (action: "accept" | "decline", content?: Record<string, unknown>) => void;
}

const useStyles = createStyles(({ css, token }) => ({
	card: css`
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 18px;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.98);
		border: 1px solid rgba(15, 23, 42, 0.08);
		box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
		min-width: 340px;
		max-width: min(420px, calc(100vw - 32px));
		max-height: min(620px, calc(100vh - 120px));
		overflow: hidden;
		backdrop-filter: blur(20px);
	`,
	headerRow: css`
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	`,
	headerText: css`
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
		flex: 1;
	`,
	titleBar: css`
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		padding-bottom: 10px;
		border-bottom: 2px solid #e5e7eb;
	`,
	title: css`
		font-size: ${token.fontSize}px;
		font-weight: 600;
		line-height: 1.2;
		color: #111827;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	`,
	message: css`
		font-size: ${token.fontSize}px;
		line-height: 1.6;
		color: #111827;
		white-space: pre-wrap;
		word-break: break-word;
	`,
	secondaryMessage: css`
		font-size: calc(${token.fontSizeSM}px + 1px);
		line-height: 1.6;
		color: #6b7280;
		white-space: pre-wrap;
		word-break: break-word;
	`,
	messageStrong: css`
		font-weight: 700;
	`,
	closeButton: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: #6b7280;
		cursor: pointer;
		flex-shrink: 0;

		&:hover {
			background: rgba(15, 23, 42, 0.06);
			color: #111827;
		}
	`,
	formBody: css`
		display: flex;
		flex-direction: column;
		gap: 12px;
		overflow-y: auto;
		padding-right: 2px;
	`,
	fieldGroup: css`
		display: flex;
		flex-direction: column;
		gap: 8px;
	`,
	optionLabel: css`
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 14px 16px;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		background: #f3f4f6;
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease,
			box-shadow 0.15s ease;

		&:hover {
			border-color: #cbd5e1;
			background: #eef2f7;
		}
	`,
	optionLabelSelected: css`
		border-color: ${token.colorPrimary};
		background: rgba(59, 130, 246, 0.08);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
	`,
	radioInput: css`
		margin: 2px 0 0;
		flex-shrink: 0;
	`,
	optionContent: css`
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	`,
	optionTitle: css`
		font-size: ${token.fontSize}px;
		font-weight: 600;
		line-height: 1.35;
		color: #111827;
	`,
	optionDescription: css`
		font-size: calc(${token.fontSizeSM}px + 1px);
		line-height: 1.55;
		color: #6b7280;
		white-space: pre-wrap;
		word-break: break-word;
	`,
	inputLabel: css`
		font-size: calc(${token.fontSizeSM}px + 1px);
		font-weight: 600;
		color: #111827;
	`,
	textInput: css`
		width: 100%;
		box-sizing: border-box;
		padding: 12px 14px;
		border-radius: 12px;
		border: 1px solid #d1d5db;
		background: #fff;
		font-size: ${token.fontSize}px;
		line-height: 1.5;
		color: #111827;

		&:focus {
			outline: none;
			border-color: ${token.colorPrimary};
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
		}
	`,
	jsonTextarea: css`
		width: 100%;
		font-size: calc(${token.fontSizeSM}px + 1px);
		line-height: 1.5;
		font-family: ${token.fontFamilyCode};
		border: 1px solid #d1d5db;
		border-radius: 12px;
		padding: 12px 14px;
		background: #fff;
		color: #111827;
		resize: vertical;
		min-height: 112px;
		box-sizing: border-box;

		&:focus {
			outline: none;
			border-color: ${token.colorPrimary};
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
		}
	`,
	actions: css`
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	`,
	actionHint: css`
		font-size: ${token.fontSizeSM}px;
		color: #6b7280;
	`,
	submitButton: css`
		width: 100%;
		padding: 12px 14px;
		border: 0;
		border-radius: 12px;
		background: #f3f4f6;
		color: #9ca3af;
		font-size: ${token.fontSize}px;
		font-weight: 600;
		line-height: 1.2;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;

		&:hover {
			background: #e5e7eb;
			color: #6b7280;
		}
	`,
}));

type SchemaProperty = {
	type?: string;
	title?: string;
	description?: string;
	enum?: string[];
	default?: unknown;
};

function renderField(
	key: string,
	prop: SchemaProperty,
	value: unknown,
	onChange: (v: unknown) => void,
	styles: ReturnType<typeof useStyles>["styles"],
) {
	const label = prop.title || key;

	if (prop.enum?.length) {
		const selected = String(value ?? prop.default ?? prop.enum[0] ?? "");
		return (
			<div key={key} className={styles.fieldGroup}>
				{Object.keys(prop).length > 1 ? (
					<div className={styles.inputLabel}>{label}</div>
				) : null}
				<div className={styles.formBody}>
					{prop.enum.map((opt) => {
						const isSelected = selected === opt;
						return (
							<label
								key={opt}
								className={`${styles.optionLabel} ${isSelected ? styles.optionLabelSelected : ""}`}
							>
								<input
									type="radio"
									name={key}
									className={styles.radioInput}
									checked={isSelected}
									onChange={() => onChange(opt)}
								/>
								<div className={styles.optionContent}>
									<div className={styles.optionTitle}>{opt}</div>
									{prop.description ? (
										<div className={styles.optionDescription}>{prop.description}</div>
									) : null}
								</div>
							</label>
						);
					})}
				</div>
			</div>
		);
	}

	if (prop.type === "boolean") {
		return (
			<div key={key} className={styles.fieldGroup}>
				<label className={styles.optionLabel}>
					<input
						type="checkbox"
						className={styles.radioInput}
						checked={Boolean(value ?? prop.default ?? false)}
						onChange={(e) => onChange(e.target.checked)}
					/>
					<div className={styles.optionContent}>
						<div className={styles.optionTitle}>{label}</div>
						{prop.description ? (
							<div className={styles.optionDescription}>{prop.description}</div>
						) : null}
					</div>
				</label>
			</div>
		);
	}

	if (prop.type === "number" || prop.type === "integer") {
		return (
			<div key={key} className={styles.fieldGroup}>
				<div className={styles.inputLabel}>{label}</div>
				{prop.description ? (
					<div className={styles.optionDescription}>{prop.description}</div>
				) : null}
				<input
					type="number"
					className={styles.textInput}
					value={String(value ?? prop.default ?? "")}
					onChange={(e) =>
						onChange(
							prop.type === "integer"
								? parseInt(e.target.value, 10)
								: Number(e.target.value),
						)
					}
				/>
			</div>
		);
	}

	return (
		<div key={key} className={styles.fieldGroup}>
			<div className={styles.inputLabel}>{label}</div>
			{prop.description ? (
				<div className={styles.optionDescription}>{prop.description}</div>
			) : null}
			<input
				type="text"
				className={styles.textInput}
				value={String(value ?? prop.default ?? "")}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	);
}

function buildDefaults(schema: Record<string, unknown>): Record<string, unknown> {
	const props = schema.properties as Record<string, SchemaProperty> | undefined;
	if (!props) return {};
	const result: Record<string, unknown> = {};
	for (const [k, p] of Object.entries(props)) {
		result[k] =
			p.default ??
			(p.type === "boolean"
				? false
				: p.type === "number" || p.type === "integer"
					? 0
					: p.enum?.[0] ?? "");
	}
	return result;
}

function SchemaForm({
	schema,
	onSubmit,
	styles,
}: {
	schema: Record<string, unknown>;
	onSubmit: (data: Record<string, unknown>) => void;
	styles: ReturnType<typeof useStyles>["styles"];
}) {
	const props = schema.properties as Record<string, SchemaProperty> | undefined;
	const [values, setValues] = useState<Record<string, unknown>>(() =>
		buildDefaults(schema),
	);

	if (!props || Object.keys(props).length === 0) {
		return (
			<div className={styles.actions}>
				<span className={styles.actionHint}>Esc to cancel</span>
				<button type="button" className={styles.submitButton} onClick={() => onSubmit({})}>
					Submit answers
				</button>
			</div>
		);
	}

	const setField = (key: string, val: unknown) =>
		setValues((prev) => ({ ...prev, [key]: val }));

	return (
		<>
			<div className={styles.formBody}>
				{Object.entries(props).map(([key, prop]) =>
					renderField(key, prop, values[key], (v) => setField(key, v), styles),
				)}
			</div>
			<div className={styles.actions}>
				<span className={styles.actionHint}>Esc to cancel</span>
				<button
					type="button"
					className={styles.submitButton}
					onClick={() => onSubmit(values)}
				>
					Submit answers
				</button>
			</div>
		</>
	);
}

function FallbackJsonForm({
	onSubmit,
	styles,
}: {
	onSubmit: (data: Record<string, unknown>) => void;
	styles: ReturnType<typeof useStyles>["styles"];
}) {
	const [value, setValue] = useState("{}");
	const handleSubmit = () => {
		try {
			onSubmit(JSON.parse(value) as Record<string, unknown>);
		} catch {
			// let user fix invalid JSON
		}
	};

	return (
		<>
			<div className={styles.formBody}>
				<div className={styles.inputLabel}>Answer</div>
				<textarea
					className={styles.jsonTextarea}
					value={value}
					onChange={(e) => setValue(e.target.value)}
				/>
			</div>
			<div className={styles.actions}>
				<span className={styles.actionHint}>Esc to cancel</span>
				<button type="button" className={styles.submitButton} onClick={handleSubmit}>
					Submit answers
				</button>
			</div>
		</>
	);
}

export function ElicitationForm({ elicitation, onClose, onSubmit }: Props) {
	const { styles } = useStyles();
	const { mcpServerName, message, requestedSchema } = elicitation;
	const hasProperties =
		typeof requestedSchema?.properties === "object" &&
		requestedSchema.properties !== null &&
		Object.keys(requestedSchema.properties).length > 0;
	const fallbackMessage = useMemo(
		() =>
			message?.trim() ||
			"Claude 需要你补充一个选项或输入，确认后会继续当前任务。",
		[message],
	);
	const title = useMemo(() => {
		const schemaTitle =
			typeof requestedSchema?.title === "string"
				? requestedSchema.title.trim()
				: "";
		return schemaTitle || `${mcpServerName} 需要更多信息`;
	}, [mcpServerName, requestedSchema]);
	const normalizedLines = useMemo(
		() =>
			fallbackMessage
				.split(/\n+/)
				.map((line) => line.trim())
				.filter(Boolean),
		[fallbackMessage],
	);
	const primaryMessage = normalizedLines[0] ?? "";
	const secondaryMessage = normalizedLines.slice(1).join("\n\n");
	const handleDecline = useMemo(
		() => () => {
			onClose?.();
			onSubmit("decline");
		},
		[onClose, onSubmit],
	);

	return (
		<div className={styles.card}>
			<div className={styles.headerRow}>
				<div className={styles.headerText}>
					<div className={styles.titleBar}>
						<div className={styles.title}>{title}</div>
					</div>
					<div className={styles.message}>{primaryMessage || fallbackMessage}</div>
					{secondaryMessage ? (
						<div className={styles.secondaryMessage}>{secondaryMessage}</div>
					) : null}
				</div>
				<button
					type="button"
					className={styles.closeButton}
					onClick={handleDecline}
					aria-label="关闭请求"
				>
					<X size={16} />
				</button>
			</div>

			{hasProperties ? (
				<SchemaForm
					schema={requestedSchema as Record<string, unknown>}
					onSubmit={(data) => onSubmit("accept", data)}
					styles={styles}
				/>
			) : (
				<FallbackJsonForm
					onSubmit={(data) => onSubmit("accept", data)}
					styles={styles}
				/>
			)}
		</div>
	);
}
