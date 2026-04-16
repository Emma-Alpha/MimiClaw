import type { Descendant } from "slate";
import type { RawMessage } from "@/stores/chat";
import type { CodeAgentRunStatus } from "../../../shared/code-agent";
export type { CodeAgentTimelineItem } from "@/stores/code-agent";

export type MiniChatTarget = "chat" | "code";

export type ToolActivityItem = {
	id: string;
	toolId: string;
	toolName: string;
	inputSummary: string;
	/** Optional result summary emitted after the tool completes (e.g. "66 lines of output") */
	resultSummary?: string;
	timestamp: number;
};

export type MiniCodeMessageImagePreview = {
	preview: string | null;
	fileName: string;
};

export type MiniCodeMessagePathTag = {
	absolutePath: string;
	name: string;
	isDirectory: boolean;
};

export type MiniCodeMessage = {
	id: string;
	role: "user" | "assistant" | "system";
	text: string;
	createdAt: number;
	status?: CodeAgentRunStatus;
	summary?: string;
	isError?: boolean;
	targetLabel?: string;
	activities?: ToolActivityItem[];
	imagePreviews?: MiniCodeMessageImagePreview[];
	pathTags?: MiniCodeMessagePathTag[];
	/** Slate editor tree for inline rendering in message list */
	richContent?: Descendant[];
};

export type SubmissionIntent = {
	target: MiniChatTarget;
	prompt: string;
};

export type TimelineItem =
	| {
			kind: "chat";
			key: string;
			sortAt: number;
			message: RawMessage;
	  }
	| {
			kind: "code";
			key: string;
			sortAt: number;
			message: MiniCodeMessage;
	  };

export type MentionOption = {
	id: string;
	label: string;
	relativePath: string;
	absolutePath: string;
	isDirectory: boolean;
};

export type MentionEmptyState = {
	title: string;
	description: string;
	actionLabel?: string;
};

export type MentionDraft = {
	start: number;
	end: number;
	query: string;
};

export type SlashDraft = {
	start: number;
	end: number;
	query: string;
};

export type SlashOption = {
	id: string;
	command: string;
	title: string;
	description: string;
	keywords: string[];
	icon?: string;
	scope?: "project" | "global" | "command";
	/** 'claude' = CLI-native skill, 'external' = from ~/.agents, ~/.codex, etc. */
	source?: "claude" | "external";
	/** Full SKILL.md content for external skills (injected as prompt instead of /command) */
	skillContent?: string;
};

export type PathAttachment = {
	id: string;
	absolutePath: string;
	name: string;
	isDirectory: boolean;
};
