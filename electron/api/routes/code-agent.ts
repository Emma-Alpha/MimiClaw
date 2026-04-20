import type { IncomingMessage, ServerResponse } from 'http';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import type {
  CodeAgentRunRequest,
  CodeAgentSessionMessage,
  CodeAgentSessionHistoryResult,
  CodeAgentSessionSummary,
} from '../../../shared/code-agent';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';

function toTimestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
    const num = Number(value);
    if (Number.isFinite(num)) return num < 1e12 ? num * 1000 : num;
  }
  return null;
}

function encodeClaudeProjectPath(workspaceRoot: string): string {
  return resolve(workspaceRoot).replace(/[^A-Za-z0-9]/g, '-');
}

async function resolveClaudeProjectDir(workspaceRoot: string): Promise<string | null> {
  const projectsRoot = join(homedir(), '.claude', 'projects');
  const direct = join(projectsRoot, encodeClaudeProjectPath(workspaceRoot));

  try {
    const stat = await fs.stat(direct);
    if (stat.isDirectory()) return direct;
  } catch {
    // fallback below
  }

  try {
    const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
    const needle = basename(resolve(workspaceRoot)).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    if (!needle) return null;
    const match = entries.find((entry) =>
      entry.isDirectory() && entry.name.replace(/[^A-Za-z0-9]/g, '').toLowerCase().includes(needle),
    );
    return match ? join(projectsRoot, match.name) : null;
  } catch {
    return null;
  }
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content as Array<Record<string, unknown>>) {
      if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
        parts.push(block.text.trim());
      }
    }
    return parts.join('\n').trim();
  }
  if (content && typeof content === 'object') {
    const record = content as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text.trim();
  }
  return '';
}

function sanitizeUserText(text: string): string {
  return text
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/gi, '')
    .replace(/<local-command-[^>]+>[\s\S]*?<\/local-command-[^>]+>/gi, '')
    .replace(/<command-name>[\s\S]*?<\/command-name>/gi, '')
    .replace(/<command-message>[\s\S]*?<\/command-message>/gi, '')
    .replace(/<command-args>[\s\S]*?<\/command-args>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractUserMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const record = message as Record<string, unknown>;
  const role = typeof record.role === 'string' ? record.role : '';
  if (role && role !== 'user') return '';
  const contentText = extractTextFromContent(record.content);
  return sanitizeUserText(contentText);
}

function extractAssistantMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const record = message as Record<string, unknown>;
  const role = typeof record.role === 'string' ? record.role : '';
  if (role && role !== 'assistant') return '';
  return extractTextFromContent(record.content);
}

async function listClaudeCodeSessions(
  workspaceRoot: string,
  limit = 30,
): Promise<CodeAgentSessionSummary[]> {
  const projectDir = await resolveClaudeProjectDir(workspaceRoot);
  if (!projectDir) return [];

  const entries = await fs.readdir(projectDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
    .map((entry) => entry.name);

  const sessionSummaries = await Promise.all(
    files.map(async (fileName): Promise<CodeAgentSessionSummary | null> => {
      const sessionId = fileName.replace(/\.jsonl$/i, '');
      const filePath = join(projectDir, fileName);

      let updatedAt = 0;
      let title = '';

      try {
        const stat = await fs.stat(filePath);
        updatedAt = stat.mtimeMs;
      } catch {
        // ignore stat failures
      }

      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          try {
            const row = JSON.parse(line) as Record<string, unknown>;
            const ts = toTimestampMs(row.timestamp);
            if (ts && ts > updatedAt) updatedAt = ts;

            if (!title && row.type === 'user' && row.isMeta !== true) {
              const text = extractUserMessageText(row.message);
              if (text) {
                title = text.length > 50 ? `${text.slice(0, 50)}…` : text;
              }
            }
          } catch {
            // ignore malformed lines
          }
        }
      } catch {
        return null;
      }

      return {
        sessionId,
        title: title || sessionId,
        updatedAt: updatedAt || Date.now(),
      };
    }),
  );

  return sessionSummaries
    .filter((item): item is CodeAgentSessionSummary => Boolean(item))
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, Math.max(1, limit));
}

