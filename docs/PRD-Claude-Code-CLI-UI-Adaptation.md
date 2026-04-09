# PRD: MiniChat 浮窗 Claude Code CLI 交互体验复刻

> **版本**: v1.0  
> **日期**: 2026-04-07  
> **状态**: Draft  
> **Owner**: MimiClaw 前端团队

---

## 1. 概述

### 1.1 背景

MimiClaw 桌面端已通过 `CodeAgentManager` + `claude-sidecar.mjs` + `claude-snapshot-adapter.mjs` 管线实现了 Claude Code CLI 的基础调用能力。用户可以在 MiniChat 浮窗中通过 `@code` 提及触发 CLI 编程任务。

然而，当前的 UI 呈现（`CodeAgentFeed` 组件）仅提供极简的工具名+摘要行和流式 Markdown 输出，与 Claude Code CLI 原生终端体验相比缺失了大量核心交互：

- 无思考过程展示
- 权限提示为通用卡片，无工具特定 UI
- 无 diff 代码预览
- 无子任务嵌套展示
- 无 MCP 引出式交互
- 无上下文压缩/限流/重试/Hook 等系统状态展示

### 1.2 目标

在 **MiniChat 浮窗**内实现一套定制 UI 组件，**完整复刻** Claude Code CLI 终端的 12 项核心交互体验，使用户在浮窗中获得与 CLI 终端一致的信息密度和操作能力。

### 1.3 非目标

- 不新建独立的 Code Agent 全功能页面（全部在 MiniChat 浮窗内完成）
- 不做工具卡片的展开/折叠交互
- 不做 diff 的 side-by-side 双栏视图
- 不做 hunk 级别的接受/拒绝操作
- 不支持多级子代理嵌套（超过 1 级一律扁平化）

---

## 2. 设计决策汇总

| # | 决策领域 | 选定方案 |
|---|---------|---------|
| 1 | 交互范围 | 全部 12 项 CLI 交互 |
| 2 | 渲染目标 | MiniChat 浮窗 |
| 3 | 消息协议 | 透传原始 SDK Message，渲染层完整解析 |
| 4 | Diff 展示 | 折叠摘要 + 展开 unified diff + 「在编辑器中打开」 |
| 5 | 权限提示 | 每个工具独立权限组件 |
| 6 | 工具卡片 | 紧凑行模式（终端日志风格），不做展开折叠 |
| 7 | 思考过程 | 内联灰色流式展示 |
| 8 | 子任务进度 | 缩进嵌套 + 左侧彩色竖线 |
| 9 | MCP Elicitation | `@rjsf/core` 动态表单生成 |
| 10 | 上下文压缩 | 系统分隔线 |
| 11 | Session 初始化 | Header 显示模型名 + 消息流中 init 卡片 |
| 12 | 限流/重试/Hook | 内联系统通知行 |
| 13 | 状态管理 | 新建 Zustand Store `src/stores/code-agent.ts` |

---

## 3. 12 项交互体验详细规格

### 3.1 流式文本输出（Streaming Text）

**对标 CLI 行为**：助手回答逐字流式输出，带闪烁光标。

**UI 规格**：
- 流式文本通过 `stream_event` 中的 `content_block_delta` + `text_delta` 驱动
- 使用 `Markdown` 组件渲染，末尾带 `▌` 闪烁块光标（复用现有 `streamCursor` CSS）
- 流式阶段禁止用户发送新消息（`codeSending` 状态锁定 Composer）
- 完成后光标消失，文本定格为最终 assistant 消息

**数据流**：
```
CLI stdout → stream_event {content_block_delta, text_delta}
  → sidecar 透传 → IPC code-agent:sdk-message
  → Store 累加 streamingText → 组件渲染
```

### 3.2 思考/推理过程（Thinking Blocks）

**对标 CLI 行为**：Claude 的 extended thinking 实时流式输出，用较暗颜色区分。

