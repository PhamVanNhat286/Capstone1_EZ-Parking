"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Banknote, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Copy, CreditCard, Download, ExternalLink, Info, LoaderCircle, MapPin, QrCode, RefreshCw, ShieldCheck, Smartphone, Ticket, Wallet, X, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getLotByIdApi } from "@/lib/api";
import { lots } from "@/lib/mock/lots";
import { useStore, type Booking } from "@/store";

const DEPOSIT = 50_000;
const money = (n: number) => Math.max(0, n).toLocaleString("vi-VN") + "đ";
const timeText = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
type Provider = "vnpay" | "momo" | "card";
const providerName = (m: Provider) => m === "momo" ? "Ví MoMo" : m === "card" ? "Thẻ quốc tế" : "VNPay";
const getProvider = (p: string | null): Provider => p === "momo" || p === "card" ? p : "vnpay";

function useBookingLot(lotId?: string) {
  const fallback = lots.find((l) => l.id === lotId) || lots[0];
  const [info, setInfo] = useState({ name: fallback.name, address: fallback.address, price: fallback.price });
  useEffect(() => {
    if (!lotId) return;
    const base = lots.find((l) => l.id === lotId) || lots[0];
    setInfo({ name: base.name, address: base.address, price: base.price });
    let cancelled = false;
    void getLotByIdApi(lotId).then((d) => {
      if (cancelled || !d) return;
      const cost = Number(d.pricing_rules?.[0]?.hourly_rate || d.price || base.price);
      setInfo({ name: d.name || base.name, address: d.address || base.address, price: cost > 0 ? cost : base.price });
    });
    return () => { cancelled = true; };
  }, [lotId]);
  return info;
}

function Header({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  return <header className="bg-white sticky top-0 z-20 border-b border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between gap-2">
    <button onClick={back} aria-label="Quay lại" className="w-9 h-9 shrink-0 rounded-full bg-slate-100 grid place-items-center"><ArrowLeft size={19}/></button>
    <div className="text-center min-w-0"><h1 className="font-extrabold text-base truncate">{title}</h1>{subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}</div>
    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 grid place-items-center shrink-0"><ShieldCheck size={17}/></div>
  </header>;
}

function CopyButton({ value, label = "Sao chép" }: { value: string; label?: string }) {
  const addToast = useStore((s) => s.addToast);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); addToast("Đã sao chép vào bộ nhớ tạm", "success"); }
    catch { addToast("Không sao chép được. Bạn có thể chọn và sao chép thủ công.", "error"); }
  };
  return <button type="button" title={label} aria-label={label} onClick={copy} className="text-blue-600 p-1 rounded-lg hover:bg-blue-50"><Copy size={16}/></button>;
}

export default function PaymentFlowPage({ params }: { params: Promise<{ method: string }> }) {
  return <Suspense fallback={<div className="min-h-full grid place-items-center text-slate-500">Đang tải thanh toán...</div>}><PaymentContent params={params}/></Suspense>;
}

