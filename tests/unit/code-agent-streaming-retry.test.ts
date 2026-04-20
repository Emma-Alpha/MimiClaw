import { beforeEach, describe, expect, it } from "vitest";

import { useCodeAgentStore } from "@/stores/code-agent";

function getAssistantTextItems(): string[] {
	return useCodeAgentStore
		.getState()
		.items
		.filter((item) => item.kind === "assistant-text")
		.map((item) => item.text);
}

describe("code-agent streaming retry handling", () => {
	beforeEach(() => {
		useCodeAgentStore.getState().reset();
	});

	it("clears partial streaming text when api_retry arrives", () => {
		const store = useCodeAgentStore.getState();
		const answer = "同一段回复";

		store.pushSdkMessage({ type: "stream_event", event: { type: "message_start" } });
		store.appendStreamingText(answer);

		store.pushSdkMessage({
			type: "system",
			subtype: "api_retry",
			attempt: 1,
			max_retries: 10,
			retry_delay_ms: 600,
			error: "server_error",
		});

		store.pushSdkMessage({ type: "stream_event", event: { type: "message_start" } });
		store.appendStreamingText(answer);
		store.pushSdkMessage({
			type: "assistant",
			message: {
				content: [{ type: "text", text: answer }],
			},
		});

		expect(getAssistantTextItems()).toEqual([answer]);
	});

	it("resets residual stream state when a fresh message_start begins", () => {
		const store = useCodeAgentStore.getState();
		const answer = "重试后的最终文本";

		store.pushSdkMessage({ type: "stream_event", event: { type: "message_start" } });
		store.appendStreamingText(answer);

		// Some runtimes only signal a fresh message_start for the next attempt.
		store.pushSdkMessage({ type: "stream_event", event: { type: "message_start" } });
		store.appendStreamingText(answer);
		store.pushSdkMessage({
			type: "assistant",
			message: {
				content: [{ type: "text", text: answer }],
			},
		});

		expect(getAssistantTextItems()).toEqual([answer]);
	});

	it("finalizeRun clears stale busy state after interrupted runs", () => {
		const store = useCodeAgentStore.getState();

		store.pushSdkMessage({
			type: "system",
			subtype: "session_state_changed",
			state: "running",
		});
		store.pushSdkMessage({
			type: "stream_event",
			event: { type: "message_start" },
		});
		store.setPendingPermission({
			requestId: "perm-1",
			toolName: "Read",
			rawInput: {},
			inputSummary: "Read file",
		});
		useCodeAgentStore.setState({
			activeTasks: new Map([
				["task-1", { taskId: "task-1", description: "Still running" }],
			]),
		});

		store.finalizeRun();

		const next = useCodeAgentStore.getState();
		expect(next.sessionState).toBe("idle");
		expect(next.streaming.spinnerMode).toBeNull();
		expect(next.streaming.assistantText).toBe("");
		expect(next.pendingPermission).toBeNull();
		expect(next.pendingElicitation).toBeNull();
		expect(next.activeTasks.size).toBe(0);
		expect(next.lastUpdatedAt).not.toBeNull();
	});
});
