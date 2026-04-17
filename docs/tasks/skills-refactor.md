# Skills 页重构任务文档

> 状态：已实施（核心路径；可按产品反馈继续打磨分类与「有更新」检测）
> 范围：`src/pages/Skills/`、`src/stores/skills.ts`、`electron/gateway/*`、`electron/api/routes/skills.ts`
> 参考 UI：`lobe-chat/src/routes/(main)/settings/skill`

---

## 1. 背景与目标

### 1.1 现状问题

- `src/pages/Skills/index.tsx` 单文件近 900 行，混合了主列表、详情抽屉、安装抽屉、工具函数
- skill 分类仅区分 `isBundled / !isBundled`，无法清晰表达「客户端自带 / 本地 / 远程加载」三类语义
- 远程搜索绑定 `ClawHubService`（正则解析 CLI 文本输出），脆弱且不易扩展
- 搜索入口散落在两处（主页顶部过滤框 + Install 抽屉搜索框），职责混乱

### 1.2 目标

1. 页面 UI 与交互对齐 lobe-chat 的 skill 管理体验（纵向 section 分组）
2. 显式区分 **客户端自带 / 本地 / 远程加载** 三类
3. 用 `npx skills find` 替代 `clawhub search` 作为远程发现能力
4. 补齐远程 skill 的版本更新（`outdated` + `update`）能力
5. 为无 Node 环境的最终用户提供自动 Node runtime 下载

---

## 2. 最终产品决策（已与需求方逐项对齐）

| 编号 | 决策项 | 结论 |
|---|---|---|
| Q1 | 三分类定义 | 自带 = `isBundled`；本地 = workspace/.agents/.codex/.claude 等未托管；远程 = `openclaw-managed` + 搜索未装条目 |
| Q2 | CLI 迁移 | `npx skills` 完全替换 `ClawHubService` |
| Q3 | 安装目录 | 使用 skills CLI 默认（预期 `~/.agents/skills`），Gateway 已扫描 |
| Q4 | 页面布局 | lobe-chat 风格：section 纵向排列，Divider 分隔 |
| Q5 | 远程搜索入口 | 独立路由页 `/skills/store` |
| Q6 | 操作权限 | 本地 skill 可卸载，danger 确认并提示删目录 |
| Q7 | 版本更新 | 本轮接入完整 `outdated` + `update` 流程 |
| Q8 | Store 弹窗形态 | 独立路由 `/skills/store`，非 Modal |
| Q9 | API 命名 | 一次性改名 `/api/skills/*`，删除 `/api/clawhub/*` |
| Q10 | 文件结构 | 对齐 lobe-chat：`features/`、`store/`、`lib/` 三子目录 |
| Q11 | Node 环境 | 首次需要时下载到 `~/.mimiclaw/runtime/node/` |
| Q12 | CLI 输出 | 强制 `--json`，不做文本正则降级 |
| Q13 | Store 搜索 | 默认展示 `--trending`；输入 debounce 500ms；< 2 字符不发；回车立即发 |
| Q14 | 批量启用/禁用 | 删除全局批量按钮 |
| Q15 | section 级操作 | 自带无；本地「打开目录」；远程「打开目录 + 技能商店」 |
| Q16 | Store 已装行为 | 保留展示 + 已装徽标 + 卸载 danger，排序置后 |
| Q17 | source 兜底 | 白名单：bundled → 自带、managed → 远程、其余 → 本地 |
| Q18 | CLI 引入方式 | `npx skills@<pinned-version>` 按需执行，不写入 deps |
| Q19 | Node 下载时机 | 懒触发 + 顶部非阻塞进度条 |

### 次要默认决策（如需调整单独反馈）

- 保留 `isCore`（bundled && always）锁图标与 disabled 开关
- i18n 三语同步（en/zh/ja）
- `SkillDetailSheet` UI 基本保留，仅重写权限矩阵
- Outdated 检查：进入主页触发一次（需 Node 可用），缓存 6h，手动刷新可打破
- 不提供安装目录选择项
- 顶部 header 仅保留「刷新」图标按钮
- telemetry 事件：`skills.store_open / skills.search / skills.install / skills.update / skills.ensure_node`

---

## 3. 交付物清单

### 3.1 新增文件

