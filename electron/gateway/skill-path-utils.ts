/**
 * Resolve skill directories on disk (OpenClaw managed + ~/.agents/skills) and open in shell/editor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { shell } from 'electron';
import { getOpenClawConfigDir } from '../utils/paths';

function extractFrontmatterName(skillManifestPath: string): string | null {
  try {
    const raw = fs.readFileSync(skillManifestPath, 'utf8');
    const frontmatterMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;
    const body = frontmatterMatch[1];
    const nameMatch = body.match(/^\s*name\s*:\s*["']?([^"'\n]+)["']?\s*$/m);
    if (!nameMatch) return null;
    const name = nameMatch[1].trim();
    return name || null;
  } catch {
    return null;
  }
}

function resolveSkillDirByManifestName(skillsRoot: string, candidates: string[]): string | null {
  if (!fs.existsSync(skillsRoot)) return null;

  const wanted = new Set(
    candidates
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0),
  );
  if (wanted.size === 0) return null;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(skillsRoot, entry.name);
    const skillManifestPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillManifestPath)) continue;

    const frontmatterName = extractFrontmatterName(skillManifestPath);
    if (!frontmatterName) continue;
    if (wanted.has(frontmatterName.toLowerCase())) {
      return skillDir;
    }
  }
  return null;
}

export function resolveSkillDir(
  skillKeyOrSlug: string,
  fallbackSlug?: string,
  preferredBaseDir?: string,
): string | null {
  const candidates = [skillKeyOrSlug, fallbackSlug]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
  const uniqueCandidates = [...new Set(candidates)];

  if (preferredBaseDir?.trim() && fs.existsSync(preferredBaseDir.trim())) {
    return preferredBaseDir.trim();
  }

  const openclawRoot = path.join(getOpenClawConfigDir(), 'skills');
  const agentsRoot = path.join(homedir(), '.agents', 'skills');

  for (const id of uniqueCandidates) {
    const direct = [path.join(openclawRoot, id), path.join(agentsRoot, id)].find((d) => fs.existsSync(d));
    if (direct) return direct;
  }

  return (
    resolveSkillDirByManifestName(openclawRoot, uniqueCandidates) ||
    resolveSkillDirByManifestName(agentsRoot, uniqueCandidates)
  );
}

export async function openSkillReadme(
  skillKeyOrSlug: string,
  fallbackSlug?: string,
  preferredBaseDir?: string,
): Promise<boolean> {
  const skillDir = resolveSkillDir(skillKeyOrSlug, fallbackSlug, preferredBaseDir);
  const possibleFiles = ['SKILL.md', 'README.md', 'skill.md', 'readme.md'];
  let targetFile = '';

  if (skillDir) {
    for (const file of possibleFiles) {
      const filePath = path.join(skillDir, file);
      if (fs.existsSync(filePath)) {
        targetFile = filePath;
        break;
      }
    }
  }

  if (!targetFile) {
    if (skillDir) {
      targetFile = skillDir;
    } else {
      throw new Error('Skill directory not found');
    }
  }

  const openResult = await shell.openPath(targetFile);
  if (openResult) {
    throw new Error(openResult);
  }
  return true;
}

export async function openSkillPath(
  skillKeyOrSlug: string,
  fallbackSlug?: string,
  preferredBaseDir?: string,
): Promise<boolean> {
  const skillDir = resolveSkillDir(skillKeyOrSlug, fallbackSlug, preferredBaseDir);
  if (!skillDir) {
    throw new Error('Skill directory not found');
  }
  const openResult = await shell.openPath(skillDir);
  if (openResult) {
    throw new Error(openResult);
  }
  return true;
}
