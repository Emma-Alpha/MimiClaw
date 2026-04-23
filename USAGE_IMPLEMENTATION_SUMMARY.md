# Token Usage 真实数据实现总结

## 问题

项目中的 Usage 组件显示的是硬编码的假数据，而 Claude Code CLI 返回的消息中包含完整的真实 token usage 数据（包括缓存、推理等详细信息）。

## 为什么不能直接引用 LobeHub 的 Usage 组件？

LobeHub 的 Usage 组件虽然功能完善，但存在以下问题：

1. **依赖 `@lobechat/types` 包** - MimiClaw 没有安装
2. **依赖特定的 Store** - `useAiInfraStore`、`useGlobalStore`
3. **架构不同** - LobeHub 是 Next.js 应用，MimiClaw 是 Electron + OpenClaw Gateway
4. **功能过于复杂** - token/credit 切换、模型定价等当前不需要的功能

## 解决方案

### 1. 创建 Usage 提取工具

**文件**: `src/features/mainChat/utils/extractUsage.ts`

提供三个函数：
- `extractUsageFromMessage(message)` - 提取 token usage 数据
- `extractModelFromMessage(message)` - 提取模型名称
- `extractProviderFromMessage(message)` - 提取 provider 名称

**支持的数据格式**:
- ✅ Anthropic 格式 (`input_tokens`, `output_tokens`, `cache_read_input_tokens`, etc.)
- ✅ OpenAI 格式 (`promptTokens`, `completionTokens`, `totalTokens`)
- ✅ camelCase 和 snake_case 字段名
- ✅ 详细分解（文本、音频、推理、缓存等）

**提取的字段**:
```typescript
interface ModelUsage {
  // 基础
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  
  // 详细输入
  totalInputTokens?: number;
  inputTextTokens?: number;
  inputAudioTokens?: number;
  inputCitationTokens?: number;
  inputCachedTokens?: number;        // cache hit
  inputWriteCacheTokens?: number;    // cache write
  inputCacheMissTokens?: number;
  inputToolTokens?: number;
  
  // 详细输出
  totalOutputTokens?: number;
  outputTextTokens?: number;
  outputReasoningTokens?: number;    // extended thinking
  outputAudioTokens?: number;
  outputImageTokens?: number;
}
```

### 2. 更新 NewAssistantMessage 组件

**文件**: `src/features/mainChat/components/messages/NewAssistantMessage.tsx`

**修改前**:
```tsx
<ChatItem
  model="Claude Sonnet 4.6"
  usage={{
    inputTokens: 1234,
    outputTokens: 567,
    totalTokens: 1801,
  }}
/>
```

**修改后**:
```tsx
// Extract real usage data from message
const usage = extractUsageFromMessage(message);
const model = extractModelFromMessage(message);
const provider = extractProviderFromMessage(message);

<ChatItem
  model={model}
  provider={provider}
  usage={usage}
/>
```

### 3. 添加单元测试

**文件**: `tests/unit/extract-usage.test.ts`

测试覆盖：
- ✅ Anthropic 格式提取
- ✅ OpenAI 格式提取
- ✅ 详细 token 分解
- ✅ 缓存 token 提取
- ✅ 字段名兼容性
- ✅ 边界情况处理

**测试结果**: 11/11 通过 ✅

## 数据流

```
Claude Code CLI / OpenClaw Gateway
          ↓
    IPC Event (chat:event)
          ↓
  Chat Store (RawMessage.details.usage)
          ↓
  extractUsageFromMessage()
          ↓
    ModelUsage 对象
          ↓
  ChatItem → Usage → UsageDetail
          ↓
    UI 显示（带详细分解的 Popover）
```

## 文件清单

### 新增文件
- ✅ `src/features/mainChat/utils/extractUsage.ts` - 数据提取工具
- ✅ `tests/unit/extract-usage.test.ts` - 单元测试
- ✅ `docs/usage-extraction.md` - 详细文档

### 修改文件
- ✅ `src/features/mainChat/components/messages/NewAssistantMessage.tsx` - 使用真实数据

### 现有文件（无需修改）
- `src/components/ChatItem/components/Usage.tsx` - UI 组件
- `src/components/ChatItem/components/UsageDetail/` - 详细展示
- `src/components/ChatItem/types.ts` - 类型定义

## 验证

### Lint 检查
```bash
pnpm eslint src/features/mainChat/utils/extractUsage.ts \
  src/features/mainChat/components/messages/NewAssistantMessage.tsx
```
✅ 通过

### 类型检查
```bash
pnpm run typecheck
```
✅ 无新增错误

### 单元测试
```bash
pnpm test tests/unit/extract-usage.test.ts
```
✅ 11/11 通过

### 全量测试
```bash
pnpm test -- --run
```
✅ 无新增失败（331 passed）

## 效果

### 修改前
- ❌ 显示硬编码假数据（1234/567/1801）
- ❌ 模型名称固定为 "Claude Sonnet 4.6"
- ❌ 无 provider 信息
- ❌ 无缓存、推理等详细信息

### 修改后
- ✅ 显示真实 token 数据
- ✅ 动态显示实际使用的模型
- ✅ 显示 provider 信息
- ✅ 支持缓存命中/写入显示
- ✅ 支持推理 token 显示
- ✅ 支持音频、图像等多模态 token

## 未来扩展

如需支持更高级功能：

1. **Token ↔ Credit 切换**
   - 添加模型定价数据
   - 添加全局状态管理

2. **性能指标**
   - TPS (Tokens Per Second)
   - TTFT (Time To First Token)
   - 需要从 streaming 事件收集时间戳

3. **成本估算**
   - 基于 provider 定价计算成本
   - 显示累计消费

## 注意事项

1. **数据可用性**
   - 只有 assistant 消息有 usage 数据
   - Streaming 过程中可能为空

2. **兼容性**
   - 同时支持多种字段名格式
   - 优雅降级（无数据时不显示）

3. **性能**
   - 提取函数轻量（仅对象字段读取）
   - 每次渲染调用，开销可忽略

## 相关资源

- [详细文档](./docs/usage-extraction.md)
- [Claude API Usage 文档](https://docs.anthropic.com/en/api/usage)
- [OpenClaw Gateway 文档](./electron/gateway/README.md)
