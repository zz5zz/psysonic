const DB_NAME = 'psysonic-img-cache';
const STORE_NAME = 'images';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// In-memory map: cacheKey → object URL (avoids creating multiple object URLs per session)
const objectUrlCache = new Map<string, string>();

let db: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const database = (e.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = e => {
      db = (e.target as IDBOpenDBRequest).result;
      resolve(db!);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function getBlob(key: string): Promise<Blob | null> {
  try {
    const database = await openDB();
    return new Promise(resolve => {
      const req = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const entry = req.result;
        resolve(entry && Date.now() - entry.timestamp < MAX_AGE_MS ? entry.blob : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function putBlob(key: string, blob: Blob): Promise<void> {
  try {
    const database = await openDB();
    await new Promise<void>(resolve => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ key, blob, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore write errors
  }
}

/**
 * Returns a cached object URL for an image.
 * @param fetchUrl  The actual URL to fetch from (may contain ephemeral auth params).
 * @param cacheKey  A stable key that identifies the image across sessions.
 */
export async function getCachedUrl(fetchUrl: string, cacheKey: string): Promise<string> {
  if (!fetchUrl) return '';

  // 1. In-memory hit (same session)
  const existing = objectUrlCache.get(cacheKey);
  if (existing) return existing;

  // 2. IndexedDB hit (persisted from previous session)
  const blob = await getBlob(cacheKey);
  if (blob) {
    const objUrl = URL.createObjectURL(blob);
    objectUrlCache.set(cacheKey, objUrl);
    return objUrl;
  }

  // 3. Network fetch → store in IDB → return object URL
  try {
    const resp = await fetch(fetchUrl);
    if (!resp.ok) return fetchUrl;
    const newBlob = await resp.blob();
    putBlob(cacheKey, newBlob); // fire-and-forget
    const objUrl = URL.createObjectURL(newBlob);
    objectUrlCache.set(cacheKey, objUrl);
    return objUrl;
  } catch {
    return fetchUrl; // fallback: direct URL
  }
}
