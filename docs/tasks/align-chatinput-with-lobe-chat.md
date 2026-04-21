# 对齐 MimiClaw ChatInput 到 lobe-chat MainChatInput

> Owner: TBD · Status: Proposed · Target: big-bang replace on feature branch
> Upstream reference: `lobe-chat/src/routes/(main)/agent/features/Conversation/MainChatInput/index.tsx`
> 当前文件: `src/features/mainChat/components/ChatInput.tsx`（1022 行单体）

---

## 0. 背景与总目标

lobe-chat 的 `MainChatInput` 只是一层 60 行壳，真实的架构分布在：

1. **`src/features/ChatInput`** — 可复用的输入框基础设施（Provider + Store + ActionBar 插件化 + `@lobehub/editor` 集成 + SendArea + TypoBar + RuntimeConfig + Desktop/Mobile 双端）。
2. **`src/features/Conversation/ChatInput`** — 把 1 绑定到会话上下文（`useConversationStore` 桥接发送 / 停止 / 错误 / 拦截 / 队列 / 文件 / 上下文选择）。
3. **`src/routes/(main)/agent/features/Conversation/MainChatInput`** — route-level 端点，只负责组装 `leftActions` / `rightActions` / `sendMenu` / `onEditorReady`。

本 task 的目标是在 MimiClaw 内镜像这三层结构，用 `@lobehub/editor`（已装 v4.5.0）替换自研 `UnifiedComposerInput`，并把 17 个 ActionBar actions 全部接入对应的 MimiClaw store。

---

## 1. Non-goals（明确丢弃）

以下功能本次一并从 MimiClaw 移除或迁出 ChatInput：

| 原功能 | 处置 |
|---|---|
| MediaRecorder 录音（main 输入框） | 重构为 lobe-chat 风格的 `STT` action（共用 MimiClaw 后端的 STT 服务）。Pet 子窗口保留录音 UI，作为 STT action 的 pet 特化模板 |
| 屏幕截图按钮 + `screenshot:capture` IPC | 彻底删除（含全局快捷键注册）|
| Gateway 状态 footer（`composer.gatewayStatus`）| 从主 ChatInput 移除。连接状态展示只保留在 Pet 子窗口 |
| Agent 选择器 dropdown（`targetAgentId` 路由消息到其他 agent） | 彻底删除。跨 agent 消息能力由 `@lobehub/editor` 的 Mention 菜单承接 |
| 拖拽路径系统（`UnifiedComposerPath` / `toOpenClawSubmission`） | 彻底删除。文件拖入走统一的 `fileUpload`，裸路径不再受支持 |
| 响应语言注入（`applyResponseLanguageToPrompt`） | 删除。语言偏好改为 agent 级 system prompt 配置 |
| `mode="code"` 分支（`CodeModeChatInput`） | 彻底删除，`src/pages/CodeChat`、`src/features/codeChat`、`electron/main/code-chat-window.ts` 同步清理 |
| `src/features/mainChat/components/composer.tsx` + `unified-composer-input.tsx` + `composer-helpers.ts` + `composer-shell.ts` + `src/lib/unified-composer.ts` | 编辑器替换后一并删除 |

> 前提：本文档假设 git status 中未提交的 code-chat / quickChat 重构已落地并 merge。

---

## 2. 目标目录结构（DR2：复用 `src/features/mainChat`）

