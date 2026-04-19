import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCloudSession,
  cloudLogin,
  cloudLogout,
  getCloudSession,
  isLocalCloudLoginCredential,
  isLocalCloudSession,
} from '@/lib/cloud-api';

describe('cloud api login', () => {
  beforeEach(() => {
    clearCloudSession();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('accepts the reserved local admin/admin credential', () => {
    expect(isLocalCloudLoginCredential('admin', 'admin')).toBe(true);
    expect(isLocalCloudLoginCredential(' admin ', 'admin')).toBe(true);
    expect(isLocalCloudLoginCredential('admin', 'wrong')).toBe(false);
  });

  it('creates a local session for admin/admin without touching the cloud backend', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const session = await cloudLogin('admin', 'admin');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(isLocalCloudSession(session)).toBe(true);
    expect(session).toMatchObject({
      token: 'mimiclaw-local-admin-token',
      userId: 'admin',
      workspaceId: 'admin',
    });
    expect(session.expiresAt).toBeGreaterThan(Date.now());
    expect(getCloudSession()).toEqual(session);
  });

  it('still uses the remote login endpoint outside the dev bypass', async () => {
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

  it('does not call remote logout for a local admin session', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await cloudLogin('admin', 'admin');
    await cloudLogout();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getCloudSession()).toBeNull();
  });
});
