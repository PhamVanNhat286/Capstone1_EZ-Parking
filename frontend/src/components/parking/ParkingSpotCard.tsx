"use client";

import { Sparkles, X, Zap } from "lucide-react";
import clsx from "clsx";

export type Kind = "sedan" | "suv" | "ev";
export type Status = "empty" | "occupied" | "holding" | "disabled";
export type Spot = {
  id: string;
  dbId?: number;
  type: Kind;
  status: Status;
  rowIndex?: number;
  colIndex?: number;
  nearExit?: boolean;
};


type Props = {
  spot: Spot;
  visible: boolean;
  compatible: boolean;
  selected: boolean;
  recommended: boolean;
  pricePerHour: number;
  onSelect: () => void;
};

/** Thành phần React hiển thị một ô đỗ xe. */
export default function ParkingSpotCard({
  spot, visible, compatible, selected, recommended, pricePerHour, onSelect,
}: Props) {
  const free = spot.status === "empty";
  const statusLabel = free ? "Trống" : spot.status === "occupied" ? "Đã đỗ"
    : spot.status === "holding" ? "Đang giữ" : "Bảo trì";
  const typeLabel = spot.type === "ev" ? "Sạc EV" : spot.type === "suv" ? "SUV" : "Sedan";

  return (
    <button
      type="button"
      aria-label={`Ô ${spot.id}, ${statusLabel}, loại ${typeLabel}`}
      aria-pressed={selected}
      disabled={!visible}
      onClick={onSelect}
      className={clsx(
        "relative h-[80px] w-full rounded-xl border-2 p-2 flex flex-col justify-between text-left transition shadow-sm",
        free ? "bg-emerald-50 border-emerald-400" : spot.status === "occupied" ? "bg-rose-50 border-rose-300"
          : spot.status === "holding" ? "bg-amber-50 border-amber-400" : "bg-slate-200 border-slate-300",
        (!visible || (free && !compatible)) && "opacity-30 grayscale",
        free && compatible && visible && "hover:scale-[1.03] active:scale-95",
        selected && "!border-blue-600 ring-[3px] ring-blue-300 scale-[1.04] z-10 !opacity-100 !grayscale-0",
        recommended && "ring-2 ring-blue-500 shadow-blue-200 shadow-lg",
      )}
    >
      {recommended && <span className="absolute -top-2.5 left-1 bg-blue-600 text-white rounded-full px-2 py-0.5 text-[8px] font-bold whitespace-nowrap flex items-center gap-1"><Sparkles size={9} /> GỢI Ý</span>}
      <div className="flex items-start justify-between gap-1">
        <b className="text-[12px] text-slate-900">{spot.id}</b>
        <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
          free ? "bg-emerald-100 text-emerald-700" : spot.status === "occupied" ? "bg-rose-100 text-rose-700"
            : spot.status === "holding" ? "bg-amber-100 text-amber-700" : "bg-slate-300 text-slate-600")}>{statusLabel}</span>
      </div>
      {free ? <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-800">
        {spot.type === "ev" && <Zap size={12} />} {typeLabel}
      </span> : spot.status === "disabled" ? <X size={21} className="self-center text-slate-400" />
        : <div className={clsx("self-center w-7 h-8 rounded-md border flex flex-col items-center justify-around",
          spot.status === "occupied" ? "bg-rose-400 border-rose-500" : "bg-amber-400 border-amber-500")}>
          <span className="w-5 h-1 rounded bg-slate-700/40" /><span className="w-4 h-2 rounded bg-white/60" />
        </div>}
      <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
        <span>{spot.nearExit ? "↗ Gần lối ra" : ""}</span>
        {free && <span className="font-extrabold text-emerald-700">{Math.round(pricePerHour / 1000)}k/h</span>}
      </div>
    </button>
  );
}
