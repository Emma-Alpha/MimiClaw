import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
	createEditor,
	Editor,
	Element as SlateElement,
	Node,
	Path,
	Range,
	Transforms,
	type Descendant,
} from "slate";
import {
	Editable,
	ReactEditor,
	Slate,
	withReact,
	type RenderElementProps,
} from "slate-react";
import { File as FileIcon, Folder, Link2, X } from "lucide-react";
import {
	extractSnippetReferencePathsFromClipboard,
	extractSnippetReferencePathsFromText,
	extractComposerPathsFromTransfer,
	isPathDrag,
	type ComposerPath,
} from "@/lib/unified-composer";

export type UnifiedComposerInputValue = {
	text: string;
	paths: ComposerPath[];
	skills?: string[];
	/** Full Slate editor tree for faithful message-list rendering */
	richContent?: import("slate").Descendant[];
};

export type UnifiedComposerInputHandle = {
	insertSkill: (command: string, replaceRange?: { start: number; end: number }) => void;
	removeSkill: () => void;
	insertMention: (path: ComposerPath, replaceRange: { start: number; end: number }) => void;
	focus: () => void;
};

type SlatePathElement = {
	type: "path";
	path: ComposerPath;
	children: [{ text: "" }];
};

type SlateSkillElement = {
	type: "skill";
	command: string;
	children: [{ text: "" }];
};

type SlateParagraphElement = {
	type: "paragraph";
	children: Array<{ text: string } | SlatePathElement | SlateSkillElement>;
};

function isSlatePathElement(value: unknown): value is SlatePathElement {
	return (
		SlateElement.isElement(value) &&
		(value as { type?: string }).type === "path"
	);
}

function isSlateSkillElement(value: unknown): value is SlateSkillElement {
	return (
		SlateElement.isElement(value) &&
		(value as { type?: string }).type === "skill"
	);
}

function createPathElement(path: ComposerPath): SlatePathElement {
	return {
		type: "path",
		path,
		children: [{ text: "" }],
	};
}

function createSkillElement(command: string): SlateSkillElement {
	return {
		type: "skill",
		command,
		children: [{ text: "" }],
	};
}

function createEditorValue(
	text: string,
	paths: ComposerPath[],
	skills?: string[],
): Descendant[] {
	const children: SlateParagraphElement["children"] = [];
	if (skills) {
		for (const cmd of skills) {
			children.push(createSkillElement(cmd));
			children.push({ text: " " });
		}
	}
	if (text) {
		children.push({ text });
	}
	for (const path of paths) {
		children.push(createPathElement(path));
		children.push({ text: " " });
	}
	if (children.length === 0) {
		children.push({ text: "" });
	}
	return [{ type: "paragraph", children } as SlateParagraphElement];
}

const SNIPPET_RANGE_SUFFIX_PATTERN = /\(\s*\d+\s*(?:-\s*\d+)?\s*\)\s*$/;
const STANDARD_CLIPBOARD_TEXT_TYPES = new Set([
	"text/plain",
	"text/html",
	"text/uri-list",
	"public.file-url",
	"Files",
]);

function shouldConsumeSnippetReferencePaste(rawText: string): boolean {
	const nonEmptyLines = rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (nonEmptyLines.length === 0 || nonEmptyLines.length > 4) return false;
	return nonEmptyLines.every(
		(line) => extractSnippetReferencePathsFromText(line).length > 0,
	);
}

function collectClipboardExtraTextPayloads(
	dataTransfer: DataTransfer | null,
): string[] {
	if (!dataTransfer) return [];

	const payloads: string[] = [];
	for (const type of Array.from(dataTransfer.types ?? [])) {
		if (!type || STANDARD_CLIPBOARD_TEXT_TYPES.has(type)) continue;
		try {
			const raw = dataTransfer.getData(type);
			if (!raw?.trim()) continue;
			payloads.push(raw.slice(0, 80_000));
		} catch {
			// Ignore non-readable custom clipboard types.
		}
	}
	return payloads;
}

function getPathChipLabel(path: ComposerPath): string {
	const label = path.name?.trim();
	if (label) return label;
	const absolutePath = path.absolutePath?.trim();
	if (!absolutePath) return "";
	return absolutePath.split(/[\\/]/).pop() || absolutePath;
}

