import { EventEmitter } from 'node:events';
import { webContents } from 'electron';
import { logger } from '../utils/logger';
import type {
  InspectorMode,
  InspectorBindingPayload,
  DOMTreeNode,
  CSSInspectorData,
  AreaScreenshotResult,
} from '../../shared/browser-inspector';
import {
  getPickerScript,
  getPickerCleanupScript,
  getHighlightScript,
  getRemoveHighlightScript,
  getDOMTreeScript,
  getComputedStylesScript,
  getAreaScreenshotScript,
  getAreaScreenshotCleanupScript,
} from './inspector-scripts';

const BINDING_NAME = '__mimiInspector';
const CDP_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Inspector CDP timed out: ${label} (${ms}ms)`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export class InspectorManager extends EventEmitter {
  private webContentsId: number | null = null;
  private mode: InspectorMode = 'off';
  private navigationListener: (() => void) | null = null;

  getMode(): InspectorMode {
    return this.mode;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async attach(wcId: number): Promise<void> {
    const wc = webContents.fromId(wcId);
    if (!wc) {
      throw new Error(`webContents with id ${wcId} not found`);
    }

    if (this.webContentsId !== null) {
      this.detach();
    }

    this.webContentsId = wcId;

    // Install CDP binding for page → main communication
    await this.installBinding(wc);

    // Listen for navigation to re-inject binding
    const onNavigation = () => {
      // Re-install binding after page navigates
      void this.reinstallAfterNavigation();
    };

    wc.on('did-stop-loading', onNavigation);
    this.navigationListener = () => {
      wc.removeListener('did-stop-loading', onNavigation);
    };

    logger.info(`[inspector] Attached to webContents ${wcId}`);
  }

  detach(): void {
    if (this.navigationListener) {
      this.navigationListener();
      this.navigationListener = null;
    }

    if (this.mode !== 'off') {
      void this.setMode('off').catch(() => {});
    }

    this.webContentsId = null;
    this.bindingInstalled = false;
    this.mode = 'off';
    logger.info('[inspector] Detached');
  }

  // ─── Mode Control ──────────────────────────────────────────────────────────

  async setMode(newMode: InspectorMode): Promise<void> {
    const wc = this.getWebContents();

    // Clean up previous mode
    if (this.mode === 'picker') {
      await this.evaluate(wc, getPickerCleanupScript());
    } else if (this.mode === 'area-screenshot') {
      await this.evaluate(wc, getAreaScreenshotCleanupScript());
    }

    // Activate new mode
    if (newMode === 'picker') {
      await this.evaluate(wc, getPickerScript());
    } else if (newMode === 'area-screenshot') {
      await this.evaluate(wc, getAreaScreenshotScript());
    }

    this.mode = newMode;
    this.emit('mode-changed', newMode);
  }

  // ─── Element Highlight ────────────────────────────────────────────────────

  async highlightElement(selector: string): Promise<void> {
    const wc = this.getWebContents();
    await this.evaluate(wc, getHighlightScript(selector));
  }

  async removeHighlight(): Promise<void> {
    const wc = this.getWebContents();
    await this.evaluate(wc, getRemoveHighlightScript());
  }

  // ─── DOM Tree ─────────────────────────────────────────────────────────────

  async getDOMTree(maxDepth: number = 6): Promise<DOMTreeNode | null> {
    const wc = this.getWebContents();
    const result = await this.evaluateWithReturn(wc, getDOMTreeScript(maxDepth));
    return (result as DOMTreeNode) || null;
  }

  // ─── CSS Inspector ────────────────────────────────────────────────────────

  async getElementStyles(selector: string): Promise<CSSInspectorData | null> {
    const wc = this.getWebContents();
    const result = await this.evaluateWithReturn(wc, getComputedStylesScript(selector));
    return (result as CSSInspectorData) || null;
  }

  // ─── Area Screenshot ─────────────────────────────────────────────────────

  async captureArea(clip: { x: number; y: number; width: number; height: number }): Promise<AreaScreenshotResult> {
    const wc = this.getWebContents();

    // Get device pixel ratio for correct clipping
    const dprResult = await this.evaluateWithReturn(wc, 'window.devicePixelRatio');
    const dpr = (dprResult as number) || 1;

    const result = await this.sendCdpCommand(wc, 'Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: clip.x,
        y: clip.y,
        width: clip.width,
        height: clip.height,
        scale: dpr,
      },
    });

    return {
      base64: result.data as string,
      region: clip,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async installBinding(wc: Electron.WebContents): Promise<void> {
    if (!wc.debugger.isAttached()) {
      throw new Error('Debugger is not attached — BrowserUseManager must attach first');
    }

    try {
      await this.sendCdpCommand(wc, 'Runtime.addBinding', { name: BINDING_NAME });
      // binding installed
    } catch (error) {
      // Binding may already exist — tolerate the error
      if (String(error).includes('already exists')) {
        // binding installed
      } else {
        throw error;
      }
    }

    // Listen for binding calls from injected scripts
    wc.debugger.on('message', (_event: Electron.Event, method: string, params: Record<string, unknown>) => {
      if (method === 'Runtime.bindingCalled' && params.name === BINDING_NAME) {
        this.handleBindingCall(params.payload as string);
      }
    });

    // Enable Runtime domain to receive binding events
    try {
      await this.sendCdpCommand(wc, 'Runtime.enable', {});
    } catch {
      // May already be enabled
    }
  }

  private async reinstallAfterNavigation(): Promise<void> {
    if (this.webContentsId === null) return;

    try {
      const wc = this.getWebContents();
      await this.installBinding(wc);

      // Re-activate current mode
      if (this.mode === 'picker') {
        await this.evaluate(wc, getPickerScript());
      } else if (this.mode === 'area-screenshot') {
        await this.evaluate(wc, getAreaScreenshotScript());
      }
    } catch (error) {
      logger.warn('[inspector] Failed to reinstall after navigation:', error);
    }
  }

  private handleBindingCall(payloadStr: string): void {
    try {
      const payload = JSON.parse(payloadStr) as InspectorBindingPayload;

      switch (payload.type) {
        case 'element-hovered':
          this.emit('element-hovered', payload.data);
          break;
        case 'element-selected':
          this.emit('element-selected', payload.data);
          break;
        case 'area-selected':
          // Capture the screenshot, then emit the result
          void this.captureArea(payload.data).then((result) => {
            this.emit('area-screenshot', result);
          }).catch((err) => {
            logger.error('[inspector] Area capture failed:', err);
          });
          // Reset mode after area selection
          this.mode = 'off';
          this.emit('mode-changed', 'off');
          break;
        case 'picker-cancelled':
          this.mode = 'off';
          this.emit('mode-changed', 'off');
          break;
      }
    } catch (error) {
      logger.error('[inspector] Failed to parse binding payload:', error);
    }
  }

  private getWebContents(): Electron.WebContents {
    if (this.webContentsId === null) {
      throw new Error('Inspector not attached');
    }
    const wc = webContents.fromId(this.webContentsId);
    if (!wc || wc.isDestroyed()) {
      this.webContentsId = null;
      throw new Error('WebContents is destroyed');
    }
    return wc;
  }

  private async sendCdpCommand(
    wc: Electron.WebContents,
    method: string,
    params: Record<string, unknown> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    if (!wc.debugger.isAttached()) {
      throw new Error('Debugger is not attached');
    }
    return withTimeout(
      wc.debugger.sendCommand(method, params),
      CDP_TIMEOUT_MS,
      method,
    );
  }

  private async evaluate(wc: Electron.WebContents, expression: string): Promise<void> {
    await this.sendCdpCommand(wc, 'Runtime.evaluate', {
      expression,
      returnByValue: false,
    });
  }

  private async evaluateWithReturn(wc: Electron.WebContents, expression: string): Promise<unknown> {
    const response = await this.sendCdpCommand(wc, 'Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: false,
    });
    if (response.exceptionDetails) {
      throw new Error(`Evaluation error: ${response.exceptionDetails.text || 'Unknown'}`);
    }
    return response.result?.value;
  }
}

/** Module-level singleton */
export const inspectorManager = new InspectorManager();
