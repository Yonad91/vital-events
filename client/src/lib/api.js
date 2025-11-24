// src/lib/api.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const API_BASE_URL = API_BASE;
export function uploadsBaseUrl() {
  // Derive uploads base from API base by stripping trailing /api
  try {
    const u = new URL(API_BASE);
    const isApiSuffix = u.pathname.endsWith('/api');
    if (isApiSuffix) {
      u.pathname = u.pathname.replace(/\/api$/, '/uploads');
    } else {
      // fallback: same origin, /uploads path
      u.pathname = '/uploads';
    }
    return u.toString().replace(/\/$/, '');
  } catch {
    // If API_BASE isn't a valid URL, assume relative
    const base = API_BASE.replace(/\/?api$/, '');
    return `${base}/uploads`;
  }
}

/** Build auth headers from optional token */
export function authHeaders(token, isForm) {
  const h = {};
  if (!isForm) h["Content-Type"] = "application/json";
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Safe fetch with JSON + errors surfaced as exceptions */
export async function apiFetch(path, { method = "GET", token, body, isForm } = {}) {
  const headers = authHeaders(token, isForm);
  const opts = {
    method,
    headers,
  };
  if (body) {
    if (isForm) {
      opts.body = body;
      // Let browser set Content-Type for FormData
    } else {
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    let errorData;
    try {
      const text = await res.text();
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { message: text || res.statusText };
      }
    } catch {
      errorData = { message: res.statusText };
    }
    const error = new Error(errorData.message || `${res.status} ${res.statusText}`);
    error.response = { data: errorData, status: res.status, statusText: res.statusText };
    throw error;
  }
  // try json, fall back to text
  try {
    return await res.json();
  } catch {
    return null;
  }
}
