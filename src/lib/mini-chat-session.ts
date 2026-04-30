const PENDING_SESSION_KEY = "mimiclaw:mini-chat-pending-session";

export interface MiniChatPendingSession {
	workspaceRoot: string;
	sessionId: string;
	newThread?: boolean;
}

export function writeMiniChatPendingSession(session: MiniChatPendingSession): void {
	try {
		localStorage.setItem(PENDING_SESSION_KEY, JSON.stringify(session));
	} catch { /* ignore */ }
}
