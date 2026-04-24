import type { IncomingMessage, ServerResponse } from 'http';
import { dialog, nativeImage } from 'electron';
import crypto from 'node:crypto';
import { extname, join, relative } from 'node:path';
import { homedir } from 'node:os';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';

const EXT_MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
  '.7z': 'application/x-7z-compressed',
  '.rar': 'application/vnd.rar',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.py': 'text/x-python',
};

function getMimeType(ext: string): string {
  return EXT_MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
}

function mimeToExt(mimeType: string): string {
  for (const [ext, mime] of Object.entries(EXT_MIME_MAP)) {
    if (mime === mimeType) return ext;
  }
  return '';
}

const OUTBOUND_DIR = join(homedir(), '.openclaw', 'media', 'outbound');
const PROJECT_MENTION_SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'dist-electron',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  'tmp',
  'temp',
]);
const MAX_PROJECT_MENTION_ENTRIES = 500;

type ProjectMentionEntry = {
  absolutePath: string;
  relativePath: string;
  name: string;
  isDirectory: boolean;
};

function shouldSkipProjectMentionEntry(name: string, isDirectory: boolean): boolean {
  if (!name || name.startsWith('.')) return true;
  if (isDirectory && PROJECT_MENTION_SKIP_DIRS.has(name)) return true;
  return false;
}

export async function listProjectMentionEntries(workspaceRoot: string): Promise<ProjectMentionEntry[]> {
  const normalizedRoot = workspaceRoot.trim();
  if (!normalizedRoot) return [];

  const fsP = await import('node:fs/promises');
  const rootStat = await fsP.stat(normalizedRoot).catch(() => null);
  if (!rootStat?.isDirectory()) return [];

  // Try using Rust indexer first
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    // Path to the Rust binary (relative to electron directory)
    const rustBinaryPath = join(__dirname, '../../rust-indexer/target/release/file-indexer');

    const { stdout } = await execFileAsync(rustBinaryPath, [
      'index',
      '--root',
      normalizedRoot,
      '--max',
      String(MAX_PROJECT_MENTION_ENTRIES),
    ], { maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer

    const entries: ProjectMentionEntry[] = JSON.parse(stdout);
    return entries;
  } catch (error) {
    console.warn('Rust indexer failed, falling back to Node.js implementation:', error);
    // Fallback to Node.js implementation
  }

  // Fallback: Node.js implementation
  const results: ProjectMentionEntry[] = [];
  const queue = [normalizedRoot];

  while (queue.length > 0 && results.length < MAX_PROJECT_MENTION_ENTRIES) {
    const currentDir = queue.shift();
    if (!currentDir) continue;
    const entries = await fsP.readdir(currentDir, { withFileTypes: true }).catch(() => []);
    entries.sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
      }
      return left.name.localeCompare(right.name, 'en');
    });

    for (const entry of entries) {
      const isDirectory = entry.isDirectory();
      if (shouldSkipProjectMentionEntry(entry.name, isDirectory)) continue;
      const absolutePath = join(currentDir, entry.name);
      const normalizedRelative = relative(normalizedRoot, absolutePath).replace(/\\/g, '/');
      results.push({
        absolutePath,
        relativePath: normalizedRelative,
        name: entry.name,
        isDirectory,
      });
      if (results.length >= MAX_PROJECT_MENTION_ENTRIES) {
        break;
      }
      if (isDirectory) {
        queue.push(absolutePath);
      }
    }
  }

  return results;
}

/**
 * List only the direct children of a specific directory within the workspace.
 * Used for Cursor-like "@" directory browsing: typing `@src/` shows contents of `src/`.
 */
export async function listDirectoryChildren(
  workspaceRoot: string,
  dirRelativePath: string,
): Promise<ProjectMentionEntry[]> {
  const normalizedRoot = workspaceRoot.trim();
  if (!normalizedRoot) return [];

  const fsP = await import('node:fs/promises');
  const targetDir = dirRelativePath
    ? join(normalizedRoot, dirRelativePath)
    : normalizedRoot;

  const dirStat = await fsP.stat(targetDir).catch(() => null);
  if (!dirStat?.isDirectory()) return [];

  const dirEntries = await fsP.readdir(targetDir, { withFileTypes: true }).catch(() => []);

  // Sort: directories first, then alphabetical
  dirEntries.sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) {
      return left.isDirectory() ? -1 : 1;
    }
    return left.name.localeCompare(right.name, 'en');
  });

  const results: ProjectMentionEntry[] = [];
  for (const entry of dirEntries) {
    const isDirectory = entry.isDirectory();
    if (shouldSkipProjectMentionEntry(entry.name, isDirectory)) continue;
    const absolutePath = join(targetDir, entry.name);
    const normalizedRelative = relative(normalizedRoot, absolutePath).replace(/\\/g, '/');
    results.push({
      absolutePath,
      relativePath: normalizedRelative,
      name: entry.name,
      isDirectory,
    });
  }

  return results;
}

