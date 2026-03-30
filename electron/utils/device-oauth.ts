/**
 * Device OAuth Manager
 *
 * Implements MiniMax and Qwen Device/Portal OAuth flows natively using
 * only Node.js built-ins (node:crypto) and global fetch. No external
 * runtime dependencies required.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { EventEmitter } from 'events';
import { BrowserWindow, shell } from 'electron';
import { logger } from './logger';
import { saveProvider, getProvider, ProviderConfig } from './secure-storage';
import { getProviderDefaultModel } from './provider-registry';
import { proxyAwareFetch } from './proxy-fetch';
import { saveOAuthTokenToOpenClaw, setOpenClawDefaultModelWithOverride } from './openclaw-auth';

// ─────────────────────────────────────────────────────────────────────
// OAuth utilities (pure Node.js, no external deps)
// ─────────────────────────────────────────────────────────────────────

function toFormUrlEncoded(data: Record<string, string>): string {
    return Object.entries(data)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
}

function generatePkceVerifierChallenge(): { verifier: string; challenge: string } {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

// ─────────────────────────────────────────────────────────────────────
// MiniMax Portal OAuth
// ─────────────────────────────────────────────────────────────────────

export type MiniMaxRegion = 'cn' | 'global';

export type MiniMaxOAuthToken = {
    access: string;
    refresh: string;
    expires: number;
    resourceUrl?: string;
    notification_message?: string;
};

const MINIMAX_OAUTH_CONFIG = {
    cn: { baseUrl: 'https://api.minimaxi.com', clientId: '78257093-7e40-4613-99e0-527b14b39113' },
    global: { baseUrl: 'https://api.minimax.io', clientId: '78257093-7e40-4613-99e0-527b14b39113' },
} as const;
const MINIMAX_OAUTH_SCOPE = 'group_id profile model.completion';
const MINIMAX_OAUTH_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:user_code';

async function loginMiniMaxPortalOAuth(params: {
    openUrl: (url: string) => Promise<void>;
    note: (message: string, title?: string) => Promise<void>;
    progress: { update: (msg: string) => void; stop: (msg?: string) => void };
    region?: MiniMaxRegion;
}): Promise<MiniMaxOAuthToken> {
    const region = params.region ?? 'global';
    const cfg = MINIMAX_OAUTH_CONFIG[region];
    const { verifier, challenge } = generatePkceVerifierChallenge();
    const state = randomBytes(16).toString('base64url');

    const codeRes = await fetch(`${cfg.baseUrl}/oauth/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'x-request-id': randomUUID() },
        body: toFormUrlEncoded({ response_type: 'code', client_id: cfg.clientId, scope: MINIMAX_OAUTH_SCOPE, code_challenge: challenge, code_challenge_method: 'S256', state }),
    });
    if (!codeRes.ok) throw new Error(`MiniMax OAuth code request failed: ${await codeRes.text()}`);
    const oauth = await codeRes.json() as { user_code: string; verification_uri: string; expired_in: number; interval?: number; state: string; error?: string };
    if (!oauth.user_code || !oauth.verification_uri) throw new Error(oauth.error ?? 'MiniMax OAuth missing user_code/verification_uri');
    if (oauth.state !== state) throw new Error('MiniMax OAuth state mismatch');

    await params.note([`Open ${oauth.verification_uri} to approve access.`, `If prompted, enter the code ${oauth.user_code}.`].join('\n'), 'MiniMax OAuth');
    params.openUrl(oauth.verification_uri).catch(() => undefined);

    let pollIntervalMs = oauth.interval ?? 2000;
    const expireTimeMs = oauth.expired_in;
    while (Date.now() < expireTimeMs) {
        params.progress.update('Waiting for MiniMax OAuth approval…');
        const tokenRes = await fetch(`${cfg.baseUrl}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: toFormUrlEncoded({ grant_type: MINIMAX_OAUTH_GRANT_TYPE, client_id: cfg.clientId, user_code: oauth.user_code, code_verifier: verifier }),
        });
        const payload = await tokenRes.json() as { status?: string; access_token?: string; refresh_token?: string; expired_in?: number; resource_url?: string; notification_message?: string; base_resp?: { status_msg?: string } };
        if (payload.status === 'success' && payload.access_token && payload.refresh_token && payload.expired_in) {
            return { access: payload.access_token, refresh: payload.refresh_token, expires: payload.expired_in, resourceUrl: payload.resource_url, notification_message: payload.notification_message };
        }
        if (payload.status === 'error') throw new Error(`MiniMax OAuth failed: ${payload.base_resp?.status_msg ?? 'unknown error'}`);
        pollIntervalMs = Math.min(pollIntervalMs * 1.5, 10000);
        await new Promise(r => setTimeout(r, pollIntervalMs));
    }
    throw new Error('MiniMax OAuth timed out.');
}

// ─────────────────────────────────────────────────────────────────────
// Qwen Portal OAuth
// ─────────────────────────────────────────────────────────────────────

type QwenOAuthToken = {
    access: string;
    refresh: string;
    expires: number;
    resourceUrl?: string;
};

const QWEN_BASE = 'https://chat.qwen.ai';
const QWEN_CLIENT_ID = 'f0304373b74a44d2b584a3fb70ca9e56';
const QWEN_SCOPE = 'openid profile email model.completion';
const QWEN_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

async function loginQwenPortalOAuth(params: {
    openUrl: (url: string) => Promise<void>;
    note: (message: string, title?: string) => Promise<void>;
    progress: { update: (msg: string) => void; stop: (msg?: string) => void };
}): Promise<QwenOAuthToken> {
    const { verifier, challenge } = generatePkceVerifierChallenge();
    const deviceRes = await fetch(`${QWEN_BASE}/api/v1/oauth2/device/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'x-request-id': randomUUID() },
        body: toFormUrlEncoded({ client_id: QWEN_CLIENT_ID, scope: QWEN_SCOPE, code_challenge: challenge, code_challenge_method: 'S256' }),
    });
    if (!deviceRes.ok) throw new Error(`Qwen device authorization failed: ${await deviceRes.text()}`);
    const device = await deviceRes.json() as { device_code: string; user_code: string; verification_uri: string; verification_uri_complete?: string; expires_in: number; interval?: number; error?: string };
    if (!device.device_code || !device.user_code) throw new Error(device.error ?? 'Qwen device auth missing device_code/user_code');
    const verificationUrl = device.verification_uri_complete || device.verification_uri;

    await params.note([`Open ${verificationUrl} to approve access.`, `If prompted, enter the code ${device.user_code}.`].join('\n'), 'Qwen OAuth');
    params.openUrl(verificationUrl).catch(() => undefined);

    const start = Date.now();
    let pollIntervalMs = device.interval ? device.interval * 1000 : 2000;
    const timeoutMs = device.expires_in * 1000;
    while (Date.now() - start < timeoutMs) {
        params.progress.update('Waiting for Qwen OAuth approval…');
        const tokenRes = await fetch(`${QWEN_BASE}/api/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: toFormUrlEncoded({ grant_type: QWEN_GRANT_TYPE, client_id: QWEN_CLIENT_ID, device_code: device.device_code, code_verifier: verifier }),
        });
        if (!tokenRes.ok) {
            let err: { error?: string; error_description?: string } = {};
            try { err = await tokenRes.json(); } catch { /* ignore */ }
            if (err.error === 'authorization_pending') { /* keep polling */ }
            else if (err.error === 'slow_down') { pollIntervalMs = Math.min(pollIntervalMs * 1.5, 10000); }
            else throw new Error(`Qwen OAuth failed: ${err.error_description || err.error || tokenRes.statusText}`);
        } else {
            const t = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number; resource_url?: string };
            if (t.access_token && t.refresh_token && t.expires_in) {
                return { access: t.access_token, refresh: t.refresh_token, expires: Date.now() + t.expires_in * 1000, resourceUrl: t.resource_url };
            }
            throw new Error('Qwen OAuth returned incomplete token payload.');
        }
        await new Promise(r => setTimeout(r, pollIntervalMs));
    }
    throw new Error('Qwen OAuth timed out.');
}

