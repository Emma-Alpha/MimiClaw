import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCloudSession,
  cloudLogin,
  getCloudSession,
  isDevCloudLoginCredential,
  isDevCloudLoginEnabled,
} from '@/lib/cloud-api';

describe('cloud api login', () => {
  beforeEach(() => {
    clearCloudSession();
    window.localStorage.clear();
    window.electron.isDev = true;
    vi.unstubAllGlobals();
  });

  it('enables the local admin/admin bypass only in dev', () => {
    window.electron.isDev = true;
    expect(isDevCloudLoginEnabled()).toBe(true);
    expect(isDevCloudLoginCredential('admin', 'admin')).toBe(true);
    expect(isDevCloudLoginCredential(' admin ', 'admin')).toBe(true);

    window.electron.isDev = false;
    expect(isDevCloudLoginEnabled()).toBe(false);
  });

  it('creates a local session for admin/admin during dev', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const session = await cloudLogin('admin', 'admin');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(session).toMatchObject({
      token: 'mimiclaw-dev-admin-token',
      userId: 'admin',
      workspaceId: 'admin',
    });
    expect(session.expiresAt).toBeGreaterThan(Date.now());
    expect(getCloudSession()).toEqual(session);
  });

  it('still uses the remote login endpoint outside the dev bypass', async () => {
    window.electron.isDev = false;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: 'remote-token',
        userId: 'alice',
        workspaceId: 'workspace-1',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const session = await cloudLogin('alice', 'secret');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'alice', password: 'secret' }),
      }),
    );
    expect(session).toEqual({
      token: 'remote-token',
      userId: 'alice',
      workspaceId: 'workspace-1',
      expiresAt: undefined,
    });
  });
});
