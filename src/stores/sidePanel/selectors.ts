import type { SidePanelStore } from './types';
import type { DiffFile } from '@/stores/chat/slices/timeline/types';

export type ChangedFileEntry = {
  filePath: string;
  changeType: 'added' | 'modified';
  additions: number;
  deletions: number;
  patch: string;
};

/**
 * Derive changed files from the chat store's timeline items.
 * Call this with `useChatStore(s => s.items)` to get the latest list.
 */
export function deriveChangedFiles(
  items: Array<{ kind: string; files?: DiffFile[] }>,
): ChangedFileEntry[] {
  const fileMap = new Map<string, ChangedFileEntry>();

  for (const item of items) {
    if (item.kind !== 'diff' || !item.files) continue;
    for (const file of item.files) {
      const existing = fileMap.get(file.filePath);
      if (existing) {
        existing.additions += file.additions;
        existing.deletions += file.deletions;
        existing.patch = file.patch;
      } else {
        fileMap.set(file.filePath, {
          filePath: file.filePath,
          changeType: file.deletions === 0 && file.additions > 0 ? 'added' : 'modified',
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch,
        });
      }
    }
  }

  return [...fileMap.values()];
}

export const sidePanelSelectors = {
  activeTab: (state: SidePanelStore) => state.activeTab,
  fileTreeRoots: (state: SidePanelStore) => state.fileTreeRoots,
  fileTreeLoading: (state: SidePanelStore) => state.fileTreeLoading,
  expandedPaths: (state: SidePanelStore) => state.expandedPaths,
  fileTreeSearchQuery: (state: SidePanelStore) => state.fileTreeSearchQuery,
  previewTarget: (state: SidePanelStore) => state.previewTarget,
  previewContent: (state: SidePanelStore) => state.previewContent,
  previewLoading: (state: SidePanelStore) => state.previewLoading,
  hasPreview: (state: SidePanelStore) => state.previewTarget !== null,
};
