import type { FileAttachment } from "@/components/common/composer-helpers";

export type UnifiedComposerPath = {
	absolutePath: string;
	name: string;
	isDirectory: boolean;
};

export type UnifiedComposerDraft<TAttachment = FileAttachment> = {
	text: string;
	attachments: TAttachment[];
	paths: UnifiedComposerPath[];
};

const SNIPPET_REFERENCE_PATTERNS = [
	/^\s*(?:[-*]\s+)?`?(?<path>[^()\n\r`]+?\.[A-Za-z0-9][^()\n\r`]*)`?\s*\(\s*(?<start>\d{1,7})\s*[-~–—]\s*(?<end>\d{1,7})\s*\)\s*`?\s*$/,
	/^\s*(?:[-*]\s+)?`?(?<path>[^:\n\r`]+?\.[A-Za-z0-9][^:\n\r`]*)`?\s*:\s*(?<start>\d{1,7})\s*[-~–—]\s*(?<end>\d{1,7})\s*`?\s*$/,
	/^\s*(?:[-*]\s+)?`?(?<path>[^#\n\r`]+?\.[A-Za-z0-9][^#\n\r`]*)`?\s*#L(?<start>\d{1,7})(?:\s*-\s*L?(?<end>\d{1,7}))?\s*`?\s*$/,
] as const;

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

function normalizeSnippetRange(
	startRaw: string,
	endRaw?: string,
): { start: number; end: number } | null {
	const parsedStart = Number.parseInt(startRaw, 10);
	const parsedEnd = Number.parseInt(endRaw ?? startRaw, 10);
	if (!Number.isFinite(parsedStart) || !Number.isFinite(parsedEnd)) return null;
	if (parsedStart <= 0 || parsedEnd <= 0) return null;
	const start = Math.min(parsedStart, parsedEnd);
	const end = Math.max(parsedStart, parsedEnd);
	return { start, end };
}

function normalizeSnippetPathCandidate(raw: string): string | null {
	const trimmed = raw.trim().replace(/^["'`]|["'`]$/g, "");
	if (!trimmed) return null;

	const absolutePath = parseAbsolutePath(trimmed);
	if (absolutePath) return absolutePath;

	const candidate = trimmed.replace(/^\.\/+/, "").trim();
	if (!candidate) return null;
	if (!/\.[A-Za-z0-9]{1,12}(?:\.[A-Za-z0-9]{1,12})?$/.test(candidate)) {
		return null;
	}
	return candidate;
}

function resolveAbsolutePathFromFile(file: globalThis.File | null): string | undefined {
	if (!file) return undefined;

	// Electron usually exposes `file.path` directly for dropped files.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fromFilePath = (file as any).path as string | undefined;
	if (typeof fromFilePath === "string" && fromFilePath.trim()) {
		return fromFilePath.trim();
	}

	// Fallback for contexts where `file.path` is absent.
	if (typeof window !== "undefined" && window.electron?.getPathForFile) {
		try {
			const resolved = window.electron.getPathForFile(file);
			if (typeof resolved === "string" && resolved.trim()) {
				return resolved.trim();
			}
		} catch {
			// Ignore and fall through.
		}
	}

	return undefined;
}

export function extractDroppedPathsFromTransfer(dataTransfer: DataTransfer | null): UnifiedComposerPath[] {
	if (!dataTransfer) return [];

	const paths: UnifiedComposerPath[] = [];
	const seen = new Set<string>();
	const pushPath = (absolutePath: string | undefined, name: string, isDirectory: boolean) => {
		const normalizedPath = absolutePath?.trim();
		if (!normalizedPath || seen.has(normalizedPath)) return;
		seen.add(normalizedPath);
		paths.push({
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
			const electronPath = resolveAbsolutePathFromFile(file);
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
			const electronPath = resolveAbsolutePathFromFile(file);
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

export function extractSnippetReferencePathsFromText(rawText: string): UnifiedComposerPath[] {
	if (!rawText.trim()) return [];

	const lines = rawText.split(/\r?\n/).slice(0, 80);
	const paths: UnifiedComposerPath[] = [];
	const seen = new Set<string>();

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;

		for (const pattern of SNIPPET_REFERENCE_PATTERNS) {
			const match = line.match(pattern);
			const groups = match?.groups as
				| { path?: string; start?: string; end?: string }
				| undefined;
			if (!groups?.path || !groups.start) continue;

			const normalizedPath = normalizeSnippetPathCandidate(groups.path);
			const range = normalizeSnippetRange(groups.start, groups.end);
			if (!normalizedPath || !range) continue;

			const rangeLabel = `${range.start}-${range.end}`;
			const refPath = `${normalizedPath} (${rangeLabel})`;
			if (seen.has(refPath)) break;
			seen.add(refPath);

			const fileName =
				normalizedPath.split(/[\\/]/).filter(Boolean).pop() || normalizedPath;
			paths.push({
				absolutePath: refPath,
				name: `${fileName} (${rangeLabel})`,
				isDirectory: false,
			});
			break;
		}
	}

	return paths;
}

export function isPathDrag(dataTransfer: DataTransfer | null | undefined): boolean {
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

export function mergeUnifiedComposerPaths(
	current: UnifiedComposerPath[],
	incoming: UnifiedComposerPath[],
): UnifiedComposerPath[] {
	if (!incoming.length) return current;
	const seen = new Set(current.map((item) => item.absolutePath));
	const merged = [...current];

	for (const item of incoming) {
		const absolutePath = item?.absolutePath?.trim();
		if (!absolutePath || seen.has(absolutePath)) continue;
		seen.add(absolutePath);
		merged.push({
			absolutePath,
			name:
				item?.name?.trim() ||
				absolutePath.split(/[\\/]/).pop() ||
				absolutePath,
			isDirectory: Boolean(item?.isDirectory),
		});
	}

	return merged;
}

export function composePromptWithPaths(text: string, paths: UnifiedComposerPath[]): string {
	const normalizedText = text.trim();
	if (!paths.length) return normalizedText;

	const seen = new Set<string>();
	const pathLines: string[] = [];
	for (const item of paths) {
		const absolutePath = item.absolutePath.trim();
		if (!absolutePath || seen.has(absolutePath)) continue;
		seen.add(absolutePath);
		pathLines.push(absolutePath);
	}
	if (!pathLines.length) return normalizedText;
	return normalizedText
		? `${pathLines.join("\n")}\n${normalizedText}`
		: pathLines.join("\n");
}

export function toOpenClawSubmission(
	draft: UnifiedComposerDraft,
): { prompt: string; attachments: FileAttachment[] } {
	return {
		prompt: composePromptWithPaths(draft.text, draft.paths),
		attachments: draft.attachments,
	};
}

export function toMiniChatSubmission(
	draft: UnifiedComposerDraft,
): { prompt: string; attachments: FileAttachment[] } {
	return {
		prompt: composePromptWithPaths(draft.text, draft.paths),
		attachments: draft.attachments,
	};
}

export function toJizhiSubmission(
	draft: Pick<UnifiedComposerDraft, "text" | "paths">,
): { prompt: string } {
	return {
		prompt: composePromptWithPaths(draft.text, draft.paths),
	};
}

export function toCliSubmission(
	draft: Pick<UnifiedComposerDraft, "text" | "paths">,
): { prompt: string } {
	return {
		prompt: composePromptWithPaths(draft.text, draft.paths),
	};
}
