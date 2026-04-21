import { ActionIcon, Flexbox, Tag } from '@lobehub/ui';
import {
  AtSign,
  Brain,
  Eraser,
  History,
  Paperclip,
  PlusSquare,
  Search,
  Settings2,
  Sparkles,
  Wand2,
  Wrench,
  Bot,
  X,
} from 'lucide-react';
import { useMemo, type FC } from 'react';
import type { LucideProps } from 'lucide-react';
import { useChatStore, topicSelectors } from '@/stores/chat';
import { useSettingsStore, labPreferSelectors } from '@/stores/settings';
import type { ChatInputActionKey, MentionItem } from '../types';
import { useChatInputContext } from '../ChatInputProvider';

const ACTION_ICON_MAP: Partial<Record<ChatInputActionKey, { icon: FC<LucideProps>; title: string }>> = {
  clear: { icon: Eraser, title: 'Clear topic' },
  fileUpload: { icon: Paperclip, title: 'Upload files' },
  history: { icon: History, title: 'History' },
  mainToken: { icon: Sparkles, title: 'Token usage' },
  agentMode: { icon: Bot, title: 'Agent mode' },
  memory: { icon: Brain, title: 'Memory' },
  mention: { icon: AtSign, title: 'Mention agent' },
  model: { icon: Settings2, title: 'Model' },
  params: { icon: Settings2, title: 'Parameters' },
  promptTransform: { icon: Wand2, title: 'Prompt transform' },
  saveTopic: { icon: PlusSquare, title: 'Save topic' },
  search: { icon: Search, title: 'Search' },
  tools: { icon: Wrench, title: 'Tools' },
  typo: { icon: Sparkles, title: 'Typo' },
};

function formatMentionLabel(item: MentionItem) {
  return item.label.startsWith('@') ? item.label : `@${item.label}`;
}

export function ChatInputActionBar() {
  const {
    agentId,
    attachments,
    clearAttachments,
    editor,
    leftActions = [],
    mentionItems = [],
    pickFiles,
    removeAttachment,
    rightActions = [],
    setExpanded,
  } = useChatInputContext();
  const clearCurrentTopic = useChatStore((s) => s.clearCurrentTopic);
  const createTopic = useChatStore((s) => s.createTopic);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const currentTopicId = useChatStore((s) => s.currentTopicId);
  const currentTopicTokens = useChatStore(topicSelectors.currentTopicTokens);
  const mode = useChatStore((s) => s.mode);
  const setChatMode = useChatStore((s) => s.setChatMode);
  const memoryEnabled = useSettingsStore(labPreferSelectors.enabled('memory'));
  const promptTransformEnabled = useSettingsStore(labPreferSelectors.enabled('promptTransform'));
  const orderedActions = useMemo(() => Array.from(new Set([...leftActions, ...rightActions])), [leftActions, rightActions]);

  const handleAction = async (action: ChatInputActionKey) => {
    switch (action) {
      case 'clear': {
        clearCurrentTopic(currentTopicId);
        editor?.clearContent();
        clearAttachments();
        return;
      }
      case 'fileUpload': {
        await pickFiles();
        return;
      }
      case 'agentMode': {
        setChatMode(mode === 'agent' ? 'chat' : 'agent');
        return;
      }
      case 'mainToken': {
        editor?.insertTextAtCursor(`\n[estimated tokens: ${currentTopicTokens}]`);
        return;
      }
      case 'memory': {
        editor?.insertTextAtCursor(memoryEnabled ? '\n[memory enabled]' : '\n[memory disabled]');
        return;
      }
      case 'mention': {
        const firstMention = mentionItems[0];
        if (!firstMention) return;
        editor?.insertTextAtCursor(`${formatMentionLabel(firstMention)} `);
        return;
      }
      case 'promptTransform': {
        if (!promptTransformEnabled) return;
        const markdown = editor?.getMarkdownContent().trim() ?? '';
        if (!markdown) return;
        editor?.setMarkdownContent(`${markdown}\n\n<!-- transformed draft -->`);
        return;
      }
      case 'saveTopic': {
        if (!currentTopicId) {
          createTopic(currentSessionKey, `Topic for ${agentId}`);
        }
        return;
      }
      case 'typo': {
        setExpanded(true);
        return;
      }
      default:
        return;
    }
  };

  return (
    <Flexbox align="center" gap={8} horizontal wrap="wrap">
      {orderedActions.map((action) => {
        const config = ACTION_ICON_MAP[action];
        if (!config) return null;
        const { icon, title } = config;
        const enabled = action === 'agentMode'
          || action === 'fileUpload'
          || action === 'clear'
          || action === 'mainToken'
          || action === 'memory'
          || action === 'mention'
          || action === 'promptTransform'
          || action === 'saveTopic'
          || action === 'typo';
        const disabled = action === 'promptTransform' ? !promptTransformEnabled : !enabled;

        return (
          <ActionIcon
            disabled={disabled}
            icon={icon}
            key={action}
            onClick={enabled ? () => void handleAction(action) : undefined}
            title={disabled ? `${title} (coming soon)` : title}
          />
        );
      })}
      {attachments.map((attachment) => (
        <Tag
          key={attachment.id}
          closable
          onClose={(event) => {
            event?.preventDefault?.();
            removeAttachment(attachment.id);
          }}
        >
          {attachment.fileName}
        </Tag>
      ))}
      {attachments.length > 0 ? <ActionIcon icon={X} onClick={clearAttachments} title="Clear files" /> : null}
    </Flexbox>
  );
}
