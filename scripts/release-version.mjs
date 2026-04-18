#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import path from 'node:path';

import semver from 'semver';

import pkg from '../package.json' with { type: 'json' };

const VALID_KINDS = ['patch', 'minor', 'major'];
const kindArg = process.argv[2]?.trim().toLowerCase();

function resolveKind(raw) {
  if (!raw) return null;
  if (VALID_KINDS.includes(raw)) return raw;
  if (raw === '1') return 'patch';
  if (raw === '2') return 'minor';
  if (raw === '3') return 'major';
  return null;
}

function printPreview(currentVersion) {
  stdout.write(`当前版本: v${currentVersion}\n`);
  stdout.write(`1. patch  -> v${semver.inc(currentVersion, 'patch')}\n`);
  stdout.write(`2. minor  -> v${semver.inc(currentVersion, 'minor')}\n`);
  stdout.write(`3. major  -> v${semver.inc(currentVersion, 'major')}\n`);
}

async function selectKindInteractively() {
  const currentVersion = pkg.version;

  printPreview(currentVersion);

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const answer = await rl.question('\n请选择发版粒度 (1/2/3 or patch/minor/major): ');
    const selected = resolveKind(answer.trim().toLowerCase());

    if (!selected) {
      stdout.write('未识别的版本粒度，已取消。\n');
      return null;
    }

    const nextVersion = semver.inc(currentVersion, selected);
    const confirmed = await rl.question(`确认将版本从 v${currentVersion} 升级到 v${nextVersion}? (y/N): `);

    if (!/^y(es)?$/i.test(confirmed.trim())) {
      stdout.write('已取消版本升级。\n');
      return null;
    }

    return selected;
  } finally {
    rl.close();
  }
}

async function main() {
  const selectedKind = resolveKind(kindArg) ?? await selectKindInteractively();
  if (!selectedKind) return;
  const scriptPath = path.join(import.meta.dirname, 'npm-version.mjs');

  execFileSync(process.execPath, [scriptPath, selectedKind], {
    stdio: 'inherit',
  });
}

void main();
