import { app } from 'electron';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { logger } from '../utils/logger';

const WHISPER_CPP_VERSION = 'v1.7.6';
const WHISPER_CPP_SOURCE_URL = `https://github.com/ggml-org/whisper.cpp/archive/refs/tags/${WHISPER_CPP_VERSION}.tar.gz`;
const WHISPER_MODEL_NAME = 'small';
const WHISPER_MODEL_FILE = 'ggml-small.bin';
const WHISPER_MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${WHISPER_MODEL_FILE}?download=true`;
const WHISPER_VAD_MODEL_NAME = 'silero-v6.2.0';
const WHISPER_VAD_MODEL_FILE = 'ggml-silero-v6.2.0.bin';
const WHISPER_VAD_MODEL_URL = `https://huggingface.co/ggml-org/whisper-vad/resolve/main/${WHISPER_VAD_MODEL_FILE}?download=true`;
const CMAKE_VERSION = '4.2.1';
const TAR_BINARY = process.platform === 'darwin' ? '/usr/bin/tar' : 'tar';

type CmakeBundleSpec = {
  url: string;
  binaryRelativePath: string[];
};

export interface LocalTranscriptionResult {
  text: string;
  engine: 'whisper.cpp';
  model: string;
  language: string;
  durationMs: number;
}

export interface LocalTranscriptionBootstrapStatus {
  supported: boolean;
  ready: boolean;
  hasSource: boolean;
  sourceVersion: string | null;
  sourceVersionMatched: boolean;
  hasBinary: boolean;
  hasModel: boolean;
  hasVadModel: boolean;
  engine: 'whisper.cpp';
  model: string;
  vadModel: string;
  rootDir: string;
  reason?: string;
}

type WhisperAssets = {
  rootDir: string;
  sourceDir: string;
  binaryPath: string;
  modelPath: string;
  vadModelPath: string;
};

let whisperAssetsPromise: Promise<WhisperAssets> | null = null;

function getWhisperRootDir(): string {
  return join(app.getPath('userData'), 'speech', 'whisper.cpp');
}

function getWhisperSourceVersionPath(rootDir: string): string {
  return join(rootDir, '.source-version');
}

