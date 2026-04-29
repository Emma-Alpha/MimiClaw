import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useEffect,
	useRef,
} from "react";
import { invokeIpc } from "@/lib/api-client";
import { subscribeHostEvent } from "@/lib/host-events";
import { useChatStore, type PendingPermission } from "@/stores/chat";
import type {
	CodeAgentStatus,
	CodeAgentPermissionRequest,
} from "../../../../../shared/code-agent";
import type { ToolActivityItem } from "../types";

type CodeAgentPermissionPayload = CodeAgentPermissionRequest & {
	title?: string;
	description?: string;
};

type Params = {
	pushSdkMessage: (payload: unknown) => void;
	resetCodeAgentStreaming: () => void;
	setCodeAgentStatus: Dispatch<SetStateAction<CodeAgentStatus | null>>;
	setCodeRunActive: Dispatch<SetStateAction<boolean>>;
	setCodeAgentPendingPermission: (permission: PendingPermission | null) => void;
	codeActivitiesRef: MutableRefObject<ToolActivityItem[]>;
	pendingCompletionActivitiesRef: MutableRefObject<ToolActivityItem[]>;
};

export function useCodeChatCodeAgentEvents({
	pushSdkMessage,
	resetCodeAgentStreaming,
	setCodeAgentStatus,
	setCodeRunActive,
	setCodeAgentPendingPermission,
	codeActivitiesRef,
	pendingCompletionActivitiesRef,
}: Params) {
	/** Tracks the session ID of the current Code Agent sidecar run.
	 *  Used to discard stale SDK messages from a previous session after switching. */
	const liveRunSessionIdRef = useRef<string | null>(null);

	useEffect(() => {
		const unsubscribeStatus = subscribeHostEvent<CodeAgentStatus>(
			"code-agent:status",
			(payload) => {
				setCodeAgentStatus(payload);
			},
		);

		const unsubscribeActivity = subscribeHostEvent<{
			toolId: string;
			toolName: string;
			inputSummary: string;
		}>("code-agent:activity", (payload) => {
			if (typeof payload?.toolName !== "string") return;
			const item: ToolActivityItem = {
				id: crypto.randomUUID(),
				toolId: payload.toolId || "",
				toolName: payload.toolName,
				inputSummary: payload.inputSummary || "",
				timestamp: Date.now(),
			};
			codeActivitiesRef.current = [...codeActivitiesRef.current, item];
		});

		const unsubscribeToolResult = subscribeHostEvent<{
			toolId: string;
			resultSummary: string;
		}>("code-agent:tool-result", (payload) => {
			if (!payload?.toolId || !payload?.resultSummary) return;
			codeActivitiesRef.current = codeActivitiesRef.current.map((act) =>
				act.toolId === payload.toolId
					? { ...act, resultSummary: payload.resultSummary }
					: act,
			);
		});

		const appendStreamingText = useChatStore.getState().appendStreamingText;
		const unsubscribeToken = subscribeHostEvent<{ text: string }>(
			"code-agent:token",
			(payload) => {
				if (payload?.text) {
					appendStreamingText(payload.text);
				}
			},
		);

		const unsubscribeRunStarted = subscribeHostEvent(
			"code-agent:run-started",
			() => {
				liveRunSessionIdRef.current = null;
				setCodeRunActive(true);
				codeActivitiesRef.current = [];
				resetCodeAgentStreaming();
				// Prime the CLI status line immediately so users see activity
				// before the first SDK text/tool event arrives.
				pushSdkMessage({
					type: "stream_event",
					event: { type: "message_start" },
				});
			},
		);

		const unsubscribeRunDone = subscribeHostEvent(
			"code-agent:run-completed",
			() => {
				setCodeRunActive(false);
				pendingCompletionActivitiesRef.current = [...codeActivitiesRef.current];
				codeActivitiesRef.current = [];
				resetCodeAgentStreaming();
				// Ensure sessionState is "idle" even when the CLI was killed before
				// it could emit a `result` SDK message (e.g. user_cancelled abort).
				useChatStore.setState({ sessionState: "idle" });
			},
		);

		const unsubscribeRunFailed = subscribeHostEvent(
			"code-agent:run-failed",
			() => {
				setCodeRunActive(false);
				pendingCompletionActivitiesRef.current = [...codeActivitiesRef.current];
				codeActivitiesRef.current = [];
				resetCodeAgentStreaming();
				useChatStore.setState({ sessionState: "idle" });
			},
		);

		const showPermissionPrompt = (payload: CodeAgentPermissionPayload) => {
			setCodeAgentPendingPermission({
				requestId: payload.requestId,
				toolName: payload.toolName,
				inputSummary: payload.inputSummary,
				rawInput: payload.rawInput ?? {},
				title: payload.title,
				description: payload.description,
			});
		};

		const unsubscribePermission = subscribeHostEvent<CodeAgentPermissionPayload>(
			"code-agent:permission-request",
			(payload) => {
				if (!payload || typeof payload.requestId !== "string") return;
				const allowed = useChatStore.getState().sessionAllowedTools;
				if (allowed.has(payload.toolName.toLowerCase())) {
					void invokeIpc("code-agent:respond-permission", {
						requestId: payload.requestId,
						decision: "allow",
					}).catch(() => {});
					return;
				}
				showPermissionPrompt(payload);
			},
		);

		const unsubscribeSdkMessage = subscribeHostEvent<unknown>(
			"code-agent:sdk-message",
			(payload) => {
				const msg = payload as Record<string, unknown> | null;

				// Track session ID from system/init messages
				if (msg?.type === "system" && msg?.subtype === "init") {
					const sid = msg.session_id;
					if (typeof sid === "string" && sid) {
						liveRunSessionIdRef.current = sid;
					}
				}

				// Guard: discard stale events from a previous session after switching.
				// If we know the sidecar's session and the store has moved to a
				// different session (or was reset), drop the event.
				if (liveRunSessionIdRef.current) {
					const storeSessionId = useChatStore.getState().sessionId;
					if (storeSessionId !== null && storeSessionId !== liveRunSessionIdRef.current) {
						return;
					}
					// Store was reset (session switch in progress) — allow system/init
					// (which sets the new sessionId) but block everything else.
					if (storeSessionId === null && msg?.type !== "system") {
						return;
					}
				}

				pushSdkMessage(payload);
			},
		);

		return () => {
			unsubscribeToken();
			unsubscribeStatus();
			unsubscribeActivity();
			unsubscribeToolResult();
			unsubscribeRunStarted();
			unsubscribeRunDone();
			unsubscribeRunFailed();
			unsubscribePermission();
			unsubscribeSdkMessage();
		};
	}, [
		pushSdkMessage,
		resetCodeAgentStreaming,
		setCodeAgentPendingPermission,
		setCodeAgentStatus,
		setCodeRunActive,
		codeActivitiesRef,
		pendingCompletionActivitiesRef,
	]);
}