export async function listProjectMentionEntriesWithSearch(
  workspaceRoot: string,
  query: string,
): Promise<ProjectMentionEntry[]> {
  const normalizedRoot = workspaceRoot.trim();
  if (!normalizedRoot) return [];

  const fsP = await import('node:fs/promises');
  const rootStat = await fsP.stat(normalizedRoot).catch(() => null);
  if (!rootStat?.isDirectory()) return [];

  // Try using Rust search
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    const rustBinaryPath = join(__dirname, '../../rust-indexer/target/release/file-indexer');

    const { stdout } = await execFileAsync(rustBinaryPath, [
      'search',
      '--root',
      normalizedRoot,
      '--query',
      query,
      '--limit',
      '80',
    ], { maxBuffer: 50 * 1024 * 1024 });

    const entries: ProjectMentionEntry[] = JSON.parse(stdout);
    return entries;
  } catch (error) {
    console.warn('Rust search failed, falling back to simple filter:', error);
    // Fallback: get all entries and filter
    const allEntries = await listProjectMentionEntries(normalizedRoot);
    const lowerQuery = query.toLowerCase();
    return allEntries
      .filter(entry =>
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.relativePath.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 80);
  }
}

async function generateImagePreview(filePath: string, mimeType: string): Promise<string | null> {
  try {
    const img = nativeImage.createFromPath(filePath);
    if (img.isEmpty()) return null;
    const size = img.getSize();
    const maxDim = 512;
    if (size.width > maxDim || size.height > maxDim) {
      const resized = size.width >= size.height
        ? img.resize({ width: maxDim })
        : img.resize({ height: maxDim });
      return `data:image/png;base64,${resized.toPNG().toString('base64')}`;
    }
    const { readFile } = await import('node:fs/promises');
    const buf = await readFile(filePath);
    return `data:${mimeType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function handleFileRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/files/project-mentions' && req.method === 'GET') {
    try {
      const workspaceRoot = url.searchParams.get('workspaceRoot')?.trim() || '';
      const query = url.searchParams.get('query')?.trim() || '';
      if (!workspaceRoot) {
        sendJson(res, 400, { success: false, error: 'workspaceRoot is required' });
        return true;
      }

      const mode = url.searchParams.get('mode')?.trim() || '';
      const dir = url.searchParams.get('dir')?.trim() || '';

      // mode=browse: list direct children of a directory (Cursor-like browsing)
      // otherwise: search or index
      let entries: ProjectMentionEntry[];
      if (mode === 'browse') {
        entries = await listDirectoryChildren(workspaceRoot, dir);
      } else if (query) {
        entries = await listProjectMentionEntriesWithSearch(workspaceRoot, query);
      } else {
        entries = await listProjectMentionEntries(workspaceRoot);
      }

      sendJson(res, 200, { success: true, entries });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/files/git-branch' && req.method === 'GET') {
    try {
      const workspaceRoot = url.searchParams.get('workspaceRoot')?.trim() || '';
      if (!workspaceRoot) {
        sendJson(res, 400, { success: false, error: 'workspaceRoot is required' });
        return true;
      }
      try {
        const { execFile } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execFileAsync = promisify(execFile);

        const [headResult, branchResult] = await Promise.allSettled([
          execFileAsync('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: workspaceRoot }),
          execFileAsync('git', ['branch', '--format=%(refname:short)'], { cwd: workspaceRoot }),
        ]);

        const branch = headResult.status === 'fulfilled'
          ? headResult.value.stdout.trim()
          : '';

        const branches = branchResult.status === 'fulfilled'
          ? branchResult.value.stdout
              .split('\n')
              .map((b) => b.trim())
              .filter(Boolean)
          : branch ? [branch] : [];

        sendJson(res, 200, { success: true, branch, branches });
      } catch {
        sendJson(res, 200, { success: true, branch: '', branches: [] });
      }
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/files/workspace-status' && req.method === 'GET') {
    try {
      const workspaceRoot = url.searchParams.get('workspaceRoot')?.trim() || '';
      if (!workspaceRoot) {
        sendJson(res, 400, { success: false, error: 'workspaceRoot is required' });
        return true;
      }

      const fsP = await import('node:fs/promises');
      try {
        const stat = await fsP.stat(workspaceRoot);
        if (!stat.isDirectory()) {
          sendJson(res, 200, {
            success: true,
            available: false,
            reason: 'not_directory',
          });
          return true;
        }

        await fsP.access(workspaceRoot, fsP.constants.R_OK);
        sendJson(res, 200, {
          success: true,
          available: true,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendJson(res, 200, {
          success: true,
          available: false,
          reason: message,
        });
      }
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/files/stage-paths' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ filePaths: string[] }>(req);
      const fsP = await import('node:fs/promises');
      await fsP.mkdir(OUTBOUND_DIR, { recursive: true });
      const results = [];
      for (const filePath of body.filePaths) {
        const id = crypto.randomUUID();
        const ext = extname(filePath);
        const stagedPath = join(OUTBOUND_DIR, `${id}${ext}`);
        await fsP.copyFile(filePath, stagedPath);
        const s = await fsP.stat(stagedPath);
        const mimeType = getMimeType(ext);
        const fileName = filePath.split(/[\\/]/).pop() || 'file';
        const preview = mimeType.startsWith('image/')
          ? await generateImagePreview(stagedPath, mimeType)
          : null;
        results.push({ id, fileName, mimeType, fileSize: s.size, stagedPath, preview });
      }
      sendJson(res, 200, results);
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/files/stage-buffer' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ base64: string; fileName: string; mimeType: string }>(req);
      const fsP = await import('node:fs/promises');
      await fsP.mkdir(OUTBOUND_DIR, { recursive: true });
      const id = crypto.randomUUID();
      const ext = extname(body.fileName) || mimeToExt(body.mimeType);
      const stagedPath = join(OUTBOUND_DIR, `${id}${ext}`);
      const buffer = Buffer.from(body.base64, 'base64');
      await fsP.writeFile(stagedPath, buffer);
      const mimeType = body.mimeType || getMimeType(ext);
      const preview = mimeType.startsWith('image/')
        ? await generateImagePreview(stagedPath, mimeType)
        : null;
      sendJson(res, 200, {
        id,
        fileName: body.fileName,
        mimeType,
        fileSize: buffer.length,
        stagedPath,
        preview,
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/files/thumbnails' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ paths: Array<{ filePath: string; mimeType: string }> }>(req);
      const fsP = await import('node:fs/promises');
      const results: Record<string, { preview: string | null; fileSize: number }> = {};
      for (const { filePath, mimeType } of body.paths) {
        try {
          const s = await fsP.stat(filePath);
          const preview = mimeType.startsWith('image/')
            ? await generateImagePreview(filePath, mimeType)
            : null;
          results[filePath] = { preview, fileSize: s.size };
        } catch {
          results[filePath] = { preview: null, fileSize: 0 };
        }
      }
      sendJson(res, 200, results);
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/files/save-image' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        base64?: string;
        mimeType?: string;
        filePath?: string;
        defaultFileName: string;
      }>(req);
      const ext = body.defaultFileName.includes('.')
        ? body.defaultFileName.split('.').pop()!
        : (body.mimeType?.split('/')[1] || 'png');
      const result = await dialog.showSaveDialog({
        defaultPath: join(homedir(), 'Downloads', body.defaultFileName),
        filters: [
          { name: 'Images', extensions: [ext, 'png', 'jpg', 'jpeg', 'webp', 'gif'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result.canceled || !result.filePath) {
        sendJson(res, 200, { success: false });
        return true;
      }
      const fsP = await import('node:fs/promises');
      if (body.filePath) {
        await fsP.copyFile(body.filePath, result.filePath);
      } else if (body.base64) {
        await fsP.writeFile(result.filePath, Buffer.from(body.base64, 'base64'));
      } else {
        sendJson(res, 400, { success: false, error: 'No image data provided' });
        return true;
      }
      sendJson(res, 200, { success: true, savedPath: result.filePath });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
