"use client";

import { addDays, format, parseISO } from "date-fns";
// Month calendar deps (we’ll use soon)
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  variant?: "strip" | "month";
  days?: number; // used for strip; default 14
  startDateISO?: string; // optional start for strip
};

export default function DatePicker({
  value,
  onChange,
  variant = "strip",
  days = 14,
  startDateISO,
}: Props) {
  if (variant === "strip") {
    const start = startDateISO ? parseISO(startDateISO) : new Date();
    const dates = Array.from({ length: days }, (_, i) => addDays(start, i));

    return (
      <div className="flex gap-2 overflow-x-auto py-2">
        {dates.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const active = value === iso;

          return (
            <button
              key={iso}
              onClick={() => onChange(iso)}
              className={`min-w-[88px] rounded-lg border px-3 py-2 text-left hover:opacity-80 ${
                active ? "border-black opacity-60" : ""
              }`}
            >
              <div className="text-xs text-gray-500">{format(d, "EEE")}</div>
              <div className="text-sm font-medium">{format(d, "MMM d")}</div>
            </button>
          );
        })}
      </div>
    );
  }

  // Month grid variant (Calendly-style)
  const selected = value ? parseISO(value) : undefined;

  return (
    <div className="rounded-lg border p-2">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={(d) => {
          if (!d) return;
          onChange(format(d, "yyyy-MM-dd"));
        }}
        weekStartsOn={0}
      />
    </div>
  );
}
