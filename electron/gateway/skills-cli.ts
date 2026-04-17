/**
 * Vercel `skills` CLI (npm package `skills`) — find / add / remove / list / update.
 * @see https://www.npmjs.com/package/skills
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { homedir, tmpdir } from 'node:os';
import type { NodeRuntimeStatus } from './node-runtime';
import { ensureNode } from './node-runtime';
import { logger } from '../utils/logger';
import { quoteForCmd } from '../utils/paths';
import { getSkillDetail, type SkillDetailPayload } from './skill-detail-utils';

/** Pinned CLI; bump only after verifying JSON/text output compatibility. */
export const PINNED_SKILLS_PKG_VERSION = '1.5.0';

const DEFAULT_TRENDING_QUERY = 'agent';

export interface SkillSearchResult {
  slug: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  url?: string;
}

export interface SkillListEntry {
  slug: string;
  version: string;
  source?: string;
  baseDir?: string;
  icon?: string;
  name?: string;
  description?: string;
}

export interface OutdatedEntry {
  slug: string;
  current: string;
  latest: string;
}

export class SkillsCliParseError extends Error {
  constructor(
    message: string,
    public readonly raw?: string,
  ) {
    super(message);
    this.name = 'SkillsCliParseError';
  }
}

function stripAnsi(line: string): string {
  const esc = String.fromCharCode(27);
  const csi = String.fromCharCode(155);
  const pattern = `(?:${esc}|${csi})[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]`;
  return line.replace(new RegExp(pattern, 'g'), '').trim();
}

/** Parses `skills find` stdout (no machine JSON in 1.5.x). */
export function parseFindOutput(raw: string): SkillSearchResult[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => stripAnsi(l))
    .map((l) => l.trim())
    .filter(Boolean);

  const results: SkillSearchResult[] = [];
  let pending: Partial<SkillSearchResult> | null = null;

  for (const line of lines) {
    if (line.includes('Install with') || line.startsWith('████')) {
      continue;
    }
    const idMatch = line.match(/^([^\s]+\/[^\s]+@[^\s]+)\s*(.*)$/);
    if (idMatch) {
      if (pending?.slug) {
        results.push(pending as SkillSearchResult);
      }
      const slug = idMatch[1];
      const rest = idMatch[2]?.trim() ?? '';
      pending = {
        slug,
        name: slug.split('@').pop() ?? slug,
        description: rest,
        version: 'latest',
      };
      continue;
    }
    const urlMatch = line.match(/(?:└|->)\s*(https:\/\/[^\s]+)/);
    if (urlMatch && pending) {
      pending.url = urlMatch[1];
    }
  }
  if (pending?.slug) {
    results.push(pending as SkillSearchResult);
  }
  return results;
}

