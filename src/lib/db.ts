import Dexie from 'dexie';

// ── Gateway chat metadata (useChatStore path) ────────────────────────────────

export interface DBMessageMeta {
  id: string;
  sessionKey: string;
  usage?: Record<string, unknown>;
  performance?: { ttft?: number; tps?: number };
  model?: string;
  provider?: string;
  elapsed?: number;
  createdAt: number;
}

// ── Code Agent usage (useCodeAgentStore path) ────────────────────────────────

/** Per-session snapshot of all assistant-usage TPS data */
export interface DBCodeAgentSessionPerf {
  /** Session ID (primary key) */
  sessionId: string;
  /** Array of usage perf entries, ordered by appearance */
  entries: Array<{
    outputTokens: number;
    tps?: number;
    ttftMs?: number;
    durationMs?: number;
  }>;
  updatedAt: number;
}

// ── Database ─────────────────────────────────────────────────────────────────

class MimiClawDB extends Dexie {
  messageMetadata!: Dexie.Table<DBMessageMeta, string>;
  codeAgentSessionPerf!: Dexie.Table<DBCodeAgentSessionPerf, string>;

  constructor() {
    super('mimiclaw');
    this.version(1).stores({
      messageMetadata: 'id, sessionKey, createdAt',
    });
    // v2→v3: replace per-message codeAgentUsage with per-session codeAgentSessionPerf
    this.version(3).stores({
      messageMetadata: 'id, sessionKey, createdAt',
      codeAgentUsage: null, // drop old table
      codeAgentSessionPerf: 'sessionId',
    });
  }
}

export const db = new MimiClawDB();

// ── Gateway chat helpers ─────────────────────────────────────────────────────

export async function saveMessageMeta(
  id: string,
  sessionKey: string,
  meta: Omit<DBMessageMeta, 'id' | 'sessionKey' | 'createdAt'>,
): Promise<void> {
  try {
    await db.messageMetadata.put({ id, sessionKey, ...meta, createdAt: Date.now() });
  } catch (err) {
    console.warn('[db] saveMessageMeta failed:', err);
  }
}

export async function getMessageMetaBulk(
  ids: string[],
): Promise<Array<DBMessageMeta | undefined>> {
  try {
    return await db.messageMetadata.bulkGet(ids);
  } catch (err) {
    console.warn('[db] getMessageMetaBulk failed:', err);
    return ids.map(() => undefined);
  }
}

export async function deleteSessionMeta(sessionKey: string): Promise<void> {
  try {
    await db.messageMetadata.where('sessionKey').equals(sessionKey).delete();
  } catch (err) {
    console.warn('[db] deleteSessionMeta failed:', err);
  }
}

// ── Code Agent helpers ───────────────────────────────────────────────────────

/** Save all assistant-usage TPS entries for a Code Agent session. */
export async function saveCodeAgentSessionPerf(
  sessionId: string,
  entries: DBCodeAgentSessionPerf['entries'],
): Promise<void> {
  try {
    await db.codeAgentSessionPerf.put({ sessionId, entries, updatedAt: Date.now() });
  } catch (err) {
    console.warn('[db] saveCodeAgentSessionPerf failed:', err);
  }
}

/** Get cached TPS entries for a Code Agent session. */
export async function getCodeAgentSessionPerf(
  sessionId: string,
): Promise<DBCodeAgentSessionPerf | undefined> {
  try {
    return await db.codeAgentSessionPerf.get(sessionId);
  } catch (err) {
    console.warn('[db] getCodeAgentSessionPerf failed:', err);
    return undefined;
  }
}

// ── Migration ────────────────────────────────────────────────────────────────

export async function migrateFromLocalStorage(): Promise<void> {
  const LEGACY_KEY = 'mimiclaw:usage-cache';
  const MIGRATED_FLAG = 'mimiclaw:usage-cache-migrated';

  if (localStorage.getItem(MIGRATED_FLAG)) return;

  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) {
      localStorage.setItem(MIGRATED_FLAG, '1');
      return;
    }

    const entries = JSON.parse(raw) as Array<
      [string, { usage?: Record<string, unknown>; model?: string; provider?: string; performance?: Record<string, unknown>; elapsed?: number }]
    >;

    const records: DBMessageMeta[] = entries.map(([id, meta]) => ({
      id,
      sessionKey: '__migrated__',
      usage: meta.usage,
      model: meta.model,
      provider: meta.provider,
      performance: meta.performance as DBMessageMeta['performance'],
      elapsed: meta.elapsed,
      createdAt: Date.now(),
    }));

    await db.messageMetadata.bulkPut(records);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(MIGRATED_FLAG, '1');
  } catch (err) {
    console.warn('[db] Migration from localStorage failed:', err);
  }
}