**UI 规格**：
- `content_block_start` 中 `type: 'thinking'` 触发思考区域
- 思考内容以**浅灰色斜体**内联展示在助手回答上方，实时流式输出
- 字体：`opacity: 0.55`，`font-style: italic`，`font-size: 12px`（比正文小 1px）
- 思考完成后，思考块与正式回答之间有 `4px` 间距分隔
- `redacted_thinking` 类型 → 显示 "🔒 部分推理过程已隐藏"（灰色，不可交互）
- 思考阶段头部行的 spinner 模式为 `thinking`

**数据映射**：
| stream_event | UI 行为 |
|-------------|---------|
| `content_block_start {type: 'thinking'}` | 进入思考区，显示灰色区域 |
| `content_block_delta {thinking_delta}` | 追加灰色文本 |
| `content_block_stop` | 思考区定格 |
| `content_block_start {type: 'text'}` | 切换到正式回答区域 |

### 3.3 工具调用卡片（Tool Use Cards）

**对标 CLI 行为**：每个工具调用显示为终端日志行。

**UI 规格 — 紧凑行模式**：
- 每个工具调用渲染为**单行**：`[图标] ToolName · inputSummary [状态指示器]`
- 不做点击展开/折叠
- 行高 `24px`，`font-family: monospace`，`font-size: 11px`

**工具图标映射**：

| toolName | 图标 | 显示名 |
|----------|------|--------|
| Read / FileRead | 📄 | Read |
| Write / FileWrite | 📝 | Write |
| Edit / FileEdit | ✏️ | Edit |
| Bash / BashTool | 💻 | Bash |
| Grep | 🔍 | Grep |
| Glob | 📂 | Glob |
| WebFetch | 🌐 | Fetch |
| Agent / Task | ⚙️ | Task |
| MCP tool | 🔌 | MCP:{toolName} |
| NotebookEdit | 📓 | Notebook |
| 其他 | 🔧 | {toolName} |

**状态指示器**：

| 状态 | 图标 | 说明 |
|------|------|------|
| streaming input | `⟳` (旋转动画) | 参数还在流式接收 |
| executing | `⟳` (旋转动画) | 等待执行结果 |
| awaiting permission | `🛡️` | 需要用户授权 |
| completed | `✓` (绿色) | 执行成功 |
| failed | `✗` (红色) | 执行失败 |

**inputSummary 提取规则**：
- `Bash`: 显示命令字符串前 60 字符
- `Read/Write/Edit`: 显示文件路径
- `Grep/Glob`: 显示 pattern
- `WebFetch`: 显示 URL
- `Agent`: 显示任务描述前 40 字符
- 其他: JSON.stringify(input) 前 60 字符

### 3.4 权限提示（Permission Prompts）

**对标 CLI 行为**：每种工具有独立的权限 UI，展示工具特定的关键信息。

**架构**：每个工具一个独立权限组件，共享外壳结构（Header + 内容区 + 操作按钮）。

**共享外壳**：
```
┌─ 🛡️ 允许 {ToolDisplayName} 操作？ ──────┐
│                                            │
│   [工具特定内容区]                          │
│                                            │
│                    [拒绝]  [允许]  [始终允许] │
└────────────────────────────────────────────┘
```

**工具特定权限组件清单**：

| 组件 | 适用工具 | 内容区展示 |
|------|---------|-----------|
| `FileEditPermissionCard` | FileEdit | 文件路径 + mini unified diff（old→new） |
| `FileWritePermissionCard` | FileWrite | 目标路径 + 内容预览（前 10 行） |
| `BashPermissionCard` | Bash/BashTool | 工作目录 + 命令代码块（语法高亮） |
| `WebFetchPermissionCard` | WebFetch | URL 链接（可点击） |
| `FilesystemPermissionCard` | Glob/Grep/FileRead | 路径或 pattern + 操作说明 |
| `NotebookEditPermissionCard` | NotebookEdit | notebook 路径 + cell 索引 + 变更预览 |
| `AgentPermissionCard` | Agent/Task | 子任务描述 + 代理类型 |
| `McpToolPermissionCard` | MCP tools | server 名 + tool 名 + input 摘要 |
| `FallbackPermissionCard` | 未知工具 | rawInput JSON 格式化展示 |

