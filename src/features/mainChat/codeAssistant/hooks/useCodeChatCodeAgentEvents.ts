import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useEffect,
} from "react";
import { invokeIpc } from "@/lib/api-client";
import { subscribeHostEvent } from "@/lib/host-events";
import { useCodeAgentStore, type PendingPermission } from "@/stores/code-agent";
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

		const appendStreamingText = useCodeAgentStore.getState().appendStreamingText;
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
			},
		);

		const unsubscribeRunFailed = subscribeHostEvent(
			"code-agent:run-failed",
			() => {
				setCodeRunActive(false);
				pendingCompletionActivitiesRef.current = [...codeActivitiesRef.current];
				codeActivitiesRef.current = [];
				resetCodeAgentStreaming();
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
				const allowed = useCodeAgentStore.getState().sessionAllowedTools;
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
