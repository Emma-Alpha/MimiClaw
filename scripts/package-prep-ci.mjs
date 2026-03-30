#!/usr/bin/env zx

import 'zx/globals';
import { spawn } from 'node:child_process';

// When SKIP_VITE_BUILD=true the Vite output (dist/, dist-electron/) was
// restored from the Actions cache — skip the expensive rebuild.
const skipVite = process.env.SKIP_VITE_BUILD === 'true';

// When SKIP_BUNDLES=true the bundle outputs (build/openclaw, build/openclaw-plugins,
// build/preinstalled-skills) were restored from cache — skip the expensive copy.
const skipBundles = process.env.SKIP_BUNDLES === 'true';

const steps = [
  ...(skipVite   ? [] : ['pnpm run build:vite']),
  ...(skipBundles ? [] : [
    'pnpm exec zx scripts/bundle-openclaw.mjs',
    'pnpm exec zx scripts/bundle-openclaw-plugins.mjs',
    'pnpm exec zx scripts/bundle-preinstalled-skills.mjs',
  ]),
];

if (skipVite)    echo(chalk.green`✓ Vite dist restored from cache — skipping build:vite`);
if (skipBundles) echo(chalk.green`✓ Build bundles restored from cache — skipping bundle-openclaw / plugins / skills`);

const maxParallel = Math.max(1, Number(process.env.CI_PARALLELISM || '2'));

async function runStep(cmd) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, {
      shell: true,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} exited with code ${code}`));
      }
    });
  });
}

async function runWithConcurrency(items, limit, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

await runWithConcurrency(steps, maxParallel, async (cmd) => {
  echo(chalk.cyan`▶ ${cmd}`);
  await runStep(cmd);
});
