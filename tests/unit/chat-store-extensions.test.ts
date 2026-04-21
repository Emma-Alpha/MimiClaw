import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeIpcMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  invokeIpc: (...args: unknown[]) => invokeIpcMock(...args),
}));

describe('chat store extensions', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const { useChatStore } = await import('@/stores/chat');
    useChatStore.setState({
      messages: [],
      loading: false,
      error: null,
      sending: false,
      activeRunId: null,
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      pendingFinal: false,
      lastUserMessageAt: null,
      lastRunWasAborted: false,
      pendingToolImages: [],
      sessions: [{ key: 'agent:main:main' }],
      currentSessionKey: 'agent:main:main',
      currentAgentId: 'main',
      sessionLabels: {},
      sessionLastActivity: {},
      topicMap: {},
      currentTopicId: null,
      pendingInterventions: [],
      queuedMessages: {},
      mode: 'chat',
      mainInputEditor: null,
      showThinking: true,
      thinkingLevel: null,
    });
  });

  it('creates and manages topics', async () => {
    const { topicSelectors, useChatStore } = await import('@/stores/chat');

    const topicId = useChatStore.getState().createTopic('agent:main:main', 'Inbox');
    const state = useChatStore.getState();

    expect(topicId).toBeTruthy();
    expect(state.currentTopicId).toBe(topicId);
    expect(topicSelectors.topicsBySession('agent:main:main')(state)).toHaveLength(1);

    useChatStore.getState().summarizeTopic(topicId, 'Summary');
    expect(useChatStore.getState().topicMap[topicId]?.summary).toBe('Summary');

    useChatStore.getState().deleteTopic(topicId);
    expect(useChatStore.getState().topicMap[topicId]).toBeUndefined();
  });

  it('queues and flushes messages per session', async () => {
    const { queueSelectors, useChatStore } = await import('@/stores/chat');

    const id = useChatStore.getState().enqueueMessage('agent:main:main', {
      message: 'queued',
      targetAgentId: 'main',
    });

    const queued = queueSelectors.queuedMessages('agent:main:main')(useChatStore.getState());
    expect(queued).toHaveLength(1);
    expect(queued[0]?.id).toBe(id);

    const flushed = useChatStore.getState().flushQueue('agent:main:main');
    expect(flushed).toHaveLength(1);
    expect(queueSelectors.queuedMessages('agent:main:main')(useChatStore.getState())).toEqual([]);
  });

  it('exposes message state selectors and input editor state', async () => {
    const { chatInputSelectors, messageStateSelectors, useChatStore } = await import('@/stores/chat');

    useChatStore.getState().setMainInputEditor({ focus: vi.fn() });
    useChatStore.getState().setChatMode('agent');
    useChatStore.setState({ loading: true, error: 'boom' });

    const state = useChatStore.getState();
    expect(chatInputSelectors.mode(state)).toBe('agent');
    expect(chatInputSelectors.mainInputEditor(state)).toEqual({ focus: expect.any(Function) });
    expect(messageStateSelectors.isInputLoading(state)).toBe(true);
    expect(messageStateSelectors.sendMessageError(state)).toBe('boom');
  });
});
