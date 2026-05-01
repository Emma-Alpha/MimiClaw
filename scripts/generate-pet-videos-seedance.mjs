#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const RUN_ID = timestamp();

const DEFAULT_BASE_URL = 'https://aihub.gz4399.com';
const DEFAULT_URI = '/v1/rawproxy/seedance/v1/videos';
const DEFAULT_MODEL = 'doubao-seedance-2-0-fast-260128_4399';
const PETS_OUTPUT_DIR = path.join(PROJECT_ROOT, 'src', 'assets', 'pets');
const DEFAULT_RUN_DIR = path.join(PROJECT_ROOT, 'output', 'pets', `seedance-${RUN_ID}`);
const DEFAULT_WORK_DIR = path.join(DEFAULT_RUN_DIR, 'seedance');
const DEFAULT_OUTPUT_DIR = path.join(DEFAULT_RUN_DIR, 'webm');
const DEFAULT_BACKUP_DIR = path.join(tmpdir(), 'mimiclaw-pet-video-backups');

const CLIPS = [
  {
    name: 'begin',
    targetDuration: 8.574,
    fps: 30,
    action: 'The mascot pops gently into view, waves happily, then settles into a centered cheerful idle pose.',
  },
  {
    name: 'static',
    targetDuration: 8.308,
    fps: 30,
    action: 'A calm idle animation with soft breathing, tiny body bounce, and subtle antenna movement.',
  },
  {
    name: 'listening',
    targetDuration: 10.074,
    fps: 30,
    action: 'The mascot leans forward with curious attention, nodding lightly as if listening carefully.',
  },
  {
    name: 'sleep-start',
    targetDuration: 10.074,
    fps: 30,
    action: 'The mascot gradually becomes sleepy, slows down, lowers its head, and settles into a peaceful drowsy pose.',
  },
  {
    name: 'sleep-loop',
    targetDuration: 6.049,
    fps: 24,
    action: 'A peaceful sleeping idle loop with slow breathing, a small relaxed sway, and no large movement.',
  },
  {
    name: 'sleep-leave',
    targetDuration: 15.074,
    fps: 30,
    action: 'The mascot wakes up from a sleepy mood, stretches gently, brightens up, and returns to a cheerful awake pose.',
  },
  {
    name: 'task-start',
    targetDuration: 5.074,
    fps: 30,
    action: 'The mascot becomes energetic and focused, bouncing once with a determined working expression.',
  },
  {
    name: 'task-loop',
    targetDuration: 5.084,
    fps: 24,
    action: 'A focused working loop with rhythmic small bounces, bright eyes, and lively antenna movement.',
  },
  {
    name: 'task-leave',
    targetDuration: 8.908,
    fps: 30,
    action: 'The mascot relaxes after finishing work, gives a satisfied little bounce, then returns to calm idle.',
  },
];

function printHelp() {
  console.log(`Generate MimiClaw pet WebM clips with Seedance 2.0.

Usage:
  SEEDANCE_API_KEY=<token> pnpm run pets:seedance -- --image-url=<public_png_url>

Options:
  --image-url=<url>       Public image URL used as the Seedance reference image
  --model=<name>          Seedance model. Default: ${DEFAULT_MODEL}
  --base-url=<url>        API base URL. Default: ${DEFAULT_BASE_URL}
  --uri=<path>            API URI. Default: ${DEFAULT_URI}
  --out=<path>            Output WebM directory. Default: output/pets/seedance-<timestamp>/webm
  --replace               Write to src/assets/pets and overwrite the active videos
  --work-dir=<path>       MP4/manifest working directory. Default: output/pets/seedance-<timestamp>/seedance
  --resolution=<value>    480p or 720p. Default: 480p
  --aspect-ratio=<value>  Seedance aspect ratio. Default: 1:1
  --video-mode=<value>    Seedance video mode. Default: first_frame_to_video
  --canvas=<WxH>          Final WebM canvas. Default: 1024x1024
  --crf=<value>           VP9 quality. Lower is larger/better. Default: 34
  --key-color=<hex>       Chroma key background. Default: #0057ff
  --key-similarity=<n>    Chroma key similarity. Default: 0.18
  --key-blend=<n>         Chroma key blend. Default: 0.04
  --no-chroma-key         Keep the Seedance background instead of making alpha
  --poll-ms=<ms>          Poll interval. Default: 10000
  --timeout-ms=<ms>       Per-task timeout. Default: 1800000
  --concurrency=<n>       Task concurrency. Default: 1
  --no-backup             Do not back up existing .webm files before overwriting
  --dry-run               Print request payloads without calling the API
`);
}

