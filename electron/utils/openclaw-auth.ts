// Stub — OpenClaw auth removed
export async function getActiveOpenClawProviders(): Promise<Map<string, unknown>> { return new Map(); }
export async function getOpenClawProvidersConfig(): Promise<Record<string, unknown>> { return {}; }
export async function saveProviderKeyToOpenClaw(_type: string, _key: string): Promise<void> {}
export async function removeProviderFromOpenClaw(_type: string): Promise<void> {}
export async function saveOAuthTokenToOpenClaw(_type: string, _token: string): Promise<void> {}
