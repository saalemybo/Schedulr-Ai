"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

export default function NewBusiness() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function suggestSlug(v: string) {
    return v
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/businesses", {
        method: "POST",
        body: JSON.stringify({ name, slug, timezone }),
      });
      const b = await res.json();
      router.push(`/app/${b.id}/services`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create business");
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>Create a business</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label>
          <div style={{ fontWeight: 600 }}>Business name</div>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(suggestSlug(e.target.value));
            }}
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
            required
          />
        </label>

        <label>
          <div style={{ fontWeight: 600 }}>Slug</div>
          <input
            value={slug}
            onChange={(e) => setSlug(suggestSlug(e.target.value))}
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
            required
          />
          <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
            Your public link will be <code>/b/{slug || "your-slug"}</code>
          </div>
        </label>

        <label>
          <div style={{ fontWeight: 600 }}>Timezone</div>
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <button disabled={loading} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc" }}>
          {loading ? "Creating..." : "Create business"}
        </button>
      </form>
    </main>
  );
}
