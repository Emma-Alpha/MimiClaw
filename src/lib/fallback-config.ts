import { hostApiFetch } from './host-api';

export interface FallbackConfigStatus {
  exists: boolean;
  path: string;
  source?: 'local' | 'bundled' | null;
  version: number | null;
  createdAt: string | null;
}

export async function fetchFallbackConfigStatus(): Promise<FallbackConfigStatus> {
  return hostApiFetch<FallbackConfigStatus>('/api/fallback-config/status');
}

export async function exportFallbackConfigBundle(password: string): Promise<{ success: boolean; path: string; createdAt: string; version: number }> {
  return hostApiFetch<{ success: boolean; path: string; createdAt: string; version: number }>('/api/fallback-config/export', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function autoApplyFallbackConfigBundle(password: string): Promise<{ success: boolean; applied: boolean; reason?: string; error?: string }> {
  return hostApiFetch<{ success: boolean; applied: boolean; reason?: string; error?: string }>('/api/fallback-config/auto-apply', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}
