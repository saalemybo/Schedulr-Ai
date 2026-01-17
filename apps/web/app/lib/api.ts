import { getSession } from "next-auth/react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// dev-only helper: store email in localStorage
export function getDevEmail() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("dev_email");
}

async function getAuthEmail() {
  const session = await getSession();
  const sessionEmail = session?.user?.email ?? null;
  if (sessionEmail) return sessionEmail;

  // Only allow dev fallback in development
  if (process.env.NODE_ENV === "development") {
    return getDevEmail();
  }

  return null;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const email = await getAuthEmail();

  const headers = new Headers(init.headers);

  // Only set content-type when we're actually sending JSON
  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (email) headers.set("X-User-Email", email);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail || JSON.stringify(body);
    } catch {
      try {
        detail = await res.text();
      } catch {}
    }
    throw new Error(detail);
  }

  return res;
}