```
src/
├── features/
│   ├── mainChat/
│   │   ├── ChatInput/                   # 镜像 lobe-chat src/features/ChatInput
│   │   │   ├── index.ts
│   │   │   ├── ChatInputProvider.tsx
│   │   │   ├── StoreUpdater.tsx
│   │   │   ├── RuntimeConfig/
│   │   │   ├── TypoBar/
│   │   │   ├── InputEditor/             # 包 @lobehub/editor
│   │   │   ├── SendArea/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── SendButton.tsx
│   │   │   │   └── ExpandButton.tsx     # ShortcutHint 不做
│   │   │   ├── ActionBar/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── config.ts            # actionMap: 17 项
│   │   │   │   ├── context.ts
│   │   │   │   ├── components/
│   │   │   │   ├── Model/
│   │   │   │   ├── Search/
│   │   │   │   ├── Memory/
│   │   │   │   ├── Upload/              # fileUpload
│   │   │   │   ├── Tools/
│   │   │   │   ├── Typo/
│   │   │   │   ├── Params/
│   │   │   │   ├── Token/               # mainToken + portalToken
│   │   │   │   ├── PromptTransform/
│   │   │   │   ├── STT/
│   │   │   │   ├── AgentMode/
│   │   │   │   ├── Clear/
│   │   │   │   ├── History/
│   │   │   │   ├── Mention/
│   │   │   │   └── SaveTopic/
│   │   │   ├── Desktop/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── ContextContainer/
│   │   │   │   ├── ContextItem/
│   │   │   │   ├── FilePreview/
│   │   │   │   └── MentionedUsers/
│   │   │   ├── Mobile/                   # MB3：移动/Pet 子窗口复用
│   │   │   │   ├── index.tsx
│   │   │   │   └── FilePreview/
│   │   │   ├── hooks/
│   │   │   │   └── useChatInputEditor.ts
│   │   │   ├── store/
│   │   │   │   ├── index.ts
│   │   │   │   ├── initialState.ts
│   │   │   │   ├── action.ts
│   │   │   │   └── selectors.ts
│   │   │   └── types.ts
│   │   ├── Conversation/                 # 镜像 lobe-chat src/features/Conversation
│   │   │   ├── index.ts
│   │   │   ├── ConversationProvider.tsx
│   │   │   ├── StoreUpdater.tsx
│   │   │   ├── InterventionBar/
│   │   │   ├── ChatInput/
│   │   │   │   ├── index.tsx
│   │   │   │   └── QueueTray.tsx
│   │   │   ├── store/
│   │   │   │   ├── index.ts
│   │   │   │   ├── initialState.ts
│   │   │   │   ├── action.ts
│   │   │   │   └── selectors/
│   │   │   │       ├── data.ts
│   │   │   │       └── messageState.ts
│   │   │   └── types/
│   │   └── MainChatInput.tsx             # route-level 端点（替代旧 ChatInput.tsx）
│   └── ...
├── stores/
│   ├── file.ts                           # 新增（F1）
│   ├── providers.ts                      # 扩展 aiModel/aiProvider selectors（AI1）
│   ├── settings.ts                       # 扩展 preference 子切片（U1）
│   └── chat/                             # 扩展 topic/thread 模型（T1）
```

---

## 3. 产品模型新增 / 扩展

### 3.1 `stores/chat` 加 Topic 模型（T1）

- 新类型：`ChatTopic { id, sessionId, agentId, title, createdAt, updatedAt, summary? }`
- `ChatState.topicMap: Record<string, ChatTopic>`
- 消息加字段：`topicId: string | null`
- 新 actions：`createTopic(sessionId)` / `switchTopic(topicId)` / `summarizeTopic(topicId)` / `deleteTopic(topicId)`
- 新 selectors：`topicSelectors.currentTopicId`、`topicSelectors.topicsBySession(sessionId)`、`threadSelectors.currentThreadMessages`
- 后端持久化：Gateway 新增 `/topics` 端点（或复用 session 命名空间）——**后端契约独立排期**，前端先接 topic Map（IPC 若未就绪则返回 stub）

### 3.2 `stores/file.ts`（F1）

形状对齐 `fileChatSelectors`：

```ts
interface FileState {
  chatUploadFileList: ChatUploadFile[]
  chatContextSelections: ChatContextContent[]
  uploadQueue: Map<string, UploadJob>
}

// 必须实现的 selectors
fileChatSelectors.chatUploadFileListHasItem
fileChatSelectors.chatContextSelectionHasItem
fileChatSelectors.isUploadingFiles
fileChatSelectors.chatUploadFileList
fileChatSelectors.chatContextSelections
```

把现有 `ChatInput.tsx` 里的 `pickFiles` / `stageBufferFiles` 上传流程迁入 `useFileStore` actions，底层仍走 `hostApiFetch('/api/files/stage-paths'|'/api/files/stage-buffer')`。

### 3.3 `stores/providers.ts` 扩展（AI1）

在现有 providers store 旁加 selectors（不新建 store）：

