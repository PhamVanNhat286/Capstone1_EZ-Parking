"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown, BatteryCharging, CarFront, Check, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, Heart, MapPin, Minus, Plus,
  RefreshCw, Sparkles, X, Zap,
} from "lucide-react";
import { getLotByIdApi, getLotSlotsApi, holdSpotApi } from "@/lib/api";
import { lots } from "@/lib/mock/lots";
import { clsx } from "clsx";
import { useStore, type Vehicle } from "@/store";
import ParkingSpotCard, { type Spot, type Kind, type Status } from "@/components/parking/ParkingSpotCard";
import TimeInput24h from "@/components/ui/TimeInput24h";
import { calculateDetailedFee, getRateForHour } from "@/lib/pricing";
import { bookingDuration, formatBookingTime } from "@/lib/booking-time";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

const money = (n: number) => Math.round(n).toLocaleString("vi-VN") + "đ";
const DEPOSIT = 50000;

function normalizeSlot(s: any): Spot {
  const type: Kind = s.type === "ev" || s.type === "suv" ? s.type : "sedan";
  const status: Status = s.status === "available" || s.status === "empty" ? "empty"
    : s.status === "occupied" || s.status === "holding" ? s.status : "disabled";
  return {
    id: String(s.id), dbId: s.dbId, type, status,
    rowIndex: s.rowIndex, colIndex: s.colIndex, nearExit: !!s.isElevator,
    bookedIntervals: Array.isArray(s.bookedIntervals) ? s.bookedIntervals : [],
  };
}
function isSuitable(spot: Spot, car: Vehicle | null, charge: boolean | null) {
  if (!car) return false;
  if (car.type === "SUV") return spot.type === "suv";
  if (car.type === "Sedan") return spot.type === "sedan" || spot.type === "suv";
  if (charge === null) return false;
  if (charge) return spot.type === "ev";
  return car.evBodyType === "Sedan"
    ? spot.type === "sedan" || spot.type === "suv"
    : spot.type === "suv";
}
function nameOf(type: Kind) {
  return type === "ev" ? "Sạc EV" : type === "suv" ? "SUV" : "Sedan";
}

function formatHHmm(date: Date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function getInitialStartTime() {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() + 5 - (now.getMinutes() % 5));
  return now.toISOString();
}

