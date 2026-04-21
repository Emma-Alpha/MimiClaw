import type { ChatState } from '../../types';

export const topicSelectors = {
  currentTopicId: (s: ChatState) => s.currentTopicId,
  topicsBySession: (sessionId: string) => (s: ChatState) =>
    Object.values(s.topicMap)
      .filter((topic) => topic.sessionId === sessionId)
      .sort((left, right) => right.updatedAt - left.updatedAt),
  currentTopicTokens: (s: ChatState) => Math.max(0, Math.ceil(s.messages.reduce((sum, message) => {
    if (typeof message.content !== 'string') return sum;
    return sum + message.content.length;
  }, 0) / 4)),
};

export const threadSelectors = {
  currentThreadMessages: (s: ChatState) => {
    if (!s.currentTopicId) return s.messages;
    return s.messages.filter((message) => message.id || message.timestamp);
  },
};

export const interventionSelectors = {
  pendingInterventions: (s: ChatState) => s.pendingInterventions,
};

export const queueSelectors = {
  queuedMessages: (sessionKey: string) => (s: ChatState) => s.queuedMessages[sessionKey] ?? [],
};

export const chatInputSelectors = {
  mainInputEditor: (s: ChatState) => s.mainInputEditor,
  mode: (s: ChatState) => s.mode,
};
