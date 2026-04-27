import { type MutableRefObject, useCallback, useState } from "react";
import {
	fetchCodeAgentSessionHistory,
	fetchCodeAgentSessions,
} from "@/lib/code-agent";
import { toUserMessage } from "@/lib/api-client";
import { getCodeAgentSessionPerf } from "@/lib/db";
import {
	deriveContextUsageFromRawMessages,
	useCodeAgentStore,
	type CodeAgentContextWindowUsage,
} from "@/stores/code-agent";
import {
	type HeaderSessionOption,
	toDisplaySessionTitle,
} from "../session-title";

type Params = {
	codeWorkspaceRoot: string;
	forceFreshSessionOnNextSubmitRef: MutableRefObject<boolean>;
	resetCodeTimelineState: () => void;
	resetChatSeenState: () => void;
	pushSdkMessage: (payload: unknown) => void;
	pushUserMessage: (text: string) => void;
	resetCodeAgentStreaming: () => void;
	setContextUsage: (usage: CodeAgentContextWindowUsage | null) => void;
};

export function useCodeChatClaudeSessions({
	codeWorkspaceRoot,
	forceFreshSessionOnNextSubmitRef,
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
				// If user requested a fresh session (via + button), don't auto-select
				// an existing session — keep the state empty so the next submission
				// creates a brand-new session.
				if (forceFreshSessionOnNextSubmitRef.current) {
					return "";
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

				// If the user requested a fresh session while this fetch was in-flight,
				// discard the stale history so old messages don't bleed into the new thread.
				if (forceFreshSessionOnNextSubmitRef.current) {
					return false;
				}

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

				// Enrich assistant-usage items with cached TPS/TTFT from IndexedDB.
				// Match by outputTokens count (stable between live and replay).
				const cachedPerf = await getCodeAgentSessionPerf(sessionId);
				if (cachedPerf && cachedPerf.entries.length > 0) {
					const currentItems = useCodeAgentStore.getState().items;
					// Build lookup: outputTokens → perf entry (use Map to handle duplicates by last occurrence)
					const perfByTokens = new Map<number, (typeof cachedPerf.entries)[number]>();
					for (const entry of cachedPerf.entries) {
						perfByTokens.set(entry.outputTokens, entry);
					}
					let changed = false;
					const updatedItems = currentItems.map((it) => {
						if (it.kind !== "assistant-usage" || it.tps) return it;
						const hit = perfByTokens.get(it.usage.outputTokens);
						if (!hit) return it;
						changed = true;
						return { ...it, tps: hit.tps, ttftMs: hit.ttftMs, durationMs: it.durationMs ?? hit.durationMs };
					});
					if (changed) {
						useCodeAgentStore.setState({ items: updatedItems });
					}
				}

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