export default function ParkingMapPage() {
  const router = useRouter();
  const params = useParams();
  const lotId = String(params?.id || "hai-chau-a");
  const fallbackLot = lots.find((x) => x.id === lotId) || lots[0];
  const vehicles = useStore((s) => s.vehicles);
  const booking = useStore((s) => s.activeBooking);
  const user = useStore((s) => s.user);
  const holdSpot = useStore((s) => s.holdSpot);
  const toast = useStore((s) => s.addToast);
  const favoriteLots = useStore((s) => s.favoriteLots || []);
  const toggleFavoriteLot = useStore((s) => s.toggleFavoriteLot);
  const isFavorite =
    favoriteLots.includes(lotId) ||
    ((lotId === "3" || lotId === "san-bay-t1") && favoriteLots.some((id) => id === "3" || id === "san-bay-t1")) ||
    ((lotId === "1" || lotId === "hai-chau-a") && favoriteLots.some((id) => id === "1" || id === "hai-chau-a")) ||
    ((lotId === "2" || lotId === "cau-rong") && favoriteLots.some((id) => id === "2" || id === "cau-rong"));
  const scrollRef = useRef<HTMLDivElement>(null);
  const justReservedSpotRef = useRef<string | null>(null);

  const [lot, setLot] = useState({ name: fallbackLot.name, address: fallbackLot.address, price: fallbackLot.price });
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"choose" | "charge" | null>(null);
  const [vehicleInitialized, setVehicleInitialized] = useState(false);
  const [needsCharging, setNeedsCharging] = useState<boolean | null>(null);
  const [spotId, setSpotId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>(getInitialStartTime);
  const [endTime, setEndTime] = useState<string>(() => new Date(new Date(startTime).getTime() + 120 * 60_000).toISOString());
  const [area, setArea] = useState<"all" | "left" | "right">("all");
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [zoom, setZoom] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLotSchedule, setShowLotSchedule] = useState(false);
  const [scheduleSpotId, setScheduleSpotId] = useState<string | null>(null);

  const durationInfo = useMemo(() => {
    return bookingDuration(startTime, endTime);
  }, [startTime, endTime]);

  const selectedRateInfo = useMemo(() => {
    const selectedStart = new Date(startTime);
    const at = Number.isFinite(selectedStart.getTime()) ? selectedStart : new Date();
    return getRateForHour(lotId, at.getHours(), lot.price, at.getDay());
  }, [lotId, lot.price, startTime]);

  const feeDetails = useMemo(() => {
    const start = new Date(startTime);
    return calculateDetailedFee(lotId, formatHHmm(start), durationInfo?.hours || 1, lot.price, start);
  }, [lotId, startTime, durationInfo?.hours, lot.price]);

  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  function applyQuickHours(addHours: number) {
    if (!startTime) return;
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) return;
    setEndTime(new Date(start.getTime() + addHours * 3600_000).toISOString());
  }

  const car = vehicles.find((v) => v.id === vehicleId) || null;

  useEffect(() => {
    if (vehicleInitialized) return;
    if (vehicles.length > 1) {
      setVehicleId(null);
      setDialog("choose");
    } else if (vehicles.length === 1) {
      setVehicleId(vehicles[0].id);
      if (vehicles[0].type === "EV") setDialog("charge");
    } else {
      setVehicleId(null);
      setDialog("choose");
    }
    setVehicleInitialized(true);
  }, [vehicles, vehicleInitialized]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [apiSpots, apiLot] = await Promise.all([getLotSlotsApi(lotId, user?.token), getLotByIdApi(lotId)]);
      if (apiSpots !== null) {
        setSpots(apiSpots.map(normalizeSlot));
        setLoadError(null);
      } else {
        setSpots([]);
        setLoadError("Không tải được ô đỗ từ máy chủ. Vui lòng kiểm tra backend rồi thử lại.");
      }
      if (apiLot) {
        const rate = Number(Array.isArray(apiLot.pricing_rules) ? apiLot.pricing_rules[0]?.hourly_rate : 0);
        setLot({
          name: apiLot.name || fallbackLot.name, address: apiLot.address || fallbackLot.address,
          price: rate > 0 ? rate : fallbackLot.price
        });
      }
    } catch (e) {
      console.warn("Auto refresh error:", e);
      setSpots([]);
      setLoadError(e instanceof Error ? e.message : "Không tải được ô đỗ từ máy chủ. Vui lòng thử lại.");
    } finally {
      setIsRefreshing(false);
    }
  }, [lotId, fallbackLot.name, fallbackLot.address, fallbackLot.price, user?.token]);

  useEffect(() => {
    setSpotId(null);
    setLot({ name: fallbackLot.name, address: fallbackLot.address, price: fallbackLot.price });
    setSpots([]);
    setLoadError(null);
  }, [lotId, fallbackLot.name, fallbackLot.address, fallbackLot.price]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const displayed = spots;

  const selected = displayed.find((s) => s.id === spotId) || null;
  const selectedBookings = selected?.bookedIntervals || [];
  const ownBookings = selectedBookings.filter((item) => item.isMine);
  const lotSchedule = spots.flatMap((spot) => (spot.bookedIntervals || []).map((item) => ({ ...item, spotId: spot.id })))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const visibleSchedule = scheduleSpotId ? lotSchedule.filter((item) => item.spotId === scheduleSpotId) : lotSchedule;
  const conflictingBookings = selectedBookings.filter((item) => {
    const bookedStart = new Date(item.startTime).getTime();
    const requestedStart = new Date(startTime).getTime();
    return bookedStart < new Date(endTime).getTime() &&
      new Date(item.endTime).getTime() > requestedStart;
  });
  const best = useMemo(() => displayed.filter((s) => s.status === "empty" && isSuitable(s, car, needsCharging))
    .sort((a, b) => Number(!!b.nearExit) - Number(!!a.nearExit) || a.id.localeCompare(b.id))[0],
    [displayed, car, needsCharging]);
  const matching = displayed.filter((s) => s.status === "empty" && isSuitable(s, car, needsCharging)).length;
  const freeCount = displayed.filter((s) => s.status === "empty").length;
  const occupiedCount = displayed.filter((s) => s.status === "occupied").length;
  const holdingCount = displayed.filter((s) => s.status === "holding").length;
  const rows = useMemo(() => {
    const ordered = [...displayed].sort((a, b) =>
      (a.rowIndex ?? 0) - (b.rowIndex ?? 0) || (a.colIndex ?? 0) - (b.colIndex ?? 0) || a.id.localeCompare(b.id));
    const left = ordered.filter((s) => /^A-?/i.test(s.id));
    const right = ordered.filter((s) => /^B-?/i.test(s.id));
    const valid = left.length && right.length && left.length + right.length === ordered.length;
    const a = valid ? left : ordered.filter((_, i) => i % 2 === 0);
    const b = valid ? right : ordered.filter((_, i) => i % 2 !== 0);
    return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => [a[i] || null, b[i] || null] as const);
  }, [displayed]);

  useEffect(() => {
    if (!selected) return;

    // Không báo lỗi nếu ô này vừa được đặt thành công hoặc thuộc lượt giữ chỗ của chính mình
    if (
      justReservedSpotRef.current === selected.id ||
      submitting ||
      (booking?.spotId === selected.id &&
        ["holding", "paid", "entered"].includes(booking.status))
    ) {
      return;
    }

    if (!isSuitable(selected, car, needsCharging)) {
      setSpotId(null);
    }
  }, [selected, car, needsCharging, booking, submitting]);

  function pickVehicle(v: Vehicle) {
    setVehicleId(v.id); setSpotId(null);
    setNeedsCharging(null);
    setDialog(v.type === "EV" ? "charge" : null);
  }
  function pickSpot(s: Spot) {
    if (!car) { setDialog("choose"); return; }
    if (car.type === "EV" && needsCharging === null) { setDialog("charge"); return; }
    if (s.status === "disabled") { toast("Ô đang bảo trì", "error"); return; }
    if (!isSuitable(s, car, needsCharging)) { toast("Ô này không phù hợp với xe của bạn", "error"); return; }
    setSpotId(s.id);
  }
  function chooseBest() {
    if (!best) { toast("Không còn ô trống phù hợp", "error"); return; }
    setFilter("all"); pickSpot(best);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function reserve() {
    if (!selected || !car || submitting || loadError || !selected.dbId) return;
    if (selected.status === "disabled" || conflictingBookings.length ||
        (selected.status !== "empty" && new Date(startTime).getTime() <= Date.now())) {
      toast("Ô đã có người đặt trong khoảng giờ này. Hãy chọn giờ khác hoặc ô khác.", "error"); return;
    }
    if (!durationInfo || !startTime || new Date(startTime).getTime() < Date.now() - 60_000) {
      toast(!durationInfo && startTime && endTime ? "Thời gian đặt tối thiểu 1 giờ." : "Hãy chọn giờ vào trong tương lai.", "error"); return;
    }
    if (booking && ["holding", "paid", "entered"].includes(booking.status)) {
      toast("Bạn đã có một lượt đặt chỗ đang hoạt động", "error"); return;
    }
    setSubmitting(true);
    try {
      let serverReservationId: number | undefined;
      let serverHoldExpiresAt: number | undefined;

      // Gọi API giữ chỗ chống trùng (Atomic Update) ở Backend
      const holdRes = await holdSpotApi({
        parking_lot_id: lotId,
        slot_id: selected.dbId || selected.id,
        vehicle_id: car.id,
        estimated_hours: durationInfo.hours,
        start_time: startTime,
        expected_end_time: endTime,
        token: user?.token,
      });

      // Nếu ô bị tranh chấp (HTTP 409) hoặc thất bại
      if (holdRes.status === 409 || !holdRes.success) {
        toast(holdRes.message || `Ô ${selected.id} vừa có người khác giữ chỗ. Vui lòng chọn ô khác!`, "error");
        setSpotId(null);
        await refresh();
        return;
      }

      if (holdRes.data) {
        serverReservationId = holdRes.data.reservation_id;
        if (holdRes.data.hold_expires_at) {
          serverHoldExpiresAt = new Date(holdRes.data.hold_expires_at).getTime();
        }
      }

      const targetSpotId = selected.id;
      justReservedSpotRef.current = targetSpotId;
      setSpotId(null);

      // Giữ chỗ với thời gian bắt đầu và kết thúc
      holdSpot(
        lotId,
        targetSpotId,
        car.id,
        Number(holdRes.data?.estimated_hours || durationInfo.hours),
        String(holdRes.data?.start_time || startTime),
        String(holdRes.data?.expected_end_time || endTime),
        serverReservationId,
        serverHoldExpiresAt
      );

      // Xóa sạch thông báo và chuyển thẳng sang màn thanh toán cọc
      useStore.getState().clearToasts();
      router.push(`/dat-cho/${encodeURIComponent(targetSpotId)}`);
    } catch (err) {
      console.error("Lỗi khi giữ ô đỗ:", err);
      toast("Lỗi kết nối khi giữ chỗ. Vui lòng thử lại!", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function renderSpot(s: Spot | null, side: "left" | "right") {
    if (!s) return <div className="h-[98px]" />;
    const visible = filter === "all" || s.type === filter;
    return <ParkingSpotCard key={s.id} spot={s} visible={visible}
      compatible={isSuitable(s, car, needsCharging)} selected={selected?.id === s.id}
      recommended={best?.id === s.id && !selected} pricePerHour={selectedRateInfo.rate}
      onSelect={() => pickSpot(s)} />;
  }

  return <div className="relative h-full min-h-[530px] flex flex-col bg-slate-100 text-slate-800 overflow-hidden">
    <style>{`@keyframes ez-drive { 0% {top:30px;opacity:0} 10% {opacity:1} 85% {opacity:1} 100% {top:calc(100% - 45px);opacity:0} }`}</style>
    <header className="shrink-0 bg-white px-4 pt-3 pb-2 shadow-sm z-20">
      <div className="flex justify-between gap-2 items-center">
        <button onClick={() => router.push("/kham-pha")} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><ChevronLeft size={21} /></button>
        <div className="min-w-0 flex-1 text-center"><h1 className="font-black text-base text-slate-900 truncate">{lot.name}</h1>
          <p className="text-[11px] text-slate-500 truncate"><MapPin size={11} className="inline mr-1" />{lot.address}</p></div>
        <button
          onClick={() => {
            toggleFavoriteLot(lotId);
            toast(
              isFavorite
                ? `Đã bỏ ${lot.name} khỏi danh sách yêu thích`
                : `Đã thêm ${lot.name} vào bãi đỗ yêu thích`,
              "success"
            );
          }}
          className={clsx(
            "w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90",
            isFavorite ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-500"
          )}
          aria-label="Yêu thích"
        >
          <Heart size={19} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
      <button onClick={() => setDialog("choose")} className="w-full mt-2 rounded-xl bg-blue-50 border border-blue-100 p-2.5 flex justify-between items-center gap-2 text-left">
        <div className="flex items-center gap-2 min-w-0"><CarFront size={20} className="text-blue-600 shrink-0" />
          <div className="min-w-0"><p className="text-xs font-bold text-blue-950 truncate">{car ? `${car.name} · ${car.plate}` : "Chọn xe của bạn"}</p>
            <p className="text-[10px] text-blue-700 truncate">{car ? (car.type === "EV" ? (needsCharging === null ? "Chưa chọn nhu cầu sạc" : needsCharging ? "Xe điện · cần sạc" : "Xe điện · không sạc") : car.type) : "Chưa chọn xe"} · {car ? `${matching} ô phù hợp` : "Vui lòng chọn xe"}</p></div></div>
        <span className="shrink-0 bg-white text-blue-700 border border-blue-200 rounded-lg px-2 py-1 text-[10px] font-bold">{car ? "Đổi xe" : "Chọn xe"}</span>
      </button>
    </header>

    <div className="shrink-0 bg-white px-3 py-2 border-b border-slate-200 space-y-2 z-10">
      <div className="flex justify-between items-center gap-1 text-[10px] font-semibold">
        <span className="text-emerald-700">🟢 Trống ({freeCount})</span><span className="text-rose-600">🔴 Đã đỗ ({occupiedCount})</span>
        <span className="text-amber-700">🟡 Giữ ({holdingCount})</span><span className="text-slate-500">⚪ Bảo trì</span>
      </div>
      <p className="text-[10px] text-slate-500">Giá trên ô là giá tại giờ vào bạn chọn; tổng phí tính theo các giờ đã đặt.</p>
      <div className="flex overflow-x-auto gap-1.5">
        {([["all", "Tất cả"], ["sedan", "🚗 Sedan"], ["suv", "🚙 SUV"], ["ev", "⚡ EV"]] as const).map(([v, label]) =>
          <button key={v} onClick={() => { setFilter(v); setSpotId(null) }} className={clsx("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
            filter === v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700")}>{label}</button>)}
        <button
          onClick={() => void refresh()}
          title="Tự động cập nhật mỗi 5 giây"
          className="ml-auto bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1.5 text-emerald-700"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <RefreshCw size={12} className={clsx("transition-transform", isRefreshing && "animate-spin text-blue-600")} />
          <span className="text-[10px] text-slate-500 font-medium">5s</span>
        </button>
      </div>
    </div>

    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-slate-100 px-3 pt-3 pb-3">
      <div className="flex justify-between items-center gap-2 mb-2 text-[10px] font-semibold">
        <span className="bg-white border border-slate-200 rounded-lg px-2 py-1.5">↕ Lối đi · Thang máy</span>
        <button type="button" onClick={() => { setScheduleSpotId(null); setShowLotSchedule(true); }} className="rounded-lg px-2.5 py-1.5 border bg-white text-blue-700 border-slate-200 hover:bg-blue-50">Xem lịch cả bãi</button>
      </div>
      <div className="relative bg-slate-200 rounded-2xl border border-slate-300 p-2.5 overflow-hidden shadow-inner">
        <div className="absolute left-1/2 top-0 bottom-0 w-12 -translate-x-1/2 bg-slate-300 border-x-2 border-dashed border-white flex flex-col items-center justify-between py-4 pointer-events-none">
          <span className="text-[9px] bg-white rounded px-1 font-black text-blue-700">VÀO</span>
          <span style={{ animation: "ez-drive 12s linear infinite" }} className="absolute left-1/2 -translate-x-1/2 top-8 w-4 h-8 bg-blue-600 rounded shadow border border-white flex flex-col items-center p-0.5">
            <span className="bg-sky-200 h-1 w-3 rounded" /></span>
          <span className="rounded-full bg-white border border-rose-500 w-6 h-6 flex items-center justify-center text-[10px] font-black">5</span>
          <ArrowDown size={18} className="text-white" /><span className="text-[9px] bg-white rounded px-1 text-rose-600 font-black">RA</span>
        </div>
        <div className="relative z-10 space-y-2.5 transition-transform" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
          {rows.map(([a, b], i) => <div key={i} className="grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] gap-1 items-center">
            {renderSpot(a, "left")}<div />{renderSpot(b, "right")}</div>)}
          {rows.length === 0 && <p className="bg-white rounded-xl text-center p-5 text-sm">{loadError || (isRefreshing ? "Đang tải ô đỗ..." : "Bãi này chưa có ô đỗ.")}</p>}
        </div>
      </div>
      <div className="sticky bottom-2 flex justify-between gap-2 items-center mt-3 z-20 pointer-events-none">
        <button onClick={chooseBest} className="pointer-events-auto text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 rounded-full shadow-lg text-xs font-black flex items-center gap-1"><Sparkles size={14} className="text-amber-300" /> Gợi ý ô tốt nhất</button>
        <div className="pointer-events-auto bg-white border border-slate-200 rounded-full p-1 flex shadow-md items-center">
          <button onClick={() => setZoom(v => Math.min(1.2, +(v + .1).toFixed(1)))} className="w-7 h-7 flex items-center justify-center"><Plus size={15} /></button>
          <button onClick={() => setZoom(v => Math.max(.8, +(v - .1).toFixed(1)))} className="w-7 h-7 flex items-center justify-center"><Minus size={15} /></button>
        </div>
      </div>
    </div>

    {selected && (
      <section className="shrink-0 z-20 max-h-[72dvh] overflow-y-auto bg-white rounded-t-3xl border-t border-slate-200 shadow-xl px-4 pt-4 pb-[calc(14px+env(safe-area-inset-bottom))]">
        <div className="space-y-3">
          <div className="flex justify-between items-start"><div>
            <p className="flex gap-2 items-center"><b className="text-xl">{selected.id}</b><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold">{nameOf(selected.type)}</span>
              <span className="text-emerald-700 text-[10px] font-bold flex gap-1 items-center"><CheckCircle2 size={13} /> Phù hợp xe</span></p>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>{car?.plate}</span>
              <span>·</span>
              <span>Giá giờ vào: <strong className="text-slate-800">{money(selectedRateInfo.rate)}/giờ</strong></span>
            </p>
          </div><button onClick={() => setSpotId(null)}><X size={18} className="text-slate-400" /></button></div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock3 size={13} className="text-blue-600" /> Thời gian đỗ xe
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                Thời lượng: {durationInfo?.text || "Chọn thời gian"}
              </span>
            </div>

            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
              <div className="grid grid-cols-1 gap-2">
                <DateTimePicker label="Giờ vào" value={startTime ? dayjs(startTime) : null}
                  onChange={(value) => setStartTime(value?.isValid() ? value.toDate().toISOString() : "")}
                  format="DD/MM/YYYY HH:mm" ampm={false} minutesStep={5} minDateTime={dayjs()} maxDateTime={dayjs().add(30, "day")}
                  slotProps={{ textField: { size: "small", fullWidth: true } }} />
                <DateTimePicker label="Giờ ra" value={endTime ? dayjs(endTime) : null}
                  onChange={(value) => setEndTime(value?.isValid() ? value.toDate().toISOString() : "")}
                  format="DD/MM/YYYY HH:mm" ampm={false} minutesStep={5}
                  minDateTime={startTime ? dayjs(startTime).add(1, "hour") : dayjs()}
                  slotProps={{ textField: { size: "small", fullWidth: true } }} />
              </div>
            </LocalizationProvider>
            {!durationInfo && startTime && endTime && <p role="alert" className="text-xs font-semibold text-rose-600">Thời gian đặt tối thiểu 1 giờ.</p>}
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">Lịch đặt ô {selected.id}</p>
                {selectedBookings.length > 0 && <button type="button" onClick={() => { setScheduleSpotId(selected.id); setShowLotSchedule(true); }} className="shrink-0 font-semibold text-blue-700 underline underline-offset-2">Xem chi tiết</button>}
              </div>
              {selectedBookings.length === 0 ? <p className="mt-1 text-emerald-700">Trống · Chưa có giờ nào được đặt</p> : <>
                <p className="mt-1 text-slate-500">{selectedBookings.length} lượt đã đặt{ownBookings.length > 0 ? ` · ${ownBookings.length} lượt của bạn` : ""}</p>
                {ownBookings.map((item, index) => <p key={`mine-${item.startTime}-${index}`} className="mt-1 leading-5 text-blue-700"><b>Bạn đã đặt:</b> {formatBookingTime(item.startTime)} → {formatBookingTime(item.endTime)}</p>)}
              </>}
            </div>
            {conflictingBookings.length > 0 && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">Ô này đã có người đặt trùng khoảng giờ bạn chọn ({formatBookingTime(conflictingBookings[0].startTime)} → {formatBookingTime(conflictingBookings[0].endTime)}). Vui lòng đổi giờ hoặc chọn ô khác.</p>}

            {/* Nút chọn nhanh */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 shrink-0">Chọn nhanh:</span>
              {[1, 2, 3, 4, 8].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => applyQuickHours(h)}
                  className={clsx(
                    "text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95",
                    durationInfo?.hours === h && !durationInfo?.isNextDay
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  +{h}h
                </button>
              ))}
            </div>

            {/* Chi tiết chi phí */}
            <div className="pt-2.5 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Phí dự kiến ({durationInfo?.hours || 0} giờ tính phí)</p>
                    <button
                      type="button"
                      onClick={() => setShowFeeBreakdown((v) => !v)}
                      className="text-[10px] text-blue-600 font-bold underline hover:text-blue-800"
                    >
                      {showFeeBreakdown ? "Ẩn chi tiết" : "Xem chi tiết"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {feeDetails.isCrossTier
                      ? `Bình quân: ${money(feeDetails.averageRate)}/giờ`
                      : `Đơn giá: ${money(feeDetails.averageRate)}/giờ`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl text-blue-600 font-black">{money(feeDetails.totalFee)}</p>
                  <p className="text-[10px] text-slate-500">Cọc: <b className="text-slate-800">{money(DEPOSIT)}</b></p>
                </div>
              </div>

              {/* Bảng chi tiết từng giờ */}
              {showFeeBreakdown && (
                <div className="mt-2.5 p-2 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase border-b pb-1 mb-1">
                    Chi tiết cước từng giờ:
                  </div>
                  {feeDetails.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] text-slate-600">
                      <span>• {item.hourLabel}</span>
                      <strong className="text-slate-900 font-mono">{money(item.rate)}</strong>
                    </div>
                  ))}
                  <div className="pt-1.5 border-t border-slate-100 flex justify-between font-bold text-slate-900 text-[11px]">
                    <span>Tổng cộng ({durationInfo?.hours || 0} giờ):</span>
                    <span className="text-blue-600">{money(feeDetails.totalFee)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => void reserve()} disabled={submitting || !!loadError || !selected.dbId || !durationInfo || !startTime || selected.status === "disabled" || (selected.status !== "empty" && new Date(startTime).getTime() <= Date.now()) || conflictingBookings.length > 0 || new Date(startTime).getTime() < Date.now() - 60_000} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 disabled:opacity-50">
            <Clock3 size={16} /> {submitting ? "Đang kiểm tra ô..." : "Tiếp tục đặt chỗ & thanh toán cọc"}</button>
        </div>
      </section>
    )}

    {showLotSchedule && <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={scheduleSpotId ? `Lịch đặt ô ${scheduleSpotId}` : "Lịch đặt cả bãi"}>
      <div className="w-full max-w-[430px] max-h-[85dvh] flex flex-col rounded-t-[24px] sm:rounded-[24px] bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-slate-100">
          <div className="min-w-0"><h2 className="text-base font-bold text-slate-900">{scheduleSpotId ? `Lịch đặt ô ${scheduleSpotId}` : "Lịch đặt cả bãi"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{lot.name} · {visibleSchedule.length} lượt đặt sắp tới</p></div>
          <button type="button" onClick={() => setShowLotSchedule(false)} aria-label="Đóng lịch đặt" className="shrink-0 p-1.5 rounded-full bg-slate-100 text-slate-600"><X size={17} /></button>
        </div>
        <div className="overflow-y-auto px-4 py-3 space-y-2">
          {visibleSchedule.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Chưa có lịch đặt sắp tới.</p> : visibleSchedule.map((item, index) =>
            <div key={`${item.spotId}-${item.startTime}-${index}`} className={clsx("rounded-xl border p-3", item.isMine ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white")}>
              <div className="flex items-center justify-between gap-2 text-xs"><b className="text-slate-900">Ô {item.spotId}</b>
                <span className={clsx("font-semibold", item.isMine ? "text-blue-700" : "text-slate-500")}>{item.isMine ? "Bạn đã đặt" : "Đã đặt"}</span></div>
              <p className="mt-1 text-xs leading-5 text-slate-700 break-words">{formatBookingTime(item.startTime)}<span className="mx-1 text-slate-400">→</span>{formatBookingTime(item.endTime)}</p>
            </div>)}
        </div>
      </div>
    </div>}

    {dialog && <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-[28px] sm:rounded-[28px] w-full max-w-[430px] max-h-[88dvh] overflow-y-auto p-5 pb-6 shadow-2xl">
        {dialog === "choose" ? <>
          <div className="flex items-start justify-between mb-4"><div><h2 className="text-lg font-black">Bạn đang đi xe nào?</h2>
            <p className="text-xs text-slate-500">Chọn xe trước để xem ô đỗ phù hợp.</p></div>
            <button onClick={() => setDialog(null)}><X size={19} /></button></div>
          {vehicles.length ? <div className="space-y-2">
            {vehicles.map(v => <button key={v.id} onClick={() => pickVehicle(v)} className="w-full text-left border border-slate-200 rounded-2xl p-3 flex gap-3 items-center bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 active:scale-[0.99] transition-all">
              {v.type === "EV" ? <BatteryCharging size={23} className="text-blue-600" /> : <CarFront size={23} className="text-blue-600" />}
              <span className="flex-1 min-w-0"><b className="text-sm block truncate">{v.name}</b><small className="text-slate-500">{v.plate} · {v.type === "EV" ? `EV ${v.evBodyType || "SUV"}` : v.type}</small></span>
              <ChevronRight size={18} className="text-slate-400" />
            </button>)}
          </div> : <p className="bg-slate-50 rounded-xl p-4 text-sm">Bạn chưa có xe. Hãy thêm xe vào hồ sơ.</p>}
          <Link href="/xe-cua-toi" className="block mt-4 rounded-xl bg-slate-100 text-center text-blue-700 font-bold py-3 text-sm">+ Quản lý / thêm xe</Link>
        </> : <>
          <div className="text-center mb-4"><BatteryCharging size={36} className="mx-auto text-blue-600 mb-2" />
            <h2 className="text-lg font-black">Xe điện có cần sạc không?</h2><p className="text-xs text-slate-500">{car?.name} · {car?.plate}</p></div>
          <button onClick={() => { setNeedsCharging(true); setSpotId(null); setDialog(null) }} className="w-full p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex gap-3 items-center text-left mb-3">
            <Zap size={23} className="text-emerald-600" /><span><b className="block text-sm">Có, tôi cần sạc</b><small className="text-emerald-700">Lọc ô sạc EV đang trống</small></span></button>
          <button onClick={() => { setNeedsCharging(false); setSpotId(null); setDialog(null) }} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl flex gap-3 items-center text-left">
            <CarFront size={23} className="text-blue-600" /><span><b className="block text-sm">Không cần sạc</b><small className="text-slate-600">Lọc ô thường theo kích thước xe</small></span></button>
          <button onClick={() => setDialog("choose")} className="block mx-auto mt-4 text-xs text-blue-600 font-bold">Đổi xe khác</button>
        </>}
      </div>
    </div>}
  </div>;
}
