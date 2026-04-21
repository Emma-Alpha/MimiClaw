import { toast } from 'sonner';
import type { ActionHandlerContext } from '../context';

export function handleSearchAction({ editor, searchEnabled, setSearchEnabled }: ActionHandlerContext) {
  const next = !searchEnabled;
  setSearchEnabled(next);
  toast.success(next ? 'Search enabled for this turn' : 'Search disabled for this turn');
  if (next && !(editor?.getMarkdownContent().includes('#search'))) {
    editor?.insertTextAtCursor('\n#search ');
  }
}
