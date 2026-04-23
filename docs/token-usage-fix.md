# Token Usage 数据提取修复

## 问题
1. OpenClaw Gateway 返回的消息有两种数据格式：
   - **assistant 消息**：usage 在顶层 `message.usage`
   - **toolResult 消息**：usage 在 `message.details.usage`

2. 原有的 `totalTokens` 计算逻辑不完整：
   - 只计算了 `inputTokens + outputTokens`
   - 没有包含缓存 token（`inputCachedTokens` 和 `inputWriteCacheTokens`）
   - 导致即使有缓存 token 消耗，UI 也可能不显示

## 解决方案

### 1. 支持两种数据位置
更新了 `src/features/mainChat/utils/extractUsage.ts` 中的三个提取函数：

```typescript
// 优先从顶层读取，回退到 details
export function extractUsageFromMessage(message: RawMessage): ModelUsage | undefined {
  const usage = message.usage || message.details?.usage;
  // ...
}
```

### 2. 修正 totalTokens 计算
```typescript
// 包含所有 token 类型：input, output, cache read, cache write
if (result.totalTokens === undefined) {
  const input = result.inputTokens ?? 0;
  const output = result.outputTokens ?? 0;
  const cacheRead = result.inputCachedTokens ?? 0;
  const cacheWrite = result.inputWriteCacheTokens ?? 0;

  if (input > 0 || output > 0 || cacheRead > 0 || cacheWrite > 0) {
    result.totalTokens = input + output + cacheRead + cacheWrite;
  }
}
```

### 3. 添加调试日志
在以下组件中添加了 console.log：
- `NewAssistantMessage.tsx` - 查看提取的 usage 数据
- `Usage.tsx` - 查看传入 Usage 组件的 props

## 测试覆盖
- ✅ 16/16 单元测试通过
- ✅ 支持从顶层字段提取（assistant 消息）
- ✅ 支持从 details 字段提取（toolResult 消息）
- ✅ 支持 Anthropic 和 OpenAI 格式
- ✅ 正确计算 totalTokens（包含缓存 token）
- ✅ 处理缓存 token、推理 token 等扩展字段

## 数据流
```
OpenClaw Gateway 
  → message.usage / message.details.usage
  → extractUsageFromMessage()
  → totalTokens = input + output + cacheRead + cacheWrite
  → ChatItem.usage
  → Usage 组件显示（条件：usage?.totalTokens || model）
```

## 调试步骤
如果 token 仍然不显示，请检查浏览器控制台：

1. 查看 `[NewAssistantMessage]` 日志：
   - `message.details` - 原始消息数据
   - `extracted usage` - 提取后的 usage 对象
   - `extracted model` - 模型名称
   - `extracted provider` - provider 名称

2. 查看 `[Usage]` 日志：
   - 确认 `usage.totalTokens` 是否有值
   - 确认 `model` 是否有值

## 相关文件
- `src/features/mainChat/utils/extractUsage.ts` - 提取函数（已修复）
- `tests/unit/extract-usage.test.ts` - 单元测试（已更新）
- `src/features/mainChat/components/messages/NewAssistantMessage.tsx` - 使用提取函数
- `src/components/ChatItem/components/Usage.tsx` - 显示组件（已添加调试日志）
