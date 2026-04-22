import { type IEditor } from '@lobehub/editor';
import { useCallback, useEffect } from 'react';

import { getFileListFromDataTransferItems } from './getFileListFromDataTransferItems';

/**
 * Hook for handling paste file uploads via @lobehub/editor.
 * Listens to editor's onPaste event and extracts files from clipboard.
 *
 * @param editor - The editor instance from @lobehub/editor (IEditor, not the wrapper)
 * @param onUploadFiles - Callback when files are pasted
 */
export const usePasteFile = (
  editor: IEditor | null | undefined,
  onUploadFiles: (files: File[]) => void | Promise<void>,
) => {
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      console.log('[usePasteFile] Paste event triggered!', event);
      if (!event.clipboardData) {
        console.log('[usePasteFile] No clipboard data');
        return;
      }

      const items = Array.from(event.clipboardData.items);
      console.log('[usePasteFile] Clipboard items:', items.map(i => ({ kind: i.kind, type: i.type })));

      const files = await getFileListFromDataTransferItems(items);
      console.log('[usePasteFile] Extracted files:', files);

      if (files.length === 0) return;

      onUploadFiles(files);
    },
    [onUploadFiles],
  );

  useEffect(() => {
    console.log('[usePasteFile] Editor instance:', editor);
    console.log('[usePasteFile] Has editor.on?', editor && typeof editor.on === 'function');

    if (!editor || typeof editor.on !== 'function') {
      console.log('[usePasteFile] Editor not ready or missing .on method');
      return;
    }

    console.log('[usePasteFile] Registering onPaste listener');
    editor.on('onPaste', handlePaste);

    return () => {
      console.log('[usePasteFile] Unregistering onPaste listener');
      if (typeof editor.off === 'function') {
        editor.off('onPaste', handlePaste);
      }
    };
  }, [editor, handlePaste]);
};
