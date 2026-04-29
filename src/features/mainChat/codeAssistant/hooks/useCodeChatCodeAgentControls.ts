import { useCallback, useMemo } from "react";
import { invokeIpc } from "@/lib/api-client";
import { useSettingsStore } from "@/stores/settings";
import { useChatStore } from "@/stores/chat";

type CodeAgentConfig = ReturnType<typeof useSettingsStore.getState>["codeAgent"];
const CODEX_MODEL_OPTIONS = [
	{ key: "", label: "Default" },
	{ key: "sonnet", label: "Sonnet" },
	{ key: "opus", label: "Opus" },
] as const;
type CodexModelValue = (typeof CODEX_MODEL_OPTIONS)[number]["key"];

function normalizeCodexModel(value: string): CodexModelValue {
	if (value === "sonnet" || value === "opus") return value;
	return "";
}

type Params = {
	codeAgentConfig: CodeAgentConfig;
	setCodeAgentConfig: (config: CodeAgentConfig) => void;
};

export function useCodeChatCodeAgentControls({
	codeAgentConfig,
	setCodeAgentConfig,
}: Params) {
	// Dedicated session config store — guaranteed reactive
	const sessionModel = useChatStore((s) => s.sessionModel);
	const sessionEffort = useChatStore((s) => s.sessionEffort);

	// Effective: per-session overrides global
	const effectiveModel = sessionModel || codeAgentConfig.model;
	const effectiveEffort = sessionEffort ?? codeAgentConfig.effort;

	const effortEnabled = effectiveEffort !== "";
	const thinkingEnabled = codeAgentConfig.thinking !== "disabled";
	const fastModeEnabled = codeAgentConfig.fastMode === true;
	const selectedModel = useMemo(
		() => normalizeCodexModel((effectiveModel || "").trim()),
		[effectiveModel],
	);

	const modelLabel = useMemo(() => {
		const model = (effectiveModel || "").trim();
		if (!model) return "Default";
		if (model === "sonnet") return "Sonnet";
		if (model === "opus") return "Opus";
		return model;
	}, [effectiveModel]);

	const updateCodeAgentConfig = useCallback(
		(patch: Partial<CodeAgentConfig>) => {
			const latest = useSettingsStore.getState().codeAgent;
			setCodeAgentConfig({
				...latest,
				...patch,
			});
		},
		[setCodeAgentConfig],
	);

	const handleSelectModel = useCallback(
		(nextModel: string) => {
			const normalizedModel = normalizeCodexModel((nextModel || "").trim());
			const sc = useChatStore.getState();
			const hasSession = !!sc.sessionId;
			const currentModel = hasSession ? sc.sessionModel : useSettingsStore.getState().codeAgent.model;
			if ((currentModel || "").trim() === normalizedModel) return;

			if (hasSession) {
				sc.setSessionModel(normalizedModel);
			} else {
				updateCodeAgentConfig({ model: normalizedModel });
			}
			void invokeIpc(
				"pet:pushTerminalLine",
				`› Model 已切换为 ${normalizedModel || "Default"}`,
			).catch(() => {});
		},
		[updateCodeAgentConfig],
	);

	const handleCycleModel = useCallback(() => {
		const cycle: CodexModelValue[] = ["", "sonnet", "opus"];
		const hasSession = !!useChatStore.getState().sessionId;
		const currentModel = hasSession
			? useChatStore.getState().sessionModel
			: useSettingsStore.getState().codeAgent.model;
		const current = normalizeCodexModel((currentModel || "").trim());
		const currentIndex = cycle.indexOf(current);
		const nextModel = cycle[(currentIndex + 1) % cycle.length];
		handleSelectModel(nextModel);
	}, [handleSelectModel]);

	const handleToggleEffort = useCallback(() => {
		const hasSession = !!useChatStore.getState().sessionId;
		const currentEffort = hasSession
			? useChatStore.getState().sessionEffort
			: useSettingsStore.getState().codeAgent.effort;
		const nextEffort = currentEffort ? "" : "high";

		if (hasSession) {
			useChatStore.getState().setSessionEffort(nextEffort as "" | "high");
		} else {
			updateCodeAgentConfig({ effort: nextEffort });
		}
		void invokeIpc(
			"pet:pushTerminalLine",
			`› Effort 已切换为 ${nextEffort || "默认"}`,
		).catch(() => {});
	}, [updateCodeAgentConfig]);

	const handleToggleThinking = useCallback(() => {
		const nextThinking =
			useSettingsStore.getState().codeAgent.thinking === "disabled"
				? "enabled"
				: "disabled";
		updateCodeAgentConfig({ thinking: nextThinking });
		void invokeIpc(
			"pet:pushTerminalLine",
			`› Thinking 已切换为 ${nextThinking === "disabled" ? "关闭" : "开启"}`,
		).catch(() => {});
	}, [updateCodeAgentConfig]);

	const handleToggleFastMode = useCallback(() => {
		const nextFastMode = !(useSettingsStore.getState().codeAgent.fastMode === true);
		updateCodeAgentConfig({ fastMode: nextFastMode });
		void invokeIpc(
			"pet:pushTerminalLine",
			`› Fast mode 已切换为 ${nextFastMode ? "开启" : "关闭"}`,
		).catch(() => {});
	}, [updateCodeAgentConfig]);

	return {
		effortEnabled,
		thinkingEnabled,
		fastModeEnabled,
		modelOptions: CODEX_MODEL_OPTIONS,
		selectedModel,
		modelLabel,
		handleSelectModel,
		handleCycleModel,
		handleToggleEffort,
		handleToggleThinking,
		handleToggleFastMode,
	};
}
