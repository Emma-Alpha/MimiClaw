import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useCallback,
	useMemo,
} from "react";
import type { Descendant } from "slate";
import type { FileAttachment } from "@/features/mainChat/lib/composer-helpers";
import {
	fetchCodeAgentStatus,
	runCodeAgentTask,
} from "@/lib/code-agent";
import { invokeIpc, toUserMessage } from "@/lib/api-client";
import {
	mergeUnifiedComposerPaths,
	toCliSubmission,
	toCodeChatSubmission,
	type UnifiedComposerPath,
} from "@/lib/unified-composer";
import { useChatStore } from "@/stores/chat";
import { useSettingsStore } from "@/stores/settings";
import { toast } from "sonner";
import { applyResponseLanguageToPrompt } from "@/lib/unified-composer";
import type {
	CodeAgentImageAttachment,
	CodeAgentStatus,
} from "../../../../shared/code-agent";
import type { PetCodeChatSeedAttachment } from "../../../../shared/pet";
import type {
	CodeChatTarget,
	MiniCodeMessageImagePreview,
	MiniCodeMessagePathTag,
	SlashOption,
	ToolActivityItem,
} from "../types";
import { parseSubmissionIntent } from "../utils";

type Params = {
	input: string;
	attachments: FileAttachment[];
	droppedPaths: UnifiedComposerPath[];
	selectedMode: CodeChatTarget | null;
	persistentMode: CodeChatTarget | null;
	isReady: boolean;
	sending: boolean;
	codeSending: boolean;
	codeWorkspaceRoot: string;
	activeClaudeSessionId: string;
	setActiveClaudeSessionId: Dispatch<SetStateAction<string>>;
	setCodeSending: Dispatch<SetStateAction<boolean>>;
	setCodeAgentStatus: Dispatch<SetStateAction<CodeAgentStatus | null>>;
	loadClaudeSessions: () => Promise<void> | void;
	pushUserMessage: (
		text: string,
		options?: {
			imagePreviews?: MiniCodeMessageImagePreview[];
			pathTags?: MiniCodeMessagePathTag[];
			richContent?: Descendant[];
		},
	) => void;
	pushSdkMessage: (payload: unknown) => void;
	resetCodeAgentStreaming: () => void;
	sendMessage: (
		text: string,
		attachments?: Array<{
			fileName: string;
			mimeType: string;
			fileSize: number;
			stagedPath: string;
			preview: string | null;
		}>,
		targetAgentId?: string | null,
	) => Promise<void>;
	clearComposer: () => void;
	activeSkillsRef: MutableRefObject<SlashOption[]>;
	richContentRef: MutableRefObject<Descendant[] | undefined>;
	pendingCompletionActivitiesRef: MutableRefObject<ToolActivityItem[]>;
	chatSubmitInFlightRef: MutableRefObject<boolean>;
	forceFreshSessionOnNextSubmitRef: MutableRefObject<boolean>;
};

