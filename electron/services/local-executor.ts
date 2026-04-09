import { promises as fs } from 'node:fs';
import { exec as execCallback } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { ensureDir, getMimiClawConfigDir, getResourcesDir } from '../utils/paths';
import { logger } from '../utils/logger';
import type {
  LocalExecutorMeta,
  LocalSkillApprovalMode,
  LocalSkillDefinition,
  LocalSkillManifest,
  LocalSkillRunRecord,
  LocalSkillRunRequest,
  LocalSkillSource,
} from '../../shared/local-executor';

const exec = promisify(execCallback);
const DEFAULT_DOWNLOADS_DIR = path.join(homedir(), 'Downloads');
const MAX_IN_MEMORY_RUNS = 50;
const MAX_PERSISTED_RUNS = 200;
const MAX_OUTPUT_CHARS = 12000;

const CATEGORY_BY_EXTENSION: Record<string, string> = {
  '.png': 'Images',
  '.jpg': 'Images',
  '.jpeg': 'Images',
  '.gif': 'Images',
  '.webp': 'Images',
  '.svg': 'Images',
  '.mp4': 'Videos',
  '.mov': 'Videos',
  '.mkv': 'Videos',
  '.avi': 'Videos',
  '.mp3': 'Audio',
  '.wav': 'Audio',
  '.m4a': 'Audio',
  '.flac': 'Audio',
  '.zip': 'Archives',
  '.rar': 'Archives',
  '.7z': 'Archives',
  '.tar': 'Archives',
  '.gz': 'Archives',
  '.pdf': 'Documents',
  '.doc': 'Documents',
  '.docx': 'Documents',
  '.ppt': 'Documents',
  '.pptx': 'Documents',
  '.xls': 'Documents',
  '.xlsx': 'Documents',
  '.txt': 'Documents',
  '.md': 'Documents',
  '.csv': 'Documents',
  '.json': 'Code',
  '.ts': 'Code',
  '.tsx': 'Code',
  '.js': 'Code',
  '.jsx': 'Code',
  '.py': 'Code',
  '.sh': 'Code',
  '.css': 'Code',
  '.html': 'Code',
};

type LoadedSkill = LocalSkillDefinition & {
  handler: string;
};

type WalkStats = {
  totalFiles: number;
  totalDirectories: number;
  byExtension: Map<string, number>;
  largestFiles: Array<{ path: string; size: number }>;
  recentFiles: Array<{ path: string; mtimeMs: number }>;
};

function truncate(value: string, max = MAX_OUTPUT_CHARS): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n\n...[truncated ${value.length - max} chars]`;
}

function requireString(input: Record<string, unknown>, key: string, fallback?: string): string {
  const value = input[key];
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required field: ${key}`);
}

function getOptionalString(input: Record<string, unknown>, key: string, fallback = ''): string {
  const value = input[key];
  return typeof value === 'string' ? value : fallback;
}

function getBoolean(input: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = input[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
}

function getNumber(input: Record<string, unknown>, key: string, fallback: number): number {
  const value = input[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

async function ensureDirectoryExists(directoryPath: string): Promise<void> {
  const stat = await fs.stat(directoryPath).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }
}

async function listDirectFiles(directoryPath: string): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(directoryPath, entry.name));
}

function pushSorted<T>(
  list: T[],
  item: T,
  compare: (left: T, right: T) => number,
  limit: number,
): void {
  list.push(item);
  list.sort(compare);
  if (list.length > limit) list.length = limit;
}

async function walkDirectory(directoryPath: string, maxDepth: number, depth = 0, stats?: WalkStats): Promise<WalkStats> {
  const current = stats ?? {
    totalFiles: 0,
    totalDirectories: 0,
    byExtension: new Map<string, number>(),
    largestFiles: [],
    recentFiles: [],
  };

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      current.totalDirectories += 1;
      if (depth < maxDepth) {
        await walkDirectory(fullPath, maxDepth, depth + 1, current);
      }
      continue;
    }

    if (!entry.isFile()) continue;
    const stat = await fs.stat(fullPath);
    const ext = path.extname(entry.name).toLowerCase() || '(no extension)';
    current.totalFiles += 1;
    current.byExtension.set(ext, (current.byExtension.get(ext) || 0) + 1);
    pushSorted(current.largestFiles, { path: fullPath, size: stat.size }, (a, b) => b.size - a.size, 10);
    pushSorted(current.recentFiles, { path: fullPath, mtimeMs: stat.mtimeMs }, (a, b) => b.mtimeMs - a.mtimeMs, 10);
  }

  return current;
}