```
src/pages/Skills/
├── features/
│   ├── SkillList.tsx
│   ├── SkillSection.tsx
│   ├── SkillRow.tsx
│   ├── SkillDetailSheet.tsx
│   └── UpdateBadge.tsx
├── store/
│   ├── index.tsx
│   ├── StoreSearchBar.tsx
│   ├── StoreResultList.tsx
│   └── StoreResultRow.tsx
└── lib/
    ├── source-taxonomy.ts
    └── skill-permissions.ts

electron/gateway/
├── skills-cli.ts          // SkillsCliRunner
└── node-runtime.ts        // ensureNode()
```

### 3.2 修改文件

- `src/pages/Skills/index.tsx`：瘦身至 < 150 行，仅负责组装
- `src/pages/Skills/styles.ts`：按新结构重写
- `src/stores/skills.ts`：URL 迁移 + 新方法
- `src/App.tsx`：新增 `/skills/store` 路由
- `electron/api/routes/skills.ts`：重写所有路由
- `electron/api/context.ts`：注入 `SkillsCliRunner`
- `electron/main/index.ts`：注入 runtime 依赖
- `electron/main/ipc-handlers.ts`：删除 clawhub 相关 IPC（如有）
- `electron/preload/index.ts`：同上
- `src/types/skill.ts`：补充分类、更新状态字段
- `locales/{en,zh-CN,ja-JP}/skills.json`：新增 key
- `README.md`、`README.zh-CN.md`、`README.ja-JP.md`：同步 Skills 段落

### 3.3 删除文件

- `electron/gateway/clawhub.ts`
- 所有 `/api/clawhub/*` 路由定义

---

## 4. 后端改造详细方案

### 4.1 `electron/gateway/node-runtime.ts`

```ts
export interface NodeRuntimeStatus {
  state: 'idle' | 'detecting' | 'downloading' | 'ready' | 'error';
  progress?: number;
  error?: string;
  nodePath?: string;
  npxPath?: string;
}

export async function detectSystemNode(): Promise<string | null>;
export async function ensureNode(
  onProgress?: (s: NodeRuntimeStatus) => void,
): Promise<{ nodePath: string; npxPath: string }>;
```

- 优先检测系统 `PATH` 中的 `npx`
- 未命中则下载 Node.js LTS（平台：darwin-arm64 / darwin-x64 / linux-x64 / win-x64）
- 下载源：`https://nodejs.org/dist/v<LTS>/node-v<LTS>-<platform>.<ext>`
- 解压到 `~/.mimiclaw/runtime/node/`
- 进度通过回调 + `webContents.send('skills:runtime-progress', status)` 双路推送

### 4.2 `electron/gateway/skills-cli.ts`

```ts
export class SkillsCliRunner {
  constructor(private runtime: NodeRuntime) {}

  async find(params: {
    query?: string;
    trending?: boolean;
    limit?: number;
  }): Promise<SkillSearchResult[]>;

  async install(slug: string, version?: string): Promise<void>;
  async uninstall(slug: string): Promise<void>;
  async list(): Promise<SkillListEntry[]>;
  async outdated(): Promise<OutdatedEntry[]>;
  async update(slug: string): Promise<void>;
  async cliVersion(): Promise<string>;
}
```

- 固定版本：`const PINNED_SKILLS_CLI = 'skills@<TBD>';`（首轮定后不随意升）
- 启动时异步验证版本，失败打 warning 日志但不阻塞
- 所有子命令加 `--json`，`JSON.parse` 失败即抛 `SkillsCliParseError`
- 环境变量：`CI=true FORCE_COLOR=0`，Windows 下做路径 quote

### 4.3 HTTP 路由（`electron/api/routes/skills.ts`）

| Method | Path | Body/Query | Response |
|---|---|---|---|
| POST | `/api/skills/find` | `{ query?, trending?, limit? }` | `{ success, results: SkillSearchResult[] }` |
| POST | `/api/skills/install` | `{ slug, version? }` | `{ success, error? }` |
| POST | `/api/skills/uninstall` | `{ slug }` | `{ success, error? }` |
| GET | `/api/skills/list` | — | `{ success, results }` |
| GET | `/api/skills/outdated` | — | `{ success, results, cachedAt }` |
| POST | `/api/skills/update` | `{ slug }` | `{ success, error? }` |
| POST | `/api/skills/open-readme` | `{ skillKey, slug, baseDir }` | `{ success, error? }` |
| POST | `/api/skills/open-path` | `{ skillKey, slug, baseDir }` | `{ success, error? }` |
| GET/POST | `/api/skills/configs` | —/`{ skillKey, apiKey, env }` | `{ success, data? }` |
| POST | `/api/skills/ensure-node` | — | `{ success, status: NodeRuntimeStatus }` |
| GET | `/api/skills/runtime-status` | — | `{ status: NodeRuntimeStatus }` |

