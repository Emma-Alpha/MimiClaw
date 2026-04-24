import { Search } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useProviderStore, aiModelSelectors } from '@/stores/providers';
import { useChatInputContext } from '../../ChatInputProvider';
import { chatInputStoreSelectors, useChatInputStore } from '../../store';
import { ActionWrapper } from './ActionWrapper';

export function SearchAction() {
  const { editor } = useChatInputContext();
  const defaultAccountId = useProviderStore((s) => s.defaultAccountId);
  const supportsSearch = useProviderStore(aiModelSelectors.supportsSearch(defaultAccountId || ''));
  const searchEnabled = useChatInputStore(chatInputStoreSelectors.searchEnabled);
  const setSearchEnabled = useChatInputStore((s) => s.setSearchEnabled);

  const handleClick = useCallback(() => {
    const next = !searchEnabled;
    setSearchEnabled(next);
    toast.success(next ? 'Search enabled for this turn' : 'Search disabled for this turn');
    if (next && !editor?.getMarkdownContent().includes('#search')) {
      editor?.insertTextAtCursor('\n#search ');
    }
  }, [editor, searchEnabled, setSearchEnabled]);

  return (
    <ActionWrapper
      active={searchEnabled}
      disabled={!supportsSearch}
      icon={Search}
      onClick={handleClick}
      title="Search"
    />
  );
}
