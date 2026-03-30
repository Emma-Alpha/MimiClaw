/**
 * Cloud API — authentication, session management, and cloud request boundary.
 *
 * All cloud-side requests must go through cloudApiFetch() so that:
 *   - auth headers are automatically attached,
 *   - the cloud base URL is configurable in one place,
 *   - auth errors (401/403) are handled centrally.
 *
 * The session is stored in memory and optionally persisted to localStorage so
 * it survives page refreshes inside the Electron renderer.
 */

import {
	normalizeCloudSession,
	type CloudSession,
	type CloudSessionResponse,
} from "../../shared/cloud-auth";
import { resolveDefaultCloudApiBase } from "./app-env";
export type { CloudSession } from "../../shared/cloud-auth";

/** Base URL of the cloud control-plane API. Override via localStorage key for dev. */
export function getCloudApiBase(): string {
	try {
		const override = window.localStorage.getItem("clawx:cloud-api-base");
		if (override) return override.replace(/\/$/, "");
	} catch {
		// ignore
	}
	return resolveDefaultCloudApiBase();
}

export interface CloudLoginResult {
	token: string;
	userId: string;
	workspaceId: string;
	expiresAt?: number;
}

export interface XiaojiuOAuthConfig {
	authUrl: string;
	clientId: string;
	appId?: string;
	callbackUrl: string;
	cloudApiBase: string;
	exchangePath: string;
}

function getLocalStorageValue(key: string): string {
	try {
		return window.localStorage.getItem(key)?.trim() ?? "";
	} catch {
		return "";
	}
}