**权限操作**：
- 「拒绝」→ `decision: 'deny'`
- 「允许」→ `decision: 'allow'`
- 「始终允许」→ 可选扩展：发送 `permission_suggestions` 给 CLI 以更新白名单

**数据来源**：
- `SDKControlPermissionRequestSchema` 包含 `tool_name`, `input`, `tool_use_id`, `title`, `description`, `permission_suggestions`, `blocked_path`
- sidecar 透传完整的 `input` 对象（不再仅传 `inputSummary`）

### 3.5 Diff 代码展示

**对标 CLI 行为**：`FileEditTool` / `FileWriteTool` 执行后展示结构化 diff。

**UI 规格 — 折叠摘要 + 展开 unified diff**：

**折叠态（默认）**：
```
📄 src/utils/parser.ts  +15 -8
```
- 一行：文件图标 + 文件路径 + 绿色 `+N` / 红色 `-M` badge
- 多文件垂直堆叠，每个文件独立一行
- 点击行切换展开/折叠

**展开态**：
```
📄 src/utils/parser.ts  +15 -8            [在编辑器中打开]
───────────────────────────────────────
  23 │  function parse(input: string) {
  24 │-   return input.split(',');
  24 │+   return input
  25 │+     .split(',')
  26 │+     .map(s => s.trim())
  27 │+     .filter(Boolean);
  28 │  }
```
- Unified diff 格式，行号 3 位数宽度
- 删除行：红色背景 `rgba(255,0,0,0.08)` + 红色文字
- 新增行：绿色背景 `rgba(0,255,0,0.08)` + 绿色文字
- 上下文行：正常颜色
- 基础语法高亮（复用现有 code block CSS 的 keyword/string/comment 颜色）
- hunk 之间用 `@@ ... @@` 分隔行

**「在编辑器中打开」按钮**：
- 位于展开态右上角
- 点击通过 IPC 调用 `code-agent:open-in-editor`（新增 IPC channel）
- 传递 `{ filePath, workspaceRoot }` 给主进程
- 主进程调用系统命令打开文件（`code`, `cursor`, `vim` 等，可配置）

**Diff 数据来源**：
- `assistant` 消息中 `tool_use` block 的 `input`（包含 `old_content` / `new_content` 或 `file_path` / `content`）
- 使用 `diff` npm 包的 `createPatch` / `structuredPatch` 生成 `StructuredPatchHunk`
- 对于 `FileWrite`（全新文件），entire content 为 `+` 行

### 3.6 工具结果展示（Tool Results）

**对标 CLI 行为**：工具完成后展示结果摘要。

**UI 规格**：
- 工具行的状态指示器变为 `✓` 或 `✗`
- 结果摘要以浅灰色小字追加在工具行末尾（同一行内）
- 格式：`[图标] ToolName · inputSummary ✓ resultSummary`
- 例如：`📄 Read · src/app.ts ✓ 156 lines`
- 例如：`💻 Bash · npm test ✓ exit 0, 23 lines`
- 例如：`💻 Bash · rm -rf / ✗ permission denied`

**特殊结果处理**：
- `Bash` 的 `stdout`/`stderr` 不在行内展示完整内容，只显示行数统计
- `Read` 的文件内容不在行内展示，只显示行数
- `Grep`/`Glob` 显示匹配数量

### 3.7 子任务/Subagent 进度

**对标 CLI 行为**：子代理任务缩进展示在父级会话中。

**UI 规格 — 缩进嵌套 + 左侧竖线**：

```
⚙️ Task · "重构 utils 模块"  ⟳
┃  📄 Read · src/utils/index.ts ✓ 89 lines
┃  ✏️ Edit · src/utils/parser.ts ✓
┃  💻 Bash · npm test ✓ exit 0
┃  重构完成，合并了 3 个工具函数...
⚙️ Task · "重构 utils 模块"  ✓
```

