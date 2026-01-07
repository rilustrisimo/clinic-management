// Minimal IndexedDB helpers without external deps
export function openDB(name: string, version: number, upgrade: (db: IDBDatabase, oldVersion: number) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (event) => upgrade(req.result, (event.target as IDBOpenDBRequest).result.version || 0);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put<T>(db: IDBDatabase, store: string, key: IDBValidKey, value: T) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(store).put(value as unknown as IDBValidKey extends never ? never : T, key);
  });
}

export async function get<T=unknown>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function add<T>(db: IDBDatabase, store: string, value: T): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(value as unknown as IDBValidKey extends never ? never : T);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function takeOldest<T=unknown>(db: IDBDatabase, store: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const req = os.openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) return resolve(undefined);
      const val = cur.value as T;
      cur.delete();
      resolve(val);
    };
    req.onerror = () => reject(req.error);
  });
}
