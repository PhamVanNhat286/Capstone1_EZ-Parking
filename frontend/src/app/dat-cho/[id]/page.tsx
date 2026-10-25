"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, CalendarClock, CarFront, Check, ChevronRight, Clock3, CreditCard, Info, MapPin, Minus, Plus, ShieldCheck, Wallet, X } from "lucide-react";
import { getLotByIdApi } from "@/lib/api";
import { lots } from "@/lib/mock/lots";
import { useStore } from "@/store";

const DEPOSIT = 50_000;
const money = (n: number) => Math.max(0, Math.round(n)).toLocaleString("vi-VN") + "đ";
const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
type Method = "vnpay" | "momo" | "card";

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const booking = useStore((s) => s.activeBooking);
  const vehicles = useStore((s) => s.vehicles);
  const releaseSpot = useStore((s) => s.releaseSpot);
  const setBookingHours = useStore((s) => s.setBookingHours);
  const addToast = useStore((s) => s.addToast);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [method, setMethod] = useState<Method>("vnpay");
  const [agree, setAgree] = useState(false);
  const [editHours, setEditHours] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const fallback = lots.find((l) => l.id === booking?.lotId) || lots[0];
  const [lotName, setLotName] = useState(fallback.name);
  const [address, setAddress] = useState(fallback.address);
  const [rate, setRate] = useState(fallback.price);
  const hours = booking?.estimatedHours || 2;
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const valid = booking?.status === "holding" && booking.spotId === decodeURIComponent(id);
  const remaining = valid ? Math.max(0, Math.ceil((booking.holdExpiresAt - now) / 1000)) : 0;
  const paid = booking?.status === "paid";

  useEffect(() => { setReady(true); const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!booking?.lotId) return;
    const fallbackLot = lots.find((l) => l.id === booking.lotId) || lots[0];
    setLotName(fallbackLot.name); setAddress(fallbackLot.address); setRate(fallbackLot.price);
    let cancelled = false;
    void getLotByIdApi(booking.lotId).then((lot) => {
      if (!lot || cancelled) return;
      setLotName(lot.name || fallbackLot.name);
      setAddress(lot.address || fallbackLot.address);
      const price = Number(lot.pricing_rules?.[0]?.hourly_rate || lot.price || 0);
      if (price > 0) setRate(price);
    });
    return () => { cancelled = true; };
  }, [booking?.lotId]);

  const returnToLot = () => { releaseSpot(); router.replace(`/bai/${booking?.lotId || "hai-chau-a"}`); };
  const proceed = () => {
    if (!booking || !valid || remaining <= 0) { addToast("Giữ chỗ đã hết hạn. Vui lòng chọn ô khác.", "error"); return; }
    if (!agree) { addToast("Vui lòng xác nhận chính sách giữ chỗ trước khi tiếp tục", "error"); return; }
    router.push(`/thanh-toan/${method}`);
  };

  if (!ready) return <div className="min-h-full flex items-center justify-center text-slate-500">Đang tải đặt chỗ...</div>;
  if (paid && booking) return <div className="min-h-full bg-slate-50 p-6 text-center"><p className="font-bold text-slate-900">Khoản cọc đã được xác nhận.</p><button onClick={() => router.replace(`/ve/${booking.id}`)} className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-bold text-white">Xem vé của bạn</button></div>;
  if (!valid || !booking) return <div className="min-h-full bg-slate-50 p-6 flex flex-col justify-center text-center"><h2 className="text-xl font-extrabold">Không có ô đang giữ</h2><p className="text-slate-500 text-sm mt-2">Vui lòng chọn ô đỗ trước khi thanh toán cọc.</p><button onClick={() => router.replace("/")} className="mt-5 bg-blue-600 text-white rounded-2xl py-3 font-bold">Tìm bãi đỗ</button></div>;

  return <div className="min-h-full bg-[#f1f5f9] text-slate-900 pb-32">
    <header className="bg-white sticky top-0 z-20 border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
      <button aria-label="Quay lại" onClick={() => setConfirmLeave(true)} className="w-9 h-9 bg-slate-100 rounded-full grid place-items-center"><ArrowLeft size={19}/></button>
      <div className="text-center"><h1 className="font-extrabold text-base">Thanh toán cọc</h1><p className="text-[11px] text-slate-500">Hoàn tất để giữ ô đỗ của bạn</p></div>
      <span className="text-[10px] rounded-lg bg-blue-50 text-blue-700 font-bold px-2 py-1">EZ-Space</span>
    </header>
    <div className="p-4 space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="h-12 w-12 bg-white rounded-full grid place-items-center shrink-0 text-amber-600"><Clock3 size={23}/></div>
        <div className="flex-1 min-w-0"><p className="text-sm font-extrabold text-amber-950">Ô {booking.spotId} đang được giữ</p><p className="text-[11px] text-amber-700">Hết giờ ô sẽ tự động mở lại</p></div>
        <div className="text-right"><p className="text-xl font-black tabular-nums text-amber-700">{clock(remaining)}</p><button onClick={() => setConfirmLeave(true)} className="text-xs underline text-amber-900">Hủy</button></div>
      </div>
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-4 flex gap-3 items-start"><div className="w-11 h-11 shrink-0 bg-blue-50 text-blue-600 rounded-xl grid place-items-center"><Building2 size={22}/></div><div className="min-w-0 flex-1"><h2 className="text-base font-extrabold">{lotName}</h2><p className="text-xs text-slate-500 mt-1 flex items-start gap-1"><MapPin size={13} className="shrink-0 mt-0.5"/>{address}</p></div></div>
        <div className="mx-4 border-t border-dashed border-slate-200"/>
        <div className="px-4 py-3 flex items-center justify-between"><div><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vị trí giữ chỗ</span><div className="mt-1 flex items-center gap-2"><b className="text-2xl text-blue-700">{booking.spotId}</b><span className="text-[11px] bg-green-100 text-green-800 rounded-full px-2 py-1 font-bold">Đang giữ</span></div></div><span className="text-sm font-bold text-slate-600">{vehicle?.type === "EV" ? "⚡ EV" : vehicle?.type === "SUV" ? "🚙 SUV" : "🚗 Sedan"}</span></div>
        <div className="mx-4 mb-4 bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-3"><CarFront size={20} className="text-blue-600"/><div className="flex-1 min-w-0"><p className="font-extrabold text-sm">{vehicle?.plate || "Chưa rõ biển số"}</p><p className="text-[11px] text-slate-500">{vehicle?.name || "Xe của bạn"}</p></div><span className="text-[10px] bg-blue-100 rounded-md text-blue-700 font-bold px-2 py-1">{vehicle?.type || "Xe"}</span></div>
      </section>
      <section className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex justify-between items-center"><h3 className="text-sm font-extrabold flex items-center gap-2"><CalendarClock size={17} className="text-blue-600"/> Thời gian đỗ dự kiến</h3><button onClick={() => setEditHours(true)} className="text-xs font-bold text-blue-600">Chỉnh sửa</button></div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-slate-50 rounded-2xl p-3"><div><span className="text-[10px] text-slate-500">Giờ vào dự kiến</span><p className="font-extrabold text-sm">{new Date(now).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p></div><div className="text-blue-600 font-black text-sm">→</div><div className="text-right"><span className="text-[10px] text-slate-500">Giờ ra dự kiến</span><p className="font-extrabold text-sm">{new Date(now + hours * 3600000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p></div></div>
        <p className="text-[11px] text-slate-600">Thời lượng: <strong>{hours} giờ</strong>. Sau khi thanh toán cọc, bạn có 20 phút để đến bãi.</p>
      </section>
      <section className="space-y-2"><h3 className="text-sm font-extrabold px-1">Phương thức thanh toán</h3>
        {([{ key: "vnpay", name: "VNPay", desc: "Quét mã qua ứng dụng ngân hàng", symbol: "VNP", color: "text-blue-700" }, { key: "momo", name: "MoMo", desc: "Thanh toán ví MoMo (mô phỏng)", symbol: "M", color: "text-pink-600" }, { key: "card", name: "Thẻ quốc tế", desc: "Visa / Mastercard (mô phỏng)", symbol: "VISA", color: "text-blue-700" }] as const).map((m) => <button key={m.key} onClick={() => setMethod(m.key)} className={`w-full bg-white rounded-2xl p-3.5 flex items-center gap-3 border-2 text-left ${method === m.key ? "border-blue-600 shadow-sm" : "border-transparent"}`}><div className={`w-12 h-11 bg-slate-50 rounded-xl grid place-items-center font-black ${m.color}`}>{m.symbol}</div><span className="flex-1"><strong className="block text-sm">{m.name}</strong><span className="block text-[11px] text-slate-500">{m.desc}</span></span><div className={`w-5 h-5 rounded-full border-2 grid place-items-center ${method === m.key ? "border-blue-600" : "border-slate-300"}`}>{method === m.key && <span className="w-2.5 h-2.5 rounded-full bg-blue-600"/>}</div></button>)}
      </section>
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-3"><h3 className="font-extrabold text-sm">Chi tiết giá tạm tính</h3><div className="text-xs text-slate-600 flex justify-between"><span>Đơn giá tiêu chuẩn</span><strong>{money(rate)}/giờ</strong></div><div className="text-xs text-slate-600 flex justify-between"><span>Thời lượng dự kiến</span><strong>{hours} giờ</strong></div><div className="border-t border-dashed border-slate-200 pt-3 flex justify-between text-sm"><span>Tổng phí dự kiến</span><strong>{money(rate * hours)}</strong></div><div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex justify-between items-center"><div><p className="font-extrabold text-xs text-blue-900">Tiền cọc thanh toán ngay</p><p className="text-[10px] text-blue-700">Được khấu trừ khi trả xe</p></div><strong className="text-xl text-blue-700">{money(DEPOSIT)}</strong></div><p className="text-[11px] text-slate-500 flex gap-1"><Info size={14} className="shrink-0"/> Phí còn lại dự kiến: {money(Math.max(0, rate * hours - DEPOSIT))}. Giá thực tế tính khi ra bãi theo quy định của bãi.</p></section>
      <label className="flex gap-2.5 text-xs leading-5 text-slate-600 px-1 cursor-pointer"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="accent-blue-600 mt-1 w-4 h-4 shrink-0"/><span>Tôi đồng ý với chính sách đặt cọc của EZ-Parking và hiểu rằng có thể mất cọc khi đến quá hạn.</span></label>
      <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-3 flex items-start gap-2"><ShieldCheck size={17} className="shrink-0"/><p className="text-[11px]">Đây là cổng thanh toán <strong>mô phỏng cho đồ án</strong>, không tự động thu tiền thật.</p></div>
    </div>
    <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 p-4 shadow-lg"><button disabled={!agree || remaining <= 0} onClick={proceed} className="w-full bg-blue-600 disabled:bg-slate-300 text-white rounded-2xl py-3.5 font-extrabold flex items-center justify-center gap-2 shadow-sm">Xác nhận cọc {money(DEPOSIT)} <ChevronRight size={19}/></button></div>

    {editHours && <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end justify-center"><div className="bg-white rounded-t-3xl p-5 w-full max-w-[430px] space-y-4"><div className="flex justify-between items-center"><h3 className="font-extrabold">Chỉnh sửa giờ đỗ xe</h3><button aria-label="Đóng" onClick={() => setEditHours(false)}><X/></button></div><div className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><button onClick={() => setBookingHours(Math.max(1, hours - 1))} className="w-11 h-11 bg-white rounded-lg grid place-items-center border"><Minus size={18}/></button><b className="text-xl text-blue-700">{hours} giờ</b><button onClick={() => setBookingHours(Math.min(24, hours + 1))} className="w-11 h-11 bg-white rounded-lg grid place-items-center border"><Plus size={18}/></button></div><button onClick={() => setEditHours(false)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-extrabold">Cập nhật</button></div></div>}
    {confirmLeave && <div className="fixed inset-0 z-50 bg-slate-900/55 grid place-items-center p-5"><div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4"><h3 className="font-extrabold text-lg">Rời khỏi thanh toán?</h3><p className="text-sm text-slate-500">Ô {booking.spotId} sẽ được nhả nếu bạn rời đi. Bạn cần chọn lại chỗ đỗ.</p><div className="flex gap-3"><button onClick={() => setConfirmLeave(false)} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold">Ở lại</button><button onClick={returnToLot} className="flex-1 rounded-xl bg-rose-600 text-white py-3 font-bold">Rời đi</button></div></div></div>}
  </div>;
}
