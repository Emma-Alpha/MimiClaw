import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { readStore, updateStore } from './store.js';
import type { JwtPayload, LoginRequest, LoginResponse } from './types.js';

// ─── JWT config ─────────────────────────────────────────────────────────────

const JWT_SECRET_RAW = process.env.JWT_SECRET ?? 'mimiclaw-cloud-dev-secret-change-me';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const XIAOJIU_CLIENT_ID = process.env.XIAOJIU_CLIENT_ID ?? '1816386499001556992';
const XIAOJIU_CLIENT_SECRET = process.env.XIAOJIU_CLIENT_SECRET ?? '';
const XIAOJIU_AUTH_API = (process.env.XIAOJIU_AUTH_API ?? 'https://messenger-api.4399om.com').replace(/\/$/, '');
const XIAOJIU_CALLBACK_DEEP_LINK_BASE = process.env.XIAOJIU_CALLBACK_DEEP_LINK_BASE ?? 'jizhi://auth/xiaojiu/callback';

export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as JwtPayload;
}

// ─── Middleware helper ───────────────────────────────────────────────────────

export async function requireAuth(
  authHeader: string | undefined,
): Promise<JwtPayload | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

// ─── Seed default admin user if no users exist ──────────────────────────────

export function seedAdmin(): void {
  const store = readStore();
  if (store.users.length === 0) {
    updateStore((data) => {
      data.users.push({
        id: randomUUID(),
        username: 'admin',
        passwordHash: 'admin', // plaintext MVP — replace with bcrypt in prod
        createdAt: new Date().toISOString(),
      });
    });
    console.info('[auth] Seeded default admin user (username: admin, password: admin)');
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export const authRouter = new Hono();

interface XiaojiuTokenResponse {
  code?: number;
  msg?: string;
  data?: {
    access_token?: string;
  };
}

interface XiaojiuUserInfoResponse {
  code?: number;
  msg?: string;
  data?: {
    id?: string;
    name?: string;
    avatar?: string;
    baseInfo?: {
      name?: string;
      team?: string;
      userId?: {
        staffNo?: string;
        staffId?: string;
        uid?: string;
      };
    };
  };
}

type XiaojiuUserInfo = NonNullable<XiaojiuUserInfoResponse['data']>;

function ensureWorkspace(userId: string) {
  let workspace = readStore().workspaces.find((w) => w.userId === userId);
  if (!workspace) {
    const wsId = randomUUID();
    updateStore((data) => {
      data.workspaces.push({
        id: wsId,
        userId,
        gatewayState: 'stopped',
        gatewayPid: null,
        gatewayPort: null,
        gatewayWsUrl: null,
        gatewayError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    workspace = readStore().workspaces.find((w) => w.userId === userId)!;
  }
  return workspace;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildXiaojiuDeepLink(params: {
  code?: string | null;
  state?: string | null;
  error?: string | null;
  errorDescription?: string | null;
}): string {
  const deepLink = new URL(XIAOJIU_CALLBACK_DEEP_LINK_BASE);
  if (params.code) deepLink.searchParams.set('code', params.code);
  if (params.state) deepLink.searchParams.set('state', params.state);
  if (params.error) deepLink.searchParams.set('error', params.error);
  if (params.errorDescription) deepLink.searchParams.set('error_description', params.errorDescription);
  return deepLink.toString();
}

function renderXiaojiuCallbackBridgePage(params: {
  deepLinkUrl: string;
  success: boolean;
  message: string;
}): string {
  const title = params.success ? '正在返回极智桌面应用' : '小九登录未完成';
  const deepLinkUrl = escapeHtml(params.deepLinkUrl);
  const message = escapeHtml(params.message);
  const accent = params.success ? '#16a34a' : '#dc2626';

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #0f172a;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(460px, 100%);
      padding: 28px 24px;
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid rgba(148, 163, 184, 0.22);
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
    }
    .badge {
      display: inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      background: ${accent};
    }
    h1 {
      margin: 16px 0 10px;
      font-size: 24px;
      line-height: 1.2;
    }
    p {
      margin: 0 0 20px;
      line-height: 1.7;
      color: #cbd5e1;
    }
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 0 18px;
      border-radius: 999px;
      background: ${accent};
      color: #fff;
      font-weight: 700;
      text-decoration: none;
    }
    .hint {
      margin-top: 16px;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <main>
    <div class="badge">${params.success ? 'OAuth Bridge' : 'OAuth Error'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${deepLinkUrl}">打开极智</a>
    <div class="hint">如果没有自动跳回，请点击上面的按钮。</div>
  </main>
  <script>
    window.setTimeout(() => {
      window.location.href = ${JSON.stringify(params.deepLinkUrl)};
    }, 80);
  </script>
</body>
</html>`;
}

async function exchangeXiaojiuCode(params: {
  code: string;
  redirectUri: string;
  clientId?: string;
}): Promise<XiaojiuUserInfo> {
  if (!XIAOJIU_CLIENT_SECRET) {
    throw new Error('XIAOJIU_CLIENT_SECRET is not configured');
  }

  const clientId = params.clientId?.trim() || XIAOJIU_CLIENT_ID;
  if (!clientId) {
    throw new Error('XIAOJIU_CLIENT_ID is not configured');
  }

  const formData = new FormData();
  formData.append('client_id', clientId);
  formData.append('client_secret', XIAOJIU_CLIENT_SECRET);
  formData.append('grant_type', 'authorization_code');
  formData.append('code', params.code);
  formData.append('redirect_uri', params.redirectUri);

  const tokenResponse = await fetch(`${XIAOJIU_AUTH_API}/oauth2/token`, {
    method: 'POST',
    body: formData,
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({})) as XiaojiuTokenResponse;
  if (!tokenResponse.ok || tokenPayload.code !== 200 || !tokenPayload.data?.access_token) {
    throw new Error(tokenPayload.msg || `Xiaojiu token exchange failed (${tokenResponse.status})`);
  }

  const userInfoUrl = new URL(`${XIAOJIU_AUTH_API}/oauth2/user-info`);
  userInfoUrl.searchParams.set('access_token', tokenPayload.data.access_token);
  const userInfoResponse = await fetch(userInfoUrl, { method: 'GET' });
  const userInfoPayload = await userInfoResponse.json().catch(() => ({})) as XiaojiuUserInfoResponse;
  if (!userInfoResponse.ok || userInfoPayload.code !== 200 || !userInfoPayload.data) {
    throw new Error(userInfoPayload.msg || `Xiaojiu user-info request failed (${userInfoResponse.status})`);
  }

  return userInfoPayload.data;
}

async function findOrCreateXiaojiuUser(params: {
  username: string;
  passwordHash: string;
}): Promise<{ id: string; username: string }> {
  let store = readStore();
  let user = store.users.find((item) => item.username === params.username);

  if (!user) {
    const userId = randomUUID();
    updateStore((data) => {
      data.users.push({
        id: userId,
        username: params.username,
        passwordHash: params.passwordHash,
        createdAt: new Date().toISOString(),
      });
    });
    store = readStore();
    user = store.users.find((item) => item.id === userId);
  }

  if (!user) {
    throw new Error('无法创建小九用户');
  }

  return user;
}

/** POST /api/auth/login */
authRouter.post('/login', async (c) => {
  const body = await c.req.json<LoginRequest>();
  const { username, password } = body ?? {};

  if (!username || !password) {
    return c.json({ error: '用户名和密码不能为空' }, 400);
  }

  const store = readStore();
  const user = store.users.find(
    (u) => u.username === username && u.passwordHash === password,
  );

  if (!user) {
    return c.json({ error: '用户名或密码错误' }, 401);
  }

  const workspace = ensureWorkspace(user.id);

  const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000).toISOString();
  const token = await signToken({
    sub: user.id,
    username: user.username,
    workspaceId: workspace.id,
  });

  const resp: LoginResponse = {
    token,
    userId: user.id,
    username: user.username,
    workspaceId: workspace.id,
    expiresAt,
  };

  return c.json(resp, 200);
});

/** POST /api/auth/om_login */
authRouter.post('/om_login', async (c) => {
  const body = await c.req.json<{ code?: string; redirect_uri?: string }>();
  const code = body?.code?.trim();
  const redirectUri = body?.redirect_uri?.trim();
  const customClient = c.req.query('custom_client')?.trim();

  if (!code || !redirectUri) {
    return c.json({ error: 'code 和 redirect_uri 不能为空' }, 400);
  }

  try {
    const userInfo = await exchangeXiaojiuCode({
      code,
      redirectUri,
      clientId: customClient || undefined,
    });
    const username = (
      userInfo.baseInfo?.userId?.staffNo
      || userInfo.baseInfo?.userId?.staffId
      || userInfo.baseInfo?.userId?.uid
      || userInfo.id
      || userInfo.name
      || 'xiaojiu-user'
    ).trim();

    const user = await findOrCreateXiaojiuUser({
      username,
      passwordHash: `oauth:${customClient || XIAOJIU_CLIENT_ID}`,
    });

    const workspace = ensureWorkspace(user.id);
    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000).toISOString();
    const token = await signToken({
      sub: user.id,
      username: user.username,
      workspaceId: workspace.id,
    });

    return c.json({
      token,
      userId: user.id,
      username: user.username,
      workspaceId: workspace.id,
      expiresAt,
      source: 'xiaojiu-browser-oauth',
      profile: {
        id: userInfo.id ?? null,
        name: userInfo.name ?? userInfo.baseInfo?.name ?? null,
        avatar: userInfo.avatar ?? null,
        team: userInfo.baseInfo?.team ?? null,
        staffNo: userInfo.baseInfo?.userId?.staffNo ?? null,
        staffId: userInfo.baseInfo?.userId?.staffId ?? null,
        uid: userInfo.baseInfo?.userId?.uid ?? null,
      },
    }, 200);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

/** GET /api/auth/xiaojiu/browser-callback */
authRouter.get('/xiaojiu/browser-callback', (c) => {
  const code = c.req.query('code')?.trim();
  const state = c.req.query('state')?.trim();
  const error = c.req.query('error')?.trim();
  const errorDescription = c.req.query('error_description')?.trim();
  const deepLinkUrl = buildXiaojiuDeepLink({
    code,
    state,
    error,
    errorDescription,
  });

  const message = error
    ? (errorDescription || error)
    : '授权结果已经返回，正在唤起极智桌面应用继续完成登录。';

  return c.html(renderXiaojiuCallbackBridgePage({
    deepLinkUrl,
    success: !error,
    message,
  }));
});

/** POST /api/auth/logout  — stateless JWT, just acknowledge */
authRouter.post('/logout', (c) => {
  return c.json({ ok: true });
});

/** GET /api/auth/me */
authRouter.get('/me', async (c) => {
  const claims = await requireAuth(c.req.header('Authorization'));
  if (!claims) return c.json({ error: '未授权' }, 401);

  return c.json({
    userId: claims.sub,
    username: claims.username,
    workspaceId: claims.workspaceId,
  });
});
