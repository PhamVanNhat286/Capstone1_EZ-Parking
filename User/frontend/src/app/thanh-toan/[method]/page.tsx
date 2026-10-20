"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Check, XCircle, Loader2, ChevronLeft, Copy, QrCode, Navigation, Clock, CreditCard, Download, Share2, ExternalLink, ReceiptText } from "lucide-react";
import { useStore } from "@/store";
import { QRCodeSVG } from "qrcode.react";
import BottomSheet from "@/components/ui/BottomSheet";
import { getLotByAnyId } from "@/lib/mock/lots";

export default function PaymentFlowPage({ params }: { params: Promise<{ method: string }> }) {
  const { method } = use(params);
  const router = useRouter();
  
  const activeBooking = useStore((s) => s.activeBooking);
  const payDeposit = useStore((s) => s.payDeposit);
  const cancelBooking = useStore((s) => s.cancelBooking);
  const addToast = useStore((s) => s.addToast);
  const isDemo = useStore((s) => s.isDemo);
  const lastPaymentMethod = useStore((s) => s.lastPaymentMethod) || "vnpay";
  const lateIPNRefund = useStore((s) => s.lateIPNRefund);

  // If we are at vnpay/momo and booking is missing/not holding, redirect
  useEffect(() => {
    if (["vnpay", "momo", "card"].includes(method)) {
      if (!activeBooking || activeBooking.status !== "holding") {
        router.push("/");
      }
    }
  }, [method, activeBooking, router]);

  // Handle dang-xu-ly logic
  const [processingState, setProcessingState] = useState<"verifying" | "rechecking">("verifying");
  
  const handleGatewaySuccess = () => {
    router.push(`/thanh-toan/dang-xu-ly?method=${encodeURIComponent(method)}`);
  };

  const handleProcessingSuccess = () => {
    if (activeBooking && Date.now() > activeBooking.holdExpiresAt) {
      router.push("/thanh-toan/dang-xu-ly?late=1");
    } else {
      const requestedMethod = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("method") : null;
      const confirmedMethod = (["vnpay", "momo", "card"].includes(requestedMethod || "") ? requestedMethod : lastPaymentMethod) as "vnpay" | "momo" | "card";
      payDeposit(confirmedMethod);
      router.push("/thanh-toan/thanh-cong");
    }
  };

  useEffect(() => {
    if (method === "dang-xu-ly") {
      // If late IPN mock is active, skip auto timers
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("late") === "1") return;

      let timeout1: NodeJS.Timeout;
      if (!isDemo) {
        timeout1 = setTimeout(() => {
          handleProcessingSuccess();
        }, 3000);
      } else {
        timeout1 = setTimeout(() => {
          setProcessingState("rechecking");
        }, 4000);
      }
      return () => { clearTimeout(timeout1); };
    }
  }, [method, isDemo, activeBooking, lastPaymentMethod, payDeposit, router]);

  const handleFail = () => {
    router.push("/thanh-toan/that-bai");
  };

  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLate(new URLSearchParams(window.location.search).get("late") === "1");
    }
  }, []);

  if (["vnpay", "momo", "card"].includes(method)) {
    return <GatewayScreen method={method} activeBooking={activeBooking} isDemo={isDemo} onSuccess={handleGatewaySuccess} onFail={handleFail} router={router} addToast={addToast} />;
  }

  if (method === "dang-xu-ly") {
    if (isLate) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-500">
            <XCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 text-center">Giao dịch đến muộn</h2>
          <p className="text-sm font-medium text-slate-500 text-center mb-8">
            Hệ thống nhận được thanh toán sau khi quá hạn giữ chỗ. Ô đỗ của bạn đã bị hủy, tiền cọc sẽ tự động hoàn lại.
          </p>
          <button onClick={() => { lateIPNRefund(); router.push("/"); }} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95">
            Chọn ô khác
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col relative pb-32">
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm sticky top-0 z-30">
          <button onClick={() => addToast("Không thể quay lại khi đang xử lý giao dịch", "error")} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-400 active:scale-95">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-[17px] font-bold text-slate-900">Xử lý giao dịch</h1>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 mt-20">
          <Loader2 className="w-12 h-12 text-[#2B4BD1] animate-spin mb-6" />
          <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">
            {processingState === "verifying" ? "Đang xác nhận giao dịch..." : "Đang đối soát..."}
          </h2>
          <p className="text-sm font-medium text-slate-500 text-center mb-8">
            Vui lòng không bấm quay lại hoặc đóng ứng dụng lúc này
          </p>
          
          {processingState === "rechecking" && (
            <button onClick={handleProcessingSuccess} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform max-w-[280px]">
              Kiểm tra lại
            </button>
          )}
        </div>
      </div>
    );
  }

  if (method === "thanh-cong") {
    return <SuccessScreen activeBooking={activeBooking} router={router} addToast={addToast} />;
  }

  if (method === "that-bai") {
    return <FailScreen activeBooking={activeBooking} router={router} lastPaymentMethod={lastPaymentMethod} cancelBooking={cancelBooking} />;
  }

  return null;
}

// -----------------------------------------------------------------------------
// Giao diện quét mã thanh toán. QR ở đây chỉ phục vụ demo, KHÔNG phải QR VNPay thật.
// Giữ nguyên luồng /dang-xu-ly, /thanh-cong, /that-bai của đồ án.
// -----------------------------------------------------------------------------
const DEPOSIT = 50000;
const METHOD_NAMES: Record<string, string> = {
  vnpay: "VNPay QR",
  momo: "Ví điện tử MoMo",
  card: "Thẻ quốc tế Visa/Mastercard",
};

