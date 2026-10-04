"use client";
import { useState, useEffect, use } from "react";
import { ChevronLeft, MapPin, CreditCard, ChevronRight, CarFront, AlertCircle, Plus, Info, Clock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const activeBooking = useStore((s) => s.activeBooking);
  const addToast = useStore((s) => s.addToast);
  const releaseSpot = useStore((s) => s.releaseSpot);
  const vehicles = useStore((s) => s.vehicles);
  
  const [method, setMethod] = useState<"vnpay" | "momo" | "card">("vnpay");
  const [timeLeft, setTimeLeft] = useState(-1);
  const [sheet, setSheet] = useState<"none" | "expired" | "leave">("none");
  const [selectedHours, setSelectedHours] = useState(2);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles.find(v => v.isPrimary)?.id || vehicles[0].id);
  const [slideX, setSlideX] = useState(0);

  useEffect(() => {
    if (!activeBooking || activeBooking.status !== "holding") {
      addToast("Không có yêu cầu giữ chỗ nào", "error");
      router.push("/");
      return;
    }
  }, [activeBooking, router, addToast]);

  useEffect(() => {
    if (!activeBooking || activeBooking.status !== "holding") return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((activeBooking.holdExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        setSheet("expired");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBooking]);

  if (!activeBooking || activeBooking.status !== "holding" || timeLeft === -1) return null;

  const handlePayment = () => {
    router.push(`/thanh-toan/${method}`);
  };

  const handleLeave = () => {
    releaseSpot();
    setSheet("none");
    router.push(`/bai/hai-chau-a`);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const activeVehicle = vehicles.find(v => v.id === selectedVehicle);
  const isMismatch = activeVehicle && activeVehicle.type.toLowerCase() === "suv" && id === "A2"; // Mock mismatch

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Sticky Header with Timer */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-30 px-4 py-3 flex items-center justify-between border-b border-slate-100 shadow-sm">
        <button onClick={() => setSheet("leave")} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
          <Clock size={14} className="text-orange-500" />
          <span className="font-bold text-orange-600 text-sm tabular-nums">{formatTimer(timeLeft)}</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Spot Info */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 mb-1">Bãi Hải Châu A</h2>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <MapPin size={12} /> Ô đỗ {id}
              </p>
            </div>
            <button onClick={() => router.push("/bai/hai-chau-a")} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform">
              Đổi ô
            </button>
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Thời gian đỗ dự kiến</h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {[1, 2, 4, 8, 12, 24].map(h => (
                <button
                  key={h}
                  onClick={() => setSelectedHours(h)}
                  className={clsx(
                    "px-4 py-2.5 rounded-[12px] font-bold text-sm shrink-0 transition-colors border active:scale-95",
                    selectedHours === h ? "bg-[#2B4BD1] text-white border-[#2B4BD1] shadow-md shadow-[#2B4BD1]/30" : "bg-white text-slate-600 border-slate-200"
                  )}
                >
                  {h} giờ
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Selection */}
        <div>
          <h3 className="font-bold text-slate-900 mb-3 px-1">Xe của bạn</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
            {vehicles.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVehicle(v.id)}
                className={clsx(
                  "p-3 rounded-[16px] border text-left shrink-0 w-[140px] transition-all active:scale-95 relative overflow-hidden",
                  selectedVehicle === v.id ? "bg-[#2B4BD1] border-[#2B4BD1] text-white shadow-md shadow-[#2B4BD1]/30" : "bg-white border-slate-200 text-slate-800"
                )}
              >
                <CarFront size={20} className={clsx("mb-2", selectedVehicle === v.id ? "text-blue-200" : "text-slate-400")} />
                <div className="font-bold text-sm truncate">{v.name}</div>
                <div className={clsx("text-[10px] font-medium font-mono mt-1", selectedVehicle === v.id ? "text-blue-100" : "text-slate-500")}>{v.plate}</div>
              </button>
            ))}
            <button onClick={() => router.push("/xe-cua-toi")} className="p-3 rounded-[16px] border border-dashed border-slate-300 text-center shrink-0 w-[100px] flex flex-col items-center justify-center text-slate-500 active:scale-95 bg-white">
              <Plus size={20} className="mb-2" />
              <span className="text-[10px] font-bold">Thêm xe</span>
            </button>
          </div>
          
          {isMismatch && (
            <div className="mt-2 flex items-start gap-2 bg-red-50 p-3 rounded-[12px] border border-red-100 text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="text-xs font-medium">Ô này là loại Sedan, xe SUV của bạn có thể không vừa. Hãy cân nhắc Đổi ô.</span>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div>
          <h3 className="font-bold text-slate-900 mb-3 px-1">Phương thức thanh toán</h3>
          <div className="space-y-3">
            <button onClick={() => setMethod("vnpay")} className={clsx("w-full flex items-center justify-between p-4 rounded-[16px] border transition-all active:scale-[0.98]", method === "vnpay" ? "border-[#2B4BD1] bg-blue-50/50" : "border-slate-200 bg-white")}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-blue-700 text-lg">VNP</div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 text-[15px]">VNPay Sandbox</div>
                  <div className="text-[11px] font-medium text-slate-500">Giả lập thanh toán VNPay</div>
                </div>
              </div>
              <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", method === "vnpay" ? "border-[#2B4BD1]" : "border-slate-300")}>
                {method === "vnpay" && <div className="w-2.5 h-2.5 rounded-full bg-[#2B4BD1]" />}
              </div>
            </button>

            <button onClick={() => setMethod("momo")} className={clsx("w-full flex items-center justify-between p-4 rounded-[16px] border transition-all active:scale-[0.98]", method === "momo" ? "border-[#2B4BD1] bg-blue-50/50" : "border-slate-200 bg-white")}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-pink-600 text-xl">M</div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 text-[15px]">MoMo Sandbox</div>
                  <div className="text-[11px] font-medium text-slate-500">Giả lập ví điện tử</div>
                </div>
              </div>
              <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", method === "momo" ? "border-[#2B4BD1]" : "border-slate-300")}>
                {method === "momo" && <div className="w-2.5 h-2.5 rounded-full bg-[#2B4BD1]" />}
              </div>
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-slate-800 text-white p-5 rounded-[24px]">
          <div className="flex justify-between items-center mb-3 text-sm">
            <span className="text-slate-400 font-medium">Phí gửi xe dự kiến ({selectedHours}h)</span>
            <span className="font-bold">{selectedHours * 20}.000 ₫</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-700">
            <span className="font-bold">Tiền cọc cần thanh toán</span>
            <span className="text-xl font-black text-emerald-400">50.000 ₫</span>
          </div>
        </div>
      </div>

      {/* Slide to confirm Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.02)] z-30">
        <div className="relative h-14 bg-slate-100 rounded-full overflow-hidden flex items-center justify-center">
          <span className="font-bold text-slate-500 text-sm ml-10">Trượt để thanh toán cọc</span>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 280 }}
            dragElastic={0.1}
            dragSnapToOrigin={true}
            onDrag={(e, info) => setSlideX(info.point.x)}
            onDragEnd={(e, info) => {
              if (info.offset.x > 200) handlePayment();
            }}
            className="absolute left-1 top-1 bottom-1 w-12 bg-[#2B4BD1] rounded-full flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing z-10"
          >
            <ArrowRight className="text-white" size={20} />
          </motion.div>
          {/* Progress fill */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-blue-100 opacity-50"
            style={{ width: `${Math.min(100, (slideX / 280) * 100)}%` }}
          />
        </div>
        <button onClick={handlePayment} className="w-full mt-3 text-[#2B4BD1] text-xs font-bold underline text-center">
          Hoặc bấm vào đây để thanh toán 50.000 ₫
        </button>
      </div>

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
