import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type { JizhiChatStore, JizhiChatStoreAction } from './types';
import type {
  HostJizhiStreamData,
  HostJizhiStreamEvent,
  JizhiChatMessage,
} from './types';

type Setter = StoreSetter<JizhiChatStore>;
type Getter = StoreGetter<JizhiChatStore>;

function isPlaceholderContent(content: string | undefined): boolean {
  if (!content) return false;

  try {
    const parsed = JSON.parse(content) as { content?: string };
    return parsed.content === '极智思考中...';
  } catch {
    return false;
  }
}

function buildTextContent(value: string): string {
  return JSON.stringify({ content: value });
}

function hasRenderableContent(
  items: NonNullable<JizhiChatMessage['assistantMessage']>['groupMessages'][number]['messages'][number]['content']['items'],
): boolean {
  return items.some((item) => !isPlaceholderContent(item.content));
}

function applyStreamDataToItems(
  items: NonNullable<JizhiChatMessage['assistantMessage']>['groupMessages'][number]['messages'][number]['content']['items'],
  messageUUID: string,
  streamData: HostJizhiStreamData,
): NonNullable<JizhiChatMessage['assistantMessage']>['groupMessages'][number]['messages'][number]['content']['items'] {
  const baseItems = items.length === 1 && isPlaceholderContent(items[0]?.content) ? [] : [...items];
  const blockUUID = typeof streamData.blockUUID === 'string' && streamData.blockUUID.trim()
    ? streamData.blockUUID
    : `block_${crypto.randomUUID()}`;
  const existingIndex = baseItems.findIndex((item) => item.blockUUID === blockUUID);
  const nextItem = {
    blockUUID,
    parentMessageUUID:
      typeof streamData.parentMessageUUID === 'string' && streamData.parentMessageUUID.trim()
        ? streamData.parentMessageUUID
        : messageUUID,
    contentType:
      typeof streamData.contentType === 'string' && streamData.contentType.trim()
        ? streamData.contentType
        : 'text',
    content:
      typeof streamData.content === 'string'
        ? streamData.content
        : buildTextContent(''),
  };

  if (existingIndex >= 0) {
    baseItems[existingIndex] = nextItem;
    return baseItems;
  }

  baseItems.push(nextItem);
  return baseItems;
}

function collectAssistantMessageUUIDs(messages: JizhiChatMessage[]): Set<string> {
  const uuids = new Set<string>();

  for (const message of messages) {
    for (const group of message.assistantMessage?.groupMessages ?? []) {
      for (const item of group.messages) {
        if (item.messageUUID) {
          uuids.add(item.messageUUID);
        }
      }
    }
  }

  return uuids;
}