```ts
aiModelSelectors.modelById(id)
aiModelSelectors.supportsSearch(id)         // 内置联网检索
aiModelSelectors.supportsFunctionCalling(id)
aiProviderSelectors.enabledProviders
aiProviderSelectors.fcSearchModels           // Search action 的 FC 模型下拉数据
```

### 3.4 `stores/settings.ts` 加 preference 子切片（U1）

```ts
interface SettingsState {
  // 既有 ...
  preference: {
    useCmdEnterToSend: boolean
    isDevMode: boolean
    hotkeys: Record<HotkeyEnum, string>
  }
}

preferenceSelectors.useCmdEnterToSend
preferenceSelectors.hotkeyById(id)
userGeneralSettingsSelectors.config          // 至少需要 isDevMode
labPreferSelectors                           // Action feature flag 开关
```

> `useUserStore` 命名保留为 `useSettingsStore`，所有对齐上游 `@/store/user` 的 import 改读 `useSettingsStore`。

---

## 4. 子任务（C2：一次性成文，8 个并行模块）

本 task 不设 Phase，全部并行推进；**`M1 → M2 → M3..M10`** 为拓扑次序（M1/M2 是基础不可并行，M3-M10 可并行）。

### M1. Store 基建（阻塞其他所有模块）

- [M1.1] 新建 `src/stores/file.ts` + selectors + tests
- [M1.2] 扩展 `src/stores/settings.ts` preference 子切片 + selectors + tests
- [M1.3] 扩展 `src/stores/providers.ts` aiModel / aiProvider selectors + tests
- [M1.4] 扩展 `src/stores/chat/` Topic 模型（类型 + state + actions + selectors + tests）
- [M1.5] 在 `src/stores/chat/` 增补 intervention & queue 的 selector（已有 store 字段的话重导出，否则新增 `pendingInterventions: InterventionItem[]` 与 `queuedMessages: Record<sessionKey, QueuedMessage[]>` + actions：`approveIntervention(id)` / `rejectIntervention(id)` / `enqueueMessage(msg)` / `flushQueue(sessionKey)`）

### M2. `features/mainChat/ChatInput` 骨架（阻塞 M5/M6/M7/M8/M9）

- [M2.1] 新建 `ChatInputProvider.tsx`（对齐 lobe-chat 同名组件）：props `agentId`, `leftActions`, `rightActions`, `sendMenu`, `sendButtonProps`, `mentionItems`, `getMessages`, `slashPlacement`, `chatInputEditorRef`, `onMarkdownContentChange`, `onSend`, `allowExpand`
- [M2.2] 新建 `store/` zustand 切片：`editor`, `leftActions`, `rightActions`, `expand`, `showTypoBar`, `slashMenuRef`, `setExpand`, `setEditor`, ...
- [M2.3] 新建 `InputEditor/`：包装 `@lobehub/editor/react` 的 `ChatInput`，注入 slash / mention 扩展；实现 `useChatInputEditor` hook 暴露 `{ focus, clearContent, getMarkdownContent, getEditorData, setMarkdownContent }`
- [M2.4] 新建 `SendArea/`：SendButton（带 round shape 变体）+ ExpandButton；**不做** ShortcutHint 菜单
- [M2.5] 新建 `Desktop/index.tsx`：对齐 lobe-chat DesktopChatInput，含 expand 全屏 portal、`ChatInputActionBar` 组合、`ContextContainer` 条件渲染
- [M2.6] 新建 `Mobile/index.tsx`（MB3）：MB3 特化，用于 Pet 子窗口与窄屏
- [M2.7] 新建 `TypoBar/`（接后端 spellcheck 服务；若服务未就绪则 action 禁用并标记 TODO）
- [M2.8] 新建 `RuntimeConfig/`：Local/Cloud/AutoApprove 三态条。Local/Cloud 绑定 `useGatewayStore.remoteGatewayUrl`，AutoApprove 绑定 `useSettingsStore.preference.autoApproveTools`
- [M2.9] `StoreUpdater.tsx`：上游 props → provider store 的单向同步
- [M2.10] 单测：provider 状态流、editor hook 契约、SendArea 键盘交互、Desktop 全屏切换

### M3. `features/mainChat/Conversation` 骨架

