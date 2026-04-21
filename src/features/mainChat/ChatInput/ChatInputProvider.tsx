import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren, type RefObject } from 'react';
import { useChatInputAttachments } from '../hooks/useChatInputAttachments';
import { useChatInputEditor } from './hooks/useChatInputEditor';
import type { ChatInputActionKey, ChatInputAttachment, ChatInputEditorApi, ChatInputEditorInstance, ChatInputSendPayload, ChatInputTextareaAdapter, MentionItem } from './types';

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
  const [expanded, setExpanded] = useState(false);
  const markdownRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [attachments, setAttachments] = useState<ChatInputAttachment[]>([]);
  const { pickFiles } = useChatInputAttachments({
    setAttachments: setAttachments as React.Dispatch<React.SetStateAction<any[]>>,
  });
  const {
    agentId,
    allowExpand,
    chatInputEditorRef,
    disabled,
    getMessages,
    leftActions,
    mentionItems,
    onMarkdownContentChange,
    onSend,
    onStop,
    rightActions,
    sendButtonProps,
    sendMenu,
    sending,
    slashPlacement,
  } = props;

  const setMarkdown = useCallback((next: string) => {
    if (markdownRef.current === next) return;
    markdownRef.current = next;
    onMarkdownContentChange?.(next);
  }, [onMarkdownContentChange]);

  const editor = useChatInputEditor(markdownRef, setMarkdown);

  const editorAdapter = useMemo<ChatInputTextareaAdapter>(() => ({
    focus: () => {
      textareaRef.current?.focus();
    },
    setValue: (value: string) => {
      if (!textareaRef.current) return;
      textareaRef.current.value = value;
    },
  }), []);

  useEffect(() => {
    editor.setInstance(editorAdapter);
    if (chatInputEditorRef) {
      chatInputEditorRef.current = editor;
      return () => {
        chatInputEditorRef.current = null;
      };
    }

    return undefined;
  }, [chatInputEditorRef, editor, editorAdapter]);

  const setEditor = useCallback((instance: ChatInputEditorInstance | null) => {
    textareaRef.current = instance instanceof HTMLTextAreaElement ? instance : null;
  }, []);

  const clearAttachments = useCallback(() => setAttachments([]), []);
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value = useMemo<ChatInputContextValue>(() => ({
    agentId,
    allowExpand,
    chatInputEditorRef,
    disabled,
    getMessages,
    leftActions,
    mentionItems,
    onMarkdownContentChange,
    onSend,
    onStop,
    rightActions,
    sendButtonProps,
    sendMenu,
    sending,
    slashPlacement,
    expanded,
    setExpanded,
    markdown: markdownRef.current,
    setMarkdown,
    editor,
    setEditor,
    attachments,
    clearAttachments,
    removeAttachment,
    pickFiles,
  }), [agentId, allowExpand, attachments, chatInputEditorRef, clearAttachments, disabled, editor, expanded, getMessages, leftActions, mentionItems, onMarkdownContentChange, onSend, onStop, pickFiles, removeAttachment, rightActions, sendButtonProps, sendMenu, sending, setEditor, setMarkdown, slashPlacement]);

  return <ChatInputContext.Provider value={value}>{children}</ChatInputContext.Provider>;
}

export function useChatInputContext() {
  const context = useContext(ChatInputContext);
  if (!context) {
    throw new Error('useChatInputContext must be used within ChatInputProvider');
  }
  return context;
}
