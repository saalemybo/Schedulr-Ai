"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getDevEmail } from "../lib/api";
import { useRouter } from "next/navigation";

type MeBusiness = {
  id: number;
  name: string;
  slug: string;
  timezone: string;
  created_at: string;
  role: string;
};

async function readJsonOrThrow(res: Response) {
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default function OwnerHome() {
  const [items, setItems] = useState<MeBusiness[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState<string>(getDevEmail() ?? "test@example.com");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/me/businesses");
        const data = (await readJsonOrThrow(res)) as MeBusiness[];
        setItems(data);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load businesses");
      }
    })();
  }, []);

  function saveEmail() {
    window.localStorage.setItem("dev_email", email);
    window.location.reload();
  }

  // need to fix so no loops happen
  /* when only one business, go straight to that business dashboard else list all businesses
  const router = useRouter();
  useEffect(() => {
    if (items.length === 1) router.push(`/dashboard/${items[0].id}`);
  }, [items]); */


  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Owner Dashboard</h1>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Dev Login (header-based)</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1, padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
          <button onClick={saveEmail} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc" }}>
            Use email
          </button>
        </div>
        <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
          This sets <code>X-User-Email</code> for API calls during development.
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Link href="/dashboard/new" style={{ display: "inline-block", padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8 }}>
          + Create a business
        </Link>
      </div>

      {err && <p style={{ color: "crimson", marginTop: 16 }}>{err}</p>}

      <div style={{ marginTop: 18 }}>
        {items.length === 0 ? (
          <p>No businesses yet. Click “Create a business”.</p>
        ) : (
          <ul style={{ marginTop: 10, display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
            {items.map((b) => (
            <li key={b.id} className="rounded border p-4 hover:bg-gray-50">
              <Link href={`/dashboard/${b.id}`} className="block">
                <div className="font-bold">{b.name}</div>
                <div className="text-sm text-gray-600">
                  slug: <code>{b.slug}</code> • role: <b>{b.role}</b>
                </div>
              </Link>

              <div className="mt-2 flex gap-3 text-sm">
                <Link href={`/dashboard/${b.id}/services`} className="underline">Services</Link>
                <Link href={`/dashboard/${b.id}/hours`} className="underline">Hours</Link>
                <Link href={`/b/${b.slug}`} target="_blank" className="underline">Public</Link>
              </div>
            </li>
          ))}
          </ul>
        )}
      </div>
    </main>
  );
}