export type OAuthProviderType = 'minimax-portal' | 'minimax-portal-cn' | 'qwen-portal';
export type { MiniMaxRegion };

// ─────────────────────────────────────────────────────────────
// DeviceOAuthManager
// ─────────────────────────────────────────────────────────────

class DeviceOAuthManager extends EventEmitter {
    private activeProvider: OAuthProviderType | null = null;
    private activeAccountId: string | null = null;
    private activeLabel: string | null = null;
    private active: boolean = false;
    private mainWindow: BrowserWindow | null = null;

    private async runWithProxyAwareFetch<T>(task: () => Promise<T>): Promise<T> {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = ((input: string | URL, init?: RequestInit) =>
            proxyAwareFetch(input, init)) as typeof fetch;
        try {
            return await task();
        } finally {
            globalThis.fetch = originalFetch;
        }
    }

    setWindow(window: BrowserWindow) {
        this.mainWindow = window;
    }

    async startFlow(
        provider: OAuthProviderType,
        region: MiniMaxRegion = 'global',
        options?: { accountId?: string; label?: string },
    ): Promise<boolean> {
        if (this.active) {
            await this.stopFlow();
        }

        this.active = true;
        this.emit('oauth:start', { provider, accountId: options?.accountId || provider });
        this.activeProvider = provider;
        this.activeAccountId = options?.accountId || provider;
        this.activeLabel = options?.label || null;

        try {
            if (provider === 'minimax-portal' || provider === 'minimax-portal-cn') {
                const actualRegion = provider === 'minimax-portal-cn' ? 'cn' : (region || 'global');
                await this.runMiniMaxFlow(actualRegion, provider);
            } else if (provider === 'qwen-portal') {
                await this.runQwenFlow();
            } else {
                throw new Error(`Unsupported OAuth provider type: ${provider}`);
            }
            return true;
        } catch (error) {
            if (!this.active) {
                // Flow was cancelled — not an error
                return false;
            }
            logger.error(`[DeviceOAuth] Flow error for ${provider}:`, error);
            this.emitError(error instanceof Error ? error.message : String(error));
            this.active = false;
            this.activeProvider = null;
            this.activeAccountId = null;
            this.activeLabel = null;
            return false;
        }
    }

