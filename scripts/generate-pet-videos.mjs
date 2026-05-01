#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, cpSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const DEFAULT_INPUT = path.join(PROJECT_ROOT, 'src', 'assets', 'mimiclaw-avatar.png');
const PETS_OUTPUT_DIR = path.join(PROJECT_ROOT, 'src', 'assets', 'pets');
const DEFAULT_OUTPUT_DIR = path.join(PROJECT_ROOT, 'output', 'pets', `local-${timestamp()}`);
const DEFAULT_CANVAS = '1024x1024';
const DEFAULT_LOGO_SIZE = 760;

const CLIPS = [
  {
    name: 'begin',
    duration: 8.574,
    fps: 30,
    scale: '0.66+0.34*(1-exp(-3.2*t))+0.035*sin(10*t)*exp(-1.8*t)',
    y: '-18*exp(-2*t)+8*sin(2*PI*t/2.8)*exp(-1.2*t)',
    angle: '0.08*sin(8*t)*exp(-1.4*t)',
    fadeIn: 0.35,
  },
  {
    name: 'static',
    duration: 8.308,
    fps: 30,
    scale: '1+0.018*sin(2*PI*t/2.8)',
    y: '8*sin(2*PI*t/2.8)',
    angle: '0.015*sin(2*PI*t/4.4)',
  },
  {
    name: 'listening',
    duration: 10.074,
    fps: 30,
    scale: '1+0.052*sin(2*PI*t/0.9)',
    y: '5*sin(2*PI*t/1.1)',
    angle: '0.025*sin(2*PI*t/1.6)',
  },
  {
    name: 'sleep-start',
    duration: 10.074,
    fps: 30,
    scale: '1-0.10*(1-exp(-0.7*t))+0.012*sin(2*PI*t/2.2)',
    y: '24*(1-exp(-0.7*t))+4*sin(2*PI*t/2.7)',
    angle: '-0.08*(1-exp(-0.7*t))+0.01*sin(2*PI*t/3.2)',
  },
  {
    name: 'sleep-loop',
    duration: 6.049,
    fps: 24,
    scale: '0.90+0.015*sin(2*PI*t/3.4)',
    y: '22+5*sin(2*PI*t/3.4)',
    angle: '-0.08+0.012*sin(2*PI*t/4.2)',
  },
  {
    name: 'sleep-leave',
    duration: 15.074,
    fps: 30,
    scale: '0.90+0.10*(1-exp(-1.2*t))+0.03*sin(8*t)*exp(-1.1*t)',
    y: '22*exp(-1.2*t)',
    angle: '-0.08*exp(-1.2*t)+0.04*sin(6*t)*exp(-1.5*t)',
  },
  {
    name: 'task-start',
    duration: 5.074,
    fps: 30,
    scale: '0.96+0.08*sin(2*PI*t/0.55)*exp(-0.25*t)',
    y: '-8*sin(2*PI*t/0.55)*exp(-0.2*t)',
    angle: '0.06*sin(2*PI*t/0.45)*exp(-0.2*t)',
  },
  {
    name: 'task-loop',
    duration: 5.084,
    fps: 24,
    scale: '1+0.035*sin(2*PI*t/0.8)',
    y: '-6*sin(2*PI*t/0.8)',
    angle: '0.045*sin(2*PI*t/0.7)',
  },
  {
    name: 'task-leave',
    duration: 8.908,
    fps: 30,
    scale: '1+0.035*sin(2*PI*t/1.0)*exp(-0.65*t)',
    y: '4*(1-exp(-0.9*t))',
    angle: '0.05*sin(2*PI*t/0.8)*exp(-0.6*t)',
  },
];

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    outputDir: DEFAULT_OUTPUT_DIR,
    canvas: DEFAULT_CANVAS,
    logoSize: DEFAULT_LOGO_SIZE,
    ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
    backupDir: path.join(tmpdir(), 'mimiclaw-pet-video-backups'),
    backup: true,
    dryRun: false,
    outProvided: false,
    replace: false,
  };

  for (const arg of argv) {
    if (arg === '--') {
      continue;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-backup') {
      options.backup = false;
    } else if (arg === '--replace') {
      options.replace = true;
    } else if (arg.startsWith('--input=')) {
      options.input = path.resolve(PROJECT_ROOT, arg.slice('--input='.length));
    } else if (arg.startsWith('--out=')) {
      options.outputDir = path.resolve(PROJECT_ROOT, arg.slice('--out='.length));
      options.outProvided = true;
    } else if (arg.startsWith('--canvas=')) {
      options.canvas = arg.slice('--canvas='.length);
    } else if (arg.startsWith('--logo-size=')) {
      options.logoSize = Number(arg.slice('--logo-size='.length));
    } else if (arg.startsWith('--ffmpeg=')) {
      options.ffmpeg = arg.slice('--ffmpeg='.length);
    } else if (arg.startsWith('--backup-dir=')) {
      options.backupDir = path.resolve(PROJECT_ROOT, arg.slice('--backup-dir='.length));
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.replace && !options.outProvided) {
    options.outputDir = PETS_OUTPUT_DIR;
  }

  return options;
}

