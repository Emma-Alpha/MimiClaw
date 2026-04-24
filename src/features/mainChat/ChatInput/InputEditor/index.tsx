import { INSERT_MENTION_COMMAND, type IEditor, type ISlashOption } from '@lobehub/editor';
import { Editor, type EditorProps, useEditor } from '@lobehub/editor/react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { preferenceSelectors, useSettingsStore } from '@/stores/settings';
import { usePasteFile, useUploadFiles } from '@/components/DragUploadZone';
import { useChatInputContext } from '../ChatInputProvider';
import { fromEditorMarkdown } from '../hooks/useChatInputEditor';
import { useChatInputStore } from '../store';
import { MentionTagDecoratorOverride } from './MentionTag';

type PressEnterPayload = Parameters<NonNullable<EditorProps['onPressEnter']>>[0];

export function InputEditor() {
  const { t } = useTranslation('chatInput');
  const {
    attachments,
    clearAttachments,
    disabled,
    editor,
    extraSlashItems = [],
    mentionItems = [],
    onSend,
    onStop,
    pickFiles,
    sending,
    setEditor,
    setMarkdown,
    slashPlacement = 'top',
  } = useChatInputContext();
  const useCmdEnterToSend = useSettingsStore(preferenceSelectors.useCmdEnterToSend);
  const editorInstance = useEditor();
  const setEditorInstance = useChatInputStore((s) => s.setEditorInstance);
  const editorInstanceFromStore = useChatInputStore((s) => s.editorInstance);

  const { handleUploadFiles } = useUploadFiles();
  usePasteFile(editorInstanceFromStore, handleUploadFiles);

  useEffect(() => () => setEditor(null), [setEditor]);

  const handleSend = useCallback(async () => {
    if (!editor || !onSend || disabled) return;
    await onSend({
      attachments,
      clearAttachments,
      clearContent: editor.clearContent,
      getMarkdownContent: editor.getMarkdownContent,
      getEditorData: editor.getEditorData,
    });
  }, [attachments, clearAttachments, disabled, editor, onSend]);

  const handlePressEnter = useCallback(({ event }: PressEnterPayload) => {
    if (event.isComposing) return true;

    const shouldSend = useCmdEnterToSend
      ? (event.metaKey || event.ctrlKey) && !event.shiftKey
      : !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
    if (!shouldSend) return false;

    event.preventDefault();
    if (sending) {
      void onStop?.();
      return true;
    }
    void handleSend();
    return true;
  }, [handleSend, onStop, sending, useCmdEnterToSend]);

  const handleTextChange = useCallback((activeEditor: IEditor) => {
    const lexicalEditor = activeEditor.getLexicalEditor();
    const markdownSource = activeEditor.getDocument('markdown');

    // If markdownSource is already a string, use it directly
    if (typeof markdownSource === 'string') {
      const newMarkdown = fromEditorMarkdown(markdownSource);
      setMarkdown(newMarkdown);
      return;
    }

    // Otherwise, try to use the write method
    if (!lexicalEditor || !markdownSource || typeof markdownSource.write !== 'function') {
      return;
    }
    const newMarkdown = fromEditorMarkdown(String(markdownSource.write(lexicalEditor) ?? ''));
    setMarkdown(newMarkdown);
  }, [setMarkdown]);

  const mentionOptions = useMemo<ISlashOption[]>(() => {
    return mentionItems.map<ISlashOption>((item) => {
      const bareLabel = item.label.replace(/^@+/, '');
      const menuLabel = item.displayLabel ?? bareLabel;
      return {
        description: item.description,
        key: item.id,
        icon: item.icon,
        extra: item.extra,
        label: menuLabel,
        metadata: {
          bareLabel,
          description: item.description,
          id: item.id,
          kind: item.kind,
        },
        // Per-item onSelect runs INSIDE the slash plugin's
        // lexicalEditor.update() block, right after the "@query" text
        // is removed. Dispatching INSERT_MENTION_COMMAND here causes
        // Lexical to queue a nested editor.update(). Crucially, Lexical
        // processes this queue BEFORE committing the outer update (in
        // the same transaction), so the selection is still valid at the
        // position where the query text was just removed.
        onSelect: (activeEditor: IEditor) => {
          activeEditor.dispatchCommand(INSERT_MENTION_COMMAND, {
            label: bareLabel,
            metadata: {
              description: item.description,
              id: item.id,
              kind: item.kind,
            },
          });
          item.onSelect?.();
        },
      };
    });
  }, [mentionItems]);

  const builtinSlashOptions = useMemo<ISlashOption[]>(() => ([
    {
      description: t('input.slash.send.description', { defaultValue: 'Send current message' }),
      key: 'send-message',
      label: t('input.slash.send.label', { defaultValue: 'Send Message' }),
      onSelect: () => {
        if (sending) return;
        void handleSend();
      },
    },
    {
      description: t('input.slash.upload.description', { defaultValue: 'Open file picker' }),
      key: 'upload-files',
      label: t('input.slash.upload.label', { defaultValue: 'Upload Files' }),
      onSelect: () => {
        void pickFiles();
      },
    },
    {
      description: t('input.slash.clear.description', { defaultValue: 'Clear input and attachments' }),
      key: 'clear-input',
      label: t('input.slash.clear.label', { defaultValue: 'Clear Input' }),
      onSelect: () => {
        editor?.clearContent();
        clearAttachments();
      },
    },
  ]), [clearAttachments, editor, handleSend, pickFiles, sending, t]);

  const slashOptions = useMemo<ISlashOption[]>(
    () => [...builtinSlashOptions, ...extraSlashItems],
    [builtinSlashOptions, extraSlashItems],
  );

  const handleEditorInit = useCallback((activeEditor: IEditor) => {
    setEditor(activeEditor);
    setEditorInstance(activeEditor);
  }, [setEditor, setEditorInstance]);

  // Always provide mentionOption with at least one item so the Editor
  // registers MentionPlugin during initialization. Without this, when
  // mentionItems starts empty (async load) the plugin is registered
  // AFTER setRootElement, its onInit never fires, and the
  // INSERT_MENTION_COMMAND handler is never installed.
  // A sentinel item with an empty label won't match any "@" search.
  const MENTION_SENTINEL: ISlashOption = { key: '__mention_sentinel__', label: '' };
  const mentionOptionProp = useMemo(
    () => ({
        fuseOptions: {
          distance: 200,
          keys: ['label', 'description'],
          threshold: 0.4,
        },
        items: mentionOptions.length > 0 ? mentionOptions : [MENTION_SENTINEL],
        trigger: '@',
        maxLength: 200,
        punctuation: ',;:',
        markdownWriter: (node: { label: string }) => `@${node.label}`,
      } as unknown as NonNullable<EditorProps['mentionOption']>),
    [mentionOptions],
  );

  return (
    <Editor
      autoFocus
      content={''}
      editable={!disabled}
      editor={editorInstance}
      lineEmptyPlaceholder={t('input.placeholder', { defaultValue: 'Send a message...' })}
      mentionOption={mentionOptionProp}
      onInit={handleEditorInit}
      onPressEnter={handlePressEnter}
      onTextChange={handleTextChange}
      slashOption={{ items: slashOptions }}
      slashPlacement={slashPlacement}
      type="text"
      variant="chat"
    >
      <MentionTagDecoratorOverride />
    </Editor>
  );
}
