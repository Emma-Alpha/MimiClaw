import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type {
  PetCompanionActivityExp,
  PetCompanionGrowthAction,
  PetCompanionUsage,
} from '../../shared/pet-companion';
import { getRecentTokenUsageHistory, type TokenUsageHistoryEntry } from './token-usage';
import { logger } from './logger';

export interface PetCompanionRealUsageSnapshot {
  activityExp: PetCompanionActivityExp;
  usage: PetCompanionUsage;
  bondExp: number;
  lastActiveAt: number;
}

function createZeroActivityExp(): PetCompanionActivityExp {
  return {
    mini_chat: 0,
    code_assistant: 0,
    voice_chat: 0,
    companion_panel: 0,
  };
}

function createZeroUsage(): PetCompanionUsage {
  return {
    mini_chat: 0,
    code_assistant: 0,
    voice_chat: 0,
    companion_panel: 0,
  };
}

function clampNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function parseTimestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsedDate = Date.parse(value);
    if (Number.isFinite(parsedDate)) return parsedDate;

    const parsedNum = Number(value);
    if (Number.isFinite(parsedNum)) {
      return parsedNum < 1e12 ? parsedNum * 1000 : parsedNum;
    }
  }
  return null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function deriveExpFromTokens(totalTokens: number, scale = 220): number {
  const safeTokens = Math.max(0, totalTokens);
  if (safeTokens <= 0) return 0;
  const derived = Math.round(Math.sqrt(safeTokens / scale));
  return Math.max(1, Math.min(28, derived));
}

function looksLikeCodeContent(content: string | undefined): boolean {
  if (!content) return false;
  const text = content.toLowerCase();
  if (text.includes('```') || text.includes('diff --git') || text.includes('apply_patch')) {
    return true;
  }
  if (/\b(pnpm|npm|yarn|bun|git|python|node|tsc|vite|eslint|vitest)\b/.test(text)) {
    return true;
  }
  if (/\b(src\/|\.tsx?\b|\.jsx?\b|\.py\b|\.rs\b|\.go\b)\b/.test(text)) {
    return true;
  }
  return false;
}

function mapOpenClawEntryToAction(entry: TokenUsageHistoryEntry): PetCompanionGrowthAction {
  const provider = (entry.provider ?? '').toLowerCase();
  const model = (entry.model ?? '').toLowerCase();
  const agentId = (entry.agentId ?? '').toLowerCase();

  const classifier = `${provider} ${model} ${agentId}`;
  if (/voice|speech|asr|realtime|audio|tts/.test(classifier)) {
    return 'voice_chat';
  }

  if (
    /code|coder|claude-code|codex|dev|engineering|programming/.test(agentId)
    || looksLikeCodeContent(entry.content)
  ) {
    return 'code_assistant';
  }

  return 'mini_chat';
}

