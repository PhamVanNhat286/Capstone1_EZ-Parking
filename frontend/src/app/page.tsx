"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, MapPin, Zap, Clock, ShieldCheck, ChevronRight, Car, User, Sparkles } from "lucide-react";
import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { vi } from "@/lib/i18n/vi";
import { lots, Lot } from "@/lib/mock/lots";
import { getLotsApi } from "@/lib/api";
import { useStore } from "@/store";
import BottomSheet from "@/components/ui/BottomSheet";
import { ChevronDown } from "lucide-react";

const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

type FilterType = "all" | "nearest" | "ev" | "availableNow";

function ExploreContent() {
  const router = useRouter();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sheetContent, setSheetContent] = useState<"none" | "notif" | "area">("none");
  const [area, setArea] = useState("Đà Nẵng");

  const activeBooking = useStore((s) => s.activeBooking);
  const addToast = useStore((s) => s.addToast);
  const isDemo = useStore((s) => s.isDemo);
  const setDemo = useStore((s) => s.setDemo);

  const [lotsList, setLotsList] = useState<Lot[]>(lots);
  const [timeLeft, setTimeLeft] = useState(0);

  // Lấy dữ liệu thật từ Backend API
  useEffect(() => {
    getLotsApi().then((data) => {
      if (data && data.length > 0) {
        setLotsList(data);
      }
    });
  }, []);

  // Long press logic
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
      setDemo(!isDemo);
      addToast(`Chế độ Demo: ${!isDemo ? "BẬT" : "TẮT"}`, "success");
    }, 2000);
  };
  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (!activeBooking) return;
    const updateTimer = () => {
      const isPaid = activeBooking.status === "paid";
      const targetExpiry = isPaid && activeBooking.arrivalExpiresAt
        ? activeBooking.arrivalExpiresAt
        : activeBooking.holdExpiresAt;
      const remaining = Math.max(0, Math.floor((targetExpiry - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeBooking]);

  const filteredLots = useMemo(() => {
    let result = [...lotsList];

    // Search
    if (debouncedSearch) {
      const q = normalize(debouncedSearch);
      result = result.filter(
        (l) => 
          normalize(l.name).includes(q) || 
          normalize(l.district).includes(q) || 
          (l.address && normalize(l.address).includes(q))
      );
    }

    // Sort & Filter
    if (filter === "nearest") {
      result.sort((a, b) => ((a.distance ?? 0) - (b.distance ?? 0)));
    } else if (filter === "ev") {
      result = result.filter((l) => l.available.ev > 0);
      result.sort((a, b) => b.available.ev - a.available.ev);
    } else if (filter === "availableNow") {
      result = result.filter((l) => l.available.total > 0);
      result.sort((a, b) => b.available.total - a.available.total);
    }

    return result;
  }, [debouncedSearch, filter, lotsList]);

  const getAvailableCount = (lot: Lot) => {
    if (filter === "ev") return lot.available.ev;
    return lot.available.total;
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-[#F7F8FC] pb-6">
      {/* Header — blue */}
      <div className="sticky top-0 bg-[#2B4BD1] z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 relative">
          <button
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onClick={() => setSheetContent("area")}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition active:scale-95"
          >
            <MapPin size={16} className="text-white" />
            <span className="font-bold text-white text-sm">{area}</span>
            <ChevronDown size={14} className="text-white/70" />
          </button>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => setSheetContent("notif")}
            className="relative text-white min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Bell size={22} />
            <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-[#2B4BD1]" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-6">
        {/* Greeting & Search */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h2 className="text-2xl font-black text-slate-900 mb-1">{vi.home.greeting}</h2>
          <p className="text-sm font-medium text-slate-500 mb-4">{vi.home.subtitle}</p>
          
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={20} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={vi.home.searchPlaceholder}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-14 text-[16px] font-medium text-slate-900 placeholder-slate-400 shadow-[0_2px_12px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[#2B4BD1]/20 focus:border-[#2B4BD1] transition-all"
            />
            {search.length > 0 && (
              <button
                onClick={() => router.push(`/ai?q=${encodeURIComponent(search)}`)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-50 text-[#2B4BD1] rounded-xl flex items-center justify-center active:scale-95 transition-transform"
              >
                <Sparkles size={18} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Chips — Tất cả | Gần nhất | EV Sạc | Còn trống ngay */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide mb-2">
          <Chip active={filter === "all"}         onClick={() => setFilter("all")}         label={vi.home.filters.all} />
          <Chip active={filter === "nearest"}     onClick={() => setFilter("nearest")}     label="Gần nhất" />
          <Chip active={filter === "ev"}          onClick={() => setFilter("ev")}          label={vi.home.filters.ev} />
          <Chip active={filter === "availableNow"} onClick={() => setFilter("availableNow")} label={vi.home.filters.availableNow} />
        </div>

        {/* Active Booking Banner */}
        <AnimatePresence>
          {activeBooking && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              {(() => {
                const isPaid = activeBooking.status === "paid";
                const isEntered = activeBooking.status === "entered";
                const totalDuration = isPaid ? 1200 : 600;
                const LOT_NAMES: Record<string, string> = {
                  "1": "Bãi Hải Châu A",
                  "hai-chau-a": "Bãi Hải Châu A",
                  "2": "Bãi Cầu Rồng",
                  "cau-rong": "Bãi Cầu Rồng",
                  "3": "Sân bay Đà Nẵng T1",
                  "san-bay-t1": "Sân bay Đà Nẵng T1",
                };
                const bookedLot = lotsList.find(l => String(l.id).toLowerCase() === String(activeBooking.lotId).toLowerCase());
                const bookedLotName = bookedLot?.name || LOT_NAMES[String(activeBooking.lotId).toLowerCase()] || "Bãi đỗ xe";
                const targetUrl = activeBooking.status === "holding" ? `/dat-cho/${activeBooking.spotId}` : `/ve/${activeBooking.id}`;
                const title = isEntered 
                  ? "Đang đỗ xe trong bãi" 
                  : isPaid 
                  ? "Thời gian đến bãi (Đã cọc)" 
                  : "Đang giữ ô (Chờ cọc)";

                return (
                  <Link href={targetUrl}>
                    <div className="bg-orange-50 border border-orange-100 rounded-[20px] p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
                      <div className="w-12 h-12 rounded-full border-4 border-orange-200 flex items-center justify-center shrink-0 relative">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle 
                            cx="20" 
                            cy="20" 
                            r="18" 
                            fill="none" 
                            stroke="#f97316" 
                            strokeWidth="4" 
                            strokeDasharray="113" 
                            strokeDashoffset={113 - (113 * Math.min(timeLeft, totalDuration)) / totalDuration} 
                            className="transition-all duration-1000 linear" 
                          />
                        </svg>
                        <span className="text-orange-600 font-bold text-[10px] tabular-nums">{formatTimer(timeLeft)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-orange-900 text-sm mb-0.5 truncate">{title}</h3>
                        <p className="text-xs font-medium text-orange-700/80 truncate">Ô {activeBooking.spotId} • {bookedLotName}</p>
                      </div>
                      <ChevronRight size={20} className="text-orange-400 shrink-0" />
                    </div>
                  </Link>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold text-slate-900">{vi.home.nearby}</h2>
          <span className="text-sm font-bold text-slate-400">{vi.home.lotsCount(filteredLots.length)}</span>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredLots.map((lot) => {
              const count = getAvailableCount(lot);
              const isEmpty = count === 0;
              return (
                <motion.div
                  key={lot.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: isEmpty ? 0.5 : 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  <Link href={`/bai/${lot.id}`}>
                    <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden active:scale-[0.98] transition-transform border border-slate-100/50">
                      {/* Real photo header */}
                      <div className="h-[140px] relative overflow-hidden">
                        <img
                          src={lot.image}
                          alt={lot.name}
                          className="w-full h-full object-cover"
                        />
                        {/* dark overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                        {/* available badge */}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                          <div className={clsx("w-2 h-2 rounded-full", isEmpty ? "bg-red-500" : "bg-emerald-500")} />
                          <span className={clsx("text-xs font-bold tabular-nums", isEmpty ? "text-red-600" : "text-emerald-700")}>{count}</span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{vi.lotCard.available}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="text-[17px] font-bold text-slate-900 mb-1 leading-tight">{lot.name}</h3>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-4 truncate">
                          <MapPin size={13} className="text-[#2B4BD1] shrink-0" />
                          <span className="truncate">{lot.address || `${lot.district}, Đà Nẵng`}</span>
                        </p>

                        {/* Types breakdown */}
                        <div className="flex gap-4 mb-4">
                          <TypeCount type="Sedan" count={lot.available.sedan} />
                          <TypeCount type="SUV" count={lot.available.suv} />
                          <TypeCount type="EV" count={lot.available.ev} />
                        </div>

                        <div className="flex items-end justify-between border-t border-slate-50 pt-4">
                          <div className="flex gap-1.5 flex-wrap max-w-[60%]">
                            {lot.labels.slice(0, 3).map((lbl) => (
                              <span key={lbl} className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-100">
                                {lbl}
                              </span>
                            ))}
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <div className="text-[15px] font-black text-[#2B4BD1] tabular-nums leading-none">
                                {vi.formatMoney(lot.price).replace(" ₫", "")}
                                <span className="text-xs font-medium text-slate-500 ml-0.5">{vi.lotCard.pricePerHour}</span>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-[#2B4BD1] text-white flex items-center justify-center shrink-0">
                              <ChevronRight size={16} strokeWidth={3} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredLots.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-slate-400" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{vi.home.emptyState.title}</h3>
              <button onClick={() => setSearch("")} className="text-[#2B4BD1] font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl">
                {vi.home.emptyState.clearBtn}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Sheets */}
      <BottomSheet isOpen={sheetContent === "notif"} onClose={() => setSheetContent("none")} title="Thông báo">
        <div className="space-y-4">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="flex gap-4 items-start p-4 bg-slate-50 rounded-[16px] border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Cập nhật hệ thống</h4>
                <p className="text-xs font-medium text-slate-500 mb-2">EZ-Space vừa cập nhật thêm tính năng mới giúp bạn đỗ xe dễ dàng hơn.</p>
                <span className="text-[10px] font-bold text-slate-400">2 giờ trước</span>
              </div>
            </div>
          ))}
          <button onClick={() => { setSheetContent("none"); addToast("Đã đánh dấu đọc tất cả"); }} className="w-full bg-slate-100 text-slate-900 font-bold py-4 rounded-[16px] mt-4 active:scale-95 transition-transform">
            Đánh dấu đã đọc
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={sheetContent === "area"} onClose={() => setSheetContent("none")} title="Chọn khu vực">
        <div className="space-y-2">
          {["Hải Châu", "Sơn Trà", "Thanh Khê", "Ngũ Hành Sơn"].map((a) => (
            <button 
              key={a}
              onClick={() => {
                setArea(a);
                setSearch(a);
                setSheetContent("none");
              }}
              className={clsx(
                "w-full text-left px-4 py-4 rounded-[16px] font-bold transition-colors active:scale-95",
                area === a ? "bg-[#2B4BD1] text-white shadow-md shadow-[#2B4BD1]/30" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100"
              )}
            >
              Quận {a}
            </button>
          ))}
        </div>
      </BottomSheet>

    </div>
  );
}

function Chip({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-4 py-2 rounded-[14px] text-[13px] font-bold whitespace-nowrap transition-all flex items-center min-h-[44px]",
        active
          ? "bg-[#2B4BD1] text-white shadow-md shadow-[#2B4BD1]/20"
          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 active:scale-95"
      )}
    >
      {label}
    </button>
  );
}

function TypeCount({ type, count }: { type: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {type === "EV" ? <Zap size={12} className="text-slate-400" /> : <Car size={12} className="text-slate-400" />}
      <span className="text-xs font-medium text-slate-500">{type} <span className="font-bold text-slate-900 tabular-nums">{count}</span></span>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FC]" />}>
      <ExploreContent />
    </Suspense>
  );
}
