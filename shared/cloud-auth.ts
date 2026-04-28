export interface CloudSession {
  token: string;
  tokenType?: string;
  userId: string;
  workspaceId: string;
  expiresAt?: number;
  /** Display name (中文名) */
  cname?: string;
  /** Avatar path or URL */
  avatar?: string;
  /** Team code, e.g. "GZ" */
  team?: string;
  /** Staff ID, e.g. "S7212" */
  staffId?: string;
  /** Whether the user has admin privileges */
  isAdmin?: boolean;
}

export interface CloudSessionResponse {
  token: string;
  tokenType?: string;
  token_type?: string;
  userId?: string;
  user_id?: string;
  username?: string;
  workspaceId?: string;
  workspace_id?: string;
  expiresAt?: number | string;
  expires_at?: number | string;
  cname?: string;
  avatar?: string;
  team?: string;
  staffId?: string;
  isAdmin?: boolean;
}

export function normalizeExpiration(value: number | string | undefined): number | undefined {
  if (value == null || value === '') return undefined;

  if (typeof value === 'number') {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue > 1_000_000_000_000 ? numericValue : numericValue * 1000;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

export function normalizeCloudSession(
  data: Partial<CloudSessionResponse>,
  fallback?: { userId?: string; workspaceId?: string },
): CloudSession {
  const token = typeof data.token === 'string' ? data.token.trim() : '';
  const userId = (
    data.userId
    ?? data.user_id
    ?? fallback?.userId
    ?? data.username
    ?? ''
  ).toString().trim();
  const workspaceId = (
    data.workspaceId
    ?? data.workspace_id
    ?? fallback?.workspaceId
    ?? userId
  ).toString().trim();

  if (!token || !userId || !workspaceId) {
    throw new Error('Invalid cloud session response');
  }

  return {
    token,
    tokenType: data.tokenType ?? data.token_type ?? undefined,
    userId,
    workspaceId,
    expiresAt: normalizeExpiration(data.expiresAt ?? data.expires_at),
    cname: data.cname ?? undefined,
    avatar: data.avatar ?? undefined,
    team: data.team ?? undefined,
    staffId: data.staffId ?? undefined,
    isAdmin: data.isAdmin ?? undefined,
  };
}
