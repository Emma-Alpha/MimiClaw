import { useCallback, useMemo, type MouseEvent } from "react";
import type { MarkdownProps } from "@lobehub/ui";
import { invokeIpc } from "@/lib/api-client";
import {
	useEnhancedMarkdownProps,
	type EnhancedMarkdownProps,
} from "@/lib/markdown-enhancements";

type MdastNode = {
	type?: string;
	value?: string;
	url?: string;
	children?: MdastNode[];
};

type FileReferenceTarget = {
	filePath: string;
	line: number;
	column?: number;
};

const FILE_REFERENCE_LINK_PROTOCOL = "mimiclaw-file-ref:";
const FILE_REFERENCE_LINK_HOST = "open";
const FILE_REFERENCE_REGEX =
	/((?:[A-Za-z]:[\\/]|\/|\.{1,2}[\\/])?(?:[\w.-]+[\\/])+[\w.-]+\.[A-Za-z0-9]+):([1-9]\d*)(?::([1-9]\d*))?/g;
const EXACT_FILE_REFERENCE_REGEX =
	/^((?:[A-Za-z]:[\\/]|\/|\.{1,2}[\\/])?(?:[\w.-]+[\\/])+[\w.-]+\.[A-Za-z0-9]+):([1-9]\d*)(?::([1-9]\d*))?$/;
const FILE_REFERENCE_BOUNDARY = /[\s()[\]{}"'`<>,.;!?“”‘’，。；：！？（）【】]/;

function isBoundaryChar(value: string | undefined): boolean {
	if (!value) return true;
	return FILE_REFERENCE_BOUNDARY.test(value);
}

function buildFileReferenceHref(target: FileReferenceTarget): string {
	const params = new URLSearchParams();
	params.set("path", target.filePath);
	params.set("line", String(target.line));
	if (typeof target.column === "number" && target.column > 0) {
		params.set("column", String(target.column));
	}
	return `${FILE_REFERENCE_LINK_PROTOCOL}//${FILE_REFERENCE_LINK_HOST}?${params.toString()}`;
}

function parsePositiveInteger(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return null;
	const normalized = Math.floor(parsed);
	return normalized > 0 ? normalized : null;
}

function parseFileReferenceHref(href: string | null | undefined): FileReferenceTarget | null {
	if (!href) return null;
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(href);
	} catch {
		return null;
	}

	if (parsedUrl.protocol !== FILE_REFERENCE_LINK_PROTOCOL) return null;
	if (parsedUrl.hostname !== FILE_REFERENCE_LINK_HOST) return null;

	const filePath = parsedUrl.searchParams.get("path")?.trim();
	if (!filePath) return null;

	const line = parsePositiveInteger(parsedUrl.searchParams.get("line"));
	if (!line) return null;

	const column = parsePositiveInteger(parsedUrl.searchParams.get("column")) ?? undefined;
	return { filePath, line, column };
}

function normalizePathSeparators(filePath: string): string {
	return filePath.replace(/\\/g, "/");
}

function isAbsolutePathLike(filePath: string): boolean {
	const normalized = normalizePathSeparators(filePath);
	return normalized.startsWith("/") || normalized.startsWith("//") || /^[A-Za-z]:\//.test(normalized);
}

function resolveReferencePath(filePath: string, workspaceRoot?: string): string | null {
	const normalizedPath = normalizePathSeparators(filePath).trim();
	if (!normalizedPath) return null;

	if (isAbsolutePathLike(normalizedPath)) {
		return normalizedPath;
	}

	const normalizedWorkspaceRoot = normalizePathSeparators(workspaceRoot ?? "")
		.trim()
		.replace(/\/+$/, "");
	if (!normalizedWorkspaceRoot || !isAbsolutePathLike(normalizedWorkspaceRoot)) {
		return null;
	}

	const relativePath = normalizedPath.replace(/^\.\/+/, "");
	return `${normalizedWorkspaceRoot}/${relativePath}`;
}

async function openFileReferenceTarget(
	target: FileReferenceTarget,
	workspaceRoot?: string,
): Promise<void> {
	const resolvedPath = resolveReferencePath(target.filePath, workspaceRoot);
	if (!resolvedPath) return;

	await invokeIpc("shell:openPathAtLine", {
		path: resolvedPath,
		line: target.line,
		column: target.column ?? 1,
	});
}

