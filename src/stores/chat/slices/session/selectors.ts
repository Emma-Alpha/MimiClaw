import type { ChatState } from '../../types';

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
