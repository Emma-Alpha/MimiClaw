import { updateSessionConfig } from '@/lib/db';
import type { StoreGetter, StorePublicActions, StoreSetter } from '@/stores/types';
import type { CodeAgentStore } from '../timeline/types';
import type { SessionConfigAction, ThinkingLevel } from './types';
import type { CodeAgentEffortLevel } from '../../../../../shared/code-agent';

type Setter = StoreSetter<CodeAgentStore>;
type Getter = StoreGetter<CodeAgentStore>;

export class SessionConfigActionImpl {
  readonly #set: Setter;
  readonly #get: Getter;

  constructor(set: Setter, get: Getter, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  setSessionModel = (model: string | null) => {
    this.#set({ sessionModel: model });
    const sid = this.#get().sessionId;
    if (sid && model != null) void updateSessionConfig(sid, { model });
  };

  setSessionEffort = (effort: CodeAgentEffortLevel | null) => {
    this.#set({ sessionEffort: effort });
    const sid = this.#get().sessionId;
    if (sid && effort != null) void updateSessionConfig(sid, { effort });
  };

  setSessionThinkingLevel = (level: ThinkingLevel | null) => {
    this.#set({ sessionThinkingLevel: level });
    const sid = this.#get().sessionId;
    if (sid && level != null) void updateSessionConfig(sid, { thinkingLevel: level });
  };

  restoreSessionConfig = (config: { model?: string; effort?: string; thinkingLevel?: string } | null) => {
    if (!config) {
      this.#set({ sessionModel: null, sessionEffort: null, sessionThinkingLevel: null });
      return;
    }
    this.#set({
      sessionModel: config.model ?? null,
      sessionEffort: (config.effort as CodeAgentEffortLevel) ?? null,
      sessionThinkingLevel: (config.thinkingLevel as ThinkingLevel) ?? null,
    });
  };

  resetSessionConfig = () => {
    this.#set({ sessionModel: null, sessionEffort: null, sessionThinkingLevel: null });
  };
}

export type SessionConfigActions = StorePublicActions<SessionConfigActionImpl>;

export const createSessionConfigSlice = (set: Setter, get: Getter, api?: unknown): SessionConfigAction =>
  new SessionConfigActionImpl(set, get, api);
