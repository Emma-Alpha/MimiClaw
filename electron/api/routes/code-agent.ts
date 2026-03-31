import type { IncomingMessage, ServerResponse } from 'http';
import type { CodeAgentRunRequest } from '../../../shared/code-agent';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';

export async function handleCodeAgentRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/code-agent/status' && req.method === 'GET') {
    sendJson(res, 200, ctx.codeAgentManager.getStatus());
    return true;
  }

  if (url.pathname === '/api/code-agent/health' && req.method === 'GET') {
    sendJson(res, 200, await ctx.codeAgentManager.checkHealth());
    return true;
  }

  if (url.pathname === '/api/code-agent/runs/latest' && req.method === 'GET') {
    sendJson(res, 200, {
      success: true,
      run: ctx.codeAgentManager.getLastRun(),
    });
    return true;
  }

  if (url.pathname === '/api/code-agent/start' && req.method === 'POST') {
    try {
      await ctx.codeAgentManager.start();
      sendJson(res, 200, { success: true, status: ctx.codeAgentManager.getStatus() });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/code-agent/stop' && req.method === 'POST') {
    try {
      await ctx.codeAgentManager.stop();
      sendJson(res, 200, { success: true, status: ctx.codeAgentManager.getStatus() });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/code-agent/restart' && req.method === 'POST') {
    try {
      await ctx.codeAgentManager.restart();
      sendJson(res, 200, { success: true, status: ctx.codeAgentManager.getStatus() });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/code-agent/runs' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<CodeAgentRunRequest>(req);
      const result = await ctx.codeAgentManager.runTask(body);
      sendJson(res, 200, { success: true, result });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
