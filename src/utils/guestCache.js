/**
 * Local IndexedDB Guest Store (2026 Production Edition)
 * Enables complete offline check-in and instantaneous scanning on congested event Wi-Fi.
 * - Soft cache kept for 12 hours for event day operations.
 * - Supports single-guest caching and bulk manifest preloading.
 */
import { CACHE_TTL_MS } from "./apiUtils";

const DB_NAME = "divine_event_2026";
const STORE = "guests";
const META = "meta";
const SOFT_TTL_MS = 12 * 60 * 60 * 1000; // 12h offline operation window

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "token" });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let resultValue = null;
    const req = fn(store);
    if (req && typeof req === "object" && "onsuccess" in req) {
      req.onsuccess = () => {
        resultValue = req.result;
      };
    }
    tx.oncomplete = () => resolve(resultValue !== null ? resultValue : req);
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheGuest(payload) {
  if (!payload?.user?.token) return;
  const record = {
    token: String(payload.user.token).trim(),
    user: payload.user,
    prasad: payload.prasad || payload.user.status || {},
    savedAt: Date.now(),
  };
  await withStore(STORE, "readwrite", (store) => store.put(record));
}

export async function bulkCacheGuests(guestList) {
  if (!Array.isArray(guestList) || guestList.length === 0) return 0;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    let count = 0;
    const now = Date.now();
    for (const g of guestList) {
      if (g && g.token) {
        store.put({
          token: String(g.token).trim(),
          user: g.user || g,
          prasad: g.prasad || g.status || {},
          savedAt: now,
        });
        count++;
      }
    }
    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedGuest(token) {
  if (!token) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(String(token).trim());
    req.onsuccess = () => {
      const row = req.result;
      if (!row) return resolve(null);
      const age = Date.now() - (row.savedAt || 0);
      if (age > SOFT_TTL_MS) return resolve(null);
      resolve({
        ...row,
        isStale: age > CACHE_TTL_MS,
        ageMs: age,
      });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function patchCachedStatus(token, statusPatch) {
  const existing = await getCachedGuest(token);
  if (!existing) return;
  await cacheGuest({
    user: existing.user,
    prasad: { ...(existing.prasad || {}), ...statusPatch },
  });
}