- 子任务起始行：`⚙️ Task · "{description}" [状态]`
- 子任务内部内容：左侧 `2px` 蓝色竖线（`border-left: 2px solid {token.colorPrimary}`）+ `12px` 左内边距
- 内部复用所有父级组件（工具行、流式文本、思考块等）
- 子任务结束行：重复起始行但状态变为 `✓` 或 `✗`
- 超过 1 级嵌套的子任务一律扁平化展示（不再加更多缩进）

**数据映射**：
| SDK 消息 | UI 行为 |
|---------|---------|
| `system.task_started` | 插入起始行，开始缩进区域 |
| `system.task_progress` | 更新进度（`last_tool_name`, `summary`），区域内追加 |
| `system.task_notification` | 插入结束行，结束缩进区域 |
| `tool_progress` (with `task_id`) | 归入对应子任务区域 |

### 3.8 MCP Elicitation（引出式交互）

**对标 CLI 行为**：MCP server 请求用户结构化输入。

**UI 规格 — `@rjsf/core` 动态表单**：

```
┌─ 🔌 MCP: github-server 请求输入 ──────┐
│                                         │
│  选择仓库:  [▼ my-org/my-repo    ]     │
│  分支名称:  [feature/xxx          ]     │
│  描述:      [本次变更的说明...     ]     │
│                                         │
│                    [取消]  [提交]        │
└─────────────────────────────────────────┘
```

- 卡片出现在消息流底部（与权限卡片同位置，`inputDock` 区域）
- 使用 `@rjsf/core` 根据 `requested_schema`（JSON Schema）自动生成表单
- 字段类型映射：`string` → Input，`number` → NumberInput，`boolean` → Switch，`enum` → Select，`array` → MultiSelect
- 表单验证：`@rjsf/core` 内置 JSON Schema 验证
- 提交 → `control_response` with `action: 'accept'` + `content: formValues`
- 取消 → `control_response` with `action: 'decline'`
- Fallback：schema 过于复杂（超过 10 个字段）时，降级为 JSON 编辑器（monospace textarea）

**新增依赖**：`@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8`

### 3.9 上下文压缩（Compact Boundary）

**对标 CLI 行为**：对话过长时触发 compaction，显示系统分隔线。

**UI 规格 — 系统分隔线**：

```
──── 上下文已压缩 (12.3k → 4.1k tokens) ────
```

- 水平居中的分隔线，左右各带横线延伸
- 文字：`font-size: 11px`，`color: {token.colorTextQuaternary}`
- 线：`1px dashed {token.colorBorderSecondary}`
- token 数从 `compact_metadata.pre_tokens` 提取
- 插入位置：在压缩发生的时间点，作为 `kind: "system"` 的 TimelineItem

### 3.10 Session 初始化展示

**对标 CLI 行为**：会话启动时显示模型、工具、权限等元信息。

**UI 规格 — Header + 消息流卡片双层展示**：

**Header 增强**（`MiniChatHeader` 动态岛内）：
- 在现有 workspace 路径下方追加一行：模型短名（如 `sonnet-4`）
- 紧凑排列，不增加 header 高度

**消息流 Init 卡片**：
```
🤖 claude-sonnet-4-20250514 · acceptEdits · 15 tools · 2 MCP servers
```
- 样式复用 `systemNotice` CSS class
- 单行或两行紧凑展示
- 只在会话开始时出现一次

**数据来源**：`SDKSystemMessageSchema` 中 `subtype: 'init'`，包含：
- `model` → 模型名
- `permissionMode` → 权限模式
- `tools` → 工具列表（取 `.length`）
- `mcp_servers` → MCP 服务器列表（取 `.length` + 状态）
- `cwd` → 工作目录（Header 已有，不重复）

### 3.11 限流与重试（Rate Limit / API Retry）

**对标 CLI 行为**：API 限流时显示等待倒计时，重试时显示重试次数。

**UI 规格 — 内联系统通知行**：