function PaymentContent({ params }: { params: Promise<{ method: string }> }) {
  const { method } = use(params);
  const router = useRouter();
  const query = useSearchParams();
  const booking = useStore((s) => s.activeBooking);
  const history = useStore((s) => s.history);
  const vehicles = useStore((s) => s.vehicles);
  const payDeposit = useStore((s) => s.payDeposit);
  const releaseSpot = useStore((s) => s.releaseSpot);
  const lateIPNRefund = useStore((s) => s.lateIPNRefund);
  const addToast = useStore((s) => s.addToast);
  const lastMethod = useStore((s) => s.lastPaymentMethod);
  const displayBooking = booking || (query.get("reason") === "late" ? history[0] || null : null);
  const lot = useBookingLot(displayBooking?.lotId);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const vehicle = vehicles.find((v) => v.id === displayBooking?.vehicleId);
  const fromQuery = getProvider(query.get("provider"));
  const activeProvider = method === "momo" || method === "card" ? method : method === "vnpay" ? "vnpay" : getProvider(query.get("provider") || lastMethod);
  const remaining = booking?.status === "holding" ? Math.max(0, Math.ceil((booking.holdExpiresAt - now) / 1000)) : 0;

  useEffect(() => { setReady(true); const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    if (!ready || method !== "dang-xu-ly") return;
    const timer = window.setTimeout(() => {
      const current = useStore.getState().activeBooking;
      if (query.get("result") === "late") {
        lateIPNRefund();
        router.replace(`/thanh-toan/that-bai?provider=${fromQuery}&reason=late`);
        return;
      }
      if (!current || current.status !== "holding" || current.holdExpiresAt <= Date.now()) {
        router.replace(`/thanh-toan/that-bai?provider=${fromQuery}&reason=expired`);
        return;
      }
      if (query.get("result") === "fail") {
        router.replace(`/thanh-toan/that-bai?provider=${fromQuery}&reason=declined`);
        return;
      }
      // ONLY simulator success explicitly requested by the user. No bank payment is made.
      payDeposit(fromQuery);
      router.replace(`/thanh-toan/thanh-cong?provider=${fromQuery}`);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [ready, method, query, fromQuery, payDeposit, lateIPNRefund, router]);

  if (!ready) return <div className="min-h-full flex items-center justify-center text-slate-500">Đang tải...</div>;
  if (method === "dang-xu-ly") return <div className="min-h-full bg-slate-50 flex flex-col"><Header title="Đang xử lý giao dịch" subtitle="Kiểm tra kết quả mô phỏng"/><div className="flex-1 flex flex-col justify-center items-center text-center px-6"><LoaderCircle className="animate-spin text-blue-600 mb-5" size={52}/><h2 className="text-xl font-extrabold">Đang xác nhận kết quả...</h2><p className="text-sm text-slate-500 mt-2">Vui lòng đợi hệ thống cập nhật trạng thái đặt chỗ.</p></div></div>;
  if (method === "thanh-cong") return <SuccessScreen booking={booking} vehicle={vehicle} lot={lot} router={router}/>;
  if (method === "that-bai") return <FailedScreen booking={displayBooking} vehicle={vehicle} lot={lot} now={now} provider={getProvider(query.get("provider") || lastMethod)} reason={query.get("reason")} router={router} releaseSpot={releaseSpot} lateIPNRefund={lateIPNRefund}/>;
  if (["vnpay", "momo", "card"].includes(method)) {
    if (!booking || booking.status !== "holding") return <div className="p-6 bg-slate-50 min-h-full text-center"><h2 className="font-extrabold text-lg">Không có lượt giữ chỗ hợp lệ</h2><button className="mt-5 bg-blue-600 text-white py-3 px-6 rounded-xl font-bold" onClick={() => router.replace("/")}>Về trang chủ</button></div>;
    return <GatewayScreen booking={booking} vehicle={vehicle} lot={lot} provider={activeProvider} remaining={remaining} router={router} releaseSpot={releaseSpot} addToast={addToast}/>;
  }
  return <div className="p-6">Không tìm thấy màn hình thanh toán.</div>;
}

function GatewayScreen({ booking, vehicle, lot, provider, remaining, router, releaseSpot, addToast }: {
  booking: Booking; vehicle?: { plate: string }; lot: { name: string; address: string; price: number }; provider: Provider;
  remaining: number; router: ReturnType<typeof useRouter>; releaseSpot: () => void; addToast: (m: string, type?: "info" | "error" | "success") => void;
}) {
  const [askCancel, setAskCancel] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [openInfo, setOpenInfo] = useState(false);
    const isExpired = remaining <= 0;
  const qrValue = `EZPARKING_DEMO_ONLY|BOOKING=${booking.id}|SLOT=${booking.spotId}|AMOUNT=${DEPOSIT}|METHOD=${provider}`;
  const selectMethod = (p: Provider) => router.replace(`/thanh-toan/${p}`);
  const confirmDemo = (result: "success" | "fail" | "late") => {
    if (isExpired) { router.push(`/thanh-toan/that-bai?provider=${provider}&reason=expired`); return; }
    router.push(`/thanh-toan/dang-xu-ly?provider=${provider}&result=${result}`);
  };
  const saveQR = () => {
    const svg = document.querySelector("#ez-payment-qr svg");
    if (!svg) { addToast("Không tìm thấy hình mã QR", "error"); return; }
    const cloned = svg.cloneNode(true) as SVGElement;
    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const str = new XMLSerializer().serializeToString(cloned);
    const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `EZ-Parking-demo-${booking.id}.svg`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast("Đã lưu QR mô phỏng (không thanh toán thật)", "success");
  };
  const validateCard = () => {
    if (cardNumber.replace(/\D/g, "").length < 12 || !cardHolder.trim() || !/^\d{2}\/\d{2}$/.test(expiry) || cvv.length < 3) {
      addToast("Vui lòng nhập thông tin thẻ giả lập đầy đủ", "error"); return;
    }
    confirmDemo("success");
  };
  return <div className="min-h-full bg-[#f1f5f9] text-slate-900 pb-8">
    <Header title={provider === "card" ? "Thanh toán qua thẻ" : "Quét mã để thanh toán"} subtitle="Thanh toán cọc giữ chỗ • Bản mô phỏng" back={() => setAskCancel(true)}/>
    <div className="px-4 py-3 space-y-3">
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-amber-100 grid place-items-center text-amber-700"><Clock3 size={22}/></div><div className="min-w-0 flex-1"><span className="font-extrabold text-xs text-amber-900">Đang giữ ô {booking.spotId}</span><p className="text-[11px] text-amber-700">{isExpired ? "Giữ chỗ đã hết hạn" : "Hệ thống sẽ nhả ô khi hết thời gian"}</p></div><span className="font-black text-lg tabular-nums text-amber-700">{timeText(remaining)}</span></div>
      <section className="bg-white rounded-3xl border border-slate-100 p-4 flex flex-col items-center shadow-sm">
        <div className="flex p-1 bg-slate-100 w-full rounded-xl gap-1 mb-4">{(["vnpay", "momo", "card"] as Provider[]).map((p) => <button onClick={() => selectMethod(p)} key={p} className={`flex-1 py-2 rounded-lg text-[11px] font-extrabold ${p === provider ? "bg-blue-600 text-white" : "text-slate-600"}`}>{p === "vnpay" ? "VNPay" : p === "momo" ? "MoMo" : "Thẻ"}</button>)}</div>
        <p className="uppercase text-[10px] tracking-widest font-extrabold text-slate-400">Số tiền cọc cần thanh toán</p><div className="text-[32px] font-black tracking-tight text-blue-600 mt-1">{money(DEPOSIT)}</div>
        {provider !== "card" ? <>
          <div id="ez-payment-qr" className="relative bg-white rounded-2xl border-[3px] border-blue-500 p-4 my-4 w-[232px] h-[232px] grid place-items-center overflow-hidden">
            <QRCodeSVG value={qrValue} size={194} marginSize={1} fgColor="#0f172a" bgColor="#ffffff"/>
            <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-cyan-400/70 shadow-md pointer-events-none animate-pulse"/>
          </div><span className="font-extrabold text-xs text-blue-700">{providerName(provider)} • QR THỬ NGHIỆM</span>
          <p className="text-[11px] text-center text-slate-500 mt-1 max-w-[280px]">Mã QR này chỉ chứa dữ liệu demo của đơn đặt chỗ, không phải mã chuyển khoản ngân hàng.</p>
          <div className="flex gap-2 w-full mt-4"><button onClick={saveQR} className="flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-xl bg-slate-100 font-bold text-xs"><Download size={15}/> Lưu mã</button><button onClick={() => setOpenInfo((v) => !v)} className="flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-xl bg-slate-100 font-bold text-xs"><CircleHelp size={15}/> Hướng dẫn</button></div>
          {openInfo && <p className="mt-3 text-[11px] text-slate-600 bg-blue-50 p-3 rounded-xl">Ở bản chạy thử, hãy dùng các nút trong Bộ giả lập bên dưới để kiểm tra kết quả. Đồ án chưa kết nối cổng thanh toán ngân hàng thật.</p>}
        </> : <div className="w-full mt-3 space-y-3"><p className="text-xs text-slate-600">Nhập dữ liệu thẻ <strong>giả lập</strong> để thử giao diện. Không nhập số thẻ ngân hàng thật.</p><label className="block text-xs font-bold">Số thẻ thử nghiệm<input value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9 ]/g, "").slice(0, 19))} placeholder="4111 1111 1111 1111" className="mt-1 w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500"/></label><label className="block text-xs font-bold">Tên chủ thẻ<input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder="NGUYEN VAN A" className="mt-1 w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500"/></label><div className="flex gap-3"><label className="flex-1 text-xs font-bold">MM/YY<input value={expiry} onChange={(e) => setExpiry(e.target.value.slice(0, 5))} placeholder="12/28" className="mt-1 w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500"/></label><label className="flex-1 text-xs font-bold">CVV thử nghiệm<input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" type="password" className="mt-1 w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500"/></label></div><button disabled={isExpired} onClick={validateCard} className="w-full bg-blue-600 disabled:bg-slate-300 text-white rounded-xl py-3 font-extrabold">Xác nhận thẻ thử nghiệm</button></div>}
      </section>
      <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3"><h3 className="font-extrabold text-sm flex items-center gap-2"><CreditCard size={17} className="text-blue-600"/> Thông tin thanh toán</h3><InfoRow label="Cổng thanh toán" value={`${providerName(provider)} • Demo`}/><InfoRow label="Mã giữ chỗ" value={booking.id} copy/><InfoRow label="Vị trí" value={`${lot.name} • Ô ${booking.spotId}`}/><InfoRow label="Biển số" value={vehicle?.plate || "Không rõ"}/><InfoRow label="Tiền cọc" value={money(DEPOSIT)}/><p className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">Số tiền cọc được khấu trừ vào phí gửi xe dự kiến {money(lot.price * (booking.estimatedHours || 2))}.</p></section>
      <section className="rounded-2xl bg-slate-900 text-white p-4 space-y-3"><div className="flex items-center justify-between"><h3 className="font-extrabold text-sm">Bộ giả lập kiểm thử</h3><span className="text-[10px] px-2 py-1 rounded-full bg-white/15">DEMO MODE</span></div><p className="text-[11px] text-slate-300">Các nút bên dưới chỉ thay đổi trạng thái đặt chỗ trên trình duyệt, không tạo giao dịch tiền thật.</p><div className="grid grid-cols-2 gap-2"><button disabled={isExpired} onClick={() => confirmDemo("success")} className="bg-emerald-500 disabled:opacity-40 rounded-xl px-3 py-3 text-xs font-extrabold flex items-center justify-center gap-1"><Check size={16}/> Thành công</button><button disabled={isExpired} onClick={() => confirmDemo("fail")} className="bg-rose-500 disabled:opacity-40 rounded-xl px-3 py-3 text-xs font-extrabold flex items-center justify-center gap-1"><XCircle size={16}/> Thất bại</button></div><div className="grid grid-cols-2 gap-2"><button disabled={isExpired} onClick={() => confirmDemo("late")} className="border border-slate-600 rounded-xl px-2 py-2 text-xs font-bold disabled:opacity-40">Giả lập IPN đến muộn</button><button onClick={() => router.push(`/thanh-toan/that-bai?provider=${provider}&reason=expired`)} className="border border-slate-600 rounded-xl px-2 py-2 text-xs font-bold">Xem tình huống hết hạn</button></div></section>
      <button onClick={() => setAskCancel(true)} className="w-full py-3 text-xs text-slate-600 font-bold underline">Hủy giữ chỗ / Đổi ô đỗ</button>
    </div>
    {askCancel && <div className="fixed inset-0 z-50 bg-slate-900/60 grid place-items-center p-5"><div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4"><h3 className="font-extrabold text-lg">Hủy giữ chỗ?</h3><p className="text-sm text-slate-600">Nếu rời thanh toán, ô {booking.spotId} sẽ được nhả lại.</p><button onClick={() => setAskCancel(false)} className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold">Tiếp tục thanh toán</button><button onClick={() => { releaseSpot(); router.replace(`/bai/${booking.lotId}`); }} className="w-full bg-slate-100 text-rose-700 rounded-xl py-3 font-bold">Hủy giữ chỗ</button></div></div>}
  </div>;
}