function parseArgs(argv) {
  const options = {
    apiKey: process.env.SEEDANCE_API_KEY || process.env.AIHUB_API_KEY || process.env.API_KEY || '',
    baseUrl: process.env.SEEDANCE_BASE_URL || DEFAULT_BASE_URL,
    uri: DEFAULT_URI,
    model: DEFAULT_MODEL,
    imageUrl: '',
    outputDir: DEFAULT_OUTPUT_DIR,
    workDir: DEFAULT_WORK_DIR,
    backupDir: DEFAULT_BACKUP_DIR,
    resolution: '480p',
    aspectRatio: '1:1',
    videoMode: 'first_frame_to_video',
    canvas: '1024x1024',
    ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
    crf: 34,
    chromaKey: true,
    keyColor: '#0057ff',
    keySimilarity: 0.18,
    keyBlend: 0.04,
    pollMs: 10_000,
    timeoutMs: 30 * 60 * 1000,
    concurrency: 1,
    backup: true,
    dryRun: false,
    outProvided: false,
    replace: false,
  };

  for (const arg of argv) {
    if (arg === '--') {
      continue;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-backup') {
      options.backup = false;
    } else if (arg === '--replace') {
      options.replace = true;
    } else if (arg === '--no-chroma-key') {
      options.chromaKey = false;
    } else if (arg.startsWith('--image-url=')) {
      options.imageUrl = arg.slice('--image-url='.length);
    } else if (arg.startsWith('--model=')) {
      options.model = arg.slice('--model='.length);
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length);
    } else if (arg.startsWith('--uri=')) {
      options.uri = arg.slice('--uri='.length);
    } else if (arg.startsWith('--out=')) {
      options.outputDir = path.resolve(PROJECT_ROOT, arg.slice('--out='.length));
      options.outProvided = true;
    } else if (arg.startsWith('--work-dir=')) {
      options.workDir = path.resolve(PROJECT_ROOT, arg.slice('--work-dir='.length));
    } else if (arg.startsWith('--backup-dir=')) {
      options.backupDir = path.resolve(PROJECT_ROOT, arg.slice('--backup-dir='.length));
    } else if (arg.startsWith('--resolution=')) {
      options.resolution = arg.slice('--resolution='.length);
    } else if (arg.startsWith('--aspect-ratio=')) {
      options.aspectRatio = arg.slice('--aspect-ratio='.length);
    } else if (arg.startsWith('--video-mode=')) {
      options.videoMode = arg.slice('--video-mode='.length);
    } else if (arg.startsWith('--canvas=')) {
      options.canvas = arg.slice('--canvas='.length);
    } else if (arg.startsWith('--ffmpeg=')) {
      options.ffmpeg = arg.slice('--ffmpeg='.length);
    } else if (arg.startsWith('--crf=')) {
      options.crf = Number(arg.slice('--crf='.length));
    } else if (arg.startsWith('--key-color=')) {
      options.keyColor = arg.slice('--key-color='.length);
    } else if (arg.startsWith('--key-similarity=')) {
      options.keySimilarity = Number(arg.slice('--key-similarity='.length));
    } else if (arg.startsWith('--key-blend=')) {
      options.keyBlend = Number(arg.slice('--key-blend='.length));
    } else if (arg.startsWith('--poll-ms=')) {
      options.pollMs = Number(arg.slice('--poll-ms='.length));
    } else if (arg.startsWith('--timeout-ms=')) {
      options.timeoutMs = Number(arg.slice('--timeout-ms='.length));
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = Number(arg.slice('--concurrency='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.replace && !options.outProvided) {
    options.outputDir = PETS_OUTPUT_DIR;
  }

  return options;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

function parseCanvas(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value);
  if (!match) throw new Error(`Invalid --canvas value: ${value}. Use WxH, for example 1024x1024.`);

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid --canvas value: ${value}.`);
  }
  if (width % 2 !== 0 || height % 2 !== 0) {
    throw new Error('Final VP9 WebM dimensions must be even numbers.');
  }

  return { width, height };
}

function normalizeHexColor(value) {
  const normalized = value.trim().replace(/^#/, '').replace(/^0x/i, '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Invalid color: ${value}. Use #RRGGBB, for example #0057ff.`);
  }

  return `0x${normalized.toUpperCase()}`;
}

