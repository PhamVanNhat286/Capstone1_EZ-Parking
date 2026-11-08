"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MapPin,
  QrCode,
  Copy,
  Maximize,
  Navigation,
  Camera,
  Ticket,
  X,
  CreditCard,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { clsx } from "clsx";
import { QRCodeSVG } from "qrcode.react";
import { useStore, Booking } from "@/store";
import { lots } from "@/lib/mock/lots";
import { getActiveReservationApi, releaseSpotApi } from "@/lib/api";

const LOT_NAMES: Record<string, { name: string; address: string }> = {
  "1": { name: "Bãi Hải Châu A", address: "15 Lê Duẩn, Q. Hải Châu, Đà Nẵng" },
  "hai-chau-a": { name: "Bãi Hải Châu A", address: "15 Lê Duẩn, Q. Hải Châu, Đà Nẵng" },
  "2": { name: "Bãi Cầu Rồng", address: "Đường Trần Hưng Đạo, Q. Sơn Trà, Đà Nẵng" },
  "cau-rong": { name: "Bãi Cầu Rồng", address: "Đường Trần Hưng Đạo, Q. Sơn Trà, Đà Nẵng" },
  "3": { name: "Sân bay Đà Nẵng T1", address: "Ga T1, Sân bay Quốc tế Đà Nẵng, Q. Hải Châu" },
  "san-bay-t1": { name: "Sân bay Đà Nẵng T1", address: "Ga T1, Sân bay Quốc tế Đà Nẵng, Q. Hải Châu" },
};

const DEPOSIT = 50_000;