    async stopFlow(): Promise<void> {
        this.active = false;
        this.activeProvider = null;
        this.activeAccountId = null;
        this.activeLabel = null;
        logger.info('[DeviceOAuth] Flow explicitly stopped');
    }

    // ─────────────────────────────────────────────────────────
    // MiniMax flow
    // ─────────────────────────────────────────────────────────

    private async runMiniMaxFlow(region?: MiniMaxRegion, providerType: OAuthProviderType = 'minimax-portal'): Promise<void> {
        const provider = this.activeProvider!;

        const token: MiniMaxOAuthToken = await this.runWithProxyAwareFetch(() => loginMiniMaxPortalOAuth({
            region,
            openUrl: async (url) => {
                logger.info(`[DeviceOAuth] MiniMax opening browser: ${url}`);
                // Open the authorization URL in the system browser
                shell.openExternal(url).catch((err) =>
                    logger.warn(`[DeviceOAuth] Failed to open browser:`, err)
                );
            },
            note: async (message, _title) => {
                if (!this.active) return;
                // The extension calls note() with a message containing
                // the user_code and verification_uri — parse them for the UI
                const { verificationUri, userCode } = this.parseNote(message);
                if (verificationUri && userCode) {
                    this.emitCode({ provider, verificationUri, userCode, expiresIn: 300 });
                } else {
                    logger.info(`[DeviceOAuth] MiniMax note: ${message}`);
                }
            },
            progress: {
                update: (msg) => logger.info(`[DeviceOAuth] MiniMax progress: ${msg}`),
                stop: (msg) => logger.info(`[DeviceOAuth] MiniMax progress done: ${msg ?? ''}`),
            },
        }));

        if (!this.active) return;

        await this.onSuccess(providerType, {
            access: token.access,
            refresh: token.refresh,
            expires: token.expires,
            // MiniMax returns a per-account resourceUrl as the API base URL
            resourceUrl: token.resourceUrl,
            // Revert back to anthropic-messages
            api: 'anthropic-messages',
            region,
        });
    }