export function useCodeChatSubmissionActions({
	input,
	attachments,
	droppedPaths,
	selectedMode,
	persistentMode,
	isReady,
	sending,
	codeSending,
	codeWorkspaceRoot,
	activeClaudeSessionId,
	setActiveClaudeSessionId,
	setCodeSending,
	setCodeAgentStatus,
	loadClaudeSessions,
	pushUserMessage,
	pushSdkMessage,
	resetCodeAgentStreaming,
	sendMessage,
	clearComposer,
	activeSkillsRef,
	richContentRef,
	pendingCompletionActivitiesRef,
	chatSubmitInFlightRef,
	forceFreshSessionOnNextSubmitRef,
}: Params) {
	const runMiniCodeTask = useCallback(
		async (
			prompt: string,
			images?: CodeAgentImageAttachment[],
			options?: {
				imagePreviews?: MiniCodeMessageImagePreview[];
				pathTags?: MiniCodeMessagePathTag[];
				displayText?: string;
				richContent?: Descendant[];
			},
		) => {
			const workspaceRoot = codeWorkspaceRoot.trim();
			if (!workspaceRoot) {
				toast.error("请先选择工作目录");
				return false;
			}
			if (codeSending) return false;
			const shouldForceFreshSession = forceFreshSessionOnNextSubmitRef.current;
			if (shouldForceFreshSession) {
				forceFreshSessionOnNextSubmitRef.current = false;
			}
			const displayText = options?.displayText?.trim() ?? "";
			const pathTags = options?.pathTags?.length ? options.pathTags : undefined;
			const userText = displayText || (pathTags?.length ? "" : prompt);

			pushUserMessage(userText, {
				imagePreviews: options?.imagePreviews,
				pathTags: options?.pathTags,
				richContent: options?.richContent,
			});
			// Reset streaming state so old spinners/text don't flash while new run starts.
			// Items are preserved so the timeline persists across rounds within a session.
			resetCodeAgentStreaming();
			setCodeSending(true);

			await invokeIpc(
				"pet:pushTerminalLine",
				`› 开始执行: ${prompt.substring(0, 30)}${prompt.length > 30 ? "..." : ""}`,
			);

			try {
				const latestCodeAgentConfig = useSettingsStore.getState().codeAgent;
				const result = await runCodeAgentTask({
					workspaceRoot,
					prompt,
					images: images?.length ? images : undefined,
					sessionId: shouldForceFreshSession ? undefined : activeClaudeSessionId || undefined,
					configOverride: {
						model: latestCodeAgentConfig.model,
						fallbackModel: latestCodeAgentConfig.fallbackModel,
						effort: latestCodeAgentConfig.effort,
						thinking: latestCodeAgentConfig.thinking,
						fastMode: latestCodeAgentConfig.fastMode === true,
						permissionMode: latestCodeAgentConfig.permissionMode,
					},
					metadata: {
						source: "pet-code-chat",
						ui: "floating-pet",
					},
				});

				const metadata =
					result.metadata && typeof result.metadata === "object"
						? (result.metadata as Record<string, unknown>)
						: null;
				const resultSessionId =
					metadata && typeof metadata.sessionId === "string"
						? metadata.sessionId.trim()
						: "";
				if (resultSessionId) {
					setActiveClaudeSessionId(resultSessionId);
				}

				const outputText = result.output?.trim() || result.summary || "任务已完成";
				const lines = outputText.split("\n").slice(0, 5);
				for (const line of lines) {
					if (line.trim()) {
						await invokeIpc("pet:pushTerminalLine", `› ${line.trim()}`);
					}
				}

				pendingCompletionActivitiesRef.current = [];
				return true;
			} catch (error) {
				pendingCompletionActivitiesRef.current = [];
				pushSdkMessage({
					type: "assistant",
					message: {
						role: "assistant",
						content: [
							{
								type: "text",
								text: toUserMessage(error),
							},
						],
					},
				});
				return false;
			} finally {
				setCodeSending(false);
				void fetchCodeAgentStatus()
					.then((status) => {
						setCodeAgentStatus(status);
					})
					.catch(() => {});
				void loadClaudeSessions();
			}
		},
			[
				activeClaudeSessionId,
				codeSending,
				codeWorkspaceRoot,
				forceFreshSessionOnNextSubmitRef,
				loadClaudeSessions,
				pendingCompletionActivitiesRef,
			pushUserMessage,
			pushSdkMessage,
			resetCodeAgentStreaming,
			setActiveClaudeSessionId,
			setCodeAgentStatus,
			setCodeSending,
		],
	);

	const submitPrompt = useCallback(
		async (
			rawText: string,
			attachmentOverride?: PetCodeChatSeedAttachment[],
			forcedTarget?: CodeChatTarget,
			pathOverride?: UnifiedComposerPath[],
		) => {
			const parsedIntent = parseSubmissionIntent(rawText);
			const target =
				forcedTarget || selectedMode || persistentMode || parsedIntent.target;

			const cleanText = parsedIntent.prompt;

			const effectiveAttachments =
				(attachmentOverride as FileAttachment[] | undefined) ?? attachments;
			const effectivePaths = pathOverride ?? droppedPaths;
			const readyAttachments = effectiveAttachments.filter(
				(attachment) => attachment.status === "ready",
			);
			const allAttachmentsReady =
				effectiveAttachments.length === 0
				|| readyAttachments.length === effectiveAttachments.length;

			if (!allAttachmentsReady) return false;

			const isImageMime = (mime: string) =>
				/^image\/(png|jpe?g|gif|webp|bmp|svg\+xml)$/i.test(mime);

			const imageAttachments: CodeAgentImageAttachment[] = [];
			const imagePreviews: MiniCodeMessageImagePreview[] = [];
			const codeAttachmentPaths = readyAttachments.reduce<UnifiedComposerPath[]>(
				(accumulator, attachment) => {
					const absolutePath = attachment.stagedPath?.trim();
					if (!absolutePath) return accumulator;
					if (target === "code" && isImageMime(attachment.mimeType)) {
						imageAttachments.push({
							filePath: absolutePath,
							mimeType: attachment.mimeType,
						});
						imagePreviews.push({
							preview: attachment.preview,
							fileName: attachment.fileName,
						});
						return accumulator;
					}
					accumulator.push({
						absolutePath,
						name:
							attachment.fileName
							|| absolutePath.split(/[\\/]/).pop()
							|| absolutePath,
						isDirectory: false,
					});
					return accumulator;
				},
				[],
			);
			const mergedPathTags = mergeUnifiedComposerPaths(
				effectivePaths,
				codeAttachmentPaths,
			);

			const hasNonImageAttachments = codeAttachmentPaths.length > 0;
			const activeSkills = activeSkillsRef.current;
			const codeText = (() => {
				const base = hasNonImageAttachments
					? `${cleanText}\n\n请优先读取并分析已附带的文件路径。`
					: cleanText;
				if (activeSkills.length === 0) return base;

				let result = base;
				const cliCommands: string[] = [];
				for (const skill of activeSkills) {
					if (skill.source === "external" && skill.skillContent) {
						result = `${result}\n\n<skill name="${skill.title}">\n${skill.skillContent}\n</skill>`;
					} else {
						cliCommands.push(skill.command);
					}
				}
				if (cliCommands.length > 0) {
					result = `${cliCommands.join(" ")} ${result}`;
				}
				return result;
			})();
			const prompt =
				target === "code"
					? toCliSubmission({
							text: codeText,
							paths: mergeUnifiedComposerPaths(
								effectivePaths,
								codeAttachmentPaths,
							),
						}).prompt
					: toCodeChatSubmission({
							text: cleanText,
							paths: effectivePaths,
							attachments: effectiveAttachments,
						}).prompt;

			if (!prompt && effectiveAttachments.length === 0 && imageAttachments.length === 0) {
				return false;
			}

			if (target === "chat") {
				const { sending: sendingNow } = useChatStore.getState();
				if (!isReady) {
					toast.error("聊天服务未就绪，请稍后再试");
					return false;
				}
				if (sendingNow || chatSubmitInFlightRef.current) return false;
				chatSubmitInFlightRef.current = true;
				clearComposer();
				try {
					const responseLanguage = useSettingsStore.getState().responseLanguage;
					await sendMessage(
						applyResponseLanguageToPrompt(prompt, responseLanguage),
						readyAttachments,
					);
					return true;
				} finally {
					chatSubmitInFlightRef.current = false;
				}
			}

			if (!codeWorkspaceRoot.trim()) return false;

			const raw = richContentRef.current;
			const snapshotRichContent = raw
				? JSON.parse(JSON.stringify(raw))
				: undefined;
			clearComposer();
			const responseLanguage = useSettingsStore.getState().responseLanguage;
			return runMiniCodeTask(
				applyResponseLanguageToPrompt(prompt, responseLanguage),
				imageAttachments,
				{
				imagePreviews,
				pathTags: mergedPathTags,
				displayText: rawText,
				richContent: snapshotRichContent,
				},
			);
		},
		[
			activeSkillsRef,
			attachments,
			chatSubmitInFlightRef,
			clearComposer,
			codeWorkspaceRoot,
			droppedPaths,
			isReady,
			persistentMode,
			richContentRef,
			runMiniCodeTask,
			selectedMode,
			sendMessage,
		],
	);

	const allComposerAttachmentsReady = useMemo(
		() =>
			attachments.length === 0
			|| attachments.every((attachment) => attachment.status === "ready"),
		[attachments],
	);

	const handleSend = useCallback(async () => {
		if (
			(!input.trim() && attachments.length === 0 && droppedPaths.length === 0)
			|| !allComposerAttachmentsReady
			|| sending
			|| codeSending
		) {
			return;
		}
		await submitPrompt(input);
	}, [
		allComposerAttachmentsReady,
		attachments.length,
		codeSending,
		droppedPaths.length,
		input,
		sending,
		submitPrompt,
	]);

	return {
		submitPrompt,
		allComposerAttachmentsReady,
		handleSend,
	};
}
