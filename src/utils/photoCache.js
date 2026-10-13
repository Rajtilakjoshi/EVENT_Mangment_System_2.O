/**
 * Prefer Mongo-stored photo URLs; cache Firebase Storage lookups briefly.
 * Avoids a Storage round-trip on every scan (major delay on weak Wi‑Fi).
 */
const memory = new Map();
const TTL_MS = 30 * 60 * 1000;

export function getCachedPhotoUrl(token) {
  const row = memory.get(token);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    memory.delete(token);
    return null;
  }
  return row.url;
}

export function setCachedPhotoUrl(token, url) {
  if (!token || !url) return;
  memory.set(token, { url, at: Date.now() });
}

/**
 * Resolve guest photo without blocking the scan UI.
 * Order: Mongo photoUrl → memory cache → optional Storage fallback (async).
 */
export async function resolveGuestPhoto(user, storageFallback) {
  if (!user?.token) return "";
  if (user.photoUrl) {
    setCachedPhotoUrl(user.token, user.photoUrl);
    return user.photoUrl;
  }
  const cached = getCachedPhotoUrl(user.token);
  if (cached) return cached;
  if (typeof storageFallback !== "function") return "";
  try {
    const url = await storageFallback(
      user.token,
      user.name?.firstName || "",
      user.name?.lastName || ""
    );
    if (url) setCachedPhotoUrl(user.token, url);
    return url || "";
  } catch {
    return "";
  }
}
