import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { seedAdmin } from './auth.js';
import { authRouter } from './auth.js';
import { workspaceRouter } from './workspace.js';
import { gatewayRouter } from './gateway.js';
import { configRouter } from './config.js';

// ─── App ─────────────────────────────────────────────────────────────────────

const app = new Hono();

app.use('*', logger());

app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',   // Vite dev server
      'http://localhost:5174',
      'app://.',                  // Electron production origin
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);

// ─── Health check ────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// ─── Route mount ─────────────────────────────────────────────────────────────

app.route('/api/auth', authRouter);
app.route('/api/workspace', workspaceRouter);
app.route('/api/gateway', gatewayRouter);
app.route('/api/config', configRouter);

// ─── 404 fallback ────────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: '接口不存在' }, 404));

app.onError((err, c) => {
  console.error('[error]', err);
  return c.json({ error: '服务器内部错误', detail: err.message }, 500);
});

// ─── Boot ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3000);

seedAdmin();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.info(`\n🚀 ClawX Cloud Backend running at http://localhost:${info.port}`);
  console.info('   Default credentials: admin / admin');
  console.info('   Data directory:', process.env.DATA_DIR ?? './data');
  console.info('\nAPI Routes:');
  console.info('  POST   /api/auth/login');
  console.info('  POST   /api/auth/om_login');
  console.info('  GET    /api/auth/xiaojiu/browser-callback');
  console.info('  POST   /api/auth/logout');
  console.info('  GET    /api/auth/me');
  console.info('  GET    /api/workspace/status');
  console.info('  POST   /api/workspace/bootstrap');
  console.info('  GET    /api/gateway/status');
  console.info('  POST   /api/gateway/start');
  console.info('  POST   /api/gateway/stop');
  console.info('  POST   /api/gateway/restart');
  console.info('  GET    /api/config');
  console.info('  PUT    /api/config');
  console.info('  PATCH  /api/config\n');
});

export default app;
