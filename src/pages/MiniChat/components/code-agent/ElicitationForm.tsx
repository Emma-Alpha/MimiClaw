/**
 * MCP Elicitation form.
 *
 * Renders a dynamic form from a JSON Schema for MCP server elicitation requests.
 * Uses a lightweight built-in renderer (no external rjsf dependency required).
 */
import { useState } from "react";
import { createStyles } from "antd-style";
import type { PendingElicitation } from "@/stores/code-agent";

interface Props {
	elicitation: PendingElicitation;
	onSubmit: (action: "accept" | "decline", content?: Record<string, unknown>) => void;
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
		color: ${token.colorText};
	`,
	message: css`
		font-size: 12px;
		color: ${token.colorTextSecondary};
	`,
	fieldGroup: css`
		display: flex;
		flex-direction: column;
		gap: 4px;
	`,
	label: css`
		font-size: 11px;
		color: ${token.colorTextSecondary};
		font-weight: 500;
	`,
	input: css`
		font-size: 12px;
		font-family: inherit;
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 5px;
		padding: 4px 7px;
		background: ${token.colorFillSecondary};
		color: ${token.colorText};
		width: 100%;
		box-sizing: border-box;
		&:focus {
			outline: 1px solid ${token.colorPrimary};
			border-color: ${token.colorPrimary};
		}
	`,
	checkbox: css`margin-right: 5px;`,
	jsonTextarea: css`
		width: 100%;
		font-size: 11px;
		font-family: monospace;
		border: 1px solid ${token.colorBorderSecondary};
		border-radius: 6px;
		padding: 6px 8px;
		background: ${token.colorFillSecondary};
		color: ${token.colorText};
		resize: vertical;
		min-height: 60px;
		box-sizing: border-box;
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
	submitBtn: css`
		background: ${token.colorPrimary};
		color: #fff;
	`,
	cancelBtn: css`
		background: ${token.colorFillSecondary};
		color: ${token.colorText};
		border-color: ${token.colorBorderSecondary};
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

	if (prop.type === "boolean") {
		return (
			<label key={key} className={styles.label} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
				<input
					type="checkbox"
					className={styles.checkbox}
					checked={Boolean(value ?? prop.default ?? false)}
					onChange={(e) => onChange(e.target.checked)}
				/>
				{label}
			</label>
		);
	}

	if (prop.enum) {
		return (
			<div key={key} className={styles.fieldGroup}>
				<span className={styles.label}>{label}</span>
				<select
					className={styles.input}
					value={String(value ?? prop.default ?? prop.enum[0] ?? "")}
					onChange={(e) => onChange(e.target.value)}
				>
					{prop.enum.map((opt) => (
						<option key={opt} value={opt}>{opt}</option>
					))}
				</select>
			</div>
		);
	}

	if (prop.type === "number" || prop.type === "integer") {
		return (
			<div key={key} className={styles.fieldGroup}>
				<span className={styles.label}>{label}</span>
				<input
					type="number"
					className={styles.input}
					value={String(value ?? prop.default ?? "")}
					onChange={(e) => onChange(prop.type === "integer" ? parseInt(e.target.value, 10) : Number(e.target.value))}
				/>
			</div>
		);
	}

	// string / default
	return (
		<div key={key} className={styles.fieldGroup}>
			<span className={styles.label}>{label}</span>
			<input
				type="text"
				className={styles.input}
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
		result[k] = p.default ?? (p.type === "boolean" ? false : p.type === "number" || p.type === "integer" ? 0 : "");
	}
	return result;
}

function SchemaForm({
	schema,
	onSubmit,
	onDecline,
	styles,
}: {
	schema: Record<string, unknown>;
	onSubmit: (data: Record<string, unknown>) => void;
	onDecline: () => void;
	styles: ReturnType<typeof useStyles>["styles"];
}) {
	const props = schema.properties as Record<string, SchemaProperty> | undefined;
	const [values, setValues] = useState<Record<string, unknown>>(() => buildDefaults(schema));

	if (!props || Object.keys(props).length === 0) {
		return (
			<div className={styles.actions}>
				<button type="button" className={`${styles.btn} ${styles.cancelBtn}`} onClick={onDecline}>取消</button>
				<button type="button" className={`${styles.btn} ${styles.submitBtn}`} onClick={() => onSubmit({})}>确认</button>
			</div>
		);
	}

	const setField = (key: string, val: unknown) =>
		setValues((prev) => ({ ...prev, [key]: val }));

	return (
		<>
			{Object.entries(props).map(([key, prop]) =>
				renderField(key, prop, values[key], (v) => setField(key, v), styles),
			)}
			<div className={styles.actions}>
				<button type="button" className={`${styles.btn} ${styles.cancelBtn}`} onClick={onDecline}>取消</button>
				<button type="button" className={`${styles.btn} ${styles.submitBtn}`} onClick={() => onSubmit(values)}>提交</button>
			</div>
		</>
	);
}

function FallbackJsonForm({
	onSubmit,
	onDecline,
	styles,
}: {
	onSubmit: (data: Record<string, unknown>) => void;
	onDecline: () => void;
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
			<textarea
				className={styles.jsonTextarea}
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/>
			<div className={styles.actions}>
				<button type="button" className={`${styles.btn} ${styles.cancelBtn}`} onClick={onDecline}>取消</button>
				<button type="button" className={`${styles.btn} ${styles.submitBtn}`} onClick={handleSubmit}>提交</button>
			</div>
		</>
	);
}

export function ElicitationForm({ elicitation, onSubmit }: Props) {
	const { styles } = useStyles();
	const { mcpServerName, message, requestedSchema } = elicitation;
	const hasProperties =
		requestedSchema &&
		requestedSchema.properties &&
		typeof requestedSchema.properties === "object" &&
		Object.keys(requestedSchema.properties).length > 0;

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<span>🔌</span>
				<span>MCP: {mcpServerName} 请求输入</span>
			</div>
			{message && <div className={styles.message}>{message}</div>}

			{hasProperties ? (
				<SchemaForm
					schema={requestedSchema as Record<string, unknown>}
					onSubmit={(data) => onSubmit("accept", data)}
					onDecline={() => onSubmit("decline")}
					styles={styles}
				/>
			) : (
				<FallbackJsonForm
					onSubmit={(data) => onSubmit("accept", data)}
					onDecline={() => onSubmit("decline")}
					styles={styles}
				/>
			)}
		</div>
	);
}