function safeJsonParse<T>(raw: string, label: string): T {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new SkillsCliParseError(`Empty JSON from ${label}`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (e) {
    throw new SkillsCliParseError(`Invalid JSON from ${label}: ${e instanceof Error ? e.message : String(e)}`, raw);
  }
}

function parseSkillManifestMeta(
  skillDir: string,
): { description?: string; icon?: string; name?: string } {
  try {
    const manifestPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(manifestPath)) return {};
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fm) return {};
    const body = fm[1];
    const pick = (key: string) =>
      body.match(new RegExp(`^\\s*${key}\\s*:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))?.[1]?.trim();
    return {
      name: pick('name'),
      description: pick('description'),
      icon: pick('icon'),
    };
  } catch {
    return {};
  }
}

export type EnsureNodeFn = (onProgress?: (s: NodeRuntimeStatus) => void) => Promise<{
  nodePath: string;
  npxPath: string;
}>;

export class SkillsCliRunner {
  constructor(private readonly ensureNpx: EnsureNodeFn = ensureNode) {}

  private async run(
    args: string[],
    options?: { cwd?: string; envOverrides?: NodeJS.ProcessEnv },
  ): Promise<string> {
    const { npxPath } = await this.ensureNpx();
    const pkg = `skills@${PINNED_SKILLS_PKG_VERSION}`;
    const fullArgs = ['-y', pkg, ...args];
    const cwd = options?.cwd ?? homedir();
    const isWin = process.platform === 'win32';
    const useShell = isWin && !npxPath.endsWith('.exe');
    const displayCommand = [npxPath, ...fullArgs].join(' ');
    logger.info(`Running skills CLI: ${displayCommand}`);

    const env = {
      ...process.env,
      CI: 'true',
      FORCE_COLOR: '0',
      ...(options?.envOverrides || {}),
    };

    return new Promise((resolve, reject) => {
      const spawnCmd = useShell ? quoteForCmd(npxPath) : npxPath;
      const spawnArgs = useShell ? fullArgs.map((a) => quoteForCmd(a)) : fullArgs;
      const child = spawn(spawnCmd, spawnArgs, {
        cwd,
        shell: useShell,
        env,
        windowsHide: true,
      });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (d) => {
        stdout += d.toString();
      });
      child.stderr?.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(stderr.trim() || stdout.trim() || `skills CLI exited ${code}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async find(params: {
    query?: string;
    trending?: boolean;
    limit?: number;
  }): Promise<SkillSearchResult[]> {
    const q =
      params.query?.trim() ||
      (params.trending ? DEFAULT_TRENDING_QUERY : '') ||
      DEFAULT_TRENDING_QUERY;
    const args = ['find', q];
    if (params.limit && params.limit > 0) {
      args.push('--limit', String(params.limit));
    }
    const out = await this.run(args);
    let results = parseFindOutput(out);
    if (params.limit && params.limit > 0) {
      results = results.slice(0, params.limit);
    }
    return results;
  }

  async listInstalled(): Promise<SkillListEntry[]> {
    const out = await this.run(['list', '-g', '--json']);
    const parsed = safeJsonParse<Array<{ name: string; path: string }>>(out, 'skills list -g --json');
    if (!Array.isArray(parsed)) {
      throw new SkillsCliParseError('skills list JSON is not an array', out);
    }
    return parsed.map((row) => {
      const meta = parseSkillManifestMeta(row.path);
      return {
        slug: row.name,
        version: '1.0.0',
        source: 'agents-skills-personal',
        baseDir: row.path,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
      };
    });
  }

  async install(slug: string, _version?: string): Promise<void> {
    const args = ['add', slug.trim(), '-g', '-y'];
    await this.run(args);
  }

  private buildIsolatedHomeEnv(homeDir: string): NodeJS.ProcessEnv {
    if (process.platform === 'win32') {
      return {
        APPDATA: path.join(homeDir, 'AppData', 'Roaming'),
        HOME: homeDir,
        LOCALAPPDATA: path.join(homeDir, 'AppData', 'Local'),
        USERPROFILE: homeDir,
      };
    }

    return {
      HOME: homeDir,
      XDG_CONFIG_HOME: path.join(homeDir, '.config'),
    };
  }

  async previewDetail(
    slugOrName: string,
  ): Promise<{ baseDir: string; detail: SkillDetailPayload; resolvedSlug: string }> {
    const target = slugOrName.trim();
    if (!target) {
      throw new Error('Missing skill slug');
    }

    const tmpHome = fs.mkdtempSync(path.join(tmpdir(), 'mimiclaw-skill-preview-'));
    const envOverrides = this.buildIsolatedHomeEnv(tmpHome);

    try {
      await this.run(['add', target, '-g', '-y'], {
        cwd: tmpHome,
        envOverrides,
      });

      const out = await this.run(['list', '-g', '--json'], {
        cwd: tmpHome,
        envOverrides,
      });

      const parsed = safeJsonParse<Array<{ name: string; path: string }>>(
        out,
        'skills list -g --json (preview)',
      );
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new SkillsCliParseError('No installed skill found in preview environment', out);
      }

      const normalized = target.toLowerCase();
      const tail = normalized.includes('@') ? normalized.split('@').pop() || normalized : normalized;

      const matched =
        parsed.find((item) => item.name.toLowerCase() === normalized) ||
        parsed.find((item) => item.name.toLowerCase() === tail) ||
        parsed[0];

      const detail = getSkillDetail(matched.name, matched.name, matched.path);
      return {
        baseDir: matched.path,
        detail,
        resolvedSlug: matched.name,
      };
    } finally {
      try {
        fs.rmSync(tmpHome, { recursive: true, force: true });
      } catch (error) {
        logger.warn('[skills] Failed to clean preview temp dir', error);
      }
    }
  }

  uninstallSkillName(name: string): Promise<void> {
    return this.run(['remove', name.trim(), '-g', '-y']);
  }

  /**
   * @param slugOrName gateway id, folder name, or full `owner/repo@skill` from find
   */
  async uninstall(slugOrName: string): Promise<void> {
    const s = slugOrName.trim();
    const name = s.includes('@') && s.includes('/') ? s.split('@').pop() ?? s : s;
    await this.uninstallSkillName(name);
  }

  async updateInstalled(slugOrName: string): Promise<void> {
    const s = slugOrName.trim();
    const name = s.includes('@') && s.includes('/') ? s.split('@').pop() ?? s : s;
    await this.run(['update', name, '-g', '-y']);
  }

  /** Reserved: CLI has no stable JSON for remote diff without running a full update check. */
  async outdated(): Promise<OutdatedEntry[]> {
    return [];
  }

  async cliVersion(): Promise<string> {
    const out = await this.run(['--version']);
    return out.trim() || PINNED_SKILLS_PKG_VERSION;
  }
}
