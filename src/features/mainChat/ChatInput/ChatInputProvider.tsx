import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type PropsWithChildren, type RefObject } from 'react';
import { invokeIpc } from '@/lib/api-client';
import { useFileStore } from '@/stores/file';
import { chatInputStoreSelectors, useChatInputStore } from './store';
import { useChatInputEditor } from './hooks/useChatInputEditor';
import type { ChatInputActionKey, ChatInputAttachment, ChatInputEditorApi, ChatInputEditorInstance, ChatInputSendPayload, MentionItem } from './types';

export interface ChatInputProviderProps extends PropsWithChildren {
  agentId: string;
  leftActions?: ChatInputActionKey[];
  rightActions?: ChatInputActionKey[];
  sendMenu?: React.ReactNode;
  sendButtonProps?: {
    shape?: 'default' | 'round';
  };
  mentionItems?: MentionItem[];
  getMessages?: () => unknown[];
  slashPlacement?: 'top' | 'bottom';
  chatInputEditorRef?: RefObject<ChatInputEditorApi | null>;
  onMarkdownContentChange?: (value: string) => void;
  onSend?: (payload: ChatInputSendPayload) => void | Promise<void>;
  allowExpand?: boolean;
  disabled?: boolean;
  sending?: boolean;
  onStop?: () => void | Promise<void>;
}

interface ChatInputContextValue extends Omit<ChatInputProviderProps, 'children'> {
  expanded: boolean;
  setExpanded: (next: boolean) => void;
  markdown: string;
  setMarkdown: (value: string) => void;
  editor: ChatInputEditorApi | null;
  setEditor: (editor: ChatInputEditorInstance | null) => void;
  attachments: ChatInputAttachment[];
  clearAttachments: () => void;
  removeAttachment: (id: string) => void;
  pickFiles: () => Promise<void>;
}

const ChatInputContext = createContext<ChatInputContextValue | null>(null);

export function ChatInputProvider({ children, ...props }: ChatInputProviderProps) {
  const markdownRef = useRef('');
  const expanded = useChatInputStore(chatInputStoreSelectors.expanded);
  const markdown = useChatInputStore(chatInputStoreSelectors.markdown);
  const storeLeftActions = useChatInputStore(chatInputStoreSelectors.leftActions);
  const storeRightActions = useChatInputStore(chatInputStoreSelectors.rightActions);
  const storeMentionItems = useChatInputStore(chatInputStoreSelectors.mentionItems);
  const storeSlashPlacement = useChatInputStore(chatInputStoreSelectors.slashPlacement);
  const setActionConfig = useChatInputStore((s) => s.setActionConfig);
  const setExpandedStore = useChatInputStore((s) => s.setExpanded);
  const setMarkdownStore = useChatInputStore((s) => s.setMarkdown);
  const setMentionItemsStore = useChatInputStore((s) => s.setMentionItems);
  const setSlashPlacementStore = useChatInputStore((s) => s.setSlashPlacement);
  const setStoreEditor = useChatInputStore((s) => s.setEditor);
  const resetStore = useChatInputStore((s) => s.reset);
  const attachments = useFileStore((s) => s.chatUploadFileList) as ChatInputAttachment[];
  const clearChatUploadFiles = useFileStore((s) => s.clearChatUploadFiles);
  const removeChatUploadFile = useFileStore((s) => s.removeChatUploadFile);
  const stagePathFiles = useFileStore((s) => s.stagePathFiles);
  const {
    agentId,
    allowExpand,
    chatInputEditorRef,
    disabled,
    getMessages,
    leftActions: propLeftActions,
    mentionItems: propMentionItems,
    onMarkdownContentChange,
    onSend,
    onStop,
    rightActions: propRightActions,
    sendButtonProps,
    sendMenu,
    sending,
    slashPlacement: propSlashPlacement,
  } = props;

  const setMarkdown = useCallback((next: string) => {
    if (markdownRef.current === next) return;
    markdownRef.current = next;
    setMarkdownStore(next);
    onMarkdownContentChange?.(next);
  }, [onMarkdownContentChange, setMarkdownStore]);

  const editor = useChatInputEditor(markdownRef, setMarkdown);

  useEffect(() => {
    setStoreEditor(editor);
    return () => setStoreEditor(null);
  }, [editor, setStoreEditor]);

  useEffect(() => {
    if (chatInputEditorRef) {
      chatInputEditorRef.current = editor;
      return () => {
        chatInputEditorRef.current = null;
      };
    }

    return undefined;
  }, [chatInputEditorRef, editor]);

  const setEditor = useCallback((instance: ChatInputEditorInstance | null) => {
    editor.setInstance(instance);
  }, [editor]);

  useEffect(() => {
    setActionConfig(propLeftActions ?? [], propRightActions ?? []);
  }, [propLeftActions, propRightActions, setActionConfig]);

  useEffect(() => {
    setMentionItemsStore(propMentionItems ?? []);
  }, [propMentionItems, setMentionItemsStore]);

  useEffect(() => {
    setSlashPlacementStore(propSlashPlacement ?? 'top');
  }, [propSlashPlacement, setSlashPlacementStore]);

  useEffect(() => () => {
    resetStore();
  }, [resetStore]);

  const pickFiles = useCallback(async () => {
    try {
      const result = (await invokeIpc('dialog:open', {
        properties: ['openFile', 'multiSelections'],
      })) as { canceled: boolean; filePaths?: string[] };
      if (result.canceled || !result.filePaths?.length) return;
      await stagePathFiles(result.filePaths);
    } catch (error) {
      console.error('Failed to pick files:', error);
    }
  }, [stagePathFiles]);

  const clearAttachments = useCallback(() => {
    clearChatUploadFiles();
  }, [clearChatUploadFiles]);

  const removeAttachment = useCallback((id: string) => {
    removeChatUploadFile(id);
  }, [removeChatUploadFile]);

  const value = useMemo<ChatInputContextValue>(() => ({
    agentId,
    allowExpand,
    chatInputEditorRef,
    disabled,
    getMessages,
    leftActions: storeLeftActions,
    mentionItems: storeMentionItems,
    onMarkdownContentChange,
    onSend,
    onStop,
    rightActions: storeRightActions,
    sendButtonProps,
    sendMenu,
    sending,
    slashPlacement: storeSlashPlacement,
    expanded,
    setExpanded: setExpandedStore,
    markdown,
    setMarkdown,
    editor,
    setEditor,
    attachments,
    clearAttachments,
    removeAttachment,
    pickFiles,
  }), [agentId, allowExpand, attachments, chatInputEditorRef, clearAttachments, disabled, editor, expanded, getMessages, markdown, onMarkdownContentChange, onSend, onStop, pickFiles, removeAttachment, sendButtonProps, sendMenu, sending, setEditor, setExpandedStore, setMarkdown, storeLeftActions, storeMentionItems, storeRightActions, storeSlashPlacement]);

  return <ChatInputContext.Provider value={value}>{children}</ChatInputContext.Provider>;
}

export function useChatInputContext() {
  const context = useContext(ChatInputContext);
  if (!context) {
    throw new Error('useChatInputContext must be used within ChatInputProvider');
  }
  return context;
}
