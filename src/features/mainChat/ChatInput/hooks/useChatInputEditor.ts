import type { IEditor } from '@lobehub/editor';
import { useRef, useState, type MutableRefObject } from 'react';
import type { ChatInputEditorApi, ChatInputEditorInstance, ChatInputTextareaAdapter, MentionMeta } from '../types';

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
  const [api] = useState<ChatInputEditorApi>(() => {
    const getCurrentMarkdown = () => markdownRef.current;
    const updateMarkdown = (next: string) => {
      markdownRef.current = next;
      setMarkdown(next);
    };

    return {
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

          // If markdownSource is already a string, use it directly
          if (typeof markdownSource === 'string') {
            const next = fromEditorMarkdown(markdownSource);
            markdownRef.current = next;
            return next;
          }

          // Otherwise, try to use the write method
          if (markdownSource && lexicalEditor && typeof markdownSource.write === 'function') {
            const next = fromEditorMarkdown(String(markdownSource.write(lexicalEditor) ?? ''));
            markdownRef.current = next;
            return next;
          }
        }
        return getCurrentMarkdown();
      },
      getEditorData: () => ({ markdown: getCurrentMarkdown() }),
      getMentions: (): MentionMeta[] => {
        const instance = stateRef.current.instance;
        if (!isRichEditor(instance)) return [];
        const lexicalEditor = instance.getLexicalEditor();
        if (!lexicalEditor) return [];

        // Walk the editor state JSON to find mention nodes
        const state = lexicalEditor.getEditorState();
        const json = state.toJSON();
        const mentions: MentionMeta[] = [];

        const walk = (node: Record<string, unknown>) => {
          if (node.type === 'mention') {
            mentions.push({
              label: (node.label as string) ?? '',
              metadata: node.metadata as Record<string, unknown> | undefined,
            });
          }
          const children = node.children as Record<string, unknown>[] | undefined;
          if (Array.isArray(children)) {
            for (const child of children) walk(child);
          }
          const root = node.root as Record<string, unknown> | undefined;
          if (root && typeof root === 'object') walk(root);
        };
        walk(json as unknown as Record<string, unknown>);
        return mentions;
      },
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
    };
  });

  return api;
}

export { EMPTY_MARKDOWN_PLACEHOLDER, fromEditorMarkdown, toEditorMarkdown };
