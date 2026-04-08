import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('electron', () => ({
  dialog: {},
  nativeImage: {
    createFromPath: vi.fn(() => ({
      isEmpty: () => true,
      getSize: () => ({ width: 0, height: 0 }),
      resize: () => ({
        toPNG: () => Buffer.from(''),
      }),
    })),
  },
}));

describe('listProjectMentionEntries', () => {
  let workspaceRoot = '';

  afterEach(async () => {
    if (workspaceRoot) {
      await rm(workspaceRoot, { recursive: true, force: true });
      workspaceRoot = '';
    }
    vi.resetModules();
  });

  it('indexes files from the workspace root and skips heavy hidden directories', async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'mimiclaw-mentions-'));

    await mkdir(join(workspaceRoot, 'src', 'pages'), { recursive: true });
    await mkdir(join(workspaceRoot, 'electron', 'api'), { recursive: true });
    await mkdir(join(workspaceRoot, 'node_modules', 'react'), { recursive: true });
    await mkdir(join(workspaceRoot, '.git'), { recursive: true });

    await writeFile(join(workspaceRoot, 'package.json'), '{}');
    await writeFile(join(workspaceRoot, 'src', 'pages', 'App.tsx'), 'export const App = () => null;');
    await writeFile(join(workspaceRoot, 'electron', 'api', 'routes.ts'), 'export {};');
    await writeFile(join(workspaceRoot, 'node_modules', 'react', 'index.js'), 'module.exports = {};');

    const { listProjectMentionEntries } = await import('@electron/api/routes/files');
    const entries = await listProjectMentionEntries(workspaceRoot);
    const relativePaths = entries.map((entry) => entry.relativePath);

    expect(relativePaths).toEqual(
      expect.arrayContaining([
        'src',
        'src/pages',
        'src/pages/App.tsx',
        'electron',
        'electron/api',
        'electron/api/routes.ts',
        'package.json',
      ]),
    );
    expect(relativePaths).not.toEqual(
      expect.arrayContaining([
        'node_modules',
        'node_modules/react',
        'node_modules/react/index.js',
        '.git',
      ]),
    );
  });

  it('supports workspaces that already point to a source subdirectory', async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'mimiclaw-src-root-'));

    await mkdir(join(workspaceRoot, 'pages'), { recursive: true });
    await writeFile(
      join(workspaceRoot, 'pages', 'MiniChatComposer.tsx'),
      'export function MiniChatComposer() { return null; }',
    );

    const { listProjectMentionEntries } = await import('@electron/api/routes/files');
    const entries = await listProjectMentionEntries(workspaceRoot);

    expect(entries.map((entry) => entry.relativePath)).toEqual(
      expect.arrayContaining(['pages', 'pages/MiniChatComposer.tsx']),
    );
  });
});
