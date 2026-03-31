import type { HTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from '@/pages/Login';

const navigateMock = vi.fn();
const loginCloudMock = vi.fn();
const applyCloudSessionMock = vi.fn();
const hostApiFetchMock = vi.fn();
const getXiaojiuOAuthConfigMock = vi.fn();
const subscribeHostEventMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'login.error': '登录失败，请检查用户名和密码',
      'login.timeout': '登录请求超时，请重试。',
      'login.oauthError': '小九认证失败，请重试',
      'login.oauthStartTimeout': '打开小九认证超时，请重试。',
      'login.oauthBrowserOpened': '已打开小九认证页面，请在浏览器中完成授权，成功后会自动回到应用。',
    }[key] ?? key),
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: (selector: (state: {
    loginCloud: typeof loginCloudMock;
    applyCloudSession: typeof applyCloudSessionMock;
    setupComplete: boolean;
  }) => unknown) => selector({
    loginCloud: loginCloudMock,
    applyCloudSession: applyCloudSessionMock,
    setupComplete: false,
  }),
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: (...args: unknown[]) => hostApiFetchMock(...args),
}));

vi.mock('@/lib/cloud-api', () => ({
  getXiaojiuOAuthConfig: (...args: unknown[]) => getXiaojiuOAuthConfigMock(...args),
}));

vi.mock('@/lib/host-events', () => ({
  subscribeHostEvent: (...args: unknown[]) => subscribeHostEventMock(...args),
}));

vi.mock('@/components/layout/TitleBar', () => ({
  TitleBar: () => <div data-testid="title-bar" />,
}));

vi.mock('@/components/ui/animated-characters', () => ({
  AnimatedCharacters: () => <div data-testid="animated-characters" />,
}));

vi.mock('@/assets/logo.png', () => ({
  default: 'logo.png',
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('Login page', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    loginCloudMock.mockReset();
    applyCloudSessionMock.mockReset();
    hostApiFetchMock.mockReset();
    getXiaojiuOAuthConfigMock.mockReset();
    subscribeHostEventMock.mockReset();
    vi.mocked(window.electron.openExternal).mockReset();

    subscribeHostEventMock.mockReturnValue(vi.fn());
    getXiaojiuOAuthConfigMock.mockReturnValue({
      authUrl: 'https://oauth.test/authorize',
      clientId: 'client-id',
      callbackUrl: 'http://127.0.0.1:3210/api/auth/xiaojiu/callback',
      cloudApiBase: 'https://api.test',
      exchangePath: '/oauth/exchange',
    });
  });

  it('releases Xiaojiu loading after opening the browser and shows a follow-up notice', async () => {
    hostApiFetchMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ authorizationUrl: 'https://oauth.test/start' });
    vi.mocked(window.electron.openExternal).mockResolvedValueOnce();

    render(<Login />);

    const button = screen.getByRole('button', { name: /使用小九认证登录/ });
    fireEvent.click(button);

    await waitFor(() => {
      expect(hostApiFetchMock).toHaveBeenNthCalledWith(1, '/api/auth/xiaojiu/cancel', { method: 'POST' });
      expect(hostApiFetchMock).toHaveBeenNthCalledWith(2, '/api/auth/xiaojiu/start', {
        method: 'POST',
        body: JSON.stringify(getXiaojiuOAuthConfigMock.mock.results[0]?.value),
      });
    });

    await waitFor(() => {
      expect(window.electron.openExternal).toHaveBeenCalledWith('https://oauth.test/start');
    });

    expect(
      await screen.findByText('已打开小九认证页面，请在浏览器中完成授权，成功后会自动回到应用。'),
    ).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });
});
