const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// dev-only helper: store email in localStorage
export function getDevEmail() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("dev_email") || "test@example.com";
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const email = getDevEmail();

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (email) headers.set("X-User-Email", email);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail || JSON.stringify(body);
    } catch {}
    throw new Error(detail);
  }
  return res;
}
