import type { RawMessage } from "@/stores/chat";
import type { CodeAgentRunStatus } from "../../../shared/code-agent";

export type MiniChatTarget = "chat" | "code";

export type ToolActivityItem = {
	id: string;
	toolId: string;
	toolName: string;
	inputSummary: string;
	timestamp: number;
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
	id: "code";
	label: string;
	insertText: string;
	description: string;
	keywords: string[];
};

export type MentionDraft = {
	start: number;
	end: number;
	query: string;
};

export type PathAttachment = {
	id: string;
	absolutePath: string;
	name: string;
	isDirectory: boolean;
};
