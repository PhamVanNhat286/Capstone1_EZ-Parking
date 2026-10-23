"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, CalendarClock, CarFront, CheckCircle2, ChevronDown, CircleHelp, Clock3, Copy, Download, Expand, Info, MapPin, Navigation, QrCode, Share2, ShieldCheck, Ticket, X, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getLotByIdApi } from "@/lib/api";
import { lots } from "@/lib/mock/lots";
import { useStore } from "@/store";

const DEPOSIT = 50_000;
const money = (n: number) => Math.max(0, n).toLocaleString("vi-VN") + "đ";
const timer = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const activeBooking = useStore((s) => s.activeBooking);
  const history = useStore((s) => s.history);
  const vehicles = useStore((s) => s.vehicles);
  const markEntered = useStore((s) => s.markEntered);
  const markCompleted = useStore((s) => s.markCompleted);
  const markExpired = useStore((s) => s.markExpired);
  const cancelBooking = useStore((s) => s.cancelBooking);
  const addToast = useStore((s) => s.addToast);
  const isDemo = useStore((s) => s.isDemo);
  const booking = activeBooking?.id === id ? activeBooking : history.find((item) => item.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const fallback = lots.find((l) => l.id === booking?.lotId) || lots[0];
  const [lot, setLot] = useState({ name: fallback.name, address: fallback.address, price: fallback.price });
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [expandLate, setExpandLate] = useState(false);
  useEffect(() => { setReady(true); const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    if (!booking?.lotId) return;
    const base = lots.find((l) => l.id === booking.lotId) || lots[0];
    setLot({ name: base.name, address: base.address, price: base.price });
    let cancelled = false;
    void getLotByIdApi(booking.lotId).then((data) => {
      if (cancelled || !data) return;
      const price = Number(data.pricing_rules?.[0]?.hourly_rate || data.price || base.price);
      setLot({ name: data.name || base.name, address: data.address || base.address, price: price > 0 ? price : base.price });
    });
    return () => { cancelled = true; };
  }, [booking?.lotId]);
  useEffect(() => {
    if (ready && activeBooking?.id === id && activeBooking.status === "paid" && activeBooking.arrivalExpiresAt && activeBooking.arrivalExpiresAt <= now) markExpired();
  }, [ready, activeBooking?.id, activeBooking?.status, activeBooking?.arrivalExpiresAt, id, now, markExpired]);
  if (!ready) return <div className="min-h-full bg-slate-50 grid place-items-center">Đang tải vé...</div>;
  if (!booking) return <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center"><Ticket size={40} className="text-slate-400"/><h2 className="text-lg font-extrabold mt-3">Không tìm thấy vé</h2><p className="text-sm text-slate-500 mt-1">Hãy kiểm tra lịch sử hoặc đặt chỗ mới.</p><button onClick={() => router.push("/lich-su")} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold mt-5">Lịch sử đặt chỗ</button></div>;
  const validQR = booking.status === "paid" || booking.status === "entered";
  const remaining = booking.status === "paid" ? Math.max(0, Math.ceil(((booking.arrivalExpiresAt || 0) - now) / 1000)) : 0;
  const qrPayload = `EZPARKING-DEMO-TICKET|ID=${booking.id}|LOT=${booking.lotId}|SPOT=${booking.spotId}|VEHICLE=${vehicle?.plate || "UNKNOWN"}`;
  const total = lot.price * (booking.estimatedHours || 2);
  const doCopy = async () => { try { await navigator.clipboard.writeText(booking.id); addToast("Đã sao chép mã vé", "success"); } catch { addToast("Không sao chép được", "error"); } };
  const share = async () => {
    const text = `Vé EZ-Parking ${booking.id} – ${lot.name} – Ô ${booking.spotId}`;
    try { if (navigator.share) await navigator.share({ title: "Vé EZ-Parking", text }); else { await navigator.clipboard.writeText(text); addToast("Đã sao chép thông tin vé", "success"); } }
    catch { /* Người dùng đóng hộp thoại chia sẻ */ }
  };
  const saveQR = () => {
    const svg = document.querySelector("#ticket-qr svg"); if (!svg) return;
    const el = svg.cloneNode(true) as SVGElement; el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([new XMLSerializer().serializeToString(el)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `ve-demo-${booking.id}.svg`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast("Đã lưu ảnh QR mô phỏng", "success");
  };
  const statusText = booking.status === "paid" ? "ĐÃ ĐẶT CỌC" : booking.status === "entered" ? "ĐÃ CHECK-IN" : booking.status === "completed" ? "ĐÃ HOÀN THÀNH" : booking.status === "cancelled" ? "ĐÃ HỦY" : booking.status === "forfeited" ? "HẾT HẠN" : "CHƯA THANH TOÁN";
  return <div className="min-h-full bg-[#f1f5f9] pb-8 text-slate-900">
    <header className="bg-white sticky top-0 z-20 px-4 py-3 flex justify-between items-center border-b border-slate-100"><button aria-label="Quay lại" onClick={() => router.push(booking.status === "paid" ? "/" : "/lich-su")} className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center"><ArrowLeft size={19}/></button><div className="text-center"><h1 className="font-extrabold text-base">Vé vào bãi</h1><p className="text-[11px] text-slate-500">Đưa mã QR cho nhân viên quét tại cổng</p></div><button aria-label="Trợ giúp" onClick={() => setShowHelp(true)} className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center"><CircleHelp size={18}/></button></header>
    <div className="px-4 pt-4 space-y-4">
      <div className={`${booking.status === "paid" ? "bg-blue-50 border-blue-100" : booking.status === "entered" ? "bg-emerald-50 border-emerald-100" : "bg-slate-200 border-slate-300"} border rounded-2xl p-4 flex items-center gap-3`}>
        <div className="w-11 h-11 rounded-full bg-white grid place-items-center text-blue-600"><Clock3 size={23}/></div><div className="flex-1 min-w-0"><div className="flex gap-1.5 items-center flex-wrap"><span className="text-[10px] font-black bg-blue-600 text-white rounded-md px-2 py-1">{statusText}</span>{booking.status === "paid" && <span className="text-base font-black tabular-nums text-blue-700">{timer(remaining)}</span>}</div><p className="text-xs font-extrabold mt-1">{booking.status === "paid" ? `Đến bãi trước ${new Date(booking.arrivalExpiresAt || 0).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : booking.status === "entered" ? "Xe đã được xác nhận vào bãi" : "Vé không còn dùng để vào bãi"}</p><p className="text-[11px] text-slate-500 mt-0.5">{booking.status === "paid" ? "Quá hạn có thể mất tiền cọc" : "Trạng thái được lưu trong hệ thống mô phỏng"}</p></div><button onClick={() => setShowRules(true)} className="text-[11px] text-blue-700 font-bold underline">Quy định</button>
      </div>
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="text-center p-5"><div className="text-blue-600 text-xs font-extrabold flex items-center justify-center gap-1.5"><QrCode size={17}/> MÃ QR VÀO CỔNG</div><p className="text-[11px] text-slate-500 mt-1">{validQR ? "Mở mã tại thanh chắn barrier" : "Chỉ khả dụng khi vé còn hiệu lực"}</p><button onClick={() => setFullscreen(true)} title="Phóng to mã QR" disabled={!validQR} className={`mx-auto my-4 bg-white p-3 border-2 rounded-2xl relative ${validQR ? "border-blue-600" : "border-slate-200 opacity-30"}`} id="ticket-qr"><QRCodeSVG value={qrPayload} size={216} marginSize={1} fgColor="#0f172a"/><span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] rounded-full px-3 py-1 whitespace-nowrap">Nhấn để phóng to</span></button><div className="mt-6 flex justify-center gap-1.5 items-center"><strong className="text-lg tracking-wider font-black font-mono">{booking.id}</strong><button onClick={doCopy} title="Sao chép mã vé" className="text-blue-600 p-1"><Copy size={17}/></button></div><p className="text-[11px] text-slate-500 mt-2">Mã vé chỉ có hiệu lực trong luồng thử nghiệm EZ-Parking, chưa kết nối máy quét tại bãi.</p><div className="flex gap-2 mt-3"><button onClick={saveQR} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold flex items-center justify-center gap-1"><Download size={15}/> Lưu mã</button><button onClick={share} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold flex items-center justify-center gap-1"><Share2 size={15}/> Chia sẻ</button></div></div>
        <div className="relative border-t-2 border-dashed border-slate-200 mx-4"><span className="absolute -left-7 -top-3 w-5 h-5 rounded-full bg-[#f1f5f9]"/><span className="absolute -right-7 -top-3 w-5 h-5 rounded-full bg-[#f1f5f9]"/></div>
        <div className="p-4 space-y-4"><div className="flex gap-3 items-start"><div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0"><Building2 size={22}/></div><div><h2 className="font-extrabold">{lot.name}</h2><p className="text-xs mt-1 text-slate-500">{lot.address}</p></div></div><div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-3"><div><p className="text-[10px] text-slate-500">Ô đỗ đã đặt</p><p className="text-blue-700 text-xl font-black">{booking.spotId}</p></div><div><p className="text-[10px] text-slate-500">Loại xe</p><p className="font-black text-sm">{vehicle?.type || "Xe hơi"}</p></div></div><div className="flex items-center gap-3"><CarFront className="text-blue-600" size={19}/><div><strong className="text-sm">{vehicle?.plate || "Không rõ biển số"}</strong><p className="text-xs text-slate-500">{vehicle?.name || "Xe của bạn"}</p></div></div><div className="grid grid-cols-2 gap-3 text-xs"><div><span className="text-slate-500">Giờ đặt chỗ</span><p className="font-bold mt-1">{new Date(booking.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p></div><div><span className="text-slate-500">Thời lượng dự kiến</span><p className="font-bold mt-1">{booking.estimatedHours || 2} giờ</p></div></div><div className="border-t border-slate-100 pt-3 text-xs space-y-2"><div className="flex justify-between"><span className="text-slate-500">Cọc đã thanh toán</span><b className="text-emerald-700">{["paid","entered","completed"].includes(booking.status) ? money(DEPOSIT) : "Chưa thanh toán"}</b></div><div className="flex justify-between"><span className="text-slate-500">Phí còn lại ước tính</span><b>{money(Math.max(0, total - DEPOSIT))}</b></div></div></div>
      </section>
      <button onClick={() => setExpandLate((v) => !v)} className="bg-white border border-slate-100 w-full px-4 py-3 rounded-2xl text-left flex items-center gap-3"><Clock3 size={17} className="text-amber-600"/><span className="flex-1 text-xs font-extrabold">Tôi đến trễ hơn dự kiến thì sao?</span><ChevronDown size={17} className={expandLate ? "rotate-180" : ""}/></button>
      {expandLate && <p className="bg-amber-50 rounded-xl px-4 py-3 text-xs text-amber-900">Nếu không đến bãi trước thời hạn giữ chỗ, lượt đặt có thể bị hủy và mất cọc. Bạn hãy kiểm tra giờ còn lại phía trên; đồ án chưa có chính sách gia hạn tự động.</p>}
      {validQR && <button onClick={() => router.push(`/chi-duong/${booking.id}`)} className="w-full rounded-2xl bg-blue-600 text-white py-4 font-extrabold flex items-center justify-center gap-2"><Navigation size={19}/> Dẫn đường đến bãi <ArrowRight size={18}/></button>}
      <button onClick={() => setShowHelp(true)} className="w-full bg-white rounded-2xl border border-slate-200 py-3.5 text-blue-700 font-bold flex items-center justify-center gap-2"><CircleHelp size={17}/> Trợ giúp</button>
      {isDemo && booking.status === "paid" && <div className="bg-slate-900 text-white rounded-2xl p-4"><h3 className="text-xs font-extrabold mb-2">Mô phỏng cổng ra/vào</h3><button onClick={markEntered} className="w-full bg-emerald-600 py-2.5 rounded-xl text-xs font-bold">Giả lập nhân viên quét QR vào bãi</button></div>}
      {isDemo && booking.status === "entered" && <div className="bg-slate-900 text-white rounded-2xl p-4"><button onClick={markCompleted} className="w-full bg-blue-600 py-2.5 rounded-xl text-xs font-bold">Giả lập xe đã rời bãi</button></div>}
      {booking.status === "paid" && <button onClick={() => setShowCancel(true)} className="block mx-auto py-3 text-sm font-semibold text-rose-500">Hủy đặt chỗ</button>}
    </div>
    {fullscreen && <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-5"><button aria-label="Đóng" onClick={() => setFullscreen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full"><X/></button><p className="font-extrabold text-lg mb-1">Đưa mã vào ô quét</p><p className="text-sm text-slate-500 mb-8">{lot.name} • Ô {booking.spotId}</p><div className="border-4 border-blue-600 rounded-3xl p-5"><QRCodeSVG value={qrPayload} size={Math.min(290, typeof window !== "undefined" ? window.innerWidth - 100 : 270)} marginSize={1}/></div><p className="mt-7 font-mono font-black">{booking.id}</p><p className="text-xs text-slate-500 mt-2">QR mô phỏng • {vehicle?.plate}</p></div>}
    {showRules && <Popup title="Quy định giữ chỗ và tiền cọc" close={() => setShowRules(false)}><p>Thời hạn đến bãi được tính từ lúc thanh toán thành công và thể hiện trên vé. Quá hạn, ô đỗ có thể được nhả và tiền cọc có thể bị mất. Tiền cọc được khấu trừ vào phí gửi xe khi thanh toán cuối cùng.</p><p className="mt-3">Đây là quy trình mô phỏng trong đồ án, chưa phải điều khoản của một bãi xe thật.</p></Popup>}
    {showHelp && <Popup title="Trợ giúp nhanh" close={() => setShowHelp(false)}><p>Bạn có thể lưu mã QR, chia sẻ thông tin đặt chỗ hoặc mở bản đồ Google Maps qua nút Dẫn đường. Nếu vé đã hết hạn, hãy quay lại để chọn ô khác.</p></Popup>}
    {showCancel && <Popup title="Bạn muốn hủy đặt chỗ?" close={() => setShowCancel(false)}><p>Hủy sẽ nhả ô đỗ và lưu kết quả vào lịch sử. Điều kiện hoàn cọc trong đồ án được mô phỏng theo thời gian đặt.</p><div className="flex gap-3 mt-5"><button className="flex-1 rounded-xl bg-slate-100 py-3 font-bold" onClick={() => setShowCancel(false)}>Ở lại</button><button className="flex-1 rounded-xl bg-rose-600 text-white py-3 font-bold" onClick={() => { cancelBooking(); router.replace("/lich-su"); }}>Hủy đặt</button></div></Popup>}
  </div>;
}

function Popup({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-slate-950/50 grid place-items-center p-4"><div className="bg-white w-full max-w-sm rounded-3xl p-5"><div className="flex items-center justify-between gap-2 mb-4"><h3 className="font-extrabold text-base">{title}</h3><button aria-label="Đóng" onClick={close}><X size={20}/></button></div><div className="text-sm text-slate-600 leading-6">{children}</div></div></div>;
}
