import type { InspectorStoreState } from './types';

export const initialInspectorState: InspectorStoreState = {
  enabled: false,
  mode: 'off',
  selectedElement: null,
  hoveredElement: null,
  domTree: null,
  domTreeLoading: false,
  elementStyles: null,
  elementStylesLoading: false,
  sidebarVisible: false,
  areaScreenshot: null,
};
