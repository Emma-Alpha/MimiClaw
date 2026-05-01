#!/usr/bin/env zx

import 'zx/globals';

function parseArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : '';
}

const mode = parseArg('mode') || 'production';
const platform = parseArg('platform');

if (!['production', 'test'].includes(mode)) {
  echo(chalk.red(`Unsupported mode "${mode}". Expected "production" or "test".`));
  process.exit(1);
}

if (platform && !['mac', 'win', 'linux'].includes(platform)) {
  echo(chalk.red(`Unsupported platform "${platform}". Expected "mac", "win", or "linux".`));
  process.exit(1);
}

const env = {
  ...process.env,
  VITE_MIMICLAW_CLOUD_ONLY: '1',
};

echo(chalk.cyan(`▶ Building cloud-only package (mode=${mode}${platform ? `, platform=${platform}` : ''})`));

await $({ env })`pnpm exec vite build --mode ${mode}`;

const builderArgs = ['pnpm', 'exec', 'electron-builder', '--publish', 'never', '--config', 'electron-builder.cloud.yml'];
if (platform) {
  await $({ env })`pnpm exec electron-builder --publish never --config electron-builder.cloud.yml --${platform}`;
} else {
  await $({ env })`pnpm exec electron-builder --publish never --config electron-builder.cloud.yml`;
}
