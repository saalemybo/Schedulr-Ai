"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useSession, signIn } from "next-auth/react";
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
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default function OwnerHome() {
  const { status } = useSession();
  const authed = status === "authenticated";

  const [items, setItems] = useState<MeBusiness[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!authed) return;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await apiFetch("/me/businesses");
        const data = (await readJsonOrThrow(res)) as MeBusiness[];

        // If you want "empty state" instead of auto-redirect, remove this block.
        // If you still like auto-redirect to the create page, keep it.
        if (data.length === 0) {
          // Option A: show empty state (recommended UX)
          setItems([]);
          return;

          // Option B: auto-redirect to create page
          // router.replace("/dashboard/new");
          // return;
        }

        setItems(data);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load businesses");
      } finally {
        setLoading(false);
      }
    })();
  }, [authed, router]);

  // While NextAuth is initializing, render nothing (or a spinner)
  if (status === "loading") {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <p>Loading…</p>
      </main>
    );
  }

  // If not signed in, show login CTA
  if (!authed) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Owner Dashboard</h1>
        <p style={{ marginTop: 12, color: "#555" }}>
          Please sign in to view your businesses.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc" }}
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Owner Dashboard</h1>

      <div style={{ marginTop: 18 }}>
        <Link
          href="/dashboard/new"
          style={{
            display: "inline-block",
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        >
          + Create a business
        </Link>
      </div>

      {err && <p style={{ color: "crimson", marginTop: 16 }}>{err}</p>}

      <div style={{ marginTop: 18 }}>
        {loading ? (
          <p>Loading businesses…</p>
        ) : items.length === 0 ? (
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
