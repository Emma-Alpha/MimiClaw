import {
	useCallback,
	useEffect,
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
import { File as FileIcon, Folder, X } from "lucide-react";
import {
	extractDroppedPathsFromTransfer,
	isPathDrag,
	type UnifiedComposerPath,
} from "@/lib/unified-composer";

export type UnifiedComposerInputValue = {
	text: string;
	paths: UnifiedComposerPath[];
};

type SlatePathElement = {
	type: "path";
	path: UnifiedComposerPath;
	children: [{ text: "" }];
};

type SlateParagraphElement = {
	type: "paragraph";
	children: Array<{ text: string } | SlatePathElement>;
};

function isSlatePathElement(value: unknown): value is SlatePathElement {
	return (
		SlateElement.isElement(value) &&
		(value as { type?: string }).type === "path"
	);
}

function createPathElement(path: UnifiedComposerPath): SlatePathElement {
	return {
		type: "path",
		path,
		children: [{ text: "" }],
	};
}

function createEditorValue(text: string, paths: UnifiedComposerPath[]): Descendant[] {
	const children: SlateParagraphElement["children"] = [];
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

function extractEditorText(value: Descendant[]): string {
	return value.map((node) => Node.string(node)).join("\n");
}

function extractEditorPaths(value: Descendant[]): UnifiedComposerPath[] {
	const found: UnifiedComposerPath[] = [];
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

function samePathSet(left: Set<string> | null, right: Set<string>): boolean {
	if (!left || left.size !== right.size) return false;
	for (const item of left) {
		if (!right.has(item)) return false;
	}
	return true;
}

function withPathInline(editor: ReactEditor): ReactEditor {
	const { isInline, isVoid } = editor;
	editor.isInline = (element) => isSlatePathElement(element) || isInline(element);
	editor.isVoid = (element) => isSlatePathElement(element) || isVoid(element);
	return editor;
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
	removePathTitle?: string;
	onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onPressEnter?: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onCompositionStart?: () => void;
	onCompositionEnd?: () => void;
	onFocusChange?: (focused: boolean) => void;
	onCaretChange?: (index: number) => void;
	onPaste?: React.ClipboardEventHandler<HTMLDivElement>;
	onVisualMultilineChange?: (multiline: boolean) => void;
}

export function UnifiedComposerInput({
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
	removePathTitle = "移除路径",
	onKeyDown,
	onPressEnter,
	onCompositionStart,
	onCompositionEnd,
	onFocusChange,
	onCaretChange,
	onPaste,
	onVisualMultilineChange,
}: UnifiedComposerInputProps) {
	const editor = useMemo(
		() => withPathInline(withReact(createEditor() as ReactEditor)),
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
		(paths: UnifiedComposerPath[]) => {
			if (!paths.length) return;

			const existing = new Set(
				extractEditorPaths(editor.children as Descendant[]).map(
					(item) => item.absolutePath,
				),
			);
			if (!editor.selection) {
				Transforms.select(editor, Editor.end(editor, []));
			}

			let inserted = false;
			for (const item of paths) {
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
		[editor],
	);

	const syncPathsFromParent = useCallback(
		(nextPaths: UnifiedComposerPath[]) => {
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
			const nextPaths = extractEditorPaths(nextValue);
			const nextSet = new Set(nextPaths.map((item) => item.absolutePath));
			const parentSet = new Set(value.paths.map((item) => item.absolutePath));
			const changedText = plain !== value.text;
			const changedPaths = !samePathSet(parentSet, nextSet);

			if (!changedText && !changedPaths) {
				return;
			}

			if (changedText) {
				pendingTextEchoRef.current = plain;
			}
			if (changedPaths) {
				pendingPathSetRef.current = nextSet;
			}

			onChange({
				text: plain,
				paths: nextPaths,
			});
		},
		[onChange, value.paths, value.text],
	);

	const updateVisualMultiline = useCallback(() => {
		if (!onVisualMultilineChange) return;
		const editorDom = editorDomRef.current;
		if (!editorDom) {
			onVisualMultilineChange(false);
			return;
		}

		const computed = window.getComputedStyle(editorDom);
		const lineHeight = Number.parseFloat(computed.lineHeight || "21") || 21;
		const hasVisualWrap = editorDom.scrollHeight > lineHeight * 1.6;
		const hasExplicitNewline = value.text.includes("\n");
		onVisualMultilineChange(hasVisualWrap || hasExplicitNewline);
	}, [onVisualMultilineChange, value.text]);

	useEffect(() => {
		if (pendingTextEchoRef.current !== null) {
			if (pendingTextEchoRef.current === value.text) {
				pendingTextEchoRef.current = null;
			}
			return;
		}

		const currentText = extractEditorText(editorValue);
		if (value.text === currentText) return;

		queueMicrotask(() => {
			// Keep external props authoritative: avoid reviving stale path chips when
			// parent clears/overrides text and paths in the same render.
			resetSlateValue(createEditorValue(value.text, value.paths));
		});
	}, [editorValue, resetSlateValue, value.paths, value.text]);

	useEffect(() => {
		const propSet = new Set(value.paths.map((item) => item.absolutePath));
		if (pendingPathSetRef.current) {
			if (samePathSet(pendingPathSetRef.current, propSet)) {
				pendingPathSetRef.current = null;
				return;
			}
			// Parent pushed a path set that differs from the optimistic local echo.
			// Treat it as authoritative and sync editor state accordingly.
			pendingPathSetRef.current = null;
		}

		syncPathsFromParent(value.paths);
	}, [syncPathsFromParent, value.paths]);

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
			if (!isSlatePathElement(element)) {
				return <div {...attributes}>{children}</div>;
			}

			return (
				<span {...attributes}>
					<span
						contentEditable={false}
						className={pathChipClassName}
						title={element.path.absolutePath}
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
							{element.path.isDirectory ? (
								<Folder style={{ width: 12, height: 12 }} />
							) : (
								<FileIcon style={{ width: 12, height: 12 }} />
							)}
						</span>
						<span className={pathChipNameClassName}>{element.path.name}</span>
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
		],
	);

	return (
		<Slate
			key={editorVersion}
			editor={editor}
			initialValue={editorInitialValue}
			onChange={(nextValue) => {
				setEditorValue(nextValue);
				syncEditorToParent(nextValue);
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
				onPaste={onPaste}
				onDragOverCapture={(event) => {
					if (!isPathDrag(event.dataTransfer ?? null)) return;
					event.preventDefault();
				}}
				onDropCapture={(event) => {
					const dataTransfer = event.dataTransfer ?? null;
					if (!isPathDrag(dataTransfer)) return;
					const paths = extractDroppedPathsFromTransfer(dataTransfer);
					if (paths.length === 0) return;
					event.preventDefault();
					event.stopPropagation();
					insertDroppedPathsAtCaret(paths);
				}}
				onMouseDown={(event) => {
					if (disabled || event.button !== 0) return;
					const target = event.target as HTMLElement;
					if (target.closest("button")) return;
					queueMicrotask(() => {
						const selection = editor.selection;
						const selectionInVoid =
							selection !== null &&
							Editor.void(editor, { at: selection }) !== undefined;
						if (!selection || selectionInVoid) {
							Transforms.select(editor, Editor.end(editor, []));
						}
						ReactEditor.focus(editor);
					});
				}}
				onClick={() => {
					requestAnimationFrame(() => {
						const selection = editor.selection;
						const selectionInVoid =
							selection !== null &&
							Editor.void(editor, { at: selection }) !== undefined;
						if (!selection || selectionInVoid) {
							Transforms.select(editor, Editor.end(editor, []));
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
}
