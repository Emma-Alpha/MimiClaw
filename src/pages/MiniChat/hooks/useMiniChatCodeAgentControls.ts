import { useCallback, useMemo } from "react";
import { invokeIpc } from "@/lib/api-client";
import { useSettingsStore } from "@/stores/settings";

type CodeAgentConfig = ReturnType<typeof useSettingsStore.getState>["codeAgent"];

type Params = {
	codeAgentConfig: CodeAgentConfig;
	setCodeAgentConfig: (config: CodeAgentConfig) => void;
};

export function useMiniChatCodeAgentControls({
	codeAgentConfig,
	setCodeAgentConfig,
}: Params) {
	const effortEnabled = codeAgentConfig.effort !== "";
	const thinkingEnabled = codeAgentConfig.thinking !== "disabled";
	const fastModeEnabled = codeAgentConfig.fastMode === true;

	const modelLabel = useMemo(() => {
		const model = (codeAgentConfig.model || "").trim();
		if (!model) return "Default (recommended)";
		if (model === "sonnet") return "Sonnet";
		if (model === "opus") return "Opus";
		return model;
	}, [codeAgentConfig.model]);

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

	const handleCycleModel = useCallback(() => {
		const cycle: Array<"" | "sonnet" | "opus"> = ["", "sonnet", "opus"];
		const current = (useSettingsStore.getState().codeAgent.model || "").trim();
		const currentIndex = cycle.indexOf(current as (typeof cycle)[number]);
		const nextModel =
			currentIndex === -1 ? "sonnet" : cycle[(currentIndex + 1) % cycle.length];
		updateCodeAgentConfig({ model: nextModel });
		void invokeIpc(
			"pet:pushTerminalLine",
			`› Model 已切换为 ${nextModel || "Default (recommended)"}`,
		).catch(() => {});
	}, [updateCodeAgentConfig]);

	const handleToggleEffort = useCallback(() => {
		const nextEffort = useSettingsStore.getState().codeAgent.effort ? "" : "high";
		updateCodeAgentConfig({ effort: nextEffort });
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
		modelLabel,
		handleCycleModel,
		handleToggleEffort,
		handleToggleThinking,
		handleToggleFastMode,
	};
}