export class JizhiChatActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void get;
    void _api;
    this.#set = set;
  }

  setLoadingSession: JizhiChatStoreAction['setLoadingSession'] = (loadingSessionId) =>
    this.#set({ loadingSessionId });

  setMessages: JizhiChatStoreAction['setMessages'] = (sessionId, messages, syncedAt) =>
    this.#set((state) => {
    const syncedAssistantUUIDs = collectAssistantMessageUUIDs(messages);
    const previousPendingPairs = state.pendingMessagesBySession[sessionId] ?? [];
    let nextPendingPairs = previousPendingPairs.filter(
      (pair) => !syncedAssistantUUIDs.has(pair.assistantMessageUUID),
    );

    if (
      nextPendingPairs.length === previousPendingPairs.length
      && messages.length > (state.serverMessageCountBySession[sessionId] ?? 0)
    ) {
      nextPendingPairs = nextPendingPairs.slice(1);
    }

    return {
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: messages,
      },
      pendingMessagesBySession: {
        ...state.pendingMessagesBySession,
        [sessionId]: nextPendingPairs,
      },
      serverMessageCountBySession: {
        ...state.serverMessageCountBySession,
        [sessionId]: messages.length,
      },
      loadingSessionId:
        state.loadingSessionId === sessionId ? null : state.loadingSessionId,
      syncError: null,
      lastSyncedAtBySession: {
        ...state.lastSyncedAtBySession,
        [sessionId]: syncedAt,
      },
    };
    });

  appendPendingMessagePair: JizhiChatStoreAction['appendPendingMessagePair'] = ({
    sessionId,
    prompt,
    assistantMessageUUID,
    model,
    modelName,
  }) => this.#set((state) => {
    const now = new Date().toISOString();
    const userMessageUUID = `local_user_${crypto.randomUUID()}`;
    const nextIndexBase = (state.messagesBySession[sessionId]?.length ?? 0) + 1;

    const userMessage: JizhiChatMessage = {
      index: `local-${nextIndexBase}`,
      role: 'user',
      userMessage: {
        chatId: Number(sessionId) || 0,
        content: {
          items: [
            {
              blockUUID: `block_${crypto.randomUUID()}`,
              parentMessageUUID: userMessageUUID,
              contentType: 'text',
              content: JSON.stringify({ content: prompt }),
            },
          ],
        },
        createdAt: now,
        creatorId: 0,
        creatorName: '我',
        env: 'wan',
        errorMessage: '',
        id: 0,
        messageUUID: userMessageUUID,
        status: 'loading',
        updatedAt: now,
      },
    };

    const assistantMessage: JizhiChatMessage = {
      index: `local-${nextIndexBase + 1}`,
      role: 'assistant',
      assistantMessage: {
        chatId: Number(sessionId) || 0,
        parentMessageId: 0,
        groupMessages: [
          {
            answerGroup: `local_group_${assistantMessageUUID}`,
            messages: [
              {
                content: {
                  items: [
                    {
                      blockUUID: `block_${crypto.randomUUID()}`,
                      parentMessageUUID: assistantMessageUUID,
                      contentType: 'text',
                      content: buildTextContent('极智思考中...'),
                    },
                  ],
                },
                createdAt: now,
                creatorId: 0,
                creatorName: '极智',
                env: 'wan',
                errorMessage: '',
                id: 0,
                isActive: true,
                messageUUID: assistantMessageUUID,
                model: model || 'jizhi',
                modelName: modelName || model || '极智',
                status: 'loading',
                updatedAt: now,
              },
            ],
          },
        ],
      },
    };

    return {
      pendingMessagesBySession: {
        ...state.pendingMessagesBySession,
        [sessionId]: [
          ...(state.pendingMessagesBySession[sessionId] ?? []),
          {
            prompt,
            assistantMessageUUID,
            messages: [userMessage, assistantMessage],
          },
        ],
      },
    };
  });

  appendPendingAssistant: JizhiChatStoreAction['appendPendingAssistant'] = ({
    sessionId,
    assistantMessageUUID,
    model,
    modelName,
    placeholderText,
  }) => this.#set((state) => {
    const now = new Date().toISOString();
    const nextIndexBase = (state.messagesBySession[sessionId]?.length ?? 0)
      + (state.pendingMessagesBySession[sessionId]?.length ?? 0)
      + 1;

    const assistantMessage: JizhiChatMessage = {
      index: `local-${nextIndexBase}`,
      role: 'assistant',
      assistantMessage: {
        chatId: Number(sessionId) || 0,
        parentMessageId: 0,
        groupMessages: [
          {
            answerGroup: `local_group_${assistantMessageUUID}`,
            messages: [
              {
                content: {
                  items: [
                    {
                      blockUUID: `block_${crypto.randomUUID()}`,
                      parentMessageUUID: assistantMessageUUID,
                      contentType: 'text',
                      content: buildTextContent(placeholderText || '极智重新生成中...'),
                    },
                  ],
                },
                createdAt: now,
                creatorId: 0,
                creatorName: '极智',
                env: 'wan',
                errorMessage: '',
                id: 0,
                isActive: true,
                messageUUID: assistantMessageUUID,
                model: model || 'jizhi',
                modelName: modelName || model || '极智',
                status: 'loading',
                updatedAt: now,
              },
            ],
          },
        ],
      },
    };

    return {
      pendingMessagesBySession: {
        ...state.pendingMessagesBySession,
        [sessionId]: [
          ...(state.pendingMessagesBySession[sessionId] ?? []),
          {
            prompt: '',
            assistantMessageUUID,
            messages: [assistantMessage],
          },
        ],
      },
    };
  });

  markPendingPairError: JizhiChatStoreAction['markPendingPairError'] = (
    sessionId,
    assistantMessageUUID,
    errorMessage,
  ) => this.#set((state) => {
    const currentPairs = state.pendingMessagesBySession[sessionId] ?? [];
    if (currentPairs.length === 0) return state;

    const nextPairs = currentPairs.map((pair) => {
      if (pair.assistantMessageUUID !== assistantMessageUUID) {
        return pair;
      }

      return {
        ...pair,
        messages: pair.messages.map((message) => {
          if (message.role !== 'assistant' || !message.assistantMessage) {
            return message;
          }

          return {
            ...message,
            assistantMessage: {
              ...message.assistantMessage,
              groupMessages: message.assistantMessage.groupMessages.map((group) => ({
                ...group,
                messages: group.messages.map((item) => {
                  if (item.messageUUID !== assistantMessageUUID) {
                    return item;
                  }

                  return {
                    ...item,
                    status: 'error',
                    errorMessage,
                    content: {
                      items: [
                        {
                          blockUUID: `block_${crypto.randomUUID()}`,
                          parentMessageUUID: item.messageUUID,
                          contentType: 'text',
                          content: buildTextContent(errorMessage),
                        },
                      ],
                    },
                  };
                }),
              })),
            },
          };
        }),
      };
    });

    return {
      pendingMessagesBySession: {
        ...state.pendingMessagesBySession,
        [sessionId]: nextPairs,
      },
    };
  });

  applyStreamEvent = ({ sessionId, messageUUID, event, data, errorMessage }: HostJizhiStreamEvent) => this.#set((state) => {
    const currentPairs = state.pendingMessagesBySession[sessionId] ?? [];
    if (currentPairs.length === 0) return state;

    let changed = false;

    const nextPairs = currentPairs.map((pair) => {
      if (pair.assistantMessageUUID !== messageUUID) {
        return pair;
      }

      const nextMessages = pair.messages.map((message) => {
        if (message.role !== 'assistant' || !message.assistantMessage) {
          return message;
        }

        let groupChanged = false;
        const nextGroupMessages = message.assistantMessage.groupMessages.map((group) => {
          let messageChanged = false;
          const nextItems = group.messages.map((item) => {
            if (item.messageUUID !== messageUUID) {
              return item;
            }

            let nextStatus = item.status;
            let nextErrorMessage = item.errorMessage;
            let nextContentItems = item.content.items;

            if ((event === 'chunk' || event === 'result') && data) {
              nextContentItems = applyStreamDataToItems(item.content.items, messageUUID, data);
              nextStatus = event === 'result' ? 'success' : 'loading';
              nextErrorMessage = '';
            } else if (event === 'error') {
              nextStatus = 'error';
              nextErrorMessage = errorMessage ?? '极智流式响应失败';
              nextContentItems = [
                {
                  blockUUID: `block_${crypto.randomUUID()}`,
                  parentMessageUUID: messageUUID,
                  contentType: 'text',
                  content: buildTextContent(nextErrorMessage),
                },
              ];
            } else if (event === 'stopped') {
              nextStatus = 'stopped';
              nextErrorMessage = '已停止生成';
              if (!hasRenderableContent(item.content.items)) {
                nextContentItems = [
                  {
                    blockUUID: `block_${crypto.randomUUID()}`,
                    parentMessageUUID: messageUUID,
                    contentType: 'text',
                    content: buildTextContent('已停止生成'),
                  },
                ];
              }
            } else if (event === 'end' && item.content.items.length > 0) {
              nextStatus = 'success';
            }

            const nextUpdatedAt = new Date().toISOString();
            const didChange = nextStatus !== item.status
              || nextErrorMessage !== item.errorMessage
              || nextContentItems !== item.content.items;

            if (!didChange) {
              return item;
            }

            messageChanged = true;
            changed = true;
            return {
              ...item,
              status: nextStatus,
              errorMessage: nextErrorMessage,
              updatedAt: nextUpdatedAt,
              content: {
                items: nextContentItems,
              },
            };
          });

          if (!messageChanged) {
            return group;
          }

          groupChanged = true;
          return {
            ...group,
            messages: nextItems,
          };
        });

        if (!groupChanged) {
          return message;
        }

        return {
          ...message,
          assistantMessage: {
            ...message.assistantMessage,
            groupMessages: nextGroupMessages,
          },
        };
      });

      if (!changed) {
        return pair;
      }

      return {
        ...pair,
        messages: nextMessages,
      };
    });

    if (!changed) {
      return state;
    }

    return {
      pendingMessagesBySession: {
        ...state.pendingMessagesBySession,
        [sessionId]: nextPairs,
      },
    };
  });

  setSyncError: JizhiChatStoreAction['setSyncError'] = (syncError) => this.#set({
    syncError,
    loadingSessionId: null,
  });

  requestRefresh: JizhiChatStoreAction['requestRefresh'] = () =>
    this.#set((state) => ({ refreshNonce: state.refreshNonce + 1 }));
}

export type JizhiChatAction = StorePublicActions<JizhiChatActionImpl>;

export const createJizhiChatSlice = (
  set: Setter,
  get: Getter,
  api?: unknown,
): JizhiChatStoreAction => new JizhiChatActionImpl(set, get, api);
