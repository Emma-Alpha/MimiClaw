import { spawn } from 'node:child_process';
import { clipboard } from 'electron';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getResourcesDir } from './paths';

type LaunchCommand = {
  command: string;
  args: string[];
};

const SNIPASTE_BOOT_DELAY_MS = 500;
const SNIPASTE_CAPTURE_TIMEOUT_MS = 120_000;
const SNIPASTE_CLIPBOARD_POLL_MS = 250;

export type SnipasteCaptureResult = {
  fileName: string;
  mimeType: string;
  fileSize: number;
  base64: string;
  preview: string;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashImage(image: Electron.NativeImage): string | null {
  if (image.isEmpty()) return null;
  return createHash('sha256').update(image.toPNG()).digest('hex');
}

function getBundledSnipasteRoot(): string {
  return join(getResourcesDir(), 'snipaste');
}

function resolveExistingCandidate(candidates: string[]): string | null {
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function isCommandLookupCandidate(candidate: string): boolean {
  return !candidate.includes('/') && !candidate.includes('\\');
}

function getBundledPlatformDirs(): string[] {
  const root = getBundledSnipasteRoot();
  const arch = process.arch;
  switch (process.platform) {
    case 'darwin':
      return [
        join(root, `darwin-${arch}`),
        join(root, 'darwin'),
      ];
    case 'win32':
      return [
        join(root, `win32-${arch}`),
        join(root, 'win32'),
        join(root, 'windows'),
      ];
    case 'linux':
      return [
        join(root, `linux-${arch}`),
        join(root, 'linux'),
      ];
    default:
      return [];
  }
}

function resolveMacSnipasteBinary(): string | null {
  const bundled = resolveExistingCandidate(
    getBundledPlatformDirs().flatMap((dir) => [
      join(dir, 'Snipaste.app', 'Contents', 'MacOS', 'Snipaste'),
      join(dir, 'Snipaste'),
    ]),
  );
  if (bundled) return bundled;

  const candidates = [
    '/Applications/Snipaste.app/Contents/MacOS/Snipaste',
    join(homedir(), 'Applications', 'Snipaste.app', 'Contents', 'MacOS', 'Snipaste'),
  ];

  return resolveExistingCandidate(candidates);
}

function resolveWindowsSnipasteBinary(): string {
  const bundled = resolveExistingCandidate(
    getBundledPlatformDirs().flatMap((dir) => [
      join(dir, 'Snipaste.exe'),
      join(dir, 'Snipaste', 'Snipaste.exe'),
    ]),
  );
  if (bundled) return bundled;

  const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const candidates = [
    join(localAppData, 'Programs', 'Snipaste', 'Snipaste.exe'),
    join(programFiles, 'Snipaste', 'Snipaste.exe'),
    join(programFilesX86, 'Snipaste', 'Snipaste.exe'),
  ];

  return resolveExistingCandidate(candidates) ?? null;
}

function resolveLinuxSnipasteBinary(): string | null {
  const bundled = resolveExistingCandidate(
    getBundledPlatformDirs().flatMap((dir) => [
      join(dir, 'snipaste'),
      join(dir, 'Snipaste'),
      join(dir, 'Snipaste.AppImage'),
    ]),
  );
  if (bundled) return bundled;

  const candidates = [
    '/usr/bin/snipaste',
    '/usr/local/bin/snipaste',
    join(homedir(), 'Applications', 'Snipaste.AppImage'),
  ];

  return resolveExistingCandidate(candidates) ?? null;
}

function getSnipasteMissingError(): Error {
  return new Error('Snipaste is not available. Please bundle it with the app or install Snipaste on this machine first.');
}

function resolveSnipasteLaunchCommand(args: string[]): LaunchCommand {
  if (process.platform === 'darwin') {
    const binary = resolveMacSnipasteBinary();
    if (!binary) {
      throw getSnipasteMissingError();
    }
    return { command: binary, args };
  }

  if (process.platform === 'win32') {
    const binary = resolveWindowsSnipasteBinary();
    if (!binary) {
      throw getSnipasteMissingError();
    }
    return { command: binary, args };
  }

  if (process.platform === 'linux') {
    const binary = resolveLinuxSnipasteBinary();
    if (!binary) {
      throw getSnipasteMissingError();
    }
    return { command: binary, args };
  }

  throw new Error(`Snipaste capture is not supported on ${process.platform}.`);
}

function launchSnipaste(args: string[]): Promise<void> {
  const { command, args: commandArgs } = resolveSnipasteLaunchCommand(args);

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    child.once('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' && isCommandLookupCandidate(command)) {
        reject(getSnipasteMissingError());
        return;
      }
      reject(new Error(`Failed to launch Snipaste: ${error.message}`));
    });

    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

export async function launchSnipasteCapture(): Promise<void> {
  await launchSnipaste([]);
  await wait(SNIPASTE_BOOT_DELAY_MS);
  // Use plain "snip" so Snipaste keeps its native post-selection toolbar.
  // We'll wait for the user to finish editing/copying and then read the clipboard.
  await launchSnipaste(['snip']);
}

async function waitForClipboardImage(previousHash: string | null): Promise<Electron.NativeImage> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SNIPASTE_CAPTURE_TIMEOUT_MS) {
    const image = clipboard.readImage();
    const nextHash = hashImage(image);
    if (nextHash && nextHash !== previousHash) {
      return image;
    }
    await wait(SNIPASTE_CLIPBOARD_POLL_MS);
  }

  throw new Error('Snipaste capture timed out or was cancelled.');
}

export async function captureWithSnipaste(): Promise<SnipasteCaptureResult> {
  const previousHash = hashImage(clipboard.readImage());
  await launchSnipasteCapture();
  const screenshot = await waitForClipboardImage(previousHash);
  const png = screenshot.toPNG();
  const preview = screenshot.resize({ width: 64, height: 64, quality: 'good' }).toDataURL();

  return {
    fileName: `snipaste-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
    mimeType: 'image/png',
    fileSize: png.length,
    base64: png.toString('base64'),
    preview,
  };
}
