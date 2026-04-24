import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { UnifiedComposerInputHandle } from "@/features/mainChat/components/unified-composer-input";
import {
	fetchDirectoryChildren,
	fetchProjectMentionEntries,
	type ProjectMentionEntry,
} from "@/lib/code-agent";
import type { MentionEmptyState, MentionOption } from "../types";
import { getMentionDraft } from "../utils";

/**
 * Cursor-like "@" mention picker hook for CodeAssistantInput.
 *
 * Behaviour:
 *  - `@`           → browse project root (list top-level files/folders)
 *  - `@src/`       → browse `src/` directory
 *  - `@src/comp`   → browse `src/` filtered client-side by "comp"
 *  - `@foo`        → search the whole project for entries matching "foo"
 *  - Selecting a directory drills into it (appends name + `/`)
 *  - Selecting a file inserts a mention via the composer ref
 */
export function useMentionPicker({
	input,
	caretIndex,
	workspaceRoot,
	onInputChange,
	composerInputRef,
}: {
	input: string;
	caretIndex: number;
	workspaceRoot: string;
	onInputChange: (value: string) => void;
	composerInputRef: RefObject<UnifiedComposerInputHandle | null>;
}) {
	const [entries, setEntries] = useState<ProjectMentionEntry[]>([]);
	const [activeMentionIndex, setActiveMentionIndex] = useState(0);

	// Detect active mention draft from the input text + caret position.
	const mentionDraft = useMemo(
		() => getMentionDraft(input, caretIndex),
		[input, caretIndex],
	);

	const showMentionPanel = !!mentionDraft;

	// Parse the query into dirPrefix (for browsing) and filter (for client-side filtering).
	const { dirPrefix, filter, isBrowseMode } = useMemo(() => {
		if (!mentionDraft) return { dirPrefix: "", filter: "", isBrowseMode: false };
		const query = mentionDraft.query;
		const lastSlash = query.lastIndexOf("/");
		if (lastSlash >= 0) {
			// Has a slash → browse mode: list children of the directory prefix
			return {
				dirPrefix: query.slice(0, lastSlash + 1), // e.g. "src/" or "src/components/"
				filter: query.slice(lastSlash + 1),        // e.g. "" or "comp"
				isBrowseMode: true,
			};
		}
		// No slash → search mode
		return { dirPrefix: "", filter: query, isBrowseMode: false };
	}, [mentionDraft]);

	// Fetch entries when mention draft changes.
	useEffect(() => {
		if (!workspaceRoot || !mentionDraft) {
			setEntries([]);
			return;
		}

		let cancelled = false;

		const timeoutId = setTimeout(() => {
			const fetchPromise = isBrowseMode
				? fetchDirectoryChildren(workspaceRoot, dirPrefix)
				: filter
					? fetchProjectMentionEntries(workspaceRoot, filter)
					: fetchDirectoryChildren(workspaceRoot, ""); // `@` with no query → browse root

			fetchPromise
				.then((result) => {
					if (!cancelled) {
						setEntries(result);
						setActiveMentionIndex(0);
					}
				})
				.catch((err) => {
					console.error("[useMentionPicker] fetch error:", err);
				});
		}, 100);

		return () => {
			cancelled = true;
			clearTimeout(timeoutId);
		};
	}, [workspaceRoot, mentionDraft?.query, isBrowseMode, dirPrefix, filter]);

	// Client-side filter when in browse mode and user has typed a partial name.
	const filteredEntries = useMemo(() => {
		if (!isBrowseMode || !filter) return entries;
		const lowerFilter = filter.toLowerCase();
		return entries.filter(
			(entry) => entry.name.toLowerCase().includes(lowerFilter),
		);
	}, [entries, isBrowseMode, filter]);

	// Convert to MentionOption[] for CodeAssistantInput.
	const mentionOptions = useMemo<MentionOption[]>(
		() =>
			filteredEntries.map((entry) => ({
				id: entry.absolutePath,
				label: entry.name,
				relativePath: entry.relativePath,
				absolutePath: entry.absolutePath,
				isDirectory: entry.isDirectory,
			})),
		[filteredEntries],
	);

	const showMentionPicker = showMentionPanel && mentionOptions.length > 0;

	const mentionEmptyState = useMemo<MentionEmptyState | null>(() => {
		if (!showMentionPanel) return null;
		if (mentionOptions.length > 0) return null;
		if (!workspaceRoot) {
			return {
				title: "未设置工作区",
				description: "请先选择一个工作区目录，然后使用 @ 引用文件",
				actionLabel: "选择工作区",
			};
		}
		return {
			title: "没有找到匹配项",
			description: isBrowseMode
				? `目录 "${dirPrefix}" 下没有匹配 "${filter}" 的文件或文件夹`
				: `没有找到匹配 "${filter}" 的文件或文件夹`,
		};
	}, [showMentionPanel, mentionOptions.length, workspaceRoot, isBrowseMode, dirPrefix, filter]);

	// Handle mention selection.
	// - Directory → drill into it (update input text to append dir name + "/")
	// - File → insert mention via composer ref
	const onApplyMention = useCallback(
		(option: MentionOption) => {
			if (!mentionDraft) return;

			if (option.isDirectory) {
				// Drill into the directory: replace the current @ query with `@<relativePath>/`
				const before = input.slice(0, mentionDraft.start);
				const after = input.slice(mentionDraft.end);
				const newQuery = `@${option.relativePath}/`;
				onInputChange(`${before}${newQuery}${after}`);
				return;
			}

			// File selected → insert mention via composer ref
			const ref = composerInputRef.current;
			if (ref) {
				ref.insertMention(
					{
						absolutePath: option.absolutePath,
						name: option.label,
						isDirectory: false,
					},
					{ start: mentionDraft.start, end: mentionDraft.end },
				);
			}
		},
		[input, mentionDraft, onInputChange, composerInputRef],
	);

	// Reset active index when options change.
	const prevOptionsLenRef = useRef(mentionOptions.length);
	useEffect(() => {
		if (mentionOptions.length !== prevOptionsLenRef.current) {
			prevOptionsLenRef.current = mentionOptions.length;
			setActiveMentionIndex(0);
		}
	}, [mentionOptions.length]);

	return {
		showMentionPanel,
		showMentionPicker,
		mentionOptions,
		mentionEmptyState,
		activeMentionIndex,
		onActiveMentionIndexChange: setActiveMentionIndex,
		onApplyMention,
	};
}
