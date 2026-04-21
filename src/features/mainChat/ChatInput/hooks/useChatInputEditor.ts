import type { IEditor } from '@lobehub/editor';
import { useMemo, useRef, type MutableRefObject } from 'react';
import type { ChatInputEditorApi, ChatInputEditorInstance, ChatInputTextareaAdapter } from '../types';

function isRichEditor(instance: ChatInputEditorInstance | null): instance is IEditor {
  return Boolean(instance && 'getDocument' in instance && 'getLexicalEditor' in instance);
}

function isTextareaAdapter(instance: ChatInputEditorInstance | null): instance is ChatInputTextareaAdapter {
  return Boolean(instance && 'setValue' in instance);
}

function isTextareaElement(instance: ChatInputEditorInstance | null): instance is HTMLTextAreaElement {
  return instance instanceof HTMLTextAreaElement;
}


const EMPTY_MARKDOWN_PLACEHOLDER = '​';

function toEditorMarkdown(value: string) {
  return value || EMPTY_MARKDOWN_PLACEHOLDER;
}

function fromEditorMarkdown(value: string) {
  return value.replaceAll(EMPTY_MARKDOWN_PLACEHOLDER, '');
}

export function useChatInputEditor(markdownRef: MutableRefObject<string>, setMarkdown: (value: string) => void) {
  const stateRef = useRef<{
    instance: ChatInputEditorInstance | null;
  }>({
    instance: null,
  });

  const getCurrentMarkdown = () => markdownRef.current;
  const updateMarkdown = (next: string) => {
    markdownRef.current = next;
    setMarkdown(next);
  };


  return useMemo<ChatInputEditorApi>(() => ({
    focus: () => {
      stateRef.current.instance?.focus?.();
    },
    clearContent: () => {
      const instance = stateRef.current.instance;
      updateMarkdown('');
      if (isRichEditor(instance)) {
        instance.setDocument('markdown', EMPTY_MARKDOWN_PLACEHOLDER);
      }
      if (isTextareaAdapter(instance)) {
        instance.setValue?.('');
      }
      if (isTextareaElement(instance)) {
        instance.value = '';
      }
    },
    getMarkdownContent: () => {
      const instance = stateRef.current.instance;
      if (isRichEditor(instance)) {
        const lexicalEditor = instance.getLexicalEditor();
        const markdownSource = instance.getDocument('markdown');
        if (markdownSource && lexicalEditor) {
          const next = fromEditorMarkdown(String(markdownSource.write(lexicalEditor) ?? ''));
          markdownRef.current = next;
          return next;
        }
      }
      return getCurrentMarkdown();
    },
    getEditorData: () => ({ markdown: getCurrentMarkdown() }),
    setMarkdownContent: (value) => {
      const instance = stateRef.current.instance;
      updateMarkdown(value);
      if (isRichEditor(instance)) {
        instance.setDocument('markdown', toEditorMarkdown(value));
      }
      if (isTextareaAdapter(instance)) {
        instance.setValue?.(value);
      }
      if (isTextareaElement(instance)) {
        instance.value = value;
      }
    },
    insertTextAtCursor: (value) => {
      const next = `${getCurrentMarkdown()}${value}`;
      const instance = stateRef.current.instance;
      updateMarkdown(next);
      if (isRichEditor(instance)) {
        instance.setDocument('markdown', toEditorMarkdown(next));
      }
      if (isTextareaAdapter(instance)) {
        instance.setValue?.(next);
      }
      if (isTextareaElement(instance)) {
        instance.value = next;
      }
    },
    setInstance: (instance) => {
      stateRef.current.instance = instance;
    },
  }), [markdownRef, setMarkdown]);
}

export { EMPTY_MARKDOWN_PLACEHOLDER, toEditorMarkdown };