function InfoRow({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return <div className="flex items-center justify-between gap-3 text-xs"><span className="text-slate-500 shrink-0">{label}</span><div className="flex items-center text-right gap-1 min-w-0"><strong className="text-slate-800 break-all">{value}</strong>{copy && <CopyButton value={value}/>}</div></div>;
}

function SuccessScreen({ booking, vehicle, lot, router }: { booking: Booking | null; vehicle?: { name: string; plate: string; type: string }; lot: { name: string; price: number }; router: ReturnType<typeof useRouter> }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  if (!booking || !["paid", "entered"].includes(booking.status)) return <div className="min-h-full bg-slate-50 p-6 text-center"><p className="text-lg font-bold">Chưa có giao dịch được xác nhận</p><button onClick={() => router.replace("/")} className="mt-5 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Trang chủ</button></div>;
  const minutes = Math.max(0, Math.ceil(((booking.arrivalExpiresAt || now) - now) / 1000));
  return <div className="min-h-full bg-[#f1f5f9] pb-8"><Header title="Kết quả thanh toán" subtitle="Giao dịch đặt cọc giữ chỗ" back={() => router.replace("/")}/>
    <div className="bg-gradient-to-b from-emerald-100 via-emerald-50 to-transparent px-5 pt-7 pb-5 text-center"><div className="mx-auto w-24 h-24 rounded-full bg-white shadow-md grid place-items-center mb-4"><CheckCircle2 className="text-emerald-500" size={55} strokeWidth={1.6}/></div><h2 className="text-2xl font-black">Đặt cọc thành công 🎉</h2><p className="text-sm text-slate-600 mt-1">Ô {booking.spotId} đã được giữ riêng cho bạn</p><div className="text-[30px] font-black text-blue-600 mt-4">{money(DEPOSIT)}</div><p className="text-[11px] text-slate-500 font-semibold">Tiền cọc đã thanh toán (mô phỏng)</p></div>
    <div className="px-4 space-y-4"><div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between"><div><p className="text-blue-800 text-xs font-extrabold">Đã cọc • Hạn đến bãi</p><p className="text-sm text-slate-700 mt-1">{new Date(booking.arrivalExpiresAt || now).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p></div><span className="font-black text-xl tabular-nums text-blue-700">{timeText(minutes)}</span></div>
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm"><div className="p-4 flex items-center justify-between border-b border-dashed border-slate-200"><span className="text-xs text-slate-500">Mã giữ chỗ</span><div className="flex items-center"><b className="font-mono text-sm">{booking.id}</b><CopyButton value={booking.id}/></div></div><div className="p-4 space-y-3"><InfoRow label="Bãi đỗ" value={lot.name}/><InfoRow label="Vị trí ô đỗ" value={booking.spotId}/><InfoRow label="Xe đăng ký" value={`${vehicle?.plate || "-"} • ${vehicle?.name || "Xe"}`}/><InfoRow label="Thời lượng" value={`${booking.estimatedHours || 2} giờ`}/><InfoRow label="Phương thức" value={providerName(booking.paymentMethod || "vnpay")}/></div><div className="bg-slate-50 border-t border-dashed border-slate-200 p-4 space-y-2"><InfoRow label="Tổng phí dự kiến" value={money((booking.estimatedHours || 2) * lot.price)}/><InfoRow label="Cọc đã thanh toán" value={money(DEPOSIT)}/><InfoRow label="Dự kiến trả khi ra bãi" value={money(Math.max(0, (booking.estimatedHours || 2) * lot.price - DEPOSIT))}/></div></div>
    <p className="bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 p-3">Vui lòng đến bãi trước thời hạn hiển thị để tránh mất cọc. Đây là trạng thái thanh toán thử nghiệm của đồ án.</p>
    <button onClick={() => router.push(`/ve/${booking.id}`)} className="w-full rounded-2xl bg-blue-600 text-white py-4 font-extrabold flex items-center justify-center gap-2"><Ticket size={19}/> Xem vé QR & dẫn đường <ArrowRight size={17}/></button><button onClick={() => router.push(`/chi-duong/${booking.id}`)} className="w-full rounded-2xl bg-white text-blue-700 border border-blue-100 py-3.5 font-bold flex items-center justify-center gap-2"><MapPin size={17}/> Mở bản đồ dẫn đường</button><button onClick={() => router.replace("/")} className="w-full py-2 text-xs font-bold text-slate-500">Về trang khám phá</button></div>
  </div>;
}

function FailedScreen({ booking, vehicle, lot, now, provider, reason, router, releaseSpot, lateIPNRefund }: { booking: Booking | null; vehicle?: { plate: string }; lot: { name: string }; now: number; provider: Provider; reason: string | null; router: ReturnType<typeof useRouter>; releaseSpot: () => void; lateIPNRefund: () => void }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const remain = booking?.status === "holding" ? Math.max(0, Math.ceil((booking.holdExpiresAt - now) / 1000)) : 0;
  const expired = remain === 0 || reason === "expired" || reason === "late";
  const selectOther = () => { releaseSpot(); router.replace(`/bai/${booking?.lotId || "hai-chau-a"}`); };
  return <div className="min-h-full bg-[#f1f5f9] pb-8"><Header title="Kết quả thanh toán" subtitle="Giao dịch đặt cọc giữ chỗ" back={() => router.replace("/")}/>
    <div className="relative text-center px-5 pt-8 pb-5 bg-gradient-to-b from-rose-100 via-rose-50 to-transparent"><div className="mx-auto w-24 h-24 bg-white rounded-full shadow-sm grid place-items-center mb-4"><XCircle size={55} strokeWidth={1.5} className="text-rose-500"/></div><h2 className="text-2xl font-black">{reason === "late" ? "Giao dịch đến sau hạn giữ chỗ" : expired ? "Đã hết thời gian giữ chỗ" : "Thanh toán không thành công"}</h2><p className="text-sm text-slate-600 mt-2 leading-6">{reason === "late" ? "Trong kịch bản mô phỏng, kết quả thanh toán đến quá muộn nên vé không được kích hoạt. Không có giao dịch tiền thật hay hoàn tiền thật." : expired ? "Ô đỗ không còn được bảo đảm. Vui lòng chọn lại trước khi thanh toán." : "Giao dịch thử nghiệm bị từ chối. Bạn vẫn có thể thử lại trước khi hết thời gian giữ chỗ."}</p></div>
    <div className="px-4 space-y-4"><div className={`rounded-2xl p-4 border flex items-center justify-between ${expired ? "bg-slate-200 border-slate-300" : "bg-amber-50 border-amber-200"}`}><div><p className="text-xs font-extrabold">{expired ? "Giữ chỗ đã hết hạn" : `Ô ${booking?.spotId || "-"} vẫn được giữ`}</p><p className="text-[11px] text-slate-500 mt-1">{expired ? "Bạn cần chọn ô khác" : "Cố gắng hoàn tất thanh toán sớm"}</p></div><strong className="font-black text-lg tabular-nums">{timeText(remain)}</strong></div>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-3"><h3 className="font-extrabold text-sm">Thông tin giao dịch</h3><InfoRow label="Trạng thái" value={expired ? "Hết hạn" : "Thất bại (mô phỏng)"}/><InfoRow label="Phương thức" value={providerName(provider)}/><InfoRow label="Mã đặt chỗ" value={booking?.id || "-"}/><InfoRow label="Số tiền dự định thanh toán" value={money(DEPOSIT)}/><InfoRow label="Bãi đỗ" value={lot.name}/><InfoRow label="Vị trí" value={booking?.spotId || "-"}/><InfoRow label="Biển số" value={vehicle?.plate || "-"}/></div>
      <div className="bg-white rounded-2xl p-4 border border-slate-100"><button onClick={() => setShowHelp((v) => !v)} className="w-full flex justify-between items-center text-left gap-2"><span className="flex gap-2 text-sm font-extrabold"><CircleHelp size={19} className="text-blue-600"/> Tiền của tôi có bị trừ không?</span><ChevronDown size={17}/></button>{showHelp && <p className="text-xs text-slate-600 mt-3">Trong chế độ thử nghiệm của đồ án, không có tiền thật bị trừ và không phát sinh giao dịch hoàn tiền. Nếu sau này tích hợp cổng thật, trạng thái trừ tiền và hoàn tiền phải lấy từ đối soát của nhà cung cấp thanh toán.</p>}</div>
      {!expired && booking?.status === "holding" ? <div className="space-y-2"><button onClick={() => router.push(`/thanh-toan/${provider}`)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-extrabold flex items-center justify-center gap-2"><RefreshCw size={18}/> Thử lại thanh toán</button><button onClick={() => router.push(`/dat-cho/${encodeURIComponent(booking.spotId)}`)} className="w-full py-3.5 rounded-2xl border border-slate-200 bg-white font-extrabold text-slate-700">Đổi phương thức thanh toán</button><button onClick={() => setConfirmCancel(true)} className="w-full py-3 text-rose-600 font-bold text-sm">Hủy giữ chỗ</button></div> : <button onClick={selectOther} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-extrabold">Chọn lại ô đỗ</button>}
      <button onClick={() => router.push("/ai")} className="w-full py-3 text-blue-600 font-bold text-sm flex gap-2 items-center justify-center"><CircleHelp size={17}/> Hỏi trợ lý EZ-Parking</button>
    </div>
    {confirmCancel && <div className="fixed inset-0 z-50 bg-slate-950/60 grid place-items-center p-5"><div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4"><h3 className="font-extrabold text-lg">Hủy giữ chỗ?</h3><p className="text-sm text-slate-600">Ô đỗ sẽ được nhả để người khác có thể đặt.</p><div className="grid grid-cols-2 gap-3"><button onClick={() => setConfirmCancel(false)} className="bg-slate-100 rounded-xl py-3 font-bold">Ở lại</button><button onClick={selectOther} className="bg-rose-600 text-white rounded-xl py-3 font-bold">Hủy giữ</button></div></div></div>}
  </div>;
}
