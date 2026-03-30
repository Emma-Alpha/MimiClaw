import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSettingMock = vi.fn();
const loggerWarnMock = vi.fn();

vi.mock('@electron/utils/store', () => ({
  getSetting: (...args: unknown[]) => getSettingMock(...args),
}));

vi.mock('@electron/utils/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => loggerWarnMock(...args),
  },
}));

describe('cloud-config-bridge', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSettingMock.mockImplementation(async (key: string) => {
      if (key === 'cloudApiUrl') return 'https://dev-jizhi.gz4399.com';
      if (key === 'cloudApiToken') return 'test-token';
      return '';
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null instead of throwing when the cloud endpoint responds with html', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('<!doctype html><html><body>Not JSON</body></html>', {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }),
    ));

    const { getCloudGatewayStatus } = await import('@electron/utils/cloud-config-bridge');

    await expect(getCloudGatewayStatus()).resolves.toBeNull();
    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.stringContaining('returned non-JSON content'),
    );
  });

  it('parses json responses normally when the cloud endpoint is valid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        workspaceId: 'ws-1',
        gatewayState: 'running',
        gatewayWsUrl: 'ws://127.0.0.1:18789/ws',
        gatewayPort: 18789,
        gatewayError: null,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    ));

    const { getCloudGatewayStatus } = await import('@electron/utils/cloud-config-bridge');

    await expect(getCloudGatewayStatus()).resolves.toEqual({
      workspaceId: 'ws-1',
      gatewayState: 'running',
      gatewayWsUrl: 'ws://127.0.0.1:18789/ws',
      gatewayPort: 18789,
      gatewayError: null,
    });
    expect(loggerWarnMock).not.toHaveBeenCalled();
  });
});