    // ─────────────────────────────────────────────────────────
    // Qwen flow
    // ─────────────────────────────────────────────────────────

    private async runQwenFlow(): Promise<void> {
        const provider = this.activeProvider!;

        const token: QwenOAuthToken = await this.runWithProxyAwareFetch(() => loginQwenPortalOAuth({
            openUrl: async (url) => {
                logger.info(`[DeviceOAuth] Qwen opening browser: ${url}`);
                shell.openExternal(url).catch((err) =>
                    logger.warn(`[DeviceOAuth] Failed to open browser:`, err)
                );
            },
            note: async (message, _title) => {
                if (!this.active) return;
                const { verificationUri, userCode } = this.parseNote(message);
                if (verificationUri && userCode) {
                    this.emitCode({ provider, verificationUri, userCode, expiresIn: 300 });
                } else {
                    logger.info(`[DeviceOAuth] Qwen note: ${message}`);
                }
            },
            progress: {
                update: (msg) => logger.info(`[DeviceOAuth] Qwen progress: ${msg}`),
                stop: (msg) => logger.info(`[DeviceOAuth] Qwen progress done: ${msg ?? ''}`),
            },
        }));

        if (!this.active) return;

        await this.onSuccess('qwen-portal', {
            access: token.access,
            refresh: token.refresh,
            expires: token.expires,
            // Qwen returns a per-account resourceUrl as the API base URL
            resourceUrl: token.resourceUrl,
            // Qwen uses OpenAI Completions API format
            api: 'openai-completions',
        });
    }

    // ─────────────────────────────────────────────────────────
    // Success handler
    // ─────────────────────────────────────────────────────────

    private async onSuccess(providerType: OAuthProviderType, token: {
        access: string;
        refresh: string;
        expires: number;
        resourceUrl?: string;
        api: 'anthropic-messages' | 'openai-completions';
        region?: MiniMaxRegion;
    }) {
        const accountId = this.activeAccountId || providerType;
        const accountLabel = this.activeLabel;
        this.active = false;
        this.activeProvider = null;
        this.activeAccountId = null;
        this.activeLabel = null;
        logger.info(`[DeviceOAuth] Successfully completed OAuth for ${providerType}`);

        // 1. Write OAuth token to OpenClaw's auth-profiles.json in native OAuth format.
        //    (matches what `openclaw models auth login` → upsertAuthProfile writes).
        //    We save both MiniMax providers to the generic "minimax-portal" profile
        //    so OpenClaw's gateway auto-refresher knows how to find it.
        try {
            const tokenProviderId = providerType.startsWith('minimax-portal') ? 'minimax-portal' : providerType;
            await saveOAuthTokenToOpenClaw(tokenProviderId, {
                access: token.access,
                refresh: token.refresh,
                expires: token.expires,
            });
        } catch (err) {
            logger.warn(`[DeviceOAuth] Failed to save OAuth token to OpenClaw:`, err);
        }

        // 2. Write openclaw.json: set default model + provider config (baseUrl/api/models)
        //    This mirrors what the OpenClaw plugin's configPatch does after CLI login.
        //    The baseUrl comes from token.resourceUrl (per-account URL from the OAuth server)
        //    or falls back to the provider's default public endpoint.
        const defaultBaseUrl = providerType === 'minimax-portal'
            ? 'https://api.minimax.io/anthropic'
            : (providerType === 'minimax-portal-cn' ? 'https://api.minimaxi.com/anthropic' : 'https://portal.qwen.ai/v1');

        let baseUrl = token.resourceUrl || defaultBaseUrl;

        // Ensure baseUrl has a protocol prefix
        if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = 'https://' + baseUrl;
        }