- 所有路由错误走 `normalizeAppError` → `{ success: false, error: <errorKey> }`
- `ensure-node` 启动下载后立即返回，进度走 `webContents.send`

### 4.4 清理项

- [ ] 删除 `electron/gateway/clawhub.ts`
- [ ] 删除 `/api/clawhub/*` 所有路由
- [ ] 检查并删除未使用的 `ClawHubService` 导入

---

## 5. 前端改造详细方案

### 5.1 分类与权限工具（`lib/`）

```ts
// source-taxonomy.ts
export type SkillCategory = 'bundled' | 'local' | 'remote';
export function categorizeSkill(skill: Skill): SkillCategory;
export function getCategoryLabel(c: SkillCategory, t: TFunction): string;

// skill-permissions.ts
export interface SkillPermissions {
  canToggle: boolean;
  canUninstall: boolean;
  canConfigure: boolean;
  canUpdate: boolean;
  canOpenFolder: boolean;
}
export function resolvePermissions(
  skill: Skill,
  category: SkillCategory,
): SkillPermissions;
```

### 5.2 主页组件层级

```
Skills (index.tsx)
├── PageHeader (标题 + 副标题 + 刷新按钮 + Node runtime banner)
├── FilterSearchInput (跨 section 过滤)
└── SkillList
    ├── SkillSection[bundled]
    │   └── SkillRow[] (disabled uninstall button)
    ├── Divider
    ├── SkillSection[local] (标题栏：「打开目录」)
    │   └── SkillRow[] (uninstall 需 danger 确认)
    ├── Divider
    └── SkillSection[remote] (标题栏：「打开目录」 + 「技能商店」)
        └── SkillRow[] (含 UpdateBadge)
```

- `SkillSection` 空态处理：自带空态隐藏；本地/远程空态显示引导
- 过滤时若 section 全被过滤掉，整个 section 隐藏（含 Divider）

### 5.3 `/skills/store` 路由页

```
StorePage
├── Header (返回 + 标题 + 搜索 + 来源标签)
├── RuntimeBanner (若正在下载 Node)
└── StoreResultList
    ├── Trending (当无 query 时)
    └── SearchResult (query ≥ 2 时，debounce 500ms)
        └── StoreResultRow (已装置后 + 未装置前)
```

- 回车立即触发
- 安装/卸载完不关闭页面，就地切换按钮
- 主页 `useSkillsStore.fetchSkills()` 接收 store 事件广播自动同步

### 5.4 Store 层变更（`src/stores/skills.ts`）

新增字段：

```ts
interface SkillsState {
  // 已有：skills, searchResults, loading, searching, searchError, installing, error
  outdated: Record<string, { current: string; latest: string }>;
  outdatedCheckedAt: number | null;
  nodeRuntime: NodeRuntimeStatus;
  trending: SkillSearchResult[] | null;
}
```

新增方法：

- `fetchTrending()`
- `checkOutdated(force?: boolean)`：6h 缓存
- `updateSkill(slug: string)`：调 `/api/skills/update` 后刷新列表
- `ensureNodeRuntime()`：调 `/api/skills/ensure-node` 并订阅进度
- `subscribeRuntimeProgress()`：在 store 初始化时绑定 `preload` 暴露的事件

改 URL：`/api/clawhub/*` 全部替换为 `/api/skills/*`

### 5.5 路由（`src/App.tsx`）

```tsx
<Route path="/skills" element={<Skills />} />
<Route path="/skills/store" element={<SkillsStore />} />
```

### 5.6 i18n key（en/zh/ja 同步）

```yaml
skills:
  category:
    bundled: { title, count, empty }
    local: { title, count, empty, openFolder }
    remote: { title, count, empty, openFolder, openStore }

  store:
    title, subtitle, back
    search: { placeholder, button }
    trending: { title, empty }
    installed: { badge, uninstallConfirm }
    states: { searching, noResults, error }

  update:
    available, confirmTitle, updating, success, failed

  uninstall:
    confirmLocalTitle, confirmLocalBody   # 带 {{baseDir}} 插值
    confirmRemoteTitle, confirmRemoteBody

  runtime:
    preparing: { title, progress }
    failed: { title, body, retry }
    notReady: { banner, enable }
```

---

## 6. 实施顺序（建议按此拆分提交）

