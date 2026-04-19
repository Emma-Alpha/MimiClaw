import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@electron/utils/channel-config', () => ({
  readOpenClawConfig: vi.fn(),
}));

vi.mock('@electron/utils/plugin-install', () => ({
  ensureDingTalkPluginInstalled: vi.fn(),
  ensureFeishuPluginInstalled: vi.fn(),
  ensureQQBotPluginInstalled: vi.fn(),
  ensureWeChatPluginInstalled: vi.fn(),
  ensureWeComPluginInstalled: vi.fn(),
}));

import { resolvePluginIcon } from '@electron/utils/plugins';

const createdDirs: string[] = [];

async function createTempPluginDir() {
  const dir = await mkdtemp(join(tmpdir(), 'mimiclaw-plugin-icon-'));
  createdDirs.push(dir);
  return dir;
}

describe('resolvePluginIcon', () => {
  afterEach(async () => {
    await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
  });

  it('resolves relative icon metadata to a file URL', async () => {
    const pluginDir = await createTempPluginDir();
    const iconPath = join(pluginDir, 'assets', 'logo.svg');
    await mkdir(join(pluginDir, 'assets'), { recursive: true });
    await writeFile(iconPath, '<svg />', 'utf8');

    const icon = await resolvePluginIcon(pluginDir, ['./assets/logo.svg']);

    expect(icon).toBe(`file://${iconPath}`);
  });

  it('keeps direct remote icon URLs unchanged', async () => {
    const pluginDir = await createTempPluginDir();
    const icon = await resolvePluginIcon(pluginDir, ['https://example.com/plugin-icon.png']);

    expect(icon).toBe('https://example.com/plugin-icon.png');
  });

  it('falls back to common icon filenames when metadata is absent', async () => {
    const pluginDir = await createTempPluginDir();
    const iconPath = join(pluginDir, 'icon.png');
    await writeFile(iconPath, 'png', 'utf8');

    const icon = await resolvePluginIcon(pluginDir, []);

    expect(icon).toBe(`file://${iconPath}`);
  });

  it('returns undefined when no icon can be found', async () => {
    const pluginDir = await createTempPluginDir();

    const icon = await resolvePluginIcon(pluginDir, []);

    expect(icon).toBeUndefined();
  });
});