function isSnippetReferenceLabel(label: string): boolean {
	return SNIPPET_RANGE_SUFFIX_PATTERN.test(label.trim());
}

function extractEditorText(value: Descendant[]): string {
	return value.map((node) => Node.string(node)).join("\n");
}

function extractEditorPaths(value: Descendant[]): ComposerPath[] {
	const found: ComposerPath[] = [];
	const seen = new Set<string>();

	const visit = (nodes: Descendant[]) => {
		for (const node of nodes) {
			if (isSlatePathElement(node)) {
				const absolutePath = node.path.absolutePath.trim();
				if (!absolutePath || seen.has(absolutePath)) continue;
				seen.add(absolutePath);
				found.push(node.path);
				continue;
			}
			if (SlateElement.isElement(node)) {
				visit(node.children as Descendant[]);
			}
		}
	};

	visit(value);
	return found;
}

function extractEditorSkills(value: Descendant[]): string[] {
	const found: string[] = [];
	const visit = (nodes: Descendant[]) => {
		for (const node of nodes) {
			if (isSlateSkillElement(node)) {
				found.push(node.command);
				continue;
			}
			if (SlateElement.isElement(node)) {
				visit(node.children as Descendant[]);
			}
		}
	};
	visit(value);
	return found;
}

function samePathSet(left: Set<string> | null, right: Set<string>): boolean {
	if (!left || left.size !== right.size) return false;
	for (const item of left) {
		if (!right.has(item)) return false;
	}
	return true;
}

function withInlineVoids(editor: ReactEditor): ReactEditor {
	const { isInline, isVoid } = editor;
	editor.isInline = (element) =>
		isSlatePathElement(element) || isSlateSkillElement(element) || isInline(element);
	editor.isVoid = (element) =>
		isSlatePathElement(element) || isSlateSkillElement(element) || isVoid(element);
	return editor;
}

function deleteTrailingTokenAtSelection(
	editor: ReactEditor,
	trigger: "@" | "/",
): boolean {
	const selection = editor.selection;
	if (!selection || !Range.isCollapsed(selection)) return false;

	const anchor = selection.anchor;
	let node: Node;
	try {
		node = Node.get(editor, anchor.path);
	} catch {
		return false;
	}
	if (!("text" in node) || typeof node.text !== "string") return false;

	const beforeCaret = node.text.slice(0, anchor.offset);
	const pattern =
		trigger === "@"
			? /(^|\s)@([^\s@]*)$/
			: /(^|\s)\/([a-z0-9-]*)$/i;
	const match = beforeCaret.match(pattern);
	if (!match) return false;

	const token = match[0] ?? "";
	const triggerOffset = token.lastIndexOf(trigger);
	if (triggerOffset < 0) return false;

	const startOffset = anchor.offset - token.length + triggerOffset;
	if (startOffset < 0 || startOffset > anchor.offset) return false;

	Transforms.select(editor, {
		anchor: { path: anchor.path, offset: startOffset },
		focus: anchor,
	});
	Transforms.delete(editor);
	return true;
}

export interface UnifiedComposerInputProps {
	value: UnifiedComposerInputValue;
	onChange: (value: UnifiedComposerInputValue) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	placeholderClassName?: string;
	pathChipClassName?: string;
	pathChipIconClassName?: string;
	pathChipNameClassName?: string;
	pathChipRemoveClassName?: string;
	skillChipClassName?: string;
	removePathTitle?: string;
	onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onPressEnter?: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onCompositionStart?: () => void;
	onCompositionEnd?: () => void;
	onFocusChange?: (focused: boolean) => void;
	onCaretChange?: (index: number) => void;
	onPaste?: React.ClipboardEventHandler<HTMLDivElement>;
	onVisualMultilineChange?: (multiline: boolean) => void;
	maxPaths?: number;
}

