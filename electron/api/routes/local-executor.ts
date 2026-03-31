import type { IncomingMessage, ServerResponse } from 'http';
import { localExecutorService } from '../../services/local-executor';
import { parseJsonBody, sendJson } from '../route-utils';
import type { HostApiContext } from '../context';
import type { LocalSkillRunRequest } from '../../../shared/local-executor';

export async function handleLocalExecutorRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/local-executor/skills' && req.method === 'GET') {
    sendJson(res, 200, {
      success: true,
      skills: await localExecutorService.listSkills(),
    });
    return true;
  }

  if (url.pathname === '/api/local-executor/runs' && req.method === 'GET') {
    sendJson(res, 200, {
      success: true,
      runs: localExecutorService.listRecentRuns(),
    });
    return true;
  }

  if (url.pathname === '/api/local-executor/meta' && req.method === 'GET') {
    sendJson(res, 200, {
      success: true,
      meta: localExecutorService.getMeta(),
    });
    return true;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (
    segments.length === 5
    && segments[0] === 'api'
    && segments[1] === 'local-executor'
    && segments[2] === 'skills'
    && segments[4] === 'run'
    && req.method === 'POST'
  ) {
    try {
      const skillId = decodeURIComponent(segments[3]);
      const body = await parseJsonBody<LocalSkillRunRequest>(req);
      const run = await localExecutorService.runSkill(skillId, body);
      sendJson(res, 200, { success: true, run });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