function assertReady(options) {
  if (!/^https?:\/\//i.test(options.imageUrl)) {
    throw new Error('Seedance needs a public image URL. Upload src/assets/mimiclaw-avatar.png first, then pass --image-url=<url>.');
  }
  if (!options.dryRun && !options.apiKey) {
    throw new Error('Missing API key. Set SEEDANCE_API_KEY or AIHUB_API_KEY in the environment.');
  }
  if (!['480p', '720p'].includes(options.resolution)) {
    throw new Error('--resolution must be 480p or 720p.');
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error('--concurrency must be a positive integer.');
  }
  if (!Number.isFinite(options.crf) || options.crf < 0 || options.crf > 63) {
    throw new Error('--crf must be a number between 0 and 63.');
  }
  if (!options.dryRun) {
    const probe = spawnSync(options.ffmpeg, ['-version'], { stdio: 'ignore' });
    if (probe.error || probe.status !== 0) {
      throw new Error('ffmpeg is not available. Install ffmpeg or pass --ffmpeg=/path/to/ffmpeg.');
    }
  }
}

function requestDurationFor(clip) {
  return Math.min(15, Math.max(4, Math.ceil(clip.targetDuration)));
}

function buildPrompt(clip, options) {
  const background = options.chromaKey
    ? `Use a perfectly flat pure chroma blue background (${options.keyColor}), no gradients, no floor, no shadow, no reflections.`
    : 'Use a simple clean background with no text and no extra objects.';

  return [
    'Use the provided image as the exact MimiClaw mascot design reference.',
    'Preserve the character identity, silhouette, green body color, eyes, mouth, cheeks, antenna, black outline, and sticker-like cartoon style.',
    'Keep one centered character only, full body visible, square composition, clean readable edges, no text, no watermark, no extra characters.',
    background,
    clip.action,
    'Stable character consistency across all frames, smooth motion, no camera shake, no cuts.',
  ].join(' ');
}

function buildPayload(clip, options) {
  return {
    model: options.model,
    prompt: buildPrompt(clip, options),
    images: [options.imageUrl],
    duration: requestDurationFor(clip),
    resolution: options.resolution,
    aspect_ratio: options.aspectRatio,
    video_mode: options.videoMode,
    metadata: {
      generate_audio: false,
    },
  };
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }

  return json;
}

async function createTask(clip, options) {
  const payload = buildPayload(clip, options);
  const url = new URL(options.uri, options.baseUrl).toString();

  const response = await requestJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const taskId = response?.task_id || response?.id;
  if (!taskId) {
    throw new Error(`Seedance did not return a task id for ${clip.name}.`);
  }

  return { payload, response, taskId };
}

async function pollTask(taskId, clip, options) {
  const url = new URL(`${options.uri.replace(/\/$/, '')}/${taskId}`, options.baseUrl).toString();
  const startedAt = Date.now();
  let lastStatus = '';

  while (Date.now() - startedAt < options.timeoutMs) {
    const response = await requestJson(url, {
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
      },
    });

    const status = response?.status || 'unknown';
    const progress = response?.progress ?? 0;
    if (status !== lastStatus) {
      console.log(`  ${clip.name}: ${status} (${progress}%)`);
      lastStatus = status;
    }

    if (status === 'completed') {
      const videoUrl = response?.metadata?.url;
      if (!videoUrl) throw new Error(`Seedance completed ${clip.name}, but metadata.url is missing.`);
      return response;
    }

    if (status === 'failed') {
      throw new Error(`Seedance failed ${clip.name}: ${JSON.stringify(response)}`);
    }

    await sleep(options.pollMs);
  }

  throw new Error(`Timed out waiting for ${clip.name} (${taskId}).`);
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

function backupExistingWebms(outputDir, backupParentDir) {
  if (!existsSync(outputDir)) return null;

  const files = readdirSync(outputDir).filter((file) => file.endsWith('.webm'));
  if (files.length === 0) return null;

  const backupDir = path.join(backupParentDir, timestamp());
  mkdirSync(backupDir, { recursive: true });
  for (const file of files) {
    cpSync(path.join(outputDir, file), path.join(backupDir, file));
  }

  return backupDir;
}

function isReplacingOriginal(outputDir) {
  return path.resolve(outputDir) === path.resolve(PETS_OUTPUT_DIR);
}

function buildFfmpegFilter(clip, options, canvas, keyColor) {
  const padSeconds = Math.max(2, Math.ceil(clip.targetDuration));
  const baseFilters = [
    `fps=${clip.fps}`,
    `scale=${canvas.width}:${canvas.height}:force_original_aspect_ratio=decrease`,
    `pad=${canvas.width}:${canvas.height}:(ow-iw)/2:(oh-ih)/2:color=${keyColor}`,
    `tpad=stop_mode=clone:stop_duration=${padSeconds}`,
    `trim=duration=${clip.targetDuration}`,
    'setpts=PTS-STARTPTS',
  ];

  if (!options.chromaKey) {
    return [...baseFilters, 'format=yuv420p'].join(',');
  }

  return [
    ...baseFilters,
    'format=rgba',
    `chromakey=${keyColor}:${options.keySimilarity}:${options.keyBlend}`,
    'format=yuva420p',
  ].join(',');
}

