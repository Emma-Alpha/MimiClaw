import type { BrowserWindow } from 'electron';
import type { CodeAgentManager } from '../code-agent/manager';
import type { GatewayManager } from '../gateway/manager';
import type { SkillsCliRunner } from '../gateway/skills-cli';
import type { HostEventBus } from './event-bus';

export interface HostApiContext {
  gatewayManager: GatewayManager;
  codeAgentManager: CodeAgentManager;
  skillsCliRunner: SkillsCliRunner;
  eventBus: HostEventBus;
  mainWindow: BrowserWindow | null;
}
