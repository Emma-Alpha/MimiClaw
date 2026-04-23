# Token Usage 数据提取说明

## 问题背景

### 为什么不能直接引用 LobeHub 的 Usage 组件？

LobeHub 的 `Usage` 组件 (`/Users/liangpingbo/Desktop/app/lobehub/src/features/Conversation/Messages/components/Extras/Usage`) 虽然功能完善，但存在以下依赖问题：

1. **外部类型依赖**
   - 依赖 `@lobechat/types` 包中的 `ModelPerformance` 和 `ModelUsage` 类型
   - MimiClaw 项目没有安装这个包

2. **Store 依赖**
   - 使用 `useAiInfraStore` 获取模型卡片信息和定价
   - 使用 `useGlobalStore` 管理 token/credit 显示切换
   - MimiClaw 使用不同的状态管理架构（基于 OpenClaw Gateway）

3. **功能差异**
   - LobeHub 支持 token ↔ credit 切换显示
   - LobeHub 有复杂的模型定价计算
   - MimiClaw 目前只需要显示 token 统计

4. **组件依赖**
   - 依赖 `ModelCard`、`InfoTooltip` 等额外组件
   - 需要完整的 i18n 翻译键

## 解决方案

### 1. 保留简化版 Usage 组件

MimiClaw 已经有一个简化版的 Usage 组件：
- 位置：`src/components/ChatItem/components/Usage.tsx`
- 功能：显示模型名称和 token 统计
- 优势：轻量、无外部依赖、满足当前需求

### 2. 实现真实数据提取

创建了 `extractUsageFromMessage` 工具函数来从消息中提取真实的 usage 数据。

#### 文件位置
```
src/features/mainChat/utils/extractUsage.ts
```

#### 支持的数据格式

**Anthropic 格式**（Claude API）：
```typescript
{
  usage: {
    input_tokens: 1234,
    output_tokens: 567,
    cache_read_input_tokens: 100,
    cache_creation_input_tokens: 50
  }
}
```

**OpenAI 格式**：
```typescript
{
  usage: {
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500
  }
}
```

**详细分解格式**（支持 Claude Code CLI 返回的完整数据）：
```typescript
{
  usage: {
    input_tokens: 2000,
    output_tokens: 1000,
    input_text_tokens: 1800,
    input_audio_tokens: 200,
    input_citation_tokens: 50,
    output_text_tokens: 800,
    output_reasoning_tokens: 200,
    cache_read_input_tokens: 500,
    cache_creation_input_tokens: 100,
    input_tool_tokens: 100
  }
}
```

#### 提取的字段

基础字段：
- `inputTokens` - 输入 token 数
- `outputTokens` - 输出 token 数
- `totalTokens` - 总 token 数（自动计算）

详细输入分解：
- `totalInputTokens` - 总输入 token
- `inputTextTokens` - 文本输入 token
- `inputAudioTokens` - 音频输入 token
- `inputCitationTokens` - 引用输入 token
- `inputCachedTokens` - 缓存读取 token（cache hit）
- `inputWriteCacheTokens` - 缓存写入 token（cache write）
- `inputCacheMissTokens` - 缓存未命中 token
- `inputToolTokens` - 工具调用输入 token

详细输出分解：
- `totalOutputTokens` - 总输出 token
- `outputTextTokens` - 文本输出 token
- `outputReasoningTokens` - 推理输出 token（extended thinking）
- `outputAudioTokens` - 音频输出 token
- `outputImageTokens` - 图像输出 token

### 3. 更新 NewAssistantMessage 组件

**修改前**（硬编码假数据）：
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

**修改后**（使用真实数据）：
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
    UI 显示（带缓存、推理等详细分解）
```

## 测试覆盖

测试文件：`tests/unit/extract-usage.test.ts`

覆盖场景：
- ✅ Anthropic 格式提取
- ✅ OpenAI 格式提取
- ✅ 详细 token 分解提取
- ✅ 缓存 token 提取
- ✅ camelCase 和 snake_case 字段名兼容
- ✅ 无数据时返回 undefined
- ✅ 模型名称提取
- ✅ Provider 提取

## 未来扩展

如果需要支持 LobeHub 的高级功能，可以考虑：

1. **Token ↔ Credit 切换**
   - 需要添加模型定价数据
   - 需要添加全局状态管理

2. **模型卡片显示**
   - 需要维护模型元数据（图标、描述、定价）
   - 可以从 OpenClaw 的 provider registry 获取

3. **性能指标**
   - TPS (Tokens Per Second)
   - TTFT (Time To First Token)
   - 需要从 streaming 事件中收集时间戳

## 相关文件

- `src/features/mainChat/utils/extractUsage.ts` - 数据提取工具
- `src/features/mainChat/components/messages/NewAssistantMessage.tsx` - 使用真实数据
- `src/components/ChatItem/components/Usage.tsx` - UI 组件
- `src/components/ChatItem/components/UsageDetail/` - 详细展示组件
- `src/components/ChatItem/types.ts` - 类型定义
- `tests/unit/extract-usage.test.ts` - 单元测试
- `electron/utils/token-usage-core.ts` - OpenClaw transcript 解析
- `electron/utils/pet-real-usage.ts` - Claude Code CLI usage 统计

## 注意事项

1. **数据来源**
   - 只有 assistant 角色的消息才有 usage 数据
   - Streaming 过程中 usage 可能为空，直到消息完成

2. **字段兼容性**
   - 同时支持 snake_case 和 camelCase
   - 同时支持 Anthropic 和 OpenAI 字段名
   - 优先使用详细字段，回退到基础字段

3. **自动计算**
   - 如果没有 `totalTokens`，会自动从 `inputTokens + outputTokens` 计算
   - 如果没有详细分解，会使用基础字段

4. **性能**
   - 提取函数在每次渲染时调用，但开销很小（只是对象字段读取）
   - 如果需要优化，可以考虑在 store 层面预处理
