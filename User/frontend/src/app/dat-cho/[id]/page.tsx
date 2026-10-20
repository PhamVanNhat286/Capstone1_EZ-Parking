"use client";
import { useState, useEffect, useMemo, use } from "react";
import { ChevronLeft, CarFront, Clock, Check, Lock, Info, Pencil, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { clsx } from "clsx";
import BottomSheet from "@/components/ui/BottomSheet";
import { getLotByAnyId } from "@/lib/mock/lots";

const DEPOSIT = 50000;
const PEAK_START = 17 * 60; // 17:00
const PEAK_END = 19 * 60; // 19:00
const PEAK_SURCHARGE = 5000; // đ/giờ

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) => {
  const t = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const nowHHMM = () => {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const activeBooking = useStore((s) => s.activeBooking);
  const addToast = useStore((s) => s.addToast);
  const releaseSpot = useStore((s) => s.releaseSpot);
  const vehicles = useStore((s) => s.vehicles);

  const [method, setMethod] = useState<"vnpay" | "momo" | "card">("vnpay");
  const [, setNow] = useState(0);
  const [sheet, setSheet] = useState<"none" | "expired" | "leave" | "time">("none");
  const [hours, setHours] = useState(2);
  const [entryTime, setEntryTime] = useState("");
  const [draftHours, setDraftHours] = useState(2);
  const [draftEntry, setDraftEntry] = useState("");
  const [agree, setAgree] = useState(true);

  useEffect(() => {
    setEntryTime(nowHHMM());
    const h = Number(new URLSearchParams(window.location.search).get("h"));
    if (h >= 1 && h <= 24) setHours(h);
  }, []);

  const isHolding = !!activeBooking && activeBooking.status === "holding";
  const timeLeft = isHolding ? Math.max(0, Math.floor((activeBooking!.holdExpiresAt - Date.now()) / 1000)) : 0;

  // Mỗi giây render lại để đồng hồ chạy
  useEffect(() => {
    if (!isHolding) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isHolding]);

  useEffect(() => {
    if (isHolding && timeLeft === 0) setSheet("expired");
  }, [isHolding, timeLeft]);

  const lot = useMemo(() => getLotByAnyId(activeBooking?.lotId), [activeBooking?.lotId]);
  const spotId = activeBooking?.spotId || id;

  const pricing = useMemo(() => {
    const start = entryTime ? toMinutes(entryTime) : 0;
    const end = start + hours * 60;
    const peakMin = Math.max(0, Math.min(end, PEAK_END) - Math.max(start, PEAK_START));
    const base = lot.price * hours;
    const surcharge = Math.round((peakMin / 60) * PEAK_SURCHARGE);
    const total = base + surcharge;
    return { peakHours: peakMin / 60, base, surcharge, total, remain: Math.max(0, total - DEPOSIT) };
  }, [entryTime, hours, lot.price]);

  // Không có phiên giữ chỗ: hiện thông báo thay vì trang trắng
  if (!activeBooking || activeBooking.status !== "holding") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
          <Clock size={28} />
        </div>
        <h2 className="text-lg font-black text-slate-900 mb-1">Không có ô nào đang được giữ</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-[280px]">
          Phiên giữ chỗ đã hết hạn hoặc chưa được tạo. Hãy chọn lại ô đỗ để tiếp tục.
        </p>
        <button onClick={() => router.push("/")} className="w-full max-w-[280px] bg-brand-600 text-white font-bold py-3.5 rounded-xl active:scale-95 transition">
          Chọn ô đỗ
        </button>
        {activeBooking?.status === "paid" && (
          <button onClick={() => router.push(`/ve/${activeBooking.id}`)} className="w-full max-w-[280px] mt-3 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl active:scale-95 transition">
            Xem vé đã đặt
          </button>
        )}
      </div>
    );
  }

  const lotRoute = `/bai/${activeBooking.lotId || lot.id}`;

  const handlePayment = () => {
    if (!agree) {
      addToast("Vui lòng đồng ý điều khoản EZ-Space", "error");
      return;
    }
    router.push(`/thanh-toan/${method}`);
  };

  const handleLeave = () => {
    releaseSpot();
    setSheet("none");
    router.push(lotRoute);
  };

  const openTimeSheet = () => {
    setDraftEntry(entryTime);
    setDraftHours(hours);
    setSheet("time");
  };

  const saveTime = () => {
    if (draftEntry) setEntryTime(draftEntry);
    setHours(draftHours);
    setSheet("none");
    addToast("Đã cập nhật thời gian dự kiến", "success");
  };

  const formatTimer = (sec: number) =>
    `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;

  const bookedVehicle =
    vehicles.find((v) => v.id === activeBooking.vehicleId) || vehicles.find((v) => v.isPrimary) || vehicles[0];

  const startMin = entryTime ? toMinutes(entryTime) : 0;
  const exitTime = entryTime ? toHHMM(startMin + hours * 60) : "--:--";
  const deadlineTime = entryTime ? toHHMM(startMin + 20) : "--:--";
  const peakPct = Math.min(100, Math.round((pricing.peakHours / hours) * 100));

  const methods = [
    { key: "vnpay" as const, name: "VNPAY QR", desc: "Ví VNPAY, QR Ngân hàng, Thẻ nội địa", badge: "Đề xuất" },
    { key: "momo" as const, name: "Ví MoMo", desc: "Xác thực 1 chạm tức thì" },
    { key: "card" as const, name: "Thẻ Quốc Tế", desc: "Visa, Mastercard, JCB" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 pb-36">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-30 px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
        <button onClick={() => setSheet("leave")} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <h1 className="text-[16px] font-bold text-slate-900 leading-tight">Thanh toán cọc</h1>
          <p className="text-[11px] text-slate-500 font-medium">Hoàn tất trong 10 phút để giữ ô đỗ</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="p-4 space-y-3.5 max-w-md mx-auto">
        {/* Banner đếm ngược */}
        <article className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-12 h-11 bg-white rounded-xl border border-amber-200">
              <span className={clsx("text-[13px] font-extrabold font-mono tabular-nums", timeLeft <= 60 ? "text-rose-600" : "text-amber-700")}>
                {formatTimer(timeLeft)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                <p className="text-[12px] font-bold text-amber-900 leading-tight">Ô {spotId} đang được giữ cho bạn</p>
              </div>
              <p className="text-[10px] text-amber-700/90 mt-0.5">Hết giờ ô sẽ tự động mở lại cho xe khác</p>
            </div>
          </div>
          <button onClick={() => setSheet("leave")} className="text-[11px] font-bold text-rose-600 bg-white px-2.5 py-1.5 rounded-lg border border-rose-200 active:scale-95 transition">
            Hủy
          </button>
        </article>

        {/* Thẻ ô đỗ */}
        <article className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] border border-slate-100">
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 font-extrabold flex items-center justify-center text-[18px] border border-blue-100">P</div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">{lot.name}</h2>
                <p className="text-[11px] text-slate-500 font-medium">{lot.address}</p>
              </div>
            </div>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đang giữ
            </span>
          </div>

          <div className="mt-3.5 bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[19px] font-extrabold text-brand-700 tracking-tight bg-blue-100/70 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {spotId}
              </span>
              <button onClick={() => router.push(lotRoute)} className="block mt-2 text-[11px] font-bold text-brand-600 active:scale-95">
                Đổi ô khác
              </button>
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="grid grid-cols-3 gap-1 bg-white p-1.5 rounded-lg border border-slate-200">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className={clsx(
                      "relative w-3 h-3 rounded-sm",
                      i === 4 ? "bg-brand-600" : i === 1 || i === 6 ? "bg-rose-200" : "bg-slate-200"
                    )}
                  >
                    {i === 4 && <span className="absolute inset-0 rounded-sm bg-brand-600 animate-ping opacity-60" />}
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-slate-400 font-medium leading-tight">Vị trí<br /><span className="text-slate-600 font-semibold">trên sơ đồ</span></div>
            </div>
          </div>

          {bookedVehicle && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-white px-2 py-0.5 rounded text-center border-[2.5px] border-slate-900">
                  <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider -mb-0.5">VIETNAM</div>
                  <div className="text-[12px] font-mono font-extrabold text-slate-900 tracking-wider">{bookedVehicle.plate}</div>
                </div>
                <p className="text-[12px] font-bold text-slate-800 leading-tight flex items-center gap-1">
                  <CarFront size={14} className="text-brand-600" /> {bookedVehicle.name}
                </p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-1 rounded-md">
                {bookedVehicle.type === "EV" ? `EV (${bookedVehicle.evBodyType || "SUV"})` : bookedVehicle.type}
              </span>
            </div>
          )}
        </article>

        {/* Thời gian đỗ */}
        <article className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Clock size={16} className="text-brand-600" />
              <h3 className="text-[13px] font-bold text-slate-900">Thời gian đỗ dự kiến</h3>
            </div>
            <button onClick={openTimeSheet} className="text-[11px] font-bold text-brand-600 flex items-center gap-1 active:scale-95">
              <Pencil size={13} /> Chỉnh sửa
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex justify-between items-center">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-medium block">Giờ vào dự kiến</span>
                <span className="text-[16px] font-extrabold text-slate-900">{entryTime || "--:--"}</span>
              </div>
              <div className="flex-1 mx-3 flex flex-col items-center">
                <div className="relative w-full flex items-center">
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200">
                    <div className="h-full bg-brand-500" style={{ width: `${100 - peakPct}%` }} />
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${peakPct}%` }} />
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 -top-3.5 bg-brand-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {hours} giờ
                  </div>
                </div>
                {pricing.peakHours > 0 && (
                  <span className="text-[9px] text-amber-600 font-semibold mt-2.5 text-center">
                    ⚡ Có {pricing.peakHours.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}h cao điểm 17:00–19:00 (+{PEAK_SURCHARGE.toLocaleString("vi-VN")}đ/h)
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium block">Giờ ra dự kiến</span>
                <span className="text-[16px] font-extrabold text-slate-900">{exitTime}</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex items-start gap-2 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
            <Info size={16} className="text-brand-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-tight">
              Sau khi cọc, bạn có <strong className="text-slate-900 font-semibold">20 phút</strong> để đến bãi. Quá hạn hệ thống sẽ tự động hủy và không hoàn cọc.
            </p>
          </div>
        </article>

        {/* Phương thức thanh toán */}
        <article className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-slate-900">Phương thức thanh toán</h3>
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">Sandbox Test</span>
          </div>
          <div className="space-y-2.5">
            {methods.map((m) => {
              const active = method === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={clsx(
                    "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all active:scale-[0.98]",
                    active ? "border-2 border-brand-600 bg-blue-50/40" : "border border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {m.key === "vnpay" ? (
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-[11px] text-blue-700">VNP</div>
                    ) : m.key === "momo" ? (
                      <div className="w-9 h-9 rounded-lg bg-[#A50064] text-white flex items-center justify-center font-bold text-[14px]">M</div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                        <CreditCard size={18} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-slate-900">{m.name}</span>
                        {m.badge && <span className="text-[9px] font-bold bg-blue-100 text-brand-700 px-1.5 rounded">{m.badge}</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">{m.desc}</p>
                    </div>
                  </div>
                  <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center", active ? "border-brand-600" : "border-slate-300")}>
                    {active && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </article>

        {/* Hóa đơn */}
        <article className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] border border-slate-100 overflow-hidden">
          <div className="p-4 pb-3 space-y-2">
            <h3 className="text-[13px] font-bold text-slate-900 mb-2.5">Chi tiết giá tạm tính</h3>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Đơn giá tiêu chuẩn</span>
              <span className="font-semibold text-slate-800">{formatVND(lot.price)} / giờ</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Thời lượng dự kiến ({hours} giờ)</span>
              <span className="font-semibold text-slate-800">{formatVND(pricing.base)}</span>
            </div>
            {pricing.surcharge > 0 && (
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Phụ thu giờ cao điểm</span>
                <span className="font-semibold text-amber-600">+{formatVND(pricing.surcharge)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 flex justify-between text-[13px] font-bold text-slate-900">
              <span>Tạm tính tổng phiên đỗ</span>
              <span>{formatVND(pricing.total)}</span>
            </div>
          </div>

          {/* Đường xé vé */}
          <div className="relative h-3 border-t border-dashed border-slate-300 bg-white">
            <span className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-slate-100" />
            <span className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-slate-100" />
          </div>

          <div className="p-4 pt-1 bg-gradient-to-b from-white to-blue-50/40">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Tiền cọc thanh toán ngay</span>
                <span className="text-[10px] text-slate-400 font-medium">Đảm bảo khóa giữ ô {spotId}</span>
              </div>
              <span className="text-[20px] font-extrabold text-brand-600">{DEPOSIT.toLocaleString("vi-VN")}<span className="text-[14px]">đ</span></span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-snug mt-2 bg-blue-50/60 p-2 rounded-lg border border-blue-100/70">
              ℹ️ Tiền cọc sẽ được <strong className="text-slate-800 font-semibold">khấu trừ trực tiếp</strong> vào tổng phí khi xe rời bãi.
              {pricing.remain > 0 && <> Phần còn lại ({formatVND(pricing.remain)}) thanh toán khi check-out.</>}
            </p>
          </div>
        </article>

        {/* Điều khoản */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none px-1 pb-2">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-brand-600" />
          <span className="text-[11px] text-slate-600 leading-normal">
            Tôi đồng ý với <span className="text-brand-600 font-bold">Điều khoản EZ-Space</span> và hiểu rõ chính sách không hoàn lại tiền cọc nếu đến bãi trễ quá 20 phút.
          </span>
        </label>
      </div>

      {/* Thanh thanh toán cố định */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-3 pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 px-3.5 border border-slate-200/80 shadow-[0_12px_36px_-4px_rgba(37,99,235,0.22)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block -mb-0.5">Tiền cọc giữ chỗ</span>
            <span className="text-[20px] font-extrabold text-brand-600">{DEPOSIT.toLocaleString("vi-VN")}<span className="text-[12px] font-bold">đ</span></span>
          </div>
          <button
            onClick={handlePayment}
            className="h-11 px-6 bg-gradient-to-r from-brand-600 to-brand-700 active:scale-95 text-white font-bold text-[13px] rounded-xl flex items-center gap-2 shadow-md transition"
          >
            <Lock size={15} /> Xác nhận cọc
          </button>
        </div>
      </div>

      {/* Chỉnh sửa giờ đỗ */}
      <BottomSheet isOpen={sheet === "time"} onClose={() => setSheet("none")} title="Chỉnh sửa giờ đỗ xe">
        <p className="text-[12px] text-slate-500 mb-4">Điều chỉnh để hệ thống tính lại biểu phí.</p>
        <label className="text-[11px] font-bold text-slate-700 block mb-1">Giờ vào dự kiến</label>
        <input
          type="time"
          value={draftEntry}
          onChange={(e) => setDraftEntry(e.target.value)}
          className="w-full text-[14px] font-bold text-slate-900 bg-slate-50 rounded-xl border border-slate-200 py-2.5 px-3 mb-4"
        />
        <label className="text-[11px] font-bold text-slate-700 block mb-1">Thời lượng đỗ dự kiến</label>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 8, 12].map((h) => (
            <button
              key={h}
              onClick={() => setDraftHours(h)}
              className={clsx(
                "py-2 rounded-lg text-[12px] font-bold active:scale-95 transition",
                draftHours === h ? "border-2 border-brand-600 bg-blue-50 text-brand-700" : "border border-slate-200 bg-slate-50 text-slate-700"
              )}
            >
              {h} giờ
            </button>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={() => setSheet("none")} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-[13px]">Hủy</button>
          <button onClick={saveTime} className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold text-[13px] flex items-center justify-center gap-1.5">
            <Check size={15} /> Cập nhật
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={sheet === "expired"} onClose={() => {}} title="Đã hết thời gian giữ chỗ">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={24} />
          </div>
          <p className="text-sm font-medium text-slate-600">Thời gian giữ chỗ của bạn đã hết. Ô đỗ này đã được tự động giải phóng cho người khác.</p>
        </div>
        <button onClick={handleLeave} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform">
          Chọn lại ô
        </button>
      </BottomSheet>

      <BottomSheet isOpen={sheet === "leave"} onClose={() => setSheet("none")} title="Nhả ô và rời đi?">
        <div className="text-center mb-6">
          <p className="text-sm font-medium text-slate-600">Bạn chưa thanh toán cọc. Nếu rời đi, ô này sẽ bị hủy giữ chỗ ngay lập tức.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSheet("none")} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95">Ở lại</button>
          <button onClick={handleLeave} className="flex-1 bg-red-500 text-white font-bold py-4 rounded-[16px] active:scale-95">Đồng ý nhả</button>
        </div>
      </BottomSheet>
    </div>
  );
}