function getBundledCmakeSpec(): CmakeBundleSpec | null {
  if (process.platform === 'darwin') {
    return {
      url: `https://github.com/Kitware/CMake/releases/download/v${CMAKE_VERSION}/cmake-${CMAKE_VERSION}-macos-universal.tar.gz`,
      binaryRelativePath: ['CMake.app', 'Contents', 'bin', 'cmake'],
    };
  }

  if (process.platform === 'linux') {
    if (process.arch === 'x64') {
      return {
        url: `https://github.com/Kitware/CMake/releases/download/v${CMAKE_VERSION}/cmake-${CMAKE_VERSION}-linux-x86_64.tar.gz`,
        binaryRelativePath: ['bin', 'cmake'],
      };
    }
    if (process.arch === 'arm64') {
      return {
        url: `https://github.com/Kitware/CMake/releases/download/v${CMAKE_VERSION}/cmake-${CMAKE_VERSION}-linux-aarch64.tar.gz`,
        binaryRelativePath: ['bin', 'cmake'],
      };
    }
  }

  return null;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadToFile(url: string, destinationPath: string): Promise<void> {
  logger.info(`[speech] Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const tempPath = `${destinationPath}.download`;
  await mkdir(dirname(destinationPath), { recursive: true });
  await writeFile(tempPath, buffer);
  await rename(tempPath, destinationPath);
}

async function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string },
): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error((stderr || stdout || `${command} exited with code ${code}`).trim()));
    });
  });
}

async function resolveBinaryFromPath(commandName: string): Promise<string | null> {
  const pathValue = process.env.PATH || '';
  const pathEntries = pathValue.split(delimiter).filter(Boolean);
  const candidateNames = process.platform === 'win32'
    ? [commandName, `${commandName}.exe`, `${commandName}.cmd`]
    : [commandName];

  for (const entry of pathEntries) {
    for (const candidateName of candidateNames) {
      const candidatePath = join(entry, candidateName);
      if (await pathExists(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

async function ensureCmakeBinary(rootDir: string): Promise<string> {
  const systemCmake = await resolveBinaryFromPath('cmake');
  if (systemCmake) {
    return systemCmake;
  }

  const cmakeSpec = getBundledCmakeSpec();
  if (!cmakeSpec) {
    throw new Error(`Automatic CMake bootstrap is not supported on ${process.platform}-${process.arch}`);
  }

  const toolchainDir = join(rootDir, 'toolchain', 'cmake');
  const binaryPath = join(toolchainDir, ...cmakeSpec.binaryRelativePath);
  if (await pathExists(binaryPath)) {
    return binaryPath;
  }

  const archivePath = join(rootDir, 'toolchain', `cmake-${CMAKE_VERSION}.tar.gz`);
  const tempExtractDir = join(rootDir, 'toolchain', 'cmake.extracting');

  await rm(tempExtractDir, { recursive: true, force: true });
  await downloadToFile(cmakeSpec.url, archivePath);

  try {
    await mkdir(tempExtractDir, { recursive: true });
    logger.info(`[speech] Bootstrapping bundled CMake ${CMAKE_VERSION}`);
    await runCommand(TAR_BINARY, [
      '-xzf',
      archivePath,
      '-C',
      tempExtractDir,
      '--strip-components=1',
    ]);
    await rm(toolchainDir, { recursive: true, force: true });
    await rename(tempExtractDir, toolchainDir);
  } finally {
    await rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
    await rm(archivePath, { recursive: true, force: true }).catch(() => {});
  }

  if (!await pathExists(binaryPath)) {
    throw new Error(`Bundled CMake bootstrap completed but binary was not found at ${binaryPath}`);
  }

  return binaryPath;
}

async function resolveWhisperBinary(sourceDir: string): Promise<string | null> {
  const directCandidates = [
    join(sourceDir, 'build', 'bin', 'whisper-cli'),
    join(sourceDir, 'build', 'bin', 'Release', 'whisper-cli'),
    join(sourceDir, 'whisper-cli'),
    join(sourceDir, 'main'),
  ];

  for (const candidate of directCandidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  const queue: Array<{ dir: string; depth: number }> = [{ dir: sourceDir, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const entries = await readdir(current.dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current.dir, entry.name);
      if (entry.isDirectory()) {
        if (current.depth < 4 && entry.name !== '.git') {
          queue.push({ dir: fullPath, depth: current.depth + 1 });
        }
        continue;
      }

      if (entry.isFile() && (entry.name === 'whisper-cli' || entry.name === 'main')) {
        return fullPath;
      }
    }
  }

  return null;
}

async function ensureWhisperSource(rootDir: string): Promise<string> {
  const sourceDir = join(rootDir, 'source');
  const versionFilePath = getWhisperSourceVersionPath(rootDir);

  if (await pathExists(join(sourceDir, 'Makefile')) && await pathExists(versionFilePath)) {
    try {
      const currentVersion = (await readFile(versionFilePath, 'utf8')).trim();
      if (currentVersion === WHISPER_CPP_VERSION) {
        return sourceDir;
      }
      logger.info(`[speech] whisper.cpp source version mismatch (${currentVersion} -> ${WHISPER_CPP_VERSION}), refreshing source`);
    } catch {
      logger.info('[speech] whisper.cpp source version marker unreadable, refreshing source');
    }
  }

  await mkdir(rootDir, { recursive: true });
  const archivePath = join(rootDir, `whisper.cpp-${WHISPER_CPP_VERSION}.tar.gz`);
  const tempExtractDir = join(rootDir, 'source.extracting');

  await rm(tempExtractDir, { recursive: true, force: true });
  await rm(sourceDir, { recursive: true, force: true });
  await downloadToFile(WHISPER_CPP_SOURCE_URL, archivePath);

  try {
    await mkdir(tempExtractDir, { recursive: true });
    await runCommand(TAR_BINARY, [
      '-xzf',
      archivePath,
      '-C',
      tempExtractDir,
      '--strip-components=1',
    ]);
    await rename(tempExtractDir, sourceDir);
    await writeFile(versionFilePath, `${WHISPER_CPP_VERSION}\n`, 'utf8');
  } finally {
    await rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
    await rm(archivePath, { recursive: true, force: true }).catch(() => {});
  }

  return sourceDir;
}

async function ensureWhisperBinary(rootDir: string, sourceDir: string): Promise<string> {
  const existingBinary = await resolveWhisperBinary(sourceDir);
  if (existingBinary) {
    return existingBinary;
  }

  const cmakeBinary = await ensureCmakeBinary(rootDir);
  const buildDir = join(sourceDir, 'build');
  const jobCount = Math.max(1, Math.min(4, cpus().length || 1));
  logger.info(`[speech] Configuring whisper.cpp CLI with CMake: ${cmakeBinary}`);

  await runCommand(cmakeBinary, [
    '-S',
    sourceDir,
    '-B',
    buildDir,
    '-DCMAKE_BUILD_TYPE=Release',
  ], { cwd: sourceDir });

  try {
    await runCommand(cmakeBinary, [
      '--build',
      buildDir,
      '--config',
      'Release',
      '--target',
      'whisper-cli',
      '--parallel',
      String(jobCount),
    ], { cwd: sourceDir });
  } catch (error) {
    logger.warn('[speech] whisper-cli target build failed, retrying default build target', error);
    await runCommand(cmakeBinary, [
      '--build',
      buildDir,
      '--config',
      'Release',
      '--parallel',
      String(jobCount),
    ], { cwd: sourceDir });
  }

  const binaryPath = await resolveWhisperBinary(sourceDir);
  if (!binaryPath) {
    throw new Error('whisper.cpp build completed but no CLI binary was found');
  }

  return binaryPath;
}

async function ensureWhisperModel(rootDir: string): Promise<string> {
  const modelPath = join(rootDir, 'models', WHISPER_MODEL_FILE);
  if (await pathExists(modelPath)) {
    return modelPath;
  }

  await downloadToFile(WHISPER_MODEL_URL, modelPath);
  return modelPath;
}

async function ensureWhisperVadModel(rootDir: string): Promise<string> {
  const modelPath = join(rootDir, 'models', WHISPER_VAD_MODEL_FILE);
  if (await pathExists(modelPath)) {
    return modelPath;
  }

  await downloadToFile(WHISPER_VAD_MODEL_URL, modelPath);
  return modelPath;
}

async function ensureWhisperAssetsInternal(): Promise<WhisperAssets> {
  if (process.platform === 'win32') {
    throw new Error('Automatic local whisper.cpp bootstrap is not supported on Windows yet');
  }

  const rootDir = getWhisperRootDir();
  const sourceDir = await ensureWhisperSource(rootDir);
  const [binaryPath, modelPath, vadModelPath] = await Promise.all([
    ensureWhisperBinary(rootDir, sourceDir),
    ensureWhisperModel(rootDir),
    ensureWhisperVadModel(rootDir),
  ]);

  return {
    rootDir,
    sourceDir,
    binaryPath,
    modelPath,
    vadModelPath,
  };
}

async function ensureWhisperAssets(): Promise<WhisperAssets> {
  if (whisperAssetsPromise) {
    return await whisperAssetsPromise;
  }

  whisperAssetsPromise = ensureWhisperAssetsInternal()
    .catch((error) => {
      whisperAssetsPromise = null;
      throw error;
    });

  return await whisperAssetsPromise;
}

export async function getLocalTranscriptionBootstrapStatus(): Promise<LocalTranscriptionBootstrapStatus> {
  const rootDir = getWhisperRootDir();
  const sourceDir = join(rootDir, 'source');
  const modelPath = join(rootDir, 'models', WHISPER_MODEL_FILE);
  const vadModelPath = join(rootDir, 'models', WHISPER_VAD_MODEL_FILE);
  const versionFilePath = getWhisperSourceVersionPath(rootDir);

  if (process.platform === 'win32') {
    return {
      supported: false,
      ready: false,
      hasSource: false,
      sourceVersion: null,
      sourceVersionMatched: false,
      hasBinary: false,
      hasModel: false,
      hasVadModel: false,
      engine: 'whisper.cpp',
      model: WHISPER_MODEL_NAME,
      vadModel: WHISPER_VAD_MODEL_NAME,
      rootDir,
      reason: 'Automatic local whisper.cpp bootstrap is not supported on Windows yet',
    };
  }

  const hasSource = await pathExists(join(sourceDir, 'Makefile'));
  let sourceVersion: string | null = null;
  if (await pathExists(versionFilePath)) {
    try {
      sourceVersion = (await readFile(versionFilePath, 'utf8')).trim() || null;
    } catch {
      sourceVersion = null;
    }
  }
  const sourceVersionMatched = sourceVersion === WHISPER_CPP_VERSION;
  const binaryPath = hasSource && sourceVersionMatched ? await resolveWhisperBinary(sourceDir) : null;
  const hasBinary = Boolean(binaryPath);
  const hasModel = await pathExists(modelPath);
  const hasVadModel = await pathExists(vadModelPath);

  return {
    supported: true,
    ready: hasSource && sourceVersionMatched && hasBinary && hasModel && hasVadModel,
    hasSource,
    sourceVersion,
    sourceVersionMatched,
    hasBinary,
    hasModel,
    hasVadModel,
    engine: 'whisper.cpp',
    model: WHISPER_MODEL_NAME,
    vadModel: WHISPER_VAD_MODEL_NAME,
    rootDir,
  };
}

export async function ensureLocalTranscriptionBootstrap(): Promise<LocalTranscriptionBootstrapStatus> {
  await ensureWhisperAssets();
  return await getLocalTranscriptionBootstrapStatus();
}

function normalizeTranscript(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export async function transcribeLocalAudioFile(filePath: string, languageHint = 'auto'): Promise<LocalTranscriptionResult> {
  const safePath = String(filePath || '').trim();
  if (!safePath) {
    throw new Error('Audio file path is required');
  }
  if (!await pathExists(safePath)) {
    throw new Error(`Audio file not found: ${safePath}`);
  }
  const normalizedLanguage = (() => {
    const value = String(languageHint || 'auto').trim().toLowerCase();
    if (value === 'zh' || value === 'en' || value === 'ja') return value;
    return 'auto';
  })();
  logger.info(`[speech] Using language hint: ${normalizedLanguage}`);

  const startedAt = Date.now();
  const assets = await ensureWhisperAssets();
  const outputDir = join(assets.rootDir, 'transcripts');
  const outputBase = join(outputDir, `transcript-${crypto.randomUUID()}`);
  const outputTextPath = `${outputBase}.txt`;

  await mkdir(outputDir, { recursive: true });

  logger.info(`[speech] Transcribing audio file via whisper.cpp: ${safePath}`);

  const { stdout, stderr } = await runCommand(
    assets.binaryPath,
    [
      '-m',
      assets.modelPath,
      '--vad',
      '--vad-model',
      assets.vadModelPath,
      '-f',
      safePath,
      '-l',
      normalizedLanguage,
      '-otxt',
      '-of',
      outputBase,
      '-nt',
      '-np',
    ],
    { cwd: assets.sourceDir },
  );

  let text = '';
  if (await pathExists(outputTextPath)) {
    text = await readFile(outputTextPath, 'utf8');
  } else {
    text = stdout;
  }

  await rm(outputTextPath, { force: true }).catch(() => {});

  const normalized = normalizeTranscript(text);
  if (!normalized) {
    throw new Error((stderr || stdout || 'whisper.cpp returned an empty transcript').trim());
  }
  logger.info(`[speech] Transcription success (${normalized.length} chars): ${normalized.slice(0, 80)}`);

  return {
    text: normalized,
    engine: 'whisper.cpp',
    model: WHISPER_MODEL_NAME,
    language: normalizedLanguage,
    durationMs: Date.now() - startedAt,
  };
}
