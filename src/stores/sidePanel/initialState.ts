import type { SidePanelState } from './types';

const STORAGE_KEY = 'mimiclaw:side-panel-active-tab';

function loadPersistedTab(): SidePanelState['activeTab'] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'files' || saved === 'changes' || saved === 'browser' || saved === 'preview') {
      return saved;
    }
  } catch { /* ignore */ }
  return 'files';
}

export const initialSidePanelState: SidePanelState = {
  activeTab: loadPersistedTab(),
  fileTreeRoots: [],
  expandedPaths: [],
  fileTreeLoading: false,
  fileTreeSearchQuery: '',
  previewTarget: null,
  previewContent: null,
  previewLoading: false,
};
