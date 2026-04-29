import { fetchDirectoryChildren } from '@/lib/code-agent';
import { hostApiFetch } from '@/lib/host-api';
import type { StoreGetter, StoreSetter } from '@/stores/types';
import type { FileTreeNodeData, SidePanelStore, SidePanelAction } from './types';

type Setter = StoreSetter<SidePanelStore>;
type Getter = StoreGetter<SidePanelStore>;

const TAB_STORAGE_KEY = 'mimiclaw:side-panel-active-tab';

function entriesToTreeNodes(
  entries: { absolutePath: string; relativePath: string; name: string; isDirectory: boolean }[],
): FileTreeNodeData[] {
  return entries.map((e) => ({
    absolutePath: e.absolutePath,
    relativePath: e.relativePath,
    name: e.name,
    isDirectory: e.isDirectory,
    children: e.isDirectory ? [] : undefined,
    loaded: !e.isDirectory,
  }));
}

function insertChildrenAtPath(
  roots: FileTreeNodeData[],
  targetAbsPath: string,
  children: FileTreeNodeData[],
): FileTreeNodeData[] {
  return roots.map((node) => {
    if (node.absolutePath === targetAbsPath) {
      return { ...node, children, loaded: true };
    }
    if (node.children && node.children.length > 0) {
      return { ...node, children: insertChildrenAtPath(node.children, targetAbsPath, children) };
    }
    return node;
  });
}

export class SidePanelActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  setActiveTab = (tab: SidePanelStore['activeTab']) => {
    this.#set({ activeTab: tab });
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch { /* ignore */ }
  };

  loadFileTreeRoot = async (workspaceRoot: string) => {
    if (!workspaceRoot) return;
    this.#set({ fileTreeLoading: true });
    try {
      const entries = await fetchDirectoryChildren(workspaceRoot, '');
      const roots = entriesToTreeNodes(entries);
      this.#set({ fileTreeRoots: roots, fileTreeLoading: false });
    } catch {
      this.#set({ fileTreeLoading: false });
    }
  };

  loadDirectoryChildren = async (
    workspaceRoot: string,
    dirRelativePath: string,
    absolutePath: string,
  ) => {
    if (!workspaceRoot) return;
    try {
      const entries = await fetchDirectoryChildren(workspaceRoot, dirRelativePath);
      const children = entriesToTreeNodes(entries);
      const { fileTreeRoots } = this.#get();
      this.#set({
        fileTreeRoots: insertChildrenAtPath(fileTreeRoots, absolutePath, children),
      });
    } catch {
      // silently ignore load failure
    }
  };

  toggleExpanded = (absolutePath: string) => {
    const { expandedPaths } = this.#get();
    const isExpanded = expandedPaths.includes(absolutePath);
    this.#set({
      expandedPaths: isExpanded
        ? expandedPaths.filter((p) => p !== absolutePath)
        : [...expandedPaths, absolutePath],
    });
  };

  setFileTreeSearchQuery = (query: string) => {
    this.#set({ fileTreeSearchQuery: query });
  };

  setPreviewTarget = (target: SidePanelStore['previewTarget']) => {
    this.#set({ previewTarget: target, previewContent: null, previewLoading: false });
  };

  loadPreviewContent = async (absolutePath: string) => {
    this.#set({ previewLoading: true, previewContent: null });
    try {
      const result = await hostApiFetch<{ content: string; truncated: boolean }>(
        `/api/files/read-text?path=${encodeURIComponent(absolutePath)}`,
      );
      this.#set({ previewContent: result.content, previewLoading: false });
    } catch {
      this.#set({ previewContent: null, previewLoading: false });
    }
  };

  clearPreview = () => {
    this.#set({ previewTarget: null, previewContent: null, previewLoading: false });
  };

  reset = () => {
    this.#set({
      fileTreeRoots: [],
      expandedPaths: [],
      fileTreeLoading: false,
      fileTreeSearchQuery: '',
      previewTarget: null,
      previewContent: null,
      previewLoading: false,
    });
  };
}

export const createSidePanelSlice = (set: Setter, get: Getter, api?: unknown): SidePanelAction =>
  new SidePanelActionImpl(set, get, api);
