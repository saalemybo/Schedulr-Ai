"use client";

import { useEffect, useState } from "react";
import DatePicker from "@/components/DatePicker";
import { useRouter } from "next/navigation";


type Service = { id: number; business_id: number; name: string; duration_min: number; };
type Slot = { start_at: string; end_at: string; };

export default function BookingClient({ slug }: { slug: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const [bookErr, setBookErr] = useState<string | null>(null);
 

  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

  useEffect(() => {
    fetch(`${base}/public/businesses/${slug}/services`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setServices)
      .catch(() => setServices([]));
  }, [base, slug]);

  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    fetch(`${base}/b/${slug}/slots?date=${selectedDate}&service_id=${selectedService}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSlots(data?.slots ?? []))
      .catch(() => setSlots([]));
  }, [base, slug, selectedService, selectedDate]);

async function bookAppointment() {
  if (!selectedService || !selectedSlot) return;
  if (!name.trim() || !email.trim()) {
    setBookErr("Please enter your name and email.");
    return;
  }

  setBooking(true);
  setBookErr(null);

  try {
    const res = await fetch(`${base}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_slug: slug,
        service_id: selectedService,
        customer_name: name.trim(),
        customer_email: email.trim(),
        start_at: selectedSlot.start_at,
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      // backend returns JSON like {"detail":"..."} sometimes; fall back to raw text
      let msg = text;
      try {
        const j = JSON.parse(text);
        msg = j?.detail ?? msg;
      } catch {}
      setBookErr(msg || "Booking failed.");
      return;
    }

    const data = text ? JSON.parse(text) : null;
    const apptId = data?.id;

    // Redirect to confirmation page
    router.push(`/b/${slug}/confirmed?appt=${encodeURIComponent(String(apptId ?? ""))}`);
  } catch (e: any) {
    setBookErr(e?.message ?? "Booking failed.");
  } finally {
    setBooking(false);
  }
}

  type Business = {
  id: number;
  name: string;
  slug: string;
  timezone: string;};

const [business, setBusiness] = useState<Business | null>(null);

useEffect(() => {
  if (!slug) return;

  fetch(`${base}/public/businesses/${slug}`, {
    cache: "no-store",
  })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      return JSON.parse(text);
    })
    .then(setBusiness)
    .catch(console.error);
}, [base, slug]);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">{business?.name}</h1>
        <p className="text-gray-600 font-mono">Book An Appointment: </p>

        <section className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-xl font-semibold">Select Service</h2>
          {services.length === 0 ? (
            <p className="mt-2 text-gray-500 text-sm">
              No services loaded (usually CORS or wrong API base).
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {services.map((s) => (
                <li
                  key={s.id}
                  onClick={() => {
                    setSelectedService(s.id);
                    setSelectedSlot(null);
                  }}
                  className={`flex justify-between items-center p-3 rounded border cursor-pointer hover:opacity-80 ${
                    selectedService === s.id ? "opacity-60 border-black" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-gray-600">{s.duration_min} min</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selectedService && (
            <section className="border rounded-lg p-4 shadow-sm">
                <h2 className="text-xl font-semibold">Select A Date</h2>
                <DatePicker
                value={selectedDate}
                onChange={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                }}
                variant="month"
                days={14}
                />
            </section>
            )}


        {selectedDate && slots.length > 0 && (
          <section className="border rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-semibold">Available Slots</h2>
            <ul className="mt-3 space-y-2">
              {slots.map((slot) => (
                <li
                  key={slot.start_at}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-3 rounded border cursor-pointer hover:opacity-80 ${
                    selectedSlot?.start_at === slot.start_at ? "opacity-60 border-black" : ""
                  }`}
                >
                  <div className="font-mono text-sm">{slot.start_at} → {slot.end_at}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {selectedSlot && (
          <section className="border rounded-lg p-4 shadow-sm space-y-3">
            <h2 className="text-xl font-semibold">Your Info</h2>
            <input className="border rounded p-2 w-full" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="border rounded p-2 w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {bookErr && <p className="text-sm text-red-600">{bookErr}</p>}

            <button
            onClick={bookAppointment}
            disabled={booking}
            className="bg-black text-white px-4 py-2 rounded-lg hover:opacity-80 disabled:opacity-50"
            >
            {booking ? "Booking..." : "Confirm Booking"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
