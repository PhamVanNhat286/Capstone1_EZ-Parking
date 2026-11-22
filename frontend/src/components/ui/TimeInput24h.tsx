"use client";

import { Clock3 } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

interface TimeInput24hProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export default function TimeInput24h({ value, onChange, ariaLabel }: TimeInput24hProps) {
  const [rawH, rawM] = (value || "00:00").split(":");
  const hNum = parseInt(rawH, 10);
  const mNum = parseInt(rawM, 10);
  const hour = !isNaN(hNum) && hNum >= 0 && hNum <= 23 ? String(hNum).padStart(2, "0") : "00";
  const minute = !isNaN(mNum) && mNum >= 0 && mNum <= 59 ? String(mNum).padStart(2, "0") : "00";

  return (
    <div className="flex items-center justify-between gap-1 w-full">
      <div className="flex items-center text-base font-black text-slate-900 tabular-nums">
        <select
          aria-label={ariaLabel ? `${ariaLabel} - Giờ` : "Giờ"}
          value={hour}
          onChange={(e) => onChange(`${e.target.value}:${minute}`)}
          className="appearance-none bg-transparent outline-none cursor-pointer px-1 py-0.5 rounded-md hover:bg-slate-100 focus:bg-blue-50 focus:text-blue-700 transition-colors text-center"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-slate-900 select-none">:</span>
        <select
          aria-label={ariaLabel ? `${ariaLabel} - Phút` : "Phút"}
          value={minute}
          onChange={(e) => onChange(`${hour}:${e.target.value}`)}
          className="appearance-none bg-transparent outline-none cursor-pointer px-1 py-0.5 rounded-md hover:bg-slate-100 focus:bg-blue-50 focus:text-blue-700 transition-colors text-center"
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <Clock3 size={16} className="text-slate-700 shrink-0 pointer-events-none" />
    </div>
  );
}
