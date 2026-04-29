export type SidePanelTab = 'files' | 'changes' | 'browser' | 'preview';

export type FileTreeNodeData = {
  absolutePath: string;
  relativePath: string;
  name: string;
  isDirectory: boolean;
  children?: FileTreeNodeData[];
  loaded?: boolean;
};

export type PreviewTarget = {
  absolutePath: string;
  relativePath: string;
  mimeType: string;
  /** When set, show diff patch instead of file content */
  diffPatch?: string;
} | null;

export interface SidePanelState {
  activeTab: SidePanelTab;
  fileTreeRoots: FileTreeNodeData[];
  expandedPaths: string[];
  fileTreeLoading: boolean;
  fileTreeSearchQuery: string;
  previewTarget: PreviewTarget;
  previewContent: string | null;
  previewLoading: boolean;
}

export interface SidePanelAction {
  setActiveTab: (tab: SidePanelTab) => void;
  loadFileTreeRoot: (workspaceRoot: string) => Promise<void>;
  loadDirectoryChildren: (workspaceRoot: string, dirRelativePath: string, absolutePath: string) => Promise<void>;
  toggleExpanded: (absolutePath: string) => void;
  setFileTreeSearchQuery: (query: string) => void;
  setPreviewTarget: (target: PreviewTarget) => void;
  loadPreviewContent: (absolutePath: string) => Promise<void>;
  clearPreview: () => void;
  reset: () => void;
}

export type SidePanelStore = SidePanelState & SidePanelAction;