function convertToWebm(mp4Path, outputPath, clip, options, canvas, keyColor) {
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'warning',
    '-i',
    mp4Path,
    '-vf',
    buildFfmpegFilter(clip, options, canvas, keyColor),
    '-an',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    String(options.crf),
    '-deadline',
    'good',
    '-cpu-used',
    '4',
    '-row-mt',
    '1',
    '-auto-alt-ref',
    '0',
  ];

  if (options.chromaKey) {
    args.push('-metadata:s:v:0', 'alpha_mode=1');
  }

  args.push(outputPath);

  const result = spawnSync(options.ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    const stderr = result.stderr.toString().trim();
    throw new Error(`ffmpeg failed for ${clip.name}.webm\n${stderr}`);
  }
}

async function writeManifest(options, manifest) {
  await writeFile(path.join(options.workDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function runClip(clip, options, canvas, keyColor, manifest) {
  const mp4Path = path.join(options.workDir, `${clip.name}.mp4`);
  const webmPath = path.join(options.outputDir, `${clip.name}.webm`);

  console.log(`\n${clip.name}: submitting Seedance task`);
  const created = await createTask(clip, options);
  manifest.clips[clip.name] = {
    taskId: created.taskId,
    payload: created.payload,
    createResponse: created.response,
    targetDuration: clip.targetDuration,
    fps: clip.fps,
  };
  await writeManifest(options, manifest);

  const completed = await pollTask(created.taskId, clip, options);
  manifest.clips[clip.name].completedResponse = completed;
  await writeManifest(options, manifest);

  console.log(`  ${clip.name}: downloading mp4`);
  await downloadFile(completed.metadata.url, mp4Path);
  manifest.clips[clip.name].mp4Path = mp4Path;
  await writeManifest(options, manifest);

  console.log(`  ${clip.name}: converting to webm`);
  convertToWebm(mp4Path, webmPath, clip, options, canvas, keyColor);
  manifest.clips[clip.name].webmPath = webmPath;
  await writeManifest(options, manifest);
}

async function runQueue(items, concurrency, worker) {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  });

  await Promise.all(workers);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

try {
  const options = parseArgs(process.argv.slice(2));
  const canvas = parseCanvas(options.canvas);
  const keyColor = normalizeHexColor(options.keyColor);

  assertReady(options);

  console.log('Generating MimiClaw pet videos with Seedance');
  console.log(`  model:      ${options.model}`);
  console.log(`  image url:  ${options.imageUrl}`);
  console.log(`  output:     ${options.outputDir}`);
  console.log(`  work dir:   ${options.workDir}`);
  console.log(`  mode:       ${isReplacingOriginal(options.outputDir) ? 'replace active pet videos' : 'preview only'}`);
  console.log(`  resolution: ${options.resolution}`);
  console.log(`  chroma key: ${options.chromaKey ? keyColor : 'off'}`);

  if (options.dryRun) {
    for (const clip of CLIPS) {
      console.log(`\n[dry-run] ${clip.name}.webm`);
      console.log(JSON.stringify(buildPayload(clip, options), null, 2));
    }
    process.exit(0);
  }

  mkdirSync(options.outputDir, { recursive: true });
  mkdirSync(options.workDir, { recursive: true });

  if (options.backup && isReplacingOriginal(options.outputDir)) {
    const backupDir = backupExistingWebms(options.outputDir, options.backupDir);
    if (backupDir) console.log(`  backup:     ${backupDir}`);
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    model: options.model,
    imageUrl: options.imageUrl,
    outputDir: options.outputDir,
    workDir: options.workDir,
    clips: {},
  };
  await writeManifest(options, manifest);

  await runQueue(CLIPS, options.concurrency, async (clip) => {
    await runClip(clip, options, canvas, keyColor, manifest);
  });

  console.log('\nDone. Generated WebM files:');
  for (const clip of CLIPS) {
    console.log(`  ${path.join(options.outputDir, `${clip.name}.webm`)}`);
  }
  console.log(`\nSeedance MP4 files and manifest: ${options.workDir}`);
  if (!isReplacingOriginal(options.outputDir)) {
    console.log('Preview only. Re-run with --replace when you are ready to overwrite src/assets/pets.');
  }
} catch (error) {
  console.error(`\nError: ${error.message}`);
  process.exit(1);
}
