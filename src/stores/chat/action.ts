/**
 * Chat actions — stub after gateway chat removal.
 * The store is kept as a minimal inert store so that existing component
 * imports (e.g. ActionBar components) don't break at module-load time.
 * None of the actions are expected to be called in production.
 */
import type { ChatState } from './types';

const noop = () => {};
const asyncNoop = async () => {};

export function createChatActions(..._params: unknown[]): Partial<ChatState> {
  return {
    loadSessions: asyncNoop,
    switchSession: noop,
    newSession: noop,
    deleteSession: asyncNoop,
    cleanupEmptySession: noop,
    loadHistory: asyncNoop,
    sendMessage: asyncNoop,
    abortRun: asyncNoop,
    handleChatEvent: noop,
    toggleThinking: noop,
    refresh: asyncNoop,
    clearError: noop,
    createTopic: () => '',
    switchTopic: noop,
    summarizeTopic: noop,
    deleteTopic: noop,
    clearCurrentTopic: noop,
    approveIntervention: noop,
    rejectIntervention: noop,
    enqueueMessage: () => '',
    flushQueue: () => [],
    setMainInputEditor: noop,
    setChatMode: noop,
    internal_dispatchTopic: noop,
    internal_dispatchIntervention: noop,
    internal_dispatchQueue: noop,
    internal_createTopic: () => '',
  };
}