**Rate Limit**：
```
⏳ API 限流 · 等待 28s… (5h 窗口使用率 73%)
```
- 倒计时实时更新（`setInterval` 每秒减 1）
- 从 `SDKRateLimitEventSchema` 提取 `resetsAt`（epoch ms）计算剩余时间
- `utilization` 百分比作为辅助信息
- `status: 'rejected'` 时文字变红

**API Retry**：
```
🔄 API 重试 · 第 2/3 次 · 等待 5.0s · server_error
```
- 从 `SDKAPIRetryMessageSchema` 提取 `attempt`, `max_retries`, `retry_delay_ms`, `error`
- 行样式同 `systemNotice`

### 3.12 Hook 通知

**对标 CLI 行为**：用户自定义 hook 的执行状态通知。

**UI 规格 — 内联系统通知行**：

**Hook Started**：
```
🪝 Hook: pre-commit (PreToolUse) 执行中…
```

**Hook Progress**（如有 stdout 输出）：
```
🪝 Hook: pre-commit · formatting 3 files...
```

**Hook Response**：
```
🪝 Hook: pre-commit ✓ (0.8s)
```
或
```
🪝 Hook: pre-commit ✗ exit 1 (1.2s)
```

- `hook_name` + `hook_event` 组成标题
- `outcome: 'success'` → 绿色 `✓`，`outcome: 'error'` → 红色 `✗`
- `exit_code` 和 `stdout`（截取前 80 字符）作为辅助信息

---

## 4. 技术架构

### 4.1 数据管线改造

**当前管线**（简化解析，丢失大量信息）：

```
Claude CLI stdout (NDJSON)
  → claude-snapshot-adapter.mjs (提取 text_delta + tool_use name)
  → claude-sidecar.mjs (trace 事件)
  → CodeAgentManager (4 种 IPC 事件)
  → MiniChat (token/activity/tool-result/permission)
```

**目标管线**（透传原始 SDK Message）：

```
Claude CLI stdout (NDJSON)
  → claude-snapshot-adapter.mjs (原样转发 + 保留现有简化事件做兼容)
  → claude-sidecar.mjs (新增 raw-message 通道)
  → CodeAgentManager (新增 sdk-message 事件 + 保留旧事件)
  → IPC code-agent:sdk-message (原始 JSON)
  → Zustand Store code-agent.ts (解析 + 状态管理)
  → MiniChat 组件 (渲染)
```

**改动点**：

1. **`claude-snapshot-adapter.mjs`**：在 `runClaudeCliTask` 中，每解析一行 JSONL，除了现有的 trace 事件，新增 `emitTrace('run:sdk-message', rawJsonObject)`
2. **`claude-sidecar.mjs`**：新增 `run:sdk-message` → `{ type: 'sdk-message', payload: rawJsonObject }` 转发
3. **`CodeAgentManager`**：监听 `sdk-message` 事件，通过 IPC 广播 `code-agent:sdk-message` 到所有窗口
4. **`electron/preload/index.ts`**：allowlist 中添加 `code-agent:sdk-message`
5. **`src/lib/host-events.ts`**：注册 `code-agent:sdk-message` 事件通道
6. 旧的 `code-agent:token` / `code-agent:activity` / `code-agent:tool-result` / `code-agent:permission-request` 保留，确保向后兼容

### 4.2 状态管理 — `src/stores/code-agent.ts`

新建 Zustand Store，职责：接收原始 SDK 消息 → 解析 → 维护结构化 UI 状态。

