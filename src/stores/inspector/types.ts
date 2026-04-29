import type {
  InspectorElementData,
  DOMTreeNode,
  CSSInspectorData,
  InspectorMode,
  AreaScreenshotResult,
} from '../../../shared/browser-inspector';

export interface InspectorStoreState {
  enabled: boolean;
  mode: InspectorMode;
  selectedElement: InspectorElementData | null;
  hoveredElement: InspectorElementData | null;
  domTree: DOMTreeNode | null;
  domTreeLoading: boolean;
  elementStyles: CSSInspectorData | null;
  elementStylesLoading: boolean;
  sidebarVisible: boolean;
  areaScreenshot: AreaScreenshotResult | null;
}

export interface InspectorStoreAction {
  enable: (webContentsId: number) => Promise<void>;
  disable: () => Promise<void>;
  setMode: (mode: InspectorMode) => Promise<void>;
  selectElement: (element: InspectorElementData) => void;
  hoverElement: (element: InspectorElementData | null) => void;
  fetchDOMTree: () => Promise<void>;
  fetchElementStyles: (selector: string) => Promise<void>;
  highlightElement: (selector: string) => Promise<void>;
  removeHighlight: () => Promise<void>;
  toggleSidebar: () => void;
  setAreaScreenshot: (result: AreaScreenshotResult | null) => void;
  reset: () => void;
}

export type InspectorStore = InspectorStoreState & InspectorStoreAction;
