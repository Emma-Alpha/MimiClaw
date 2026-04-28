// Stub — OpenClaw auth removed
export async function getActiveOpenClawProviders(): Promise<Map<string, unknown>> { return new Map(); }
export async function getOpenClawProvidersConfig(): Promise<Record<string, unknown>> { return {}; }
export async function saveProviderKeyToOpenClaw(_type: string, _key: string): Promise<void> {}
export async function removeProviderFromOpenClaw(_type: string): Promise<void> {}
export async function saveOAuthTokenToOpenClaw(_type: string, _token: string): Promise<void> {}
export async function setOpenClawDefaultModel(_provider: string, _model?: string, _fallbacks?: string[]): Promise<void> {}
export async function setOpenClawDefaultModelWithOverride(_provider: string, _model?: string, _options?: Record<string, unknown>, _fallbacks?: string[]): Promise<void> {}
export async function syncProviderConfigToOpenClaw(_provider: string, _model?: string, _options?: Record<string, unknown>): Promise<void> {}
export async function updateAgentModelProvider(_provider: string, _config?: Record<string, unknown>): Promise<void> {}
