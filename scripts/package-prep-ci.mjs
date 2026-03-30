#!/usr/bin/env zx

import 'zx/globals';
import { spawn } from 'node:child_process';

// When SKIP_VITE_BUILD=true the Vite output (dist/, dist-electron/) was
// restored from the Actions cache — skip the expensive rebuild.
const skipVite = process.env.SKIP_VITE_BUILD === 'true';

const steps = [
  ...(skipVite ? [] : ['pnpm run build:vite']),
];

if (skipVite) echo(chalk.green`✓ Vite dist restored from cache — skipping build:vite`);

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