async function loadClaudeCodeSessionHistory(
  workspaceRoot: string,
  sessionId: string,
  limit = 120,
): Promise<CodeAgentSessionHistoryResult> {
  const empty: CodeAgentSessionHistoryResult = { messages: [], rawSdkMessages: [] };
  const projectDir = await resolveClaudeProjectDir(workspaceRoot);
  if (!projectDir) return empty;

  const safeSessionId = basename(sessionId).replace(/\.jsonl$/i, '');
  if (!safeSessionId) return empty;

  const filePath = join(projectDir, `${safeSessionId}.jsonl`);
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const messages: CodeAgentSessionMessage[] = [];
  const rawSdkMessages: Record<string, unknown>[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;

    try {
      const row = JSON.parse(line) as Record<string, unknown>;
      const type = typeof row.type === 'string' ? row.type : '';
      const timestamp = toTimestampMs(row.timestamp) ?? Date.now();
      const id = typeof row.uuid === 'string' ? row.uuid : `${safeSessionId}-${index}`;

      // Collect all rows for rich timeline reconstruction
      rawSdkMessages.push(row);

      if (type === 'user') {
        if (row.isMeta === true) continue;
        const text = extractUserMessageText(row.message);
        if (!text) continue;
        messages.push({ id, role: 'user', text, timestamp });
        continue;
      }

      if (type === 'assistant') {
        const text = extractAssistantMessageText(row.message);
        if (!text) continue;
        messages.push({ id, role: 'assistant', text, timestamp });
      }
    } catch {
      // ignore malformed lines
    }
  }

  const trimmedMessages = messages.length <= limit ? messages : messages.slice(messages.length - limit);
  return { messages: trimmedMessages, rawSdkMessages };
}

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

  if (url.pathname === '/api/code-agent/sessions' && req.method === 'GET') {
    try {
      const workspaceRoot = url.searchParams.get('workspaceRoot')?.trim() || '';
      const limit = Number(url.searchParams.get('limit') ?? 30);
      if (!workspaceRoot) {
        sendJson(res, 400, { success: false, error: 'workspaceRoot is required' });
        return true;
      }

      const sessions = await listClaudeCodeSessions(
        workspaceRoot,
        Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 30,
      );
      sendJson(res, 200, { success: true, sessions });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/code-agent/session-history' && req.method === 'GET') {
    try {
      const workspaceRoot = url.searchParams.get('workspaceRoot')?.trim() || '';
      const sessionId = url.searchParams.get('sessionId')?.trim() || '';
      const limit = Number(url.searchParams.get('limit') ?? 120);
      if (!workspaceRoot || !sessionId) {
        sendJson(res, 400, { success: false, error: 'workspaceRoot and sessionId are required' });
        return true;
      }

      const result = await loadClaudeCodeSessionHistory(
        workspaceRoot,
        sessionId,
        Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 120,
      );
      sendJson(res, 200, { success: true, messages: result.messages, rawSdkMessages: result.rawSdkMessages });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
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

  if (url.pathname === '/api/code-agent/runs/cancel' && req.method === 'POST') {
    try {
      const result = await ctx.codeAgentManager.cancelActiveRun();
      sendJson(res, 200, { success: true, cancelled: result.cancelled, result: result.result });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/code-agent/skills' && req.method === 'GET') {
    try {
      const workspaceRoot = url.searchParams.get('workspaceRoot')?.trim() || '';
      const home = homedir();

      // All global skill directories that Claude Code, Codex, or Cursor may use
      const globalDirs = [
        join(home, '.claude', 'skills'),
        join(home, '.agents', 'skills'),
        join(home, '.codex', 'skills'),
        join(home, '.cursor', 'skills-cursor'),
      ];

      // Project-level: .claude/skills under workspace root
      const projectDirs = workspaceRoot
        ? [join(workspaceRoot, '.claude', 'skills')]
        : [];

      const claudeDirs = new Set([
        join(home, '.claude', 'skills'),
        ...(workspaceRoot ? [join(workspaceRoot, '.claude', 'skills')] : []),
      ]);

      const scanSkillDir = async (
        dir: string,
        scope: 'global' | 'project',
      ): Promise<Array<{ name: string; command: string; description: string; scope: string; source: 'claude' | 'external'; skillContent: string }>> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const results = await Promise.all(
            entries
              .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
              .map(async (e) => {
                const skillMd = join(dir, e.name, 'SKILL.md');
                let description = '';
                let skillContent = '';
                try {
                  const content = await fs.readFile(skillMd, 'utf8');
                  skillContent = content;
                  const lines = content.split(/\r?\n/);

                  // Try YAML frontmatter first (--- delimited)
                  if (lines[0]?.trim() === '---') {
                    const endIdx = lines.indexOf('---', 1);
                    if (endIdx > 0) {
                      const fmBlock = lines.slice(1, endIdx).join('\n');
                      const descMatch = fmBlock.match(/^description:\s*["']?(.*?)["']?\s*$/m);
                      if (descMatch?.[1]) {
                        const raw = descMatch[1].trim();
                        description = raw.length > 100 ? `${raw.slice(0, 100)}…` : raw;
                      }
                    }
                  }

                  // Fallback: first non-empty, non-frontmatter line
                  if (!description) {
                    const textLine = lines.find((l) => {
                      const t = l.trim();
                      return t.length > 0 && t !== '---';
                    });
                    if (textLine) {
                      const trimmed = textLine.replace(/^#+\s*/, '').trim();
                      description = trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed;
                    }
                  }
                } catch {
                  // no SKILL.md or unreadable — skip silently
                }
                const source = claudeDirs.has(dir) ? 'claude' as const : 'external' as const;
                return {
                  name: e.name,
                  command: `/${e.name}`,
                  description,
                  scope,
                  source,
                  skillContent,
                };
              }),
          );
          return results;
        } catch {
          return [];
        }
      };

      const globalResults = await Promise.all(
        globalDirs.map((dir) => scanSkillDir(dir, 'global')),
      );
      const projectResults = await Promise.all(
        projectDirs.map((dir) => scanSkillDir(dir, 'project')),
      );

      // Deduplicate by name (first occurrence wins)
      const seen = new Set<string>();
      const dedup = (skills: Array<{ name: string; command: string; description: string; scope: string }>) => {
        const unique: typeof skills = [];
        for (const s of skills) {
          if (!seen.has(s.name)) {
            seen.add(s.name);
            unique.push(s);
          }
        }
        return unique;
      };

      const globalSkills = dedup(globalResults.flat());
      seen.clear();
      const projectSkills = dedup(projectResults.flat());

      sendJson(res, 200, {
        success: true,
        skills: { global: globalSkills, project: projectSkills },
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
