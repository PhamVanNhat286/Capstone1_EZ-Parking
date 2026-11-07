"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown, BatteryCharging, CarFront, Check, CheckCircle2,
  ChevronLeft, Clock3, Heart, MapPin, Minus, Navigation2, Plus,
  RefreshCw, Sparkles, X, Zap,
} from "lucide-react";
import { getLotByIdApi, getLotSlotsApi } from "@/lib/api";
import { lots } from "@/lib/mock/lots";
import { clsx } from "clsx";
import { useStore, type Vehicle } from "@/store";
import ParkingSpotCard, { type Spot, type Kind, type Status } from "@/components/parking/ParkingSpotCard";

const money = (n: number) => Math.round(n).toLocaleString("vi-VN") + "đ";
const DEPOSIT = 50000;

// Chỉ dùng dữ liệu mẫu khi backend không trả về danh sách ô.
const fallbackStatus: Status[] = [
  "occupied", "empty", "empty", "holding", "empty", "empty",
  "empty", "occupied", "disabled", "empty", "empty", "occupied",
  "empty", "empty", "holding", "empty", "empty", "occupied",
  "empty", "empty",
];
const fallbackTypes: Kind[] = [
  "sedan", "sedan", "suv", "sedan", "ev", "sedan",
  "suv", "sedan", "sedan", "suv", "sedan", "ev",
  "suv", "sedan", "sedan", "ev", "suv", "sedan",
  "sedan", "suv",
];
function demoSpots(lotId: string): Spot[] {
  const count = lotId === "cau-rong" ? 16 : 20;
  return Array.from({ length: count }, (_, i) => ({
    id: `${i % 2 === 0 ? "A" : "B"}-${String(Math.floor(i / 2) + 1).padStart(2, "0")}`,
    type: fallbackTypes[i],
    status: fallbackStatus[i],
    rowIndex: Math.floor(i / 2), colIndex: i % 2,
    nearExit: i < 4,
  }));
}
function normalizeSlot(s: any): Spot {
  const type: Kind = s.type === "ev" || s.type === "suv" ? s.type : "sedan";
  const status: Status = s.status === "available" || s.status === "empty" ? "empty"
    : s.status === "occupied" || s.status === "holding" ? s.status : "disabled";
  return {
    id: String(s.id), type, status,
    rowIndex: s.rowIndex, colIndex: s.colIndex, nearExit: !!s.isElevator,
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

export default function ParkingMapPage() {
  const router = useRouter();
  const params = useParams();
  const lotId = String(params?.id || "hai-chau-a");
  const fallbackLot = lots.find((x) => x.id === lotId) || lots[0];
  const vehicles = useStore((s) => s.vehicles);
  const booking = useStore((s) => s.activeBooking);
  const holdSpot = useStore((s) => s.holdSpot);
  const toast = useStore((s) => s.addToast);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [lot, setLot] = useState({ name: fallbackLot.name, address: fallbackLot.address, price: fallbackLot.price });
  const [spots, setSpots] = useState<Spot[]>(() => demoSpots(lotId));
  const [isDemo, setIsDemo] = useState(true);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"choose" | "charge" | null>(null);
  const [vehicleInitialized, setVehicleInitialized] = useState(false);
  const [needsCharging, setNeedsCharging] = useState<boolean | null>(null);
  const [spotId, setSpotId] = useState<string | null>(null);
  const [hours, setHours] = useState(2);
  const [area, setArea] = useState<"all" | "left" | "right">("all");
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [zoom, setZoom] = useState(1);
  const [favorite, setFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const car = vehicles.find((v) => v.id === vehicleId) || null;

  useEffect(() => {
    if (vehicleInitialized) return;
    const defaultCar = vehicles.find((v) => v.isPrimary) || vehicles[0];
    if (defaultCar) setVehicleId(defaultCar.id);
    if (!defaultCar || vehicles.length > 1) setDialog("choose");
    else if (defaultCar.type === "EV") setDialog("charge");
    setVehicleInitialized(true);
  }, [vehicles, vehicleInitialized]);

  const refresh = useCallback(async () => {
    const [apiSpots, apiLot] = await Promise.all([getLotSlotsApi(lotId), getLotByIdApi(lotId)]);
    if (apiSpots.length) {
      setSpots(apiSpots.map(normalizeSlot));
      setIsDemo(false);
    } else {
      setSpots(demoSpots(lotId));
      setIsDemo(true);
    }
    if (apiLot) {
      const rate = Number(Array.isArray(apiLot.pricing_rules) ? apiLot.pricing_rules[0]?.hourly_rate : 0);
      setLot({ name: apiLot.name || fallbackLot.name, address: apiLot.address || fallbackLot.address,
        price: rate > 0 ? rate : fallbackLot.price });
    }
  }, [lotId, fallbackLot.name, fallbackLot.address, fallbackLot.price]);

  useEffect(() => {
    setSpotId(null);
    setLot({ name: fallbackLot.name, address: fallbackLot.address, price: fallbackLot.price });
    setSpots(demoSpots(lotId));
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [lotId, refresh, fallbackLot.name, fallbackLot.address, fallbackLot.price]);

  const displayed = useMemo(() => spots.map((spot) => {
    if (booking?.lotId !== lotId || booking.spotId !== spot.id ||
      !["holding", "paid", "entered"].includes(booking.status)) return spot;
    return { ...spot, status: (booking.status === "entered" ? "occupied" : "holding") as Status };
  }), [spots, booking, lotId]);

  const selected = displayed.find((s) => s.id === spotId) || null;
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
    if (selected && (selected.status !== "empty" || !isSuitable(selected, car, needsCharging))) setSpotId(null);
  }, [selected, car, needsCharging]);

  function pickVehicle(v: Vehicle) {
    setVehicleId(v.id); setSpotId(null);
    setNeedsCharging(null);
    setDialog(v.type === "EV" ? "charge" : null);
  }
  function pickSpot(s: Spot) {
    if (!car) { setDialog("choose"); return; }
    if (car.type === "EV" && needsCharging === null) { setDialog("charge"); return; }
    if (s.status !== "empty") {
      toast(s.status === "occupied" ? "Ô này đã có xe đỗ" : s.status === "holding"
        ? "Ô đang được người khác giữ" : "Ô đang bảo trì", "error");
      return;
    }
    if (!isSuitable(s, car, needsCharging)) { toast("Ô này không phù hợp với xe của bạn", "error"); return; }
    setSpotId(s.id); setHours(2);
  }
  function chooseBest() {
    if (!best) { toast("Không còn ô trống phù hợp", "error"); return; }
    setArea("all"); setFilter("all"); pickSpot(best);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function reserve() {
    if (!selected || !car || submitting) return;
    if (booking && ["holding", "paid", "entered"].includes(booking.status)) {
      toast("Bạn đã có một lượt đặt chỗ đang hoạt động", "error"); return;
    }
    setSubmitting(true);
    try {
      if (!isDemo) {
        const latest = await getLotSlotsApi(lotId);
        if (!latest.length || normalizeSlot(latest.find((x: any) => String(x.id) === selected.id) ||
          { id: selected.id, status: "disabled", type: "sedan" }).status !== "empty") {
          toast("Ô vừa thay đổi trạng thái, vui lòng chọn lại", "error");
          setSpotId(null); await refresh(); return;
        }
      }
      // Giữ chỗ theo luồng Zustand gốc. Đây chưa phải khóa ô thực trên backend.
      holdSpot(lotId, selected.id, car.id);
      // Lưu số giờ dự kiến mà không cần chỉnh file store/index.ts cũ.
      const newBooking = useStore.getState().activeBooking;
      if (newBooking) useStore.setState({ activeBooking: Object.assign({}, newBooking, { estimatedHours: hours }) });
      router.push(`/dat-cho/${encodeURIComponent(selected.id)}`);
    } finally { setSubmitting(false); }
  }

  function renderSpot(s: Spot | null, side: "left" | "right") {
    if (!s) return <div className="h-[80px]" />;
    const visible = (area === "all" || area === side) && (filter === "all" || s.type === filter);
    return <ParkingSpotCard key={s.id} spot={s} visible={visible}
      compatible={isSuitable(s, car, needsCharging)} selected={selected?.id === s.id}
      recommended={best?.id === s.id && !selected} pricePerHour={lot.price}
      onSelect={() => pickSpot(s)} />;
  }

  return <div className="h-full min-h-[530px] flex flex-col bg-slate-100 text-slate-800 overflow-hidden">
    <style>{`@keyframes ez-drive { 0% {top:30px;opacity:0} 10% {opacity:1} 85% {opacity:1} 100% {top:calc(100% - 45px);opacity:0} }`}</style>
    <header className="shrink-0 bg-white px-4 pt-3 pb-2 shadow-sm z-20">
      <div className="flex justify-between gap-2 items-center">
        <button onClick={() => router.push("/")} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><ChevronLeft size={21}/></button>
        <div className="min-w-0 flex-1 text-center"><h1 className="font-black text-base text-slate-900 truncate">{lot.name}</h1>
          <p className="text-[11px] text-slate-500 truncate"><MapPin size={11} className="inline mr-1"/>{lot.address}</p></div>
        <button onClick={() => setFavorite(!favorite)} className={clsx("w-9 h-9 rounded-full flex items-center justify-center", favorite ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-500")}>
          <Heart size={19} fill={favorite ? "currentColor" : "none"}/></button>
      </div>
      <button onClick={() => setDialog("choose")} className="w-full mt-2 rounded-xl bg-blue-50 border border-blue-100 p-2.5 flex justify-between items-center gap-2 text-left">
        <div className="flex items-center gap-2 min-w-0"><CarFront size={20} className="text-blue-600 shrink-0"/>
          <div className="min-w-0"><p className="text-xs font-bold text-blue-950 truncate">{car ? `${car.name} · ${car.plate}` : "Chọn xe của bạn"}</p>
            <p className="text-[10px] text-blue-700 truncate">{car?.type === "EV" ? needsCharging === null ? "Chưa chọn nhu cầu sạc" : needsCharging ? "Xe điện · cần sạc" : "Xe điện · không sạc" : car?.type || "Chọn loại xe"} · {matching} ô phù hợp</p></div></div>
        <span className="shrink-0 bg-white text-blue-700 border border-blue-200 rounded-lg px-2 py-1 text-[10px] font-bold">Đổi xe</span>
      </button>
    </header>

    <div className="shrink-0 bg-white px-3 py-2 border-b border-slate-200 space-y-2 z-10">
      <div className="rounded-xl bg-slate-100 p-1 flex gap-1">
        {([ ["all", "Toàn bãi"], ["left", "Dãy trái"], ["right", "Dãy phải"] ] as const).map(([v, label]) =>
          <button key={v} onClick={() => {setArea(v);setSpotId(null)}} className={clsx("flex-1 rounded-lg py-1.5 text-[11px] font-bold", area === v ? "bg-blue-600 text-white" : "text-slate-600")}>{label}</button>)}
      </div>
      <div className="flex justify-between items-center gap-1 text-[10px] font-semibold">
        <span className="text-emerald-700">🟢 Trống ({freeCount})</span><span className="text-rose-600">🔴 Đã đỗ ({occupiedCount})</span>
        <span className="text-amber-700">🟡 Giữ ({holdingCount})</span><span className="text-slate-500">⚪ Bảo trì</span>
      </div>
      <div className="flex overflow-x-auto gap-1.5">
        {([ ["all", "Tất cả"], ["sedan", "🚗 Sedan"], ["suv", "🚙 SUV"], ["ev", "⚡ EV"] ] as const).map(([v, label]) =>
          <button key={v} onClick={() => {setFilter(v);setSpotId(null)}} className={clsx("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
            filter === v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700")}>{label}</button>)}
        <button onClick={() => void refresh()} className="ml-auto bg-slate-100 rounded-full px-2"><RefreshCw size={14}/></button>
      </div>
    </div>

    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-slate-100 px-3 pt-3 pb-3">
      <div className="flex justify-between items-center gap-2 mb-2 text-[10px] font-semibold">
        <span className="bg-white border border-slate-200 rounded-lg px-2 py-1.5">↕ Lối đi · Thang máy</span>
        <span className={clsx("rounded-lg px-2 py-1.5 border", isDemo ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>{isDemo ? "Dữ liệu mẫu" : "Dữ liệu API"}</span>
      </div>
      <div className="relative bg-slate-200 rounded-2xl border border-slate-300 p-2.5 overflow-hidden shadow-inner">
        <div className="absolute left-1/2 top-0 bottom-0 w-12 -translate-x-1/2 bg-slate-300 border-x-2 border-dashed border-white flex flex-col items-center justify-between py-4 pointer-events-none">
          <span className="text-[9px] bg-white rounded px-1 font-black text-blue-700">VÀO</span>
          <span style={{animation:"ez-drive 12s linear infinite"}} className="absolute left-1/2 -translate-x-1/2 top-8 w-4 h-8 bg-blue-600 rounded shadow border border-white flex flex-col items-center p-0.5">
            <span className="bg-sky-200 h-1 w-3 rounded"/></span>
          <span className="rounded-full bg-white border border-rose-500 w-6 h-6 flex items-center justify-center text-[10px] font-black">5</span>
          <ArrowDown size={18} className="text-white"/><span className="text-[9px] bg-white rounded px-1 text-rose-600 font-black">RA</span>
        </div>
        <div className="relative z-10 space-y-2.5 transition-transform" style={{transform:`scale(${zoom})`,transformOrigin:"top center"}}>
          {rows.map(([a,b],i) => <div key={i} className="grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] gap-1 items-center">
            {renderSpot(a,"left")}<div/>{renderSpot(b,"right")}</div>)}
          {rows.length === 0 && <p className="bg-white rounded-xl text-center p-5 text-sm">Bãi này chưa có dữ liệu ô đỗ.</p>}
        </div>
      </div>
      <div className="sticky bottom-2 flex justify-between gap-2 items-center mt-3 z-20 pointer-events-none">
        <button onClick={chooseBest} className="pointer-events-auto text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 rounded-full shadow-lg text-xs font-black flex items-center gap-1"><Sparkles size={14} className="text-amber-300"/> Gợi ý ô tốt nhất</button>
        <div className="pointer-events-auto bg-white border border-slate-200 rounded-full p-1 flex shadow-md items-center">
          <button onClick={() => setZoom(v => Math.min(1.2, +(v+.1).toFixed(1)))} className="w-7 h-7 flex items-center justify-center"><Plus size={15}/></button>
          <button onClick={() => setZoom(v => Math.max(.8, +(v-.1).toFixed(1)))} className="w-7 h-7 flex items-center justify-center"><Minus size={15}/></button>
          <button onClick={() => {setZoom(1);scrollRef.current?.scrollTo({top:0,behavior:"smooth"})}} className="w-7 h-7 flex items-center justify-center"><Navigation2 size={14}/></button>
        </div>
      </div>
    </div>

    <section className="shrink-0 z-20 bg-white rounded-t-3xl border-t border-slate-200 shadow-xl px-5 pt-2 pb-[calc(14px+env(safe-area-inset-bottom))]">
      <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"/>
      {selected ? <div className="space-y-3">
        <div className="flex justify-between items-start"><div>
          <p className="flex gap-2 items-center"><b className="text-xl">{selected.id}</b><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold">{nameOf(selected.type)}</span>
            <span className="text-emerald-700 text-[10px] font-bold flex gap-1 items-center"><CheckCircle2 size={13}/> Phù hợp xe</span></p>
          <p className="text-[11px] text-slate-500 mt-1">{car?.plate} · {money(lot.price)}/giờ</p>
        </div><button onClick={() => setSpotId(null)}><X size={18} className="text-slate-400"/></button></div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex justify-between items-center gap-2">
          <div><p className="text-[10px] font-bold uppercase text-slate-500">Thời lượng dự kiến</p>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setHours(v => Math.max(1,v-1))} className="w-8 h-8 rounded-lg border border-slate-300 bg-white flex items-center justify-center"><Minus size={14}/></button>
              <span className="text-sm font-black min-w-[44px] text-center">{hours} giờ</span>
              <button onClick={() => setHours(v => Math.min(24,v+1))} className="w-8 h-8 rounded-lg border border-slate-300 bg-white flex items-center justify-center"><Plus size={14}/></button>
            </div>
          </div><div className="border-l pl-3 text-right"><p className="text-[10px] font-bold uppercase text-slate-500">Phí dự kiến</p>
            <p className="text-lg text-blue-600 font-black">{money(lot.price * hours)}</p>
            <p className="text-[10px] text-slate-500">Cọc: <b className="text-slate-800">{money(DEPOSIT)}</b></p></div>
        </div>
        <button onClick={() => void reserve()} disabled={submitting} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 disabled:opacity-50">
          <Clock3 size={16}/> {submitting ? "Đang kiểm tra ô..." : "Tiếp tục đặt chỗ & thanh toán cọc"}</button>
      </div> : <div className="flex justify-between items-center gap-3 py-1">
        <div className="min-w-0 flex gap-2 items-center"><span className="shrink-0 bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center font-black text-blue-600">P</span>
          <div className="min-w-0"><p className="text-sm font-black truncate">{matching} ô trống phù hợp</p><p className="text-[11px] text-slate-500 truncate">Chọn ô để xem số giờ và tiền cọc</p></div></div>
        <button onClick={chooseBest} disabled={!best} className="shrink-0 bg-blue-600 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl px-3 py-2.5">Chọn nhanh</button>
      </div>}
    </section>

    {dialog && <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-[28px] sm:rounded-[28px] w-full max-w-[430px] max-h-[88dvh] overflow-y-auto p-5 pb-6 shadow-2xl">
        {dialog === "choose" ? <>
          <div className="flex items-start justify-between mb-4"><div><h2 className="text-lg font-black">Bạn đang đi xe nào?</h2>
            <p className="text-xs text-slate-500">Chọn xe trước để xem ô đỗ phù hợp.</p></div>
            {!!car && <button onClick={() => setDialog(null)}><X size={19}/></button>}</div>
          {vehicles.length ? <div className="space-y-2">
            {vehicles.map(v => <button key={v.id} onClick={() => pickVehicle(v)} className={clsx("w-full text-left border-2 rounded-2xl p-3 flex gap-3 items-center",
              vehicleId === v.id ? "bg-blue-50 border-blue-500" : "bg-slate-50 border-slate-200") }>
              {v.type === "EV" ? <BatteryCharging size={23} className="text-blue-600"/> : <CarFront size={23} className="text-blue-600"/>}
              <span className="flex-1 min-w-0"><b className="text-sm block truncate">{v.name}</b><small className="text-slate-500">{v.plate} · {v.type === "EV" ? `EV ${v.evBodyType || "SUV"}` : v.type}</small></span>
              {vehicleId === v.id && <Check size={17} className="text-blue-600"/>}</button>)}
          </div> : <p className="bg-slate-50 rounded-xl p-4 text-sm">Bạn chưa có xe. Hãy thêm xe vào hồ sơ.</p>}
          <Link href="/xe-cua-toi" className="block mt-4 rounded-xl bg-slate-100 text-center text-blue-700 font-bold py-3 text-sm">+ Quản lý / thêm xe</Link>
        </> : <>
          <div className="text-center mb-4"><BatteryCharging size={36} className="mx-auto text-blue-600 mb-2"/>
            <h2 className="text-lg font-black">Xe điện có cần sạc không?</h2><p className="text-xs text-slate-500">{car?.name} · {car?.plate}</p></div>
          <button onClick={() => {setNeedsCharging(true);setSpotId(null);setDialog(null)}} className="w-full p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex gap-3 items-center text-left mb-3">
            <Zap size={23} className="text-emerald-600"/><span><b className="block text-sm">Có, tôi cần sạc</b><small className="text-emerald-700">Lọc ô sạc EV đang trống</small></span></button>
          <button onClick={() => {setNeedsCharging(false);setSpotId(null);setDialog(null)}} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl flex gap-3 items-center text-left">
            <CarFront size={23} className="text-blue-600"/><span><b className="block text-sm">Không cần sạc</b><small className="text-slate-600">Lọc ô thường theo kích thước xe</small></span></button>
          <button onClick={() => setDialog("choose")} className="block mx-auto mt-4 text-xs text-blue-600 font-bold">Đổi xe khác</button>
        </>}
      </div>
    </div>}
  </div>;
}
