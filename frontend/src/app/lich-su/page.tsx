"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Clock,
  MapPin,
  QrCode,
  Copy,
  Maximize,
  Navigation,
  TrendingUp,
  Check,
  AlertCircle,
  XCircle,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  RotateCcw,
  History,
  ShieldCheck,
  ChevronRight,
  Car,
} from "lucide-react";
import { clsx } from "clsx";
import { QRCodeSVG } from "qrcode.react";
import { useStore, Booking } from "@/store";
import { lots, Lot } from "@/lib/mock/lots";
import { getLotsApi } from "@/lib/api";

const LOT_NAMES: Record<string, { name: string; address: string }> = {
  "1": { name: "Bãi Hải Châu A", address: "15 Lê Duẩn, Q. Hải Châu, Đà Nẵng" },
  "hai-chau-a": { name: "Bãi Hải Châu A", address: "15 Lê Duẩn, Q. Hải Châu, Đà Nẵng" },
  "2": { name: "Bãi Cầu Rồng", address: "Đường Trần Hưng Đạo, Q. Sơn Trà, Đà Nẵng" },
  "cau-rong": { name: "Bãi Cầu Rồng", address: "Đường Trần Hưng Đạo, Q. Sơn Trà, Đà Nẵng" },
  "3": { name: "Sân bay Đà Nẵng T1", address: "Ga T1, Sân bay Quốc tế Đà Nẵng, Q. Hải Châu" },
  "san-bay-t1": { name: "Sân bay Đà Nẵng T1", address: "Ga T1, Sân bay Quốc tế Đà Nẵng, Q. Hải Châu" },
};

const DEPOSIT = 50_000;



