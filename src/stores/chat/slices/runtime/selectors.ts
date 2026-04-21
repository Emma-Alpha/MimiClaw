import type { ChatState } from '../../types';

/** 消息相关 */
export const chatMessageSelectors = {
  messages: (s: ChatState) => s.messages,
  loading: (s: ChatState) => s.loading,
  error: (s: ChatState) => s.error,
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

export const messageStateSelectors = {
  isInputLoading: (s: ChatState) => s.loading || s.sending,
  sendMessageError: (s: ChatState) => s.error,
};

export const dataSelectors = {
  dbMessages: (s: ChatState) => s.messages,
  pendingInterventions: (s: ChatState) => s.pendingInterventions,
};
