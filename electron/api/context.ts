import type { BrowserWindow } from 'electron';
import type { CodeAgentManager } from '../code-agent/manager';
import type { HostEventBus } from './event-bus';

export interface HostApiContext {
  codeAgentManager: CodeAgentManager;
  eventBus: HostEventBus;
  mainWindow: BrowserWindow | null;
}
