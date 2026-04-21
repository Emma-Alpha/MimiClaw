import { flattenActions } from '../utils/flattenActions';
import { interventionReducer, queueReducer, topicReducer } from './reducer';
import { ChatRuntimeActionImpl } from './runtime.action';
import { ChatSessionActionImpl } from './session.action';
import type { ChatGet, ChatSet } from './store-api';
import type { ChatState } from './types';

type PublicActions<T> = { [K in keyof T]: T[K] };

type Setter = ChatSet;
type Getter = ChatGet;

export class ChatTopicActionImpl {
  readonly #get: Getter;
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  internal_dispatchTopic: ChatState['internal_dispatchTopic'] = (payload, _source) => {
    void _source;
    this.#set((state) => topicReducer(state.topicMap, state.currentTopicId, payload));
  };

  internal_dispatchIntervention: ChatState['internal_dispatchIntervention'] = (payload, _source) => {
    void _source;
    this.#set((state) => ({
      pendingInterventions: interventionReducer(state.pendingInterventions, payload),
    }));
  };

  internal_dispatchQueue: ChatState['internal_dispatchQueue'] = (payload, _source) => {
    void _source;
    this.#set((state) => ({
      queuedMessages: queueReducer(state.queuedMessages, payload),
    }));
  };

  internal_createTopic: ChatState['internal_createTopic'] = (sessionId, title) => {
    const now = Date.now();
    const id = crypto.randomUUID();
    const topic = {
      id,
      sessionId,
      agentId: this.#get().currentAgentId,
      title: title?.trim() || 'New Topic',
      createdAt: now,
      updatedAt: now,
    };
    this.internal_dispatchTopic({ type: 'addTopic', value: topic }, 'internal_createTopic');
    return id;
  };

  createTopic: ChatState['createTopic'] = (sessionId, title) =>
    this.internal_createTopic(sessionId, title);

  switchTopic: ChatState['switchTopic'] = (topicId) => {
    this.internal_dispatchTopic({ type: 'setCurrentTopic', id: topicId }, 'switchTopic');
  };

  summarizeTopic: ChatState['summarizeTopic'] = (topicId, summary) => {
    this.internal_dispatchTopic(
      {
        type: 'updateTopic',
        id: topicId,
        value: { summary, updatedAt: Date.now() },
      },
      'summarizeTopic',
    );
  };

  deleteTopic: ChatState['deleteTopic'] = (topicId) => {
    this.internal_dispatchTopic({ type: 'deleteTopic', id: topicId }, 'deleteTopic');
  };

  clearCurrentTopic: ChatState['clearCurrentTopic'] = (topicId) => {
    const targetTopicId = topicId ?? this.#get().currentTopicId;
    if (!targetTopicId) return;
    this.#set({ messages: [] });
    this.summarizeTopic(targetTopicId, undefined);
  };

  approveIntervention: ChatState['approveIntervention'] = (id) => {
    this.internal_dispatchIntervention({ type: 'removeIntervention', id }, 'approveIntervention');
  };

  rejectIntervention: ChatState['rejectIntervention'] = (id) => {
    this.internal_dispatchIntervention({ type: 'removeIntervention', id }, 'rejectIntervention');
  };

  enqueueMessage: ChatState['enqueueMessage'] = (sessionKey, message) => {
    const queuedMessage = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      ...message,
    };
    this.internal_dispatchQueue(
      { type: 'enqueue', sessionKey, value: queuedMessage },
      'enqueueMessage',
    );
    return queuedMessage.id;
  };

  flushQueue: ChatState['flushQueue'] = (sessionKey) => {
    const items = this.#get().queuedMessages[sessionKey] ?? [];
    this.internal_dispatchQueue({ type: 'flushQueue', sessionKey }, 'flushQueue');
    return items;
  };

  setMainInputEditor: ChatState['setMainInputEditor'] = (editor) => {
    this.#set({ mainInputEditor: editor });
  };

  setChatMode: ChatState['setChatMode'] = (mode) => {
    this.#set({ mode });
  };
}

export type ChatSessionHistoryAction = Pick<ChatSessionActionImpl, keyof ChatSessionActionImpl>;
export type ChatRuntimeAction = Pick<ChatRuntimeActionImpl, keyof ChatRuntimeActionImpl>;
export type ChatTopicAction = Pick<ChatTopicActionImpl, keyof ChatTopicActionImpl>;

export type ChatAction = PublicActions<
  ChatSessionHistoryAction & ChatRuntimeAction & ChatTopicAction
>;

export const createChatSessionHistorySlice = (set: Setter, get: Getter, api?: unknown) =>
  new ChatSessionActionImpl(set, get, api);

export const createChatRuntimeSlice = (set: Setter, get: Getter, api?: unknown) =>
  new ChatRuntimeActionImpl(set, get, api);

export const createChatTopicSlice = (set: Setter, get: Getter, api?: unknown) =>
  new ChatTopicActionImpl(set, get, api);

export function createChatActions(set: Setter, get: Getter, api?: unknown): ChatAction {
  return flattenActions<ChatAction>([
    createChatSessionHistorySlice(set, get, api),
    createChatRuntimeSlice(set, get, api),
    createChatTopicSlice(set, get, api),
  ]);
}
