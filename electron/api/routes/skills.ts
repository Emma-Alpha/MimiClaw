import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { getAllSkillConfigs, updateSkillConfig } from '../../utils/skill-config';
import { parseJsonBody, sendJson } from '../route-utils';
import { isCloudMode, patchCloudSkillConfig } from '../../utils/cloud-config-bridge';
import { openSkillPath, openSkillReadme } from '../../gateway/skill-path-utils';
import { ensureNode, probeNodeRuntime } from '../../gateway/node-runtime';
import type { OutdatedEntry } from '../../gateway/skills-cli';
import { getSkillDetail } from '../../gateway/skill-detail-utils';

let outdatedCache: { at: number; results: OutdatedEntry[] } | null = null;
const OUTDATED_TTL_MS = 6 * 60 * 60 * 1000;

export async function handleSkillRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/skills/configs' && req.method === 'GET') {
    sendJson(res, 200, await getAllSkillConfigs());
    return true;
  }

  if (url.pathname === '/api/skills/config' && req.method === 'PUT') {
    try {
      const body = await parseJsonBody<{
        skillKey: string;
        apiKey?: string;
        env?: Record<string, string>;
      }>(req);
      const result = await updateSkillConfig(body.skillKey, {
        apiKey: body.apiKey,
        env: body.env,
      });
      if (await isCloudMode()) {
        const entry: Record<string, unknown> = {};
        if (body.apiKey !== undefined) entry.apiKey = body.apiKey;
        if (body.env !== undefined) entry.env = body.env;
        void patchCloudSkillConfig(body.skillKey, entry).catch((e) =>
          console.warn('[skills] Cloud sync failed:', e),
        );
      }
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/find' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ query?: string; trending?: boolean; limit?: number }>(req);
      const results = await ctx.skillsCliRunner.find(body);
      sendJson(res, 200, { success: true, results });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/install' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ slug: string; version?: string }>(req);
      await ctx.skillsCliRunner.install(body.slug, body.version);
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/uninstall' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ slug: string }>(req);
      await ctx.skillsCliRunner.uninstall(body.slug);
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/list' && req.method === 'GET') {
    try {
      const results = await ctx.skillsCliRunner.listInstalled();
      sendJson(res, 200, { success: true, results });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/outdated' && req.method === 'GET') {
    try {
      const now = Date.now();
      if (outdatedCache && now - outdatedCache.at < OUTDATED_TTL_MS) {
        sendJson(res, 200, {
          success: true,
          results: outdatedCache.results,
          cachedAt: outdatedCache.at,
        });
        return true;
      }
      const results = await ctx.skillsCliRunner.outdated();
      outdatedCache = { at: now, results };
      sendJson(res, 200, { success: true, results, cachedAt: now });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/update' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ slug: string }>(req);
      await ctx.skillsCliRunner.updateInstalled(body.slug);
      outdatedCache = null;
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/open-readme' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ slug?: string; skillKey?: string; baseDir?: string }>(req);
      await openSkillReadme(body.skillKey || body.slug || '', body.slug, body.baseDir);
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/open-path' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ slug?: string; skillKey?: string; baseDir?: string }>(req);
      await openSkillPath(body.skillKey || body.slug || '', body.slug, body.baseDir);
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/detail' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ slug?: string; skillKey?: string; baseDir?: string }>(req);
      const detail = getSkillDetail(body.skillKey || body.slug || '', body.slug, body.baseDir);
      sendJson(res, 200, { success: true, detail });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/preview-detail' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ slug: string }>(req);
      const preview = await ctx.skillsCliRunner.previewDetail(body.slug);
      sendJson(res, 200, { success: true, ...preview });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/ensure-node' && req.method === 'POST') {
    try {
      void ensureNode((s) => {
        ctx.mainWindow?.webContents.send('skills:runtime-progress', s);
      }).catch((e) => {
        console.warn('[skills] ensure-node failed:', e);
      });
      sendJson(res, 200, { success: true, status: { state: 'detecting' as const } });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/skills/runtime-status' && req.method === 'GET') {
    try {
      const status = await probeNodeRuntime();
      sendJson(res, 200, { status });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
