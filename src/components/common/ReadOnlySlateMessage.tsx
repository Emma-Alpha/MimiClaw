import type { ReactNode } from "react";
import type { Descendant } from "slate";
import { File as FileIcon, Folder } from "lucide-react";
import { createStyles } from "antd-style";

type SlatePathNode = {
	type: "path";
	path: { absolutePath: string; name: string; isDirectory?: boolean };
	children: unknown[];
};

type SlateSkillNode = {
	type: "skill";
	command: string;
	children: unknown[];
};

function isPathNode(value: unknown): value is SlatePathNode {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { type?: string }).type === "path" &&
		typeof (value as SlatePathNode).path === "object"
	);
}

function isSkillNode(value: unknown): value is SlateSkillNode {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { type?: string }).type === "skill" &&
		typeof (value as SlateSkillNode).command === "string"
	);
}

function isTextNode(value: unknown): value is { text: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { text?: unknown }).text === "string"
	);
}

const useStyles = createStyles(({ token, css }) => ({
	root: css`
		font-size: 13px;
		line-height: 1.5;
		color: ${token.colorText};
		white-space: pre-wrap;
		word-break: break-word;
	`,
	pathChip: css`
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 2px 8px;
		margin: 0 2px;
		border-radius: 14px;
		background: ${token.colorFillQuaternary};
		border: 1px solid ${token.colorBorderSecondary};
		font-size: 12px;
		color: ${token.colorText};
		max-width: 220px;
		vertical-align: middle;
	`,
	pathName: css`
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
	skillChip: css`
		color: #c47a2a;
		font-weight: 600;
		margin: 0 2px;
		padding: 0 2px;
	`,
}));

function renderNodes(
	nodes: unknown[],
	styles: ReturnType<typeof useStyles>["styles"],
): ReactNode[] {
	const result: ReactNode[] = [];
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		if (isTextNode(node)) {
			if (node.text) result.push(node.text);
		} else if (isSkillNode(node)) {
			result.push(
				<span key={`s-${i}`} className={styles.skillChip}>
					{node.command}
				</span>,
			);
		} else if (isPathNode(node)) {
			result.push(
				<span
					key={`p-${i}`}
					className={styles.pathChip}
					title={node.path.absolutePath}
				>
					<span style={{ display: "inline-flex", flexShrink: 0 }}>
						{node.path.isDirectory ? (
							<Folder style={{ width: 12, height: 12 }} />
						) : (
							<FileIcon style={{ width: 12, height: 12 }} />
						)}
					</span>
					<span className={styles.pathName}>{node.path.name}</span>
				</span>,
			);
		} else if (
			typeof node === "object" &&
			node !== null &&
			Array.isArray((node as { children?: unknown }).children)
		) {
			const children = (node as { children: unknown[] }).children;
			const inner = renderNodes(children, styles);
			if ((node as { type?: string }).type === "paragraph") {
				result.push(<div key={`b-${i}`}>{inner}</div>);
			} else {
				result.push(...inner);
			}
		}
	}
	return result;
}

type Props = {
	content: Descendant[];
};

function extractPlainText(nodes: unknown[]): string {
	const parts: string[] = [];
	for (const node of nodes) {
		if (isTextNode(node)) {
			parts.push(node.text);
		} else if (isSkillNode(node)) {
			parts.push(node.command);
		} else if (isPathNode(node)) {
			parts.push(node.path.name);
		} else if (
			typeof node === "object" &&
			node !== null &&
			Array.isArray((node as { children?: unknown }).children)
		) {
			parts.push(extractPlainText((node as { children: unknown[] }).children));
		}
	}
	return parts.join("");
}

export function ReadOnlySlateMessage({ content }: Props) {
	const { styles } = useStyles();

	if (!content || !Array.isArray(content) || content.length === 0) {
		return null;
	}

	const rendered = renderNodes(content, styles);
	if (rendered.length === 0) {
		const plain = extractPlainText(content);
		return plain ? <span>{plain}</span> : null;
	}

	return <div className={styles.root}>{rendered}</div>;
}