export const UnifiedComposerInput = forwardRef<UnifiedComposerInputHandle, UnifiedComposerInputProps>(function UnifiedComposerInput({
	value,
	onChange,
	placeholder,
	disabled = false,
	className,
	placeholderClassName,
	pathChipClassName,
	pathChipIconClassName,
	pathChipNameClassName,
	pathChipRemoveClassName,
	skillChipClassName,
	removePathTitle = "移除路径",
	onKeyDown,
	onPressEnter,
	onCompositionStart,
	onCompositionEnd,
	onFocusChange,
	onCaretChange,
	onPaste,
	onVisualMultilineChange,
	maxPaths = 20,
}, ref) {
	const editor = useMemo(
		() => withInlineVoids(withReact(createEditor() as ReactEditor)),
		[],
	);
	const [editorValue, setEditorValue] = useState<Descendant[]>(() =>
		createEditorValue(value.text, value.paths),
	);
	const [editorInitialValue, setEditorInitialValue] = useState<Descendant[]>(() =>
		createEditorValue(value.text, value.paths),
	);
	const [editorVersion, setEditorVersion] = useState(0);
	const editorDomRef = useRef<HTMLDivElement | null>(null);
	const visualMultilineRef = useRef(false);
	const pendingTextEchoRef = useRef<string | null>(null);
	const pendingPathSetRef = useRef<Set<string> | null>(null);

	const resetSlateValue = useCallback((next: Descendant[]) => {
		setEditorInitialValue(next);
		setEditorValue(next);
		setEditorVersion((previous) => previous + 1);
	}, []);

	const removePathFromEditor = useCallback(
		(absolutePath: string) => {
			const matches = Array.from(
				Editor.nodes(editor, {
					at: [],
					match: (node) =>
						isSlatePathElement(node) &&
						node.path.absolutePath === absolutePath,
				}),
			);
			for (let i = matches.length - 1; i >= 0; i -= 1) {
				Transforms.removeNodes(editor, { at: matches[i][1] });
			}
		},
		[editor],
	);

	const placeCaretAfterPathChip = useCallback(
		(absolutePath: string) => {
			const matches = Array.from(
				Editor.nodes(editor, {
					at: [],
					match: (node) =>
						isSlatePathElement(node) &&
						node.path.absolutePath === absolutePath,
				}),
			);

			const endPoint = Editor.end(editor, []);
			if (matches.length === 0) {
				Transforms.select(editor, endPoint);
				ReactEditor.focus(editor);
				return;
			}

			const [, nodePath] = matches[matches.length - 1];
			let after = Editor.after(editor, nodePath);
			if (!after) {
				const nextPath = Path.next(nodePath);
				Transforms.insertNodes(editor, { text: "" }, { at: nextPath });
				after = { path: nextPath, offset: 0 };
			}
			Transforms.select(editor, after ?? endPoint);
			ReactEditor.focus(editor);
		},
		[editor],
	);

	const insertDroppedPathsAtCaret = useCallback(
		(paths: ComposerPath[]) => {
			if (!paths.length) return;

			const existing = new Set(
				extractEditorPaths(editor.children as Descendant[]).map(
					(item) => item.absolutePath,
				),
			);

			if (existing.size >= maxPaths) return;

			if (!editor.selection) {
				Transforms.select(editor, Editor.end(editor, []));
			}

			let inserted = false;
			for (const item of paths) {
				if (existing.size >= maxPaths) break;
				const absolutePath = item?.absolutePath?.trim();
				if (!absolutePath || existing.has(absolutePath)) continue;
				existing.add(absolutePath);
				inserted = true;
				Transforms.insertNodes(
					editor,
					createPathElement({
						absolutePath,
						name:
							item?.name?.trim() ||
							absolutePath.split(/[\\/]/).pop() ||
							absolutePath,
						isDirectory: Boolean(item?.isDirectory),
					}),
				);
				Transforms.insertText(editor, " ");
			}

			if (inserted) {
				requestAnimationFrame(() => {
					ReactEditor.focus(editor);
				});
			}
		},
		[editor, maxPaths],
	);

	const removeExistingSkills = useCallback(
		(ed: ReactEditor) => {
			const matches = Array.from(
				Editor.nodes(ed, {
					at: [],
					match: (node) => isSlateSkillElement(node),
				}),
			);
			for (let i = matches.length - 1; i >= 0; i -= 1) {
				Transforms.removeNodes(ed, { at: matches[i][1] });
			}
		},
		[],
	);

	const textOffsetToSlatePoint = useCallback(
		(targetOffset: number): { path: number[]; offset: number } | null => {
			let remaining = targetOffset;
			const paragraph = editor.children[0];
			if (!paragraph || !SlateElement.isElement(paragraph)) return null;
			let fallbackTextPath: number[] | null = null;

			for (let i = 0; i < paragraph.children.length; i++) {
				const child = paragraph.children[i];
				if ("text" in child && typeof child.text === "string") {
					if (!fallbackTextPath) {
						fallbackTextPath = [0, i];
					}
					// Skip zero-length text nodes so offset 0 does not map before inline voids.
					if (child.text.length === 0) {
						continue;
					}
					if (remaining <= child.text.length) {
						return { path: [0, i], offset: remaining };
					}
					remaining -= child.text.length;
				}
			}
			if (remaining <= 0 && fallbackTextPath) {
				return { path: fallbackTextPath, offset: 0 };
			}
			return Editor.end(editor, []);
		},
		[editor],
	);

	const pendingFocusRef = useRef(false);
	const focusEditorAtEnd = useCallback(() => {
		try {
			const end = Editor.end(editor, []);
			Transforms.select(editor, end);
		} catch {
			// Ignore selection failures while editor is remounting.
		}

		requestAnimationFrame(() => {
			try {
				const element = editorDomRef.current;
				element?.focus({ preventScroll: true });
				ReactEditor.focus(editor);
			} catch {
				// Slate DOM may still be stabilizing.
			}
		});
	}, [editor]);

	const insertSkill = useCallback(
		(command: string, replaceRange?: { start: number; end: number }) => {
			const existing = new Set(
				extractEditorSkills(editor.children as Descendant[]),
			);
			if (existing.has(command)) return;

			Editor.withoutNormalizing(editor, () => {
				const removedBySelection = deleteTrailingTokenAtSelection(editor, "/");
				if (!removedBySelection && replaceRange) {
					const startPoint = textOffsetToSlatePoint(replaceRange.start);
					const endPoint = textOffsetToSlatePoint(replaceRange.end);
					if (startPoint && endPoint) {
						Transforms.select(editor, { anchor: startPoint, focus: endPoint });
						Transforms.delete(editor);
					}
				}

				if (!editor.selection) {
					Transforms.select(editor, Editor.end(editor, []));
				}
				Transforms.insertNodes(editor, createSkillElement(command));
				Transforms.insertText(editor, " ");
			});

			pendingFocusRef.current = true;
		},
		[editor, textOffsetToSlatePoint],
	);

	const removeSkill = useCallback(() => {
		removeExistingSkills(editor);
		pendingFocusRef.current = true;
	}, [editor, removeExistingSkills]);

	const insertMention = useCallback(
		(path: ComposerPath, replaceRange: { start: number; end: number }) => {
			const existing = new Set(
				extractEditorPaths(editor.children as Descendant[]).map(
					(item) => item.absolutePath,
				),
			);
			if (existing.has(path.absolutePath)) return;

			Editor.withoutNormalizing(editor, () => {
				const removedBySelection = deleteTrailingTokenAtSelection(editor, "@");
				if (!removedBySelection) {
					const startPoint = textOffsetToSlatePoint(replaceRange.start);
					const endPoint = textOffsetToSlatePoint(replaceRange.end);
					if (startPoint && endPoint) {
						Transforms.select(editor, { anchor: startPoint, focus: endPoint });
						Transforms.delete(editor);
					}
				}

				if (!editor.selection) {
					Transforms.select(editor, Editor.end(editor, []));
				}
				Transforms.insertNodes(editor, createPathElement(path));
				Transforms.insertText(editor, " ");
			});

			pendingFocusRef.current = true;
		},
		[editor, textOffsetToSlatePoint],
	);

	useImperativeHandle(ref, () => ({
		insertSkill,
		removeSkill,
		insertMention,
		focus: focusEditorAtEnd,
	}), [focusEditorAtEnd, insertMention, insertSkill, removeSkill]);

	const syncPathsFromParent = useCallback(
		(nextPaths: ComposerPath[]) => {
			const propSet = new Set(nextPaths.map((item) => item.absolutePath));
			const current = extractEditorPaths(editor.children as Descendant[]);
			const currentSet = new Set(current.map((item) => item.absolutePath));
			const toAdd = nextPaths.filter((item) => !currentSet.has(item.absolutePath));
			const toRemove = current.filter((item) => !propSet.has(item.absolutePath));

			if (toAdd.length === 0 && toRemove.length === 0) return;

			Editor.withoutNormalizing(editor, () => {
				for (const item of toRemove) {
					const matches = Array.from(
						Editor.nodes(editor, {
							at: [],
							match: (node) =>
								isSlatePathElement(node) &&
								node.path.absolutePath === item.absolutePath,
						}),
					);
					for (let i = matches.length - 1; i >= 0; i -= 1) {
						Transforms.removeNodes(editor, { at: matches[i][1] });
					}
				}

				if (toAdd.length > 0) {
					if (!editor.selection) {
						Transforms.select(editor, Editor.end(editor, []));
					}
					for (const item of toAdd) {
						Transforms.insertNodes(editor, createPathElement(item));
						Transforms.insertText(editor, " ");
					}
				}
			});
		},
		[editor],
	);

	const syncEditorToParent = useCallback(
		(nextValue: Descendant[]) => {
			const plain = extractEditorText(nextValue);
			const hasNonTextOperation = editor.operations.some(
				(operation) =>
					operation.type !== "set_selection"
					&& operation.type !== "insert_text"
					&& operation.type !== "remove_text",
			);
			const parentSkills = value.skills ?? [];
			const editorHasInlineVoids =
				!hasNonTextOperation
				&& value.paths.length === 0
				&& parentSkills.length === 0
				&& nextValue.some(
					(node) =>
						SlateElement.isElement(node)
						&& node.children.some(
							(child) =>
								isSlatePathElement(child) || isSlateSkillElement(child),
						),
				);
			const shouldScanInlineElements =
				hasNonTextOperation
				|| value.paths.length > 0
				|| parentSkills.length > 0
				|| editorHasInlineVoids;
			const normalizedPlain =
				shouldScanInlineElements
				&& plain.trim().length === 0
				&& value.text.trim().length === 0
					? value.text
					: plain;
			const nextPaths = shouldScanInlineElements
				? extractEditorPaths(nextValue)
				: [];
			const nextSkills = shouldScanInlineElements
				? extractEditorSkills(nextValue)
				: [];
			const nextSet = shouldScanInlineElements
				? new Set(nextPaths.map((item) => item.absolutePath))
				: null;
			const parentSet = shouldScanInlineElements
				? new Set(value.paths.map((item) => item.absolutePath))
				: null;
			const changedText = normalizedPlain !== value.text;
			const changedPaths =
				shouldScanInlineElements
				&& nextSet !== null
				&& parentSet !== null
				&& !samePathSet(parentSet, nextSet);
			const changedSkills =
				shouldScanInlineElements
				&& (nextSkills.length !== parentSkills.length
					|| nextSkills.some((cmd, i) => cmd !== parentSkills[i]));

			if (!changedText && !changedPaths && !changedSkills) {
				return;
			}

			if (changedText) {
				pendingTextEchoRef.current = normalizedPlain;
			}
			if (changedPaths && nextSet) {
				pendingPathSetRef.current = nextSet;
			}

			onChange({
				text: normalizedPlain,
				paths: nextPaths,
				skills: nextSkills,
				richContent: nextValue,
			});
		},
		[editor, onChange, value.paths, value.skills, value.text],
	);

	const updateVisualMultiline = useCallback(() => {
		if (!onVisualMultilineChange) return;
		const editorDom = editorDomRef.current;
		if (!editorDom) {
			if (visualMultilineRef.current) {
				visualMultilineRef.current = false;
				onVisualMultilineChange(false);
			}
			return;
		}

		const hasInlineItems =
			value.paths.length > 0 || (value.skills?.length ?? 0) > 0;
		const hasAnyContent = value.text.trim().length > 0 || hasInlineItems;
		if (!hasAnyContent) {
			if (visualMultilineRef.current) {
				visualMultilineRef.current = false;
				onVisualMultilineChange(false);
			}
			return;
		}

		const computed = window.getComputedStyle(editorDom);
		const lineHeight = Number.parseFloat(computed.lineHeight || "21") || 21;
		const measuredLines = editorDom.scrollHeight / lineHeight;
		const expandThreshold = 1.75;
		const collapseThreshold = 1.35;
		const threshold = visualMultilineRef.current
			? collapseThreshold
			: expandThreshold;
		const hasVisualWrap = measuredLines > threshold;
		const hasExplicitNewline = value.text.includes("\n");
		const nextIsMultiline = hasVisualWrap || hasExplicitNewline;
		if (nextIsMultiline === visualMultilineRef.current) return;
		visualMultilineRef.current = nextIsMultiline;
		onVisualMultilineChange(nextIsMultiline);
	}, [onVisualMultilineChange, value.paths.length, value.skills, value.text]);

	useEffect(() => {
		if (pendingTextEchoRef.current !== null) {
			if (pendingTextEchoRef.current === value.text) {
				pendingTextEchoRef.current = null;
				return;
			}
			pendingTextEchoRef.current = null;
		}

		const currentText = extractEditorText(editorValue);
		const currentSkills = extractEditorSkills(editorValue);
		const parentSkills = value.skills ?? [];
		const hasInlineElements = value.paths.length > 0 || currentSkills.length > 0 || parentSkills.length > 0;
		const isInlineSpacerOnly =
			hasInlineElements
			&& currentText.trim().length === 0
			&& value.text.trim().length === 0;
		const expectedWithSpacers =
			" ".repeat(currentSkills.length) + value.text + " ".repeat(value.paths.length);
		const isInlineSpacerDiff =
			hasInlineElements
			&& currentText !== value.text
			&& currentText === expectedWithSpacers;
		if (value.text === currentText || isInlineSpacerOnly || isInlineSpacerDiff) return;

		const shouldRestoreFocus = document.activeElement === editorDomRef.current;
		const preservedSkills = currentSkills.length > 0 ? currentSkills : parentSkills;
		queueMicrotask(() => {
			resetSlateValue(createEditorValue(value.text, value.paths, preservedSkills));
			if (shouldRestoreFocus) {
				focusEditorAtEnd();
			}
		});
	}, [editorValue, focusEditorAtEnd, resetSlateValue, value.paths, value.skills, value.text]);

	useEffect(() => {
		const propSet = new Set(value.paths.map((item) => item.absolutePath));
		if (pendingPathSetRef.current) {
			if (samePathSet(pendingPathSetRef.current, propSet)) {
				pendingPathSetRef.current = null;
				return;
			}
			pendingPathSetRef.current = null;
		}

		const currentText = extractEditorText(editorValue);
		const currentSkills = extractEditorSkills(editorValue);
		const hasInline = value.paths.length > 0 || currentSkills.length > 0 || (value.skills ?? []).length > 0;
		const expectedWithSpacers =
			" ".repeat(currentSkills.length) + value.text + " ".repeat(value.paths.length);
		const textSynchronized =
			currentText === value.text
			|| (hasInline && currentText === expectedWithSpacers)
			|| (
				hasInline
				&& currentText.trim().length === 0
				&& value.text.trim().length === 0
			);
		if (!textSynchronized) return;

		syncPathsFromParent(value.paths);
	}, [editorValue, syncPathsFromParent, value.paths, value.skills, value.text]);

	useEffect(() => {
		const rafId = requestAnimationFrame(() => {
			updateVisualMultiline();
		});
		return () => {
			cancelAnimationFrame(rafId);
		};
	}, [editorValue, updateVisualMultiline, value.paths.length]);

	useEffect(() => {
		if (!onVisualMultilineChange) return;
		const onResize = () => {
			updateVisualMultiline();
		};
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
		};
	}, [onVisualMultilineChange, updateVisualMultiline]);

	const renderElement = useCallback(
		(props: RenderElementProps) => {
			const { attributes, children, element } = props;

			if (isSlateSkillElement(element)) {
				return (
					<span {...attributes}>
						<span
							contentEditable={false}
							className={skillChipClassName}
							onMouseDown={(event) => {
								event.preventDefault();
							}}
						>
							{element.command}
						</span>
						{children}
					</span>
				);
			}

			if (!isSlatePathElement(element)) {
				return <div {...attributes}>{children}</div>;
			}

			const label = getPathChipLabel(element.path);
			const isSnippetReference = isSnippetReferenceLabel(label);

			return (
				<span {...attributes}>
					<span
						contentEditable={false}
						className={pathChipClassName}
						title={element.path.absolutePath}
						data-snippet-ref={isSnippetReference ? "true" : undefined}
						onMouseDown={(event) => {
							event.preventDefault();
						}}
						onMouseUp={(event) => {
							event.preventDefault();
							requestAnimationFrame(() => {
								placeCaretAfterPathChip(element.path.absolutePath);
							});
						}}
					>
						<span className={pathChipIconClassName}>
							{isSnippetReference ? (
								<Link2 style={{ width: 12, height: 12 }} />
							) : element.path.isDirectory ? (
								<Folder style={{ width: 12, height: 12 }} />
							) : (
								<FileIcon style={{ width: 12, height: 12 }} />
							)}
						</span>
						<span className={pathChipNameClassName}>{label}</span>
						<button
							type="button"
							className={pathChipRemoveClassName}
							onMouseDown={(event) => {
								event.preventDefault();
								event.stopPropagation();
								removePathFromEditor(element.path.absolutePath);
							}}
							title={removePathTitle}
						>
							<X style={{ width: 10, height: 10 }} />
						</button>
					</span>
					{children}
				</span>
			);
		},
		[
			pathChipClassName,
			pathChipIconClassName,
			pathChipNameClassName,
			pathChipRemoveClassName,
			placeCaretAfterPathChip,
			removePathFromEditor,
			removePathTitle,
			skillChipClassName,
		],
	);

	return (
		<Slate
			key={editorVersion}
			editor={editor}
			initialValue={editorInitialValue}
			onChange={(nextValue) => {
				const hasContentOperation = editor.operations.some(
					(operation) => operation.type !== "set_selection",
				);

				if (hasContentOperation) {
					setEditorValue(nextValue);
					syncEditorToParent(nextValue);
				}

				if (pendingFocusRef.current) {
					pendingFocusRef.current = false;
					requestAnimationFrame(() => {
						try {
							const el = editorDomRef.current;
							if (el) el.focus({ preventScroll: true });
							ReactEditor.focus(editor);
							Transforms.select(editor, Editor.end(editor, []));
						} catch {
							// Slate DOM not yet ready
						}
					});
				}

				if (!onCaretChange) return;
				if (!editor.selection) {
					onCaretChange(extractEditorText(nextValue).length);
					return;
				}
				const point = editor.selection.anchor;
				const start = Editor.start(editor, []);
				onCaretChange(
					Editor.string(editor, { anchor: start, focus: point }).length,
				);
			}}
		>
			<Editable
				ref={editorDomRef}
				className={className}
				readOnly={disabled}
				renderElement={renderElement}
				placeholder={placeholder}
				onPaste={(event) => {
					if (!disabled) {
						const dataTransfer = event.clipboardData ?? null;
						const hasFileItem = Array.from(dataTransfer?.items ?? []).some(
							(item) => item.kind === "file",
						);
						if (!hasFileItem) {
							const text = dataTransfer?.getData("text/plain") ?? "";
							const html = dataTransfer?.getData("text/html") ?? "";
							const uriList =
								dataTransfer?.getData("text/uri-list")
								|| dataTransfer?.getData("public.file-url")
								|| "";
							const extraPayloads =
								collectClipboardExtraTextPayloads(dataTransfer);
							const plainTextSnippetPaths =
								extractSnippetReferencePathsFromText(text);
							const snippetPaths = extractSnippetReferencePathsFromClipboard({
								plainText: text,
								htmlText: html,
								uriListText: uriList,
								extraTextPayloads: extraPayloads,
							});
							if (snippetPaths.length > 0) {
								const likelyCodeSelectionPaste =
									text.split(/\r?\n/).length >= 2
									&& plainTextSnippetPaths.length === 0
									&& extraPayloads.length > 0;
								if (
									shouldConsumeSnippetReferencePaste(text)
									|| likelyCodeSelectionPaste
								) {
									event.preventDefault();
								}
								requestAnimationFrame(() => {
									insertDroppedPathsAtCaret(snippetPaths);
								});
							}
						}
					}
					onPaste?.(event);
				}}
				onDragOverCapture={(event) => {
					if (!isPathDrag(event.dataTransfer ?? null)) return;
					event.preventDefault();
				}}
				onDropCapture={(event) => {
					const dataTransfer = event.dataTransfer ?? null;
					if (!isPathDrag(dataTransfer)) return;
					const paths = extractComposerPathsFromTransfer(dataTransfer);
					if (paths.length === 0) return;
					event.preventDefault();
					event.stopPropagation();
					insertDroppedPathsAtCaret(paths);
				}}
				onMouseDown={(event) => {
					if (disabled || event.button !== 0) return;
					const target = event.target as HTMLElement;
					if (target.closest("button")) return;
				}}
				onClick={() => {
					requestAnimationFrame(() => {
						const sel = editor.selection;
						if (!sel) {
							Transforms.select(editor, Editor.end(editor, []));
							ReactEditor.focus(editor);
							return;
						}
						if (Editor.void(editor, { at: sel })) {
							Transforms.select(editor, Editor.end(editor, []));
							ReactEditor.focus(editor);
							return;
						}
						const { anchor } = sel;
						if (anchor.offset === 0) {
							try {
								const node = Node.get(editor, anchor.path);
								if ("text" in node && node.text === "") {
									const parentPath = anchor.path.slice(0, -1);
									const childIdx = anchor.path[anchor.path.length - 1];
									const parent = Node.get(editor, parentPath);
									if (
										SlateElement.isElement(parent) &&
										isSlatePathElement(parent.children[childIdx + 1])
									) {
										Transforms.select(editor, Editor.end(editor, []));
									}
								}
							} catch {
								Transforms.select(editor, Editor.end(editor, []));
							}
						}
						ReactEditor.focus(editor);
					});
				}}
				onFocus={() => {
					onFocusChange?.(true);
				}}
				onBlur={() => {
					onFocusChange?.(false);
				}}
				onCompositionStart={() => {
					onCompositionStart?.();
				}}
				onCompositionEnd={() => {
					onCompositionEnd?.();
				}}
				onKeyDown={(event) => {
					const keyEvent = event as unknown as ReactKeyboardEvent<HTMLElement>;
					onKeyDown?.(keyEvent);
					if (event.defaultPrevented) return;
					if (event.key === "Enter") {
						onPressEnter?.(keyEvent);
						return;
					}
					if (
						event.key === "Backspace" &&
						!event.shiftKey &&
						!event.metaKey &&
						!event.ctrlKey
					) {
						const sel = editor.selection;
						if (sel && Range.isCollapsed(sel)) {
							const { anchor } = sel;
							try {
								const parentPath = anchor.path.slice(0, -1);
								const childIdx = anchor.path[anchor.path.length - 1];
								const parent = Node.get(editor, parentPath);
								if (!SlateElement.isElement(parent) || childIdx === 0) {
									return;
								}
							const prevSibling = parent.children[childIdx - 1];
							const isPrevInlineVoid =
								isSlatePathElement(prevSibling) || isSlateSkillElement(prevSibling);
							if (anchor.offset === 0 && isPrevInlineVoid) {
								event.preventDefault();
								Transforms.removeNodes(editor, {
									at: [...parentPath, childIdx - 1],
								});
								return;
							}
							const currentNode = parent.children[childIdx];
							if (
								anchor.offset <= 1 &&
								isPrevInlineVoid &&
								currentNode != null &&
								"text" in currentNode &&
								currentNode.text.trim() === "" &&
								currentNode.text.length <= 1
							) {
								event.preventDefault();
								Transforms.removeNodes(editor, {
									at: [...parentPath, childIdx - 1],
								});
							}
							} catch {
								// fall through to default Backspace
							}
						}
					}
				}}
				renderPlaceholder={({ attributes, children }) => (
					<span {...attributes} className={placeholderClassName}>
						{children}
					</span>
				)}
			/>
		</Slate>
	);
});
