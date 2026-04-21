import { useMemo } from "react";
import type { ClaudeCodeSkillEntry } from "@/lib/code-agent";
import type { MentionEmptyState, MentionOption, SlashOption } from "../types";
import { filterMentionOptions, getMentionDraft, getSlashDraft } from "../utils";

type ProjectMentionStatus = "idle" | "loading" | "ready" | "error";

type ClaudeCodeSkillsState = {
	global: ClaudeCodeSkillEntry[];
	project: ClaudeCodeSkillEntry[];
};

type Params = {
	input: string;
	caretIndex: number;
	isInputFocused: boolean;
	isClaudeCodeCliMode: boolean;
	projectMentionEntries: MentionOption[];
	projectMentionStatus: ProjectMentionStatus;
	codeWorkspaceRoot: string;
	claudeCodeSkills: ClaudeCodeSkillsState;
};

export function useCodeChatMentionsAndSlash({
	input,
	caretIndex,
	isInputFocused,
	isClaudeCodeCliMode,
	projectMentionEntries,
	projectMentionStatus,
	codeWorkspaceRoot,
	claudeCodeSkills,
}: Params) {
	const mentionDraft = useMemo(
		() => getMentionDraft(input, caretIndex),
		[input, caretIndex],
	);
	const slashDraft = useMemo(
		() => getSlashDraft(input, caretIndex),
		[input, caretIndex],
	);

	const mentionOptions = useMemo(() => {
		if (!mentionDraft) return [];
		return filterMentionOptions(projectMentionEntries, mentionDraft.query);
	}, [mentionDraft, projectMentionEntries]);

	const mentionEmptyState = useMemo<MentionEmptyState | null>(() => {
		if (!mentionDraft || mentionOptions.length > 0) return null;
		if (!codeWorkspaceRoot.trim()) {
			return {
				title: "先选择工作目录",
				description: "选择项目目录后，输入 @ 即可引用文件或文件夹。",
				actionLabel: "选择工作目录",
			};
		}
		if (projectMentionStatus === "loading") {
			return {
				title: "正在索引工作目录",
				description: "文件列表正在准备中，稍等片刻后再试一次。",
			};
		}
		if (projectMentionStatus === "error") {
			return {
				title: "文件列表加载失败",
				description: "可以重新选择工作目录，然后再次输入 @。",
				actionLabel: "重新选择工作目录",
			};
		}
		if (mentionDraft.query.trim()) {
			return {
				title: "没有匹配的文件路径",
				description: `当前工作目录下没有匹配 “${mentionDraft.query}” 的文件或文件夹。`,
			};
		}
		return {
			title: "没有可引用的文件",
			description: "当前工作目录下暂时没有可引用的文件或文件夹。",
		};
	}, [
		codeWorkspaceRoot,
		mentionDraft,
		mentionOptions.length,
		projectMentionStatus,
	]);

	const slashSkillOptions = useMemo<SlashOption[]>(() => {
		const toOption = (entry: ClaudeCodeSkillEntry): SlashOption => ({
			id: `${entry.scope}:${entry.name}`,
			command: entry.command,
			title: entry.name,
			description: entry.description,
			keywords: [entry.name.toLowerCase()],
			scope: entry.scope,
			source: entry.source,
			skillContent: entry.skillContent,
		});
		return [
			...claudeCodeSkills.project.map(toOption),
			...claudeCodeSkills.global.map(toOption),
		];
	}, [claudeCodeSkills]);

	const filteredSlashOptions = useMemo(() => {
		if (!slashDraft) return [];
		const normalizedQuery = slashDraft.query.toLowerCase();
		const rank = (option: SlashOption) => {
			const command = option.command.slice(1).toLowerCase();
			const title = option.title.toLowerCase();
			const description = option.description.toLowerCase();
			if (normalizedQuery.length === 0) return 0;
			if (command.startsWith(normalizedQuery)) return 0;
			if (option.keywords.some((keyword) => keyword.startsWith(normalizedQuery))) {
				return 1;
			}
			if (title.includes(normalizedQuery)) return 2;
			if (description.includes(normalizedQuery)) return 3;
			return 99;
		};
		return slashSkillOptions
			.map((option) => ({ option, rank: rank(option) }))
			.filter(({ rank }) => rank < 99)
			.sort(
				(left, right) =>
					left.rank - right.rank
					|| left.option.title.localeCompare(right.option.title),
			)
			.map(({ option }) => option);
	}, [slashDraft, slashSkillOptions]);

	const showMentionPanel =
		isInputFocused
		&& mentionDraft !== null
		&& (mentionOptions.length > 0 || mentionEmptyState !== null);
	const showMentionPicker = showMentionPanel && mentionOptions.length > 0;
	const showSlashPicker =
		isInputFocused && isClaudeCodeCliMode && slashDraft !== null;

	return {
		mentionDraft,
		slashDraft,
		mentionOptions,
		mentionEmptyState,
		filteredSlashOptions,
		showMentionPanel,
		showMentionPicker,
		showSlashPicker,
	};
}
