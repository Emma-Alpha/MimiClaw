import type {
	KeyboardEvent as ReactKeyboardEvent,
	JSX,
} from "react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

import {
	Plus,
	Camera,
	Paperclip,
	Mic,
	ArrowUp,
	Square,
	X,
	File as FileIcon,
	Folder,
} from "lucide-react";
import { ClaudeCode } from "@lobehub/icons";
import { Dropdown } from "antd";
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
import { createStyles } from "antd-style";
import { ComposerAttachmentPreview, ImageLightbox } from "@/components/common/composer";
import type { FileAttachment } from "@/components/common/composer-helpers";
import { useVolcengineAsr } from "@/hooks/useVolcengineAsr";
import { useMiniChatStyles } from "../styles";
import type { MentionOption, PathAttachment } from "../types";

type DroppedPathChip = Pick<PathAttachment, "absolutePath" | "name" | "isDirectory">;
type SlatePathElement = {
	type: "path";
	path: DroppedPathChip;
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

function createPathElement(path: DroppedPathChip): SlatePathElement {
	return {
		type: "path",
		path,
		children: [{ text: "" }],
	};
}

function createEditorValue(
	text: string,
	paths: DroppedPathChip[],
): Descendant[] {
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

function extractEditorPaths(value: Descendant[]): DroppedPathChip[] {
	const found: DroppedPathChip[] = [];
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

function samePathSet(
	left: Set<string> | null,
	right: Set<string>,
): boolean {
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

function parseAbsolutePath(raw: string): string | null {
	const value = raw.trim().replace(/^["']|["']$/g, "");
	if (!value) return null;

	if (value.startsWith("file://")) {
		try {
			const url = new URL(value);
			if (url.protocol !== "file:") return null;
			let pathname = decodeURIComponent(url.pathname || "");
			// Normalize `file:///C:/...` -> `C:/...` on Windows.
			if (/^\/[A-Za-z]:[\\/]/.test(pathname)) {
				pathname = pathname.slice(1);
			}
			return pathname.trim() || null;
		} catch {
			return null;
		}
	}

	// POSIX absolute path.
	if (value.startsWith("/")) return value;
	// Windows absolute path.
	if (/^[A-Za-z]:[\\/]/.test(value)) return value;

	return null;
}

function extractDroppedPathsFromTransfer(dataTransfer: DataTransfer | null): PathAttachment[] {
	if (!dataTransfer) return [];

	const paths: PathAttachment[] = [];
	const seen = new Set<string>();
	const pushPath = (absolutePath: string | undefined, name: string, isDirectory: boolean) => {
		const normalizedPath = absolutePath?.trim();
		if (!normalizedPath || seen.has(normalizedPath)) return;
		seen.add(normalizedPath);
		paths.push({
			id: crypto.randomUUID(),
			absolutePath: normalizedPath,
			name,
			isDirectory,
		});
	};

	const items = dataTransfer.items;
	if (items?.length) {
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (!item || item.kind !== "file") continue;
			const entry = item.webkitGetAsEntry();
			const file = item.getAsFile();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const electronPath = file ? ((file as any).path as string | undefined) : undefined;
			if (file && electronPath) {
				pushPath(
					electronPath,
					file.name,
					entry?.isDirectory ?? (file.size === 0 && file.type === ""),
				);
			}
		}
	}

	if (dataTransfer.files?.length) {
		for (const file of Array.from(dataTransfer.files)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const electronPath = (file as any).path as string | undefined;
			pushPath(electronPath, file.name, false);
		}
	}

	if (paths.length === 0) {
		const rawSources = [
			dataTransfer.getData("text/uri-list"),
			dataTransfer.getData("public.file-url"),
			dataTransfer.getData("text/plain"),
		];
			for (const source of rawSources) {
				if (!source) continue;
				for (const raw of source.replaceAll("\0", "\n").split(/\r?\n/)) {
					const uri = raw.trim();
					if (!uri || uri.startsWith("#")) continue;
					const absPath = parseAbsolutePath(uri);
					if (!absPath) continue;
					const name = absPath.split(/[\\/]/).filter(Boolean).pop() || absPath;
					pushPath(absPath, name, false);
				}
		}
	}

	return paths;
}

function isPathDrag(dataTransfer: DataTransfer | null | undefined): boolean {
	if (!dataTransfer) return false;
	const types = Array.from(dataTransfer.types ?? []);
	if (
		types.includes("Files")
		|| types.includes("text/uri-list")
		|| types.includes("public.file-url")
		|| types.includes("text/plain")
	) {
		return true;
	}
	if ((dataTransfer.files?.length ?? 0) > 0) {
		return true;
	}
	const items = dataTransfer.items;
	if (items?.length) {
		for (let i = 0; i < items.length; i++) {
			if (items[i]?.kind === "file") {
				return true;
			}
		}
	}
	return false;
}

type MiniChatComposerProps = {
	input: string;
	onInputChange: (value: string) => void;
	onSend: () => void;
	loading: boolean;
	disabled: boolean;
	sendDisabled: boolean;
	placeholder: string;
	attachments: FileAttachment[];
	droppedPaths: DroppedPathChip[];
	onRemoveAttachment: (id: string) => void;
	onRemoveDroppedPath: (absolutePath: string) => void;
	onUploadFile: () => void;
	onScreenshot: () => void;
	/** Still used by the + file-upload menu; no longer used for voice recording. */
	stageBufferFiles: (files: globalThis.File[]) => Promise<void>;
	showMentionPicker: boolean;
	mentionOptions: MentionOption[];
	activeMentionIndex: number;
	onActiveMentionIndexChange: (value: number) => void;
	onApplyMention: (option: MentionOption) => void;
	onCaretChange: (value: number) => void;
	onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onPressEnter: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onCompositionStart: () => void;
	onCompositionEnd: () => void;
	onFocusChange: (focused: boolean) => void;
	onDropPaths: (paths: PathAttachment[]) => void;
};

const useComposerStyles = createStyles(({ css, token }) => ({
	container: css`
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
	`,
	pill: css`
		display: flex;
		flex-direction: row;
		flex-wrap: wrap; /* Allow wrapping for multiline */
		align-items: center;
		padding: 3px 5px;
		border-radius: 20px;
		background: ${token.colorBgContainer};
		border: 1px solid ${token.colorBorderSecondary};
		transition: border-radius 0.3s cubic-bezier(0.32, 0.72, 0, 1),
					background-color 0.2s ease,
					padding 0.3s cubic-bezier(0.32, 0.72, 0, 1),
					box-shadow 0.2s ease;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
		position: relative;
		min-height: 40px;
		width: 100%;

		&:focus-within {
			background: ${token.colorBgContainer};
			border-color: ${token.colorBorder};
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
		}
	`,
	pillMultiline: css`
		align-items: flex-start;
		border-radius: 12px;
		padding: 6px 5px 5px;
	`,
	pillDragOver: css`
		border-color: ${token.colorPrimary};
		background: ${token.colorPrimaryBg};
		box-shadow: 0 0 0 2px ${token.colorPrimaryBorder};
	`,
	plusWrapper: css`
		display: flex;
		align-items: center;
		justify-content: center;
		order: 1;
		flex-shrink: 0;
	`,
	plusWrapperMultiline: css`
		order: 2; /* Moves to second row if input is 100% */
		margin-top: 4px;
	`,
	inputArea: css`
		flex: 1;
		min-width: 0;
		padding: 0 6px;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		order: 2;
	`,
	inputTextWrap: css`
		flex: 1 1 120px;
		min-width: 120px;
		display: flex;
		align-items: center;
		width: 100%;
	`,
	inputAreaMultiline: css`
		flex: 1;
		align-items: flex-start;
	`,
	editor: css`
		width: 100%;
		min-height: 20px;
		max-height: 180px;
		overflow: auto;
		cursor: text;
		caret-color: ${token.colorText};
		outline: none;
		background: transparent;
		color: ${token.colorText};
		font-size: 14px;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	`,
	editorPlaceholder: css`
		color: ${token.colorTextQuaternary};
		pointer-events: none;
		user-select: none;
	`,
	actionsWrapper: css`
		display: flex;
		align-items: center;
		gap: 4px;
		order: 3;
		flex-shrink: 0;
		margin-left: auto; /* Pushes to right in multiline row */
	`,
	actionsWrapperMultiline: css`
		margin-top: 4px;
		gap: 8px;
	`,
	plusButton: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: ${token.colorFillSecondary};
		color: ${token.colorTextSecondary};
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;

		&:hover:not(:disabled) {
			background: ${token.colorFill};
			color: ${token.colorText};
			transform: scale(1.05);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}
	`,
	sendButton: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: ${token.colorText};
		color: ${token.colorBgLayout};
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

		&:hover:not(:disabled) {
			transform: scale(1.05);
			box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
		}

		&:active:not(:disabled) {
			transform: scale(0.95);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
			box-shadow: none;
		}
	`,
	micButton: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: ${token.colorFillSecondary};
		color: ${token.colorTextSecondary};
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

		&:hover:not(:disabled) {
			color: ${token.colorText};
			background: ${token.colorFill};
			transform: scale(1.05);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}
	`,
	micButtonHighlighted: css`
		background: ${token.colorText} !important;
		color: ${token.colorBgContainer} !important;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
		
		&:hover:not(:disabled) {
			background: ${token.colorTextSecondary} !important;
		}
	`,
	micIconBtn: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: transparent;
		color: ${token.colorTextTertiary};
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(:disabled) {
			color: ${token.colorText};
			background: ${token.colorFillTertiary};
		}
	`,
	sendButtonSending: css`
		background: ${token.colorTextSecondary};
	`,
	micButtonRecording: css`
		background: rgba(239, 68, 68, 0.12) !important;
		color: #ef4444 !important;
		animation: mic-pulse 1.5s infinite;

		@keyframes mic-pulse {
			0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
			70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
			100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
		}
	`,
	recordingPill: css`
		display: flex;
		align-items: center;
		gap: 12px;
		background: ${token.colorBgElevated};
		padding: 4px 6px 4px 14px;
		border-radius: 24px;
		border: 1px solid ${token.colorBorderSecondary};
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		animation: pill-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		min-width: 180px;

		@keyframes pill-in {
			from { opacity: 0; transform: translateY(8px) scale(0.95); }
			to { opacity: 1; transform: translateY(0) scale(1); }
		}
	`,
	waveContainer: css`
		display: flex;
		align-items: center;
		gap: 2.5px;
		height: 18px;
		padding-top: 1px;
	`,
	waveBar: css`
		width: 3px;
		background: ${token.colorPrimary};
		border-radius: 1.5px;
		animation: wave-pulse 1.2s ease-in-out infinite;

		@keyframes wave-pulse {
			0%, 100% { height: 4px; opacity: 0.4; }
			50% { height: 16px; opacity: 1; }
		}
	`,
	recordingTime: css`
		font-size: 13px;
		color: ${token.colorTextSecondary};
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.5px;
	`,
	recordingLabel: css`
		font-size: 13px;
		color: ${token.colorTextQuaternary};
		flex: 1;
		margin-left: 4px;
	`,
	recordingDiscardBtn: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 16px;
		border: none;
		background: ${token.colorFillQuaternary};
		color: ${token.colorTextSecondary};
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: rgba(239, 68, 68, 0.1);
			color: #ef4444;
		}
	`,
	attachmentRow: css`
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 0 12px;
	`,
	pathChip: css`
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 6px 3px 8px;
		border-radius: 14px;
		background: ${token.colorFillQuaternary};
		border: 1px solid ${token.colorBorderSecondary};
		font-size: 12px;
		color: ${token.colorText};
		max-width: 220px;
		cursor: text;
		transition: background 0.15s;
		vertical-align: middle;

		&:hover {
			background: ${token.colorFillTertiary};
		}
	`,
	pathChipIcon: css`
		color: ${token.colorTextTertiary};
		flex-shrink: 0;
	`,
	pathChipName: css`
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
		color: ${token.colorText};
		font-size: 12px;
		font-weight: 500;
	`,
	pathChipRemove: css`
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: ${token.colorTextQuaternary};
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition: all 0.15s;

		&:hover {
			background: ${token.colorFillTertiary};
			color: ${token.colorTextSecondary};
		}
	`,
}));

export function MiniChatComposer({
	input,
	onInputChange,
	onSend,
	loading,
	disabled,
	sendDisabled,
	placeholder,
	attachments,
	droppedPaths,
	onRemoveAttachment,
	onRemoveDroppedPath,
	onUploadFile,
	onScreenshot,
	stageBufferFiles: _stageBufferFiles,
	showMentionPicker,
	mentionOptions,
	activeMentionIndex,
	onActiveMentionIndexChange,
	onApplyMention,
	onCaretChange,
	onKeyDown,
	onPressEnter,
	onCompositionStart,
	onCompositionEnd,
	onFocusChange,
	onDropPaths,
}: MiniChatComposerProps) {
	const { styles: miniChatStyles, cx } = useMiniChatStyles();
	const { styles } = useComposerStyles();
	const [previewImage, setPreviewImage] = useState<{ src: string; fileName: string } | null>(null);

	// ── Volcengine ASR recording ──────────────────────────────────
	const [recordingTime, setRecordingTime] = useState(0);

	const handleTranscriptReady = useCallback((text: string) => {
		onInputChange(text);
		// Defer the send so the state update has a chance to flush first.
		queueMicrotask(() => { onSend(); });
	}, [onInputChange, onSend]);

	const { isRecording, isTranscribing, toggleRecording, cancelRecording, stopAndTranscribe } =
		useVolcengineAsr({ onTranscriptReady: handleTranscriptReady });

	const handleToggleRecording = useCallback(async () => {
		if (!isRecording) {
			setRecordingTime(0);
		}
		await toggleRecording();
	}, [isRecording, toggleRecording]);

	const formatRecordingTime = (seconds: number) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	};

	useEffect(() => {
		let interval: ReturnType<typeof setInterval>;
		if (isRecording) {
			interval = setInterval(() => {
				setRecordingTime(prev => prev + 1);
			}, 1000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isRecording]);

	// ── Slate editor for inline text + path tags ─────────────────────────────
	const editor = useMemo(
		() => withPathInline(withReact(createEditor() as ReactEditor)),
		[],
	);
	const [editorValue, setEditorValue] = useState<Descendant[]>(() =>
		createEditorValue(input, droppedPaths),
	);
	const [editorInitialValue, setEditorInitialValue] = useState<Descendant[]>(() =>
		createEditorValue(input, droppedPaths),
	);
	const [editorVersion, setEditorVersion] = useState(0);
	const editorDomRef = useRef<HTMLDivElement | null>(null);
	const [isMultiline, setIsMultiline] = useState(false);
	const pendingTextEchoRef = useRef<string | null>(null);
	const pendingPathSetRef = useRef<Set<string> | null>(null);
	const onRemoveDroppedPathRef = useRef(onRemoveDroppedPath);
	const onDropPathsRef = useRef(onDropPaths);
	useEffect(() => {
		onRemoveDroppedPathRef.current = onRemoveDroppedPath;
	}, [onRemoveDroppedPath]);
	useEffect(() => {
		onDropPathsRef.current = onDropPaths;
	}, [onDropPaths]);

	const insertDroppedPathsAtCaret = useCallback(
		(paths: PathAttachment[]) => {
			if (!paths.length) return;

			const existing = new Set(
				extractEditorPaths(editor.children as Descendant[]).map(
					(item) => item.absolutePath,
				),
			);
			ReactEditor.focus(editor);
			if (!editor.selection) {
				Transforms.select(editor, Editor.end(editor, []));
			}

			for (const item of paths) {
				const absolutePath = item?.absolutePath?.trim();
				if (!absolutePath || existing.has(absolutePath)) continue;
				existing.add(absolutePath);
				Transforms.insertNodes(
					editor,
					createPathElement({
						absolutePath,
						name: item?.name?.trim() || absolutePath.split(/[\\/]/).pop() || absolutePath,
						isDirectory: Boolean(item?.isDirectory),
					}),
				);
				Transforms.insertText(editor, " ");
			}
		},
		[editor],
	);

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
				// Ensure there is a text position after the void node, otherwise
				// selection may get trapped in a non-editable void boundary.
				const nextPath = Path.next(nodePath);
				Transforms.insertNodes(editor, { text: "" }, { at: nextPath });
				after = { path: nextPath, offset: 0 };
			}
			Transforms.select(editor, after ?? endPoint);
			ReactEditor.focus(editor);
		},
		[editor],
	);

	const syncPathsFromParent = useCallback(
		(nextPaths: DroppedPathChip[]) => {
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
			if (plain !== input) {
				pendingTextEchoRef.current = plain;
				onInputChange(plain);
			}

			const nextPaths = extractEditorPaths(nextValue);
			const nextSet = new Set(nextPaths.map((item) => item.absolutePath));
			const parentSet = new Set(droppedPaths.map((item) => item.absolutePath));
			const toAdd = nextPaths.filter((item) => !parentSet.has(item.absolutePath));
			const toRemove = droppedPaths.filter(
				(item) => !nextSet.has(item.absolutePath),
			);

			if (toAdd.length > 0 || toRemove.length > 0) {
				pendingPathSetRef.current = nextSet;
			}
			if (toAdd.length > 0) {
				onDropPathsRef.current(
					toAdd.map((item) => ({
						id: crypto.randomUUID(),
						absolutePath: item.absolutePath,
						name: item.name,
						isDirectory: item.isDirectory,
					})),
				);
			}
			for (const item of toRemove) {
				onRemoveDroppedPathRef.current(item.absolutePath);
			}
		},
		[droppedPaths, input, onInputChange],
	);

	const updateIsMultiline = useCallback(() => {
		const editorDom = editorDomRef.current;
		if (!editorDom) {
			setIsMultiline((prev) => (prev ? false : prev));
			return;
		}

		const computed = window.getComputedStyle(editorDom);
		const lineHeight = Number.parseFloat(computed.lineHeight || "21") || 21;
		const hasVisualWrap = editorDom.scrollHeight > lineHeight * 1.6;
		const hasExplicitNewline = input.includes("\n");
		const next = hasVisualWrap || hasExplicitNewline;
		setIsMultiline((prev) => (prev === next ? prev : next));
	}, [input]);

	useEffect(() => {
		// Local editor -> parent state echo; ignore this round to avoid resetting selection.
		if (pendingTextEchoRef.current !== null) {
			if (pendingTextEchoRef.current === input) {
				pendingTextEchoRef.current = null;
			}
			return;
		}

		const currentText = extractEditorText(editorValue);
		if (input === currentText) return;

		const currentPaths = extractEditorPaths(editorValue);
		queueMicrotask(() => {
			resetSlateValue(createEditorValue(input, currentPaths));
		});
	}, [editorValue, input, resetSlateValue]);

	useEffect(() => {
		const propSet = new Set(droppedPaths.map((item) => item.absolutePath));
		if (pendingPathSetRef.current) {
			if (samePathSet(pendingPathSetRef.current, propSet)) {
				pendingPathSetRef.current = null;
			}
			return;
		}

		syncPathsFromParent(droppedPaths);
	}, [droppedPaths, syncPathsFromParent]);

	useEffect(() => {
		const rafId = requestAnimationFrame(() => {
			updateIsMultiline();
		});
		return () => {
			cancelAnimationFrame(rafId);
		};
	}, [editorValue, droppedPaths.length, updateIsMultiline]);

	useEffect(() => {
		const onResize = () => {
			updateIsMultiline();
		};
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
		};
	}, [updateIsMultiline]);

	// ── Drag-and-drop path attachment ────────────────────────────
	// ── Drag-and-drop: native document-level listeners ───────────
	// Must be document-level (not React synthetic) so Chromium sees the
	// preventDefault() on dragover and routes OS-level file drags here.
	const [isDragOver, setIsDragOver] = useState(false);

	useEffect(() => {
		let enterCount = 0;

		const onDragOver = (e: globalThis.DragEvent) => {
			if (!isPathDrag(e.dataTransfer ?? null)) return;
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = "copy";
			}
		};

		const onDragEnter = (e: globalThis.DragEvent) => {
			if (!isPathDrag(e.dataTransfer ?? null)) return;
			e.preventDefault();
			enterCount += 1;
			if (enterCount === 1) setIsDragOver(true);
		};

		const onDragLeave = (e: globalThis.DragEvent) => {
			if (!isPathDrag(e.dataTransfer ?? null)) return;
			e.preventDefault();
			enterCount -= 1;
			if (enterCount <= 0) {
				enterCount = 0;
				setIsDragOver(false);
			}
		};

		const onDrop = (e: globalThis.DragEvent) => {
			if (!isPathDrag(e.dataTransfer ?? null)) return;
			enterCount = 0;
			setIsDragOver(false);
			const paths = extractDroppedPathsFromTransfer(e.dataTransfer);
			if (paths.length > 0) {
				// We successfully extracted absolute paths in renderer, so suppress
				// the browser default navigation and insert inline tags directly.
				e.preventDefault();
				// Stop native/contentEditable default drop behavior (especially Slate's
				// internal drop pipeline) from overriding our inserted path chips.
				e.stopPropagation();
				insertDroppedPathsAtCaret(paths);
			}
			// If no paths were extracted here, do not prevent default:
			// main process `will-navigate` fallback can still intercept file:// drop
			// and forward absolute paths via `mini-chat:paths-dropped`.
		};
		const onDragEnd = () => {
			enterCount = 0;
			setIsDragOver(false);
		};

		document.addEventListener("dragover", onDragOver, true);
		document.addEventListener("dragenter", onDragEnter, true);
		document.addEventListener("dragleave", onDragLeave, true);
		document.addEventListener("drop", onDrop, true);
		document.addEventListener("dragend", onDragEnd, true);
		return () => {
			document.removeEventListener("dragover", onDragOver, true);
			document.removeEventListener("dragenter", onDragEnter, true);
			document.removeEventListener("dragleave", onDragLeave, true);
			document.removeEventListener("drop", onDrop, true);
			document.removeEventListener("dragend", onDragEnd, true);
		};
	}, [insertDroppedPathsAtCaret]);

	// Forward pet:recording-command IPC events (e.g. from F2 / Fn key) to the ASR hook.
	const stopAndTranscribeRef = useRef(stopAndTranscribe);
	const cancelRecordingRef = useRef(cancelRecording);
	const toggleRecordingRef = useRef(handleToggleRecording);
	useEffect(() => { stopAndTranscribeRef.current = stopAndTranscribe; }, [stopAndTranscribe]);
	useEffect(() => { cancelRecordingRef.current = cancelRecording; }, [cancelRecording]);
	useEffect(() => { toggleRecordingRef.current = handleToggleRecording; }, [handleToggleRecording]);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on('pet:recording-command', payload => {
			const action =
				payload && typeof payload === 'object' && 'action' in payload
					? (payload as { action?: 'start' | 'cancel' | 'confirm' }).action
					: undefined;
			if (action === 'start') {
				void toggleRecordingRef.current();
				return;
			}
			if (action === 'confirm') {
				void stopAndTranscribeRef.current();
			} else {
				cancelRecordingRef.current();
			}
		});

		return () => { unsubscribe?.(); };
	}, []);

	const hasInput =
		input.trim().length > 0 || attachments.length > 0 || droppedPaths.length > 0;

	const renderSlateElement = useCallback(
		(props: RenderElementProps): JSX.Element => {
			const { attributes, children, element } = props;
			if (!isSlatePathElement(element)) {
				return <div {...attributes}>{children}</div>;
			}

			return (
				<span
					{...attributes}
				>
						<span
							contentEditable={false}
							className={styles.pathChip}
							title={element.path.absolutePath}
							onMouseDown={(event) => {
								event.preventDefault();
							}}
							onMouseUp={(event) => {
								event.preventDefault();
								// Run after full pointer cycle so Slate/browser do not overwrite
								// the programmatic selection.
								requestAnimationFrame(() => {
									placeCaretAfterPathChip(element.path.absolutePath);
								});
							}}
						>
							<span className={styles.pathChipIcon}>
								{element.path.isDirectory ? (
									<Folder style={{ width: 12, height: 12 }} />
								) : (
									<FileIcon style={{ width: 12, height: 12 }} />
								)}
							</span>
							<span className={styles.pathChipName}>{element.path.name}</span>
						<button
							type="button"
							className={styles.pathChipRemove}
							onMouseDown={(event) => {
								event.preventDefault();
								event.stopPropagation();
								removePathFromEditor(element.path.absolutePath);
							}}
							title="移除路径"
						>
							<X style={{ width: 10, height: 10 }} />
						</button>
					</span>
					{children}
				</span>
			);
		},
		[
			placeCaretAfterPathChip,
			removePathFromEditor,
			styles.pathChip,
			styles.pathChipIcon,
			styles.pathChipName,
			styles.pathChipRemove,
		],
	);

	const renderActions = () => {
		if (loading) {
			return (
				<>
					<button
						type="button"
						className={cx(styles.micIconBtn, isRecording && styles.micButtonRecording)}
						onClick={() => { void handleToggleRecording(); }}
						title={isRecording ? '停止录音' : '语音输入'}
					>
						<Mic style={{ width: 14, height: 14 }} />
					</button>
					<button
						type="button"
						className={cx(styles.sendButton, styles.sendButtonSending)}
						disabled={false}
						onClick={onSend}
						title="停止生成"
					>
						<Square style={{ width: 12, height: 12 }} fill="currentColor" />
					</button>
				</>
			);
		}

		if (hasInput) {
			return (
				<>
					<button
						type="button"
						className={cx(styles.micIconBtn, isRecording && styles.micButtonRecording)}
						onClick={() => { void handleToggleRecording(); }}
						title={isRecording ? '停止录音' : '语音输入'}
					>
						<Mic style={{ width: 14, height: 14 }} />
					</button>
					<button
						type="button"
						className={styles.sendButton}
						disabled={sendDisabled}
						onClick={onSend}
						title="发送"
					>
						<ArrowUp style={{ width: 15, height: 15 }} />
					</button>
				</>
			);
		}

		return (
			<button
				type="button"
				className={cx(styles.micButton, !isRecording && styles.micButtonHighlighted, isRecording && styles.micButtonRecording)}
				onClick={() => { void handleToggleRecording(); }}
				title={isRecording ? '停止录音' : '语音输入'}
			>
				<Mic style={{ width: 15, height: 15 }} />
			</button>
		);
	};

	return (
		<>
			<div className={styles.container}>

				{/* Mention Overlay */}
				{showMentionPicker && (
					<div className={miniChatStyles.mentionPicker}>
						{mentionOptions.map((option, index) => (
							<button
								key={option.id}
								type="button"
								onMouseEnter={() => {
									onActiveMentionIndexChange(index);
								}}
								onMouseDown={(event) => {
									event.preventDefault();
									onApplyMention(option);
								}}
								className={cx(
									miniChatStyles.mentionOption,
									index === activeMentionIndex && miniChatStyles.mentionOptionActive,
								)}
							>
								<div className={miniChatStyles.mentionOptionMeta}>
									<div className={miniChatStyles.mentionOptionIcon}>
										<ClaudeCode.Color size={16} />
									</div>
									<div className={miniChatStyles.mentionOptionTitle}>
										{option.label}
									</div>
								</div>
							</button>
						))}
					</div>
				)}

			{/* Recording / Transcribing Pill */}
			{(isRecording || isTranscribing) && (
				<div className={styles.recordingPill}>
					{isTranscribing ? (
						<div className={styles.waveContainer}>
							{[0.2, 0.4, 0.3, 0.5, 0.2].map((d, i) => (
								<div 
									key={i} 
									className={styles.waveBar} 
									style={{ 
										animationDelay: `-${d}s`,
										background: 'var(--ant-color-text-quaternary)',
										opacity: 0.5
									}} 
								/>
							))}
						</div>
					) : (
						<div className={styles.waveContainer}>
							{[0.1, 0.4, 0.2, 0.5, 0.3].map((d, i) => (
								<div key={i} className={styles.waveBar} style={{ animationDelay: `-${d}s` }} />
							))}
						</div>
					)}
					
					{isTranscribing ? (
						<span className={styles.recordingLabel}>正在转写…</span>
					) : (
						<>
							<span className={styles.recordingTime}>{formatRecordingTime(recordingTime)}</span>
							<span className={styles.recordingLabel}>正在录音</span>
						</>
					)}
					{isRecording && (
						<button
							type="button"
							className={styles.recordingDiscardBtn}
							onClick={cancelRecording}
							title="取消录音"
						>
							<X style={{ width: 16, height: 16 }} />
						</button>
					)}
				</div>
			)}


		{/* Attachments Row */}
			{attachments.length > 0 && (
				<div className={styles.attachmentRow}>
					{attachments.map((attachment) => (
						<ComposerAttachmentPreview
							key={attachment.id}
							attachment={attachment}
							onRemove={() => onRemoveAttachment(attachment.id)}
							onPreview={(src, fileName) => setPreviewImage({ src, fileName })}
						/>
					))}
				</div>
			)}

			{/* Input Pill */}
			<LayoutGroup id="composer-pill">
				<motion.div 
					layout
					transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
					className={cx(
						styles.pill,
						isMultiline && styles.pillMultiline,
						isDragOver && styles.pillDragOver,
					)}
				>
					{/* Top Area: Inline Actions or just Input */}
					<div 
						style={{ 
							display: 'flex', 
							alignItems: isMultiline ? 'flex-start' : 'center', 
							width: '100%',
							gap: 0 
						}}
					>
						{/* Inline Plus */}
						{!isMultiline && (
							<motion.div 
								layoutId="plus-btn"
								className={styles.plusWrapper}
								style={{ marginRight: 4 }}
								transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
							>
								<Dropdown
									menu={{
										items: [
											{
												key: 'file',
												label: '上传文件',
												icon: <Paperclip className="h-3.5 w-3.5" />,
												onClick: onUploadFile,
												disabled,
											},
											{
												key: 'screenshot',
												label: '截图',
												icon: <Camera className="h-3.5 w-3.5" />,
												onClick: onScreenshot,
												disabled,
											},
										]
									}}
									placement="top"
									trigger={['click']}
									disabled={disabled}
								>
									<button type="button" className={styles.plusButton} disabled={disabled} title="添加附件">
										<Plus style={{ width: 15, height: 15 }} />
									</button>
								</Dropdown>
							</motion.div>
						)}

						{/* Input Area */}
						<motion.div 
							layout="position"
							transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
							className={cx(styles.inputArea, isMultiline && styles.inputAreaMultiline)}
							style={{ flex: 1, minWidth: 0 }}
						>
							<div className={styles.inputTextWrap}>
								<Slate
									key={editorVersion}
									editor={editor}
									initialValue={editorInitialValue}
									onChange={(value) => {
										setEditorValue(value);
										syncEditorToParent(value);
										if (!editor.selection) {
											onCaretChange(extractEditorText(value).length);
										} else {
											const point = editor.selection.anchor;
											const start = Editor.start(editor, []);
											onCaretChange(
												Editor.string(editor, { anchor: start, focus: point }).length,
											);
										}
									}}
								>
										<Editable
											ref={editorDomRef}
											className={styles.editor}
										readOnly={disabled}
										renderElement={renderSlateElement}
										placeholder={placeholder || (isMultiline ? "输入描述或指令..." : "输入消息...")}
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
										onFocus={() => {
											onFocusChange(true);
										}}
										onBlur={() => {
											onFocusChange(false);
										}}
										onCompositionStart={() => {
											onCompositionStart();
										}}
										onCompositionEnd={() => {
											onCompositionEnd();
										}}
										onKeyDown={(event) => {
											const keyEvent = event as unknown as ReactKeyboardEvent<HTMLElement>;
											onKeyDown(keyEvent);
											if (event.defaultPrevented) return;
											if (event.key === "Enter") {
												onPressEnter(keyEvent);
											}
										}}
										renderPlaceholder={({ attributes, children }) => (
											<span {...attributes} className={styles.editorPlaceholder}>
												{children}
											</span>
										)}
									/>
								</Slate>
							</div>
						</motion.div>

						{/* Inline Send */}
						{!isMultiline && (
							<motion.div 
								layoutId="actions-area"
								className={styles.actionsWrapper}
								style={{ marginLeft: 4 }}
								transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
							>
								<AnimatePresence mode="wait">
									<motion.div
										key={loading ? 'loading' : hasInput ? 'send' : 'empty'}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15 }}
										style={{ display: 'flex', alignItems: 'center' }}
									>
										{renderActions()}
									</motion.div>
								</AnimatePresence>
							</motion.div>
						)}
					</div>

					{/* Bottom Area: Only for Multiline */}
					<AnimatePresence>
						{isMultiline && (
							<motion.div 
								initial={{ opacity: 0, height: 0, marginTop: 0 }}
								animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
								exit={{ opacity: 0, height: 0, marginTop: 0 }}
								transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
								style={{ 
									display: 'flex', 
									alignItems: 'center', 
									justifyContent: 'space-between', 
									width: '100%',
									overflow: 'hidden',
									padding: '0 4px 2px'
								}}
							>
								<motion.div layoutId="plus-btn" transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
									<Dropdown
										menu={{
											items: [
												{
													key: 'file',
													label: '上传文件',
													icon: <Paperclip className="h-3.5 w-3.5" />,
													onClick: onUploadFile,
													disabled,
												},
												{
													key: 'screenshot',
													label: '截图',
													icon: <Camera className="h-3.5 w-3.5" />,
													onClick: onScreenshot,
													disabled,
												},
											]
										}}
										placement="top"
										trigger={['click']}
										disabled={disabled}
									>
										<button type="button" className={styles.plusButton} disabled={disabled} title="添加附件">
											<Plus style={{ width: 15, height: 15 }} />
										</button>
									</Dropdown>
								</motion.div>
								<motion.div layoutId="actions-area" transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
									<AnimatePresence mode="wait">
										<motion.div
											key={loading ? 'loading' : hasInput ? 'send' : 'mic'}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											transition={{ duration: 0.15 }}
											style={{ display: 'flex', gap: 8, alignItems: 'center' }}
										>
											{renderActions()}
										</motion.div>
									</AnimatePresence>
								</motion.div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			</LayoutGroup>

			</div>

			{previewImage && (
				<ImageLightbox
					src={previewImage.src}
					fileName={previewImage.fileName}
					onClose={() => setPreviewImage(null)}
				/>
			)}
		</>
	);
}
