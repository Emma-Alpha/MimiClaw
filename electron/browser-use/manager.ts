import { EventEmitter } from 'node:events';
import { webContents, session } from 'electron';
import { logger } from '../utils/logger';
import { isNavigationAllowed } from './navigation-guard';
import type {
  BrowserUseCommand,
  BrowserUseCommandResult,
  BrowserUseCursorEvent,
  BrowserUseNavigationConfig,
  BrowserUseStatus,
} from '../../shared/browser-use';
import {
  DEFAULT_BROWSER_USE_NAVIGATION_CONFIG,
  DEFAULT_BROWSER_USE_STATUS,
} from '../../shared/browser-use';

const BROWSER_USE_PARTITION = 'persist:browser-use';
const CDP_VERSION = '1.3';
const CDP_COMMAND_TIMEOUT_MS = 15_000;
const PANEL_OPEN_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`CDP command timed out: ${label} (${ms}ms)`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export class BrowserUseManager extends EventEmitter {
  private webContentsId: number | null = null;
  private status: BrowserUseStatus = { ...DEFAULT_BROWSER_USE_STATUS };
  private navigationConfig: BrowserUseNavigationConfig = { ...DEFAULT_BROWSER_USE_NAVIGATION_CONFIG };
  private sessionConfigured = false;

  getStatus(): BrowserUseStatus {
    return { ...this.status };
  }

  setNavigationConfig(config: BrowserUseNavigationConfig): void {
    this.navigationConfig = { ...config };
  }

  getNavigationConfig(): BrowserUseNavigationConfig {
    return { ...this.navigationConfig };
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  attachToWebContents(id: number): void {
    const wc = webContents.fromId(id);
    if (!wc) {
      throw new Error(`webContents with id ${id} not found`);
    }

    // Detach any previous session
    if (this.webContentsId !== null) {
      this.detach();
    }

    this.webContentsId = id;
    this.configureBrowserSession();

    // Attach CDP debugger
    try {
      if (!wc.debugger.isAttached()) {
        wc.debugger.attach(CDP_VERSION);
      }
    } catch (error) {
      logger.error('[browser-use] Failed to attach debugger:', error);
      this.updateStatus({ state: 'error', lastError: `Failed to attach debugger: ${String(error)}` });
      throw error;
    }

    // Listen for debugger detach
    wc.debugger.on('detach', (_event, reason) => {
      logger.info(`[browser-use] Debugger detached: ${reason}`);
      this.webContentsId = null;
      this.updateStatus({ state: 'closed' });
    });

    // Listen for navigation events
    wc.on('did-navigate', (_event, url) => {
      this.updateStatus({
        currentUrl: url,
        title: wc.getTitle(),
        loading: wc.isLoading(),
        canGoBack: wc.canGoBack(),
        canGoForward: wc.canGoForward(),
      });
    });

    wc.on('did-navigate-in-page', (_event, url) => {
      this.updateStatus({
        currentUrl: url,
        canGoBack: wc.canGoBack(),
        canGoForward: wc.canGoForward(),
      });
    });

    wc.on('page-title-updated', (_event, title) => {
      this.updateStatus({ title });
    });

    wc.on('did-start-loading', () => {
      this.updateStatus({ loading: true });
    });

    wc.on('did-stop-loading', () => {
      this.updateStatus({
        loading: false,
        currentUrl: wc.getURL(),
        title: wc.getTitle(),
        canGoBack: wc.canGoBack(),
        canGoForward: wc.canGoForward(),
      });
    });

    wc.on('did-fail-load', (_event, errorCode, errorDescription) => {
      this.updateStatus({
        loading: false,
        lastError: `Load failed (${errorCode}): ${errorDescription}`,
      });
    });

    wc.on('render-process-gone', (_event, details) => {
      logger.error('[browser-use] Render process gone:', details);
      this.cleanupDebugger();
      this.updateStatus({ state: 'error', lastError: `Render process gone: ${details.reason}` });
    });

    wc.on('destroyed', () => {
      logger.info('[browser-use] WebContents destroyed');
      this.webContentsId = null;
      this.updateStatus({ state: 'closed' });
    });

    // Install navigation restriction
    wc.on('will-navigate', (event, url) => {
      if (!isNavigationAllowed(url, this.navigationConfig)) {
        event.preventDefault();
        logger.warn(`[browser-use] Navigation blocked: ${url}`);
        this.emit('error', { message: `Navigation blocked: ${url}` });
      }
    });

    this.updateStatus({
      state: 'open',
      currentUrl: wc.getURL() || 'about:blank',
      title: wc.getTitle(),
      loading: wc.isLoading(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
      lastError: undefined,
    });

    logger.info(`[browser-use] Attached to webContents ${id}`);
    this.emit('attached');
  }

  detach(): void {
    this.cleanupDebugger();
    this.webContentsId = null;
    this.updateStatus({ ...DEFAULT_BROWSER_USE_STATUS });
  }

  private cleanupDebugger(): void {
    if (this.webContentsId === null) return;
    try {
      const wc = webContents.fromId(this.webContentsId);
      if (wc && !wc.isDestroyed() && wc.debugger.isAttached()) {
        wc.debugger.detach();
      }
    } catch (error) {
      logger.warn('[browser-use] Error during debugger cleanup:', error);
    }
  }

  private configureBrowserSession(): void {
    if (this.sessionConfigured) return;
    const ses = session.fromPartition(BROWSER_USE_PARTITION);
    ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    ses.setPermissionCheckHandler(() => false);
    ses.on('will-download', (event) => event.preventDefault());
    this.sessionConfigured = true;
  }

  // ─── CDP Command Execution ─────────────────────────────────────────────────

  async executeCommand(command: BrowserUseCommand): Promise<BrowserUseCommandResult> {
    const { commandId, kind, params } = command;

    try {
      // If no webContents attached, request the renderer to open the browser panel and wait
      if (this.webContentsId === null) {
        this.emit('request-open');
        await this.waitForAttach();
      }

      const wc = this.getWebContents();
      let data: unknown;

      switch (kind) {
        case 'navigate':
          data = await this.cdpNavigate(wc, params.url as string);
          break;
        case 'click':
          data = await this.cdpClick(wc, params.x as number, params.y as number, params.selector as string | undefined);
          break;
        case 'type':
          data = await this.cdpType(wc, params.text as string);
          break;
        case 'scroll':
          data = await this.cdpScroll(wc, params.x as number, params.y as number, params.deltaX as number, params.deltaY as number);
          break;
        case 'screenshot':
          data = await this.cdpScreenshot(wc);
          break;
        case 'read_content':
          data = await this.cdpReadContent(wc);
          break;
        case 'evaluate':
          data = await this.cdpEvaluate(wc, params.expression as string);
          break;
        case 'go_back':
          wc.goBack();
          data = { ok: true };
          break;
        case 'go_forward':
          wc.goForward();
          data = { ok: true };
          break;
        case 'reload':
          wc.reload();
          data = { ok: true };
          break;
        case 'close':
          this.detach();
          data = { ok: true };
          break;
        default:
          throw new Error(`Unknown command kind: ${kind}`);
      }

      return { commandId, success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[browser-use] Command ${kind} failed:`, error);
      return { commandId, success: false, error: message };
    }
  }

  // ─── Individual CDP Commands ───────────────────────────────────────────────

  private async cdpNavigate(wc: Electron.WebContents, url: string): Promise<{ url: string }> {
    if (!isNavigationAllowed(url, this.navigationConfig)) {
      throw new Error(`Navigation not allowed: ${url}`);
    }
    await this.sendCdpCommand(wc, 'Page.navigate', { url });
    return { url };
  }

  private async cdpClick(
    wc: Electron.WebContents,
    x: number,
    y: number,
    selector?: string,
  ): Promise<{ x: number; y: number }> {
    let targetX = x;
    let targetY = y;

    // If selector provided, find element center
    if (selector) {
      const result = await this.sendCdpCommand(wc, 'Runtime.evaluate', {
        expression: `(function() {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        })()`,
        returnByValue: true,
      });
      if (result.result?.value) {
        targetX = result.result.value.x;
        targetY = result.result.value.y;
      }
    }

    // Emit cursor event
    this.emitCursor(targetX, targetY, 'click');

    // Mouse sequence: move → press → release
    await this.sendCdpCommand(wc, 'Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: targetX, y: targetY,
    });
    await this.sendCdpCommand(wc, 'Input.dispatchMouseEvent', {
      type: 'mousePressed', x: targetX, y: targetY, button: 'left', clickCount: 1,
    });
    await this.sendCdpCommand(wc, 'Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: targetX, y: targetY, button: 'left', clickCount: 1,
    });

    return { x: targetX, y: targetY };
  }

  private async cdpType(wc: Electron.WebContents, text: string): Promise<{ text: string }> {
    await this.sendCdpCommand(wc, 'Input.insertText', { text });
    return { text };
  }

  private async cdpScroll(
    wc: Electron.WebContents,
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
  ): Promise<{ deltaX: number; deltaY: number }> {
    this.emitCursor(x, y, 'scroll');
    await this.sendCdpCommand(wc, 'Input.dispatchMouseEvent', {
      type: 'mouseWheel', x, y, deltaX, deltaY,
    });
    return { deltaX, deltaY };
  }

  private async cdpScreenshot(wc: Electron.WebContents): Promise<{ base64: string; width: number; height: number }> {
    const result = await this.sendCdpCommand(wc, 'Page.captureScreenshot', {
      format: 'png',
    });
    // Get viewport size
    const layoutMetrics = await this.sendCdpCommand(wc, 'Page.getLayoutMetrics', {});
    return {
      base64: result.data as string,
      width: layoutMetrics.cssVisualViewport?.clientWidth ?? 0,
      height: layoutMetrics.cssVisualViewport?.clientHeight ?? 0,
    };
  }

  private async cdpReadContent(wc: Electron.WebContents): Promise<{ text: string; title: string; url: string }> {
    const result = await this.sendCdpCommand(wc, 'Runtime.evaluate', {
      expression: 'document.body.innerText',
      returnByValue: true,
    });
    return {
      text: result.result?.value ?? '',
      title: wc.getTitle(),
      url: wc.getURL(),
    };
  }

  private async cdpEvaluate(wc: Electron.WebContents, expression: string): Promise<{ result: unknown }> {
    const response = await this.sendCdpCommand(wc, 'Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (response.exceptionDetails) {
      throw new Error(`Evaluation error: ${response.exceptionDetails.text || 'Unknown error'}`);
    }
    return { result: response.result?.value };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private waitForAttach(): Promise<void> {
    if (this.webContentsId !== null) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener('attached', onAttach);
        reject(new Error('Timed out waiting for browser panel to open'));
      }, PANEL_OPEN_TIMEOUT_MS);

      const onAttach = () => {
        clearTimeout(timer);
        resolve();
      };

      this.once('attached', onAttach);
    });
  }

  private getWebContents(): Electron.WebContents {
    if (this.webContentsId === null) {
      throw new Error('No webContents attached. Call attachToWebContents first.');
    }
    const wc = webContents.fromId(this.webContentsId);
    if (!wc || wc.isDestroyed()) {
      this.webContentsId = null;
      this.updateStatus({ state: 'closed' });
      throw new Error('WebContents is destroyed');
    }
    return wc;
  }

   
  private async sendCdpCommand(
    wc: Electron.WebContents,
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<any> {
    if (!wc.debugger.isAttached()) {
      throw new Error('Debugger is not attached');
    }
    const result = await withTimeout(
      wc.debugger.sendCommand(method, params),
      CDP_COMMAND_TIMEOUT_MS,
      method,
    );
    return result;
  }

  private updateStatus(partial: Partial<BrowserUseStatus>): void {
    this.status = { ...this.status, ...partial };
    this.emit('status', this.getStatus());
  }

  private emitCursor(x: number, y: number, action: BrowserUseCursorEvent['action']): void {
    const event: BrowserUseCursorEvent = { x, y, action, timestamp: Date.now() };
    this.emit('cursor', event);
  }
}

/** Module-level singleton */
export const browserUseManager = new BrowserUseManager();
