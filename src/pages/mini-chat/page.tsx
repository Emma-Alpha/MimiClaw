import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CodeChat } from "@/features/mainChat";
import { getCachedDefaultWorkspaceRoot, fetchDefaultWorkspaceRoot } from "@/lib/code-agent";

import type { MiniChatPendingSession } from "@/lib/mini-chat-session";

const PENDING_SESSION_KEY = "mimiclaw:mini-chat-pending-session";

function consumePendingSession(): MiniChatPendingSession | null {
	try {
		const raw = localStorage.getItem(PENDING_SESSION_KEY);
		localStorage.removeItem(PENDING_SESSION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as MiniChatPendingSession;
		if (parsed.workspaceRoot) return parsed;
		return null;
	} catch {
		return null;
	}
}

export default function MiniChat() {
	const location = useLocation();
	const navigate = useNavigate();

	// On mount, check if there's a pending session to open
	useEffect(() => {
		const pending = consumePendingSession();
		if (!pending) return;
		// Only apply if not already carrying search params
		const currentParams = new URLSearchParams(location.search);
		if (currentParams.has("sessionId") || currentParams.has("newThread")) return;
		const params = new URLSearchParams();
		params.set("workspaceRoot", pending.workspaceRoot);
		if (pending.newThread || !pending.sessionId) {
			params.set("newThread", String(Date.now()));
		} else {
			params.set("sessionId", pending.sessionId);
		}
		navigate(`/mini-chat?${params.toString()}`, { replace: true });
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// Listen for new-thread signal from main process (pet context menu)
	useEffect(() => {
		const handler = async () => {
			let wsRoot = getCachedDefaultWorkspaceRoot();
			if (!wsRoot) {
				wsRoot = await fetchDefaultWorkspaceRoot();
			}
			const params = new URLSearchParams();
			if (wsRoot) params.set("workspaceRoot", wsRoot);
			params.set("newThread", String(Date.now()));
			navigate(`/mini-chat?${params.toString()}`, { replace: true });
		};
		const cleanup = window.electron?.ipcRenderer?.on?.("mini-chat:new-thread", () => {
			void handler();
		});
		return typeof cleanup === "function" ? cleanup : undefined;
	}, [navigate]);

	return (
		<div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
			<CodeChat embeddedCodeAssistant isMiniWindow />
		</div>
	);
}
