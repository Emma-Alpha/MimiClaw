import fs from 'node:fs';
import path from 'node:path';
import { resolveSkillDir } from './skill-path-utils';

export type SkillResourceTreeNode = {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: SkillResourceTreeNode[];
  content?: string;
};

export type SkillDetailPayload = {
  readmeContent: string;
  readmePath: string | null;
  resourceTree: SkillResourceTreeNode[];
  skillDir: string;
};

const README_CANDIDATES = ['SKILL.md', 'README.md', 'skill.md', 'readme.md'];
const IGNORED_DIRS = new Set(['.git', '.svn', '.hg', 'node_modules', 'dist', 'build', 'coverage', '.next']);
const MAX_DEPTH = 8;
const MAX_FILES = 400;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
const MAX_FILE_BYTES = 256 * 1024;
const TEXT_FILE_EXTS = new Set([
  'md',
  'mdx',
  'txt',
  'json',
  'yaml',
  'yml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'less',
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'py',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'rb',
  'php',
  'lua',
  'sql',
  'sh',
  'bash',
  'zsh',
  'fish',
  'c',
  'h',
  'cc',
  'cpp',
  'cxx',
  'hpp',
  'cs',
  'proto',
]);

function toPosixPath(input: string): string {
  return input.split(path.sep).join('/');
}

function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  return TEXT_FILE_EXTS.has(ext);
}

function findReadmePath(skillDir: string): string | null {
  for (const fileName of README_CANDIDATES) {
    const candidate = path.join(skillDir, fileName);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function safeReadTextFile(filePath: string): string | null {
  if (!isTextFile(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath);
    // Skip likely binary blobs.
    if (raw.includes(0)) return null;
    return raw.toString('utf8');
  } catch {
    return null;
  }
}

export function getSkillDetail(
  skillKeyOrSlug: string,
  fallbackSlug?: string,
  preferredBaseDir?: string,
): SkillDetailPayload {
  const skillDir = resolveSkillDir(skillKeyOrSlug, fallbackSlug, preferredBaseDir);
  if (!skillDir) {
    throw new Error('Skill directory not found');
  }

  const readmePath = findReadmePath(skillDir);
  const readmeContent = readmePath ? safeReadTextFile(readmePath) ?? '' : '';
  const ignoredFiles = new Set<string>();
  if (readmePath) {
    ignoredFiles.add(path.resolve(readmePath));
  }

  let totalBytes = 0;
  let fileCount = 0;

  function walk(absDir: string, depth: number, relRoot = ''): SkillResourceTreeNode[] {
    if (depth > MAX_DEPTH) return [];

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const nodes: SkillResourceTreeNode[] = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.DS_Store')) continue;
      const absPath = path.join(absDir, entry.name);
      const relPath = relRoot ? `${relRoot}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const children = walk(absPath, depth + 1, relPath);
        nodes.push({
          children,
          name: entry.name,
          path: toPosixPath(relPath),
          type: 'directory',
        });
        continue;
      }

      if (!entry.isFile()) continue;
      if (ignoredFiles.has(path.resolve(absPath))) continue;
      if (fileCount >= MAX_FILES) continue;

      let content = '';
      const text = safeReadTextFile(absPath);
      if (text !== null) {
        const bytes = Buffer.byteLength(text, 'utf8');
        if (bytes <= MAX_FILE_BYTES && totalBytes + bytes <= MAX_TOTAL_BYTES) {
          content = text;
          totalBytes += bytes;
        }
      }

      fileCount += 1;
      nodes.push({
        content,
        name: entry.name,
        path: toPosixPath(relPath),
        type: 'file',
      });
    }

    // Keep dirs first, then files; both sorted by name.
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  return {
    readmeContent,
    readmePath: readmePath ? toPosixPath(path.relative(skillDir, readmePath)) : null,
    resourceTree: walk(skillDir, 0),
    skillDir,
  };
}
