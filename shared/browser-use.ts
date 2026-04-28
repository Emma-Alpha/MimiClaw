// ─── Lifecycle ────────────────────────────────────────────────────────────────

export type BrowserUseLifecycleState = 'closed' | 'opening' | 'open' | 'error';

// ─── Commands ────────────────────────────────────────────────────────────────

export type BrowserUseCommandKind =
  | 'navigate'
  | 'click'
  | 'type'
  | 'scroll'
  | 'screenshot'
  | 'read_content'
  | 'evaluate'
  | 'go_back'
  | 'go_forward'
  | 'reload'
  | 'close';

export interface BrowserUseCommand {
  commandId: string;
  kind: BrowserUseCommandKind;
  params: Record<string, unknown>;
}

export interface BrowserUseCommandResult {
  commandId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ─── Status ──────────────────────────────────────────────────────────────────

export interface BrowserUseStatus {
  state: BrowserUseLifecycleState;
  currentUrl: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  lastError?: string;
}

export const DEFAULT_BROWSER_USE_STATUS: BrowserUseStatus = {
  state: 'closed',
  currentUrl: '',
  title: '',
  loading: false,
  canGoBack: false,
  canGoForward: false,
};

// ─── Cursor overlay ──────────────────────────────────────────────────────────

export interface BrowserUseCursorEvent {
  x: number;
  y: number;
  action: 'move' | 'click' | 'scroll';
  timestamp: number;
}

// ─── Navigation config ──────────────────────────────────────────────────────

export type BrowserUseNavigationMode = 'localhost-only' | 'allowlist' | 'unrestricted';

export interface BrowserUseNavigationConfig {
  mode: BrowserUseNavigationMode;
  allowedOrigins: string[];
}

export const DEFAULT_BROWSER_USE_NAVIGATION_CONFIG: BrowserUseNavigationConfig = {
  mode: 'localhost-only',
  allowedOrigins: [],
};