function GatewayScreen({ method, activeBooking, isDemo, onSuccess, onFail, router, addToast }: any) {
  const lot = getLotByAnyId(activeBooking?.lotId);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showCancel, setShowCancel] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [checking, setChecking] = useState(false);

  const bookingId = String(activeBooking?.id || "EZ-DEMO");
  const spotId = String(activeBooking?.spotId || "--");
  const lotName = lot?.name || "Bãi đỗ xe";
  const txId = `VNP-${bookingId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
  // Mã QR nội bộ dùng minh họa. Không chứa thông tin ngân hàng hay URL thanh toán thật.
  const demoQrValue = `EZSPACE-DEMO|BOOKING=${bookingId}|SPOT=${spotId}|DEPOSIT=${DEPOSIT}|METHOD=${method}`;
  const expired = secondsLeft <= 0;
  const countdownText = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const initialHoldingSeconds = 10 * 60;
  const countdownPercent = Math.max(0, Math.min(100, (secondsLeft / initialHoldingSeconds) * 100));

  useEffect(() => {
    const update = () => {
      const expires = activeBooking?.holdExpiresAt;
      setSecondsLeft(expires ? Math.max(0, Math.ceil((expires - Date.now()) / 1000)) : 0);
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [activeBooking?.holdExpiresAt]);

  // Giữ hành vi sandbox cũ khi không bật chế độ Demo.
  // Đây KHÔNG phải xác nhận thanh toán thật từ máy chủ VNPay.
  useEffect(() => {
    if (isDemo || !activeBooking || activeBooking.status !== "holding") return;
    const remainingMs = activeBooking.holdExpiresAt - Date.now();
    if (remainingMs <= 0) return;
    const timer = window.setTimeout(() => onSuccess(), Math.min(3000, remainingMs));
    return () => window.clearTimeout(timer);
  }, [isDemo, activeBooking?.id, activeBooking?.status, activeBooking?.holdExpiresAt]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      addToast(`Đã sao chép ${label}`, "success");
    } catch {
      addToast(`Không thể sao chép ${label}`, "error");
    }
  };

  const saveQr = () => {
    const svg = document.getElementById("ez-payment-qr")?.querySelector("svg");
    if (!svg) return addToast("Không tìm thấy mã QR", "error");
    const svgText = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EZSpace-QR-demo-${bookingId}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    addToast("Đã lưu mã QR mô phỏng", "success");
  };

  const shareQr = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "EZ-Space · Mã đặt chỗ", text: `Mã đặt chỗ ${bookingId}, ô ${spotId}. Đây là giao diện thanh toán mô phỏng.` });
      } else {
        await copy(bookingId, "mã đặt chỗ");
      }
    } catch {
      // Người dùng có thể đóng hộp thoại chia sẻ.
    }
  };

  const cancelHold = () => {
    setShowCancel(false);
    addToast("Đã quay lại trang đặt chỗ");
    router.push(`/dat-cho/${spotId}`);
  };

  const simulateCheck = () => {
    if (expired) {
      addToast("Đã hết thời gian giữ chỗ", "error");
      return;
    }
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      addToast("Đây là giao diện mô phỏng, chưa ghi nhận thanh toán thật", "info");
    }, 850);
  };

  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-900 pb-8">
      <div className="mx-auto w-full max-w-[430px] min-h-screen bg-[#f1f5f9] shadow-sm">
        <header className="sticky top-0 z-20 bg-[#f1f5f9]/95 backdrop-blur border-b border-slate-200 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Quay lại" onClick={() => router.back()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
              <ChevronLeft size={19} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-[17px] leading-tight font-extrabold">Quét mã để thanh toán</h1>
              <p className="text-[11px] leading-snug text-slate-500 mt-1">Thanh toán tiền cọc giữ chỗ · EZ-Space</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center"><CreditCard size={18} /></div>
          </div>
        </header>

        <main className="px-4 py-4 space-y-3">
          {/* Trạng thái giữ chỗ lấy từ dữ liệu Booking thật của store */}
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-3 items-center">
            <div className="relative shrink-0 h-11 w-11 flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fde68a" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${countdownPercent} 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute text-[10px] font-black text-amber-900 tabular-nums">{countdownText}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700">{expired ? "Đã hết hạn giữ chỗ" : "Đang giữ chỗ"}</p>
              <p className="text-xs font-bold text-amber-950 mt-0.5 truncate">Ô {spotId} đang được giữ tạm cho bạn</p>
              <p className="text-[10px] text-amber-700 mt-1">{expired ? "Vui lòng quay lại và đặt ô khác" : "Tự động hết hạn nếu chưa thanh toán"}</p>
            </div>
            <span className="shrink-0 px-2 py-1 bg-white border border-amber-200 rounded-lg text-[10px] font-black text-blue-700">
              {method === "vnpay" ? "VNPay" : method === "momo" ? "MoMo" : "CARD"}
            </span>
          </section>

          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 text-center">
            <div className="flex w-full max-w-[290px] bg-slate-100 p-1 rounded-xl mx-auto mb-4">
              <button type="button" onClick={() => router.push("/thanh-toan/vnpay")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold ${method === "vnpay" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500"}`}>Quét mã VNPay</button>
              <button type="button" onClick={() => router.push("/thanh-toan/card")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold ${method === "card" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500"}`}>Thẻ quốc tế</button>
            </div>
            {method === "momo" && <p className="text-xs font-semibold text-fuchsia-600 mb-2">Thanh toán qua ví điện tử MoMo (mô phỏng)</p>}
            <p className="text-[11px] font-extrabold text-slate-400 tracking-wider">SỐ TIỀN CẦN THANH TOÁN</p>
            <p className="mt-1 text-[30px] leading-none font-black tracking-tight text-blue-600">{DEPOSIT.toLocaleString("vi-VN")} <span className="text-xl">đ</span></p>

            <div id="ez-payment-qr" className="relative mx-auto my-4 w-[215px] h-[215px] rounded-2xl border-2 border-blue-500 p-3 bg-white shadow-inner flex items-center justify-center overflow-hidden">
              <QRCodeSVG value={demoQrValue} size={184} marginSize={1} bgColor="#ffffff" fgColor="#0f172a" title="Mã QR mô phỏng EZ-Space" />
              <div className="absolute left-3 right-3 top-[10%] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#3b82f6] pointer-events-none ez-qr-scan" />
              <span className="absolute inset-x-7 bottom-2 bg-white/95 px-2 py-0.5 rounded-md text-[9px] font-bold text-rose-600">QR DEMO</span>
            </div>
            <p className="text-[11px] text-rose-600 font-semibold">QR minh họa – không dùng chuyển tiền thật</p>
            <p className="mt-2 text-xs text-slate-600">Mã hết hạn sau <span className="font-extrabold text-rose-600 tabular-nums">{countdownText}</span></p>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <button type="button" onClick={() => addToast("Chưa kết nối ứng dụng thanh toán thực tế", "info")} className="py-2.5 px-1 rounded-xl text-white bg-blue-600 text-xs font-bold flex gap-1 items-center justify-center"><ExternalLink size={14} /> Mở App</button>
              <button type="button" onClick={saveQr} className="py-2.5 px-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex gap-1 items-center justify-center"><Download size={14} /> Lưu mã</button>
              <button type="button" onClick={shareQr} className="py-2.5 px-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex gap-1 items-center justify-center"><Share2 size={14} /> Chia sẻ</button>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
              <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><ReceiptText size={16} className="text-blue-600" /> Thông tin thanh toán</h2>
              <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-1 font-bold">Sandbox · {METHOD_NAMES[method] || method}</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2"><span className="text-slate-500">Mã giao dịch:</span><span className="flex items-center min-w-0 gap-2"><strong className="font-mono truncate">{txId}</strong><button type="button" aria-label="Sao chép mã giao dịch" onClick={() => copy(txId, "mã giao dịch")} className="text-blue-600"><Copy size={14} /></button></span></div>
              <div className="flex justify-between items-center gap-2"><span className="text-slate-500">Mã đặt chỗ:</span><span className="flex items-center min-w-0 gap-2"><strong className="font-mono truncate">{bookingId}</strong><button type="button" aria-label="Sao chép mã đặt chỗ" onClick={() => copy(bookingId, "mã đặt chỗ")} className="text-blue-600"><Copy size={14} /></button></span></div>
              <div className="flex justify-between items-center gap-2"><span className="text-slate-500">Ô đỗ:</span><strong className="text-slate-900">{spotId}</strong></div>
            </div>
            <button type="button" onClick={() => setShowSummary((v) => !v)} className="mt-3 pt-3 w-full border-t border-slate-100 text-blue-600 font-bold text-left">
              {showSummary ? "Ẩn thông tin đặt chỗ ▲" : "Xem thông tin đặt chỗ ▼"}
            </button>
            {showSummary && (
              <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                <p><strong>Bãi đỗ:</strong> {lotName}</p>
                <p><strong>Phương thức:</strong> {METHOD_NAMES[method] || method}</p>
                <p><strong>Tiền cọc:</strong> {DEPOSIT.toLocaleString("vi-VN")} đ</p>
                <p className="text-[11px] text-slate-500">Số tiền thanh toán khi ra bãi được tính theo thời gian gửi xe; tiền cọc được khấu trừ theo quy định của đồ án.</p>
              </div>
            )}
          </section>

          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-3 py-3 gap-3">
            <span className="text-xs font-semibold text-blue-900 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" /> Đang đợi thanh toán...</span>
            <button type="button" disabled={checking || expired} onClick={simulateCheck} className="shrink-0 text-[11px] px-3 py-2 rounded-lg border border-blue-200 bg-white text-blue-700 font-extrabold disabled:opacity-50">{checking ? "Đang kiểm tra" : "Kiểm tra ngay"}</button>
          </div>

          <div className="flex items-center justify-center gap-5 text-xs font-bold pt-1">
            <button type="button" onClick={() => setShowCancel(true)} className="text-rose-600">Hủy giữ chỗ</button>
            <span className="text-slate-300">|</span>
            <button type="button" onClick={() => router.push(method === "card" ? "/thanh-toan/vnpay" : "/thanh-toan/card")} className="text-slate-600">Đổi phương thức</button>
          </div>

          {isDemo ? (
            <section className="bg-slate-900 rounded-2xl p-3 text-white shadow-md">
              <div className="flex items-center justify-between mb-3 gap-2"><h2 className="text-[11px] font-black uppercase tracking-wider text-slate-300">Bộ giả lập kiểm thử</h2><span className="text-[10px] bg-slate-800 text-slate-300 rounded px-2 py-1">Mock Mode</span></div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <button type="button" disabled={expired} onClick={onSuccess} className="rounded-lg p-2.5 bg-blue-600 disabled:opacity-40">✓ Thành công (vé QR)</button>
                <button type="button" onClick={onFail} className="rounded-lg p-2.5 bg-rose-600">✕ Số dư không đủ</button>
                <button type="button" onClick={() => { addToast("Giả lập IPN trễ 3 giây", "info"); window.setTimeout(() => { if (Date.now() > (activeBooking?.holdExpiresAt || 0)) router.push("/thanh-toan/dang-xu-ly?late=1"); else onSuccess(); }, 3000); }} className="rounded-lg p-2.5 bg-slate-700">IPN trễ 3 giây</button>
                <button type="button" onClick={() => router.push("/thanh-toan/dang-xu-ly?late=1")} className="rounded-lg p-2.5 bg-amber-700">Hết giờ giữ chỗ</button>
              </div>
            </section>
          ) : (
            <p className="text-center text-[11px] text-slate-500 pb-2">Chế độ Sandbox: hệ thống tự mô phỏng xác nhận giao dịch sau vài giây.</p>
          )}
        </main>
      </div>
      <BottomSheet isOpen={showCancel} onClose={() => setShowCancel(false)} title="Rời khỏi thanh toán?">
        <p className="text-sm text-center text-slate-600 mb-5">Bạn muốn quay lại trang đặt chỗ? Thời gian giữ chỗ vẫn tiếp tục được tính.</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setShowCancel(false)} className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-slate-700">Ở lại</button>
          <button type="button" onClick={cancelHold} className="flex-1 py-3 rounded-xl bg-rose-600 font-bold text-white">Quay lại</button>
        </div>
      </BottomSheet>
      <style jsx>{`
        @keyframes ez-qr-scan-move {
          0%, 100% { top: 10%; opacity: .4; }
          50% { top: 87%; opacity: 1; }
        }
        .ez-qr-scan { animation: ez-qr-scan-move 2.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Success Screen
// -----------------------------------------------------------------------------
const ARRIVAL_WINDOW_SEC = 20 * 60;

function SuccessScreen({ activeBooking, router, addToast }: any) {
  const vehicles = useStore((s) => s.vehicles);
  const isDemoMode = useStore((s) => s.isDemo);
  const lot = getLotByAnyId(activeBooking?.lotId);
  const vehicle = vehicles.find((v) => v.id === activeBooking?.vehicleId) || vehicles.find((v) => v.isPrimary) || vehicles[0];
  const [now, setNow] = useState(() => Date.now());
  const [quickRemaining, setQuickRemaining] = useState<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const expiry = activeBooking?.arrivalExpiresAt || now + ARRIVAL_WINDOW_SEC * 1000;
  const actualRemaining = Math.max(0, Math.ceil((expiry - now) / 1000));
  const remaining = quickRemaining === null ? actualRemaining : Math.min(quickRemaining, actualRemaining);
  const timer = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const ratio = Math.max(0, Math.min(1, remaining / ARRIVAL_WINDOW_SEC));
  const bookingId = String(activeBooking?.id || "—");
  const spotId = String(activeBooking?.spotId || "—");
  const paidAt = activeBooking?.arrivalExpiresAt ? activeBooking.arrivalExpiresAt - ARRIVAL_WINDOW_SEC * 1000 : now;
  const formatTime = (value: number) => new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (value: number) => new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const currency = (amount: number) => amount.toLocaleString("vi-VN") + " đ";
  const tx = `VNP-${bookingId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
  const paymentMethod = activeBooking?.paymentMethod || "vnpay";

  const copyBooking = async () => {
    try { await navigator.clipboard.writeText(bookingId); addToast("Đã sao chép mã đặt chỗ", "success"); }
    catch { addToast("Không thể sao chép mã đặt chỗ", "error"); }
  };

  if (!activeBooking) {
    return <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 px-5 text-center"><p className="text-sm text-slate-500">Không tìm thấy giao dịch. Vui lòng kiểm tra vé trong lịch sử.</p><button className="px-5 py-3 rounded-xl bg-blue-600 text-white font-bold" onClick={() => router.push("/lich-su")}>Xem lịch sử</button></div>;
  }

  return (
    <div className="min-h-full bg-[#f1f5f9] text-slate-900 pb-8">
      <div className="h-11 bg-[#f8fafc] flex items-center justify-between px-6 text-[11px] font-semibold">
        <span>{formatTime(now)}</span>
        <div className="w-24 h-6 rounded-full bg-black flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-700" /><span className="w-2 h-2 rounded-full bg-slate-950 border border-slate-700" /></div>
        <div className="flex gap-1 items-center text-slate-800"><span>▂▃▅</span><span>◕</span><span>▰</span></div>
      </div>

      <section className="relative px-5 pt-5 pb-6 text-center overflow-hidden bg-gradient-to-b from-blue-50 via-slate-50 to-[#f1f5f9]">
        <div className="absolute -top-12 -left-12 w-44 h-44 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="relative mx-auto mb-3 h-24 w-24 flex items-center justify-center">
          <div className="absolute inset-2 rounded-full bg-emerald-100 animate-pulse" />
          <svg className="relative w-24 h-24 drop-shadow-sm" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="43" fill="white" stroke="#22c55e" strokeWidth="4" />
            <path d="M29 52 L44 66 L73 35" fill="none" stroke="#22c55e" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-[22px] font-extrabold tracking-tight">Đặt cọc thành công 🎉</h1>
        <p className="mt-1 text-[12px] text-slate-600">Ô <span className="bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 font-extrabold text-blue-700">{spotId}</span> đã được giữ chỗ riêng cho bạn</p>
        <div className="mt-4 inline-flex flex-col items-center bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-3">
          <span className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Tiền cọc đã thanh toán</span>
          <span className="text-[29px] leading-tight font-extrabold text-blue-600">{currency(DEPOSIT)}</span>
          <span className="text-[9px] text-slate-400">Thanh toán mô phỏng trong đồ án</span>
        </div>
      </section>

      <section className="px-4">
        <div className={`rounded-[20px] p-4 border shadow-sm ${remaining <= 120 ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}`}>
          <div className="flex gap-3 items-center">
            <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#dbeafe" strokeWidth="3.5"/><circle cx="24" cy="24" r="20" fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="125.66" strokeDashoffset={125.66 * (1 - ratio)}/></svg>
              <span className="absolute text-[11px] font-mono font-bold text-blue-700">{timer}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center gap-1 flex-wrap"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">ĐÃ THANH TOÁN CỌC</span><strong className="text-[11px]">Đến trước {formatTime(expiry)}</strong></div>
              <p className="mt-1 text-[12px] font-extrabold">Thời gian giữ chỗ: 20 phút</p>
              <p className="mt-1 text-[10px] text-slate-500">Quá hạn đến bãi, vị trí có thể bị giải phóng và cọc xử lý theo chính sách.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 mt-3.5">
        <div className="bg-white rounded-[22px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2"><span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold">✓ Thành công</span><span className="text-[10px] text-slate-400 font-mono">{formatDate(paidAt)} {formatTime(paidAt)}</span></div>
              <button onClick={copyBooking} className="flex gap-1 items-center text-[10px] font-mono font-bold bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200" title="Sao chép mã đặt chỗ"><span className="max-w-[96px] truncate">{bookingId}</span><Copy size={12}/></button>
            </div>
            <div className="mt-3 space-y-3 text-[12px]">
              <div className="flex items-center justify-between gap-2"><span className="text-slate-500">Bãi đỗ</span><strong className="text-right">{lot.name}</strong></div>
              <div className="flex items-center justify-between gap-2"><span className="text-slate-500">Vị trí ô đỗ</span><strong className="text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-0.5">Ô {spotId}</strong></div>
              <div className="flex items-center justify-between gap-2"><span className="text-slate-500">Xe đăng ký</span><strong className="text-right">{vehicle ? `${vehicle.plate} · ${vehicle.type}` : "Chưa rõ"}</strong></div>
              <div className="flex items-center justify-between gap-2"><span className="text-slate-500">Hạn đến bãi</span><strong>{formatTime(expiry)} · {formatDate(expiry)}</strong></div>
            </div>
          </div>
          <div className="mx-4 flex items-center gap-2"><div className="w-3 h-3 bg-[#f1f5f9] rounded-full -ml-[22px]"/><div className="flex-1 border-t-2 border-dashed border-slate-200"/><div className="w-3 h-3 bg-[#f1f5f9] rounded-full -mr-[22px]"/></div>
          <div className="px-4 py-4">
            <h2 className="font-extrabold text-[12px] mb-3">Chi tiết thanh toán cọc</h2>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between gap-2"><span className="text-slate-500">Phương thức</span><strong>{METHOD_NAMES[paymentMethod] || paymentMethod}</strong></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Mã giao dịch mô phỏng</span><span className="font-mono font-semibold truncate">{tx}</span></div>
              <div className="flex justify-between gap-2 pt-2 border-t border-slate-100"><strong>Tiền cọc đã thanh toán</strong><strong className="text-blue-600">{currency(DEPOSIT)}</strong></div>
            </div>
            <p className="mt-3 rounded-xl bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-500">Phí còn lại khi ra bãi được tính theo thời gian gửi thực tế; tiền cọc được khấu trừ theo chính sách hệ thống.</p>
          </div>
        </div>
      </section>

      <div className="px-4 pt-4 space-y-2.5">
        {isDemoMode && <button type="button" onClick={() => setQuickRemaining(120)} className="w-full text-xs py-2.5 border border-amber-200 rounded-xl bg-amber-50 text-amber-700 font-semibold">Demo: Xem cảnh báo còn 2 phút</button>}
        <button onClick={() => router.push(`/ve/${encodeURIComponent(bookingId)}`)} className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-extrabold text-[13px] shadow-md flex items-center justify-center gap-2"><QrCode size={18}/> Xem vé QR &amp; Dẫn đường vào bãi <Navigation size={15}/></button>
        <button onClick={() => router.push(`/ve/${encodeURIComponent(bookingId)}/chi-duong`)} className="w-full py-3 rounded-xl bg-white border border-slate-200 font-bold text-[12px] text-blue-700 flex items-center justify-center gap-2"><Navigation size={15}/> Mở màn hình chỉ đường</button>
        <button onClick={() => router.push("/")} className="w-full py-2.5 font-semibold text-[12px] text-slate-500">← Về trang Khám phá</button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Màn hình kết quả thất bại, hết hạn và thanh toán đến muộn.
// Dữ liệu demo chỉ là mô phỏng, không phải kết quả đối soát ngân hàng.
// -----------------------------------------------------------------------------
function FailScreen({ activeBooking, router, lastPaymentMethod, cancelBooking }: any) {
  const vehicles = useStore((s) => s.vehicles);
  const addToast = useStore((s) => s.addToast);
  const isDemo = useStore((s) => s.isDemo);
  const lot = getLotByAnyId(activeBooking?.lotId);
  const vehicle = vehicles.find((v: any) => v.id === activeBooking?.vehicleId);
  const [now, setNow] = useState(() => Date.now());
  const [showCancel, setShowCancel] = useState(false);
  const [showRefundInfo, setShowRefundInfo] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [errorCode, setErrorCode] = useState("51");
  const [attempts, setAttempts] = useState(1);
  const [demoVariant, setDemoVariant] = useState<"failed" | "expired" | "late_payment">("failed");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requested = query.get("variant");
    if (requested === "late_payment" || requested === "expired") setDemoVariant(requested);
    const code = query.get("code");
    if (code && ["51", "11", "65", "75"].includes(code)) setErrorCode(code);
  }, []);

  const bookingId = String(activeBooking?.id || "EZ-DEMO");
  const spotId = String(activeBooking?.spotId || "--");
  const holdDeadline = Number(activeBooking?.holdExpiresAt || 0);
  const remaining = Math.max(0, Math.ceil((holdDeadline - now) / 1000));
  const actualExpired = !activeBooking || activeBooking.status !== "holding" || remaining === 0;
  const variant = actualExpired && demoVariant === "failed" ? "expired" : demoVariant;
  const canRetry = variant === "failed" && !actualExpired;
  const timerText = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const ringOffset = 113.1 * (1 - Math.min(1, remaining / 600));
  const paymentName = METHOD_NAMES[lastPaymentMethod] || "VNPay Gateway";
  const txCode = `DEMO-${bookingId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(-12)}`;
  const failures: Record<string, { title: string; description: string; suggestion: string }> = {
    "51": { title: "Số dư tài khoản không đủ", description: "Ngân hàng hoặc ví không đủ số dư để thực hiện khoản đặt cọc.", suggestion: "Nạp thêm tiền hoặc đổi sang phương thức thanh toán khác." },
    "11": { title: "Quá thời gian thanh toán", description: "Phiên thanh toán đã quá thời gian phản hồi cho phép.", suggestion: "Thử lại để bắt đầu phiên mới nếu thời gian giữ chỗ còn hiệu lực." },
    "65": { title: "Vượt hạn mức giao dịch", description: "Phương thức thanh toán đã chạm hạn mức giao dịch cho phép.", suggestion: "Kiểm tra hạn mức với ngân hàng hoặc đổi phương thức khác." },
    "75": { title: "Dịch vụ thanh toán tạm gián đoạn", description: "Cổng thanh toán hoặc ngân hàng hiện chưa xử lý được yêu cầu.", suggestion: "Vui lòng thử lại sau hoặc chọn phương thức khác." },
  };
  const reason = failures[errorCode] || failures["51"];
  const isLate = variant === "late_payment";
  const isExpired = variant === "expired";
  const title = isLate ? "Thanh toán đến muộn" : isExpired ? "Giữ chỗ đã hết hạn" : "Thanh toán không thành công";
  const subtitle = isLate
    ? "Hệ thống nhận được thông báo giao dịch sau khi phiên giữ chỗ kết thúc. Ô đỗ không còn được bảo đảm."
    : isExpired
      ? `Thời gian giữ ô ${spotId} đã kết thúc. Vui lòng chọn lại vị trí.`
      : `Ô ${spotId} vẫn được giữ tạm cho bạn. Hãy thử lại trước khi hết giờ.`;

  const retry = () => {
    if (!canRetry) return;
    setAttempts((n) => Math.min(3, n + 1));
    router.push(`/thanh-toan/${["vnpay", "momo", "card"].includes(lastPaymentMethod) ? lastPaymentMethod : "vnpay"}`);
  };
  const changeMethod = () => {
    if (!canRetry) return;
    router.push(`/dat-cho/${encodeURIComponent(spotId)}`);
  };
  const cancelHold = () => {
    if (activeBooking?.status === "holding") cancelBooking();
    setShowCancel(false);
    router.push("/");
  };
  const copyTx = async () => {
    try { await navigator.clipboard.writeText(txCode); addToast("Đã sao chép mã giao dịch mô phỏng", "success"); }
    catch { addToast("Không thể sao chép", "error"); }
  };

  return (
    <div className="min-h-screen bg-[#e2e8f0] flex items-center justify-center px-2 py-3 text-slate-800">
      <div className="w-full max-w-[390px] h-[min(844px,95dvh)] bg-[#f1f5f9] sm:rounded-[48px] sm:border-[8px] sm:border-slate-900 shadow-2xl flex flex-col overflow-hidden relative">
        <div className="relative flex items-center justify-between px-7 h-10 shrink-0 bg-white/80 text-[11px] font-semibold">
          <span>09:41</span>
          <span className="absolute left-1/2 -translate-x-1/2 h-6 w-24 bg-black rounded-full" />
          <span className="flex items-center gap-1"><span>▂▄▆</span><span>◉</span><span>▰</span></span>
        </div>
        <header className="bg-white/90 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
          <button type="button" aria-label="Quay lại" onClick={() => router.push("/")} className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center"><ChevronLeft size={19}/></button>
          <div className="text-center"><h1 className="font-extrabold text-[15px]">Kết quả thanh toán</h1><p className="text-[10px] text-slate-500">Giao dịch đặt cọc giữ chỗ</p></div>
          <button type="button" aria-label="Trợ giúp" onClick={() => setShowHelp(true)} className="h-9 w-9 rounded-full bg-slate-100 font-bold text-slate-600">?</button>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className={`text-center px-5 pt-6 pb-5 bg-gradient-to-b ${isLate ? "from-blue-100 via-blue-50/60" : isExpired ? "from-amber-100 via-amber-50/60" : "from-red-100 via-rose-50/50"} to-[#f1f5f9]`}>
            <div className={`mx-auto mb-3 h-20 w-20 rounded-full flex items-center justify-center border-2 shadow-sm ${isLate ? "bg-blue-50 border-blue-200 text-blue-600" : isExpired ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-red-50 border-red-200 text-red-500"}`}>
              {isLate ? <Clock size={40}/> : isExpired ? <Clock size={40}/> : <XCircle size={42}/>}
            </div>
            <h2 className="font-extrabold text-[20px] text-slate-900">{title}</h2>
            <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">{subtitle}</p>
          </div>
          <div className="px-4 space-y-3">
            {canRetry && (
              <section className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
                <div className="h-12 w-12 relative shrink-0 flex items-center justify-center">
                  <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90"><circle cx="24" cy="24" r="18" fill="none" stroke="#fde68a" strokeWidth="3.5"/><circle cx="24" cy="24" r="18" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="113.1" strokeDashoffset={ringOffset} strokeLinecap="round"/></svg>
                  <span className="absolute text-[10px] font-extrabold text-rose-600">{timerText}</span>
                </div>
                <div className="flex-1 min-w-0"><p className="text-[10px] font-extrabold uppercase text-amber-700">Đang giữ chỗ</p><p className="text-[12px] font-bold">Ô {spotId} vẫn được giữ</p><p className="text-[10px] text-amber-700">Hết giờ, hệ thống có thể mở lại ô.</p></div>
                <button type="button" className="text-[10px] text-rose-600 font-bold" onClick={() => setShowCancel(true)}>Hủy giữ</button>
              </section>
            )}
            <section className="rounded-2xl border border-red-100 bg-white shadow-sm p-4">
              <div className="flex gap-3 items-start"><div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isLate ? "bg-blue-50 text-blue-600" : isExpired ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}><ReceiptText size={21}/></div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-1 justify-between flex-wrap"><h3 className="font-extrabold text-[13px]">{isLate ? "Cần đối soát giao dịch" : isExpired ? "Phiên giữ chỗ kết thúc" : reason.title}</h3><span className="text-[10px] bg-slate-100 rounded-full px-2 py-0.5 text-slate-500 font-mono">{isLate ? "LATE" : isExpired ? "EXPIRED" : `Mã ${errorCode}`}</span></div>
                  <p className="text-[11px] leading-relaxed text-slate-600 mt-1">{isLate ? "Nếu tiền đã được ghi nợ, cần kiểm tra kết quả đối soát và chính sách hoàn tiền của cổng thanh toán." : isExpired ? "Không thể tiếp tục thanh toán trên phiên giữ chỗ này." : reason.description}</p>
                  <p className="mt-2.5 p-2 bg-slate-50 rounded-xl text-[11px] text-slate-700">{isLate ? "Không tự động khẳng định đã hoàn tiền khi chưa có xác nhận từ hệ thống." : isExpired ? "Hãy chọn ô còn trống để tạo lượt đặt mới." : reason.suggestion}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowRefundInfo((v) => !v)} className="w-full mt-3 pt-3 border-t border-slate-100 flex justify-between text-left text-[11px] font-bold"><span>Tiền của tôi có bị trừ không?</span><span>{showRefundInfo ? "⌃" : "⌄"}</span></button>
              {showRefundInfo && <p className="mt-2 text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-2 text-slate-600">Nếu tài khoản bị trừ tiền nhưng chưa nhận vé, hãy kiểm tra lịch sử giao dịch. Việc hoàn tiền phụ thuộc kết quả đối soát và chính sách của bên thanh toán; không thanh toán lại khi giao dịch trước vẫn đang chờ xác nhận.</p>}
            </section>

            <section className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              <div className="p-4"><div className="flex justify-between items-center border-b border-slate-100 pb-3"><h3 className="text-[11px] font-extrabold uppercase">Thông tin giao dịch</h3><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isLate ? "bg-blue-50 text-blue-700" : isExpired ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>{isLate ? "Cần đối soát" : isExpired ? "Hết hạn" : "Thất bại"}</span></div>
                <div className="text-[11px] mt-3 space-y-3"><div className="flex justify-between gap-2"><span className="text-slate-500">Phương thức</span><strong>{paymentName}</strong></div><div className="flex justify-between gap-2 items-center"><span className="text-slate-500">Mã giao dịch demo</span><button type="button" onClick={copyTx} className="flex items-center gap-1 font-mono text-[10px] font-bold"><span className="max-w-[120px] truncate">{txCode}</span><Copy size={12}/></button></div><div className="flex justify-between"><span className="text-slate-500">Tiền cọc</span><strong>{DEPOSIT.toLocaleString("vi-VN")} đ</strong></div><div className="flex justify-between"><span className="text-slate-500">Lần thử (demo)</span><strong>{attempts} / 3</strong></div></div>
              </div>
              <div className="mx-4 flex items-center gap-1"><span className="w-3 h-3 -ml-5 rounded-full bg-[#f1f5f9]"/><div className="flex-1 border-t-2 border-dashed border-slate-200"/><span className="w-3 h-3 -mr-5 rounded-full bg-[#f1f5f9]"/></div>
              <div className="p-4 text-[11px] space-y-2"><div className="flex justify-between gap-2"><span className="text-slate-500">Bãi đỗ</span><strong className="text-right">{lot?.name || "Bãi đỗ"}</strong></div><div className="flex justify-between gap-2"><span className="text-slate-500">Vị trí</span><strong className="text-blue-700">Ô {spotId}</strong></div><div className="flex justify-between gap-2"><span className="text-slate-500">Mã đặt chỗ</span><strong className="font-mono">{bookingId}</strong></div>{vehicle?.plate && <div className="flex justify-between gap-2"><span className="text-slate-500">Biển số</span><strong>{vehicle.plate}</strong></div>}</div>
            </section>
            <button type="button" className="w-full text-left rounded-2xl bg-white border border-slate-200 p-3 flex items-center justify-between" onClick={() => setShowHelp(true)}><span className="text-[12px] font-bold">Cần hỗ trợ thanh toán?</span><span className="text-blue-600 text-[11px] font-bold">Xem hướng dẫn →</span></button>
            {isDemo && <section className="rounded-2xl bg-slate-900 p-3 text-white"><p className="text-[10px] text-slate-300 uppercase font-bold mb-2">Bộ giả lập kiểm thử</p><div className="grid grid-cols-3 gap-1.5">{(["failed", "expired", "late_payment"] as const).map((v) => <button key={v} type="button" onClick={() => setDemoVariant(v)} className={`text-[10px] rounded-lg p-2 ${demoVariant === v ? "bg-blue-600" : "bg-slate-700"}`}>{v === "failed" ? "Thất bại" : v === "expired" ? "Hết hạn" : "IPN trễ"}</button>)}</div><div className="grid grid-cols-4 gap-1.5 mt-2">{["51", "11", "65", "75"].map((code) => <button key={code} type="button" onClick={() => { setErrorCode(code); setDemoVariant("failed"); }} className="rounded-lg bg-slate-700 p-2 text-[10px]">Lỗi {code}</button>)}</div><button type="button" onClick={() => setAttempts((n) => n === 3 ? 1 : 3)} className="mt-2 text-[10px] text-slate-300">Đổi lượt thử demo: {attempts}/3</button></section>}
          </div>
        </main>
        <div className="shrink-0 bg-white/95 border-t border-slate-200 p-4 space-y-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
          {canRetry ? <><button type="button" onClick={retry} className="w-full py-3 rounded-xl font-extrabold text-white bg-blue-600 text-[13px]">↻ Thử lại thanh toán</button><div className="grid grid-cols-2 gap-2"><button type="button" onClick={changeMethod} className="border border-blue-600 rounded-xl p-2.5 text-[11px] font-bold text-blue-600">Đổi phương thức</button><button type="button" onClick={() => setShowCancel(true)} className="border border-rose-200 bg-rose-50 rounded-xl p-2.5 text-[11px] font-bold text-rose-600">Hủy giữ chỗ</button></div></> : <><button type="button" onClick={cancelHold} className="w-full py-3 bg-blue-600 text-white rounded-xl font-extrabold text-[13px]">Chọn ô đỗ mới</button><button type="button" onClick={() => setShowHelp(true)} className="w-full py-2 rounded-xl bg-slate-100 text-[11px] font-bold">{isLate ? "Hướng dẫn kiểm tra hoàn tiền" : "Hỗ trợ"}</button></>}
          <div className="w-28 h-1 bg-slate-900/40 rounded-full mx-auto mt-2"/>
        </div>
      </div>
      <BottomSheet isOpen={showCancel} onClose={() => setShowCancel(false)} title="Xác nhận hủy giữ chỗ">
        <p className="text-sm text-slate-600 text-center mb-5">Nếu hủy, phiên giữ chỗ sẽ kết thúc và ô đỗ có thể được mở lại cho người khác.</p><div className="flex gap-2"><button type="button" onClick={() => setShowCancel(false)} className="flex-1 bg-slate-100 rounded-xl p-3 font-bold">Ở lại</button><button type="button" onClick={cancelHold} className="flex-1 bg-rose-600 text-white rounded-xl p-3 font-bold">Xác nhận hủy</button></div>
      </BottomSheet>
      <BottomSheet isOpen={showHelp} onClose={() => setShowHelp(false)} title="Hỗ trợ giao dịch">
        <p className="text-sm text-slate-600 leading-relaxed">Vui lòng kiểm tra lịch sử giao dịch trên ứng dụng ngân hàng/ví. Nếu tài khoản đã bị trừ tiền nhưng trạng thái chưa xác nhận, không nên thực hiện lại ngay. Hãy lưu mã giao dịch và liên hệ bộ phận hỗ trợ thanh toán để đối soát.</p><button type="button" onClick={() => setShowHelp(false)} className="mt-4 w-full bg-blue-600 text-white p-3 rounded-xl font-bold">Đã hiểu</button>
      </BottomSheet>
    </div>
  );
}
