/**
 * Ultra-light file-backed JSON store.
 * For production, swap out for SQLite / Postgres via Drizzle ORM.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { AppStore } from './types.js';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const defaultStore: AppStore = {
  users: [],
  workspaces: [],
};

export function readStore(): AppStore {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    return structuredClone(defaultStore);
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as AppStore;
  } catch {
    return structuredClone(defaultStore);
  }
}

export function writeStore(data: AppStore): void {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function updateStore(updater: (data: AppStore) => void): AppStore {
  const data = readStore();
  updater(data);
  writeStore(data);
  return data;
}