function HistoryContent() {
  const router = useRouter();

  // Store
  const activeBooking = useStore((s) => s.activeBooking);
  const history = useStore((s) => s.history);
  const vehicles = useStore((s) => s.vehicles);
  const addToast = useStore((s) => s.addToast);

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0] || {
    plate: "43A-123.45",
    type: "SUV",
  };

  // Lots from API
  const [lotsList, setLotsList] = useState<Lot[]>(lots);
  useEffect(() => {
    getLotsApi().then((data) => {
      if (data && data.length > 0) setLotsList(data);
    });
  }, []);

  // Search & Filter state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "active" | "completed" | "cancelled">("all");

  // Bottom Sheet Detail state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Fullscreen QR Modal state
  const [qrModalItem, setQrModalItem] = useState<any | null>(null);

  // Active reservation countdowns
  const [paidCountdown, setPaidCountdown] = useState(13 * 60 + 20); // 13:20
  useEffect(() => {
    const interval = setInterval(() => {
      setPaidCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatMinSec = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Real user store history
  const displayHistory = useMemo(() => {
    const mappedReal = history.map((b) => {
      const lotInfo = LOT_NAMES[String(b.lotId).toLowerCase()] || {
        name: "Bãi đỗ xe EZ-Space",
        address: "Đà Nẵng",
      };
      const veh = vehicles.find((v) => v.id === b.vehicleId) || activeVehicle;
      return {
        id: b.id,
        lotId: b.lotId,
        lotName: lotInfo.name,
        lotAddress: lotInfo.address,
        spotId: b.spotId,
        vehiclePlate: veh.plate,
        vehicleType: veh.type,
        status: b.status,
        amount: b.status === "cancelled" ? 0 : b.status === "forfeited" ? -DEPOSIT : (b.estimatedHours ? b.estimatedHours * 15000 : DEPOSIT),
        deposit: DEPOSIT,
        durationText: b.status === "completed" ? "2 giờ" : "Cọc giữ chỗ",
        paymentMethod: b.paymentMethod || "vnpay",
        createdAt: b.createdAt,
        checkInTime: "14:15",
        checkOutTime: "16:45",
      };
    });

    let result = mappedReal;

    // Filter by type
    if (historyFilter === "completed") {
      result = result.filter((item) => item.status === "completed");
    } else if (historyFilter === "cancelled") {
      result = result.filter((item) => item.status === "cancelled" || item.status === "forfeited");
    } else if (historyFilter === "active") {
      result = [];
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.id.toLowerCase().includes(q) ||
          (item.lotName && item.lotName.toLowerCase().includes(q)) ||
          item.spotId.toLowerCase().includes(q) ||
          (item.vehiclePlate && item.vehiclePlate.toLowerCase().includes(q))
      );
    }

    return result;
  }, [history, historyFilter, searchQuery, activeVehicle, vehicles]);

  // Statistics from real data
  const totalTrips = displayHistory.length + (activeBooking ? 1 : 0);
  const totalSpent = useMemo(() => {
    return (
      displayHistory.reduce(
        (sum, item) =>
          sum + (item.status === "completed" ? item.amount : item.status === "forfeited" ? Math.abs(item.amount) : 0),
        0
      ) + (activeBooking && ["paid", "entered"].includes(activeBooking.status) ? DEPOSIT : 0)
    );
  }, [displayHistory, activeBooking]);

  const totalHours = useMemo(() => {
    return displayHistory.filter((i) => i.status === "completed").length * 2;
  }, [displayHistory]);

  const activeLotInfo = activeBooking
    ? LOT_NAMES[String(activeBooking.lotId).toLowerCase()] || {
        name: "Bãi đỗ xe EZ-Space",
        address: "Đà Nẵng",
      }
    : null;

  const copyTicketCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    addToast(`Đã sao chép mã vé: ${code}`, "success");
  };

  return (
    <div className="relative w-full min-h-screen bg-[#F1F5F9] text-slate-800 font-sans flex flex-col pb-8">
      
      {/* ================= DYNAMIC ISLAND & STATUS BAR ================= */}
      <div className="relative w-full pt-3 px-6 flex justify-between items-center z-40 text-slate-900 font-semibold text-xs select-none pointer-events-none">
        <span className="tracking-tight text-sm font-bold">09:41</span>
        
        {/* Dynamic Island Pill */}
        <div className="w-24 h-6 bg-slate-950 rounded-full mx-auto flex items-center justify-between px-2.5 shadow-inner">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-800 text-[11px]">
          <span>📶</span>
          <span>📶</span>
          <div className="w-4 h-2.5 border border-current rounded-[2px] p-0.5 flex items-center">
            <div className="w-full h-full bg-current rounded-2xs" />
          </div>
        </div>
      </div>

      {/* ================= APP HEADER ================= */}
      <header className="pt-3 pb-2 px-5 flex items-center justify-between z-30">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              P
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vé và lịch sử</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Quản lý vé đỗ xe và các giao dịch</p>
        </div>

        {/* Quick Actions Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Tìm kiếm vé"
            className="w-9 h-9 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-600 active:scale-95 transition-transform hover:bg-slate-50"
          >
            <Search size={16} />
          </button>
        </div>
      </header>

      {/* ================= SEARCH BAR COLLAPSIBLE ================= */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5 pb-2"
          >
            <div className="relative flex items-center">
              <Search size={16} className="text-slate-400 absolute left-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm bãi đỗ, biển số xe, mã vé..."
                className="w-full h-11 pl-10 pr-9 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-sm text-slate-800 font-medium placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= SCROLLABLE CONTENT AREA ================= */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 space-y-4 pt-1">
        
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: "all", label: `Tất cả (${totalTrips})` },
            { id: "active", label: "Đang diễn ra", badge: activeBooking ? "1" : undefined },
            { id: "completed", label: "Đã hoàn tất" },
            { id: "cancelled", label: "Đã hủy / Mất cọc" },
          ].map((chip) => {
            const isActive = historyFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setHistoryFilter(chip.id as any)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                )}
              >
                <span>{chip.label}</span>
                {chip.badge && (
                  <span
                    className={clsx(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                      isActive ? "bg-white text-blue-600" : "bg-blue-100 text-blue-600"
                    )}
                  >
                    {chip.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ACTIVE BOOKING CARD (ĐƠN HIỆU LỰC) - CHỈ HIỆN KHI CÓ ĐƠN THỰC TẾ */}
        {(historyFilter === "all" || historyFilter === "active") && activeBooking && activeLotInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Đơn đang đặt / Đang diễn ra
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold">
                1 đơn hiệu lực
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-blue-200 overflow-hidden relative transition-all">
              {/* Header Gradient */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-white flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px] uppercase backdrop-blur-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeBooking?.status === "entered"
                    ? "ĐANG ĐỖ XE TRONG BÃI"
                    : activeBooking?.status === "holding"
                    ? "ĐANG GIỮ CHỖ TẠM THỜI"
                    : "ĐÃ ĐẶT CỌC - Chờ đến bãi"}
                </span>
                <div className="flex items-center gap-1 text-xs font-semibold bg-blue-900/40 px-2.5 py-0.5 rounded-full">
                  <Clock size={13} className="text-blue-200" />
                  <span>
                    Hạn đến: <strong className="text-white font-mono">{formatMinSec(paidCountdown)}</strong>
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">{activeLotInfo.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                      <MapPin size={12} className="text-slate-400" /> {activeLotInfo.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Vị trí ô</span>
                    <div className="text-lg font-black text-blue-600 tracking-tight">{activeBooking.spotId}</div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                  <div>
                    <div className="text-slate-400 font-medium">Biển số</div>
                    <div className="font-bold text-slate-800">{activeVehicle.plate}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-medium">Dòng xe</div>
                    <div className="font-bold text-slate-800">{activeVehicle.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 font-medium">Đã cọc</div>
                    <div className="font-bold text-blue-600">
                      {activeBooking.status === "holding" ? "Chưa cọc" : `${DEPOSIT.toLocaleString("vi-VN")}đ`}
                    </div>
                  </div>
                </div>

                {/* QR Code Bar */}
                <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
                  <div
                    className="flex items-center gap-2.5 cursor-pointer group"
                    onClick={() =>
                      setQrModalItem({
                        code: activeBooking.id,
                        lotName: activeLotInfo.name,
                        spotId: activeBooking.spotId,
                        plate: activeVehicle.plate,
                      })
                    }
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center p-1 text-blue-600 group-hover:scale-105 transition-transform">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 font-mono">{activeBooking.id}</div>
                      <div className="text-[10px] text-slate-400">Chạm để mở mã QR</div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyTicketCode(activeBooking.id)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] flex items-center gap-1 font-medium transition active:scale-95"
                  >
                    <Copy size={13} className="text-blue-600" />
                    <span>Sao chép</span>
                  </button>
                </div>

                {/* Actions Button */}
                <div className="w-full grid grid-cols-2 gap-2 mt-3.5">
                  <button
                    onClick={() =>
                      setQrModalItem({
                        code: activeBooking.id,
                        lotName: activeLotInfo.name,
                        spotId: activeBooking.spotId,
                        plate: activeVehicle.plate,
                      })
                    }
                    className="h-10 rounded-xl bg-white border border-slate-200 font-semibold text-xs text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 active:scale-95 transition shadow-sm"
                  >
                    <Maximize size={15} className="text-slate-600" />
                    <span>Xem vé QR</span>
                  </button>
                  <Link
                    href={`/ve/${activeBooking.id}`}
                    className="h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 font-semibold text-xs text-white flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-95 transition shadow-md shadow-blue-500/25"
                  >
                    <Navigation size={15} />
                    <span>Chi tiết & Dẫn đường</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATISTICS SUMMARY (3 COLUMNS) - DỮ LIỆU THỰC */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Tổng lượt đỗ</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">{totalTrips} lượt</div>
            <span className="text-[9px] text-emerald-600 font-bold flex items-center justify-center gap-0.5">
              <TrendingUp size={10} /> {totalTrips > 0 ? `+${totalTrips} tháng này` : "0 tháng này"}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Tổng chi tiêu</span>
            <div className="text-lg font-black text-blue-600 mt-0.5">{totalSpent.toLocaleString("vi-VN")}đ</div>
            <span className="text-[9px] text-slate-400 font-medium">VNĐ</span>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Tổng thời gian</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">{totalHours} giờ</div>
            <span className="text-[9px] text-slate-400 font-medium">{totalHours > 0 ? "tiết kiệm 20%" : "--"}</span>
          </div>
        </div>

        {/* RECENT TRANSACTIONS LIST */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lịch sử gần đây</span>
            <span className="text-[11px] font-medium text-slate-400">{displayHistory.length} giao dịch</span>
          </div>

          {displayHistory.map((item, idx) => {
            const isCompleted = item.status === "completed";
            const isForfeited = item.status === "forfeited";
            const isCancelled = item.status === "cancelled";

            const lotInfo = LOT_NAMES[String(item.lotId).toLowerCase()] || {
              name: item.lotName || "Bãi đỗ xe EZ-Space",
              address: item.lotAddress || "Đà Nẵng",
            };

            return (
              <div
                key={item.id + idx}
                onClick={() =>
                  setSelectedItem({
                    ...item,
                    lotName: lotInfo.name,
                    lotAddress: lotInfo.address,
                  })
                }
                className={clsx(
                  "bg-white rounded-2xl p-3.5 border shadow-sm flex items-center justify-between transition active:scale-[0.98] cursor-pointer",
                  isCompleted
                    ? "border-slate-200/90 hover:border-blue-200"
                    : isForfeited
                    ? "border-slate-200/90 hover:border-rose-200"
                    : "border-slate-200/90 hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border",
                      isCompleted && "bg-emerald-50 text-emerald-600 border-emerald-100",
                      isForfeited && "bg-rose-50 text-rose-600 border-rose-100",
                      isCancelled && "bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    {isCompleted && <Check size={18} />}
                    {isForfeited && <AlertCircle size={18} />}
                    {isCancelled && <XCircle size={18} />}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{lotInfo.name}</h4>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>Ô {item.spotId}</span> • <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={clsx(
                          "px-2 py-0.2 rounded-md text-[10px] font-semibold",
                          isCompleted && "bg-emerald-50 text-emerald-700",
                          isForfeited && "bg-rose-50 text-rose-700",
                          isCancelled && "bg-slate-100 text-slate-600"
                        )}
                      >
                        {isCompleted ? "Đã hoàn thành" : isForfeited ? "Mất cọc" : "Đã hủy"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.vehiclePlate}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={clsx(
                      "text-sm font-black",
                      isForfeited ? "text-rose-600" : "text-slate-900"
                    )}
                  >
                    {isCompleted
                      ? `${item.amount.toLocaleString("vi-VN")}đ`
                      : isForfeited
                      ? `-${Math.abs(item.amount).toLocaleString("vi-VN")}đ`
                      : "0đ"}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isForfeited ? "Quá hạn 20p" : item.durationText || "2.5 giờ"}
                  </span>
                </div>
              </div>
            );
          })}

          {displayHistory.length === 0 && !activeBooking && (
            <div className="text-center py-10 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100">
                <History size={26} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Chưa có giao dịch nào</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4 max-w-[260px] mx-auto">
                Tài khoản mới chưa phát sinh giao dịch hoặc vé đỗ. Hãy tìm bãi đỗ và đặt chỗ ngay!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition"
              >
                <Car size={15} />
                <span>Tìm bãi & Đặt chỗ</span>
              </Link>
            </div>
          )}

          {displayHistory.length === 0 && activeBooking && (
            <div className="text-center py-6 px-4 bg-white/60 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
              Chưa có lịch sử giao dịch trước đây.
            </div>
          )}
        </div>

      </div>

      {/* ================= BOTTOM SHEET: TICKET DETAIL & BILL BREAKDOWN ================= */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex flex-col justify-end">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="bg-white rounded-t-[32px] p-5 pb-8 max-h-[85%] overflow-y-auto no-scrollbar shadow-2xl border-t border-slate-100"
            >
              {/* Drag Handle Indicator */}
              <div
                className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 cursor-pointer"
                onClick={() => setSelectedItem(null)}
              />

              {/* Sheet Header Status */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5",
                      selectedItem.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedItem.status === "forfeited"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-blue-100 text-blue-800"
                    )}
                  >
                    {selectedItem.status === "completed" ? (
                      <>
                        <CheckCircle size={14} className="text-emerald-600" />
                        <span>Hoàn thành đỗ xe</span>
                      </>
                    ) : selectedItem.status === "forfeited" ? (
                      <>
                        <AlertTriangle size={14} className="text-rose-600" />
                        <span>Mất cọc do quá hạn 20p</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} className="text-blue-600" />
                        <span>Đã cọc • Chờ đến bãi</span>
                      </>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Lot & Reservation Info */}
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedItem.lotName || "Bãi Hải Châu A"}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedItem.lotAddress || "15 Lê Duẩn, Q. Hải Châu, Đà Nẵng"}</p>
              </div>

              {/* Slot & Vehicle Chip Bar */}
              <div className="grid grid-cols-3 gap-2 mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Vị trí</span>
                  <div className="font-bold text-blue-600">Ô {selectedItem.spotId}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Xe đỗ</span>
                  <div className="font-bold text-slate-800">{selectedItem.vehiclePlate || activeVehicle.plate}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Mã vé</span>
                  <div className="font-mono font-bold text-slate-700">{selectedItem.id}</div>
                </div>
              </div>

              {/* Step Timeline Vertical */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Tiến trình đỗ xe</h4>
                <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  <div className="relative flex items-center justify-between text-xs">
                    <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                    <span className="font-semibold text-slate-800">Đặt cọc giữ chỗ</span>
                    <span className="text-[11px] text-slate-400 font-mono">14:00</span>
                  </div>
                  <div className="relative flex items-center justify-between text-xs">
                    <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                    <span className="font-semibold text-slate-800">Quét mã vào bãi (Check-in)</span>
                    <span className="text-[11px] text-slate-400 font-mono">{selectedItem.checkInTime || "14:15"}</span>
                  </div>
                  <div className="relative flex items-center justify-between text-xs">
                    <span
                      className={clsx(
                        "absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm",
                        selectedItem.status === "completed" ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    />
                    <span className="font-semibold text-slate-800">Quét mã ra bãi (Check-out)</span>
                    <span className="text-[11px] text-slate-400 font-mono">{selectedItem.checkOutTime || "16:45"}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Receipt Cutout */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold pb-2 border-b border-dashed border-slate-300">
                  <span className="text-slate-600">Chi tiết thanh toán</span>
                  <span className="text-blue-600 font-mono text-[11px]">VNP14077831</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Tiền cọc ban đầu (VNPay)</span>
                  <span className="font-medium">50.000đ</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Phí đỗ thực tế</span>
                  <span className="font-medium">50.000đ</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Khấu trừ tiền cọc</span>
                  <span className="font-medium">-50.000đ</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Ưu đãi thành viên (nếu có)</span>
                  <span className="font-medium text-emerald-600">0đ</span>
                </div>

                <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Tổng thanh toán:</span>
                  <span className="text-base text-blue-600 font-black">
                    {selectedItem.status === "forfeited"
                      ? `-${DEPOSIT.toLocaleString("vi-VN")}đ`
                      : `${(selectedItem.amount || DEPOSIT).toLocaleString("vi-VN")}đ`}
                  </span>
                </div>
              </div>

              {/* Actions CTAs */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => addToast("Đang tạo và tải hóa đơn điện tử PDF...", "success")}
                  className="h-11 rounded-xl bg-white border border-slate-200 font-semibold text-xs text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 active:scale-95 transition shadow-sm"
                >
                  <Download size={15} />
                  <span>Tải hóa đơn</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    router.push(`/bai/${selectedItem.lotId || "hai-chau-a"}`);
                  }}
                  className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 font-semibold text-xs text-white flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-95 transition shadow-md shadow-blue-500/25"
                >
                  <RotateCcw size={15} />
                  <span>Đặt lại chỗ này</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= FULLSCREEN QR MODAL ================= */}
      <AnimatePresence>
        {qrModalItem && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center">
            <button
              onClick={() => setQrModalItem(null)}
              className="absolute top-10 right-6 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition"
            >
              <X size={20} />
            </button>

            <span className="text-xs uppercase font-bold tracking-widest text-blue-300 mb-1">
              Mã QR Check-In
            </span>
            <h3 className="text-lg font-bold">{qrModalItem.lotName || "Bãi Hải Châu A"}</h3>
            <p className="text-xs text-slate-300 mt-1 mb-6">
              Đã tự động tăng độ sáng màn hình để máy quét barie dễ đọc
            </p>

            {/* Giant QR Code Box */}
            <div className="w-64 h-64 bg-white rounded-3xl p-4 shadow-2xl flex items-center justify-center border-4 border-blue-500">
              <QRCodeSVG
                value={`EZSPACE-TICKET:${qrModalItem.code}:${qrModalItem.spotId}`}
                size={210}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="mt-6 font-mono text-sm tracking-widest font-bold">
              {qrModalItem.code}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ô {qrModalItem.spotId} • Biển số: {qrModalItem.plate}
            </p>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F1F5F9]" />}>
      <HistoryContent />
    </Suspense>
  );
}
