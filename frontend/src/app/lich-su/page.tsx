"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore, Booking } from "@/store";
import { Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight, History, MapPin, Receipt, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";

export default function HistoryPage() {
  const router = useRouter();
  const activeBooking = useStore(s => s.activeBooking);
  const history = useStore(s => s.history);
  const [filter, setFilter] = useState<"all" | "completed" | "cancelled" | "forfeited">("all");
  const [selectedReceipt, setSelectedReceipt] = useState<Booking | null>(null);

  const filteredHistory = useMemo(() => {
    if (filter === "all") return history;
    return history.filter(b => b.status === filter);
  }, [history, filter]);

  const totalSpent = useMemo(() => {
    return history.filter(b => b.status === "completed").length * 50000;
  }, [history]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed": return { text: "Hoàn tất", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 };
      case "cancelled": return { text: "Đã hủy", color: "text-slate-500", bg: "bg-slate-100", icon: XCircle };
      case "forfeited": return { text: "Mất cọc", color: "text-red-500", bg: "bg-red-50", icon: AlertTriangle };
      default: return { text: status, color: "text-slate-500", bg: "bg-slate-100", icon: Clock };
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (b: Booking) => {
    if (!b.enteredAt || !b.exitedAt) return "Không có dữ liệu";
    const mins = Math.floor((b.exitedAt - b.enteredAt) / 60000);
    const hrs = Math.floor(mins / 60);
    return hrs > 0 ? `${hrs} giờ ${mins % 60} phút` : `${mins} phút`;
  };

  return (
    <div className="bg-slate-50 pb-6">
      {/* Header */}
      <div className="bg-[#2B4BD1] pt-12 pb-6 px-6 text-white sticky top-0 z-20 shadow-md">
        <h1 className="text-2xl font-black mb-6">Lịch sử</h1>
        
        <div className="bg-white/10 p-4 rounded-[20px] backdrop-blur-md">
          <p className="text-sm font-medium text-blue-100 mb-1">Tổng chi tiêu tháng này</p>
          <div className="text-3xl font-black">{totalSpent.toLocaleString("vi-VN")} ₫</div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-4 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50 sticky top-[168px] z-10 border-b border-slate-100">
        {[
          { id: "all", label: "Tất cả" },
          { id: "completed", label: "Hoàn tất" },
          { id: "cancelled", label: "Đã hủy" },
          { id: "forfeited", label: "Mất cọc" }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95",
              filter === f.id ? "bg-slate-800 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Active Booking Pinned */}
        {activeBooking && filter === "all" && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Đang hoạt động</h3>
            <button 
              onClick={() => router.push(`/ve/${activeBooking.id}`)}
              className="w-full bg-white p-4 rounded-[20px] shadow-sm border-2 border-[#2B4BD1] flex items-center justify-between active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-[#2B4BD1] rounded-full flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 mb-0.5">Bãi Hải Châu A • Ô {activeBooking.spotId}</div>
                  <div className="text-xs font-medium text-blue-600">
                    {activeBooking.status === "holding" ? "Đang giữ chỗ" : activeBooking.status === "paid" ? "Đã thanh toán cọc" : "Đang đỗ xe"}
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>
          </div>
        )}

        {/* History List */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Hoạt động gần đây</h3>
          
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredHistory.map((b) => {
                const info = getStatusInfo(b.status);
                const Icon = info.icon;
                
                return (
                  <motion.div 
                    key={b.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative rounded-[20px] overflow-hidden bg-slate-200" // background for swipe action
                  >
                    {/* Swipe Action Background */}
                    <div className="absolute inset-y-0 right-0 flex items-center px-6 bg-[#2B4BD1] text-white font-bold w-1/2 justify-end">
                      <div className="flex flex-col items-center">
                        <RefreshCw size={20} className="mb-1" />
                        <span className="text-xs">Đặt lại</span>
                      </div>
                    </div>

                    <motion.button
                      drag="x"
                      dragConstraints={{ left: -100, right: 0 }}
                      dragElastic={0.1}
                      onDragEnd={(e, dragInfo) => {
                        if (dragInfo.offset.x < -80) {
                          router.push(`/bai/${b.lotId}`);
                        }
                      }}
                      onClick={() => setSelectedReceipt(b)}
                      className="relative w-full bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-start gap-4">
                        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center shrink-0", info.bg, info.color)}>
                          <Icon size={20} />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-slate-900 text-sm mb-1">Hải Châu A • Ô {b.spotId}</div>
                          <div className="text-xs font-medium text-slate-500 mb-2">{formatDate(b.createdAt)}</div>
                          <div className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase", info.bg, info.color)}>
                            {info.text}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {b.status === "completed" && <div className="font-black text-slate-900">-50.000 ₫</div>}
                        {b.status === "cancelled" && <div className="font-bold text-emerald-500">+50.000 ₫</div>}
                        {b.status === "forfeited" && <div className="font-black text-red-500">-50.000 ₫</div>}
                        <div className="text-xs font-medium text-slate-400 mt-1 uppercase font-mono">{b.id}</div>
                      </div>
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredHistory.length === 0 && (
              <div className="text-center py-12 px-6">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <History size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Chưa có lịch sử</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">Bạn chưa có lịch sử đỗ xe nào trong danh mục này.</p>
                <button onClick={() => router.push("/")} className="w-full bg-[#2B4BD1] text-white font-bold py-3.5 rounded-[16px] active:scale-95 shadow-lg shadow-[#2B4BD1]/30">
                  Khám phá bãi xe
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomSheet isOpen={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title="Chi tiết biên lai">
        {selectedReceipt && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[16px] border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#2B4BD1]">
                <Receipt size={24} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Mã vé</div>
                <div className="font-mono font-bold text-slate-900">{selectedReceipt.id}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500">Bãi đỗ</span>
                <span className="text-slate-900">Hải Châu A (Ô {selectedReceipt.spotId})</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500">Ngày tạo</span>
                <span className="text-slate-900">{formatDate(selectedReceipt.createdAt)}</span>
              </div>
              
              {selectedReceipt.status === "completed" && (
                <>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-500">Thời gian đỗ</span>
                    <span className="text-slate-900">{formatDuration(selectedReceipt)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-3 border-t border-slate-100">
                    <span className="text-slate-500">Tổng phí</span>
                    <span className="text-slate-900">50.000 ₫</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-emerald-600">
                    <span>Đã thanh toán (Cọc)</span>
                    <span>-50.000 ₫</span>
                  </div>
                  <div className="flex justify-between text-base font-black pt-3 border-t border-slate-100">
                    <span>Còn phải trả</span>
                    <span>0 ₫</span>
                  </div>
                </>
              )}

              {selectedReceipt.status === "cancelled" && (
                <>
                  <div className="flex justify-between text-sm font-medium pt-3 border-t border-slate-100">
                    <span className="text-slate-500">Tổng phí</span>
                    <span className="text-slate-900">0 ₫</span>
                  </div>
                  <div className="flex justify-between text-base font-black pt-3 border-t border-slate-100 text-emerald-600">
                    <span>Số tiền được hoàn</span>
                    <span>50.000 ₫</span>
                  </div>
                </>
              )}

              {selectedReceipt.status === "forfeited" && (
                <>
                  <div className="flex justify-between text-sm font-medium pt-3 border-t border-slate-100">
                    <span className="text-slate-500">Lý do thu cọc</span>
                    <span className="text-slate-900">Quá hạn đến bãi 20 phút</span>
                  </div>
                  <div className="flex justify-between text-base font-black pt-3 border-t border-slate-100 text-red-500">
                    <span>Số tiền bị trừ</span>
                    <span>50.000 ₫</span>
                  </div>
                </>
              )}
            </div>

            <button onClick={() => { setSelectedReceipt(null); router.push(`/bai/${selectedReceipt.lotId}`); }} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 mt-4">
              Đặt lại ô này
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
