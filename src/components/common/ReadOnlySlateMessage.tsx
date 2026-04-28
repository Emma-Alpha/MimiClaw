import type { ReactNode } from "react";
import type { Descendant } from "slate";

import { createStyles } from "antd-style";

import MentionChip from "@/components/MentionChip";

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
}));

function renderNodes(nodes: unknown[]): ReactNode[] {
	const result: ReactNode[] = [];
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		if (isTextNode(node)) {
			if (node.text) result.push(node.text);
		} else if (isSkillNode(node)) {
			result.push(
				<MentionChip key={`s-${i}`} kind="skill" label={node.command} />,
			);
		} else if (isPathNode(node)) {
			result.push(
				<MentionChip
					key={`p-${i}`}
					kind={node.path.isDirectory ? "folder" : "file"}
					label={node.path.name}
					title={node.path.absolutePath}
				/>,
			);
		} else if (
			typeof node === "object" &&
			node !== null &&
			Array.isArray((node as { children?: unknown }).children)
		) {
			const children = (node as { children: unknown[] }).children;
			const inner = renderNodes(children);
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

	const rendered = renderNodes(content);
	if (rendered.length === 0) {
		const plain = extractPlainText(content);
		return plain ? <span>{plain}</span> : null;
	}

	return <div className={styles.root}>{rendered}</div>;
}