function formatTopExtensionCounts(stats: WalkStats): Array<{ extension: string; count: number }> {
  return [...stats.byExtension.entries()]
    .map(([extension, count]) => ({ extension, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

async function ensureUniquePath(targetPath: string): Promise<string> {
  const { dir, name, ext } = path.parse(targetPath);
  let candidate = targetPath;
  let index = 1;
  while (await fs.stat(candidate).then(() => true).catch(() => false)) {
    candidate = path.join(dir, `${name}-${index}${ext}`);
    index += 1;
  }
  return candidate;
}

function classifyFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return CATEGORY_BY_EXTENSION[ext] || 'Others';
}

function getDefaultValueByFieldKey(fieldKey: string): string | undefined {
  if (fieldKey === 'directoryPath') return DEFAULT_DOWNLOADS_DIR;
  if (fieldKey === 'cwd') return process.cwd();
  return undefined;
}

function normalizeApprovalMode(value: unknown): LocalSkillApprovalMode {
  if (value === 'always' || value === 'mutating_only' || value === 'never') {
    return value;
  }
  return 'always';
}

function normalizeSkill(
  manifest: LocalSkillManifest,
  source: LocalSkillSource,
  baseDir: string,
): LoadedSkill {
  return {
    id: manifest.id,
    title: manifest.title,
    summary: manifest.summary,
    description: manifest.description,
    emoji: manifest.emoji || '🛠️',
    category: manifest.category || 'General',
    source,
    baseDir,
    riskLevel: manifest.riskLevel || 'medium',
    requiresApproval: manifest.approvalMode !== 'never',
    approvalMode: normalizeApprovalMode(manifest.approvalMode),
    capabilities: Array.isArray(manifest.capabilities) ? manifest.capabilities : [],
    fields: Array.isArray(manifest.fields)
      ? manifest.fields.map((field) => ({
        ...field,
        defaultValue: field.defaultValue ?? getDefaultValueByFieldKey(field.key),
      }))
      : [],
    handler: manifest.handler,
  };
}

async function buildFolderReport(input: Record<string, unknown>) {
  const directoryPath = requireString(input, 'directoryPath');
  const maxDepth = Math.max(0, Math.min(getNumber(input, 'maxDepth', 2), 6));
  await ensureDirectoryExists(directoryPath);

  const stats = await walkDirectory(directoryPath, maxDepth);
  return {
    summary: `扫描完成：${stats.totalFiles} 个文件，${stats.totalDirectories} 个目录`,
    warnings: [],
    output: {
      directoryPath,
      maxDepth,
      totalFiles: stats.totalFiles,
      totalDirectories: stats.totalDirectories,
      topExtensions: formatTopExtensionCounts(stats),
      largestFiles: stats.largestFiles,
      recentFiles: stats.recentFiles.map((item) => ({
        ...item,
        modifiedAt: new Date(item.mtimeMs).toISOString(),
      })),
    },
  };
}

async function buildBatchRename(input: Record<string, unknown>) {
  const directoryPath = requireString(input, 'directoryPath');
  const searchText = getOptionalString(input, 'searchText');
  const replaceText = getOptionalString(input, 'replaceText');
  const prefix = getOptionalString(input, 'prefix');
  const suffix = getOptionalString(input, 'suffix');
  const dryRun = getBoolean(input, 'dryRun', true);

  if (!searchText && !prefix && !suffix) {
    throw new Error('At least one of searchText, prefix, or suffix is required.');
  }

  await ensureDirectoryExists(directoryPath);
  const files = await listDirectFiles(directoryPath);
  const actions: Array<{ from: string; to: string }> = [];

  for (const filePath of files) {
    const parsed = path.parse(filePath);
    let nextName = parsed.name;
    if (searchText) {
      nextName = nextName.split(searchText).join(replaceText);
    }
    nextName = `${prefix}${nextName}${suffix}`;
    const finalName = `${nextName}${parsed.ext}`;
    if (finalName === parsed.base) continue;
    actions.push({
      from: filePath,
      to: path.join(parsed.dir, finalName),
    });
  }

  if (!dryRun) {
    for (const action of actions) {
      const uniqueTarget = await ensureUniquePath(action.to);
      await fs.rename(action.from, uniqueTarget);
      action.to = uniqueTarget;
    }
  }

  return {
    summary: dryRun
      ? `预览完成：${actions.length} 个文件可重命名`
      : `执行完成：已重命名 ${actions.length} 个文件`,
    warnings: actions.length === 0 ? ['没有找到需要改名的文件。'] : [],
    output: {
      directoryPath,
      dryRun,
      totalCandidates: files.length,
      changedFiles: actions.length,
      actions,
    },
  };
}

async function buildDownloadsOrganizer(input: Record<string, unknown>) {
  const directoryPath = requireString(input, 'directoryPath', DEFAULT_DOWNLOADS_DIR);
  const dryRun = getBoolean(input, 'dryRun', true);
  await ensureDirectoryExists(directoryPath);

  const files = await listDirectFiles(directoryPath);
  const actions: Array<{ from: string; to: string; category: string }> = [];

  for (const filePath of files) {
    const category = classifyFile(filePath);
    const targetDir = path.join(directoryPath, category);
    const targetPath = path.join(targetDir, path.basename(filePath));
    actions.push({
      from: filePath,
      to: targetPath,
      category,
    });
  }

  if (!dryRun) {
    for (const action of actions) {
      await fs.mkdir(path.dirname(action.to), { recursive: true });
      const uniqueTarget = await ensureUniquePath(action.to);
      await fs.rename(action.from, uniqueTarget);
      action.to = uniqueTarget;
    }
  }

  return {
    summary: dryRun
      ? `预览完成：${actions.length} 个文件可整理归档`
      : `执行完成：已整理 ${actions.length} 个文件`,
    warnings: actions.length === 0 ? ['目标目录下没有可整理的文件。'] : [],
    output: {
      directoryPath,
      dryRun,
      actionCount: actions.length,
      byCategory: actions.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {}),
      actions,
    },
  };
}

async function buildCommandRunner(input: Record<string, unknown>) {
  const command = requireString(input, 'command');
  const cwd = requireString(input, 'cwd', process.cwd());
  const timeoutMs = Math.max(1000, Math.min(getNumber(input, 'timeoutMs', 15000), 120000));
  await ensureDirectoryExists(cwd);

  try {
    const result = await exec(command, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      shell: true,
    });
    return {
      summary: '命令执行成功',
      warnings: [],
      output: {
        command,
        cwd,
        timeoutMs,
        stdout: truncate(result.stdout || ''),
        stderr: truncate(result.stderr || ''),
      },
    };
  } catch (error) {
    const execError = error as Error & { stdout?: string; stderr?: string; code?: number | string | null };
    return {
      summary: '命令执行失败',
      warnings: [],
      output: {
        command,
        cwd,
        timeoutMs,
        stdout: truncate(execError.stdout || ''),
        stderr: truncate(execError.stderr || ''),
        exitCode: execError.code ?? null,
      },
    };
  }
}

export class LocalExecutorService {
  private readonly userSkillsDir: string;
  private readonly legacyUserSkillsDir: string;
  private readonly bundledSkillsDir: string;
  private readonly legacyBundledSkillsDir: string;
  private readonly auditLogPath: string;
  private recentRuns: LocalSkillRunRecord[] = [];

  constructor() {
    const mimiClawConfigDir = getMimiClawConfigDir();
    this.userSkillsDir = path.join(mimiClawConfigDir, 'skills', 'local');
    this.legacyUserSkillsDir = path.join(mimiClawConfigDir, 'local-skills');
    const executorDataDir = path.join(mimiClawConfigDir, 'local-executor');
    ensureDir(this.userSkillsDir);
    ensureDir(executorDataDir);

    this.bundledSkillsDir = path.join(getResourcesDir(), 'skills', 'local');
    this.legacyBundledSkillsDir = path.join(getResourcesDir(), 'local-skills');
    this.auditLogPath = path.join(executorDataDir, 'runs.json');
    this.loadPersistedRuns();
  }

  getMeta(): LocalExecutorMeta {
    return {
      bundledSkillsDir: this.bundledSkillsDir,
      userSkillsDir: this.userSkillsDir,
      auditLogPath: this.auditLogPath,
    };
  }

  async listSkills(): Promise<LocalSkillDefinition[]> {
    const loaded = await this.loadSkills();
    return loaded.map(({ handler: _handler, ...skill }) => skill);
  }

  listRecentRuns(): LocalSkillRunRecord[] {
    return [...this.recentRuns];
  }

  async runSkill(skillId: string, request: LocalSkillRunRequest): Promise<LocalSkillRunRecord> {
    const loadedSkills = await this.loadSkills();
    const skill = loadedSkills.find((item) => item.id === skillId);
    if (!skill) {
      throw new Error(`Unknown local skill: ${skillId}`);
    }

    const input = request.input || {};
    const approvalRequired = this.requiresApproval(skill, input);
    if (approvalRequired && !request.confirmDangerousAction) {
      throw new Error('This local skill requires approval before execution.');
    }

    const startedAt = new Date().toISOString();
    const runId = crypto.randomUUID();

    try {
      const result = await this.execute(skill.handler, input);
      const status = result.summary === '命令执行失败' ? 'error' : 'success';
      const record: LocalSkillRunRecord = {
        runId,
        skillId,
        skillTitle: skill.title,
        status,
        source: skill.source,
        riskLevel: skill.riskLevel,
        approved: !approvalRequired || Boolean(request.confirmDangerousAction),
        startedAt,
        finishedAt: new Date().toISOString(),
        summary: result.summary,
        warnings: result.warnings,
        requiresApproval: approvalRequired,
        input,
        output: result.output,
        error: status === 'error' ? String((result.output as Record<string, unknown> | undefined)?.stderr || '') || undefined : undefined,
      };
      this.pushRun(record);
      return record;
    } catch (error) {
      const record: LocalSkillRunRecord = {
        runId,
        skillId,
        skillTitle: skill.title,
        status: 'error',
        source: skill.source,
        riskLevel: skill.riskLevel,
        approved: !approvalRequired || Boolean(request.confirmDangerousAction),
        startedAt,
        finishedAt: new Date().toISOString(),
        summary: '执行失败',
        warnings: [],
        requiresApproval: approvalRequired,
        input,
        error: error instanceof Error ? error.message : String(error),
      };
      this.pushRun(record);
      return record;
    }
  }

  private loadPersistedRuns(): void {
    void (async () => {
      try {
        const raw = await fs.readFile(this.auditLogPath, 'utf8');
        const parsed = JSON.parse(raw) as LocalSkillRunRecord[];
        if (Array.isArray(parsed)) {
          this.recentRuns = parsed.slice(0, MAX_IN_MEMORY_RUNS);
        }
      } catch {
        this.recentRuns = [];
      }
    })();
  }

  private async loadSkills(): Promise<LoadedSkill[]> {
    const skills = new Map<string, LoadedSkill>();
    await this.loadSkillsFromDir(this.bundledSkillsDir, 'bundled', skills);
    await this.loadSkillsFromDir(this.legacyBundledSkillsDir, 'bundled', skills);
    await this.loadSkillsFromDir(this.userSkillsDir, 'user', skills);
    await this.loadSkillsFromDir(this.legacyUserSkillsDir, 'user', skills);
    return [...skills.values()].sort((left, right) => left.title.localeCompare(right.title, 'zh-Hans-CN'));
  }

  private async loadSkillsFromDir(
    rootDir: string,
    source: LocalSkillSource,
    sink: Map<string, LoadedSkill>,
  ): Promise<void> {
    const rootStat = await fs.stat(rootDir).catch(() => null);
    if (!rootStat?.isDirectory()) return;

    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const baseDir = path.join(rootDir, entry.name);
      const manifestPath = path.join(baseDir, 'skill.json');
      try {
        const raw = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(raw) as LocalSkillManifest;
        if (!manifest?.id || !manifest?.handler) {
          logger.warn(`[local-executor] Skipping invalid skill manifest: ${manifestPath}`);
          continue;
        }
        sink.set(manifest.id, normalizeSkill(manifest, source, baseDir));
      } catch (error) {
        logger.warn(`[local-executor] Failed to read skill manifest: ${manifestPath}`, error);
      }
    }
  }

  private requiresApproval(skill: LoadedSkill, input: Record<string, unknown>): boolean {
    switch (skill.approvalMode) {
      case 'never':
        return false;
      case 'mutating_only':
        return !getBoolean(input, 'dryRun', true);
      case 'always':
      default:
        return true;
    }
  }

  private pushRun(record: LocalSkillRunRecord): void {
    this.recentRuns.unshift(record);
    if (this.recentRuns.length > MAX_IN_MEMORY_RUNS) {
      this.recentRuns.length = MAX_IN_MEMORY_RUNS;
    }
    void this.persistRuns();
  }

  private async persistRuns(): Promise<void> {
    const payload = JSON.stringify(this.recentRuns.slice(0, MAX_PERSISTED_RUNS), null, 2);
    const tempPath = `${this.auditLogPath}.tmp`;
    await fs.writeFile(tempPath, payload, 'utf8');
    await fs.rename(tempPath, this.auditLogPath);
  }

  private async execute(handler: string, input: Record<string, unknown>) {
    switch (handler) {
      case 'folder-report':
        return await buildFolderReport(input);
      case 'batch-rename':
        return await buildBatchRename(input);
      case 'downloads-organizer':
        return await buildDownloadsOrganizer(input);
      case 'command-runner':
        return await buildCommandRunner(input);
      default:
        throw new Error(`Unsupported local skill handler: ${handler}`);
    }
  }
}

export const localExecutorService = new LocalExecutorService();
