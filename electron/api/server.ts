import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { PORTS } from '../utils/config';
import { logger } from '../utils/logger';
import type { HostApiContext } from './context';
import { handleAppRoutes } from './routes/app';
import { handleAuthRoutes } from './routes/auth';
import { handleCodeAgentRoutes } from './routes/code-agent';
import { handleGatewayRoutes } from './routes/gateway';
import { handleSettingsRoutes } from './routes/settings';
import { handleProviderRoutes } from './routes/providers';
import { handleAgentRoutes } from './routes/agents';
import { handleChannelRoutes } from './routes/channels';
import { handleLogRoutes } from './routes/logs';
import { handleUsageRoutes } from './routes/usage';
import { handleSkillRoutes } from './routes/skills';
import { handleFileRoutes } from './routes/files';
import { handleSpeechRoutes } from './routes/speech';
import { handleSessionRoutes } from './routes/sessions';
import { handleCronRoutes } from './routes/cron';
import { handleLocalExecutorRoutes } from './routes/local-executor';
import { handleJizhiRoutes } from './routes/jizhi';
import { handleVoiceChatRoutes } from './routes/voice-chat';
import { handleXiaojiuRoutes } from './routes/xiaojiu';
import { handleFallbackConfigRoutes } from './routes/fallback-config';
import { sendJson } from './route-utils';

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
) => Promise<boolean>;

const routeHandlers: RouteHandler[] = [
  handleAppRoutes,
  handleAuthRoutes,
  handleCodeAgentRoutes,
  handleGatewayRoutes,
  handleSettingsRoutes,
  handleProviderRoutes,
  handleAgentRoutes,
  handleChannelRoutes,
  handleSkillRoutes,
  handleLocalExecutorRoutes,
  handleFileRoutes,
  handleSpeechRoutes,
  handleSessionRoutes,
  handleJizhiRoutes,
  handleXiaojiuRoutes,
  handleVoiceChatRoutes,
  handleFallbackConfigRoutes,
  handleCronRoutes,
  handleLogRoutes,
  handleUsageRoutes,
];

export function startHostApiServer(ctx: HostApiContext, port = PORTS.MIMICLAW_HOST_API): Promise<Server> {
  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    try {
      for (const handler of routeHandlers) {
        if (await handler(req, res, requestUrl, ctx)) {
          return;
        }
      }
      sendJson(res, 404, { success: false, error: `No route for ${req.method} ${requestUrl.pathname}` });
    } catch (error) {
      logger.error(`Host API request failed: ${req.method} ${requestUrl.pathname}`, error);
      sendJson(res, 500, { success: false, error: String(error) });
    }
  });

  return new Promise<Server>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      logger.info(`Host API server listening on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}
