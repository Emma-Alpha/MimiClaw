import { invokeIpc } from '@/lib/api-client';
import {
  clearErrorRecoveryTimer,
  clearHistoryPoll,
  collectToolUpdates,
  extractImagesAsAttachedFiles,
  extractMediaRefs,
  extractRawFilePaths,
  getLastChatEventAt,
  getMessageText,
  getToolCallFilePath,
  hasErrorRecoveryTimer,
  hasNonToolAssistantContent,
  isToolOnlyMessage,
  isToolResultRole,
  makeAttachedFile,
  setErrorRecoveryTimer,
  setHistoryPollTimer,
  setLastChatEventAt,
  upsertImageCacheEntry,
  upsertToolStatuses,
} from './helpers';
import type { ChatGet, ChatSet } from './store-api';
import type { AttachedFileMeta, ChatSendAttachment, ChatSendPayload, RawMessage } from './types';

export class ChatRuntimeActionImpl {
  readonly #get: ChatGet;
  readonly #set: ChatSet;

  constructor(set: ChatSet, get: ChatGet, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  sendMessage = async (
    payloadOrText: string | ChatSendPayload,
    attachments?: ChatSendAttachment[],
  ) => {
    const payload = typeof payloadOrText === 'string'
      ? { message: payloadOrText }
      : payloadOrText;
    const text = payload.message;
    const resolvedAttachments = payload.files ?? attachments;
    const trimmed = text.trim();
    if (!trimmed && (!resolvedAttachments || resolvedAttachments.length === 0)) return;
    const currentSessionKey = this.#get().currentSessionKey;

    const nowMs = Date.now();
    const userMsg: RawMessage = {
      role: 'user',
      content: trimmed || (resolvedAttachments?.length ? '(file attached)' : ''),
      timestamp: nowMs / 1000,
      id: crypto.randomUUID(),
      details: payload.editorData ? { editorData: payload.editorData } : undefined,
      _attachedFiles: resolvedAttachments?.map((a) => ({
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        preview: a.preview,
        filePath: a.stagedPath,
      })),
    };

    this.#set((s) => ({
      messages: [...s.messages, userMsg],
      sending: true,
      error: null,
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      pendingFinal: false,
      lastUserMessageAt: nowMs,
      lastRunWasAborted: false,
    }));

    const { sessionLabels, messages } = this.#get();
    const isFirstMessage = !messages.slice(0, -1).some((m) => m.role === 'user');
    if (!currentSessionKey.endsWith(':main') && isFirstMessage && !sessionLabels[currentSessionKey] && trimmed) {
      const truncated = trimmed.length > 50 ? `${trimmed.slice(0, 50)}…` : trimmed;
      this.#set((s) => ({ sessionLabels: { ...s.sessionLabels, [currentSessionKey]: truncated } }));
    }

    this.#set((s) => ({ sessionLastActivity: { ...s.sessionLastActivity, [currentSessionKey]: nowMs } }));

    setLastChatEventAt(Date.now());
    clearHistoryPoll();
    clearErrorRecoveryTimer();

    const POLL_START_DELAY = 3_000;
    const POLL_INTERVAL = 4_000;
    const pollHistory = () => {
      const state = this.#get();
      if (!state.sending) {
        clearHistoryPoll();
        return;
      }
      if (state.streamingMessage) {
        setHistoryPollTimer(setTimeout(pollHistory, POLL_INTERVAL));
        return;
      }
      state.loadHistory(true);
      setHistoryPollTimer(setTimeout(pollHistory, POLL_INTERVAL));
    };
    setHistoryPollTimer(setTimeout(pollHistory, POLL_START_DELAY));

    const SAFETY_TIMEOUT_MS = 90_000;
    const checkStuck = () => {
      const state = this.#get();
      if (!state.sending) return;
      if (state.streamingMessage || state.streamingText) return;
      if (state.pendingFinal) {
        setTimeout(checkStuck, 10_000);
        return;
      }
      if (Date.now() - getLastChatEventAt() < SAFETY_TIMEOUT_MS) {
        setTimeout(checkStuck, 10_000);
        return;
      }
      clearHistoryPoll();
      this.#set({
        error:
          'No response received from the model. The provider may be unavailable or the API key may have insufficient quota. Please check your provider settings.',
        sending: false,
        activeRunId: null,
        lastUserMessageAt: null,
      });
    };
    setTimeout(checkStuck, 30_000);

    try {
      const idempotencyKey = crypto.randomUUID();
      const hasMedia = resolvedAttachments && resolvedAttachments.length > 0;
      if (hasMedia) {
        console.log('[sendMessage] Media paths:', resolvedAttachments.map((a) => a.stagedPath));
      }

      if (hasMedia && resolvedAttachments) {
        for (const a of resolvedAttachments) {
          upsertImageCacheEntry(a.stagedPath, {
            fileName: a.fileName,
            mimeType: a.mimeType,
            fileSize: a.fileSize,
            preview: a.preview,
          });
        }
      }

      let result: { success: boolean; result?: { runId?: string }; error?: string };
      const CHAT_SEND_TIMEOUT_MS = 120_000;

      if (hasMedia) {
        result = (await invokeIpc('chat:sendWithMedia', {
          sessionKey: currentSessionKey,
          message: trimmed || 'Process the attached file(s).',
          deliver: false,
          idempotencyKey,
          media: resolvedAttachments.map((a) => ({
            filePath: a.stagedPath,
            mimeType: a.mimeType,
            fileName: a.fileName,
          })),
        })) as { success: boolean; result?: { runId?: string }; error?: string };
      } else {
        result = (await invokeIpc(
          'gateway:rpc',
          'chat.send',
          {
            sessionKey: currentSessionKey,
            message: trimmed,
            deliver: false,
            idempotencyKey,
          },
          CHAT_SEND_TIMEOUT_MS,
        )) as { success: boolean; result?: { runId?: string }; error?: string };
      }

      console.log(
        `[sendMessage] RPC result: success=${result.success}, runId=${result.result?.runId || 'none'}`,
      );

      if (!result.success) {
        clearHistoryPoll();
        this.#set({ error: result.error || 'Failed to send message', sending: false });
      } else if (result.result?.runId) {
        this.#set({ activeRunId: result.result.runId });
      }
    } catch (err) {
      clearHistoryPoll();
      this.#set({ error: String(err), sending: false });
    }
  };

  abortRun = async () => {
    clearHistoryPoll();
    clearErrorRecoveryTimer();
    const { currentSessionKey } = this.#get();
    this.#set({
      sending: false,
      streamingText: '',
      streamingMessage: null,
      pendingFinal: false,
      lastUserMessageAt: null,
      pendingToolImages: [],
      lastRunWasAborted: true,
    });
    this.#set({ streamingTools: [] });

    try {
      await invokeIpc('gateway:rpc', 'chat.abort', { sessionKey: currentSessionKey });
    } catch (err) {
      this.#set({ error: String(err) });
    }
  };

  handleChatEvent = (event: Record<string, unknown>) => {
    const runId = String(event.runId || '');
    const eventState = String(event.state || '');
    const eventSessionKey = event.sessionKey != null ? String(event.sessionKey) : null;
    const { activeRunId, currentSessionKey } = this.#get();

    if (eventSessionKey != null && eventSessionKey !== currentSessionKey) return;
    if (activeRunId && runId && runId !== activeRunId) return;

    setLastChatEventAt(Date.now());

    let resolvedState = eventState;
    if (!resolvedState && event.message && typeof event.message === 'object') {
      const message = event.message as Record<string, unknown>;
      const stopReason = message.stopReason ?? message.stop_reason;
      if (stopReason) {
        resolvedState = 'final';
      } else if (message.role || message.content) {
        resolvedState = 'delta';
      }
    }

    const hasUsefulData =
      resolvedState === 'delta'
      || resolvedState === 'final'
      || resolvedState === 'error'
      || resolvedState === 'aborted';

    if (hasUsefulData) {
      clearHistoryPoll();
      const { sending } = this.#get();
      if (!sending && runId) {
        this.#set({ sending: true, activeRunId: runId, error: null });
      }
    }

    this.#handleRuntimeEventState(event, resolvedState, runId);
  };

  toggleThinking = () => this.#set((s) => ({ showThinking: !s.showThinking }));

  refresh = async () => {
    const { loadHistory, loadSessions } = this.#get();
    await Promise.all([loadHistory(), loadSessions()]);
  };

  clearError = () => this.#set({ error: null });

  #handleRuntimeEventState(event: Record<string, unknown>, resolvedState: string, runId: string): void {
    switch (resolvedState) {
      case 'started': {
        const { sending: currentSending } = this.#get();
        if (!currentSending && runId) {
          this.#set({ sending: true, activeRunId: runId, error: null });
        }
        break;
      }
      case 'delta': {
        if (hasErrorRecoveryTimer()) {
          clearErrorRecoveryTimer();
          this.#set({ error: null });
        }
        const updates = collectToolUpdates(event.message, resolvedState);
        this.#set((s) => ({
          streamingMessage: (() => {
            if (event.message && typeof event.message === 'object') {
              const messageRole = (event.message as RawMessage).role;
              if (isToolResultRole(messageRole)) return s.streamingMessage;
            }
            return event.message ?? s.streamingMessage;
          })(),
          streamingTools:
            updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
        }));
        break;
      }
      case 'final': {
        clearErrorRecoveryTimer();
        if (this.#get().error) this.#set({ error: null });

        const finalMessage = event.message as RawMessage | undefined;
        if (finalMessage) {
          const updates = collectToolUpdates(finalMessage, resolvedState);
          if (isToolResultRole(finalMessage.role)) {
            const currentStreamForPath = this.#get().streamingMessage as RawMessage | null;
            const matchedPath =
              currentStreamForPath && finalMessage.toolCallId
                ? getToolCallFilePath(currentStreamForPath, finalMessage.toolCallId)
                : undefined;

            const toolFiles: AttachedFileMeta[] = [...extractImagesAsAttachedFiles(finalMessage.content)];

            if (matchedPath) {
              for (const file of toolFiles) {
                if (!file.filePath) {
                  file.filePath = matchedPath;
                  file.fileName = matchedPath.split(/[\\/]/).pop() || 'image';
                }
              }
            }

            const text = getMessageText(finalMessage.content);
            if (text) {
              const mediaRefs = extractMediaRefs(text);
              const mediaRefPaths = new Set(mediaRefs.map((ref) => ref.filePath));
              for (const ref of mediaRefs) {
                toolFiles.push(makeAttachedFile(ref));
              }
              for (const ref of extractRawFilePaths(text)) {
                if (!mediaRefPaths.has(ref.filePath)) {
                  toolFiles.push(makeAttachedFile(ref));
                }
              }
            }

            this.#set((s) => {
              const currentStream = s.streamingMessage as RawMessage | null;
              const snapshotMessages: RawMessage[] = [];
              if (currentStream) {
                const streamRole = currentStream.role;
                if (streamRole === 'assistant' || streamRole === undefined) {
                  const snapshotId =
                    currentStream.id || `${runId || s.activeRunId || 'run'}-turn-${s.messages.length}`;
                  if (!s.messages.some((message) => message.id === snapshotId)) {
                    snapshotMessages.push({
                      ...(currentStream as RawMessage),
                      role: 'assistant',
                      id: snapshotId,
                    });
                  }
                }
              }

              return {
                messages:
                  snapshotMessages.length > 0 ? [...s.messages, ...snapshotMessages] : s.messages,
                streamingText: '',
                streamingMessage: null,
                pendingFinal: true,
                pendingToolImages:
                  toolFiles.length > 0 ? [...s.pendingToolImages, ...toolFiles] : s.pendingToolImages,
                streamingTools:
                  updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
              };
            });
            break;
          }

          const toolOnly = isToolOnlyMessage(finalMessage);
          const hasOutput = hasNonToolAssistantContent(finalMessage);
          this.#set((s) => {
            const effectiveRunId = runId || s.activeRunId || 'run';
            const messageId =
              finalMessage.id
              || (toolOnly
                ? `run-${effectiveRunId}-tool-${finalMessage.toolCallId || finalMessage.timestamp || Date.now()}`
                : `run-${effectiveRunId}`);

            const nextTools =
              updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools;
            const streamingTools = hasOutput ? [] : nextTools;

            const pendingImages = s.pendingToolImages;
            const messageWithImages: RawMessage =
              pendingImages.length > 0
                ? {
                  ...finalMessage,
                  role: (finalMessage.role || 'assistant') as RawMessage['role'],
                  id: messageId,
                  _attachedFiles: [...(finalMessage._attachedFiles || []), ...pendingImages],
                }
                : {
                  ...finalMessage,
                  role: (finalMessage.role || 'assistant') as RawMessage['role'],
                  id: messageId,
                };

            const clearPendingImages = { pendingToolImages: [] as AttachedFileMeta[] };
            const alreadyExists = s.messages.some((message) => message.id === messageId);

            if (alreadyExists) {
              return toolOnly
                ? {
                  streamingText: '',
                  streamingMessage: null,
                  pendingFinal: true,
                  streamingTools,
                  ...clearPendingImages,
                }
                : {
                  streamingText: '',
                  streamingMessage: null,
                  sending: hasOutput ? false : s.sending,
                  activeRunId: hasOutput ? null : s.activeRunId,
                  pendingFinal: hasOutput ? false : true,
                  streamingTools,
                  ...clearPendingImages,
                };
            }

            return toolOnly
              ? {
                messages: [...s.messages, messageWithImages],
                streamingText: '',
                streamingMessage: null,
                pendingFinal: true,
                streamingTools,
                ...clearPendingImages,
              }
              : {
                messages: [...s.messages, messageWithImages],
                streamingText: '',
                streamingMessage: null,
                sending: hasOutput ? false : s.sending,
                activeRunId: hasOutput ? null : s.activeRunId,
                pendingFinal: hasOutput ? false : true,
                streamingTools,
                ...clearPendingImages,
              };
          });

          if (hasOutput && !toolOnly) {
            clearHistoryPoll();
            void this.#get().loadHistory(true);
          }
        } else {
          this.#set({ streamingText: '', streamingMessage: null, pendingFinal: true });
          void this.#get().loadHistory();
        }
        break;
      }
      case 'error': {
        const errorMessage = String(event.errorMessage || 'An error occurred');
        const wasSending = this.#get().sending;

        const currentStream = this.#get().streamingMessage as RawMessage | null;
        if (currentStream && (currentStream.role === 'assistant' || currentStream.role === undefined)) {
          const snapshotId = (currentStream as RawMessage).id || `error-snap-${Date.now()}`;
          const alreadyExists = this.#get().messages.some((message) => message.id === snapshotId);
          if (!alreadyExists) {
            this.#set((s) => ({
              messages: [...s.messages, { ...currentStream, role: 'assistant' as const, id: snapshotId }],
            }));
          }
        }

        this.#set({
          error: errorMessage,
          streamingText: '',
          streamingMessage: null,
          streamingTools: [],
          pendingFinal: false,
          pendingToolImages: [],
        });

        if (wasSending) {
          clearErrorRecoveryTimer();
          const ERROR_RECOVERY_GRACE_MS = 15_000;
          setErrorRecoveryTimer(
            setTimeout(() => {
              setErrorRecoveryTimer(null);
              const state = this.#get();
              if (state.sending && !state.streamingMessage) {
                clearHistoryPoll();
                this.#set({
                  sending: false,
                  activeRunId: null,
                  lastUserMessageAt: null,
                });
                void state.loadHistory(true);
              }
            }, ERROR_RECOVERY_GRACE_MS),
          );
        } else {
          clearHistoryPoll();
          this.#set({ sending: false, activeRunId: null, lastUserMessageAt: null });
        }
        break;
      }
      case 'aborted': {
        clearHistoryPoll();
        clearErrorRecoveryTimer();
        this.#set({
          sending: false,
          activeRunId: null,
          streamingText: '',
          streamingMessage: null,
          streamingTools: [],
          pendingFinal: false,
          lastUserMessageAt: null,
          pendingToolImages: [],
        });
        break;
      }
      default: {
        const { sending } = this.#get();
        if (sending && event.message && typeof event.message === 'object') {
          console.warn(
            `[handleChatEvent] Unknown event state "${resolvedState}", treating message as streaming delta. Event keys:`,
            Object.keys(event),
          );
          const updates = collectToolUpdates(event.message, 'delta');
          this.#set((s) => ({
            streamingMessage: event.message ?? s.streamingMessage,
            streamingTools:
              updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
          }));
        }
        break;
      }
    }
  }
}