function readNestedRecord(root: Record<string, unknown>, ...path: string[]): Record<string, unknown> | null {
  let cursor: unknown = root;
  for (const segment of path) {
    if (!cursor || typeof cursor !== 'object') {
      return null;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor && typeof cursor === 'object'
    ? (cursor as Record<string, unknown>)
    : null;
}

function extractTotalTokensFromUsage(usage: unknown): number {
  if (!usage || typeof usage !== 'object') return 0;
  const record = usage as Record<string, unknown>;
  const input = toFiniteNumber(record.input) ?? toFiniteNumber(record.promptTokens) ?? 0;
  const output = toFiniteNumber(record.output) ?? toFiniteNumber(record.completionTokens) ?? 0;
  const cacheRead = toFiniteNumber(record.cacheRead) ?? 0;
  const cacheWrite = toFiniteNumber(record.cacheWrite) ?? 0;
  const explicitTotal = toFiniteNumber(record.total) ?? toFiniteNumber(record.totalTokens);
  const total = explicitTotal ?? (input + output + cacheRead + cacheWrite);
  return clampNonNegativeInteger(total);
}

function extractClaudeRowUsageTotal(row: Record<string, unknown>): number {
  const usageCandidates: unknown[] = [
    row.usage,
    readNestedRecord(row, 'message', 'usage'),
    readNestedRecord(row, 'message', 'details', 'usage'),
    readNestedRecord(row, 'result', 'usage'),
    readNestedRecord(row, 'response', 'usage'),
  ];

  let best = 0;
  for (const candidate of usageCandidates) {
    const total = extractTotalTokensFromUsage(candidate);
    if (total > best) best = total;
  }
  return best;
}

async function summarizeClaudeCodeCliUsage(): Promise<{
  totalTokens: number;
  totalTurns: number;
  lastActiveAt: number;
}> {
  const projectsRoot = join(homedir(), '.claude', 'projects');
  let totalTokens = 0;
  let totalTurns = 0;
  let lastActiveAt = 0;

  let projectDirs: string[] = [];
  try {
    const entries = await readdir(projectsRoot, { withFileTypes: true });
    projectDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(projectsRoot, entry.name));
  } catch {
    return { totalTokens, totalTurns, lastActiveAt };
  }

  for (const projectDir of projectDirs) {
    let files: string[] = [];
    try {
      const entries = await readdir(projectDir, { withFileTypes: true });
      files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
        .map((entry) => join(projectDir, entry.name));
    } catch {
      continue;
    }

    for (const filePath of files) {
      let content = '';
      try {
        content = await readFile(filePath, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        let row: Record<string, unknown>;
        try {
          row = JSON.parse(line) as Record<string, unknown>;
        } catch {
          continue;
        }

        const total = extractClaudeRowUsageTotal(row);
        if (total <= 0) continue;

        totalTokens += total;
        totalTurns += 1;

        const timestamp =
          parseTimestampMs(row.timestamp)
          ?? parseTimestampMs(readNestedRecord(row, 'message')?.createdAt)
          ?? parseTimestampMs(readNestedRecord(row, 'message')?.updatedAt)
          ?? 0;
        if (timestamp > lastActiveAt) {
          lastActiveAt = timestamp;
        }
      }
    }
  }

  return {
    totalTokens,
    totalTurns,
    lastActiveAt,
  };
}

export async function getPetCompanionRealUsageSnapshot(
  options?: { openClawLimit?: number },
): Promise<PetCompanionRealUsageSnapshot> {
  const snapshot: PetCompanionRealUsageSnapshot = {
    activityExp: createZeroActivityExp(),
    usage: createZeroUsage(),
    bondExp: 0,
    lastActiveAt: 0,
  };

  const openClawLimit =
    typeof options?.openClawLimit === 'number' && Number.isFinite(options.openClawLimit)
      ? Math.max(1, Math.floor(options.openClawLimit))
      : 6000;

  try {
    const openClawEntries = await getRecentTokenUsageHistory(openClawLimit);
    for (const entry of openClawEntries) {
      const action = mapOpenClawEntryToAction(entry);
      const expGain = deriveExpFromTokens(entry.totalTokens, 220);
      if (expGain <= 0) continue;

      snapshot.activityExp[action] += expGain;
      snapshot.usage[action] += 1;

      const timestamp = parseTimestampMs(entry.timestamp) ?? 0;
      if (timestamp > snapshot.lastActiveAt) {
        snapshot.lastActiveAt = timestamp;
      }
    }
  } catch (error) {
    logger.debug('[pet-real-usage] Failed to read OpenClaw token usage:', error);
  }

  try {
    const claudeCodeUsage = await summarizeClaudeCodeCliUsage();
    if (claudeCodeUsage.totalTokens > 0 || claudeCodeUsage.totalTurns > 0) {
      const tokenDrivenExp = deriveExpFromTokens(claudeCodeUsage.totalTokens, 90);
      const turnDrivenExp = Math.round(Math.sqrt(Math.max(0, claudeCodeUsage.totalTurns)) * 1.8);
      snapshot.activityExp.code_assistant += Math.max(0, tokenDrivenExp + turnDrivenExp);
      snapshot.usage.code_assistant += Math.max(0, claudeCodeUsage.totalTurns);
      if (claudeCodeUsage.lastActiveAt > snapshot.lastActiveAt) {
        snapshot.lastActiveAt = claudeCodeUsage.lastActiveAt;
      }
    }
  } catch (error) {
    logger.debug('[pet-real-usage] Failed to read Claude Code CLI usage:', error);
  }

  const weightedInteractions =
    snapshot.usage.mini_chat
    + snapshot.usage.code_assistant * 0.9
    + snapshot.usage.voice_chat * 1.2;
  snapshot.bondExp = Math.max(
    0,
    Math.min(100, Math.round(Math.sqrt(Math.max(0, weightedInteractions)) * 5.4)),
  );

  snapshot.activityExp.companion_panel = 0;
  snapshot.usage.companion_panel = 0;

  return snapshot;
}
