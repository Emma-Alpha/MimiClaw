// ─── Shared domain types ───────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  /** bcrypt-style, but for MVP we store plaintext (upgrade later) */
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  username: string;
  expiresAt: string;
}

export interface Workspace {
  id: string;
  userId: string;
  /** Current lifecycle state of the gateway process */
  gatewayState: 'stopped' | 'starting' | 'running' | 'error';
  gatewayPid: number | null;
  /** Port the gateway is listening on (once running) */
  gatewayPort: number | null;
  /** WebSocket URL exposed to the Electron client */
  gatewayWsUrl: string | null;
  gatewayError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppStore {
  users: User[];
  workspaces: Workspace[];
}

// ─── JWT payload ────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;        // userId
  username: string;
  workspaceId: string;
  iat: number;
  exp: number;
}

// ─── Request/Response shapes (mirror what the Electron client expects) ──────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  username: string;
  workspaceId: string;
  expiresAt: string;
}

export interface WorkspaceStatusResponse {
  workspaceId: string;
  userId: string;
  gatewayState: Workspace['gatewayState'];
  gatewayWsUrl: string | null;
  gatewayPort: number | null;
  gatewayError: string | null;
}
