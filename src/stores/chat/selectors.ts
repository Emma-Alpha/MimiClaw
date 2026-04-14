import type { ChatState } from './types';

/** 消息相关 */
export const chatMessageSelectors = {
  messages: (s: ChatState) => s.messages,
  loading: (s: ChatState) => s.loading,
  error: (s: ChatState) => s.error,
};

/** 会话相关 */
export const chatSessionSelectors = {
  sessions: (s: ChatState) => s.sessions,
  currentSessionKey: (s: ChatState) => s.currentSessionKey,
  currentAgentId: (s: ChatState) => s.currentAgentId,
  sessionLabels: (s: ChatState) => s.sessionLabels,
  sessionLastActivity: (s: ChatState) => s.sessionLastActivity,
  /** 按最后活动时间降序排列的 sessions，结合 label 解析。需配合 shallow 使用以避免不必要渲染。 */
  sortedSessions: (s: ChatState) =>
    [...s.sessions]
      .sort((a, b) => {
        const ta = s.sessionLastActivity[a.key] ?? a.updatedAt ?? 0;
        const tb = s.sessionLastActivity[b.key] ?? b.updatedAt ?? 0;
        return tb - ta;
      })
      .map((session) => ({
        key: session.key,
        label: s.sessionLabels[session.key] ?? session.label ?? session.displayName ?? session.key,
        updatedAt: s.sessionLastActivity[session.key] ?? session.updatedAt ?? 0,
      })),
  /** 获取单个 session 的显示 label */
  sessionLabel: (key: string) => (s: ChatState) =>
    s.sessionLabels[key] ?? s.sessions.find((sess) => sess.key === key)?.displayName ?? key,
};

/** 流式/运行状态相关 */
export const chatStreamingSelectors = {
  sending: (s: ChatState) => s.sending,
  streamingText: (s: ChatState) => s.streamingText,
  streamingMessage: (s: ChatState) => s.streamingMessage,
  streamingTools: (s: ChatState) => s.streamingTools,
  pendingFinal: (s: ChatState) => s.pendingFinal,
  lastRunWasAborted: (s: ChatState) => s.lastRunWasAborted,
  isWorking: (s: ChatState) =>
    s.sending && (!!s.streamingMessage || s.streamingTools.length > 0 || s.pendingFinal),
  /**
   * 宠物 UI 活动状态。返回字符串原始值，无需 shallow 即可正确触发 re-render 去重。
   * - idle: 未在发送
   * - listening: 已发送，等待 AI 开始输出
   * - working: AI 正在输出内容或工具调用
   */
  petActivity: (s: ChatState): 'idle' | 'listening' | 'working' =>
    !s.sending
      ? 'idle'
      : s.pendingFinal || !!s.streamingMessage || s.streamingTools.length > 0
        ? 'working'
        : 'listening',
};

/** 思考模式相关 */
export const chatThinkingSelectors = {
  showThinking: (s: ChatState) => s.showThinking,
  thinkingLevel: (s: ChatState) => s.thinkingLevel,
};
