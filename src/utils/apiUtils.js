/** API base + helpers tuned for slow venue Wi‑Fi */

let apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000";
if (apiBase.includes(":8080")) {
  apiBase = apiBase.replace(":8080", ":5000");
}
apiBase = apiBase.replace(/\/+$/, "");
apiBase = apiBase.replace(/\/api$/, "");
export const API_BASE_URL = apiBase;

export const STATS_REFRESH_MS = 10_000;
export const CACHE_TTL_MS = 10_000;
export const FETCH_TIMEOUT_MS = 8_000;

export async function apiFetch(path, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/** One round-trip scan lookup */
export async function scanGuest(token) {
  const response = await apiFetch(`/api/scan/${encodeURIComponent(token)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, message: data.message || "User not found", status: response.status };
  }
  return data;
}

/** Single-trip atomic check-in (lookup + validation + check-in status update) */
export async function fastCheckin(token, gate = "entry") {
  const response = await apiFetch("/api/checkin", {
    method: "POST",
    body: JSON.stringify({ token, gate }),
  });
  const data = await response.json().catch(() => ({}));
  return { ...data, status: response.status, ok: response.ok };
}

export async function getEventStats() {
  const response = await apiFetch("/api/stats");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, message: data.message || "Failed to load stats" };
  }
  return data;
}

export async function getAllGuests() {
  const response = await apiFetch("/api/guests");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, message: data.message || "Failed to load guests", guests: [] };
  }
  return data;
}

export async function getTokenSeriesInfo() {
  const response = await apiFetch("/api/token-series");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, message: data.message || "Failed to load token series info" };
  }
  return data;
}

export async function batchUploadGuests(guests, uploaderName) {
  const response = await apiFetch("/api/guests/batch", {
    method: "POST",
    body: JSON.stringify({ guests, uploaderName }),
  });
  const data = await response.json().catch(() => ({}));
  return { ...data, status: response.status, ok: response.ok };
}

export const updateSheet = async () => {
  try {
    const response = await apiFetch("/api/update-sheet", { method: "POST" }, 60_000);
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.success) {
      return { success: true, message: data.message || "Sheet updated successfully!", data };
    }
    return { success: false, message: data.message || "Failed to update the sheet." };
  } catch (error) {
    console.error("Error updating sheet:", error);
    return { success: false, message: "Error syncing sheet (check network / Sheets config)." };
  }
};
