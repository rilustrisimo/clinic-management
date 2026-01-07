import { openDB, get, put } from './idb';

type Entry = { key: string; value: string; ts: number };
const DB_NAME = 'clinic-cache';
const STORE = 'queries';

export async function getDB() {
  return openDB(DB_NAME, 1, (db) => {
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
  });
}

export async function cacheQuery<T>(key: string, value: T, ttlMs = DEFAULT_TTL) {
  const db = await getDB();
  await put<Entry>(db, STORE, key, { key, value: JSON.stringify(value), ts: Date.now() + ttlMs });
}

export async function getCachedQuery<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const entry = await get<Entry>(db, STORE, key);
  if (!entry) return undefined;
  if (Date.now() > entry.ts) return undefined;
  try { return JSON.parse(entry.value) as T; } catch { return undefined; }
}

export const DEFAULT_TTL = 60_000; // 1 minute
export function keyOf(name: string, ...parts: (string|number|boolean|null|undefined)[]) {
  return `${name}:${parts.map((p)=>String(p)).join('|')}`;
}
