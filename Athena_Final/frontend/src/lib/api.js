import { normalizeResult } from "./contract";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, { method = "GET", body, token, signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    throw new ApiError(0, "Cannot reach the Athena backend. Is it running?");
  }
  if (res.status === 401) onUnauthorized?.();
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data;
}

export const api = {
  get: (path, token, signal) => request(path, { token, signal }),
  post: (path, body, token) => request(path, { method: "POST", body, token }),
};

/**
 * Poll an analysis until the backend reports completion.
 * Used by Run Analysis and the detail screen while status = processing.
 */
export async function pollAnalysis(id, token, { interval = 1600, timeout = 90000, onUpdate } = {}) {
  const t0 = Date.now();
  for (;;) {
    const normalized = normalizeResult(await api.get(`/analyses/${encodeURIComponent(id)}`, token));
    onUpdate?.(normalized);
    const s = (normalized?.status || "").toLowerCase();
    if (["complete", "completed", "failed", "error"].includes(s)) return normalized;
    if (Date.now() - t0 > timeout) {
      throw new ApiError(408, "Analysis is still running after the time limit. Check History shortly.");
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}