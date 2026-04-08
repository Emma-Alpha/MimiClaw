export type HeaderSessionOption = {
	key: string;
	title: string;
	updatedAt: number | null;
};

const MAX_SESSION_TITLE_LENGTH = 48;

function isOpaqueSessionId(value: string): boolean {
	const normalized = value.trim();
	if (!normalized) return true;

	if (/^agent:[^:]+:session-\d+(?::.*)?$/i.test(normalized)) return true;
	if (/^session[-:_][a-z0-9-]{6,}$/i.test(normalized)) return true;
	if (/^[0-9a-f]{24,}$/i.test(normalized)) return true;
	if (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			normalized,
		)
	)
		return true;

	return false;
}

function isAbsolutePathLike(value: string): boolean {
	const normalized = value.trim();
	if (!normalized) return false;
	if (/^(\/|~\/)/.test(normalized)) return true;
	if (/^[A-Za-z]:[\\/]/.test(normalized)) return true;
	if (/^\\\\/.test(normalized)) return true;
	return false;
}

function shortenSessionTitle(title: string): string {
	const normalized = title.trim();
	if (!normalized) return "当前会话";
	if (normalized.length <= MAX_SESSION_TITLE_LENGTH) return normalized;
	return `${normalized.slice(0, MAX_SESSION_TITLE_LENGTH)}…`;
}

function fallbackSessionTitleFromKey(sessionKey: string): string {
	const normalized = sessionKey.trim();
	if (!normalized) return "当前会话";

	const tailMatch = normalized.match(/[a-z0-9]{4,}$/i);
	const tail = tailMatch ? tailMatch[0].slice(-4) : "";
	return tail ? `会话 ${tail}` : "当前会话";
}

export function toDisplaySessionTitle(
	rawTitle: string | null | undefined,
	sessionKey: string,
): string {
	const normalized = typeof rawTitle === "string" ? rawTitle.trim() : "";
	if (!normalized) return fallbackSessionTitleFromKey(sessionKey);
	if (isOpaqueSessionId(normalized)) return fallbackSessionTitleFromKey(sessionKey);
	if (isAbsolutePathLike(normalized)) return fallbackSessionTitleFromKey(sessionKey);
	return shortenSessionTitle(normalized);
}

export function getChatSessionTitle(
	session: { key: string; label?: string; displayName?: string },
	sessionLabels: Record<string, string>,
): string {
	const rawTitle =
		sessionLabels[session.key] || session.label || session.displayName || session.key;
	return toDisplaySessionTitle(rawTitle, session.key);
}
