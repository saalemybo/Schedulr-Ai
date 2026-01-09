"use client";

import { useEffect, useMemo, useState } from "react";

type Appointment = {
  id: number;
  business_id: number;
  service_id: number;
  customer_name: string;
  customer_email: string;
  start_at: string;
  end_at: string;
  status: string;
  google_event_id?: string | null;
};

function isoDayRange(dateStr: string) {
  // dateStr = YYYY-MM-DD
  // For MVP: assume America/Los_Angeles offset -08:00 (good enough for demo).
  // Later we’ll fetch business timezone and do this properly.
  const start = `${dateStr}T00:00:00-08:00`;
  const endDate = new Date(`${dateStr}T00:00:00-08:00`);
  endDate.setDate(endDate.getDate() + 1);
  const y = endDate.getFullYear();
  const m = String(endDate.getMonth() + 1).padStart(2, "0");
  const d = String(endDate.getDate()).padStart(2, "0");
  const end = `${y}-${m}-${d}T00:00:00-08:00`;
  return { start, end };
}

export default function AdminClient({ slug }: { slug: string }) {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

  const [date, setDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const { start, end } = useMemo(() => isoDayRange(date), [date]);

  useEffect(() => {
    setLoading(true);
    fetch(`${base}/businesses/${slug}/appointments?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
      cache: "no-store",
    })
      .then(async (res) => (res.ok ? res.json() : []))
      .then(setAppts)
      .finally(() => setLoading(false));
  }, [base, slug, start, end]);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <div className="text-gray-600 font-mono mt-1">{slug}</div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">View date</div>
            <input
              type="date"
              className="border rounded p-2 mt-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <section className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Appointments</h2>
            <div className="text-sm text-gray-600">
              {loading ? "Loading..." : `${appts.length} booking(s)`}
            </div>
          </div>

          {appts.length === 0 && !loading ? (
            <p className="mt-3 text-gray-500">No appointments for this day.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {appts.map((a) => (
                <li key={a.id} className="rounded border p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{a.customer_name}</div>
                      <div className="text-sm text-gray-600">{a.customer_email}</div>
                    </div>
                    <div className="text-sm font-mono text-right">
                      <div>{a.start_at}</div>
                      <div className="text-gray-600">{a.status}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold">Metrics</h2>
          <div className="mt-2 text-gray-600 text-sm">
            (MVP) Bookings/day, peak hours, cancellations/no-shows come next.
          </div>
        </section>
      </div>
    </main>
  );
}
