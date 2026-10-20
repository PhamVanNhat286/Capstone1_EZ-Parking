"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CircleAlert,
  CircleX,
  ClockAlert,
  Check,
  Copy,
  Headset,
  Hourglass,
  LayoutGrid,
  MapPin,
  RefreshCw,
  RotateCcw,
  ServerOff,
  ShieldAlert,
  ShieldCheck,
  Sparkle,
  Sparkles,
  TriangleAlert,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useStore, type Booking } from "@/store";
import { getLotByAnyId } from "@/lib/mock/lots";

// -----------------------------------------------------------------------------
// Cấu hình
// -----------------------------------------------------------------------------
const HOLD_TOTAL_SECONDS = 10 * 60; // khớp holdSpot() trong store (10 phút)
const MAX_ATTEMPTS = 3;
const RING_CIRCUMFERENCE = 2 * Math.PI * 18; // r = 18
const HOTLINE_TEL = "tel:19006868";
const HOTLINE_LABEL = "1900 6868";

type ErrorConf = {
  title: string;
  description: (amount: string) => string;
  suggestion: string;
  Icon: LucideIcon;
};

// Mã lỗi cổng thanh toán -> nội dung hiển thị
export const PAYMENT_ERROR_CONFIG: Record<string, ErrorConf> = {
  "51": {
    title: "Số dư tài khoản không đủ",
    description: (a) => `Tài khoản không đủ số dư để thanh toán tiền cọc ${a}.`,
    suggestion: "Gợi ý: Nạp thêm tiền vào ví hoặc đổi phương thức thanh toán.",
    Icon: WalletCards,
  },
  "11": {
    title: "Quá thời gian thanh toán",
    description: () => "Phiên thanh toán đã quá thời hạn phản hồi cho phép của cổng.",
    suggestion: 'Gợi ý: Bấm "Thử lại" để tạo phiên thanh toán mới ngay lập tức.',
    Icon: ClockAlert,
  },
  "65": {
    title: "Vượt hạn mức giao dịch",
    description: () => "Thẻ hoặc ví của bạn đã đạt hạn mức chi tiêu trong ngày theo quy định ngân hàng.",
    suggestion: "Gợi ý: Nâng hạn mức trên app ngân hàng hoặc chuyển sang phương thức khác.",
    Icon: ShieldAlert,
  },
  "75": {
    title: "Ngân hàng đang bảo trì",
    description: () => "Hệ thống của ngân hàng liên kết đang trong phiên cập nhật định kỳ.",
    suggestion: "Gợi ý: Vui lòng thử lại sau ít phút hoặc dùng phương thức khác.",
    Icon: ServerOff,
  },
  other: {
    title: "Giao dịch bị từ chối",
    description: () => "Ngân hàng phát hành từ chối giao dịch hoặc kết nối mạng không ổn định.",
    suggestion: "Gợi ý: Liên hệ tổng đài ngân hàng hoặc thử một phương thức khác.",
    Icon: TriangleAlert,
  },
};

