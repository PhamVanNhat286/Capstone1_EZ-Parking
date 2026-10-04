"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ChevronLeft, Copy, Download, MapPin, X, Clock } from "lucide-react";
import { useStore } from "@/store";
import { clsx } from "clsx";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";

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
    if (["vnpay", "momo"].includes(method)) {
      if (!activeBooking || activeBooking.status !== "holding") {
        router.push("/");
      }
    }
  }, [method, activeBooking, router]);

  // Handle dang-xu-ly logic
  const [processingState, setProcessingState] = useState<"verifying" | "rechecking">("verifying");
  
  const handleGatewaySuccess = () => {
    router.push("/thanh-toan/dang-xu-ly");
  };

  const handleProcessingSuccess = () => {
    if (activeBooking && Date.now() > activeBooking.holdExpiresAt) {
      router.push("/thanh-toan/dang-xu-ly?late=1");
    } else {
      payDeposit(lastPaymentMethod as any);
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

  if (["vnpay", "momo"].includes(method)) {
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
// VNPay / MoMo Gateways
// -----------------------------------------------------------------------------
function GatewayScreen({ method, activeBooking, isDemo, onSuccess, onFail, router, addToast }: any) {
  const [showCancel, setShowCancel] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes transaction limit

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(p => Math.max(0, p - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isDemo) {
      const timer = setTimeout(() => {
        onSuccess();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDemo, onSuccess]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeBooking?.id || "EZ-DEMO");
    addToast("Đã sao chép mã", "success");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative pb-32">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm sticky top-0 z-30">
        <button onClick={() => setShowCancel(true)} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 active:scale-95">
          <X size={24} />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-[17px] font-bold text-slate-900">
            {method === "vnpay" ? "Cổng thanh toán VNPay" : "Thanh toán qua Ví MoMo"}
          </h1>
        </div>
        <div className="w-10" />
      </div>

      {method === "vnpay" ? (
        <div className="p-6 flex flex-col items-center">
          <div className="bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-blue-100">
            Môi trường thử nghiệm, không trừ tiền thật
          </div>
          
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 w-full max-w-[320px] flex flex-col items-center mb-6">
            <h2 className="text-slate-500 font-medium text-sm mb-2">Số tiền thanh toán</h2>
            <div className="text-3xl font-black text-[#2B4BD1] mb-6">50.000 ₫</div>
            
            <div className="w-48 h-48 bg-slate-50 rounded-2xl p-2 border border-slate-200 mb-6 flex items-center justify-center">
              <QRCodeSVG value="https://ez-space.vn/pay" size={160} />
            </div>

            <div className="w-full flex items-center justify-between bg-slate-50 p-3 rounded-[12px] border border-slate-100">
              <div className="text-xs font-medium text-slate-500">Mã tham chiếu</div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{activeBooking?.id}</span>
                <button onClick={handleCopy} className="text-[#2B4BD1]"><Copy size={14} /></button>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[320px] text-center mb-8">
            <p className="text-xs font-medium text-slate-500 mb-1">Giao dịch hết hạn sau</p>
            <p className="text-lg font-bold text-red-500 tabular-nums">{formatTimer(timeLeft)}</p>
          </div>

          <div className="w-full max-w-[320px] space-y-3">
            <button onClick={() => addToast("Mở app ngân hàng...")} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform shadow-lg shadow-[#2B4BD1]/30">
              Mở app ngân hàng
            </button>
            <button onClick={() => addToast("Đã tải ảnh mã QR", "success")} className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95 flex items-center justify-center gap-2">
              <Download size={18} /> Lưu mã QR
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="bg-[#A50064] p-6 rounded-[24px] shadow-lg text-white mb-6">
            <h2 className="text-pink-200 font-medium text-sm mb-1">Đơn hàng</h2>
            <div className="text-2xl font-black mb-6">50.000 ₫</div>
            
            <div className="flex justify-between items-center bg-white/10 p-3 rounded-[12px] mb-2">
              <span className="text-sm font-medium">Mã đơn</span>
              <span className="font-bold font-mono">{activeBooking?.id}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-[#A50064]">Ví</div>
              <div>
                <p className="font-bold text-slate-900">Ví MoMo</p>
                <p className="text-xs font-medium text-slate-500">Số dư: 5.430.000 ₫</p>
              </div>
            </div>
            <button onClick={() => addToast("Chức năng đổi ví sẽ có sau")} className="text-xs font-bold text-[#A50064] bg-pink-50 px-3 py-1.5 rounded-full">
              Đổi
            </button>
          </div>

          <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-slate-500 mb-6">Chạm và giữ để thanh toán</p>
            <MoMoFingerprint onConfirm={() => router.push("/thanh-toan/dang-xu-ly")} />
          </div>
          
          <div className="mt-12 text-center">
            <button onClick={() => setShowCancel(true)} className="text-sm font-bold text-slate-500 hover:text-slate-800">
              Hủy và quay lại EZ-Space
            </button>
          </div>
        </div>
      )}

      {/* Demo Tools */}
      {isDemo && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 flex gap-2 z-40 overflow-x-auto">
          <button onClick={() => router.push("/thanh-toan/dang-xu-ly")} className="flex-1 bg-emerald-500 py-2 px-3 rounded font-bold text-xs whitespace-nowrap">Giả lập T.Công</button>
          <button onClick={onFail} className="flex-1 bg-red-500 py-2 px-3 rounded font-bold text-xs whitespace-nowrap">Giả lập T.Bại</button>
          <button onClick={() => router.push("/thanh-toan/dang-xu-ly?late=1")} className="flex-1 bg-amber-500 py-2 px-3 rounded font-bold text-xs whitespace-nowrap">Giả lập IPN Muộn</button>
        </div>
      )}

      {/* Cancel Sheet */}
      <BottomSheet isOpen={showCancel} onClose={() => setShowCancel(false)} title="Hủy thanh toán?">
        <p className="text-sm font-medium text-slate-500 mb-6 text-center">Giao dịch chưa hoàn tất. Bạn có chắc chắn muốn hủy thanh toán?</p>
        <div className="flex gap-3">
          <button onClick={() => setShowCancel(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95">Tiếp tục</button>
          <button onClick={() => router.push(`/dat-cho/${activeBooking?.id}`)} className="flex-1 bg-red-500 text-white font-bold py-4 rounded-[16px] active:scale-95">Đồng ý Hủy</button>
        </div>
      </BottomSheet>
    </div>
  );
}

// MoMo Fingerprint Hold logic
function MoMoFingerprint({ onConfirm }: { onConfirm: () => void }) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const start = () => {
    let p = 0;
    intervalRef.current = window.setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        if (intervalRef.current !== null) clearInterval(intervalRef.current);
        onConfirm();
      }
    }, 50);
  };

  const end = () => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    setProgress(0);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      className="relative w-24 h-24 rounded-full bg-[#A50064] flex items-center justify-center text-white shadow-xl shadow-pink-500/30"
    >
      {/* Progress SVG */}
      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
        <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
        <circle cx="48" cy="48" r="44" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="276" strokeDashoffset={276 - (276 * progress) / 100} className="transition-all duration-75" />
      </svg>
      {/* Fingerprint icon mock */}
      <div className="text-3xl font-black">M</div>
    </motion.button>
  );
}


// -----------------------------------------------------------------------------
// Success Screen
// -----------------------------------------------------------------------------
function SuccessScreen({ activeBooking, router, addToast }: any) {
  const [money, setMoney] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMoney(p => {
        if (p >= 50000) {
          clearInterval(timer);
          return 50000;
        }
        return p + 2500;
      });
    }, 30);
    
    // Auto redirect after 2s total
    const redirectTimer = setTimeout(() => {
      router.push(`/ve/${activeBooking?.id}`);
    }, 2000);

    return () => { clearInterval(timer); clearTimeout(redirectTimer); };
  }, [router, activeBooking]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-20 px-6 pb-6">
      <motion.div 
        initial={{ scale: 0, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ type: "spring", damping: 15 }}
        className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-6"
      >
        <motion.div
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CheckCircle2 size={48} />
        </motion.div>
      </motion.div>
      
      <h2 className="text-xl font-bold text-slate-900 mb-2">Thanh toán thành công</h2>
      <div className="text-4xl font-black text-[#2B4BD1] mb-8 tabular-nums">
        {money.toLocaleString("vi-VN")} ₫
      </div>

      <div className="w-full bg-white rounded-[24px] shadow-sm border border-slate-100 p-5 mb-8">
        <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">Chi tiết đặt chỗ</h3>
        
        <div className="space-y-4 text-sm font-medium">
          <div className="flex justify-between">
            <span className="text-slate-500">Bãi đỗ</span>
            <span className="text-slate-900">Hải Châu A</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Khu vực</span>
            <span className="text-slate-900">Ô {activeBooking?.spotId || "A3"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Biển số xe</span>
            <span className="text-slate-900 font-mono">43A-123.45</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Mã đơn</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-mono">{activeBooking?.id}</span>
              <button onClick={() => { navigator.clipboard.writeText(activeBooking?.id); addToast("Đã chép", "success"); }} className="text-[#2B4BD1]"><Copy size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mt-auto space-y-3">
        <button onClick={() => router.push(`/ve/${activeBooking?.id}`)} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform shadow-lg shadow-[#2B4BD1]/30">
          Xem vé QR
        </button>
        <button onClick={() => addToast("Đang mở bản đồ dẫn đường...")} className="w-full bg-blue-50 text-[#2B4BD1] font-bold py-4 rounded-[16px] active:scale-95 flex items-center justify-center gap-2">
          <MapPin size={18} /> Dẫn đường
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Fail Screen
// -----------------------------------------------------------------------------
function FailScreen({ activeBooking, router, lastPaymentMethod, cancelBooking }: any) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (activeBooking && activeBooking.status === "holding") {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((activeBooking.holdExpiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeBooking]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCancel = () => {
    cancelBooking();
    router.push("/");
  };

  const isExpired = activeBooking && Date.now() > activeBooking.holdExpiresAt;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-20 px-6 pb-6 text-center">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6">
        <XCircle size={48} />
      </div>
      
      <h2 className="text-xl font-bold text-slate-900 mb-2">Thanh toán thất bại</h2>
      <p className="text-sm font-medium text-slate-500 mb-2">
        Giao dịch bị từ chối hoặc số dư không đủ.
      </p>
      <p className="text-xs font-bold text-slate-400 mb-8">Mã lỗi: ERR_FUNDS_4001</p>

      {!isExpired ? (
        <div className="bg-orange-50 border border-orange-100 text-orange-700 px-4 py-2 rounded-full font-bold text-sm mb-8 flex items-center gap-2">
          <Clock size={16} /> Giữ chỗ còn {formatTimer(timeLeft)}
        </div>
      ) : (
        <div className="bg-slate-200 text-slate-700 px-4 py-2 rounded-full font-bold text-sm mb-8 flex items-center gap-2">
          Đã hết thời gian giữ chỗ
        </div>
      )}

      <div className="w-full mt-auto space-y-3">
        {!isExpired ? (
          <>
            <button onClick={() => router.push(`/thanh-toan/${lastPaymentMethod}`)} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform shadow-lg shadow-[#2B4BD1]/30">
              Thử lại
            </button>
            <button onClick={() => router.push(`/dat-cho/${activeBooking?.id}`)} className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95 transition-transform">
              Đổi phương thức thanh toán
            </button>
            <button onClick={() => setShowCancel(true)} className="w-full bg-transparent text-slate-500 font-bold py-4 rounded-[16px] active:scale-95 hover:text-red-500">
              Hủy đặt chỗ
            </button>
          </>
        ) : (
          <button onClick={() => router.push("/")} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform">
            Chọn lại ô
          </button>
        )}
      </div>

      <p className="text-xs font-medium text-slate-500 mt-6">
        Cần trợ giúp? <a href="tel:1900-6868" className="font-bold text-[#2B4BD1]">Gọi 1900-6868</a>
      </p>

      {/* Cancel Sheet */}
      <BottomSheet isOpen={showCancel} onClose={() => setShowCancel(false)} title="Hủy đặt chỗ?">
        <p className="text-sm font-medium text-slate-500 mb-6 text-center">Bạn có chắc chắn muốn hủy đặt chỗ này? Ô sẽ được giải phóng lập tức.</p>
        <div className="flex gap-3">
          <button onClick={() => setShowCancel(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95">Không</button>
          <button onClick={handleCancel} className="flex-1 bg-red-500 text-white font-bold py-4 rounded-[16px] active:scale-95">Hủy đặt chỗ</button>
        </div>
      </BottomSheet>
    </div>
  );
}
