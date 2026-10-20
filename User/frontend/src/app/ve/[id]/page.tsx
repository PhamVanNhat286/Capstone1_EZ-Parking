"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BatteryFull, BellRing, Building2, Car, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, Copy, Headphones, MapPin, Navigation, QrCode,
  Share2, ShieldCheck, Signal, Wifi, X, AlertTriangle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import BottomSheet from "@/components/ui/BottomSheet";
import { useStore } from "@/store";
import { getLotByAnyId } from "@/lib/mock/lots";

const ARRIVAL_SECONDS = 20 * 60;
const DEPOSIT = 50000;
const money = (n: number) => n.toLocaleString("vi-VN") + " đ";
const time = (date: number) => new Date(date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const countdown = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const activeBooking = useStore((s) => s.activeBooking);
  const history = useStore((s) => s.history);
  const vehicles = useStore((s) => s.vehicles);
  const cancelBooking = useStore((s) => s.cancelBooking);
  const markExpired = useStore((s) => s.markExpired);
  const markEntered = useStore((s) => s.markEntered);
  const markCompleted = useStore((s) => s.markCompleted);
  const fastForward = useStore((s) => s.fastForward);
  const addToast = useStore((s) => s.addToast);
  const isDemo = useStore((s) => s.isDemo);

  const booking = activeBooking?.id === id ? activeBooking : history.find((b) => b.id === id);
  const lot = getLotByAnyId(booking?.lotId);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const [now, setNow] = useState(() => Date.now());
  const [qrNonce, setQrNonce] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setQrNonce((old) => old + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!booking) return;
    if (booking.status === "paid" && booking.arrivalExpiresAt && Date.now() >= booking.arrivalExpiresAt && activeBooking?.id === booking.id) {
      markExpired();
    }
  }, [now, booking, activeBooking?.id, markExpired]);

  const expiresAt = booking?.arrivalExpiresAt || now;
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const pct = Math.max(0, Math.min(1, remaining / ARRIVAL_SECONDS));
  const status = booking?.status;
  const active = status === "paid" && remaining > 0;
  const checkedIn = status === "entered";
  const valid = active || checkedIn;
  const isRefundable = booking ? now - booking.createdAt < 5 * 60 * 1000 : false;
  const qrValue = booking ? `EZSPACE|TICKET=${booking.id}|SPOT=${booking.spotId}|ROTATION=${qrNonce}` : "";

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); addToast("Đã sao chép mã vé", "success"); }
    catch { addToast("Không thể sao chép mã vé", "error"); }
  };
  const shareTicket = async () => {
    if (!booking) return;
    try {
      if (navigator.share) await navigator.share({ title: "Vé vào bãi EZ-Space", text: `Mã vé: ${booking.id}; bãi: ${lot.name}; ô: ${booking.spotId}` });
      else await copy(booking.id);
    } catch { /* Có thể đóng hộp thoại chia sẻ */ }
  };
  const cancel = () => {
    if (!booking || activeBooking?.id !== booking.id) return;
    cancelBooking();
    setShowCancel(false);
    addToast("Đã hủy đặt chỗ", "success");
    router.push("/lich-su");
  };

  if (!booking) return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center gap-4 text-center px-5">
      <QrCode size={42} className="text-slate-300"/><p className="font-bold">Không tìm thấy vé này.</p>
      <button className="rounded-xl bg-blue-600 text-white font-bold px-5 py-3" onClick={() => router.push("/lich-su")}>Xem lịch sử đặt chỗ</button>
    </div>
  );

  return (
    <div className="bg-[#f6fafe] text-slate-900 min-h-full pb-8">
      <div className="flex justify-between items-center h-11 px-6 text-[11px] font-bold bg-[#f6fafe]">
        <span>{time(now)}</span><div className="w-[106px] h-[26px] rounded-full bg-black"/><div className="flex items-center gap-1"><Signal size={13}/><Wifi size={13}/><BatteryFull size={17}/></div>
      </div>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-sm px-4 py-2 flex items-center justify-between gap-2">
        <button aria-label="Quay lại" onClick={() => router.push("/lich-su")} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100"><ArrowLeft size={19}/></button>
        <div className="min-w-0 text-center"><h1 className="text-[18px] font-extrabold">Vé vào bãi</h1><p className="text-[10px] text-slate-500 flex items-center justify-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${valid ? "bg-emerald-500" : "bg-slate-400"}`}/>{valid ? "Đưa mã cho nhân viên quét tại cổng" : "Xem trạng thái vé của bạn"}</p></div>
        <button aria-label="Trợ giúp" onClick={() => setShowHelp(true)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><CircleHelp size={20}/></button>
      </header>

      <div className="px-4 pt-3 space-y-4">
        <section className="flex gap-3 justify-between items-center bg-[#eaf1ff] rounded-[20px] p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 relative shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90"><circle cx="24" cy="24" r="20" stroke="#bfdbfe" strokeWidth="3.5" fill="none"/><circle cx="24" cy="24" r="20" stroke="#2563eb" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeDasharray="125.66" strokeDashoffset={125.66 * (1 - pct)}/></svg>
              <Clock3 size={19} className="absolute text-blue-600"/>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><span className={`px-2 py-1 rounded-md text-[10px] font-extrabold ${valid ? "bg-blue-600 text-white" : "bg-slate-500 text-white"}`}>{checkedIn ? "ĐÃ CHECK-IN" : active ? "ĐÃ ĐẶT CỌC" : status === "completed" ? "HOÀN TẤT" : "HẾT HIỆU LỰC"}</span>{active && <strong className="text-blue-700 text-[11px] font-mono">{countdown(remaining)}</strong>}</div>
              <h2 className="font-bold mt-1 text-[12px]">{checkedIn ? "Xe đã vào bãi" : active ? `Đến bãi trước ${time(expiresAt)}` : "Trạng thái đặt chỗ đã kết thúc"}</h2>
              <p className="text-[10px] text-slate-500">{active ? "Quá hạn, bạn có thể mất tiền cọc." : "Thông tin vé được lưu để tra cứu."}</p>
            </div>
          </div>
          <button onClick={() => setShowRules(true)} className="shrink-0 px-3 py-2 text-[11px] font-bold text-blue-700 bg-white rounded-full">Quy định</button>
        </section>

        <section className="bg-white shadow-md rounded-[24px] overflow-hidden">
          <div className="px-4 pt-5 pb-4 text-center">
            <div className="flex items-center justify-between gap-2 mb-4 text-left">
              <div className="flex items-center gap-2 min-w-0"><div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><QrCode size={22}/></div><div className="min-w-0"><h2 className="text-[13px] font-extrabold">Mã QR vào cổng</h2><p className="text-[10px] text-slate-500">Quét tại thanh chắn Barrier</p></div></div>
              <button onClick={() => copy(booking.id)} className="shrink-0 flex gap-1 items-center text-[10px] font-mono font-bold rounded-full bg-slate-100 px-2.5 py-1.5"><span className="max-w-[100px] truncate">{booking.id}</span><Copy size={12}/></button>
            </div>
            <button disabled={!valid} onClick={() => setFullscreen(true)} aria-label="Mở mã QR toàn màn hình" className="mx-auto p-3 bg-white rounded-2xl shadow-[0_8px_24px_rgba(37,99,235,0.10)] border border-slate-100 disabled:opacity-40">
              <div className="relative bg-white p-2 rounded-xl w-[210px] h-[210px] flex items-center justify-center">
                <QRCodeSVG value={qrValue} size={190} marginSize={1}/>
                <span className="absolute inset-0 m-auto w-10 h-10 bg-blue-600 border-[4px] border-white rounded-xl flex items-center justify-center text-white text-[18px] font-black shadow-md">P</span>
              </div>
            </button>
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-[11px] text-slate-600 text-left"><ShieldCheck size={19} className="text-blue-600 shrink-0"/><p>Đưa mã cho nhân viên hoặc thiết bị quét tại bãi. Đây là mã vé của đồ án, không phải QR thanh toán.</p></div>
            {active && <p className="mt-2 text-[10px] text-slate-400">Mã hiển thị làm mới mỗi 30 giây (mô phỏng)</p>}
          </div>

          <div className="relative flex items-center gap-2"><span className="w-5 h-8 -ml-2.5 bg-[#f6fafe] rounded-r-full"/><span className="flex-1 border-t-2 border-dashed border-slate-200"/><span className="w-5 h-8 -mr-2.5 bg-[#f6fafe] rounded-l-full"/></div>

          <div className="px-4 pb-5 pt-2 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2 min-w-0"><div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 text-blue-600 flex items-center justify-center"><Building2 size={21}/></div><div className="min-w-0"><h3 className="font-bold text-[12px]">{lot.name}</h3><p className="text-[10px] text-slate-500">{lot.address}</p></div></div>
              <div className="text-right shrink-0"><span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-[9px] font-bold">ĐÃ GIỮ Ô</span><p className="text-blue-600 font-extrabold text-[18px] mt-1">{booking.spotId}</p></div>
            </div>
            <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl p-3"><div className="flex gap-2 items-center"><Car size={18} className="text-blue-600"/><div><span className="text-[10px] text-slate-500">Phương tiện</span><p className="text-[12px] font-extrabold">{vehicle?.plate || "Chưa có biển số"}</p></div></div><span className="text-[11px] text-slate-600 font-semibold">{vehicle?.name || vehicle?.type || "Ô tô"}</span></div>
            <div className="grid grid-cols-2 gap-3 text-[11px]"><div><p className="text-slate-500">Giờ thanh toán cọc</p><p className="font-bold mt-1">{booking.arrivalExpiresAt ? time(booking.arrivalExpiresAt - ARRIVAL_SECONDS * 1000) : "—"}</p></div><div><p className="text-slate-500">Hạn đến bãi</p><p className="font-bold mt-1">{booking.arrivalExpiresAt ? time(booking.arrivalExpiresAt) : "—"}</p></div></div>
            <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[12px]"><span className="text-slate-500">Đã thanh toán cọc</span><strong className="text-blue-700">{money(DEPOSIT)}</strong></div>
            <p className="text-[10px] text-slate-400">Phí phát sinh khi ra bãi tính theo thời gian thực tế.</p>
          </div>
        </section>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button onClick={() => setShowFaq(!showFaq)} className="w-full p-4 text-left flex justify-between gap-2 items-center text-[12px] font-bold"><span>Tôi đến trễ hơn dự kiến thì sao?</span><ChevronDown size={16} className={showFaq ? "rotate-180" : ""}/></button>
          {showFaq && <p className="px-4 pb-4 text-[11px] text-slate-600 leading-relaxed">Hệ thống chỉ giữ ô trong 20 phút kể từ khi thanh toán thành công. Khi hết hạn, ô có thể được mở lại cho xe khác; chính sách hoàn cọc áp dụng theo quy định của đồ án.</p>}
        </div>
        <div className="space-y-2.5">
          {active && <button onClick={() => router.push(`/ve/${encodeURIComponent(booking.id)}/chi-duong`)} className="w-full py-4 bg-blue-600 text-white rounded-2xl shadow-md font-extrabold flex items-center justify-center gap-2 text-[13px]"><Navigation size={18}/> Dẫn đường đến bãi</button>}
          <button onClick={shareTicket} className="w-full py-3.5 rounded-2xl border border-blue-100 bg-white text-blue-700 font-bold text-[12px] flex items-center justify-center gap-2"><Share2 size={16}/> Chia sẻ thông tin vé</button>
          {active && <button onClick={() => setShowCancel(true)} className="w-full py-3 text-rose-600 font-semibold text-[12px]">Hủy đặt chỗ</button>}
          <button onClick={() => setShowHelp(true)} className="w-full py-2.5 text-slate-600 text-[12px] font-semibold flex justify-center gap-2 items-center"><Headphones size={16}/> Hỗ trợ</button>
        </div>

        {isDemo && <div className="bg-slate-900 text-white p-3 rounded-2xl"><h3 className="text-[10px] uppercase font-bold tracking-wider mb-3 text-slate-300">Bộ giả lập kiểm thử vé</h3><div className="grid grid-cols-2 gap-2 text-[11px] font-bold">{active && <><button onClick={markEntered} className="bg-emerald-600 p-2.5 rounded-lg">✓ Quét tại cổng vào</button><button onClick={fastForward} className="bg-amber-600 p-2.5 rounded-lg">⏱ Tua hết thời gian</button></>}{checkedIn && <button onClick={markCompleted} className="bg-blue-600 p-2.5 rounded-lg">Quét cổng ra</button>}</div></div>}
      </div>

      {fullscreen && <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-center items-center p-6" onClick={() => setFullscreen(false)}><button aria-label="Đóng QR" className="absolute right-6 top-7 text-white"><X size={26}/></button><p className="text-white font-bold text-[14px] mb-5">Đưa mã vào ô quét</p><div className="bg-white p-6 rounded-[30px] w-full max-w-[340px] aspect-square flex items-center justify-center"><QRCodeSVG value={qrValue} className="w-full h-full"/></div><p className="text-white mt-5 font-mono text-[13px]">{booking.id}</p><p className="text-white/50 text-[11px] mt-3">Chạm vào màn hình để đóng</p></div>}

      <BottomSheet title="Quy định giữ chỗ" isOpen={showRules} onClose={() => setShowRules(false)}><div className="space-y-3 text-[13px] text-slate-600 mb-5"><p>• Bạn có 20 phút để đến bãi sau khi thanh toán cọc.</p><p>• Khi quá hạn, chỗ có thể bị giải phóng và khoản cọc xử lý theo chính sách.</p><p>• Theo chế độ demo của đồ án, hủy trong 5 phút kể từ lúc đặt được hoàn cọc.</p></div><button className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold" onClick={() => setShowRules(false)}>Tôi đã hiểu</button></BottomSheet>
      <BottomSheet title="Hỗ trợ" isOpen={showHelp} onClose={() => setShowHelp(false)}><div className="text-[13px] text-slate-600 space-y-3 mb-4"><p>Đưa mã vé tại cổng bãi. Nếu thiết bị không nhận mã, liên hệ nhân viên quản lý tại bãi đỗ.</p><p>Địa điểm: <strong>{lot.name}</strong> — {lot.address}</p></div><button className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold" onClick={() => setShowHelp(false)}>Đóng</button></BottomSheet>
      <BottomSheet title="Hủy đặt chỗ?" isOpen={showCancel} onClose={() => setShowCancel(false)}><div className={`rounded-xl p-3 text-[12px] mb-5 flex gap-2 ${isRefundable ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{isRefundable ? <CheckCircle2 size={19} className="shrink-0"/> : <AlertTriangle size={19} className="shrink-0"/>}<p>{isRefundable ? "Theo logic hiện tại của đồ án, hủy trong 5 phút đầu được hoàn cọc mô phỏng." : "Đã quá thời gian hủy hoàn cọc trong đồ án. Bạn có thể mất tiền cọc."}</p></div><div className="grid grid-cols-2 gap-2"><button className="py-3 rounded-xl bg-slate-100 font-bold text-slate-700" onClick={() => setShowCancel(false)}>Ở lại</button><button className="py-3 rounded-xl bg-rose-600 text-white font-bold" onClick={cancel}>Xác nhận hủy</button></div></BottomSheet>
    </div>
  );
}
