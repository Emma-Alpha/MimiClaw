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
	type ClaudeCodeSkillEntry,
	fetchCodeAgentStatus,
	runCodeAgentTask,
} from "@/lib/code-agent";
import { invokeIpc, toUserMessage } from "@/lib/api-client";
import {
	mergeComposerPaths,
	toCliSubmission,
	type ComposerPath,
} from "@/lib/unified-composer";
import { useChatInputStore } from "@/features/mainChat/ChatInput/store";
import { useSettingsStore } from "@/stores/settings";
import { useChatStore } from "@/stores/chat";
import { toast } from "sonner";
import type {
	CodeAgentImageAttachment,
	CodeAgentStatus,
} from "../../../../../shared/code-agent";
import type { PetCodeChatSeedAttachment } from "../../../../../shared/pet";
import type {
	CodeChatTarget,
	MiniCodeMessageImagePreview,
	MiniCodeMessagePathTag,
	SlashOption,
	ToolActivityItem,
} from "../types";

type Params = {
	input: string;
	attachments: FileAttachment[];
	droppedPaths: ComposerPath[];
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
			mentionTags?: { kind: string; label: string; icon?: string }[];
			pathTags?: MiniCodeMessagePathTag[];
			richContent?: Descendant[];
		},
	) => void;
	pushSdkMessage: (payload: unknown) => void;
	resetCodeAgentStreaming: () => void;
	clearComposer: () => void;
	activeSkillsRef: MutableRefObject<SlashOption[]>;
	allSkillsRef: MutableRefObject<ClaudeCodeSkillEntry[]>;
	richContentRef: MutableRefObject<Descendant[] | undefined>;
	pendingCompletionActivitiesRef: MutableRefObject<ToolActivityItem[]>;
	forceFreshSessionOnNextSubmitRef: MutableRefObject<boolean>;
};

