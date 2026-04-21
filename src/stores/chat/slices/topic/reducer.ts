import type {
  ChatTopic,
  InterventionDispatch,
  InterventionItem,
  QueueDispatch,
  QueuedMessage,
  TopicDispatch,
} from '../../types';

export function topicReducer(
  topicMap: Record<string, ChatTopic>,
  currentTopicId: string | null,
  payload: TopicDispatch,
): {
  topicMap: Record<string, ChatTopic>;
  currentTopicId: string | null;
} {
  switch (payload.type) {
    case 'addTopic': {
      return {
        topicMap: {
          ...topicMap,
          [payload.value.id]: payload.value,
        },
        currentTopicId: payload.value.id,
      };
    }
    case 'deleteTopic': {
      if (!topicMap[payload.id]) {
        return { topicMap, currentTopicId };
      }
      const nextTopicMap = { ...topicMap };
      delete nextTopicMap[payload.id];
      return {
        topicMap: nextTopicMap,
        currentTopicId: currentTopicId === payload.id ? null : currentTopicId,
      };
    }
    case 'setCurrentTopic': {
      return { topicMap, currentTopicId: payload.id };
    }
    case 'updateTopic': {
      const current = topicMap[payload.id];
      if (!current) {
        return { topicMap, currentTopicId };
      }
      return {
        topicMap: {
          ...topicMap,
          [payload.id]: {
            ...current,
            ...payload.value,
            updatedAt: payload.value.updatedAt ?? Date.now(),
          },
        },
        currentTopicId,
      };
    }
    default: {
      return { topicMap, currentTopicId };
    }
  }
}

export function interventionReducer(
  state: InterventionItem[],
  payload: InterventionDispatch,
): InterventionItem[] {
  switch (payload.type) {
    case 'setInterventions': {
      return payload.value;
    }
    case 'removeIntervention': {
      return state.filter((item) => item.id !== payload.id);
    }
    case 'upsertIntervention': {
      const index = state.findIndex((item) => item.id === payload.value.id);
      if (index < 0) {
        return [...state, payload.value];
      }
      const next = [...state];
      next[index] = payload.value;
      return next;
    }
    default: {
      return state;
    }
  }
}

export function queueReducer(
  state: Record<string, QueuedMessage[]>,
  payload: QueueDispatch,
): Record<string, QueuedMessage[]> {
  switch (payload.type) {
    case 'setQueue': {
      return {
        ...state,
        [payload.sessionKey]: payload.value,
      };
    }
    case 'enqueue': {
      return {
        ...state,
        [payload.sessionKey]: [...(state[payload.sessionKey] ?? []), payload.value],
      };
    }
    case 'flushQueue': {
      return {
        ...state,
        [payload.sessionKey]: [],
      };
    }
    default: {
      return state;
    }
  }
}