```typescript
interface CodeAgentStore {
  // === Session 元信息 ===
  sessionId: string | null;
  sessionInit: SDKSystemInit | null; // model, tools, mcp_servers, permissionMode
  sessionState: 'idle' | 'running' | 'requires_action';

  // === 消息流（已完成的消息） ===
  messages: CodeAgentTimelineItem[];

  // === 流式状态（当前 turn 的实时数据） ===
  streaming: {
    thinkingText: string;
    isThinking: boolean;
    assistantText: string;
    isStreaming: boolean;
    toolUses: StreamingToolUse[]; // 当前 turn 中活跃的工具调用
    spinnerMode: 'requesting' | 'thinking' | 'tool-input' | 'tool-use' | 'responding' | null;
  };

  // === 权限请求队列 ===
  pendingPermission: SDKPermissionRequest | null;

  // === MCP Elicitation ===
  pendingElicitation: SDKElicitationRequest | null;

  // === 子任务追踪 ===
  activeTasks: Map<string, TaskState>; // task_id → state

  // === 系统通知 ===
  rateLimitInfo: SDKRateLimitInfo | null;

  // === Actions ===
  pushSdkMessage: (raw: unknown) => void;    // 核心：解析并分派 SDK 消息
  respondPermission: (requestId: string, decision: 'allow' | 'deny') => void;
  respondElicitation: (action: 'accept' | 'decline', content?: Record<string, unknown>) => void;
  reset: () => void;
}
```

**消息解析分派逻辑**（`pushSdkMessage` 核心）：

```typescript
switch (msg.type) {
  case 'system':
    switch (msg.subtype) {
      case 'init':           → 更新 sessionInit + 推入 init 卡片
      case 'compact_boundary': → 推入分隔线 TimelineItem
      case 'status':          → 更新 sessionState
      case 'api_retry':       → 推入重试通知行
      case 'hook_started':    → 推入 hook 通知行
      case 'hook_progress':   → 更新最近 hook 行的内容
      case 'hook_response':   → 更新最近 hook 行的最终状态
      case 'task_started':    → activeTasks.set + 推入子任务起始行
      case 'task_progress':   → activeTasks 更新
      case 'task_notification': → activeTasks 结束 + 推入子任务结束行
      case 'session_state_changed': → sessionState 更新
    }
  case 'assistant':        → 推入完成的 assistant 消息（含 content blocks）
  case 'user':             → 推入 user 消息（含 tool_result）
  case 'stream_event':     → 更新 streaming 状态（text_delta/thinking_delta/tool_use_delta）
  case 'result':           → 推入结果摘要行
  case 'rate_limit_event': → 更新 rateLimitInfo + 推入限流通知行
  case 'tool_progress':    → 更新对应 tool 的 elapsed time
  case 'tool_use_summary': → 推入工具使用摘要行
  case 'auth_status':      → 推入认证状态通知
}
```

### 4.3 TimelineItem 类型扩展

```typescript
type CodeAgentTimelineItem =
  | { kind: 'init';              data: SessionInitData }
  | { kind: 'thinking';          data: ThinkingBlockData }
  | { kind: 'assistant-text';    data: AssistantTextData }
  | { kind: 'tool-use';         data: ToolUseLineData }
  | { kind: 'tool-result';      data: ToolResultData }
  | { kind: 'diff';             data: DiffData }
  | { kind: 'user';             data: UserMessageData }
  | { kind: 'system-notice';    data: SystemNoticeData }     // compact_boundary, api_retry, hook, etc.
  | { kind: 'rate-limit';       data: RateLimitData }
  | { kind: 'task-boundary';    data: TaskBoundaryData }     // 子任务起止
  | { kind: 'result';           data: ResultData }           // turn 完成结果
```

### 4.4 组件架构

