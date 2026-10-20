"use client";
import { CarFront, BatteryCharging, Wrench } from "lucide-react";
import { clsx } from "clsx";

export type MapSpot = {
  id: string;
  type: "sedan" | "suv" | "ev";
  // "empty" | "holding" | "occupied" khớp với api.ts / generateSpots,
  // "unavailable" là enum của database (ô bảo trì)
  status: "empty" | "holding" | "occupied" | "unavailable";
  isElevator?: boolean;
  match: boolean;
};

type Props = {
  spots: MapSpot[];
  bestMatchId?: string;
  selectedId?: string;
  onSpotClick: (spot: MapSpot) => void;
};

const TYPE_LABEL = { sedan: "Sedan", suv: "SUV", ev: "EV" } as const;

export default function ParkingMap({ spots, bestMatchId, selectedId, onSpotClick }: Props) {
  return (
    <div className="relative bg-slate-200/90 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-2.5 shadow-inner">
      {/* Làn xe chạy ở giữa */}
      <div className="absolute left-1/2 top-0 bottom-0 w-14 -translate-x-1/2 bg-slate-300/80 dark:bg-slate-700/70 border-x-2 border-dashed border-white/80 dark:border-slate-500 flex flex-col items-center justify-between py-4 pointer-events-none z-0">
        <div className="absolute w-4 h-8 bg-blue-600 rounded-sm shadow-md ez-car-in-lane flex flex-col items-center justify-between py-0.5 border border-white">
          <div className="w-3 h-1 bg-sky-200 rounded-sm" />
          <div className="w-2.5 h-1 bg-amber-400 rounded-sm" />
        </div>
        <div className="w-6 h-6 rounded-full border border-rose-500 bg-white/90 flex items-center justify-center">
          <span className="text-[8px] font-extrabold text-slate-800">5</span>
        </div>
        <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
          <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[9px] font-bold text-rose-700 bg-white/90 px-1 rounded uppercase">Cổng Ra</span>
      </div>

      {/* 2 cột ô đỗ, chừa khoảng giữa cho làn xe */}
      <div className="relative z-10 grid grid-cols-2 gap-x-16 gap-y-2.5">
        {spots.map((spot) => {
          const isEmpty = spot.status === "empty";
          const isHolding = spot.status === "holding";
          const isOccupied = spot.status === "occupied";
          const isDisabled = spot.status === "unavailable";
          const isBest = bestMatchId === spot.id;
          const isSelected = selectedId === spot.id;

          return (
            <button
              key={spot.id}
              type="button"
              onClick={() => onSpotClick(spot)}
              className={clsx(
                "relative rounded-xl p-2 h-20 flex flex-col justify-between border-2 text-left transition-all active:scale-95",
                !spot.match && "opacity-30 grayscale",
                isEmpty && "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 hover:bg-emerald-100 cursor-pointer",
                isHolding && "bg-amber-50 dark:bg-amber-950/40 border-amber-400 cursor-not-allowed",
                isOccupied && "bg-rose-50 dark:bg-rose-950/40 border-rose-300 cursor-not-allowed",
                isDisabled && "bg-slate-200 dark:bg-slate-700 border-slate-300 cursor-not-allowed",
                isBest && isEmpty && "ez-recommended-glow shadow-md",
                isSelected && "ring-4 ring-blue-600/40 !border-blue-600 !opacity-100 scale-105 z-20"
              )}
            >
              {isBest && isEmpty && (
                <span className="absolute -top-2.5 left-2 z-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                  ★ GỢI Ý CHO BẠN
                </span>
              )}

              {/* Hàng trên: mã ô + trạng thái */}
              <div className={clsx("flex justify-between items-start", isBest && isEmpty && "pt-1")}>
                <span
                  className={clsx(
                    "text-xs font-black tracking-tight",
                    isEmpty && "text-emerald-950 dark:text-emerald-100",
                    isHolding && "text-amber-900 dark:text-amber-200",
                    isOccupied && "text-rose-900 dark:text-rose-200",
                    isDisabled && "text-slate-500"
                  )}
                >
                  {spot.id}
                  {spot.isElevator && <span className="ml-1" title="Gần thang máy">🚪</span>}
                </span>
                <span
                  className={clsx(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
                    isEmpty && "text-emerald-800 bg-emerald-100 border-emerald-200",
                    isHolding && "text-amber-800 bg-amber-100 border-amber-200",
                    isOccupied && "text-rose-700 bg-rose-100 border-rose-200",
                    isDisabled && "text-slate-600 bg-slate-300 border-slate-300"
                  )}
                >
                  {isEmpty ? "Trống" : isHolding ? "Đang giữ" : isOccupied ? "Đã đỗ" : "Bảo trì"}
                </span>
              </div>

              {/* Giữa: loại ô / icon xe */}
              <div className="flex items-center justify-center">
                {isDisabled ? (
                  <Wrench size={18} className="text-slate-400" />
                ) : isOccupied || isHolding ? (
                  <CarFront size={22} className={isOccupied ? "text-rose-500/80" : "text-amber-500/80"} />
                ) : spot.type === "ev" ? (
                  <span className="flex items-center gap-1 bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <BatteryCharging size={12} /> EV
                  </span>
                ) : (
                  <span
                    className={clsx(
                      "text-[11px] font-bold",
                      spot.type === "suv" ? "text-blue-700 dark:text-blue-300" : "text-emerald-900 dark:text-emerald-200"
                    )}
                  >
                    {TYPE_LABEL[spot.type]}
                  </span>
                )}
              </div>

              {/* Hàng dưới: để trống cho cân layout (giá lấy theo bãi nên không hiện ở từng ô) */}
              <div className="h-3" />
            </button>
          );
        })}
      </div>
    </div>
  );
}