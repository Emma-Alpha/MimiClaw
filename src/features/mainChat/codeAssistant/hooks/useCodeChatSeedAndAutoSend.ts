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
} from "../../../../../shared/pet";
import type { CodeChatTarget } from "../types";
import {
	normalizeCodeChatSeed,
} from "../utils";

type SubmitPromptFn = (
	rawText: string,
	attachmentOverride?: PetCodeChatSeedAttachment[],
	forcedTarget?: CodeChatTarget,
) => Promise<boolean>;

type Params = {
	pendingAutoSendRef: MutableRefObject<PetCodeChatSeed | null>;
	setAttachments: Dispatch<SetStateAction<FileAttachment[]>>;
	setInput: Dispatch<SetStateAction<string>>;
	setCaretIndex: Dispatch<SetStateAction<number>>;
	submitPrompt: SubmitPromptFn;
	codeSending: boolean;
};

export function useCodeChatSeedAndAutoSend({
	pendingAutoSendRef,
	setAttachments,
	setInput,
	setCaretIndex,
	submitPrompt,
	codeSending,
}: Params) {
	const applySeedState = useCallback((seed: PetCodeChatSeed) => {
		if (seed.attachments?.length) {
			setAttachments(seed.attachments as FileAttachment[]);
		}

		if (seed.autoSend === false && seed.text.trim()) {
			setInput((current) => current || seed.text);
			setCaretIndex((current) => current || seed.text.length);
		}
	}, [
		setAttachments,
		setCaretIndex,
		setInput,
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
				applySeedState(seed);
				const canSendNow = !codeSending;
				if (canSendNow && seed.autoSend !== false) {
					void submitPrompt(seed.text, seed.attachments, "code");
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
		pendingAutoSendRef,
		submitPrompt,
	]);

	useEffect(() => {
		const queuedSeed = pendingAutoSendRef.current;
		if (!queuedSeed) return;
		if (codeSending) return;
		if (queuedSeed.autoSend === false) return;

		pendingAutoSendRef.current = null;
		void submitPrompt(queuedSeed.text, queuedSeed.attachments, "code");
	}, [
		codeSending,
		pendingAutoSendRef,
		submitPrompt,
	]);
}
