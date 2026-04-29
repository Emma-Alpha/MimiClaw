import type { FileAttachment } from "@/features/mainChat/lib/composer-helpers";

export type ComposerPath = {
	absolutePath: string;
	name: string;
	isDirectory: boolean;
};

export type UnifiedComposerDraft<TAttachment = FileAttachment> = {
	text: string;
	attachments: TAttachment[];
	paths: ComposerPath[];
};

export type SnippetClipboardPayload = {
	plainText?: string;
	htmlText?: string;
	uriListText?: string;
	extraTextPayloads?: string[];
};

const SNIPPET_REFERENCE_PATTERNS = [
	/^\s*(?:[-*]\s+)?`?(?<path>[^()\n\r`]+?\.[A-Za-z0-9][^()\n\r`]*)`?\s*[（(]\s*(?<start>\d{1,7})(?:\s*[-~–—]\s*(?<end>\d{1,7}))?\s*[）)]\s*`?\s*/,
	/^\s*(?:[-*]\s+)?`?(?<path>.+?\.[A-Za-z0-9][^:\n\r`]*)`?\s*:\s*(?<start>\d{1,7})(?:\s*[-~–—]\s*(?<end>\d{1,7}))?\s*`?\s*/,
	/^\s*(?:[-*]\s+)?`?(?<path>[^#\n\r`]+?\.[A-Za-z0-9][^#\n\r`]*)`?\s*#L(?<start>\d{1,7})(?:\s*[-~–—]\s*L?(?<end>\d{1,7}))?\s*`?\s*/,
] as const;

const SNIPPET_URI_TOKEN_PATTERN =
	/(?:file|vscode|vscode-insiders):\/\/[^\s"'<>`)]{8,}/gi;

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

function createSnippetReferencePath(
	normalizedPath: string,
	range: { start: number; end: number },
): ComposerPath {
	const rangeLabel = `${range.start}-${range.end}`;
	const fileName =
		normalizedPath.split(/[\\/]/).filter(Boolean).pop() || normalizedPath;
	return {
		absolutePath: `${normalizedPath} (${rangeLabel})`,
		name: `${fileName} (${rangeLabel})`,
		isDirectory: false,
	};
}

function parseSnippetRangeFromLooseText(
	raw: string,
): { start: number; end: number } | null {
	const normalized = raw.trim();
	if (!normalized) return null;

	const hashLike = normalized.match(
		/(?:^|[#&?])L?(?<start>\d{1,7})(?:\s*[-~–—]\s*L?(?<end>\d{1,7}))?/i,
	);
	if (hashLike?.groups?.start) {
		return normalizeSnippetRange(hashLike.groups.start, hashLike.groups.end);
	}

	const rangeLike = normalized.match(
		/(?<start>\d{1,7})(?::\d+)?(?:\s*[-~–—]\s*(?<end>\d{1,7})(?::\d+)?)?/,
	);
	if (rangeLike?.groups?.start) {
		return normalizeSnippetRange(rangeLike.groups.start, rangeLike.groups.end);
	}
	return null;
}

function splitPathWithLineSuffix(
	raw: string,
): { path: string; range: { start: number; end: number } } | null {
	const normalized = raw.trim();
	if (!normalized) return null;

	const match = normalized.match(
		/^(?<path>.+\.[A-Za-z0-9][^:\n\r]*):(?<start>\d{1,7})(?::\d+)?(?:\s*[-~–—]\s*(?<end>\d{1,7})(?::\d+)?)?$/,
	);
	if (!match?.groups?.path || !match.groups.start) return null;
	const range = normalizeSnippetRange(match.groups.start, match.groups.end);
	if (!range) return null;
	return { path: match.groups.path, range };
}

function normalizeVscodePathname(pathname: string): string {
	const decoded = decodeURIComponent(pathname).trim();
	if (/^\/[A-Za-z]:[\\/]/.test(decoded)) {
		return decoded.slice(1);
	}
	return decoded;
}

function parseSnippetReferenceFromUriToken(rawToken: string): ComposerPath | null {
	const candidate = rawToken.trim().replace(/[),.;\]]+$/, "");
	if (!candidate) return null;

	try {
		const url = new URL(candidate);
		let normalizedPath: string | null = null;
		let range: { start: number; end: number } | null = null;

		if (url.protocol === "file:") {
			normalizedPath = parseAbsolutePath(candidate.split(/[?#]/)[0] ?? "");
			range = parseSnippetRangeFromLooseText(url.hash || url.search || "");
			if (!range) {
				const fromSuffix = splitPathWithLineSuffix(
					normalizeVscodePathname(url.pathname || ""),
				);
				if (fromSuffix) {
					range = fromSuffix.range;
					if (!normalizedPath) {
						normalizedPath =
							normalizeSnippetPathCandidate(fromSuffix.path) || null;
					}
				}
			}
		} else if (
			url.protocol === "vscode:"
			|| url.protocol === "vscode-insiders:"
		) {
			const rawPath = normalizeVscodePathname(url.pathname || "");
			const fromSuffix = splitPathWithLineSuffix(rawPath);
			const queryPath =
				url.searchParams.get("path")
				|| url.searchParams.get("file")
				|| url.searchParams.get("uri");

			normalizedPath =
				(fromSuffix
					? normalizeSnippetPathCandidate(fromSuffix.path)
					: null)
				|| (queryPath ? normalizeSnippetPathCandidate(queryPath) : null);
			range =
				fromSuffix?.range
				|| parseSnippetRangeFromLooseText(
					url.hash
					|| url.searchParams.get("selection")
					|| url.searchParams.get("range")
					|| url.search
					|| "",
				);

			if (!normalizedPath && (url.hostname === "file" || url.host === "file")) {
				normalizedPath = normalizeSnippetPathCandidate(rawPath);
			}
		}

		if (!normalizedPath || !range) return null;
		return createSnippetReferencePath(normalizedPath, range);
	} catch {
		return null;
	}
}

function stripHtmlToText(rawHtml: string): string {
	if (!rawHtml.trim()) return "";
	return rawHtml
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|div|li|tr|h[1-6]|pre|code|blockquote)>/gi, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&amp;/gi, "&")
		.replace(/&#39;/gi, "'")
		.replace(/&quot;/gi, "\"");
}

function extractSnippetReferencePathsFromJsonMetadata(
	rawPayload: string,
): ComposerPath[] {
	const trimmed = rawPayload.trim();
	if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
		return [];
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return [];
	}

	const results: ComposerPath[] = [];
	const seen = new Set<string>();
	const pathKeys = [
		"resource",
		"uri",
		"path",
		"filePath",
		"fsPath",
		"file",
		"documentUri",
		"sourceUri",
		"targetUri",
		"sourceFile",
		"targetFile",
	] as const;
	const startKeys = [
		"startLineNumber",
		"startLine",
		"lineStart",
		"lineNumber",
		"line",
		"start",
		"fromLine",
	] as const;
	const endKeys = [
		"endLineNumber",
		"endLine",
		"lineEnd",
		"end",
		"toLine",
	] as const;

	const readNumber = (
		record: Record<string, unknown>,
		keys: readonly string[],
	): number | null => {
		for (const key of keys) {
			const value = record[key];
			if (typeof value === "number" && Number.isFinite(value)) {
				return Math.round(value);
			}
			if (typeof value === "string" && /^\d+$/.test(value.trim())) {
				return Number.parseInt(value.trim(), 10);
			}
		}
		return null;
	};

	const pushPath = (pathRaw: string, startRaw: number, endRaw?: number | null) => {
		const normalizedPath = normalizeSnippetPathCandidate(pathRaw);
		const range = normalizeSnippetRange(
			String(startRaw),
			typeof endRaw === "number" ? String(endRaw) : undefined,
		);
		if (!normalizedPath || !range) return;
		const snippetPath = createSnippetReferencePath(normalizedPath, range);
		if (seen.has(snippetPath.absolutePath)) return;
		seen.add(snippetPath.absolutePath);
		results.push(snippetPath);
	};

	const visit = (node: unknown) => {
		if (!node || typeof node !== "object") return;
		if (Array.isArray(node)) {
			for (const item of node) {
				visit(item);
			}
			return;
		}

		const record = node as Record<string, unknown>;
		let pathValue: string | null = null;
		for (const key of pathKeys) {
			const value = record[key];
			if (typeof value === "string" && value.trim()) {
				pathValue = value.trim();
				break;
			}
		}

		if (pathValue) {
			const start = readNumber(record, startKeys);
			const end = readNumber(record, endKeys);
			if (start !== null) {
				pushPath(pathValue, start, end);
			}
		}

		for (const value of Object.values(record)) {
			visit(value);
		}
	};

	visit(parsed);
	return results;
}

function extractSnippetLineCandidates(rawLine: string): string[] {
	const line = rawLine.trim();
	if (!line) return [];

	const candidates = new Set<string>();
	const markdownLinkMatch = line.match(
		/^\s*(?:[-*]\s+)?\[[^\]]+\]\((?<target>[^)]+)\)\s*$/,
	);
	const markdownTarget = markdownLinkMatch?.groups?.target?.trim();
	if (markdownTarget) {
		candidates.add(markdownTarget);
	}
	candidates.add(line);

	const inlinePatterns = [
		/`?(?<path>[^`\s]+?\.[A-Za-z0-9][^`\s]*)`?\s*[（(]\s*(?<start>\d{1,7})(?:\s*[-~–—]\s*(?<end>\d{1,7}))?\s*[）)]/g,
		/`?(?<path>[^`\s]+?\.[A-Za-z0-9][^`\s]*)`?\s*:\s*(?<start>\d{1,7})(?:\s*[-~–—]\s*(?<end>\d{1,7}))?/g,
		/`?(?<path>[^`\s]+?\.[A-Za-z0-9][^`\s]*)`?\s*#L(?<start>\d{1,7})(?:\s*[-~–—]\s*L?(?<end>\d{1,7}))?/gi,
	] as const;
	for (const pattern of inlinePatterns) {
		for (const match of line.matchAll(pattern)) {
			const value = match[0]?.trim();
			if (value) {
				candidates.add(value);
			}
		}
	}

	return Array.from(candidates);
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

export function extractComposerPathsFromTransfer(dataTransfer: DataTransfer | null): ComposerPath[] {
	if (!dataTransfer) return [];

	const paths: ComposerPath[] = [];
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

export function extractSnippetReferencePathsFromText(rawText: string): ComposerPath[] {
	if (!rawText.trim()) return [];

	const lines = rawText.split(/\r?\n/).slice(0, 80);
	const paths: ComposerPath[] = [];
	const seen = new Set<string>();

	for (const rawLine of lines) {
		const lineCandidates = extractSnippetLineCandidates(rawLine);
		if (lineCandidates.length === 0) continue;

		let matched = false;
		for (const line of lineCandidates) {
			for (const pattern of SNIPPET_REFERENCE_PATTERNS) {
				const match = line.match(pattern);
				const groups = match?.groups as
					| { path?: string; start?: string; end?: string }
					| undefined;
				if (!groups?.path || !groups.start) continue;

				const normalizedPath = normalizeSnippetPathCandidate(groups.path);
				const range = normalizeSnippetRange(groups.start, groups.end);
				if (!normalizedPath || !range) continue;

				const snippetPath = createSnippetReferencePath(normalizedPath, range);
				if (seen.has(snippetPath.absolutePath)) {
					matched = true;
					break;
				}
				seen.add(snippetPath.absolutePath);
				paths.push(snippetPath);
				matched = true;
				break;
			}
			if (matched) break;
		}
	}

	return paths;
}

function appendUniqueSnippetPaths(
	target: ComposerPath[],
	seen: Set<string>,
	incoming: ComposerPath[],
) {
	for (const item of incoming) {
		const key = item.absolutePath.trim();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		target.push(item);
	}
}

function extractUriTokens(raw: string): string[] {
	if (!raw.trim()) return [];
	const found = raw.match(SNIPPET_URI_TOKEN_PATTERN) ?? [];
	return found.map((token) => token.trim()).filter(Boolean);
}

function removeBasenameOnlySnippetDuplicates(
	paths: ComposerPath[],
): ComposerPath[] {
	const namesWithDirectory = new Set(
		paths
			.filter((item) => {
				const sourcePath = item.absolutePath.replace(
					/\s*\(\d+\s*-\s*\d+\)\s*$/,
					"",
				);
				return /[\\/]/.test(sourcePath);
			})
			.map((item) => item.name),
	);

	return paths.filter((item) => {
		const sourcePath = item.absolutePath.replace(
			/\s*\(\d+\s*-\s*\d+\)\s*$/,
			"",
		);
		if (/[\\/]/.test(sourcePath)) return true;
		return !namesWithDirectory.has(item.name);
	});
}

export function extractSnippetReferencePathsFromClipboard(
	payload: SnippetClipboardPayload,
): ComposerPath[] {
	const result: ComposerPath[] = [];
	const seen = new Set<string>();
	const extraPayloads = payload.extraTextPayloads ?? [];

	const textCandidates = [
		payload.plainText ?? "",
		payload.uriListText ?? "",
		stripHtmlToText(payload.htmlText ?? ""),
		...extraPayloads,
	].filter((value) => value.trim().length > 0);

	for (const candidate of textCandidates) {
		appendUniqueSnippetPaths(
			result,
			seen,
			extractSnippetReferencePathsFromText(candidate),
		);
	}

	const uriTokenSources = [
		payload.plainText ?? "",
		payload.htmlText ?? "",
		payload.uriListText ?? "",
		...extraPayloads,
	].filter((value) => value.trim().length > 0);
	for (const source of uriTokenSources) {
		for (const token of extractUriTokens(source)) {
			const parsed = parseSnippetReferenceFromUriToken(token);
			if (!parsed) continue;
			appendUniqueSnippetPaths(result, seen, [parsed]);
		}
	}

	for (const metadataText of extraPayloads) {
		appendUniqueSnippetPaths(
			result,
			seen,
			extractSnippetReferencePathsFromJsonMetadata(metadataText),
		);
	}

	return removeBasenameOnlySnippetDuplicates(result);
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

export function mergeComposerPaths(
	current: ComposerPath[],
	incoming: ComposerPath[],
): ComposerPath[] {
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

export function composePromptWithPaths(text: string, paths: ComposerPath[]): string {
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

export function toCodeChatSubmission(
	draft: UnifiedComposerDraft,
): { prompt: string; attachments: FileAttachment[] } {
	return {
		prompt: composePromptWithPaths(draft.text, draft.paths),
		attachments: draft.attachments,
	};
}

export function toCliSubmission(
	draft: Pick<UnifiedComposerDraft, "text" | "paths">,
): { prompt: string } {
	return {
		prompt: composePromptWithPaths(draft.text, draft.paths),
	};
}
