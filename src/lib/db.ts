import Dexie from 'dexie';

// ── Session ─────────────────────────────────────────────────────────────────

export interface DBSession {
  key: string;
  label?: string;
  displayName?: string;
  thinkingLevel?: string;
  model?: string;
  updatedAt: number;
  createdAt: number;
}

// ── Message ─────────────────────────────────────────────────────────────────

export interface DBMessage {
  id: string;
  sessionKey: string;
  role: 'user' | 'assistant' | 'system' | 'toolresult';
  content: unknown; // string | ContentBlock[]
  timestamp: number; // ms epoch
  // Metadata (formerly in separate messageMetadata table)
  usage?: Record<string, unknown>;
  model?: string;
  provider?: string;
  performance?: { ttft?: number; tps?: number };
  elapsed?: number;
  // Message-specific fields
  toolCallId?: string;
  toolName?: string;
  details?: unknown;
  isError?: boolean;
  attachedFiles?: string; // JSON-stringified AttachedFileMeta[]
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
  sessions!: Dexie.Table<DBSession, string>;
  messages!: Dexie.Table<DBMessage, string>;
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
    // v4: add sessions + messages tables, drop old messageMetadata
    this.version(4).stores({
      messageMetadata: null, // drop old metadata-only table
      sessions: 'key, updatedAt, createdAt',
      messages: 'id, sessionKey, timestamp, [sessionKey+timestamp]',
      codeAgentSessionPerf: 'sessionId',
    });
  }
}

export const db = new MimiClawDB();

// ── Session helpers ─────────────────────────────────────────────────────────

export async function saveSession(session: DBSession): Promise<void> {
  try {
    await db.sessions.put(session);
  } catch (err) {
    console.warn('[db] saveSession failed:', err);
  }
}

export async function listSessions(): Promise<DBSession[]> {
  try {
    return await db.sessions.orderBy('updatedAt').reverse().toArray();
  } catch (err) {
    console.warn('[db] listSessions failed:', err);
    return [];
  }
}

export async function getSession(key: string): Promise<DBSession | undefined> {
  try {
    return await db.sessions.get(key);
  } catch (err) {
    console.warn('[db] getSession failed:', err);
    return undefined;
  }
}

export async function deleteSession(key: string): Promise<void> {
  try {
    await db.transaction('rw', db.sessions, db.messages, async () => {
      await db.sessions.delete(key);
      await db.messages.where('sessionKey').equals(key).delete();
    });
  } catch (err) {
    console.warn('[db] deleteSession failed:', err);
  }
}

// ── Message helpers ─────────────────────────────────────────────────────────

export async function saveMessage(message: DBMessage): Promise<void> {
  try {
    await db.messages.put(message);
  } catch (err) {
    console.warn('[db] saveMessage failed:', err);
  }
}

export async function saveMessages(messages: DBMessage[]): Promise<void> {
  try {
    await db.messages.bulkPut(messages);
  } catch (err) {
    console.warn('[db] saveMessages failed:', err);
  }
}

export async function getSessionMessages(
  sessionKey: string,
  limit?: number,
): Promise<DBMessage[]> {
  try {
    const collection = db.messages
      .where('[sessionKey+timestamp]')
      .between([sessionKey, Dexie.minKey], [sessionKey, Dexie.maxKey]);
    if (limit) {
      return await collection.limit(limit).toArray();
    }
    return await collection.toArray();
  } catch (err) {
    console.warn('[db] getSessionMessages failed:', err);
    return [];
  }
}

export async function deleteMessage(id: string): Promise<void> {
  try {
    await db.messages.delete(id);
  } catch (err) {
    console.warn('[db] deleteMessage failed:', err);
  }
}

export async function deleteSessionMessages(sessionKey: string): Promise<void> {
  try {
    await db.messages.where('sessionKey').equals(sessionKey).delete();
  } catch (err) {
    console.warn('[db] deleteSessionMessages failed:', err);
  }
}

/** Update the performance field of an existing message record. */
export async function updateMessagePerformance(
  id: string,
  performance: { ttft?: number; tps?: number },
): Promise<void> {
  try {
    await db.messages.update(id, { performance });
  } catch (err) {
    console.warn('[db] updateMessagePerformance failed:', err);
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
