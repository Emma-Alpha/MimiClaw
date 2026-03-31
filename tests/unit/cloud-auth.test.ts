import { describe, expect, it } from 'vitest';
import { normalizeCloudSession, normalizeExpiration } from '../../shared/cloud-auth';

describe('cloud auth normalization', () => {
  it('normalizes ISO expiration timestamps into epoch milliseconds', () => {
    const value = normalizeExpiration('2026-03-27T12:34:56.000Z');
    expect(value).toBe(Date.parse('2026-03-27T12:34:56.000Z'));
  });

  it('normalizes cloud session payloads with fallback identifiers', () => {
    const session = normalizeCloudSession(
      {
        token: 'token-123',
        expiresAt: '2026-03-27T12:34:56.000Z',
      },
      {
        userId: 'user-1',
        workspaceId: 'ws-1',
      },
    );

    expect(session).toEqual({
      token: 'token-123',
      userId: 'user-1',
      workspaceId: 'ws-1',
      expiresAt: Date.parse('2026-03-27T12:34:56.000Z'),
    });
  });
});