        // Ensure the base URL ends with /anthropic
        if (providerType.startsWith('minimax-portal') && baseUrl) {
            baseUrl = baseUrl.replace(/\/v1$/, '').replace(/\/anthropic$/, '').replace(/\/$/, '') + '/anthropic';
        } else if (providerType === 'qwen-portal' && baseUrl) {
            // Ensure Qwen API gets /v1 at the end
            if (!baseUrl.endsWith('/v1')) {
                baseUrl = baseUrl.replace(/\/$/, '') + '/v1';
            }
        }

        try {
            const tokenProviderId = providerType.startsWith('minimax-portal') ? 'minimax-portal' : providerType;
            await setOpenClawDefaultModelWithOverride(tokenProviderId, undefined, {
                baseUrl,
                api: token.api,
                // Tells OpenClaw's anthropic adapter to use `Authorization: Bearer` instead of `x-api-key`
                authHeader: providerType.startsWith('minimax-portal') ? true : undefined,
                // OAuth placeholder — tells Gateway to resolve credentials
                // from auth-profiles.json (type: 'oauth') instead of a static API key.
                apiKeyEnv: tokenProviderId === 'minimax-portal' ? 'minimax-oauth' : 'qwen-oauth',
            });
        } catch (err) {
            logger.warn(`[DeviceOAuth] Failed to configure openclaw models:`, err);
        }

        // 3. Save provider record in ClawX's own store so UI shows it as configured
        const existing = await getProvider(accountId);
        const nameMap: Record<OAuthProviderType, string> = {
            'minimax-portal': 'MiniMax (Global)',
            'minimax-portal-cn': 'MiniMax (CN)',
            'qwen-portal': 'Qwen',
        };
        const providerConfig: ProviderConfig = {
            id: accountId,
            name: accountLabel || nameMap[providerType as OAuthProviderType] || providerType,
            type: providerType,
            enabled: existing?.enabled ?? true,
            baseUrl, // Save the dynamically resolved URL (Global vs CN)

            model: existing?.model || getProviderDefaultModel(providerType),
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await saveProvider(providerConfig);

        // 4. Emit success internally so the main process can restart the Gateway
        this.emit('oauth:success', { provider: providerType, accountId });

        // 5. Emit success to frontend
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('oauth:success', { provider: providerType, accountId, success: true });
        }
    }


    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    /**
     * Parse user_code and verification_uri from the note message sent by
     * the OpenClaw extension's loginXxxPortalOAuth function.
     *
     * Note format (minimax-portal-auth/oauth.ts):
     *   "Open https://platform.minimax.io/oauth-authorize?user_code=dyMj_wOhpK&client=... to approve access.\n"
     *   "If prompted, enter the code dyMj_wOhpK.\n"
     *   ...
     *
     * user_code format: mixed-case alphanumeric with underscore, e.g. "dyMj_wOhpK"
     */
    private parseNote(message: string): { verificationUri?: string; userCode?: string } {
        // Primary: extract URL (everything between "Open " and " to")
        const urlMatch = message.match(/Open\s+(https?:\/\/\S+?)\s+to/i);
        const verificationUri = urlMatch?.[1];

        let userCode: string | undefined;

        // Method 1: extract user_code from URL query param (most reliable)
        if (verificationUri) {
            try {
                const parsed = new URL(verificationUri);
                const qp = parsed.searchParams.get('user_code');
                if (qp) userCode = qp;
            } catch {
                // fall through to text-based extraction
            }
        }

        // Method 2: text-based extraction — matches mixed-case alnum + underscore/hyphen codes
        if (!userCode) {
            const codeMatch = message.match(/enter.*?code\s+([A-Za-z0-9][A-Za-z0-9_-]{3,})/i);
            if (codeMatch?.[1]) userCode = codeMatch[1].replace(/\.$/, ''); // strip trailing period
        }

        return { verificationUri, userCode };
    }

    private emitCode(data: {
        provider: string;
        verificationUri: string;
        userCode: string;
        expiresIn: number;
    }) {
        this.emit('oauth:code', data);
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('oauth:code', data);
        }
    }

    private emitError(message: string) {
        this.emit('oauth:error', { message });
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('oauth:error', { message });
        }
    }
}

export const deviceOAuthManager = new DeviceOAuthManager();
