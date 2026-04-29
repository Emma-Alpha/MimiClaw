// ─── Inspector Mode ──────────────────────────────────────────────────────────

export type InspectorMode = 'off' | 'picker' | 'area-screenshot';

// ─── Element Data ────────────────────────────────────────────────────────────

export interface InspectorElementData {
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  boundingRect: { x: number; y: number; width: number; height: number };
  cssSelector: string;
  attributes: Record<string, string>;
}

// ─── DOM Tree ────────────────────────────────────────────────────────────────

export interface DOMTreeNode {
  nodeId: number;
  tagName: string;
  id: string;
  className: string;
  children: DOMTreeNode[];
  childCount: number;
  depth: number;
  cssSelector: string;
}

// ─── CSS Inspector ──────────────────────────────────────────────────────────

export interface CSSInspectorProperty {
  name: string;
  value: string;
}

export interface CSSInspectorGroup {
  label: string;
  properties: CSSInspectorProperty[];
}

export interface BoxModel {
  margin: [number, number, number, number];
  border: [number, number, number, number];
  padding: [number, number, number, number];
  content: { width: number; height: number };
}

export interface CSSInspectorData {
  selector: string;
  groups: CSSInspectorGroup[];
  boxModel: BoxModel;
}

// ─── Area Screenshot ─────────────────────────────────────────────────────────

export interface AreaScreenshotResult {
  base64: string;
  region: { x: number; y: number; width: number; height: number };
}

// ─── Binding Payloads (injected script → main process) ──────────────────────

export type InspectorBindingPayload =
  | { type: 'element-hovered'; data: InspectorElementData }
  | { type: 'element-selected'; data: InspectorElementData }
  | { type: 'area-selected'; data: { x: number; y: number; width: number; height: number } }
  | { type: 'picker-cancelled' };