```
src/pages/MiniChat/
├── components/
│   ├── MiniChatTimeline.tsx          (改造：接入新 store，渲染新 item 类型)
│   ├── MiniChatComposer.tsx          (微调：elicitation 状态下禁用)
│   ├── MiniChatHeader.tsx            (改造：显示模型名)
│   ├── MiniChatPermissionCard.tsx    (废弃，迁移到新权限组件)
│   ├── CodeAgentFeed.tsx             (废弃，功能拆分到新组件)
│   ├── TypingIndicator.tsx           (保留)
│   └── code-agent/                   ← 新建目录
│       ├── CodeTimeline.tsx          (Code Agent 专用时间线渲染器)
│       ├── StreamingText.tsx         (流式文本 + 光标)
│       ├── ThinkingBlock.tsx         (灰色斜体思考流)
│       ├── ToolUseLine.tsx           (紧凑工具行)
│       ├── DiffView.tsx              (折叠/展开 unified diff)
│       ├── DiffHunk.tsx              (单个 diff hunk 渲染)
│       ├── SystemNotice.tsx          (通用系统通知行)
│       ├── RateLimitNotice.tsx       (限流倒计时行)
│       ├── HookNotice.tsx            (Hook 通知行)
│       ├── TaskBoundary.tsx          (子任务起止 + 缩进容器)
│       ├── InitCard.tsx              (Session init 卡片)
│       ├── ResultSummary.tsx         (Turn 完成结果摘要)
│       ├── ElicitationForm.tsx       (MCP 动态表单)
│       └── permissions/              ← 工具特定权限组件
│           ├── PermissionCardShell.tsx      (共享外壳)
│           ├── FileEditPermissionCard.tsx
│           ├── FileWritePermissionCard.tsx
│           ├── BashPermissionCard.tsx
│           ├── WebFetchPermissionCard.tsx
│           ├── FilesystemPermissionCard.tsx
│           ├── NotebookEditPermissionCard.tsx
│           ├── AgentPermissionCard.tsx
│           ├── McpToolPermissionCard.tsx
│           └── FallbackPermissionCard.tsx
```

### 4.5 IPC 通道新增

| 通道名 | 方向 | 用途 |
|--------|------|------|
| `code-agent:sdk-message` | Main → Renderer | 透传原始 SDK JSON |
| `code-agent:open-in-editor` | Renderer → Main | 在编辑器中打开文件 |
| `code-agent:respond-elicitation` | Renderer → Main | 回复 MCP elicitation |

现有通道保留不变：
- `code-agent:token` — 向后兼容
- `code-agent:activity` — 向后兼容
- `code-agent:tool-result` — 向后兼容
- `code-agent:permission-request` — 向后兼容（新权限组件也可直接从 sdk-message 获取）
- `code-agent:respond-permission` — 保留

### 4.6 新增依赖

| 包名 | 用途 | 备注 |
|------|------|------|
| `@rjsf/core` | MCP Elicitation 动态表单 | JSON Schema → React 表单 |
| `@rjsf/utils` | rjsf 工具库 | @rjsf/core peer dep |
| `@rjsf/validator-ajv8` | JSON Schema 验证 | @rjsf/core peer dep |
| `diff` | Diff 生成 | 可能已存在；用于 `structuredPatch` |

---

## 5. 实施计划

### Phase 1：数据管线（预计 3 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| 1.1 | `resources/code-agent/claude-snapshot-adapter.mjs` | `runClaudeCliTask` 中新增 `run:sdk-message` trace |
| 1.2 | `resources/code-agent/claude-sidecar.mjs` | 转发 `sdk-message` 到 stdout |
| 1.3 | `electron/code-agent/manager.ts` | 监听 `sdk-message`，IPC 广播 |
| 1.4 | `electron/preload/index.ts` | allowlist 添加 `code-agent:sdk-message` |
| 1.5 | `src/lib/host-events.ts` | 注册新事件通道 |
| 1.6 | 端到端验证 | `console.log` 确认渲染进程收到完整 SDK JSON |

### Phase 2：状态管理（预计 2 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| 2.1 | `src/stores/code-agent.ts` | 新建 Zustand Store，定义完整 state/actions |
| 2.2 | `src/pages/MiniChat/types.ts` | 扩展 `CodeAgentTimelineItem` 联合类型 |
| 2.3 | `src/pages/MiniChat.tsx` | 迁移：组件内 useState → store selectors |
| 2.4 | 单元测试 | `pushSdkMessage` 的消息解析分派测试 |

### Phase 3：核心 UI 组件（预计 5 天）

| 任务 | 优先级 | 组件 |
|------|--------|------|
| 3.1 | P0 | `StreamingText.tsx` — 流式文本 + 光标 |
| 3.2 | P0 | `ThinkingBlock.tsx` — 灰色斜体思考流 |
| 3.3 | P0 | `ToolUseLine.tsx` — 紧凑工具行 |
| 3.4 | P0 | `CodeTimeline.tsx` — 组装器，分派 TimelineItem → 对应组件 |
| 3.5 | P0 | `DiffView.tsx` + `DiffHunk.tsx` — diff 展示 |
| 3.6 | P1 | `SystemNotice.tsx` — 通用系统通知行 |
| 3.7 | P1 | `InitCard.tsx` — Session init 卡片 |
| 3.8 | P1 | `ResultSummary.tsx` — Turn 完成结果 |

