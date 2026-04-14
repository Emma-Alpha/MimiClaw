import { useCallback, useState } from "react";
import {
	fetchCodeAgentSessionHistory,
	fetchCodeAgentSessions,
} from "@/lib/code-agent";
import { toUserMessage } from "@/lib/api-client";
import {
	deriveContextUsageFromRawMessages,
	type CodeAgentContextWindowUsage,
} from "@/stores/code-agent";
import {
	type HeaderSessionOption,
	toDisplaySessionTitle,
} from "../session-title";

type Params = {
	codeWorkspaceRoot: string;
	resetCodeTimelineState: () => void;
	resetChatSeenState: () => void;
	pushSdkMessage: (payload: unknown) => void;
	pushUserMessage: (text: string) => void;
	resetCodeAgentStreaming: () => void;
	setContextUsage: (usage: CodeAgentContextWindowUsage | null) => void;
};

export function useMiniChatClaudeSessions({
	codeWorkspaceRoot,
	resetCodeTimelineState,
	resetChatSeenState,
	pushSdkMessage,
	pushUserMessage,
	resetCodeAgentStreaming,
	setContextUsage,
}: Params) {
	const [claudeSessions, setClaudeSessions] = useState<HeaderSessionOption[]>([]);
	const [activeClaudeSessionId, setActiveClaudeSessionId] = useState("");

	const loadClaudeSessions = useCallback(async () => {
		const workspaceRoot = codeWorkspaceRoot.trim();
		if (!workspaceRoot) {
			setClaudeSessions([]);
			setActiveClaudeSessionId("");
			return;
		}

		try {
			const sessionsInWorkspace = await fetchCodeAgentSessions(workspaceRoot, 60);
			const mapped: HeaderSessionOption[] = sessionsInWorkspace.map((session) => ({
				key: session.sessionId,
				title: toDisplaySessionTitle(session.title, session.sessionId),
				updatedAt:
					typeof session.updatedAt === "number" && Number.isFinite(session.updatedAt)
						? session.updatedAt
						: null,
			}));
			setClaudeSessions(mapped);
			setActiveClaudeSessionId((current) => {
				if (current && mapped.some((item) => item.key === current)) {
					return current;
				}
				return mapped[0]?.key ?? "";
			});
		} catch {
			setClaudeSessions([]);
			setActiveClaudeSessionId("");
		}
	}, [codeWorkspaceRoot]);

	const hydrateClaudeSessionHistory = useCallback(
		async (sessionId: string) => {
			const workspaceRoot = codeWorkspaceRoot.trim();
			if (!workspaceRoot || !sessionId) return false;

			setActiveClaudeSessionId(sessionId);
			resetCodeTimelineState();
			resetChatSeenState();

			try {
				const result = await fetchCodeAgentSessionHistory(workspaceRoot, sessionId, 300);
				const replayContextUsage = deriveContextUsageFromRawMessages(
					result.rawSdkMessages,
					null,
				);
				for (const rawMsg of result.rawSdkMessages) {
					pushSdkMessage(rawMsg);
				}
				if (replayContextUsage) {
					setContextUsage(replayContextUsage);
				}
				resetCodeAgentStreaming();
				return true;
			} catch (error) {
				pushUserMessage(`加载 Claude 会话失败：${toUserMessage(error)}`);
				return false;
			}
		},
		[
			codeWorkspaceRoot,
			pushSdkMessage,
			pushUserMessage,
			resetChatSeenState,
			resetCodeAgentStreaming,
			resetCodeTimelineState,
			setContextUsage,
		],
	);

	return {
		claudeSessions,
		activeClaudeSessionId,
		setActiveClaudeSessionId,
		loadClaudeSessions,
		hydrateClaudeSessionHistory,
	};
}
