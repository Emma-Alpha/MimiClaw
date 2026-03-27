import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ENV_FILES = [
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), 'backend/.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
];

function stripOuterQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function parseEnvFile(source: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separator = normalized.indexOf('=');
    if (separator <= 0) continue;

    const key = normalized.slice(0, separator).trim();
    const value = stripOuterQuotes(normalized.slice(separator + 1).trim());
    if (!key) continue;

    result[key] = value;
  }

  return result;
}

function loadEnvFiles(): void {
  for (const filePath of ENV_FILES) {
    if (!existsSync(filePath)) continue;

    const parsed = parseEnvFile(readFileSync(filePath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] = value;
    }
  }
}

loadEnvFiles();
