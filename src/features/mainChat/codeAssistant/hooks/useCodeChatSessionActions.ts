import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
} from "react";
import { invokeIpc } from "@/lib/api-client";
import type { HeaderSessionOption } from "../session-title";

type Params = {
	activeClaudeSessionId: string;
	setActiveClaudeSessionId: Dispatch<SetStateAction<string>>;
	claudeSessions: HeaderSessionOption[];
	resetCodeTimelineState: () => void;
	clearComposer: () => void;
	resetChatSeenState: () => void;
	lastHydratedClaudeSessionRef: MutableRefObject<string>;
	setCodeWorkspaceRoot: Dispatch<SetStateAction<string>>;
	setCodeSending: Dispatch<SetStateAction<boolean>>;
	setCodeRunActive: Dispatch<SetStateAction<boolean>>;
};

export function useCodeChatSessionActions({
	activeClaudeSessionId,
	setActiveClaudeSessionId,
	claudeSessions,
	resetCodeTimelineState,
	clearComposer,
	resetChatSeenState,
	lastHydratedClaudeSessionRef,
	setCodeWorkspaceRoot,
	setCodeSending,
	setCodeRunActive,
}: Params) {
	const handleNewConversation = useCallback(() => {
		setCodeSending(false);
		setCodeRunActive(false);
		resetCodeTimelineState();
		resetChatSeenState();
		clearComposer();
		lastHydratedClaudeSessionRef.current = "";
		setActiveClaudeSessionId("");
	}, [
		clearComposer,
		lastHydratedClaudeSessionRef,
		resetCodeTimelineState,
		resetChatSeenState,
		setActiveClaudeSessionId,
		setCodeRunActive,
		setCodeSending,
	]);

	const handleSwitchSession = useCallback(
		(key: string) => {
			if (!key) return;
			if (key === activeClaudeSessionId) return;
			setCodeSending(false);
			setCodeRunActive(false);
			lastHydratedClaudeSessionRef.current = "";
			setActiveClaudeSessionId(key);
			resetCodeTimelineState();
			resetChatSeenState();
		},
		[
			activeClaudeSessionId,
			lastHydratedClaudeSessionRef,
			resetCodeTimelineState,
			resetChatSeenState,
			setActiveClaudeSessionId,
			setCodeRunActive,
			setCodeSending,
		],
	);

	const handleRewindConversation = useCallback(() => {
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
