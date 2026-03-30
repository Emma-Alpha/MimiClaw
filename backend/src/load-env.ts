import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function resolveAppEnvName(value: string | undefined): 'development' | 'test' | 'production' | null {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'development' || normalized === 'dev' || normalized === 'local') {
    return 'development';
  }
  if (normalized === 'test' || normalized === 'testing' || normalized === 'stage' || normalized === 'staging') {
    return 'test';
  }
  if (normalized === 'production' || normalized === 'prod') {
    return 'production';
  }
  return null;
}

function getEnvFiles(): string[] {
  const appEnv = resolveAppEnvName(process.env.APP_ENV) ?? resolveAppEnvName(process.env.NODE_ENV);
  const backendRoot = path.resolve(process.cwd(), 'backend');
  const projectRoot = process.cwd();

  const candidates = [
    path.resolve(backendRoot, '.env'),
    path.resolve(backendRoot, '.env.local'),
    appEnv ? path.resolve(backendRoot, `.env.${appEnv}`) : null,
    appEnv ? path.resolve(backendRoot, `.env.${appEnv}.local`) : null,
    path.resolve(projectRoot, '.env'),
    path.resolve(projectRoot, '.env.local'),
    appEnv ? path.resolve(projectRoot, `.env.${appEnv}`) : null,
    appEnv ? path.resolve(projectRoot, `.env.${appEnv}.local`) : null,
  ];

  return candidates.filter((value): value is string => Boolean(value));
}

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
  for (const filePath of getEnvFiles()) {
    if (!existsSync(filePath)) continue;

    const parsed = parseEnvFile(readFileSync(filePath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] = value;
    }
  }
}

loadEnvFiles();