### Stage 1 — 后端骨架（不影响现有页面）
1. 新增 `electron/gateway/node-runtime.ts`
2. 新增 `electron/gateway/skills-cli.ts`
3. 新增 `/api/skills/runtime-status` 和 `/api/skills/ensure-node`
4. 单元测试：`tests/unit/skills-cli.test.ts`（mock spawn）

### Stage 2 — API 迁移
1. 新增 `/api/skills/find|install|uninstall|list|outdated|update|open-*`
2. `/api/clawhub/*` 保持短暂 alias → 新路由（方便渐进切换）
3. 跑 `pnpm run comms:replay` + `pnpm run comms:compare` 确认无 regression

### Stage 3 — Store 层切换
1. `src/stores/skills.ts` URL 全部切 `/api/skills/*`
2. 新增 outdated / update / runtime 状态与方法
3. 前端 e2e smoke：主页能正常加载

### Stage 4 — 主页重构
1. 抽 `lib/source-taxonomy.ts`、`lib/skill-permissions.ts`
2. 抽 `features/SkillSection.tsx`、`features/SkillRow.tsx`
3. 改写 `index.tsx` 使用三 section
4. `features/SkillDetailSheet.tsx` 按权限矩阵重写
5. 删除全局批量按钮与顶部「打开文件夹」

### Stage 5 — Skill Store 路由页
1. 新增 `store/` 目录下全部组件
2. `App.tsx` 加路由
3. 远程 section 的「技能商店」按钮跳转
4. 装/卸载后主列表自动刷新

### Stage 6 — 清理与文档
1. 删除 `electron/gateway/clawhub.ts`
2. 删除 `/api/clawhub/*` alias
3. 更新 `README.md / README.zh-CN.md / README.ja-JP.md` 中 Skills 段落
4. 跑 `pnpm run lint && pnpm run typecheck && pnpm test`
5. 跑 `pnpm run comms:replay && pnpm run comms:compare`

---

## 7. 风险与缓解

| 风险 | 缓解措施 |
|---|---|
| `npx skills` CLI 尚未公开 / 版本不稳定 | 固定 pinned 版本；适配层所有 JSON parse 包裹错误；降级 UI 显示「CLI 不可用」 |
| Node runtime 下载失败（企业网 / 防火墙） | 顶部 banner + 重试 + 写 `~/.mimiclaw/logs/` + 提示用户自行安装 Node 后刷新 |
| 安装目录与 Gateway 扫描目录不一致 | Stage 1 手动测一次真实 `npx skills install`，确认装到 `~/.agents/skills` 并出现在 `skills.status` |
| 通信链路变更打破 comms 基线 | Stage 2/6 各跑一次 `comms:compare`，有差异即时分析 |
| 三语 i18n 漏翻 | 新 key 集中提交；CI 若有 i18n lint 则触发校验；否则 PR review checklist 强制覆盖 |
| 本地 skill 被误删 | danger 弹窗明示完整 `baseDir`；require typing 确认或双次点击（可选增强） |

---

## 8. 验收标准

- [ ] `/skills` 主页按三 section 纵向展示，Divider 分隔
- [ ] 顶部搜索框跨 section 实时过滤，空 section 整体隐藏
- [ ] 客户端自带 section 的 core skill 锁图标 + disabled
- [ ] 本地 skill 可卸载，弹窗显示 `baseDir` 全路径
- [ ] 远程 skill 有新版时显示更新徽标，点击可升级
- [ ] `/skills/store` 打开即展示 trending；输入 debounce 500ms；回车立即搜
- [ ] Store 中已装 skill 排序置后，按钮为 danger「卸载」
- [ ] 首次进入 Store 或首次安装时触发 Node runtime 下载，顶部进度条非阻塞
- [ ] 所有 `/api/clawhub/*` 路由已删除
- [ ] `electron/gateway/clawhub.ts` 已删除
- [ ] `pnpm run lint / typecheck / test / comms:replay / comms:compare` 全绿
- [ ] 三语 README Skills 段落已更新

---

## 9. 参考

- lobe-chat 实现：`/Users/liangpingbo/Desktop/4399/frontend/lobe-chat/src/routes/(main)/settings/skill/`
- 项目通信规则：`AGENTS.md` §comms-change checklist、`CLAUDE.md` §Communication Changes
- 现有 skills 相关文件：
  - `src/pages/Skills/index.tsx`
  - `src/stores/skills.ts`
  - `src/types/skill.ts`
  - `electron/gateway/clawhub.ts`（待删）
  - `electron/api/routes/skills.ts`
  - `electron/utils/paths.ts`（`getMimiClawConfigDir()`）
