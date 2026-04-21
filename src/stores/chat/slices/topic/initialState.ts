import type { ChatState } from '../../types';

export type ChatTopicState = Pick<
  ChatState,
  | 'currentTopicId'
  | 'mainInputEditor'
  | 'mode'
  | 'pendingInterventions'
  | 'queuedMessages'
  | 'topicMap'
>;

export const initialTopicState: ChatTopicState = {
  topicMap: {},
  currentTopicId: null,
  pendingInterventions: [],
  queuedMessages: {},
  mode: 'chat',
  mainInputEditor: null,
};
