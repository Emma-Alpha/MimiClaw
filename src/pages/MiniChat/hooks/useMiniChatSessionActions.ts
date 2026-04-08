import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
} from "react";
import { invokeIpc } from "@/lib/api-client";
import type { MiniChatTarget } from "../types";
import type { HeaderSessionOption } from "../session-title";

type Params = {
	draftTarget: MiniChatTarget;
	activeClaudeSessionId: string;
	setActiveClaudeSessionId: Dispatch<SetStateAction<string>>;
	claudeSessions: HeaderSessionOption[];
	currentSessionKey: string;
	resetCodeTimelineState: () => void;
	clearComposer: () => void;
	resetChatSeenState: () => void;
	lastHydratedClaudeSessionRef: MutableRefObject<string>;
	newSession: () => void;
	loadSessions: () => Promise<void>;
	switchSession: (key: string) => void;
	loadHistory: (quiet?: boolean) => Promise<void>;
	setCodeWorkspaceRoot: Dispatch<SetStateAction<string>>;
};

export function useMiniChatSessionActions({
	draftTarget,
	activeClaudeSessionId,
	setActiveClaudeSessionId,
	claudeSessions,
	currentSessionKey,
	resetCodeTimelineState,
	clearComposer,
	resetChatSeenState,
	lastHydratedClaudeSessionRef,
	newSession,
	loadSessions,
	switchSession,
	loadHistory,
	setCodeWorkspaceRoot,
}: Params) {
	const handleNewConversation = useCallback(() => {
		resetCodeTimelineState();
		resetChatSeenState();
		clearComposer();
		if (draftTarget === "code") {
			lastHydratedClaudeSessionRef.current = "";
			setActiveClaudeSessionId("");
			return;
		}
		newSession();
		void loadSessions();
	}, [
		clearComposer,
		draftTarget,
		lastHydratedClaudeSessionRef,
		loadSessions,
		newSession,
		resetCodeTimelineState,
		resetChatSeenState,
		setActiveClaudeSessionId,
	]);

	const handleSwitchSession = useCallback(
		(key: string) => {
			if (!key) return;

			if (draftTarget === "code") {
				if (key === activeClaudeSessionId) return;
					lastHydratedClaudeSessionRef.current = "";
					setActiveClaudeSessionId(key);
					resetCodeTimelineState();
					resetChatSeenState();
					return;
				}

				if (key === currentSessionKey) return;

				resetCodeTimelineState();
				resetChatSeenState();
				switchSession(key);
				void loadHistory(true);
			},
		[
			activeClaudeSessionId,
			currentSessionKey,
			draftTarget,
				lastHydratedClaudeSessionRef,
				loadHistory,
				resetCodeTimelineState,
				resetChatSeenState,
				setActiveClaudeSessionId,
				switchSession,
			],
	);

	const handleRewindConversation = useCallback(() => {
		if (draftTarget !== "code") return;
		if (claudeSessions.length <= 1) {
			void invokeIpc("pet:pushTerminalLine", "› 没有可回退的会话").catch(() => {});
			return;
		}
		const currentIndex = claudeSessions.findIndex(
			(item) => item.key === activeClaudeSessionId,
		);
		const fallbackIndex = currentIndex === -1 ? 0 : currentIndex + 1;
		const target = claudeSessions[fallbackIndex];
		if (!target) {
			void invokeIpc("pet:pushTerminalLine", "› 已经是最早会话").catch(() => {});
			return;
		}
		handleSwitchSession(target.key);
		void invokeIpc(
			"pet:pushTerminalLine",
			`› Rewind 到会话: ${target.title}`,
		).catch(() => {});
	}, [
		activeClaudeSessionId,
		claudeSessions,
		draftTarget,
		handleSwitchSession,
	]);

	const handleOpenAccountUsage = useCallback(() => {
		void invokeIpc("pet:openMainWindow").catch(() => {});
		void invokeIpc(
			"pet:pushTerminalLine",
			"› 已打开主窗口，可在 Models/Settings 查看账户与用量",
		).catch(() => {});
	}, []);

	const handlePickWorkspace = useCallback(async () => {
		const result = (await invokeIpc("dialog:open", {
			properties: ["openDirectory"],
		})) as { canceled: boolean; filePaths?: string[] };
		if (result.canceled || !result.filePaths?.[0]) return;
		setCodeWorkspaceRoot(result.filePaths[0]);
	}, [setCodeWorkspaceRoot]);

	const handlePickWorkspaceClick = useCallback(() => {
		void handlePickWorkspace();
	}, [handlePickWorkspace]);

	return {
		handleNewConversation,
		handleSwitchSession,
		handleRewindConversation,
		handleOpenAccountUsage,
		handlePickWorkspace,
		handlePickWorkspaceClick,
	};
}
