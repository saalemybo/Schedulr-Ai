"use client";

import { useEffect, useMemo, useState } from "react";
import DatePicker from "@/components/DatePicker";

type Appointment = {
  id: number;
  business_id: number;
  service_id: number;
  customer_name: string;
  customer_email: string;
  start_at: string;
  end_at: string;
  status: string;
};

function isoDayRange(dateStr: string) {
  const start = `${dateStr}T00:00:00-08:00`;
  const endDate = new Date(`${dateStr}T00:00:00-08:00`);
  endDate.setDate(endDate.getDate() + 1);
  const y = endDate.getFullYear();
  const m = String(endDate.getMonth() + 1).padStart(2, "0");
  const d = String(endDate.getDate()).padStart(2, "0");
  const end = `${y}-${m}-${d}T00:00:00-08:00`;
  return { start, end };
}

export default function DashboardClient({businessId
}: {
  businessId: string;
}) {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const { start, end } = useMemo(() => isoDayRange(date), [date]);

  useEffect(() => {
    if(!businessId) return;
    
    const email =
      localStorage.getItem("dev_email") ?? "test@example.com";

    setLoading(true);

    fetch(
      `${base}/businesses/${businessId}/appointments?start=${encodeURIComponent(
        start
      )}&end=${encodeURIComponent(end)}`,
      {
        headers: { "X-User-Email": email },
        cache: "no-store",
      }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(setAppts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [base, businessId, start, end]);

  // service and appointments
  type Service = { id: number; business_id: number; name: string; duration_min: number };
  type Availability = { id: number; business_id: number; day_of_week: string; open_time: string; close_time: string };

  type AvailabilityApi = { id: number; business_id: number; day_of_week: string; open_time: string; close_time: string };

  type HoursRow = {
    day_of_week: (typeof DOWS)[number];
    open_time: string;
    close_time: string;
    enabled: boolean;
  };


  const DOWS = ["mon","tue","wed","thu","fri","sat","sun"] as const;
  const DOW_LABEL: Record<string,string> = { mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat", sun:"Sun" };


  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [savingServices, setSavingServices] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const devEmail = () => localStorage.getItem("dev_email") ?? "test@example.com";

  function normalizeAvailability(rows: AvailabilityApi[]): HoursRow[] {
  const map = new Map(rows.map((r) => [r.day_of_week, r]));
  return DOWS.map((dow) => {
    const r = map.get(dow);
    if (r) {
      return { day_of_week: dow, open_time: r.open_time, close_time: r.close_time, enabled: true };
    }
    // missing in DB = closed day (weekends will land here)
    return { day_of_week: dow, open_time: "09:00", close_time: "17:00", enabled: false };
  });
}


  useEffect(() => {
  if (!businessId) return;
  const email = devEmail();

  fetch(`${base}/businesses/${businessId}/services`, {
    headers: { "X-User-Email": email },
    cache: "no-store",
  })
    .then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json(); })
    .then(setServices)
    .catch(console.error);

  fetch(`${base}/businesses/${businessId}/availability`, {
    headers: { "X-User-Email": email },
    cache: "no-store",
  })
    .then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json(); })
    .then((rows: AvailabilityApi[]) => setHours(normalizeAvailability(rows)))
    .catch(console.error);
}, [base, businessId]);

async function addService() {
  const email = devEmail();
  setSavingServices(true);
  try {
    const res = await fetch(`${base}/businesses/${businessId}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Email": email },
      body: JSON.stringify({ name: "New Service", duration_min: 30 }),
    });
    if (!res.ok) throw new Error(await res.text());
    const created = await res.json();
    setServices((prev) => [...prev, created]);
  } finally {
    setSavingServices(false);
  }
}

async function saveServicePatch(serviceId: number, patch: Partial<{ name: string; duration_min: number }>) {
  const email = devEmail();
  const res = await fetch(`${base}/services/${serviceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-User-Email": email },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  const updated = await res.json();
  setServices((prev) => prev.map((s) => (s.id === serviceId ? updated : s)));
}

async function deleteService(serviceId: number) {
  const email = devEmail();
  const res = await fetch(`${base}/services/${serviceId}`, {
    method: "DELETE",
    headers: { "X-User-Email": email },
  });
  if (!res.ok) throw new Error(await res.text());
  setServices((prev) => prev.filter((s) => s.id !== serviceId));
}



async function saveHours() {
  const email = devEmail();
  setSavingHours(true);
  try {
    const payload = hours
      .filter((h) => h.enabled)
      .map((h) => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
      }));

    const res = await fetch(`${base}/businesses/${businessId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-User-Email": email },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await res.text());
    const updated = (await res.json()) as AvailabilityApi[];

    // backend returns only rows that exist → normalize back to 7-day UI
    setHours(normalizeAvailability(updated));
  } finally {
    setSavingHours(false);
  }
}


type Business = { id: number; name: string; slug: string; timezone: string };
const [biz, setBiz] = useState<Business | null>(null);

useEffect(() => {
  if (!businessId) return;
  const email = localStorage.getItem("dev_email") ?? "test@example.com";

  fetch(`${base}/businesses/${businessId}`, {
    headers: { "X-User-Email": email },
    cache: "no-store",
  })
    .then(async (r) => {
      const text = await r.text();
      if (!r.ok) throw new Error(text);
      return text ? JSON.parse(text) : null;
    })
    .then(setBiz)
    .catch(console.error);
}, [base, businessId]);

const [copied, setCopied] = useState(false);
function copyBookingLink() {
  if (!biz?.slug) return;

  const url = `${window.location.origin}/b/${biz.slug}`;
  navigator.clipboard.writeText(url).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  });
}

const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
const [googleCalendarId, setGoogleCalendarId] = useState<string | null>(null);

useEffect(() => {
  if (!businessId) return;
  const email = devEmail();

  fetch(`${base}/businesses/${businessId}/integrations/google/status`, {
    headers: { "X-User-Email": email },
    cache: "no-store",
  })
    .then(async (r) => {
      const text = await r.text();
      if (!r.ok) throw new Error(text);
      return JSON.parse(text);
    })
    .then((data) => {
      setGoogleConnected(data.connected);
      setGoogleCalendarId(data.calendar_id ?? null);
    })
    .catch(console.error);
}, [base, businessId]);

async function connectGoogle() {
  const email = devEmail();
  const res = await fetch(`${base}/businesses/${businessId}/integrations/google/start`, {
    headers: { "X-User-Email": email },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  const data = JSON.parse(text);
  window.location.href = data.auth_url; // redirect to Google OAuth
}


  return (
    <main className="min-h-screen p-8">
        <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="text-gray-600 font-mono mt-1">
            {biz?.name ?? businessId}
          </div>
        </div>

        {biz?.slug && (
          <button
            onClick={copyBookingLink}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Copy booking link"}
          </button>
        )}
      </div>

      <section className="border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Google Calendar</h2>

          {googleConnected ? (
            <span className="text-sm text-green-700">Connected</span>
          ) : (
            <button
              onClick={() => connectGoogle().catch(console.error)}
              className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Connect Google Calendar
            </button>
          )}
        </div>

        <div className="mt-2 text-sm text-gray-600">
          {googleConnected
            ? `Bookings will be written to your Google Calendar (${googleCalendarId ?? "primary"}).`
            : "Connect to prevent double-booking and automatically add bookings to your calendar."}
        </div>
      </section>

      <section className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold">Pick a day</h2>
        <div className="mt-2">
          <DatePicker value={date} onChange={setDate} variant="strip" days={14} />
        </div>
      </section>

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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hours</h2>
          <button
            onClick={() => saveHours().catch(console.error)}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={savingHours}
          >
            {savingHours ? "Saving..." : "Save hours"}
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {hours.map((row) => (
            <div key={row.day_of_week} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-2 text-sm font-medium">{DOW_LABEL[row.day_of_week]}</div>

              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setHours((prev) =>
                        prev.map((x) => (x.day_of_week === row.day_of_week ? { ...x, enabled } : x))
                      );
                    }}
                  />
                  Open
                </label>
              </div>

              <div className="col-span-4">
                <input
                  type="time"
                  className="w-full rounded border px-2 py-1 disabled:bg-gray-100"
                  value={row.open_time}
                  disabled={!row.enabled}
                  onChange={(e) => {
                    const open_time = e.target.value;
                    setHours((prev) =>
                      prev.map((x) => (x.day_of_week === row.day_of_week ? { ...x, open_time } : x))
                    );
                  }}
                />
              </div>

              <div className="col-span-4">
                <input
                  type="time"
                  className="w-full rounded border px-2 py-1 disabled:bg-gray-100"
                  value={row.close_time}
                  disabled={!row.enabled}
                  onChange={(e) => {
                    const close_time = e.target.value;
                    setHours((prev) =>
                      prev.map((x) => (x.day_of_week === row.day_of_week ? { ...x, close_time } : x))
                    );
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>


        <section className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Services</h2>
            <button
              onClick={addService}
              className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={savingServices}
            >
              + Add service
            </button>
          </div>

          {services.length === 0 ? (
            <p className="mt-3 text-gray-500">No services yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {services.map((s) => (
                <li key={s.id} className="rounded border p-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-6">
                      <label className="text-xs text-gray-500">Name</label>
                      <input
                        className="mt-1 w-full rounded border px-2 py-1"
                        value={s.name}
                        onChange={(e) =>
                          setServices((prev) =>
                            prev.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x))
                          )
                        }
                        onBlur={() => saveServicePatch(s.id, { name: s.name }).catch(console.error)}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="text-xs text-gray-500">Duration (min)</label>
                      <input
                        type="number"
                        min={5}
                        max={480}
                        className="mt-1 w-full rounded border px-2 py-1"
                        value={s.duration_min}
                        onChange={(e) =>
                          setServices((prev) =>
                            prev.map((x) =>
                              x.id === s.id ? { ...x, duration_min: Number(e.target.value) } : x
                            )
                          )
                        }
                        onBlur={() => saveServicePatch(s.id, { duration_min: s.duration_min }).catch(console.error)}
                      />
                    </div>

                    <div className="md:col-span-3 md:text-right">
                      <button
                        onClick={() => deleteService(s.id).catch(console.error)}
                        className="mt-4 md:mt-0 rounded border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Delete
                      </button>
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