- [M3.1] 新建 `ConversationProvider.tsx`：收 `context { agentId, sessionId, topicId }` + 暴露 `inputMessage`, `editor`, `sendMessage`, `stopGenerating`, `addAIMessage`, `addUserMessage`, `updateInputMessage`, `setEditor`
- [M3.2] 新建 `store/`：selectors 对齐 `dataSelectors.dbMessages` / `dataSelectors.pendingInterventions` / `messageStateSelectors.isInputLoading` / `messageStateSelectors.sendMessageError`
- [M3.3] 新建 `ChatInput/index.tsx`：对齐 lobe-chat `ConversationChatInput`，含 `WideScreenContainer` 等价 + 错误 Alert + QueueTray
- [M3.4] 新建 `ChatInput/QueueTray.tsx`：渲染 `queuedMessages[sessionKey]`，支持丢弃 / 提前触发
- [M3.5] 新建 `InterventionBar/`（IV1）：展示 `pendingInterventions` 每条工具调用，按钮 approve / reject，调 `approveIntervention` / `rejectIntervention` → Gateway IPC
- [M3.6] 新建 `StoreUpdater.tsx`：把 `useChatStore` 的 loading/error/messages 桥接到 Conversation store
- [M3.7] 单测：发送契约、清空顺序、拦截切换、队列入队/清空

### M4. Route-level `MainChatInput`（替换旧 ChatInput）

- [M4.1] 新建 `src/features/mainChat/MainChatInput.tsx`（命名保留但与目录 `MainChatInput/` 不冲突，如冲突改名为 `mainChat/MainChatEntry.tsx`）——内容完全对齐 lobe-chat `MainChatInput/index.tsx`：
  ```tsx
  const leftActions: ActionKeys[] = [
    'model', 'search', 'memory', 'fileUpload', 'tools', 'typo',
    ...(isDevMode ? ['params'] : []), 'mainToken',
  ]
  const rightActions: ActionKeys[] = ['promptTransform']
  ```
- [M4.2] `sendMenu` 不做（无 ShortcutHint），保留 dev mode 下通过 `sendButtonProps={{ shape: 'round' }}` 显示
- [M4.3] `onEditorReady` 写入 `useChatStore.setState({ mainInputEditor: instance })`
- [M4.4] `src/features/mainChat/index.tsx` 切换 import 到新 `MainChatInput`
- [M4.5] 删除 `src/features/mainChat/components/ChatInput.tsx` 与 `CodeModeChatInput.tsx`

### M5. ActionBar 17 项逐项实现（依赖 M1 + M2；项间可并行）

每个 action 按"UI → store 绑定 → 集成测试"三步交付。下面列出每项的落地点、store 依赖、特别注意点：

