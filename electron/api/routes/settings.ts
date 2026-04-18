import type { IncomingMessage, ServerResponse } from 'http';
import { applyProxySettings } from '../../main/proxy';
import { syncLaunchAtStartupSettingFromStore } from '../../main/launch-at-startup';
import { syncPetWindowFromSettings } from '../../main/pet-window';
import { syncProxyConfigToOpenClaw } from '../../utils/openclaw-proxy';
import { getAllSettings, getSetting, resetSettings, setSetting, type AppSettings } from '../../utils/store';
import { isCloudMode, patchCloudConfig } from '../../utils/cloud-config-bridge';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';

// Fields that affect OpenClaw runtime config and should be forwarded to the
// cloud backend when cloud mode is active.
const CLOUD_OPENCLAW_FIELD_MAP: Partial<Record<keyof AppSettings, string>> = {
  sessionIdleMinutes: 'sessionIdleMinutes',
  browserEnabled: 'browser.enabled',
};

async function handleProxySettingsChange(ctx: HostApiContext): Promise<void> {
  const settings = await getAllSettings();
  await syncProxyConfigToOpenClaw(settings, { preserveExistingWhenDisabled: false });
  await applyProxySettings(settings);
  if (ctx.gatewayManager.getStatus().state === 'running') {
    await ctx.gatewayManager.restart();
  }
}

function patchTouchesProxy(patch: Partial<AppSettings>): boolean {
  return Object.keys(patch).some((key) => (
    key === 'proxyEnabled' ||
    key === 'proxyServer' ||
    key === 'proxyHttpServer' ||
    key === 'proxyHttpsServer' ||
    key === 'proxyAllServer' ||
    key === 'proxyBypassRules'
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

function normalizeSettingValue<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K] | null,
): AppSettings[K] {
  if ((key === 'primaryColor' || key === 'neutralColor') && value === null) {
    return undefined as AppSettings[K];
  }

  return value as AppSettings[K];
}

export async function handleSettingsRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/settings' && req.method === 'GET') {
    sendJson(res, 200, await getAllSettings());
    return true;
  }

  if (url.pathname === '/api/settings' && req.method === 'PUT') {
    try {
      const rawPatch = await parseJsonBody<Record<string, unknown>>(req);
      const patch = Object.fromEntries(
        Object.entries(rawPatch).map(([key, value]) => [
          key,
          normalizeSettingValue(key as keyof AppSettings, value as AppSettings[keyof AppSettings] | null),
        ]),
      ) as Partial<AppSettings>;
      const entries = Object.entries(patch) as Array<[keyof AppSettings, AppSettings[keyof AppSettings]]>;
      for (const [key, value] of entries) {
        await setSetting(key, value);
      }
      if (patchTouchesProxy(patch)) {
        await handleProxySettingsChange(ctx);
      }
      if (patchTouchesLaunchAtStartup(patch)) {
        await syncLaunchAtStartupSettingFromStore();
      }
      if (patchTouchesRemoteGateway(patch)) {
        // Restart gateway connection so the new remote URL takes effect immediately.
        void ctx.gatewayManager.restart().catch((err) => {
          console.error('[settings] Remote gateway restart failed:', err);
        });
      }
      if (patchTouchesPet(patch)) {
        await syncPetWindowFromSettings();
      }

      // Forward OpenClaw-affecting settings to the cloud backend when in cloud mode.
      if (await isCloudMode()) {
        const cloudPatch: Record<string, unknown> = {};
        for (const [key] of Object.entries(patch)) {
          const cloudField = CLOUD_OPENCLAW_FIELD_MAP[key as keyof AppSettings];
          if (cloudField) {
            cloudPatch[cloudField] = patch[key as keyof AppSettings];
          }
        }
        if (Object.keys(cloudPatch).length > 0) {
          void patchCloudConfig(cloudPatch).catch((err) => {
            console.warn('[settings] Failed to sync settings to cloud config:', err);
          });
        }
      }

      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/settings/') && req.method === 'GET') {
    const key = url.pathname.slice('/api/settings/'.length) as keyof AppSettings;
    try {
      sendJson(res, 200, { value: await getSetting(key) });
    } catch (error) {
      sendJson(res, 404, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/settings/') && req.method === 'PUT') {
    const key = url.pathname.slice('/api/settings/'.length) as keyof AppSettings;
    try {
      const body = await parseJsonBody<{ value: AppSettings[keyof AppSettings] | null }>(req);
      await setSetting(key, normalizeSettingValue(key, body.value));
      if (
        key === 'proxyEnabled' ||
        key === 'proxyServer' ||
        key === 'proxyHttpServer' ||
        key === 'proxyHttpsServer' ||
        key === 'proxyAllServer' ||
        key === 'proxyBypassRules'
      ) {
        await handleProxySettingsChange(ctx);
      }
      if (key === 'launchAtStartup') {
        await syncLaunchAtStartupSettingFromStore();
      }
      if (key === 'petEnabled' || key === 'petAnimation') {
        await syncPetWindowFromSettings();
      }
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/settings/reset' && req.method === 'POST') {
    try {
      await resetSettings();
      await handleProxySettingsChange(ctx);
      await syncLaunchAtStartupSettingFromStore();
      await syncPetWindowFromSettings();
      sendJson(res, 200, { success: true, settings: await getAllSettings() });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