export function useCodeChatSubmissionActions({
	input,
	attachments,
	droppedPaths,
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
	clearComposer,
	activeSkillsRef,
	allSkillsRef,
	richContentRef,
	pendingCompletionActivitiesRef,
	forceFreshSessionOnNextSubmitRef,
}: Params) {
	const runMiniCodeTask = useCallback(
		async (
			prompt: string,
			images?: CodeAgentImageAttachment[],
			options?: {
				imagePreviews?: MiniCodeMessageImagePreview[];
				mentionTags?: { kind: string; label: string; icon?: string }[];
				pathTags?: MiniCodeMessagePathTag[];
				displayText?: string;
				richContent?: Descendant[];
				mcpServerHints?: string[];
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
				mentionTags: options?.mentionTags,
				pathTags: options?.pathTags,
				richContent: options?.richContent,
			});
			// Reset streaming state so old spinners/text don't flash while new run starts.
			// Items are preserved so the timeline persists across rounds within a session.
			resetCodeAgentStreaming();
			setCodeSending(true);
			// Eagerly mark sessionState as "running" so the Sidebar can show
			// a loading indicator immediately, without waiting for the first
			// WebSocket status event from the gateway.
			useChatStore.setState({ sessionState: "running" });

			await invokeIpc(
				"pet:pushTerminalLine",
				`› 开始执行: ${prompt.substring(0, 30)}${prompt.length > 30 ? "..." : ""}`,
			);

			try {
				const latestCodeAgentConfig = useSettingsStore.getState().codeAgent;
				const sc = useChatStore.getState();
				// Prefer per-session config over global settings
				const effectiveModel = sc.sessionModel || latestCodeAgentConfig.model;
				const effectiveEffort = sc.sessionEffort ?? latestCodeAgentConfig.effort;
				const inputThinkingLevel = sc.sessionThinkingLevel
					?? useChatInputStore.getState().thinkingLevel;
				const thinkingOverride = inputThinkingLevel === 'none'
					? latestCodeAgentConfig.thinking
					: inputThinkingLevel === 'low'
						? 'adaptive' as const
						: 'enabled' as const;
				const mcpHints = options?.mcpServerHints;
				let effectiveAppendSystemPrompt: string | undefined;
				if (mcpHints && mcpHints.length > 0) {
					const serverList = mcpHints.join(', ');
					const mcpInstruction = `The user explicitly requested MCP server(s): ${serverList}. You MUST use tools from these MCP servers (prefixed with ${mcpHints.map((s) => `"mcp__${s}__"`).join(' or ')}). Do NOT use tools from other MCP servers that provide similar functionality.`;
					const existing = latestCodeAgentConfig.appendSystemPrompt?.trim() ?? '';
					effectiveAppendSystemPrompt = existing ? `${existing}\n\n${mcpInstruction}` : mcpInstruction;
				}
				const result = await runCodeAgentTask({
					workspaceRoot,
					prompt,
					images: images?.length ? images : undefined,
					sessionId: shouldForceFreshSession ? undefined : activeClaudeSessionId || undefined,
					configOverride: {
						model: effectiveModel,
						fallbackModel: latestCodeAgentConfig.fallbackModel,
						effort: effectiveEffort,
						thinking: thinkingOverride,
						fastMode: latestCodeAgentConfig.fastMode === true,
						permissionMode: latestCodeAgentConfig.permissionMode,
						...(effectiveAppendSystemPrompt ? { appendSystemPrompt: effectiveAppendSystemPrompt } : {}),
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
				// Reset sessionState so the Sidebar loading indicator stops.
				// On success the gateway stream will have already set it to "idle"
				// via the result message; this is a safety net for error paths.
				if (useChatStore.getState().sessionState === "running") {
					useChatStore.setState({ sessionState: "idle" });
				}
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
			_forcedTarget?: CodeChatTarget,
			pathOverride?: ComposerPath[],
			mcpServerHints?: string[],
			mentionTags?: { kind: string; label: string; icon?: string }[],
		) => {
			const cleanText = rawText.trim();

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
			const codeAttachmentPaths = readyAttachments.reduce<ComposerPath[]>(
				(accumulator, attachment) => {
					const absolutePath = attachment.stagedPath?.trim();
					if (!absolutePath) return accumulator;
					if (isImageMime(attachment.mimeType)) {
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
			const mergedPathTags = mergeComposerPaths(
				effectivePaths,
				codeAttachmentPaths,
			);

			const hasNonImageAttachments = codeAttachmentPaths.length > 0;

			// Resolve skill dependencies: if any active skill declares
			// requires_skills, auto-inject those dependency skills.
			const resolvedSkills = (() => {
				const manual = activeSkillsRef.current;
				if (manual.length === 0) return manual;

				const allSkills = allSkillsRef.current;
				const activeNames = new Set(manual.map((s) => s.title.toLowerCase()));
				const deps: SlashOption[] = [];

				for (const skill of manual) {
					// Look up the full entry to get requiresSkills
					const entry = allSkills.find(
						(e) => e.name.toLowerCase() === skill.title.toLowerCase(),
					);
					if (!entry?.requiresSkills?.length) continue;

					for (const depName of entry.requiresSkills) {
						if (activeNames.has(depName.toLowerCase())) continue;
						const depEntry = allSkills.find(
							(e) => e.name.toLowerCase() === depName.toLowerCase(),
						);
						if (!depEntry) continue;
						activeNames.add(depName.toLowerCase());
						deps.push({
							id: `${depEntry.scope}:${depEntry.name}`,
							command: depEntry.command,
							title: depEntry.name,
							description: depEntry.description,
							keywords: [depEntry.name.toLowerCase()],
							scope: depEntry.scope,
							source: depEntry.source,
							skillContent: depEntry.skillContent,
						});
					}
				}

				if (deps.length > 0) {
					const names = deps.map((d) => d.title).join(", ");
					toast.info(`Auto-activated: ${names}`, { duration: 3000 });
					return [...manual, ...deps];
				}
				return manual;
			})();

			const activeSkills = resolvedSkills;
			const codeText = (() => {
				let base = hasNonImageAttachments
					? `${cleanText}\n\n请优先读取并分析已附带的文件路径。`
					: cleanText;
				if (activeSkills.length === 0) return base;

				// Strip serialized skill command prefixes from the text.
				// The markdownWriter serializes skill mention pills as "/command-name",
				// but skills are already handled via activeSkillsRef (appended as <skill>
				// XML or prepended as CLI commands), so the prefix is redundant and
				// causes "Unknown command" errors in the code agent runtime.
				for (const skill of activeSkills) {
					const cmd = skill.command;
					if (base.startsWith(`${cmd} `)) {
						base = base.slice(cmd.length + 1);
					} else if (base === cmd || base.startsWith(cmd)) {
						base = base.slice(cmd.length).trimStart();
					}
				}

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
			const prompt = toCliSubmission({
				text: codeText,
				paths: mergeComposerPaths(
					effectivePaths,
					codeAttachmentPaths,
				),
			}).prompt;

			if (!prompt && effectiveAttachments.length === 0 && imageAttachments.length === 0) {
				return false;
			}

			if (!codeWorkspaceRoot.trim()) return false;

			const raw = richContentRef.current;
			const snapshotRichContent = raw
				? JSON.parse(JSON.stringify(raw))
				: undefined;
			clearComposer();
			return runMiniCodeTask(prompt, imageAttachments, {
				imagePreviews,
				mentionTags,
				pathTags: mergedPathTags,
				displayText: rawText,
				richContent: snapshotRichContent,
				mcpServerHints,
			});
		},
		[
			activeSkillsRef,
			attachments,
			clearComposer,
			codeWorkspaceRoot,
			droppedPaths,
			richContentRef,
			runMiniCodeTask,
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
		submitPrompt,
	]);

	return {
		submitPrompt,
		allComposerAttachmentsReady,
		handleSend,
	};
}
