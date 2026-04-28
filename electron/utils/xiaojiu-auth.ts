import { randomUUID } from 'node:crypto';
import { logger } from './logger';
import { normalizeCloudSession, type CloudSession } from '../../shared/cloud-auth';

export interface XiaojiuAuthStartConfig {
  authUrl: string;
  clientId: string;
  appId?: string;
  callbackUrl?: string;
  cloudApiBase: string;
  exchangePath?: string;
}

interface PendingXiaojiuAuth {
  state: string;
  callbackUrl: string;
  config: XiaojiuAuthStartConfig & { exchangePath: string };
  createdAt: number;
}

const XIAOJIU_AUTH_TIMEOUT_MS = 10 * 60 * 1000;

let pendingAuth: PendingXiaojiuAuth | null = null;

function normalizeAuthUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Missing Xiaojiu OAuth authorization URL');
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function normalizeApiBase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Missing cloud API base URL');
  }
  return trimmed.replace(/\/$/, '');
}

function normalizeCallbackUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Missing Xiaojiu OAuth callback URL');
  }

  const callbackUrl = new URL(trimmed);
  if (!['http:', 'https:'].includes(callbackUrl.protocol)) {
    throw new Error('Xiaojiu OAuth callback URL must use http or https');
  }

  return callbackUrl.toString();
}

function cleanupExpiredPendingAuth(): void {
  if (!pendingAuth) return;
  if (Date.now() - pendingAuth.createdAt > XIAOJIU_AUTH_TIMEOUT_MS) {
    pendingAuth = null;
  }
}

function getDefaultCallbackUrl(cloudApiBase: string): string {
  return new URL('/om/desktop-callback', `${cloudApiBase}/`).toString();
}

export function startXiaojiuAuthFlow(config: XiaojiuAuthStartConfig): {
  authorizationUrl: string;
  callbackUrl: string;
  state: string;
} {
  cleanupExpiredPendingAuth();

  const authUrl = new URL(normalizeAuthUrl(config.authUrl));
  const clientId = config.clientId.trim();
  const appId = config.appId?.trim() || '';
  const cloudApiBase = normalizeApiBase(config.cloudApiBase);
  const exchangePath = (config.exchangePath?.trim() || '/api/auth/om_login');
  const callbackUrl = normalizeCallbackUrl(
    config.callbackUrl?.trim() || getDefaultCallbackUrl(cloudApiBase),
  );
  const state = randomUUID();

  if (!clientId) {
    throw new Error('Missing Xiaojiu OAuth client ID');
  }

  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('state', state);

  pendingAuth = {
    state,
    callbackUrl,
    createdAt: Date.now(),
    config: {
      authUrl: authUrl.origin + authUrl.pathname,
      clientId,
      appId,
      cloudApiBase,
      exchangePath,
    },
  };

  return {
    authorizationUrl: authUrl.toString(),
    callbackUrl,
    state,
  };
}

export function clearPendingXiaojiuAuthFlow(): void {
  pendingAuth = null;
}

export async function completeXiaojiuAuthCallback(params: {
  code?: string | null;
  state?: string | null;
  error?: string | null;
  errorMessage?: string | null;
}): Promise<
  | { success: true; session: CloudSession; cloudApiBase: string }
  | { success: false; message: string }
> {
  const error = params.error?.trim();
  if (error) {
    clearPendingXiaojiuAuthFlow();
    return {
      success: false,
      message: params.errorMessage?.trim() || error,
    };
  }

  const code = params.code?.trim() || '';
  const state = params.state?.trim() || '';

  if (!code || !state) {
    clearPendingXiaojiuAuthFlow();
    return {
      success: false,
      message: 'OAuth callback is missing code or state.',
    };
  }

  const { session, cloudApiBase } = await finishXiaojiuAuthFlow({ code, state });
  return {
    success: true,
    session,
    cloudApiBase,
  };
}

async function exchangeCodeForCloudSession(
  code: string,
  auth: PendingXiaojiuAuth,
): Promise<CloudSession> {
  const url = new URL(auth.config.exchangePath, `${auth.config.cloudApiBase}/`);
  if (auth.config.appId) {
    url.searchParams.set('custom_client', auth.config.appId);
  }

  logger.info('[xiaojiu-auth] Exchanging code at:', url.toString());
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      redirect_uri: encodeURIComponent(auth.callbackUrl),
    }),
  });

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  logger.info('[xiaojiu-auth] Token exchange response status:', response.status);
  logger.info('[xiaojiu-auth] Token exchange response payload:', JSON.stringify(payload, null, 2));

  if (!response.ok) {
    const message = typeof payload.error === 'string'
      ? payload.error
      : (typeof payload.message === 'string' ? payload.message : `Xiaojiu OAuth exchange failed (${response.status})`);
    throw new Error(message);
  }

  // Response format: { code, data: { jwt: { access_token, expires_at }, userInfo: { id, name, staffId } } }
  const data = payload.data as Record<string, unknown> | undefined;
  logger.info('[xiaojiu-auth] Parsed data:', JSON.stringify(data, null, 2));
  if (data && typeof data === 'object') {
    const jwt = data.jwt as Record<string, unknown> | undefined;
    const userInfo = data.userInfo as Record<string, unknown> | undefined;
    logger.info('[xiaojiu-auth] jwt:', JSON.stringify(jwt, null, 2));
    logger.info('[xiaojiu-auth] userInfo:', JSON.stringify(userInfo, null, 2));
    if (jwt && userInfo) {
      const session = normalizeCloudSession({
        token: jwt.access_token as string,
        tokenType: jwt.token_type as string | undefined,
        userId: String(userInfo.name ?? userInfo.id ?? ''),
        workspaceId: String(userInfo.staffId ?? userInfo.name ?? userInfo.id ?? ''),
        expiresAt: jwt.expires_at as number,
        cname: userInfo.cname as string | undefined,
        avatar: userInfo.avatar as string | undefined,
        team: userInfo.team as string | undefined,
        staffId: userInfo.staffId as string | undefined,
        isAdmin: userInfo.isAdmin as boolean | undefined,
      });
      logger.info('[xiaojiu-auth] Normalized session: userId=%s, workspaceId=%s, expiresAt=%s', session.userId, session.workspaceId, session.expiresAt);
      return session;
    }
  }

  // Fallback: try treating the top-level payload as a flat session object
  logger.info('[xiaojiu-auth] Using fallback: treating top-level payload as session');
  return normalizeCloudSession(payload);
}

export async function finishXiaojiuAuthFlow(params: {
  code: string;
  state: string;
}): Promise<{ session: CloudSession; cloudApiBase: string }> {
  cleanupExpiredPendingAuth();

  if (!pendingAuth) {
    throw new Error('Xiaojiu OAuth session expired. Please start again.');
  }

  if (params.state !== pendingAuth.state) {
    throw new Error('Xiaojiu OAuth state mismatch.');
  }

  const auth = pendingAuth;
  pendingAuth = null;

  try {
    return {
      session: await exchangeCodeForCloudSession(params.code.trim(), auth),
      cloudApiBase: auth.config.cloudApiBase,
    };
  } catch (error) {
    logger.error('[xiaojiu-auth] Failed to exchange auth code:', error);
    throw error;
  }
}
