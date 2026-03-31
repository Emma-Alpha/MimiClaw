import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';

const parseJsonBodyMock = vi.fn();
const sendJsonMock = vi.fn();
const sendNoContentMock = vi.fn();
const startXiaojiuAuthFlowMock = vi.fn();
const completeXiaojiuAuthCallbackMock = vi.fn();
const clearPendingXiaojiuAuthFlowMock = vi.fn();
const setSettingMock = vi.fn();

vi.mock('@electron/api/route-utils', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
  sendJson: (...args: unknown[]) => sendJsonMock(...args),
  sendNoContent: (...args: unknown[]) => sendNoContentMock(...args),
}));

vi.mock('@electron/utils/xiaojiu-auth', () => ({
  startXiaojiuAuthFlow: (...args: unknown[]) => startXiaojiuAuthFlowMock(...args),
  completeXiaojiuAuthCallback: (...args: unknown[]) => completeXiaojiuAuthCallbackMock(...args),
  clearPendingXiaojiuAuthFlow: (...args: unknown[]) => clearPendingXiaojiuAuthFlowMock(...args),
}));

vi.mock('@electron/utils/store', () => ({
  setSetting: (...args: unknown[]) => setSettingMock(...args),
}));

function createResponse() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    end(payload?: string) {
      this.body = payload ?? '';
    },
  } as unknown as ServerResponse & {
    headers: Record<string, string>;
    body: string;
  };
}

describe('handleAuthRoutes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('starts the Xiaojiu OAuth flow through the host api', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      authUrl: 'https://im.4399om.com/oauth2/authorization',
      clientId: 'client-id',
      appId: 'app-id',
      cloudApiBase: 'https://api.jizhiai.gz4399.com',
      exchangePath: '/api/auth/om_login',
    });
    startXiaojiuAuthFlowMock.mockReturnValueOnce({
      authorizationUrl: 'https://im.4399om.com/oauth2/authorization?state=test',
      callbackUrl: 'http://127.0.0.1:3210/api/auth/xiaojiu/callback',
      state: 'test',
    });

    const { handleAuthRoutes } = await import('@electron/api/routes/auth');
    const handled = await handleAuthRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/auth/xiaojiu/start'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(startXiaojiuAuthFlowMock).toHaveBeenCalledTimes(1);
    expect(sendJsonMock).toHaveBeenCalledWith(
      expect.anything(),
      200,
      expect.objectContaining({
        success: true,
        state: 'test',
      }),
    );
  });

  it('stores the cloud session and notifies the renderer after callback success', async () => {
    completeXiaojiuAuthCallbackMock.mockResolvedValueOnce({
      success: true,
      cloudApiBase: 'https://api.jizhiai.gz4399.com',
      session: {
        token: 'cloud-token',
        userId: 'user-1',
        workspaceId: 'ws-1',
        expiresAt: Date.now() + 60_000,
      },
    });

    const emit = vi.fn();
    const send = vi.fn();
    const res = createResponse();

    const { handleAuthRoutes } = await import('@electron/api/routes/auth');
    const handled = await handleAuthRoutes(
      { method: 'GET' } as IncomingMessage,
      res,
      new URL('http://127.0.0.1:3210/api/auth/xiaojiu/callback?code=abc123&state=state-1'),
      {
        eventBus: { emit } as never,
        mainWindow: {
          isDestroyed: () => false,
          webContents: { send },
        } as never,
      } as never,
    );

    expect(handled).toBe(true);
    expect(completeXiaojiuAuthCallbackMock).toHaveBeenCalledWith({
      code: 'abc123',
      state: 'state-1',
      error: null,
      errorMessage: null,
    });
    expect(setSettingMock).toHaveBeenNthCalledWith(1, 'cloudApiUrl', 'https://api.jizhiai.gz4399.com');
    expect(setSettingMock).toHaveBeenNthCalledWith(2, 'cloudApiToken', 'cloud-token');
    expect(emit).toHaveBeenCalledWith('cloud:auth-success', expect.objectContaining({ token: 'cloud-token' }));
    expect(send).toHaveBeenCalledWith('cloud:auth-success', expect.objectContaining({ token: 'cloud-token' }));
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('小九登录成功');
  });

  it('returns an error page when the callback is missing code or state', async () => {
    const emit = vi.fn();
    const res = createResponse();
    completeXiaojiuAuthCallbackMock.mockResolvedValueOnce({
      success: false,
      message: 'OAuth callback is missing code or state.',
    });

    const { handleAuthRoutes } = await import('@electron/api/routes/auth');
    const handled = await handleAuthRoutes(
      { method: 'GET' } as IncomingMessage,
      res,
      new URL('http://127.0.0.1:3210/api/auth/xiaojiu/callback?state=only-state'),
      {
        eventBus: { emit } as never,
        mainWindow: null,
      } as never,
    );

    expect(handled).toBe(true);
    expect(completeXiaojiuAuthCallbackMock).toHaveBeenCalledWith({
      code: null,
      state: 'only-state',
      error: null,
      errorMessage: null,
    });
    expect(emit).toHaveBeenCalledWith('cloud:auth-error', expect.objectContaining({
      message: 'OAuth callback is missing code or state.',
    }));
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('小九登录失败');
  });
});
