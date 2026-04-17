import type { IncomingMessage, ServerResponse } from 'node:http';
import { applyProxySettings } from '../../main/proxy';
import { syncLaunchAtStartupSettingFromStore } from '../../main/launch-at-startup';
import { syncPetWindowFromSettings } from '../../main/pet-window';
import { syncProxyConfigToOpenClaw } from '../../utils/openclaw-proxy';
import { getAllSettings, type AppSettings } from '../../utils/store';
import {
  applyFallbackBundlePayload,
  buildFallbackBundle,
  decryptFallbackBundle,
  getDefaultFallbackBundlePath,
  readFallbackBundleFromFile,
  readFallbackBundlePreferLocalThenBundled,
  saveFallbackBundleToFile,
  type FallbackBundlePlainPayload,
} from '../../services/fallback-config-bundle';
import {
  getVolcengineSpeechConfigState,
} from '../../services/speech-config';
import {
  getVoiceChatConfigState,
} from '../../services/voice-chat-store';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';

function patchTouchesProxy(patch: Partial<AppSettings>): boolean {
  return Object.keys(patch).some((key) => (
    key === 'proxyEnabled'
    || key === 'proxyServer'
    || key === 'proxyHttpServer'
    || key === 'proxyHttpsServer'
    || key === 'proxyAllServer'
    || key === 'proxyBypassRules'
  ));
}

function patchTouchesLaunchAtStartup(patch: Partial<AppSettings>): boolean {
  return Object.prototype.hasOwnProperty.call(patch, 'launchAtStartup');
}

function patchTouchesRemoteGateway(patch: Partial<AppSettings>): boolean {
  return Object.prototype.hasOwnProperty.call(patch, 'remoteGatewayUrl')
    || Object.prototype.hasOwnProperty.call(patch, 'remoteGatewayToken');
}

function patchTouchesPet(patch: Partial<AppSettings>): boolean {
  return Object.prototype.hasOwnProperty.call(patch, 'petEnabled')
    || Object.prototype.hasOwnProperty.call(patch, 'petAnimation');
}

async function applySettingsPatchSideEffects(patch: Partial<AppSettings>, ctx: HostApiContext): Promise<void> {
  if (patchTouchesProxy(patch)) {
    const settings = await getAllSettings();
    await syncProxyConfigToOpenClaw(settings, { preserveExistingWhenDisabled: false });
    await applyProxySettings(settings);
    if (ctx.gatewayManager.getStatus().state === 'running') {
      await ctx.gatewayManager.restart();
    }
  }

  if (patchTouchesLaunchAtStartup(patch)) {
    await syncLaunchAtStartupSettingFromStore();
  }

  if (patchTouchesPet(patch)) {
    await syncPetWindowFromSettings();
  }

  if (patchTouchesRemoteGateway(patch)) {
    void ctx.gatewayManager.restart().catch((error) => {
      console.error('[fallback-config] remote gateway restart failed', error);
    });
  }
}

async function hasUserConfiguredRuntime(): Promise<boolean> {
  const [settings, speechState, voiceState] = await Promise.all([
    getAllSettings(),
    getVolcengineSpeechConfigState().catch(() => null),
    getVoiceChatConfigState().catch(() => null),
  ]);

  return Boolean(
    settings.remoteGatewayUrl.trim()
      || settings.remoteGatewayToken.trim()
      || settings.cloudApiToken.trim()
      || settings.jizhiToken.trim()
      || settings.proxyServer.trim()
      || settings.proxyHttpServer.trim()
      || settings.proxyHttpsServer.trim()
      || settings.proxyAllServer.trim()
      || speechState?.configured
      || voiceState?.configured,
  );
}

async function applyBundleWithPassword(password: string, ctx: HostApiContext): Promise<{ applied: true; payload: FallbackBundlePlainPayload }> {
  const { bundle } = await readFallbackBundlePreferLocalThenBundled();
  if (!bundle) {
    throw new Error('Fallback bundle file not found');
  }

  const payload = decryptFallbackBundle(bundle, password);
  await applyFallbackBundlePayload(payload);

  const settingsPatch = payload.settings as Partial<AppSettings>;
  if (Object.keys(settingsPatch).length > 0) {
    await applySettingsPatchSideEffects(settingsPatch, ctx);
  }

  return { applied: true, payload };
}

export async function handleFallbackConfigRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/fallback-config/status' && req.method === 'GET') {
    const localPath = getDefaultFallbackBundlePath();
    const localBundle = await readFallbackBundleFromFile(localPath);
    if (localBundle) {
      sendJson(res, 200, {
        exists: true,
        path: localPath,
        source: 'local',
        version: localBundle.version,
        createdAt: localBundle.createdAt,
      });
      return true;
    }

    const bundled = await readFallbackBundlePreferLocalThenBundled();
    sendJson(res, 200, {
      exists: Boolean(bundled.bundle),
      path: bundled.path ?? localPath,
      source: bundled.source,
      version: bundled.bundle?.version ?? null,
      createdAt: bundled.bundle?.createdAt ?? null,
    });
    return true;
  }

  if (url.pathname === '/api/fallback-config/export' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ password?: string; outputPath?: string }>(req);
      const password = typeof body.password === 'string' ? body.password.trim() : '';
      if (!password) {
        sendJson(res, 400, { success: false, error: 'password is required' });
        return true;
      }

      const bundle = await buildFallbackBundle(password);
      const path = await saveFallbackBundleToFile(bundle, typeof body.outputPath === 'string' && body.outputPath.trim() ? body.outputPath.trim() : undefined);
      sendJson(res, 200, {
        success: true,
        path,
        createdAt: bundle.createdAt,
        version: bundle.version,
      });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/fallback-config/auto-apply' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ password?: string }>(req);
      const password = typeof body.password === 'string' ? body.password.trim() : '';
      if (!password) {
        sendJson(res, 400, { success: false, error: 'password is required' });
        return true;
      }

      const hasConfigured = await hasUserConfiguredRuntime();
      if (hasConfigured) {
        sendJson(res, 200, {
          success: true,
          applied: false,
          reason: 'already-configured',
        });
        return true;
      }

      await applyBundleWithPassword(password, ctx);
      sendJson(res, 200, {
        success: true,
        applied: true,
      });
    } catch (error) {
      sendJson(res, 200, {
        success: false,
        applied: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  return false;
}
