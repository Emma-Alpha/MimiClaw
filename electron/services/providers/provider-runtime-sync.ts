// GatewayManager type stub — gateway removed
type GatewayManager = {
  debouncedRestart: () => void;
  debouncedReload: () => void;
};
import type { ProviderConfig } from '../../utils/secure-storage';
import { getProvider } from '../../utils/secure-storage';
import { logger } from '../../utils/logger';

export function getOpenClawProviderKey(type: string, providerId: string): string {
  if (type === 'custom' || type === 'ollama') {
    const suffix = providerId.replace(/-/g, '').slice(0, 8);
    return `${type}-${suffix}`;
  }
  if (type === 'minimax-portal-cn') {
    return 'minimax-portal';
  }
  return type;
}

export function getProviderModelRef(config: ProviderConfig): string | undefined {
  const providerKey = getOpenClawProviderKey(config.type, config.id);

  if (config.model) {
    return config.model.startsWith(`${providerKey}/`)
      ? config.model
      : `${providerKey}/${config.model}`;
  }

  return undefined;
}

export async function getProviderFallbackModelRefs(_config: ProviderConfig): Promise<string[]> {
  return [];
}

type GatewayRefreshMode = 'reload' | 'restart';

function scheduleGatewayRefresh(
  gatewayManager: GatewayManager | undefined,
  message: string,
  options?: { delayMs?: number; onlyIfRunning?: boolean; mode?: GatewayRefreshMode },
): void {
  if (!gatewayManager) {
    return;
  }

  if (options?.onlyIfRunning && gatewayManager.getStatus().state === 'stopped') {
    return;
  }

  logger.info(message);
  if (options?.mode === 'restart') {
    gatewayManager.debouncedRestart(options?.delayMs);
    return;
  }
  gatewayManager.debouncedReload(options?.delayMs);
}

export async function syncProviderApiKeyToRuntime(
  _providerType: string,
  _providerId: string,
  _apiKey: string,
): Promise<void> {
  // No-op: OpenClaw removed
}

export async function syncAllProviderAuthToRuntime(): Promise<void> {
  // No-op: OpenClaw removed
}

export async function syncSavedProviderToRuntime(
  _config: ProviderConfig,
  _apiKey: string | undefined,
  gatewayManager?: GatewayManager,
): Promise<void> {
  scheduleGatewayRefresh(
    gatewayManager,
    'Scheduling Gateway reload after saving provider config',
  );
}

export async function syncUpdatedProviderToRuntime(
  _config: ProviderConfig,
  _apiKey: string | undefined,
  gatewayManager?: GatewayManager,
): Promise<void> {
  scheduleGatewayRefresh(
    gatewayManager,
    'Scheduling Gateway reload after updating provider config',
  );
}

export async function syncDeletedProviderToRuntime(
  provider: ProviderConfig | null,
  providerId: string,
  gatewayManager?: GatewayManager,
  _runtimeProviderKey?: string,
): Promise<void> {
  if (!provider?.type) {
    return;
  }

  scheduleGatewayRefresh(
    gatewayManager,
    `Scheduling Gateway restart after deleting provider "${providerId}"`,
    { mode: 'restart' },
  );
}

export async function syncDeletedProviderApiKeyToRuntime(
  _provider: ProviderConfig | null,
  _providerId: string,
  _runtimeProviderKey?: string,
): Promise<void> {
  // No-op: OpenClaw removed
}

export async function syncDefaultProviderToRuntime(
  providerId: string,
  gatewayManager?: GatewayManager,
): Promise<void> {
  const provider = await getProvider(providerId);
  if (!provider) {
    return;
  }

  scheduleGatewayRefresh(
    gatewayManager,
    `Scheduling Gateway reload after provider switch to "${providerId}"`,
    { onlyIfRunning: true },
  );
}