| # | Action | 上游文件 | MimiClaw store 绑定 | 注意点 |
|---|---|---|---|---|
| 5.1 | `model` | `ActionBar/Model/` | `providers.aiModelSelectors` + `chat.currentAgentId` + `agents.updateAgent` | 下拉展示每个 agent 可用 model；切换写入 agent 配置 |
| 5.2 | `search` | `ActionBar/Search/` + `Controls` + `FCSearchModel` + `ModelBuiltinSearch` | `providers.supportsSearch` / `fcSearchModels`；`chat` 记录每轮 `useSearch` 开关 | 区分内置搜索 vs 工具调用搜索 |
| 5.3 | `memory` | `ActionBar/Memory/` + `Controls` + `useMemoryEnabled` | `agents` 的 `chatConfig.memory`；短期不接 vector store | 先只做开关；Memory 服务未就绪则 action 半灰 + tooltip |
| 5.4 | `fileUpload` | `ActionBar/Upload/ServerMode` | `file.chatUploadFileList` + 上传流水线 | 移除所有 `UnifiedComposerPath` 支持，只留 buffer/path staging |
| 5.5 | `tools` | `ActionBar/Tools/*` | `skills` store（TL1 简化版） | **不**移植 Klavis / Lobehub market / Discover，只保留已安装 skill 的开关列表 |
| 5.6 | `typo` | `ActionBar/Typo/` | `ChatInput.showTypoBar` | 需要后端 spellcheck；无服务则按钮 disabled，点击提示"未启用" |
| 5.7 | `params` | `ActionBar/Params/` + `Controls` | `agents.chatConfig`（temperature / topP / frequencyPenalty 等） | 仅 `isDevMode` 启用，和 M4 条件拼接一致 |
| 5.8 | `mainToken` | `ActionBar/Token/` + `TokenTag` + `TokenProgress` | `chat.topicSelectors.currentTopicTokens` + `providers.contextWindow(modelId)` | 需要 tokenizer；暂按 char count / 4 近似，留 TODO |
| 5.9 | `portalToken` | 同上 `Token/` 另一导出 | 同 5.8；作用于 portal 模式 | 若 MimiClaw 无 portal 概念则映射为侧栏场景或跳过 |
| 5.10 | `promptTransform` | `ActionBar/PromptTransform/` | `ChatInput.editor.getMarkdownContent()` + `hostApiFetch('/api/prompt/transform')` | 后端端点待建，前端先 stub 返回原文 + TODO |
| 5.11 | `stt` | `ActionBar/STT/{browser,openai,common}` | 复用 MimiClaw 既有 MediaRecorder + IPC 录音栈；按上游 `common.tsx` 分 browser/openai 两个 mode | **这里承接** A1 中被"删除"的 recording，Pet 子窗口 UI 也挂在这里 |
| 5.12 | `agentMode` | `ActionBar/AgentMode/` | `chat` 新增 `mode: 'chat' \| 'agent'` + agent run flag | 需要与执行链路协商；未就绪则 stub |
| 5.13 | `clear` | `ActionBar/Clear/` | `chat.clearCurrentTopic(topicId)` | 依赖 M1.4 topic actions |
| 5.14 | `history` | `ActionBar/History/` + `Controls` | `agents.chatConfig.historyCount` / `enableHistoryCount` | 控件完全可静态迁移 |
| 5.15 | `mention` | `ActionBar/Mention/` | 与 `@lobehub/editor` mention 插件拉通；`agents.agents` 作为候选 | 这是旧 Agent 选择器的替代 |
| 5.16 | `saveTopic` | `ActionBar/SaveTopic/` | `chat.createTopic(sessionId)` + 从 `preferenceSelectors.hotkeyById(SaveTopic)` 读快捷键 | 依赖 M1.4 |
| 5.17 | `knowledge` | `ActionBar/Knowledge/` | 无对应 store | **跳过**（不在 actionMap 里，lobe-chat main 也没用；列入 follow-up）|

> 每个 action 提交一个独立 PR，PR 标题格式：`feat(chat-input): impl <action> action`.

### M6. `@lobehub/editor` 适配 + Markdown 打通（SB1 + MD1 + MD_FULL）

- [M6.1] 抽象 `useChatInputEditor` hook，暴露对齐上游：`clearContent`, `focus`, `getMarkdownContent`, `getEditorData`, `setMarkdownContent`, `insertTextAtCursor`
- [M6.2] 发送合约改造：`onSend({ clearContent, getMarkdownContent, getEditorData })`；上游 `mainChat/index.tsx` 与 `useChatStore.sendMessage` 接参改为 `{ message, editorData, files, pageSelections }`
- [M6.3] 消息持久化：`RawMessage.content` 支持 string（原始 markdown） + 可选 `editorData`（编辑器 JSON state，用于富文本重渲）
- [M6.4] **ChatList markdown 渲染升级**：当前仅 `PetBubble` 使用 `react-markdown`。新建 `src/components/MessageMarkdown` 组件封装 `react-markdown + remark-gfm + 代码块高亮`，替换 `features/chat/modes/**` 的消息气泡内容渲染。此步独立成 sub-module（M6 内的子模块）
- [M6.5] Gateway 消息流字段：确认流式增量 chunk 格式允许 markdown 片段拼接；否则加一个 `finalize` 步骤
- [M6.6] 单测：markdown 往返（输入 → send payload → ChatList 渲染）、代码块 / 表格 / 链接 gfm

### M7. i18n（I18_1）

- [M7.1] 新建 `src/i18n/locales/{zh,en,ja}/chatInput.json`，key 体系对齐 lobe-chat 的 `input.*`
- [M7.2] MainChatInput 相关引用从 `t('composer.*')` 切到 `t('chatInput:input.*')` 或保持 `ns=chat, key=input.*`
- [M7.3] 老 `composer.*` keys 在 M10 清理阶段整体删除
- [M7.4] 覆盖：placeholder、send、stop、warp、disclaimer、errorMsg、sendWithEnter、sendWithCmdEnter、addAi、addUser（即便不展示 ShortcutHint，键也保留以便未来开）、action.\*

