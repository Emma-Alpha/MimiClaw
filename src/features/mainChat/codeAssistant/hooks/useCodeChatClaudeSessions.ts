import { type MutableRefObject, useCallback, useState } from "react";
import {
	fetchCodeAgentSessionHistory,
	fetchCodeAgentSessions,
	getCachedDefaultWorkspaceRoot,
} from "@/lib/code-agent";
import { toUserMessage } from "@/lib/api-client";
import { getCodeAgentSessionPerf, getSession } from "@/lib/db";
import { useSettingsStore } from "@/stores/settings";
import { useChatInputStore } from "@/features/mainChat/ChatInput/store";
import {
	deriveContextUsageFromRawMessages,
	useChatStore,
	type CodeAgentContextWindowUsage,
} from "@/stores/chat";
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
		const workspaceRoot = codeWorkspaceRoot.trim() || getCachedDefaultWorkspaceRoot();

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
			const workspaceRoot = codeWorkspaceRoot.trim() || getCachedDefaultWorkspaceRoot();
			if (!sessionId) return false;

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
					const currentItems = useChatStore.getState().items;
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
						useChatStore.setState({ items: updatedItems });
					}
				}

				// Restore per-session config from IndexedDB via dedicated store
				const dbSession = await getSession(sessionId);
				if (dbSession && (dbSession.model || dbSession.effort || dbSession.thinkingLevel)) {
					useChatStore.getState().restoreSessionConfig({
						model: dbSession.model ?? useSettingsStore.getState().codeAgent.model,
						effort: dbSession.effort ?? useSettingsStore.getState().codeAgent.effort,
						thinkingLevel: dbSession.thinkingLevel ?? useChatInputStore.getState().thinkingLevel,
					});
				} else {
					// Old session without config — clear to null (use global defaults)
					useChatStore.getState().resetSessionConfig();
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