function linkifyTextNode(text: string): MdastNode[] | null {
	if (!text) return null;

	FILE_REFERENCE_REGEX.lastIndex = 0;
	let hasLinkedSegment = false;
	let cursor = 0;
	const output: MdastNode[] = [];

	let match: RegExpExecArray | null;
	while ((match = FILE_REFERENCE_REGEX.exec(text)) !== null) {
		const [fullMatch, rawPath, rawLine, rawColumn] = match;
		if (!rawPath || !rawLine) continue;

		const start = match.index;
		const end = start + fullMatch.length;
		const prevChar = start > 0 ? text[start - 1] : undefined;
		const nextChar = end < text.length ? text[end] : undefined;

		if (!isBoundaryChar(prevChar) || !isBoundaryChar(nextChar)) {
			continue;
		}

		if (start > cursor) {
			output.push({
				type: "text",
				value: text.slice(cursor, start),
			});
		}

		const line = parsePositiveInteger(rawLine);
		if (!line) continue;
		const column = parsePositiveInteger(rawColumn) ?? undefined;

		output.push({
			type: "link",
			url: buildFileReferenceHref({
				filePath: rawPath,
				line,
				column,
			}),
			children: [
				{
					type: "inlineCode",
					value: fullMatch,
				},
			],
		});

		hasLinkedSegment = true;
		cursor = end;
	}

	if (!hasLinkedSegment) return null;

	if (cursor < text.length) {
		output.push({
			type: "text",
			value: text.slice(cursor),
		});
	}

	return output;
}

function parseExactFileReference(text: string): FileReferenceTarget | null {
	const value = text.trim();
	if (!value) return null;

	const match = value.match(EXACT_FILE_REFERENCE_REGEX);
	if (!match) return null;

	const [, filePath, rawLine, rawColumn] = match;
	const line = parsePositiveInteger(rawLine);
	if (!filePath || !line) return null;
	const column = parsePositiveInteger(rawColumn) ?? undefined;

	return { filePath, line, column };
}

function transformTreeNode(node: MdastNode, parentType?: string): MdastNode {
	const children = Array.isArray(node.children) ? node.children : null;
	if (!children || children.length === 0) return node;

	const transformedChildren: MdastNode[] = [];
	for (const child of children) {
		if (!child || typeof child !== "object") {
			continue;
		}

		const transformedChild = transformTreeNode(child, node.type);
		if (
			parentType !== "link"
			&& node.type !== "link"
			&& transformedChild.type === "text"
			&& typeof transformedChild.value === "string"
		) {
			const linkedNodes = linkifyTextNode(transformedChild.value);
			if (linkedNodes) {
				transformedChildren.push(...linkedNodes);
				continue;
			}
		}

		if (
			parentType !== "link"
			&& node.type !== "link"
			&& transformedChild.type === "inlineCode"
			&& typeof transformedChild.value === "string"
		) {
			const fileReference = parseExactFileReference(transformedChild.value);
			if (fileReference) {
				transformedChildren.push({
					type: "link",
					url: buildFileReferenceHref(fileReference),
					children: [
						{
							type: "inlineCode",
							value: transformedChild.value.trim(),
						},
					],
				});
				continue;
			}
		}

		transformedChildren.push(transformedChild);
	}

	return {
		...node,
		children: transformedChildren,
	};
}

function remarkFileReferenceLinks() {
	return (tree: MdastNode) => {
		if (!tree || typeof tree !== "object") return;

		const transformed = transformTreeNode(tree);
		if (Array.isArray(transformed.children)) {
			tree.children = transformed.children;
		}
	};
}

export function useFileReferenceMarkdownProps(
	workspaceRoot?: string,
): EnhancedMarkdownProps {
	const onAnchorClick = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			const href = event.currentTarget.getAttribute("href");
			const target = parseFileReferenceHref(href);
			if (!target) return;

			event.preventDefault();
			event.stopPropagation();

			void openFileReferenceTarget(target, workspaceRoot).catch((error) => {
				console.warn("[MiniChat] Failed to open file reference:", error);
			});
		},
		[workspaceRoot],
	);

	const fileReferenceComponentProps = useMemo<NonNullable<MarkdownProps["componentProps"]>>(
		() => ({
			a: {
				onClick: onAnchorClick,
			},
		}),
		[onAnchorClick],
	);

	const fileReferenceRemarkPlugins = useMemo<NonNullable<MarkdownProps["remarkPlugins"]>>(
		() => [remarkFileReferenceLinks],
		[],
	);

	return useEnhancedMarkdownProps({
		remarkPlugins: fileReferenceRemarkPlugins,
		componentProps: fileReferenceComponentProps,
	});
}

export const __INTERNAL__ = {
	buildFileReferenceHref,
	parseFileReferenceHref,
	resolveReferencePath,
	linkifyTextNode,
	parseExactFileReference,
};
