import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CodeAgentPermissionMode, CodeAgentRuntimeConfig } from '../../shared/code-agent';
import { getClaudeCodeConfigDir } from '../utils/paths';

const CODE_AGENT_PERMISSION_MODES = new Set<CodeAgentPermissionMode>([
  'acceptEdits',
  'bypassPermissions',
  'default',
  'dontAsk',
  'plan',
  'auto',
]);

export type ClaudeUserSettingsRuntimeConfig = Partial<Pick<
  CodeAgentRuntimeConfig,
  'model' | 'baseUrl' | 'apiKey' | 'permissionMode'
>>;

type ClaudeUserSettingsJson = {
  model?: unknown;
  env?: Record<string, unknown> | null;
  permissions?: {
    defaultMode?: unknown;
  } | null;
};

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readPermissionMode(value: unknown): CodeAgentPermissionMode | undefined {
  return typeof value === 'string' && CODE_AGENT_PERMISSION_MODES.has(value as CodeAgentPermissionMode)
    ? value as CodeAgentPermissionMode
    : undefined;
}

function toRuntimeConfig(settings: ClaudeUserSettingsJson): ClaudeUserSettingsRuntimeConfig {
  const env = settings.env && typeof settings.env === 'object' ? settings.env : null;
  const model = readString(settings.model) || readString(env?.ANTHROPIC_MODEL);
  const baseUrl = readString(env?.ANTHROPIC_BASE_URL);
  const apiKey = readString(env?.ANTHROPIC_API_KEY);
  const permissionMode = readPermissionMode(settings.permissions?.defaultMode);

  return {
    ...(model ? { model } : {}),
    ...(baseUrl ? { baseUrl } : {}),
    ...(apiKey ? { apiKey } : {}),
    ...(permissionMode ? { permissionMode } : {}),
  };
}

export function getClaudeUserSettingsPath(): string {
  return join(getClaudeCodeConfigDir(), 'settings.json');
}

export async function readClaudeUserSettingsRuntimeConfig(): Promise<ClaudeUserSettingsRuntimeConfig> {
  try {
    const raw = await readFile(getClaudeUserSettingsPath(), 'utf8');
    const parsed = JSON.parse(raw) as ClaudeUserSettingsJson;
    return toRuntimeConfig(parsed);
  } catch {
    return {};
  }
}
