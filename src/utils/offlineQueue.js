/**
 * Optimistic Offline Mutation Queue (2026 Production Edition)
 * Queues scans safely during internet cuts at entry/prasad gates.
 * Features:
 * - Idempotent sync replay.
 * - Prevents infinite loops on non-retryable 4xx errors.
 * - Auto-sync upon network reconnection.
 */

const KEY = "divine_outbox_2026";

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to write offline queue:", e);
  }
}

export function enqueueMutation(action) {
  const items = readQueue();
  const entryId = `${action.token}_${action.type}_${Date.now()}`;
  // Avoid duplicate queueing of the same token & action
  const alreadyQueued = items.some(
    (it) => it.token === action.token && it.type === action.type
  );
  if (!alreadyQueued) {
    items.push({
      id: entryId,
      createdAt: Date.now(),
      retryCount: 0,
      ...action,
    });
    writeQueue(items);
  }
  return items.length;
}

export function getPendingCount() {
  return readQueue().length;
}

export async function flushQueue(apiFetch) {
  const items = readQueue();
  if (!items.length) return { flushed: 0, remaining: 0 };

  const remaining = [];
  let flushed = 0;

  for (const item of items) {
    try {
      let path;
      let body;
      if (item.type === "entry") {
        path = "/api/checkin";
        body = { token: item.token, gate: "entry" };
      } else if (item.type === "prasad") {
        path = "/api/checkin";
        body = { token: item.token, gate: item.prasadType || "prasad1" };
      } else {
        // Unknown action type, discard safely
        continue;
      }

      const res = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      // Success or already checked in -> Consider flushed
      if (res.ok && data.success) {
        flushed += 1;
      } else if (res.status === 404 || res.status === 400) {
        // Permanent client error (invalid badge) -> Discard to avoid blocking queue
        console.warn(`Offline item ${item.token} discarded due to server error:`, data.message);
        flushed += 1;
      } else {
        // Server or network error -> Retain for next retry
        item.retryCount = (item.retryCount || 0) + 1;
        remaining.push(item);
      }
    } catch {
      item.retryCount = (item.retryCount || 0) + 1;
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}

export function startOnlineFlush(apiFetch) {
  let isFlushing = false;

  const run = async () => {
    if (!navigator.onLine || isFlushing) return;
    try {
      isFlushing = true;
      await flushQueue(apiFetch);
    } finally {
      isFlushing = false;
    }
  };

  window.addEventListener("online", run);
  const timer = setInterval(run, 10_000);
  run();

  return () => {
    window.removeEventListener("online", run);
    clearInterval(timer);
  };
}
