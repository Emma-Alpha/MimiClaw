import { INSERT_MENTION_COMMAND, type IEditor, type ISlashOption } from '@lobehub/editor';
import { Editor, type EditorProps, useEditor } from '@lobehub/editor/react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { preferenceSelectors, useSettingsStore } from '@/stores/settings';
import { usePasteFile, useUploadFiles } from '@/components/DragUploadZone';
import { useChatInputContext } from '../ChatInputProvider';
import { fromEditorMarkdown, toEditorMarkdown } from '../hooks/useChatInputEditor';
import { useChatInputStore } from '../store';

type PressEnterPayload = Parameters<NonNullable<EditorProps['onPressEnter']>>[0];

export function InputEditor() {
  const { t } = useTranslation('chatInput');
  const {
    attachments,
    clearAttachments,
    disabled,
    editor,
    extraSlashItems = [],
    markdown,
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
    if (!lexicalEditor || !markdownSource) {
      setMarkdown('');
      return;
    }
    setMarkdown(fromEditorMarkdown(String(markdownSource.write(lexicalEditor) ?? '')));
  }, [setMarkdown]);

  const mentionOptions = useMemo<ISlashOption[]>(() => mentionItems.map((item) => {
    const label = item.label.startsWith('@') ? item.label : `@${item.label}`;
    return {
      description: item.description,
      key: item.id,
      label,
      onSelect: (activeEditor: IEditor) => {
        activeEditor.dispatchCommand(INSERT_MENTION_COMMAND, {
          metadata: {
            description: item.description,
            id: item.id,
          },
          label,
        });
        item.onSelect?.();
      },
    };
  }), [mentionItems]);

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
    if (markdown.trim().length === 0) return;
    activeEditor.setDocument('markdown', toEditorMarkdown(markdown));
  }, [markdown, setEditor, setEditorInstance]);

  return (
    <Editor
      autoFocus
      content={''}
      editable={!disabled}
      editor={editorInstance}
      lineEmptyPlaceholder={t('input.placeholder', { defaultValue: 'Send a message...' })}
      mentionOption={mentionOptions.length > 0 ? { items: mentionOptions } : undefined}
      onInit={handleEditorInit}
      onPressEnter={handlePressEnter}
      onTextChange={handleTextChange}
      slashOption={{ items: slashOptions }}
      slashPlacement={slashPlacement}
      type="text"
      variant="chat"
    />
  );
}
