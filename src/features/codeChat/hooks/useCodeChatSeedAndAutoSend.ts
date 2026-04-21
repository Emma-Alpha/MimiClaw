import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
	useEffect,
} from "react";
import type { FileAttachment } from "@/features/mainChat/lib/composer-helpers";
import { invokeIpc } from "@/lib/api-client";
import type {
	PetCodeChatSeed,
	PetCodeChatSeedAttachment,
} from "../../../../shared/pet";
import type { CodeChatTarget } from "../types";
import {
	normalizeCodeChatSeed,
	parseSubmissionIntent,
} from "../utils";

type SubmitPromptFn = (
	rawText: string,
	attachmentOverride?: PetCodeChatSeedAttachment[],
	forcedTarget?: CodeChatTarget,
) => Promise<boolean>;

type Params = {
	pendingAutoSendRef: MutableRefObject<PetCodeChatSeed | null>;
	setPersistentMode: Dispatch<SetStateAction<CodeChatTarget | null>>;
	setSelectedMode: Dispatch<SetStateAction<CodeChatTarget | null>>;
	setAttachments: Dispatch<SetStateAction<FileAttachment[]>>;
	setInput: Dispatch<SetStateAction<string>>;
	setCaretIndex: Dispatch<SetStateAction<number>>;
	submitPrompt: SubmitPromptFn;
	sending: boolean;
	codeSending: boolean;
	isReady: boolean;
};

export function useCodeChatSeedAndAutoSend({
	pendingAutoSendRef,
	setPersistentMode,
	setSelectedMode,
	setAttachments,
	setInput,
	setCaretIndex,
	submitPrompt,
	sending,
	codeSending,
	isReady,
}: Params) {
	const resolveSeedTarget = useCallback((seed: PetCodeChatSeed): CodeChatTarget => {
		if (seed.target === "code" || seed.target === "chat") {
			return seed.target;
		}
		return parseSubmissionIntent(seed.text).target;
	}, []);

	const applySeedState = useCallback((seed: PetCodeChatSeed) => {
		const target = resolveSeedTarget(seed);

		if (seed.persistTarget) {
			setPersistentMode(target);
			setSelectedMode(null);
		} else if (seed.target) {
			setSelectedMode(target);
		}

		if (seed.attachments?.length) {
			setAttachments(seed.attachments as FileAttachment[]);
		}

		if (seed.autoSend === false && seed.text.trim()) {
			setInput((current) => current || seed.text);
			setCaretIndex((current) => current || seed.text.length);
		}

		return target;
	}, [
		resolveSeedTarget,
		setAttachments,
		setCaretIndex,
		setInput,
		setPersistentMode,
		setSelectedMode,
	]);

	useEffect(() => {
		void invokeIpc<string | PetCodeChatSeed | null>("pet:consumeQuickChatInitialMessage")
			.then((payload) => {
				const seed = normalizeCodeChatSeed(payload);
				if (!seed) return;
				applySeedState(seed);
				if (seed.autoSend !== false) {
					pendingAutoSendRef.current = seed;
				}
			});
	}, [applySeedState, pendingAutoSendRef]);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"quick-chat:initial-message",
			(payload) => {
				const seed = normalizeCodeChatSeed(payload as string | PetCodeChatSeed);
				if (!seed) return;
				const target = applySeedState(seed);
				const canSendNow =
					target === "code"
						? !codeSending && !sending
						: isReady && !sending && !codeSending;
				if (canSendNow && seed.autoSend !== false) {
					void submitPrompt(seed.text, seed.attachments, target);
				} else if (seed.autoSend !== false) {
					pendingAutoSendRef.current = seed;
				}
			},
		);

		return () => {
			unsubscribe?.();
		};
	}, [
		applySeedState,
		codeSending,
		isReady,
		pendingAutoSendRef,
		sending,
		submitPrompt,
	]);

	useEffect(() => {
		const queuedSeed = pendingAutoSendRef.current;
		if (!queuedSeed) return;
		if (sending || codeSending) return;

		const target = resolveSeedTarget(queuedSeed);
		if (target === "chat" && !isReady) return;
		if (queuedSeed.autoSend === false) return;

		pendingAutoSendRef.current = null;
		void submitPrompt(queuedSeed.text, queuedSeed.attachments, target);
	}, [
		codeSending,
		isReady,
		pendingAutoSendRef,
		resolveSeedTarget,
		sending,
		submitPrompt,
	]);
}