function normalizeAbsoluteUrl(value: string, fallback: string): string {
	const candidate = (value || fallback).trim();
	if (!candidate) return fallback;
	if (/^https?:\/\//i.test(candidate)) return candidate.replace(/\/$/, "");
	return `https://${candidate.replace(/^\/+/, "").replace(/\/$/, "")}`;
}

function getDefaultXiaojiuCallbackUrl(cloudApiBase: string): string {
	return new URL("/om/desktop-callback", `${cloudApiBase}/`).toString();
}

export function getXiaojiuOAuthConfig(): XiaojiuOAuthConfig {
	const cloudApiBase = getCloudApiBase();
	const authUrl = normalizeAbsoluteUrl(
		getLocalStorageValue("clawx:xiaojiu-auth-url") ||
			import.meta.env.VITE_XIAOJIU_AUTH_URL ||
			"",
		"https://im.4399om.com/oauth2/authorization",
	);
	const clientId = (
		getLocalStorageValue("clawx:xiaojiu-client-id") ||
		import.meta.env.VITE_XIAOJIU_CLIENT_ID ||
		"1816386499001556992"
	).trim();
	const appId = (
		getLocalStorageValue("clawx:xiaojiu-app-id") ||
		import.meta.env.VITE_XIAOJIU_APP_ID ||
		""
	).trim();
	const exchangePath = (
		getLocalStorageValue("clawx:xiaojiu-exchange-path") ||
		import.meta.env.VITE_XIAOJIU_EXCHANGE_PATH ||
		"/api/main/v1/gateway/om_login"
	).trim();
	const callbackUrl = normalizeAbsoluteUrl(
		getLocalStorageValue("clawx:xiaojiu-callback-url") ||
			import.meta.env.VITE_XIAOJIU_CALLBACK_URL ||
			"",
		getDefaultXiaojiuCallbackUrl(cloudApiBase),
	);

	return {
		authUrl,
		clientId,
		appId,
		callbackUrl,
		cloudApiBase,
		exchangePath,
	};
}

// ---------------------------------------------------------------------------
// In-memory session store (single source during runtime)
// ---------------------------------------------------------------------------

const SESSION_KEY = "clawx:cloud-session";
let _session: CloudSession | null = null;

function loadPersistedSession(): CloudSession | null {
	try {
		const raw = window.localStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<CloudSession>;
		if (!parsed.token || !parsed.userId || !parsed.workspaceId) return null;
		if (parsed.expiresAt && parsed.expiresAt < Date.now()) return null;
		return parsed as CloudSession;
	} catch {
		return null;
	}
}

function persistSession(session: CloudSession | null): void {
	try {
		if (session) {
			window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
		} else {
			window.localStorage.removeItem(SESSION_KEY);
		}
	} catch {
		// ignore
	}
}

export function getCloudSession(): CloudSession | null {
	if (!_session) {
		_session = loadPersistedSession();
	}
	return _session;
}

export function setCloudSession(session: CloudSession | null): void {
	_session = session;
	persistSession(session);
}

export function clearCloudSession(): void {
	setCloudSession(null);
}

export function isCloudSessionValid(): boolean {
	const s = getCloudSession();
	if (!s) return false;
	if (s.expiresAt && s.expiresAt < Date.now()) {
		clearCloudSession();
		return false;
	}
	return true;
}

// ---------------------------------------------------------------------------
// Cloud API fetch boundary
// ---------------------------------------------------------------------------

export class CloudApiError extends Error {
	status: number;
	code?: string;

	constructor(message: string, status: number, code?: string) {
		super(message);
		this.name = "CloudApiError";
		this.status = status;
		this.code = code;
	}
}

export async function cloudApiFetch<T>(
	path: string,
	init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
	const base = getCloudApiBase();
	const url = `${base}${path}`;
	const session = getCloudSession();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...headersToRecord(init?.headers),
	};

	if (!init?.skipAuth && session?.token) {
		headers["Authorization"] = `Bearer ${session.token}`;
	}

	const response = await fetch(url, {
		...init,
		headers,
	});

	if (response.status === 401 || response.status === 403) {
		clearCloudSession();
		throw new CloudApiError(
			"Cloud session expired or unauthorized",
			response.status,
			"AUTH_INVALID",
		);
	}

	if (!response.ok) {
		let message = `${response.status} ${response.statusText}`;
		let code: string | undefined;
		try {
			const body = (await response.json()) as {
				error?: string;
				message?: string;
				code?: string;
			};
			message = body.error ?? body.message ?? message;
			code = body.code;
		} catch {
			// ignore parse error
		}
		throw new CloudApiError(message, response.status, code);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
	if (!headers) return {};
	if (headers instanceof Headers) return Object.fromEntries(headers.entries());
	if (Array.isArray(headers)) return Object.fromEntries(headers);
	return { ...(headers as Record<string, string>) };
}

// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------

/**
 * Authenticate against the cloud API.
 * MVP uses admin/admin; the implementation supports any credentials the
 * backend chooses to accept.
 */
export async function cloudLogin(
	username: string,
	password: string,
): Promise<CloudSession> {
	const data = await cloudApiFetch<CloudSessionResponse>("/api/auth/login", {
		method: "POST",
		skipAuth: true,
		body: JSON.stringify({ username, password }),
	});

	const session = normalizeCloudSession(data, {
		userId: username,
		workspaceId: username,
	});
	setCloudSession(session);
	return session;
}

export async function cloudLogout(): Promise<void> {
	try {
		if (isCloudSessionValid()) {
			await cloudApiFetch("/api/auth/logout", { method: "POST" });
		}
	} catch {
		// best-effort: always clear local session regardless of server response
	} finally {
		clearCloudSession();
	}
}

// ---------------------------------------------------------------------------
// Workspace bootstrap
// ---------------------------------------------------------------------------

export interface WorkspaceStatus {
	workspaceId: string;
	gatewayStatus: "creating" | "starting" | "running" | "stopped" | "error";
	runtimeReady: boolean;
}

export async function fetchWorkspaceStatus(): Promise<WorkspaceStatus> {
	return cloudApiFetch<WorkspaceStatus>("/api/workspace/status");
}