### Phase 4：权限组件（预计 3 天）

| 任务 | 组件 |
|------|------|
| 4.1 | `PermissionCardShell.tsx` — 共享外壳 |
| 4.2 | `BashPermissionCard.tsx` — 命令预览 |
| 4.3 | `FileEditPermissionCard.tsx` — diff 预览（复用 DiffView） |
| 4.4 | `FileWritePermissionCard.tsx` — 内容预览 |
| 4.5 | `FilesystemPermissionCard.tsx` — 路径/pattern |
| 4.6 | `WebFetchPermissionCard.tsx` — URL |
| 4.7 | `AgentPermissionCard.tsx` + `McpToolPermissionCard.tsx` + `NotebookEditPermissionCard.tsx` |
| 4.8 | `FallbackPermissionCard.tsx` — 兜底 |

### Phase 5：高级交互（预计 4 天）

| 任务 | 组件 |
|------|------|
| 5.1 | `TaskBoundary.tsx` — 子任务嵌套 + 左竖线 |
| 5.2 | `ElicitationForm.tsx` — `@rjsf/core` 集成 |
| 5.3 | `RateLimitNotice.tsx` — 倒计时 |
| 5.4 | `HookNotice.tsx` — Hook 生命周期 |
| 5.5 | `MiniChatHeader.tsx` 改造 — 模型名展示 |
| 5.6 | `code-agent:open-in-editor` IPC — 编辑器打开 |

### Phase 6：集成联调与清理（预计 3 天）

| 任务 | 说明 |
|------|------|
| 6.1 | `MiniChatTimeline.tsx` 全面改造，接入 `CodeTimeline` |
| 6.2 | 废弃旧 `CodeAgentFeed.tsx`、旧 `MiniChatPermissionCard.tsx` |
| 6.3 | 端到端测试：完整的 CLI 会话在浮窗中跑通 |
| 6.4 | 性能验证：大量 SDK 消息（500+ 条）的渲染性能 |
| 6.5 | 样式微调：暗色/亮色主题适配 |

**总计预估：约 20 个工作日（4 周）**

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| SDK Message 格式不完整（vendor 快照缺少 generated types） | 解析错误 | 以 `coreSchemas.ts` 的 Zod schema 为准，运行时做 `safeParse`，解析失败的消息降级为 `system-notice` |
| 浮窗空间不足（380-450px 宽度） | diff/表单展示拥挤 | diff 默认折叠；elicitation 表单限制字段数；超长内容截断 + tooltip |
| 大量 SDK 消息导致渲染性能问题 | 卡顿 | Store 中维护最近 200 条 TimelineItem 的滑动窗口；使用 `react-window` 虚拟化 timeline（如需） |
| 旧事件通道与新 sdk-message 通道数据重复 | 消息重复展示 | Store 中做 uuid 去重；旧通道仅作兼容层，UI 优先消费 sdk-message |
| `@rjsf/core` 包体积影响 | 首屏加载 | 动态 `import()` 延迟加载，仅在出现 elicitation 时加载 |

---

## 7. 成功标准

1. **功能完整性**：12 项 CLI 交互全部在 MiniChat 浮窗中可操作
2. **视觉一致性**：与 Claude Code CLI 终端的信息密度和节奏感对齐（审核标准：截图对比）
3. **性能**：500 条 SDK 消息的会话，timeline 滚动 60fps 无卡顿
4. **兼容性**：旧的 `code-agent:token` / `activity` 等事件通道不受影响，未升级的消费方正常工作
5. **可维护性**：新增组件独立在 `code-agent/` 目录，不污染现有 MiniChat 聊天功能
