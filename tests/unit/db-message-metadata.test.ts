import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  db,
  deleteSessionMeta,
  getMessageMetaBulk,
  migrateFromLocalStorage,
  saveMessageMeta,
} from '@/lib/db';

describe('IndexedDB message metadata (Dexie)', () => {
  beforeEach(async () => {
    await db.messageMetadata.clear();
    localStorage.clear();
  });

  afterEach(async () => {
    await db.messageMetadata.clear();
    localStorage.clear();
  });

  it('should round-trip save and get', async () => {
    await saveMessageMeta('msg-1', 'session-a', {
      usage: { input_tokens: 10, output_tokens: 33 },
      performance: { tps: 12.5, ttft: 420 },
      model: 'claude-3',
      provider: 'anthropic',
      elapsed: 2640,
    });

    const results = await getMessageMetaBulk(['msg-1']);
    expect(results).toHaveLength(1);
    const record = results[0];
    expect(record).toBeDefined();
    expect(record!.id).toBe('msg-1');
    expect(record!.sessionKey).toBe('session-a');
    expect(record!.usage).toEqual({ input_tokens: 10, output_tokens: 33 });
    expect(record!.performance).toEqual({ tps: 12.5, ttft: 420 });
    expect(record!.model).toBe('claude-3');
    expect(record!.provider).toBe('anthropic');
    expect(record!.elapsed).toBe(2640);
    expect(record!.createdAt).toBeGreaterThan(0);
  });

  it('should return undefined for missing IDs in bulkGet', async () => {
    await saveMessageMeta('msg-1', 'session-a', { model: 'gpt-4' });

    const results = await getMessageMetaBulk(['msg-1', 'msg-missing', 'msg-also-missing']);
    expect(results).toHaveLength(3);
    expect(results[0]).toBeDefined();
    expect(results[0]!.model).toBe('gpt-4');
    expect(results[1]).toBeUndefined();
    expect(results[2]).toBeUndefined();
  });

  it('should upsert on duplicate ID', async () => {
    await saveMessageMeta('msg-1', 'session-a', { model: 'v1' });
    await saveMessageMeta('msg-1', 'session-a', { model: 'v2', elapsed: 500 });

    const results = await getMessageMetaBulk(['msg-1']);
    expect(results[0]!.model).toBe('v2');
    expect(results[0]!.elapsed).toBe(500);
  });

  it('should delete only the target session metadata', async () => {
    await saveMessageMeta('msg-1', 'session-a', { model: 'a' });
    await saveMessageMeta('msg-2', 'session-a', { model: 'a' });
    await saveMessageMeta('msg-3', 'session-b', { model: 'b' });

    await deleteSessionMeta('session-a');

    const results = await getMessageMetaBulk(['msg-1', 'msg-2', 'msg-3']);
    expect(results[0]).toBeUndefined();
    expect(results[1]).toBeUndefined();
    expect(results[2]).toBeDefined();
    expect(results[2]!.model).toBe('b');
  });

  it('should migrate from localStorage', async () => {
    const legacyData: Array<[string, Record<string, unknown>]> = [
      ['old-1', { usage: { output_tokens: 50 }, model: 'legacy-model', performance: { tps: 8 } }],
      ['old-2', { usage: { output_tokens: 100 }, elapsed: 3000 }],
    ];
    localStorage.setItem('mimiclaw:usage-cache', JSON.stringify(legacyData));

    await migrateFromLocalStorage();

    // Data migrated to IndexedDB
    const results = await getMessageMetaBulk(['old-1', 'old-2']);
    expect(results[0]).toBeDefined();
    expect(results[0]!.model).toBe('legacy-model');
    expect(results[0]!.sessionKey).toBe('__migrated__');
    expect(results[1]).toBeDefined();
    expect(results[1]!.elapsed).toBe(3000);

    // localStorage cleaned up
    expect(localStorage.getItem('mimiclaw:usage-cache')).toBeNull();
    expect(localStorage.getItem('mimiclaw:usage-cache-migrated')).toBe('1');
  });

  it('should not re-migrate if flag is set', async () => {
    localStorage.setItem('mimiclaw:usage-cache-migrated', '1');
    localStorage.setItem(
      'mimiclaw:usage-cache',
      JSON.stringify([['stale', { model: 'should-not-migrate' }]]),
    );

    await migrateFromLocalStorage();

    const results = await getMessageMetaBulk(['stale']);
    expect(results[0]).toBeUndefined();
    // localStorage key preserved (migration skipped)
    expect(localStorage.getItem('mimiclaw:usage-cache')).not.toBeNull();
  });

  it('should handle empty localStorage gracefully', async () => {
    await migrateFromLocalStorage();
    expect(localStorage.getItem('mimiclaw:usage-cache-migrated')).toBe('1');
    expect(await db.messageMetadata.count()).toBe(0);
  });
});
