import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { readStore, updateStore } from './store.js';
import type { JwtPayload, LoginRequest, LoginResponse } from './types.js';

// ─── JWT config ─────────────────────────────────────────────────────────────

const JWT_SECRET_RAW = process.env.JWT_SECRET ?? 'clawx-cloud-dev-secret-change-me';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

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

  // Ensure workspace exists for this user
  let workspace = store.workspaces.find((w) => w.userId === user.id);
  if (!workspace) {
    const wsId = randomUUID();
    updateStore((data) => {
      data.workspaces.push({
        id: wsId,
        userId: user.id,
        gatewayState: 'stopped',
        gatewayPid: null,
        gatewayPort: null,
        gatewayWsUrl: null,
        gatewayError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    workspace = readStore().workspaces.find((w) => w.userId === user.id)!;
  }

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