function VeDangDoContent() {
  const router = useRouter();

  const user = useStore((s) => s.user);
  const activeBooking = useStore((s) => s.activeBooking);
  const vehicles = useStore((s) => s.vehicles);
  const addToast = useStore((s) => s.addToast);
  const cancelBooking = useStore((s) => s.cancelBooking);

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0] || {
    plate: "43A-123.45",
    type: "SUV",
  };

  // DB active reservation
  const [activeDbItem, setActiveDbItem] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFromApi = async () => {
    setIsLoading(true);
    try {
      const res = await getActiveReservationApi(user?.token);
      if (res && res.success) {
        setActiveDbItem(res.data || null);
      }
    } catch (err) {
      console.warn("Lỗi tải vé active:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFromApi();
  }, [user?.token]);

  // Realtime clock
  const [now, setNow] = useState(Date.now());
  const [parkedSeconds, setParkedSeconds] = useState(8315);
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      setParkedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatMinSec = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const effectiveBooking = useMemo(() => {
    const candidate = activeBooking || (activeDbItem ? {
      id: `EZ-${activeDbItem.id}`,
      backendId: activeDbItem.id,
      lotId: String(activeDbItem.parking_lot_id),
      spotId: activeDbItem.slot_code,
      vehicleId: String(activeDbItem.vehicle_id || "1"),
      status: activeDbItem.status,
      holdExpiresAt: activeDbItem.hold_expires_at ? new Date(activeDbItem.hold_expires_at).getTime() : Date.now() + 10 * 60 * 1000,
      arrivalExpiresAt: activeDbItem.arrival_expires_at ? new Date(activeDbItem.arrival_expires_at).getTime() : Date.now() + 20 * 60 * 1000,
      createdAt: new Date(activeDbItem.created_at || Date.now()).getTime(),
    } as Booking : null);

    if (candidate && ["holding", "paid", "entered"].includes(candidate.status)) {
      return candidate;
    }
    return null;
  }, [activeBooking, activeDbItem]);

  const paidSeconds = effectiveBooking?.arrivalExpiresAt
    ? Math.max(0, Math.ceil((effectiveBooking.arrivalExpiresAt - now) / 1000))
    : 0;

  const holdSeconds = effectiveBooking?.holdExpiresAt
    ? Math.max(0, Math.ceil((effectiveBooking.holdExpiresAt - now) / 1000))
    : 0;

  const lotInfo = effectiveBooking
    ? LOT_NAMES[String(effectiveBooking.lotId).toLowerCase()] || {
        name: activeDbItem?.lot_name || "Bãi đỗ xe EZ-Space",
        address: activeDbItem?.lot_address || "Đà Nẵng",
      }
    : null;

  const copyTicketCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    addToast(`Đã sao chép mã vé: ${code}`, "success");
  };

  const handleCancel = async () => {
    if (effectiveBooking?.backendId) {
      try {
        await releaseSpotApi(effectiveBooking.backendId, user?.token);
      } catch (e) {
        console.warn("Lỗi hủy đặt chỗ backend:", e);
      }
    }
    cancelBooking();
    setActiveDbItem(null);
    addToast("Đã hủy đặt chỗ thành công", "info");
    router.push("/kham-pha");
  };

  const isHolding = effectiveBooking?.status === "holding";
  const isPaid = effectiveBooking?.status === "paid";
  const isEntered = effectiveBooking?.status === "entered";

  return (
    <div className="relative w-full min-h-screen bg-[#F1F5F9] font-sans flex flex-col text-slate-800">
      {/* Header */}
      <header className="pt-3 pb-3 px-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              <Ticket size={14} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vé đang đỗ</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Vé đang hoạt động của bạn</p>
        </div>
        <button
          onClick={() => { loadFromApi(); addToast("Đã làm mới vé", "success"); }}
          className="w-9 h-9 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-600 active:scale-95 transition hover:bg-slate-50"
          aria-label="Làm mới"
        >
          <svg className={clsx("w-4 h-4", isLoading && "animate-spin text-blue-600")} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-24 space-y-4 pt-1">
        {effectiveBooking && lotInfo ? (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
            {/* Header Status Bar */}
            <div
              className={clsx(
                "px-4 py-3 text-white flex items-center justify-between",
                isHolding && "bg-gradient-to-r from-amber-500 to-amber-600",
                isPaid && "bg-gradient-to-r from-blue-600 to-blue-700",
                isEntered && "bg-gradient-to-r from-emerald-600 to-teal-700"
              )}
            >
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-white font-bold text-[10px] uppercase backdrop-blur-sm flex items-center gap-1.5">
                <span className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", isHolding ? "bg-white" : isPaid ? "bg-emerald-300" : "bg-emerald-200")} />
                {isHolding
                  ? "ĐANG GIỮ CHỖ - Chờ thanh toán cọc"
                  : isEntered
                  ? "ĐANG ĐỖ XE TRONG BÃI"
                  : "ĐÃ ĐẶT CỌC - Chờ đến bãi"}
              </span>

              <div className="flex items-center gap-1 text-xs font-semibold bg-black/20 px-2.5 py-1 rounded-full">
                <Clock size={13} className="text-white/80" />
                {isHolding ? (
                  <span>Còn lại: <strong className="text-white font-mono">{formatMinSec(holdSeconds)}</strong></span>
                ) : isEntered ? (
                  <span>Đang đỗ: <strong className="text-white font-mono">{formatTime(parkedSeconds)}</strong></span>
                ) : (
                  <span>Hạn đến: <strong className="text-white font-mono">{formatMinSec(paidSeconds)}</strong></span>
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3.5">
              {/* Lot name + spot */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{lotInfo.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                    <MapPin size={12} className="text-slate-400" /> {lotInfo.address}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Vị trí ô</span>
                  <div className={clsx("text-lg font-black tracking-tight", isHolding ? "text-amber-600" : "text-blue-600")}>
                    {effectiveBooking.spotId}
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <div className="text-slate-400 font-medium">Biển số</div>
                  <div className="font-bold text-slate-800">{activeVehicle.plate}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Dòng xe</div>
                  <div className="font-bold text-slate-800">{activeVehicle.type}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 font-medium">{isHolding ? "Tiền cọc" : "Đã cọc"}</div>
                  <div className="font-bold text-blue-600">{DEPOSIT.toLocaleString("vi-VN")}đ</div>
                </div>
              </div>

              {/* Status Note or AI banner */}
              {isHolding && (
                <div className="flex items-center gap-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-800 text-xs">
                  <AlertCircle size={16} className="shrink-0 text-amber-600" />
                  <span>Vui lòng hoàn tất cọc trong <strong>{formatMinSec(holdSeconds)}</strong> để giữ ô đỗ!</span>
                </div>
              )}

              {isPaid && (
                <div className="flex items-center gap-2 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                  <Camera size={16} className="text-blue-600 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium">
                    Camera AI đã nhận dạng biển <strong>{activeVehicle.plate}</strong>
                  </span>
                </div>
              )}

              {/* QR Code Bar (for paid or entered) */}
              {(isPaid || isEntered) && (
                <div className="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
                  <div
                    className="flex items-center gap-2.5 cursor-pointer group"
                    onClick={() => setQrModalOpen(true)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center p-1 text-blue-600 group-hover:scale-105 transition-transform">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 font-mono">{effectiveBooking.id}</div>
                      <div className="text-[10px] text-slate-400">Chạm để mở mã QR</div>
                    </div>
                  </div>
                  <button
                    onClick={() => copyTicketCode(effectiveBooking.id)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] flex items-center gap-1 font-medium transition active:scale-95"
                  >
                    <Copy size={13} className="text-blue-600" />
                    <span>Sao chép</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              {isHolding ? (
                <div className="space-y-2">
                  <button
                    onClick={() => router.push(`/thanh-toan?id=${effectiveBooking.backendId || effectiveBooking.id}`)}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 font-bold text-xs text-white flex items-center justify-center gap-2 active:scale-95 transition shadow-md shadow-blue-500/25"
                  >
                    <CreditCard size={15} />
                    <span>Thanh toán cọc ngay ({DEPOSIT.toLocaleString("vi-VN")}đ)</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-full text-center text-xs text-rose-500 font-semibold py-1.5 hover:underline active:opacity-70 transition"
                  >
                    Hủy giữ chỗ
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setQrModalOpen(true)}
                      className="h-11 rounded-xl bg-white border border-slate-200 font-semibold text-xs text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 active:scale-95 transition shadow-sm"
                    >
                      <Maximize size={15} className="text-slate-600" />
                      <span>Xem vé QR</span>
                    </button>
                    <button
                      onClick={() => {
                        const lot = lots.find((l) => String(l.id) === effectiveBooking.lotId) || lots[0];
                        const query = encodeURIComponent(`${lot.name}, ${lot.address}`);
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`, "_blank");
                      }}
                      className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 font-semibold text-xs text-white flex items-center justify-center gap-1.5 active:scale-95 transition shadow-md shadow-blue-500/25"
                    >
                      <Navigation size={15} />
                      <span>Dẫn đường</span>
                    </button>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="w-full text-center text-xs text-rose-500 font-semibold py-1.5 hover:underline active:opacity-70 transition"
                  >
                    Hủy đặt chỗ
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state enclosed in a clean white card */
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm flex flex-col items-center justify-center text-center mt-2">
            <div className="w-20 h-20 rounded-full bg-blue-50/80 border border-blue-100 flex items-center justify-center mb-4 text-blue-500 shadow-inner">
              <Ticket size={36} strokeWidth={1.8} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Không có vé đang hoạt động</h3>
            <p className="text-xs text-slate-500 max-w-[270px] mb-6 leading-relaxed">
              Bạn chưa có vé đỗ xe nào đang diễn ra. Hãy đặt chỗ tại một bãi đỗ gần bạn!
            </p>
            <Link
              href="/kham-pha"
              className="w-full max-w-[220px] h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Navigation size={15} />
              <span>Tìm bãi đỗ ngay</span>
            </Link>
          </div>
        )}
      </div>

      {/* Fullscreen QR Modal */}
      <AnimatePresence>
        {qrModalOpen && effectiveBooking && lotInfo && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-10 right-6 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition"
            >
              <X size={20} />
            </button>

            <span className="text-xs uppercase font-bold tracking-widest text-blue-300 mb-1">
              Mã QR Check-In
            </span>
            <h3 className="text-lg font-bold">{lotInfo.name}</h3>
            <p className="text-xs text-slate-300 mt-1 mb-6">
              Đưa mã QR cho nhân viên quét tại cổng
            </p>

            <div className="w-64 h-64 bg-white rounded-3xl p-4 shadow-2xl flex items-center justify-center border-4 border-blue-500">
              <QRCodeSVG
                value={`EZSPACE-TICKET:${effectiveBooking.id}:${effectiveBooking.spotId}`}
                size={210}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="mt-6 font-mono text-sm tracking-widest font-bold">
              {effectiveBooking.id}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ô {effectiveBooking.spotId} • Biển số: {activeVehicle.plate}
            </p>

            <button
              onClick={() => {
                copyTicketCode(effectiveBooking.id);
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-white/30 transition"
            >
              <Copy size={14} />
              Sao chép mã vé
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VeDangDoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F1F5F9]" />}>
      <VeDangDoContent />
    </Suspense>
  );
}
