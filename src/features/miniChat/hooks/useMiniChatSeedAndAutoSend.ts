import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
	useEffect,
} from "react";
import type { FileAttachment } from "@/features/chat/lib/composer-helpers";
import { invokeIpc } from "@/lib/api-client";
import type {
	PetMiniChatSeed,
	PetMiniChatSeedAttachment,
} from "../../../../shared/pet";
import type { MiniChatTarget } from "../types";
import {
	normalizeMiniChatSeed,
	parseSubmissionIntent,
} from "../utils";

type SubmitPromptFn = (
	rawText: string,
	attachmentOverride?: PetMiniChatSeedAttachment[],
	forcedTarget?: MiniChatTarget,
) => Promise<boolean>;

type Params = {
	pendingAutoSendRef: MutableRefObject<PetMiniChatSeed | null>;
	setPersistentMode: Dispatch<SetStateAction<MiniChatTarget | null>>;
	setSelectedMode: Dispatch<SetStateAction<MiniChatTarget | null>>;
	setAttachments: Dispatch<SetStateAction<FileAttachment[]>>;
	setInput: Dispatch<SetStateAction<string>>;
	setCaretIndex: Dispatch<SetStateAction<number>>;
	submitPrompt: SubmitPromptFn;
	sending: boolean;
	codeSending: boolean;
	isReady: boolean;
};

export function useMiniChatSeedAndAutoSend({
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
	const resolveSeedTarget = useCallback((seed: PetMiniChatSeed): MiniChatTarget => {
		if (seed.target === "code" || seed.target === "chat") {
			return seed.target;
		}
		return parseSubmissionIntent(seed.text).target;
	}, []);

	const applySeedState = useCallback((seed: PetMiniChatSeed) => {
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
		void invokeIpc<string | PetMiniChatSeed | null>("pet:consumeInitialMessage")
			.then((payload) => {
				const seed = normalizeMiniChatSeed(payload);
				if (!seed) return;
				applySeedState(seed);
				if (seed.autoSend !== false) {
					pendingAutoSendRef.current = seed;
				}
			});
	}, [applySeedState, pendingAutoSendRef]);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"mini-chat:initial-message",
			(payload) => {
				const seed = normalizeMiniChatSeed(payload as string | PetMiniChatSeed);
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
