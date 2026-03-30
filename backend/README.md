# ClawX Cloud Backend

基于 **Hono + Node.js + TypeScript** 的轻量云控制平面，为 ClawX Electron 客户端提供：

- 用户认证（JWT）
- 工作区管理（每用户隔离）
- OpenClaw Gateway 进程生命周期管理
- 工作区级 OpenClaw 配置 CRUD

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 在仓库根目录复制环境变量
cp ../.env.example ../.env   # 按需修改
# 或者在仓库根目录执行：cp .env.example .env

# 3. 启动开发服务（热重载）
npm run dev

# 4. 服务默认监听 http://localhost:3000
#    默认账号 admin / admin（首次启动自动创建）
```

---

## API 接口

| 方法   | 路径                     | 说明                   |
|--------|--------------------------|------------------------|
| POST   | /api/auth/login          | 登录，返回 JWT         |
| POST   | /api/auth/om_login       | 小九 OAuth 换取云会话  |
| GET    | /api/auth/xiaojiu/browser-callback | 小九浏览器 OAuth HTTPS 回跳桥 |
| POST   | /api/auth/logout         | 登出（无状态）         |
| GET    | /api/auth/me             | 获取当前用户信息       |
| GET    | /api/workspace/status    | 工作区 + 网关状态      |
| POST   | /api/workspace/bootstrap | 初始化工作区（幂等）   |
| GET    | /api/gateway/status      | 网关进程状态           |
| POST   | /api/gateway/start       | 启动网关进程           |
| POST   | /api/gateway/stop        | 停止网关进程           |
| POST   | /api/gateway/restart     | 重启网关进程           |
| GET    | /api/config              | 获取 openclaw.json     |
| PUT    | /api/config              | 全量替换 openclaw.json |
| PATCH  | /api/config              | 浅合并 openclaw.json   |

所有接口（除登录）需 `Authorization: Bearer <token>` 请求头。

---

## 客户端对接

在 ClawX Electron 客户端的 DevTools 控制台执行，将 API base URL 切换到本地后端：

```js
localStorage.setItem('clawx:cloud-api-base', 'http://localhost:3000')
location.reload()
```

---

## 环境变量

后端启动时会按下面顺序读取环境变量，后者覆盖前者（`<env>` 来自 `APP_ENV` 或 `NODE_ENV`，可选值如 `development` / `test` / `production`）：

1. `backend/.env`
2. `backend/.env.local`
3. `backend/.env.<env>`
4. `backend/.env.<env>.local`
5. 仓库根目录 `.env`
6. 仓库根目录 `.env.local`
7. 仓库根目录 `.env.<env>`
8. 仓库根目录 `.env.<env>.local`

推荐将公共配置放在 `.env.<env>`，将本机私有覆盖放在 `*.local`，尤其是 `XIAOJIU_CLIENT_SECRET` 这类敏感值。

| 变量                 | 默认值                           | 说明                          |
|----------------------|----------------------------------|-------------------------------|
| `PORT`               | `3000`                           | 监听端口                      |
| `JWT_SECRET`         | `clawx-cloud-dev-secret-...`     | JWT 签名密钥（生产必须修改）  |
| `DATA_DIR`           | `./data`                         | JSON 数据存储目录             |
| `XIAOJIU_CLIENT_ID`  | `1816386499001556992`            | 4399 浏览器 OAuth client_id   |
| `XIAOJIU_CLIENT_SECRET` | -                             | 4399 浏览器 OAuth client_secret |
| `XIAOJIU_AUTH_API`   | `https://messenger-api.4399om.com` | 4399 token / user-info API  |
| `XIAOJIU_CALLBACK_DEEP_LINK_BASE` | `jizhi://auth/xiaojiu/callback` | HTTPS 回跳页唤起桌面应用的深链 |
| `OPENCLAW_BIN`       | `openclaw`                       | openclaw 可执行文件路径       |
| `OPENCLAW_SERVE_ARGS`| `serve --port {port}`            | openclaw serve 参数模板       |

小九浏览器 OAuth 注意事项：

- 不要把 `localhost` 或 `127.0.0.1` 配成小九白名单回调域名，企业 OAuth 通常会直接拦截。
- ClawX 桌面端默认会优先使用当前 cloud API 对应的浏览器回调地址：
  `https://<your-cloud-domain>/api/auth/xiaojiu/browser-callback`
- 如需继续走联调页面，也可以显式配置 renderer 端的 `VITE_XIAOJIU_CALLBACK_URL`。

---

## 目录结构

```
backend/
├── src/
│   ├── load-env.ts   # 加载根目录 / backend 下的 .env
│   ├── main.ts       # 先加载环境变量，再启动服务
│   ├── index.ts      # 入口、路由挂载、CORS、日志
│   ├── auth.ts       # JWT 签发、登录/登出路由
│   ├── workspace.ts  # 工作区状态、bootstrap 路由
│   ├── gateway.ts    # 进程管理 + 路由
│   ├── config.ts     # openclaw.json CRUD 路由
│   ├── store.ts      # 文件 JSON 存储层（可替换为数据库）
│   └── types.ts      # 共享类型定义
├── data/             # 运行时数据（.gitignore）
├── .env.example      # 兼容提示，真实示例在仓库根目录
└── package.json
```

---

## 生产建议

- `JWT_SECRET` 换成 32+ 位随机字符串
- `store.ts` 替换为 SQLite（推荐 Drizzle ORM）或 PostgreSQL
- 在 `auth.ts` 的密码验证处接入 bcrypt
- 使用 Docker / PM2 管理进程
