import type { StoreApi } from 'zustand';
import { invokeIpc } from '@/lib/api-client';
import type {
  InspectorElementData,
  InspectorMode,
  AreaScreenshotResult,
  DOMTreeNode,
  CSSInspectorData,
} from '../../../shared/browser-inspector';
import { initialInspectorState } from './initialState';
import type { InspectorStore, InspectorStoreAction } from './types';

type Set = StoreApi<InspectorStore>['setState'];
type Get = () => InspectorStore;

export function createInspectorActions(set: Set, get: Get): InspectorStoreAction {
  return {
    enable: async (webContentsId: number) => {
      const result = await invokeIpc<{ success: boolean }>('inspector:enable', webContentsId);
      if (result.success) {
        set({ enabled: true });
      }
    },

    disable: async () => {
      try {
        await invokeIpc('inspector:disable');
      } catch {
        // Ignore errors during cleanup
      }
      set({ ...initialInspectorState });
    },

    setMode: async (mode: InspectorMode) => {
      await invokeIpc('inspector:set-mode', mode);
      set({ mode });
    },

    selectElement: (element: InspectorElementData) => {
      set({ selectedElement: element });

      // Auto-open sidebar and refresh DOM tree when element is picked
      const { sidebarVisible, enabled } = get();
      if (!sidebarVisible) {
        set({ sidebarVisible: true });
      }
      if (enabled) {
        void get().fetchDOMTree();
      }

      // Auto-fetch CSS styles for the selected element
      void get().fetchElementStyles(element.cssSelector);
    },

    hoverElement: (element: InspectorElementData | null) => {
      set({ hoveredElement: element });
    },

    fetchDOMTree: async () => {
      set({ domTreeLoading: true });
      try {
        const result = await invokeIpc<{ success: boolean; data: DOMTreeNode }>('inspector:get-dom-tree');
        if (result.success) {
          set({ domTree: result.data });
        }
      } finally {
        set({ domTreeLoading: false });
      }
    },

    fetchElementStyles: async (selector: string) => {
      set({ elementStylesLoading: true });
      try {
        const result = await invokeIpc<{ success: boolean; data: CSSInspectorData }>('inspector:get-element-styles', selector);
        if (result.success) {
          set({ elementStyles: result.data });
        }
      } finally {
        set({ elementStylesLoading: false });
      }
    },

    highlightElement: async (selector: string) => {
      await invokeIpc('inspector:highlight-element', selector);
    },

    removeHighlight: async () => {
      await invokeIpc('inspector:remove-highlight');
    },

    toggleSidebar: () => {
      const { sidebarVisible, enabled } = get();
      const nextVisible = !sidebarVisible;
      set({ sidebarVisible: nextVisible });
      // Auto-fetch DOM tree when sidebar opens
      if (nextVisible && enabled) {
        void get().fetchDOMTree();
      }
    },

    setAreaScreenshot: (result: AreaScreenshotResult | null) => {
      set({ areaScreenshot: result });
    },

    reset: () => {
      set({ ...initialInspectorState });
    },
  };
}
