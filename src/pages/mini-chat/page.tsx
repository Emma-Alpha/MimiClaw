import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CodeChat } from "@/features/mainChat";

import type { MiniChatPendingSession } from "@/lib/mini-chat-session";

const PENDING_SESSION_KEY = "mimiclaw:mini-chat-pending-session";

function consumePendingSession(): MiniChatPendingSession | null {
	try {
		const raw = localStorage.getItem(PENDING_SESSION_KEY);
		localStorage.removeItem(PENDING_SESSION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as MiniChatPendingSession;
		if (parsed.workspaceRoot && parsed.sessionId) return parsed;
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
		if (currentParams.has("sessionId")) return;
		const params = new URLSearchParams();
		params.set("workspaceRoot", pending.workspaceRoot);
		params.set("sessionId", pending.sessionId);
		navigate(`/mini-chat?${params.toString()}`, { replace: true });
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
			<CodeChat embeddedCodeAssistant isMiniWindow />
		</div>
	);
}
