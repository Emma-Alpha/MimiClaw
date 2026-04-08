import type {
	KeyboardEvent as ReactKeyboardEvent,
	RefObject,
} from "react";
import type { Descendant } from "slate";
import type { FileAttachment } from "@/components/common/composer-helpers";
import type { UnifiedComposerInputHandle } from "@/components/common/unified-composer-input";
import type { ClaudeCodeSkillsResult } from "@/lib/code-agent";
import type { UnifiedComposerPath } from "@/lib/unified-composer";
import type { MentionEmptyState, MentionOption, SlashOption } from "../../types";

export type DroppedPathChip = UnifiedComposerPath;

export type MiniChatComposerProps = {
	input: string;
	onInputChange: (value: string) => void;
	onSend: () => void;
	loading: boolean;
	disabled: boolean;
	sendDisabled: boolean;
	isClaudeCodeCliMode: boolean;
	placeholder: string;
	attachments: FileAttachment[];
	droppedPaths: DroppedPathChip[];
	onRemoveAttachment: (id: string) => void;
	onPathsChange: (paths: DroppedPathChip[]) => void;
	onUploadFile: () => void;
	onUploadFolder: () => void;
	onScreenshot: () => void;
	/** Still used by the + file-upload menu; no longer used for voice recording. */
	stageBufferFiles: (files: globalThis.File[]) => Promise<void>;
	showMentionPanel: boolean;
	showMentionPicker: boolean;
	mentionOptions: MentionOption[];
	mentionEmptyState: MentionEmptyState | null;
	activeMentionIndex: number;
	onActiveMentionIndexChange: (value: number) => void;
	onApplyMention: (option: MentionOption) => void;
	onPickWorkspace: () => void;
	showSlashPicker: boolean;
	slashOptions: SlashOption[];
	claudeCodeSkills: ClaudeCodeSkillsResult;
	activeSlashIndex: number;
	onActiveSlashIndexChange: (value: number) => void;
	onApplySlashOption: (option: SlashOption) => void;
	composerInputRef: RefObject<UnifiedComposerInputHandle | null>;
	onSkillChange: (skill: string | null) => void;
	onRichContentChange?: (content: Descendant[]) => void;
	onCaretChange: (value: number) => void;
	onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
	onPressEnter: (event: ReactKeyboardEvent<HTMLElement>) => void;
	modelLabel: string;
	onCycleModel: () => void;
	effortEnabled: boolean;
	thinkingEnabled: boolean;
	fastModeEnabled: boolean;
	onToggleEffort: () => void;
	onToggleThinking: () => void;
	onToggleFastMode: () => void;
	onOpenAccountUsage: () => void;
	onRewind: () => void;
	onClearConversation?: () => void;
	onCompositionStart: () => void;
	onCompositionEnd: () => void;
	onFocusChange: (focused: boolean) => void;
	onDropPaths: (paths: DroppedPathChip[]) => void;
};
