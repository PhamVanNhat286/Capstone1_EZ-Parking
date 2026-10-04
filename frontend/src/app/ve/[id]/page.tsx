"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, ScanLine, Clock, X, AlertTriangle, QrCode, CheckCircle2, XCircle } from "lucide-react";
import { useStore } from "@/store";
import { clsx } from "clsx";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const activeBooking = useStore((s) => s.activeBooking);
  const history = useStore((s) => s.history);
  const cancelBooking = useStore((s) => s.cancelBooking);
  const markExpired = useStore((s) => s.markExpired);
  const markEntered = useStore((s) => s.markEntered);
  const markCompleted = useStore((s) => s.markCompleted);
  const fastForward = useStore((s) => s.fastForward);
  const isDemo = useStore((s) => s.isDemo);
  const addToast = useStore((s) => s.addToast);

  // Find booking in active or history
  const bookingInfo = activeBooking?.id === id ? activeBooking : history.find(b => b.id === id);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [qrToken, setQrToken] = useState(Date.now().toString());
  const [qrProgress, setQrProgress] = useState(100);
  const [showCancel, setShowCancel] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  useEffect(() => {
    if (!bookingInfo) {
      router.push("/");
    }
  }, [bookingInfo, router]);

  // Handle Expiration & Timer for `paid` state
  useEffect(() => {
    if (bookingInfo?.status === "paid" && bookingInfo.arrivalExpiresAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((bookingInfo.arrivalExpiresAt! - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          markExpired();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Vibrate on expire
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [bookingInfo, markExpired]);

  // QR Token Rotation (Every 30s)
  useEffect(() => {
    if (bookingInfo?.status === "paid" || bookingInfo?.status === "entered") {
      const interval = setInterval(() => {
        setQrToken(Date.now().toString());
        setQrProgress(100);
      }, 30000);
      
      const tick = setInterval(() => {
        setQrProgress(p => Math.max(0, p - (100 / 300))); // 100ms interval -> 300 ticks in 30s
      }, 100);

      return () => { clearInterval(interval); clearInterval(tick); };
    }
  }, [bookingInfo]);

  if (!bookingInfo) return null;

  const isRefundable = (Date.now() - bookingInfo.createdAt) < 5 * 60 * 1000;
  
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCancel = () => {
    cancelBooking();
    setShowCancel(false);
    addToast("Đã hủy đặt chỗ", "success");
  };

  return (
    <div className={clsx("min-h-screen flex flex-col pb-32 transition-colors duration-500", 
      bookingInfo.status === "cancelled" ? "bg-slate-100" :
      bookingInfo.status === "forfeited" ? "bg-slate-900" :
      "bg-[#2B4BD1]"
    )}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => router.push(bookingInfo.status === "paid" ? "/" : "/lich-su")} className="w-10 h-10 flex items-center justify-center -ml-2 text-white/80 active:scale-95">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-[17px] font-bold text-white">
            {bookingInfo.status === "cancelled" ? "Vé đã hủy" :
             bookingInfo.status === "forfeited" ? "Vé đã hết hạn" :
             bookingInfo.status === "entered" ? "Đang đỗ xe" :
             bookingInfo.status === "completed" ? "Đã hoàn tất" :
             "Vé điện tử"}
          </h1>
        </div>
        <div className="w-10" />
      </div>

      {/* Ticket Card */}
      <div className="flex-1 px-6 pt-4">
        <div className="bg-white rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
          
          {/* Status Overlay for Forfeited / Cancelled */}
          <AnimatePresence>
            {bookingInfo.status === "forfeited" && (
              <motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px]">
                <div className="border-4 border-red-500 text-red-500 font-black text-4xl p-3 uppercase rotate-[-15deg] rounded-lg tracking-widest">
                  Vô Hiệu
                </div>
                <div className="mt-8 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-center border border-red-100 max-w-[240px]">
                  <p className="font-bold text-sm mb-1">Quá hạn đến bãi</p>
                  <p className="text-xs font-medium">Bạn đã không đến bãi đúng giờ quy định. Tiền cọc đã bị trừ vào phí giữ chỗ.</p>
                </div>
              </motion.div>
            )}
            
            {bookingInfo.status === "cancelled" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90">
                <XCircle size={48} className="text-slate-300 mb-4" />
                <div className="text-slate-500 font-bold text-lg mb-1">Đã hủy</div>
                {isRefundable ? (
                  <div className="text-emerald-500 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-full">Đã hoàn tiền 50.000 ₫</div>
                ) : (
                  <div className="text-red-500 font-bold text-sm bg-red-50 px-4 py-2 rounded-full">Không được hoàn cọc</div>
                )}
              </div>
            )}

            {bookingInfo.status === "completed" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95">
                <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                <div className="text-slate-900 font-black text-xl mb-1">Đã hoàn tất</div>
                <div className="text-slate-500 font-medium text-sm mb-4">Cảm ơn bạn đã sử dụng dịch vụ</div>
                <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-100 text-center">
                  <p className="text-xs font-bold text-slate-400 mb-1">Tổng chi phí</p>
                  <p className="text-2xl font-black text-[#2B4BD1]">50.000 ₫</p>
                </div>
              </div>
            )}
          </AnimatePresence>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">Bãi Hải Châu A</h2>
            <p className="text-sm font-medium text-slate-500">Ô đỗ {bookingInfo.spotId} • Biển số 43A-123.45</p>
          </div>

          {/* QR Section */}
          <div className="flex flex-col items-center justify-center mb-8 relative">
            <div 
              className={clsx("relative p-3 rounded-2xl border-2 transition-opacity", 
                bookingInfo.status === "entered" ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50",
                bookingInfo.status === "forfeited" && "opacity-20 blur-sm"
              )}
            >
              <button 
                onClick={() => setShowFullscreen(true)}
                onPointerDown={(e) => {
                  const timer = setTimeout(() => setShowFullscreen(true), 500);
                  e.currentTarget.onpointerup = () => clearTimeout(timer);
                }}
                className="relative active:scale-95 transition-transform"
              >
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={qrToken}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <QRCodeSVG value={`${bookingInfo.id}|${qrToken}`} size={180} />
                  </motion.div>
                </AnimatePresence>

                {/* Scan overlay if entered */}
                {bookingInfo.status === "entered" && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex flex-col items-center justify-center backdrop-blur-[1px]">
                    <CheckCircle2 size={48} className="text-emerald-600 drop-shadow-md" />
                    <span className="text-emerald-700 font-bold mt-2 bg-emerald-50/80 px-3 py-1 rounded-full text-xs">Đã quét vào</span>
                  </div>
                )}
              </button>
            </div>
            
            {/* Auto refresh timer */}
            {(bookingInfo.status === "paid" || bookingInfo.status === "entered") && (
              <div className="mt-4 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="8" cy="8" r="7" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                    <circle cx="8" cy="8" r="7" fill="none" stroke="#2B4BD1" strokeWidth="2" strokeDasharray="44" strokeDashoffset={44 - (44 * qrProgress) / 100} className="transition-all duration-75" />
                  </svg>
                  <QrCode size={8} className="text-[#2B4BD1]" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tự động làm mới</span>
              </div>
            )}
          </div>

          {/* Time & Status Info */}
          <div className="border-t border-slate-100 pt-6">
            {bookingInfo.status === "paid" && (
              <div className="bg-orange-50 border border-orange-100 rounded-[16px] p-4 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-900 mb-0.5">Thời gian đến bãi</p>
                    <p className="text-[10px] font-medium text-orange-700">Đến đúng giờ để giữ cọc</p>
                  </div>
                </div>
                <div className="text-xl font-black text-orange-600 tabular-nums">
                  {formatTimer(timeLeft)}
                </div>
              </div>
            )}

            {bookingInfo.status === "entered" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-[16px] p-4 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900 mb-0.5">Giờ vào bãi</p>
                    <p className="text-[10px] font-medium text-emerald-700">Đang tính phí đỗ xe</p>
                  </div>
                </div>
                <div className="text-sm font-black text-emerald-700">
                  {new Date(bookingInfo.enteredAt || Date.now()).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-[16px] border border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mã vé (Token)</p>
                <p className="font-mono font-bold text-slate-700">{bookingInfo.id}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(bookingInfo.id); addToast("Đã chép mã vé", "success"); }} className="text-[#2B4BD1] bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold">
                Chép
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Actions below card */}
      <div className="px-6 mt-6 space-y-3">
        {bookingInfo.status === "paid" && (
          <>
            <button onClick={() => addToast("Đang mở bản đồ...", "success")} className="w-full bg-white text-[#2B4BD1] font-bold py-4 rounded-[16px] active:scale-95 flex items-center justify-center gap-2 shadow-lg">
              <MapPin size={20} /> Dẫn đường đến bãi
            </button>
            <button onClick={() => setShowCancel(true)} className="w-full bg-transparent text-white/80 font-bold py-4 rounded-[16px] active:scale-95">
              Hủy đặt chỗ
            </button>
          </>
        )}

        {bookingInfo.status === "entered" && (
          <button onClick={() => router.push("/")} className="w-full bg-white text-[#2B4BD1] font-bold py-4 rounded-[16px] active:scale-95 flex items-center justify-center gap-2 shadow-lg">
            Về màn hình chính
          </button>
        )}

        {bookingInfo.status === "forfeited" && (
          <>
            <button onClick={() => router.push("/")} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 shadow-lg shadow-[#2B4BD1]/30">
              Tìm chỗ đỗ mới
            </button>
            <button onClick={() => router.push("/")} className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95">
              Về trang chủ
            </button>
            <button onClick={() => addToast("Chính sách: Khách hàng đến trễ 20 phút sẽ mất cọc", "info")} className="w-full bg-transparent text-slate-500 font-bold py-4 rounded-[16px] active:scale-95">
              Xem chính sách hoàn cọc
            </button>
          </>
        )}

        {bookingInfo.status === "cancelled" && (
          <button onClick={() => router.push(`/bai/${bookingInfo.lotId}`)} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 shadow-lg shadow-[#2B4BD1]/30">
            Đặt lại ô này
          </button>
        )}

        {bookingInfo.status === "completed" && (
          <button onClick={() => router.push("/")} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 shadow-lg shadow-[#2B4BD1]/30">
            Về trang chủ
          </button>
        )}
      </div>

      {/* Fullscreen QR Modal */}
      <AnimatePresence>
        {showFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowFullscreen(false)}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6"
          >
            <button className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md active:scale-95">
              <X size={28} />
            </button>
            <div className="bg-white p-6 rounded-[32px] w-full max-w-sm flex items-center justify-center aspect-square">
              <QRCodeSVG value={`${bookingInfo.id}|${qrToken}`} className="w-full h-full" />
            </div>
            <p className="text-white/60 font-medium mt-8 text-center px-8">
              Chạm vào bất cứ đâu để đóng
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Dialog */}
      <BottomSheet isOpen={showCancel} onClose={() => setShowCancel(false)} title="Hủy đặt chỗ?">
        {isRefundable ? (
          <div className="flex items-start gap-3 bg-emerald-50 text-emerald-800 p-4 rounded-[16px] mb-6 border border-emerald-100">
            <CheckCircle2 size={24} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm mb-1">Hoàn cọc 100%</h4>
              <p className="text-xs font-medium text-emerald-700">Bạn hủy trong vòng 5 phút đầu, hệ thống sẽ tự động hoàn 50.000 ₫ về thẻ/ví của bạn.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-[16px] mb-6 border border-red-100">
            <AlertTriangle size={24} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm mb-1">Không hoàn cọc</h4>
              <p className="text-xs font-medium text-red-700">Đã quá 5 phút kể từ lúc đặt, việc hủy lúc này sẽ không được hoàn lại 50.000 ₫.</p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setShowCancel(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95">Không</button>
          <button onClick={handleCancel} className="flex-1 bg-red-500 text-white font-bold py-4 rounded-[16px] active:scale-95">Xác nhận hủy</button>
        </div>
      </BottomSheet>

      {/* Demo Tools */}
      {isDemo && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 flex gap-2 z-40 overflow-x-auto">
          {bookingInfo.status === "paid" && (
            <>
              <button onClick={markEntered} className="flex-1 bg-emerald-500 py-2 px-3 rounded font-bold text-xs whitespace-nowrap">Quét tại cổng (Vào)</button>
              <button onClick={fastForward} className="flex-1 bg-amber-500 py-2 px-3 rounded font-bold text-xs whitespace-nowrap">Tua TG (-20p)</button>
            </>
          )}
          {bookingInfo.status === "entered" && (
            <button onClick={markCompleted} className="flex-1 bg-blue-500 py-2 px-3 rounded font-bold text-xs whitespace-nowrap">Quét tại cổng (Ra)</button>
          )}
        </div>
      )}
    </div>
  );
}
