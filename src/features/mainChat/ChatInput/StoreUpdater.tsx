import { useEffect } from 'react';
import { useChatStore } from '@/stores/chat';
import { useChatInputContext } from './ChatInputProvider';

export function StoreUpdater() {
  const { editor } = useChatInputContext();
  const setMainInputEditor = useChatStore((s) => s.setMainInputEditor);

  useEffect(() => {
    setMainInputEditor(editor);
  }, [editor, setMainInputEditor]);

  return null;
}
