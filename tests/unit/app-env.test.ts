import { describe, expect, it } from 'vitest';
import {
  resolveClawXAppEnv,
  resolveCloudOnlyMode,
  resolveDefaultCloudApiBase,
  resolveRemoteJizhiChatUrl,
} from '@/lib/app-env';

describe('app-env', () => {
  it('uses development defaults for local runs', () => {
    const env = {
      MODE: 'development',
      DEV: true,
      PROD: false,
    };

    expect(resolveClawXAppEnv(env)).toBe('development');
    expect(resolveDefaultCloudApiBase(env)).toBe('http://localhost:3000');
    expect(resolveRemoteJizhiChatUrl(env)).toBe('https://local-jizhiai-main.gz4399.com/');
  });

  it('uses production-safe defaults for packaged builds', () => {
    const env = {
      MODE: 'production',
      DEV: false,
      PROD: true,
    };

    expect(resolveClawXAppEnv(env)).toBe('production');
    expect(resolveDefaultCloudApiBase(env)).toBe('https://api.jizhiai.gz4399.com');
    expect(resolveRemoteJizhiChatUrl(env)).toBe('https://jizhiai.gz4399.com/');
    expect(resolveCloudOnlyMode(env)).toBe(false);
  });

  it('normalizes test aliases and honors explicit overrides', () => {
    const env = {
      VITE_APP_ENV: 'staging',
      VITE_CLOUD_API_BASE_URL: 'https://staging-api.example.com/',
      VITE_REMOTE_JIZHI_CHAT_URL: 'https://staging-web.example.com',
    };

    expect(resolveClawXAppEnv(env)).toBe('test');
    expect(resolveDefaultCloudApiBase(env)).toBe('https://staging-api.example.com');
    expect(resolveRemoteJizhiChatUrl(env)).toBe('https://staging-web.example.com/');
  });

  it('detects cloud-only packaging flag', () => {
    expect(resolveCloudOnlyMode({ VITE_CLAWX_CLOUD_ONLY: '1' })).toBe(true);
    expect(resolveCloudOnlyMode({ VITE_CLAWX_CLOUD_ONLY: 'true' })).toBe(true);
    expect(resolveCloudOnlyMode({ VITE_CLAWX_CLOUD_ONLY: '0' })).toBe(false);
  });
});