function printHelp() {
  console.log(`Generate MimiClaw floating-pet WebM clips from a logo/avatar PNG.

Usage:
  node scripts/generate-pet-videos.mjs [options]

Options:
  --input=<path>       Source PNG. Default: src/assets/mimiclaw-avatar.png
  --out=<path>         Output directory. Default: output/pets/local-<timestamp>
  --replace            Write to src/assets/pets and overwrite the active videos
  --canvas=<WxH>       Video canvas size. Default: 1024x1024
  --logo-size=<px>     Base logo size on the canvas. Default: 760
  --ffmpeg=<path>      ffmpeg binary. Default: ffmpeg or FFMPEG_PATH
  --backup-dir=<path>  Backup parent directory. Default: OS temp directory
  --no-backup          Do not back up existing .webm files before overwriting
  --dry-run            Print planned outputs without running ffmpeg
`);
}

function parseCanvas(canvas) {
  const match = /^(\d+)x(\d+)$/i.exec(canvas);
  if (!match) throw new Error(`Invalid --canvas value: ${canvas}. Use WxH, for example 1024x1024.`);

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid --canvas value: ${canvas}.`);
  }
  if (width % 2 !== 0 || height % 2 !== 0) {
    throw new Error('WebM VP9 alpha output needs even canvas dimensions.');
  }

  return { width, height };
}

function assertReady(options) {
  if (!existsSync(options.input)) {
    throw new Error(`Input PNG not found: ${options.input}`);
  }
  if (!Number.isFinite(options.logoSize) || options.logoSize <= 0) {
    throw new Error(`Invalid --logo-size value: ${options.logoSize}`);
  }

  const probe = spawnSync(options.ffmpeg, ['-version'], { stdio: 'ignore' });
  if (probe.error || probe.status !== 0) {
    throw new Error(`ffmpeg is not available. Install ffmpeg or pass --ffmpeg=/path/to/ffmpeg.`);
  }
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

function buildFilter({ clip, width, height, logoSize }) {
  const sizeExpr = `${logoSize}*(${clip.scale})`;
  const yExpr = `(H-h)/2+(${clip.y ?? '0'})`;
  const xExpr = `(W-w)/2+(${clip.x ?? '0'})`;
  const fade = clip.fadeIn ? `,fade=t=in:st=0:d=${clip.fadeIn}:alpha=1` : '';

  return [
    `color=c=black@0.0:s=${width}x${height}:r=${clip.fps}:d=${clip.duration},format=rgba[canvas]`,
    `[0:v]format=rgba,scale=w='${sizeExpr}':h='${sizeExpr}':eval=frame,rotate='${clip.angle ?? '0'}':c=black@0:ow=rotw(iw):oh=roth(ih),format=rgba${fade}[logo]`,
    `[canvas][logo]overlay=x='${xExpr}':y='${yExpr}':format=auto,format=yuva420p[v]`,
  ].join(';');
}

function renderClip(options, canvas, clip) {
  const output = path.join(options.outputDir, `${clip.name}.webm`);
  const filter = buildFilter({
    clip,
    width: canvas.width,
    height: canvas.height,
    logoSize: options.logoSize,
  });

  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'warning',
    '-loop',
    '1',
    '-framerate',
    String(clip.fps),
    '-i',
    options.input,
    '-t',
    String(clip.duration),
    '-filter_complex',
    filter,
    '-map',
    '[v]',
    '-an',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '34',
    '-deadline',
    'good',
    '-cpu-used',
    '4',
    '-row-mt',
    '1',
    '-auto-alt-ref',
    '0',
    '-metadata:s:v:0',
    'alpha_mode=1',
    output,
  ];

  if (options.dryRun) {
    console.log(`[dry-run] ${clip.name}.webm -> ${output}`);
    return;
  }

  process.stdout.write(`Rendering ${clip.name}.webm... `);
  const result = spawnSync(options.ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    const stderr = result.stderr.toString().trim();
    throw new Error(`ffmpeg failed for ${clip.name}.webm\n${stderr}`);
  }
  console.log('done');
}

try {
  const options = parseArgs(process.argv.slice(2));
  const canvas = parseCanvas(options.canvas);

  assertReady(options);
  mkdirSync(options.outputDir, { recursive: true });

  console.log('Generating MimiClaw pet videos');
  console.log(`  input:     ${options.input}`);
  console.log(`  output:    ${options.outputDir}`);
  console.log(`  mode:      ${isReplacingOriginal(options.outputDir) ? 'replace active pet videos' : 'preview only'}`);
  console.log(`  canvas:    ${canvas.width}x${canvas.height}`);
  console.log(`  logo size: ${options.logoSize}px`);

  if (options.backup && !options.dryRun && isReplacingOriginal(options.outputDir)) {
    const backupDir = backupExistingWebms(options.outputDir, options.backupDir);
    if (backupDir) console.log(`  backup:    ${backupDir}`);
  }

  for (const clip of CLIPS) {
    renderClip(options, canvas, clip);
  }

  console.log('\nDone. Generated files:');
  for (const clip of CLIPS) {
    console.log(`  ${path.join(options.outputDir, `${clip.name}.webm`)}`);
  }

  if (!isReplacingOriginal(options.outputDir)) {
    console.log('\nPreview only. Re-run with --replace when you are ready to overwrite src/assets/pets.');
  }
} catch (error) {
  console.error(`\nError: ${error.message}`);
  process.exit(1);
}
