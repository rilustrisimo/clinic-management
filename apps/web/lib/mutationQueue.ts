import { openDB, add, takeOldest } from './idb';

type Mutation = { id?: number; url: string; method: string; body?: unknown; headers?: Record<string, string> };
const DB_NAME = 'clinic-cache';
const STORE = 'mutations';

export async function getDB() {
  return openDB(DB_NAME, 1, (db) => {
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { autoIncrement: true });
  });
}

export async function enqueue(m: Mutation) {
  const db = await getDB();
  await add<Mutation>(db, STORE, m);
  tryNotifySW();
}

export async function dequeue(): Promise<Mutation | undefined> {
  const db = await getDB();
  return takeOldest<Mutation>(db, STORE);
}

function tryNotifySW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type: 'MUTATIONS_AVAILABLE' });
  }).catch(()=>{});
}
