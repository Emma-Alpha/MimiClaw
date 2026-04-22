import { INSERT_MENTION_COMMAND, type IEditor, type ISlashOption } from '@lobehub/editor';
import { Editor, type EditorProps, useEditor } from '@lobehub/editor/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { preferenceSelectors, useSettingsStore } from '@/stores/settings';
import { usePasteFile, useUploadFiles } from '@/components/DragUploadZone';
import { useChatInputContext } from '../ChatInputProvider';
import { fromEditorMarkdown } from '../hooks/useChatInputEditor';
import { useChatInputStore } from '../store';
import type { MentionItem } from '../types';
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

  // Client-side item lookup so the top-level `onSelect` (which receives an
  // `ISlashMenuOption` and not our original `MentionItem`) can recover the
  // callback + inserted label when the user confirms a pick.
  const mentionItemLookupRef = useRef(new Map<string, MentionItem>());

  const mentionOptions = useMemo<ISlashOption[]>(() => {
    const lookup = new Map<string, MentionItem>();
    const options = mentionItems.map<ISlashOption>((item) => {
      lookup.set(item.id, item);
      // The `Mention` decorator already prepends "@" when rendering the pill
      // (see @lobehub/editor/es/plugins/mention/react/components/Mention.js —
      // `children: ["@", node.label]`). So the stored label must NOT include
      // a leading "@", otherwise users see "@@src/App.tsx" in the tag.
      const bareLabel = item.label.replace(/^@+/, '');
      // Menu row label: use `displayLabel` (short name) when provided so the
      // row shows "App.tsx" instead of the full "src/App.tsx" mention text.
      // Must remain a plain string for fuse.js client-side filtering.
      const menuLabel = item.displayLabel ?? bareLabel;
      return {
        description: item.description,
        key: item.id,
        icon: item.icon,
        extra: item.extra,
        label: menuLabel,
        // Stash the inserted label + id so the unified top-level onSelect
        // below can build the correct INSERT_MENTION_COMMAND payload. The
        // `kind` flows through into the inserted MentionNode so the custom
        // decorator can render folder vs. file icons.
        metadata: {
          bareLabel,
          description: item.description,
          id: item.id,
          kind: item.kind,
        },
      };
    });
    mentionItemLookupRef.current = lookup;
    return options;
  }, [mentionItems]);

  // Top-level mention onSelect. Unlike per-item `option.onSelect` (which runs
  // INSIDE the slash plugin's `lexicalEditor.update` block and only fires
  // when `resolution` is still valid), this unified handler runs AFTER the
  // query text has been removed and the update has committed — matching how
  // lobe-chat dispatches `INSERT_MENTION_COMMAND`. That avoids cases where the
  // pill never appears because the nested update was torn down by a state
  // change during the same tick.
  const handleMentionSelect = useCallback(
    (activeEditor: IEditor, option: { metadata?: Record<string, unknown> }) => {
      const metadata = (option.metadata ?? {}) as {
        bareLabel?: string;
        description?: string;
        id?: string;
        kind?: string;
      };
      const id = metadata.id;
      const bareLabel = metadata.bareLabel;
      if (!bareLabel) return;
      activeEditor.dispatchCommand(INSERT_MENTION_COMMAND, {
        label: bareLabel,
        metadata: {
          description: metadata.description,
          id,
          kind: metadata.kind,
        },
      });
      const original = id ? mentionItemLookupRef.current.get(id) : undefined;
      original?.onSelect?.();
    },
    [],
  );

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

  const mentionOptionProp = useMemo(
    () => (mentionOptions.length > 0
      // Cast is required because @lobehub/editor exposes `punctuation` and
      // `maxLength` at runtime (via its slash service) but does not declare
      // them on the public `MentionOption` type.
      ? ({
          fuseOptions: {
            distance: 200,
            keys: ['label', 'description'],
            threshold: 0.4,
          },
          items: mentionOptions,
          trigger: '@',
          // Default maxLength is 8, which truncates long paths like
          // "@src/features/foo.tsx" and prematurely closes the dropdown.
          maxLength: 200,
          // Default PUNCTUATION excludes "/", ".", "-", "_" from valid
          // trigger chars, so typing "@src/" instantly breaks the match
          // and hides the menu. Shrink it so filename-like characters stay
          // valid and users can drill into folders as they would in Cursor.
          punctuation: ',;:',
          // Top-level onSelect dispatches INSERT_MENTION_COMMAND AFTER the
          // slash plugin commits its "remove @query text" update. Without
          // this, the mention pill often fails to appear because the nested
          // dispatchCommand inside per-item onSelect gets swallowed when the
          // options array is re-registered on the same tick.
          onSelect: handleMentionSelect,
          // Serialize mentions back to markdown as "@label" so the resulting
          // chat message still references the item in a recognizable form.
          markdownWriter: (node: { label: string }) => `@${node.label}`,
        } as unknown as NonNullable<EditorProps['mentionOption']>)
      : undefined),
    [mentionOptions, handleMentionSelect],
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