const METHOD_INFO: Record<string, { label: string; badge: string; prefix: string }> = {
  vnpay: { label: "VNPay Gateway", badge: "VN", prefix: "VNP" },
  momo: { label: "Ví MoMo", badge: "MM", prefix: "MOMO" },
  card: { label: "Thẻ quốc tế Visa/Master", badge: "VS", prefix: "CARD" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const formatTimer = (sec: number) => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
const formatDateTime = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

type DialogMode = "cancel" | "leave" | null;

// -----------------------------------------------------------------------------
// Màn hình
// -----------------------------------------------------------------------------
export default function PaymentFailedScreen({ deposit }: { deposit: number }) {
  const router = useRouter();

  const activeBooking = useStore((s) => s.activeBooking);
  const paymentFailure = useStore((s) => s.paymentFailure);
  const vehicles = useStore((s) => s.vehicles);
  const lastPaymentMethod = useStore((s) => s.lastPaymentMethod) || "vnpay";
  const cancelBooking = useStore((s) => s.cancelBooking);
  const addToast = useStore((s) => s.addToast);

  const [mounted, setMounted] = useState(false);
  // Lưu bản sao booking: store tự xóa activeBooking khi hết hạn giữ chỗ,
  // nhưng màn hình vẫn cần dữ liệu để hiển thị biến thể "Hết hạn".
  const [booking, setBooking] = useState<Booking | null>(null);
  const bookingRef = useRef<Booking | null>(null);
  const leavingRef = useRef(false);

  const [now, setNow] = useState(() => Date.now());
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (activeBooking && activeBooking.status === "holding") {
      bookingRef.current = activeBooking;
      setBooking(activeBooking);
    } else if (!bookingRef.current && !leavingRef.current) {
      router.replace("/");
    }
  }, [activeBooking, router]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted || !booking) return null;

  const lot = getLotByAnyId(booking.lotId);
  const vehicle = vehicles.find((v) => v.id === booking.vehicleId);
  const remaining = Math.max(0, Math.floor((booking.holdExpiresAt - now) / 1000));
  const isExpired = remaining <= 0;
  const urgent = remaining <= 60;
  const progress = Math.min(1, remaining / HOLD_TOTAL_SECONDS);

  const code = paymentFailure?.code ?? "51";
  const conf = PAYMENT_ERROR_CONFIG[code] ?? PAYMENT_ERROR_CONFIG.other;
  const attempts = Math.max(1, paymentFailure?.attempts ?? 1);
  const failedAt = paymentFailure?.lastAt ?? now;
  const amountText = `${deposit.toLocaleString("vi-VN")}đ`;

  const method = METHOD_INFO[lastPaymentMethod] ?? METHOD_INFO.vnpay;
  const txCode = `${method.prefix}${String(booking.createdAt).slice(-8)}`;

  // ---- Hành động -------------------------------------------------------------
  const handleRetry = () => {
    if (retrying) return;
    setRetrying(true);
    setTimeout(() => router.push(`/thanh-toan/${lastPaymentMethod}`), 700);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(txCode);
    } catch {
      /* bỏ qua: vẫn báo đã sao chép trong chế độ demo */
    }
    setCopied(true);
    addToast(`Đã sao chép: ${txCode}`, "success");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleConfirmDialog = () => {
    const mode = dialog;
    setDialog(null);
    leavingRef.current = true;
    if (mode === "cancel") {
      cancelBooking();
      addToast(`Đã hủy giữ chỗ ô ${booking.spotId}`);
    }
    router.push("/");
  };

  const handleBack = () => {
    if (!isExpired) setDialog("leave");
    else router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col relative">
      <div role="status" aria-live="assertive" className="sr-only">
        {isExpired
          ? "Giữ chỗ đã hết hạn."
          : `Thanh toán không thành công. Lý do: ${conf.title}. ${conf.suggestion}`}
      </div>

      {/* Header */}
      <div className="px-4 py-2.5 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20">
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 active:scale-95 transition text-slate-700"
          aria-label="Quay lại"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-slate-900 leading-tight">Kết quả thanh toán</h1>
          <p className="text-[11px] font-medium text-slate-500">Giao dịch đặt cọc giữ chỗ</p>
        </div>
        <button
          onClick={() => addToast("Trung tâm trợ giúp EZ-Space")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 active:scale-95 transition text-slate-600"
          aria-label="Trợ giúp"
        >
          <CircleHelp size={20} />
        </button>
      </div>

      <main className="flex-1 pb-44">
        {/* Hero */}
        <div
          className={clsx(
            "relative pt-6 pb-5 px-5 overflow-hidden text-center",
            isExpired
              ? "bg-gradient-to-b from-amber-100/70 via-slate-100/60 to-[#F1F5F9]"
              : "bg-gradient-to-b from-red-100/70 via-rose-50/40 to-[#F1F5F9]"
          )}
        >
          <div
            className={clsx(
              "absolute -top-10 left-1/4 w-40 h-40 rounded-full blur-2xl ez-float-slow pointer-events-none",
              isExpired ? "bg-amber-200/40" : "bg-red-200/40"
            )}
          />
          <div className="absolute top-8 right-6 w-32 h-32 bg-rose-200/30 rounded-full blur-xl pointer-events-none" />

          <div className="relative mx-auto w-24 h-24 mb-4 flex items-center justify-center">
            <div
              className={clsx(
                "absolute inset-0 rounded-full animate-pulse-ring",
                isExpired ? "bg-amber-300/30" : "bg-red-300/40"
              )}
            />
            {isExpired ? (
              <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 shadow-md flex items-center justify-center">
                <Hourglass size={36} className="text-amber-600 animate-pulse" />
              </div>
            ) : (
              <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 shadow-md flex items-center justify-center ez-shake">
                <svg
                  className="w-10 h-10 text-red-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" className="ez-icon-draw" />
                  <line x1="6" y1="6" x2="18" y2="18" className="ez-icon-draw" style={{ animationDelay: "0.25s" }} />
                </svg>
              </div>
            )}
          </div>

          {isExpired ? (
            <>
              <h2 className="text-[21px] font-extrabold text-slate-900 tracking-tight mb-1">Giữ chỗ đã hết hạn</h2>
              <p className="text-[13px] text-slate-600 font-medium px-4 leading-relaxed">
                Thời gian giữ chỗ cho ô <span className="font-bold text-slate-700">{booking.spotId}</span> đã hết và vị trí
                đã được tự động mở lại cho xe khác.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-[21px] font-extrabold text-slate-900 tracking-tight mb-1">Thanh toán không thành công</h2>
              <p className="text-[13px] text-slate-600 font-medium px-4 leading-relaxed">
                Đừng lo, ô{" "}
                <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  {booking.spotId}
                </span>{" "}
                vẫn đang được giữ cho bạn. Hãy thử lại trước khi hết giờ.
              </p>
            </>
          )}
        </div>

        <div className="px-4 space-y-3.5 -mt-1 relative z-10">
          {/* Banner đếm ngược */}
          {!isExpired && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <svg className="w-11 h-11 -rotate-90">
                    <circle cx="22" cy="22" r="18" className="text-amber-100" strokeWidth="3.5" stroke="currentColor" fill="none" />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      className={clsx("transition-all duration-1000", urgent ? "text-red-500" : "text-amber-500")}
                      strokeWidth="3.5"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                    />
                  </svg>
                  <span
                    className={clsx(
                      "absolute text-[11px] font-bold tracking-tighter tabular-nums",
                      urgent ? "text-red-600 animate-pulse" : "text-amber-900"
                    )}
                  >
                    {formatTimer(remaining)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <span className="inline-flex items-center px-1.5 bg-amber-500/15 text-amber-800 rounded text-[10px] font-bold tracking-wide uppercase">
                      Đang giữ chỗ
                    </span>
                    <span className="text-xs font-bold text-slate-800">Ô {booking.spotId} vẫn được giữ</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80">Quá thời gian trên, ô sẽ tự mở lại cho xe khác.</p>
                </div>
              </div>
              <button
                onClick={() => setDialog("cancel")}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 shrink-0 active:scale-95 transition"
              >
                Hủy giữ
              </button>
            </div>
          )}

          {/* Nguyên nhân thất bại */}
          {!isExpired && (
            <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm relative overflow-hidden">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                  <conf.Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{conf.title}</h3>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium shrink-0">
                      Mã lỗi: {code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-normal">{conf.description(amountText)}</p>
                  <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2">
                    <Sparkle size={14} className="text-blue-600 shrink-0" />
                    <span className="text-[11px] font-medium text-slate-700">{conf.suggestion}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setRefundOpen((v) => !v)}
                  className="w-full flex items-center justify-between text-left group"
                  aria-expanded={refundOpen}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <ShieldCheck size={14} />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition">
                      Tiền của tôi có bị trừ không?
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={clsx("text-slate-400 transition-transform duration-200", refundOpen && "rotate-180")}
                  />
                </button>
                {refundOpen && (
                  <div className="mt-2 pl-7 pr-1 text-[11px] text-slate-600 space-y-1.5 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <p>
                      Nếu tài khoản ngân hàng hoặc ví của bạn đã phát sinh trừ tiền nhưng vé chưa được kích hoạt, hệ thống sẽ{" "}
                      <strong>tự động đối soát và hoàn tiền 100%</strong> trong vòng 15 – 30 phút.
                    </p>
                    <p className="text-slate-500">Bạn hoàn toàn không cần thực hiện thêm thao tác khiếu nại thủ công.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Thông tin giao dịch */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 pb-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Thông tin giao dịch</span>
                <span
                  className={clsx(
                    "inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold border",
                    isExpired ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-600 border-red-200"
                  )}
                >
                  <span className={clsx("w-1.5 h-1.5 rounded-full", isExpired ? "bg-amber-500" : "bg-red-500")} />
                  <span>{isExpired ? "Hết hạn giữ chỗ" : "Thất bại"}</span>
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Phương thức</span>
                  <span className="font-semibold text-slate-800 flex items-center space-x-1">
                    <span className="w-4 h-4 rounded bg-blue-600 text-[9px] font-bold text-white flex items-center justify-center">
                      {method.badge}
                    </span>
                    <span>{method.label}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Mã giao dịch</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-semibold text-slate-800">{txCode}</span>
                    <button
                      onClick={handleCopy}
                      className="text-slate-400 hover:text-blue-600 p-0.5 rounded active:scale-90 transition"
                      title="Sao chép"
                      aria-label="Sao chép mã giao dịch"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Số tiền thanh toán</span>
                  <span className="font-bold text-slate-900 text-sm">{deposit.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Thời gian ghi nhận</span>
                  <span className="font-medium text-slate-700">{formatDateTime(failedAt)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Lần thử</span>
                  <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                    {Math.min(attempts, MAX_ATTEMPTS)} / {MAX_ATTEMPTS} lần
                  </span>
                </div>
              </div>
            </div>

            {/* Đường xé hóa đơn */}
            <div className="relative h-4 bg-slate-100 flex items-center">
              <div className="w-3 h-3 bg-[#F1F5F9] rounded-full -ml-1.5" />
              <div className="flex-1 border-b-2 border-dashed border-slate-300 mx-1" />
              <div className="w-3 h-3 bg-[#F1F5F9] rounded-full -mr-1.5" />
            </div>

            <div className="p-4 pt-3 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 text-xs mb-2">
                <span className="font-bold text-slate-800 flex items-center space-x-1.5 min-w-0">
                  <MapPin size={14} className="text-blue-600 shrink-0" />
                  <span className="truncate">{lot.name}</span>
                </span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px] shrink-0">
                  Ô {booking.spotId}
                  {vehicle ? ` (${vehicle.type})` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                {vehicle && (
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
                    {vehicle.plate}
                  </span>
                )}
                <span className="ml-auto">Mã đơn: {booking.id}</span>
              </div>
            </div>
          </div>

          {/* Cảnh báo thử nhiều lần */}
          {!isExpired && attempts >= MAX_ATTEMPTS && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-start space-x-2">
              <TriangleAlert size={16} className="shrink-0 mt-0.5" />
              <span>
                Bạn đã thử lại nhiều lần. Hãy đổi phương thức thanh toán hoặc liên hệ hỗ trợ để được trợ giúp nhanh hơn.
              </span>
            </div>
          )}

          {/* Hỗ trợ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-1 divide-y divide-slate-100 text-xs">
            <a href={HOTLINE_TEL} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Headset size={16} />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Cần hỗ trợ? Gọi hotline EZ-Space</div>
                  <div className="text-[11px] text-slate-500">Tổng đài {HOTLINE_LABEL} (Hỗ trợ 24/7)</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </a>
            <button
              onClick={() => router.push("/ai")}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Hỏi trợ lý đỗ xe AI</div>
                  <div className="text-[11px] text-slate-500">Nhận hướng dẫn khắc phục tự động</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
      </main>

      {/* Thanh hành động */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
        {isExpired ? (
          <div className="space-y-2">
            <button
              onClick={() => router.push(`/bai/${booking.lotId || lot.id}`)}
              className="w-full h-[50px] bg-blue-600 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 active:scale-[0.98] transition"
            >
              <LayoutGrid size={16} />
              <span>Chọn ô đỗ khác</span>
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl active:scale-95 transition"
            >
              Tìm bãi đỗ khác
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full h-[50px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-blue-500/25 active:scale-[0.98] transition disabled:opacity-90"
            >
              <RotateCcw size={16} className={clsx(retrying && "animate-spin")} />
              <span>{retrying ? "Đang khởi tạo phiên mới..." : "Thử lại thanh toán"}</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => router.push(`/dat-cho/${booking.spotId}`)}
                className="h-10 bg-white border border-blue-600 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-50 active:scale-95 transition flex items-center justify-center space-x-1"
              >
                <RefreshCw size={14} />
                <span>Đổi phương thức</span>
              </button>
              <button
                onClick={() => setDialog("cancel")}
                className="h-10 bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100 active:scale-95 transition flex items-center justify-center space-x-1"
              >
                <CircleX size={14} />
                <span>Hủy giữ chỗ</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hộp thoại xác nhận */}
      {dialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6 max-w-[430px] mx-auto">
          <div className="bg-white rounded-3xl p-5 w-full max-w-xs shadow-2xl text-center" role="dialog" aria-modal="true">
            <div
              className={clsx(
                "w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3",
                dialog === "cancel" ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-600"
              )}
            >
              <CircleAlert size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              {dialog === "cancel" ? "Hủy giữ chỗ ô đỗ?" : "Rời khỏi trang thanh toán?"}
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              {dialog === "cancel"
                ? `Ô ${booking.spotId} tại ${lot.name} sẽ được mở lại ngay lập tức cho các phương tiện khác.`
                : `Ô ${booking.spotId} vẫn được giữ cho bạn đến khi hết giờ. Bạn có thể quay lại thanh toán bất kỳ lúc nào.`}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setDialog(null)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
              >
                Ở lại
              </button>
              <button
                onClick={handleConfirmDialog}
                className={clsx(
                  "py-2.5 px-3 rounded-xl text-xs font-bold text-white active:scale-95 transition shadow-sm",
                  dialog === "cancel" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {dialog === "cancel" ? "Xác nhận hủy" : "Rời khỏi trang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}