### M8. Intervention + Queue 后端联调（TA1）

假设 Gateway 已提供以下能力（**实施前先用 `pnpm cli` 或 curl 连通 Gateway 确认**）：

| 前端调用 | Gateway 事件/端点 | 字段 |
|---|---|---|
| `useChatStore.approveIntervention(id)` | 待确认（疑似 `chat:tool-approval`） | `{ interventionId, decision: 'approve'\|'reject' }` |
| 监听 `pendingInterventions` | 流式 event：`chat:intervention-requested` | `{ id, toolCallId, toolName, requestArgs, sessionKey }` |
| `useChatStore.enqueueMessage` | 本地状态 + 发送时 `flush` | 不走后端 |

- [M8.1] 在 `electron/main/ipc-handlers.ts` 增补 intervention 透传通道（若不存在）
- [M8.2] 前端 InterventionBar 与 store 联通
- [M8.3] 集成测试：模拟 Gateway 发 intervention event → UI 显示 → approve 回传

### M9. Pet 子窗口 Mobile ChatInput（MB3 + PET2）

- [M9.1] `PetBubble` / `PetCompanion` / `PetFloating` 切换到 `features/mainChat/ChatInput/Mobile`
- [M9.2] Pet 专属：保留底部 Gateway 状态指示（从旧 footer 迁出到 Pet 边栏）
- [M9.3] Pet 专属：STT action 的 recording pill UI 做成 pet 模板 variant（宠物场景高可见度动效）
- [M9.4] Pet IPC 事件 `pet:setInputActivity` / `pet:recording-command` 改为只供 STT action 消费，剥离原 ChatInput 耦合

### M10. 清理与删除（D1）

按顺序执行，**最后一步提交**，避免断点：

- [M10.1] 删除 `src/features/mainChat/components/ChatInput.tsx`
- [M10.2] 删除 `src/features/mainChat/components/CodeModeChatInput.tsx`
- [M10.3] 删除 `src/features/mainChat/components/composer.tsx`、`unified-composer-input.tsx`、`composer-helpers.ts`
- [M10.4] 删除 `src/features/mainChat/lib/composer-shell.ts`
- [M10.5] 删除 `src/lib/unified-composer.ts`（及其测试）
- [M10.6] 删除 `src/pages/CodeChat/`、`src/features/codeChat/`
- [M10.7] 删除 `electron/main/code-chat-window.ts` + `menu.ts` / `index.ts` 中的 code-chat 菜单项与窗口注册
- [M10.8] 删除 `screenshot:capture` IPC、全局快捷键、`mimiclaw:capture-screenshot` session storage 信号
- [M10.9] 删除 `applyResponseLanguageToPrompt`、`responseLanguage` 在 ChatInput 的用法（settings 仍保留该字段供 agent 层）
- [M10.10] i18n：删除 `composer.*` key 集群
- [M10.11] `grep` 清零 `targetAgentId` / `UnifiedComposerPath` / `extractDroppedPathsFromTransfer` / `toOpenClawSubmission` / `mergeUnifiedComposerPaths` 的所有引用

---

## 5. 模块拓扑

```
                 ┌──────────┐
                 │   M1     │  store 基建
                 └────┬─────┘
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
        ┌──────┐             ┌──────┐
        │  M2  │ editor 骨架 │  M6  │ editor 适配 + markdown
        └──┬───┘             └──┬───┘
           │                    │
           ▼                    │
        ┌──────┐                │
        │  M3  │ conv 骨架      │
        └──┬───┘                │
           │                    │
      ┌────┴────┬─────┬─────┬───┴─┬──────┐
      ▼         ▼     ▼     ▼     ▼      ▼
    ┌────┐   ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
    │ M4 │   │ M5 │ │ M7 │ │ M8 │ │ M9 │ │M10 │
    └────┘   └────┘ └────┘ └────┘ └────┘ └────┘
   入口切换  17actions i18n  拦截/队  Pet   清理
```

---

## 6. 验收标准

### 功能
- [ ] 新 `MainChatInput` 在 main 路由下替代旧 ChatInput，17 个 action 全部可渲染（其中 `knowledge` 跳过）
- [ ] 输入框富文本 + slash menu + mention menu 正常工作
- [ ] 发送流程：editor markdown → store → Gateway → ChatList markdown 渲染闭环
- [ ] Intervention 与 Queue 在 Gateway 事件触发下 UI 响应正确
- [ ] Pet 子窗口用 Mobile 变体，录音 UI 工作正常
- [ ] Desktop 全屏 expand 正常

### 清理
- [ ] `rg 'UnifiedComposerPath|targetAgentId|toOpenClawSubmission|applyResponseLanguageToPrompt|extractDroppedPathsFromTransfer|composer\\.gatewayStatus' src/` 返回 0 条命中
- [ ] `rg 'CodeModeChatInput|src/pages/CodeChat|features/codeChat' src/` 返回 0 条命中
- [ ] `src/features/mainChat/components/composer.tsx` 等文件在仓库中不存在

### 质量
- [ ] `pnpm typecheck` 绿
- [ ] `pnpm lint:check` 绿
- [ ] `pnpm test` 绿（新增单测覆盖 M1/M2/M3/M5/M6）
- [ ] 关键交互手测通过（清单见下文）

### 手测清单
1. 输入文本 + Enter 发送，输入框清空、消息进入列表、markdown 渲染正确
2. 上传文件 / 拖入文件，`fileUpload` action 列表显示，发送后消息携带附件
3. 切换 model / 调整 temperature / 切换 search / 切换 history，设置写入 agent 配置
4. 使用 `@` 触发 mention，选择 agent 后 editor 插入 mention 节点，发送到对应 agent
5. 使用 `/` 触发 slash menu
6. 工具调用触发 `pendingIntervention`，InterventionBar 显示 → approve → 工具继续
7. 生成中再次回车，消息入队 QueueTray，等待生成结束后自动发送
8. 点击 expand 进入全屏编辑器，再点击退出
9. `isDevMode` 开关切换，`params` action 显隐一致
10. Pet 子窗口：点击 STT 录音，转写后自动发送

---

## 7. 回归 / 风险

| 风险 | 缓解 |
|---|---|
| `@lobehub/editor` 升级导致 API 漂移 | 锁定当前版本 `4.5.0`；`useChatInputEditor` 作为单一适配点 |
| Topic 模型落地周期长，阻塞 `saveTopic` / `mainToken` / `clear` | M1.4 与后端并行讨论，落地前这三个 action 先 stub |
| ChatList markdown 升级影响现有气泡视觉 | M6.4 独立 review + 视觉 diff 截图 |
| Intervention / Queue 后端契约未就绪 | M8 前先做 Gateway 联通验证；未就绪则 InterventionBar 挂 feature flag |
| 录音从 ChatInput 迁到 STT action 期间用户感知断层 | MG2 分支推进，一次切齐，避免并存 |
| `useFileStore` 与后端 staging 路径语义不匹配 | M1.1 保留现有 `/api/files/stage-*` 契约，只做状态上移 |

---

## 8. 参考

- 上游入口：`lobe-chat/src/routes/(main)/agent/features/Conversation/MainChatInput/index.tsx`
- 上游编辑器基础设施：`lobe-chat/src/features/ChatInput/**`
- 上游会话层：`lobe-chat/src/features/Conversation/**`
- MimiClaw 现状：`src/features/mainChat/components/ChatInput.tsx`、`components/composer.tsx`
- 依赖：`@lobehub/editor@4.5.0`、`@lobehub/ui@5.6.1`、`slate@0.124.0`、`slate-react@0.124.0`（均已安装）

---

## 9. Follow-ups（不在本 task 范围）

- `knowledge` action 与 RAG 集成
- Tools action 接入 Klavis / LobehubSkill / Discover 市场
- `sendMenu`（ShortcutHint）补齐，开启 Enter/Cmd+Enter 切换 + Add AI/User 消息
- 移动端 Web / PWA 场景（当前仅 Electron desktop + Pet 子窗口）
- Memory action 接入向量化记忆服务
- Footnote 免责说明（产品文案未定则不加）
