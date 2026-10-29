"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Tag,
  Copy,
  Check,
  Sparkles,
  Zap,
  Car,
  Clock,
  ChevronRight,
  Gift,
  ShieldCheck,
  Info,
  X,
  Search,
} from "lucide-react";
import { clsx } from "clsx";
import { useStore } from "@/store";

type Voucher = {
  id: string;
  code: string;
  title: string;
  discount: string;
  category: "all" | "weekend" | "ev" | "new" | "airport";
  badge: string;
  badgeColor: string;
  description: string;
  minSpend?: string;
  expiry: string;
  applicableLots: string;
};

const VOUCHERS: Voucher[] = [
  {
    id: "v1",
    code: "CUOITUAN20",
    title: "Giảm 20% Phí Giữ Chỗ Cuối Tuần",
    discount: "-20%",
    category: "weekend",
    badge: "Cuối tuần",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Giảm trực tiếp 20% phí cọc giữ chỗ cho mọi lượt đặt bãi vào Thứ 7 và Chủ Nhật.",
    minSpend: "Đơn bất kỳ",
    expiry: "30/11/2026",
    applicableLots: "Tất cả các bãi đỗ EZ-Space",
  },
  {
    id: "v2",
    code: "EVSACFREE",
    title: "Tặng 1 Giờ Sạc Nhanh Xe Điện EV",
    discount: "Free 1h",
    category: "ev",
    badge: "Sạc EV",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Miễn phí 1 giờ sạc điện tại trụ sạc nhanh 60kW chuẩn Châu Âu khi đặt chỗ trước.",
    minSpend: "Xe điện (EV)",
    expiry: "15/12/2026",
    applicableLots: "Bãi Cầu Rồng & Hải Châu A",
  },
  {
    id: "v3",
    code: "EZSPACE15K",
    title: "Giảm 15.000₫ Cho Tài Xế Mới",
    discount: "-15.000₫",
    category: "new",
    badge: "Bạn mới",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Món quà chào mừng tài xế mới gia nhập cộng đồng đỗ xe thông minh EZ-Space Đà Nẵng.",
    minSpend: "Lần đặt chỗ đầu tiên",
    expiry: "31/12/2026",
    applicableLots: "Toàn bộ hệ thống bãi đỗ",
  },
  {
    id: "v4",
    code: "VNPAYHOAN",
    title: "Hoàn 100% Cọc Qua VNPay / MoMo",
    discount: "Hoàn 100%",
    category: "all",
    badge: "Ví điện tử",
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
    description: "Tự động hoàn 100% tiền cọc (50.000₫) về tài khoản nguồn khi quét mã QR vào bãi đúng giờ.",
    minSpend: "Thanh toán qua ví điện tử",
    expiry: "Vô thời hạn",
    applicableLots: "Tất cả các bãi đỗ",
  },
  {
    id: "v5",
    code: "SANBAY30",
    title: "Giảm 30% Gửi Xe Sân Bay (>24h)",
    discount: "-30%",
    category: "airport",
    badge: "Sân bay",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description: "Tiết kiệm tối đa chi phí gửi xe qua đêm cho chuyến công tác hoặc du lịch dài ngày tại Ga T1.",
    minSpend: "Thời gian gửi từ 24h",
    expiry: "25/12/2026",
    applicableLots: "Bãi Sân bay Đà Nẵng T1",
  },
];

export default function PromotionsPage() {
  const router = useRouter();
  const addToast = useStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<"all" | "weekend" | "ev" | "new" | "airport">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        addToast(`Đã sao chép mã ${code} vào bộ nhớ tạm!`, "success");
        setTimeout(() => setCopiedCode(null), 2500);
      });
    } else {
      setCopiedCode(code);
      addToast(`Đã lưu mã: ${code}`, "success");
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const handleApplyCustomCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = promoInput.trim().toUpperCase();
    if (!trimmed) {
      addToast("Vui lòng nhập mã ưu đãi", "error");
      return;
    }

    const matched = VOUCHERS.find((v) => v.code === trimmed);
    if (matched) {
      handleCopyCode(matched.code);
      addToast(`Áp dụng mã ${matched.code} thành công: ${matched.discount}`, "success");
      setPromoInput("");
    } else {
      addToast(`Mã "${trimmed}" đã được kích hoạt cho tài khoản của bạn!`, "success");
      setPromoInput("");
    }
  };

  const filteredVouchers = VOUCHERS.filter(
    (v) => activeTab === "all" || v.category === activeTab
  );

  return (
    <div className="relative min-h-full bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-700 pb-20">
      
      {/* 1. DYNAMIC ISLAND & STATUS BAR */}
      <div className="sticky top-0 left-0 right-0 h-11 z-40 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 pt-1 pointer-events-none select-none border-b border-slate-100">
        <span className="text-[13px] font-bold text-slate-900 tracking-tight">09:41</span>
        
        {/* Dynamic Island Capsule */}
        <div className="w-24 h-6 bg-slate-950 rounded-full flex items-center justify-end px-2 space-x-1.5 shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-blue-950 border border-blue-900"></div>
        </div>

        {/* Status icons */}
        <div className="flex items-center space-x-1.5 text-slate-900 text-xs">
          <span>📶</span>
          <span>📶</span>
          <div className="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5 flex items-center">
            <div className="h-full w-3/4 bg-slate-900 rounded-[1px]"></div>
          </div>
        </div>
      </div>

      {/* 2. FIXED HEADER */}
      <header className="sticky top-11 z-30 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition flex items-center justify-center text-slate-700 cursor-pointer"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Ưu đãi & Khuyến mãi</span>
              <Sparkles size={16} className="text-amber-500 fill-amber-500" />
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Kho voucher & mã giảm giá EZ-Space</p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
          <Gift size={16} />
        </div>
      </header>

      {/* 3. SCROLLABLE CONTENT */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3.5 space-y-4">
        
        {/* Banner Hero Voucher */}
        <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-4 overflow-hidden shadow-md shadow-blue-500/15">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
              Khuyến mãi độc quyền
            </span>
            <h2 className="text-base font-extrabold mt-1.5 leading-snug">
              Đỗ xe thông minh, <br />Nhận mã giảm giá lên đến 30%
            </h2>
            <p className="text-[11px] text-blue-100 mt-1 max-w-[250px]">
              Áp dụng giữ chỗ trực tuyến cho ô đỗ Sedan, SUV và trụ sạc nhanh EV.
            </p>
          </div>
        </div>

        {/* Input nhập mã khuyến mãi tùy chọn */}
        <form onSubmit={handleApplyCustomCode} className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <Tag size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Nhập mã voucher của bạn..."
              className="flex-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none uppercase font-bold"
              autoComplete="off"
            />
            {promoInput && (
              <button
                type="button"
                onClick={() => setPromoInput("")}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-primary-dark active:scale-95 transition shrink-0 cursor-pointer"
          >
            Áp dụng
          </button>
        </form>

        {/* Filter Categories Tabs */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "all", label: "Tất cả" },
            { id: "weekend", label: "Cuối tuần" },
            { id: "ev", label: "Sạc EV" },
            { id: "new", label: "Bạn mới" },
            { id: "airport", label: "Sân bay" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 border",
                activeTab === tab.id
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Danh sách thẻ Voucher (Ticket Style) */}
        <div className="space-y-3">
          {filteredVouchers.map((voucher) => {
            const isCopied = copiedCode === voucher.code;

            return (
              <div
                key={voucher.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col transition hover:border-blue-300"
              >
                {/* Phần trên của vé */}
                <div className="p-3.5 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold border", voucher.badgeColor)}>
                        {voucher.badge}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">HSD: {voucher.expiry}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{voucher.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {voucher.description}
                    </p>
                  </div>

                  {/* Giá trị giảm nổi bật */}
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-blue-600 block leading-tight">
                      {voucher.discount}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{voucher.minSpend}</span>
                  </div>
                </div>

                {/* Đường cắt vé Voucher với 2 rãnh tròn khuyết */}
                <div className="relative flex items-center px-3.5">
                  <div className="absolute -left-2.5 w-5 h-5 bg-slate-50 border-r border-slate-200 rounded-full" />
                  <div className="w-full border-b border-dashed border-slate-200" />
                  <div className="absolute -right-2.5 w-5 h-5 bg-slate-50 border-l border-slate-200 rounded-full" />
                </div>

                {/* Phần dưới của vé: Mã code và Nút hành động */}
                <div className="p-3 bg-slate-50/60 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Mã:</span>
                    <code className="px-2 py-0.5 bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs rounded-md tracking-wider">
                      {voucher.code}
                    </code>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Nút xem chi tiết */}
                    <button
                      type="button"
                      onClick={() => setSelectedVoucher(voucher)}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      Điều kiện
                    </button>

                    {/* Nút sao chép mã */}
                    <button
                      type="button"
                      onClick={() => handleCopyCode(voucher.code)}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition active:scale-95 cursor-pointer shadow-xs",
                        isCopied
                          ? "bg-emerald-600 text-white"
                          : "bg-primary text-white hover:bg-primary-dark"
                      )}
                    >
                      {isCopied ? (
                        <>
                          <Check size={13} />
                          <span>Đã lưu</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hướng dẫn sử dụng Voucher */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-700">
          <div className="flex items-center space-x-1.5 text-primary font-bold">
            <Info size={15} />
            <span>Cách dùng mã ưu đãi tại EZ-Space:</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 leading-relaxed">
            <li>Bấm <strong>Sao chép</strong> mã voucher bạn muốn dùng.</li>
            <li>Vào trang chủ, chọn bãi đỗ xe phù hợp và bấm <strong>Giữ chỗ</strong>.</li>
            <li>Tại bước thanh toán cọc, nhập mã voucher để được khấu trừ tự động.</li>
          </ol>
        </div>
      </main>

      {/* MODAL: CHI TIẾT ĐIỀU KHOẢN VOUCHER */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-[32px] p-5 shadow-2xl max-h-[85%] overflow-y-auto max-w-[430px] w-full mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Tag size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedVoucher.title}</h3>
                  <p className="text-[10px] text-slate-400">Mã voucher: {selectedVoucher.code}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Mức giảm giá:</span>
                <p className="text-blue-600 font-extrabold text-sm">{selectedVoucher.discount}</p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Mô tả chi tiết:</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">{selectedVoucher.description}</p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Phạm vi áp dụng:</span>
                <p className="text-slate-600 text-[11px]">{selectedVoucher.applicableLots}</p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Hạn sử dụng:</span>
                <p className="text-slate-600 text-[11px]">{selectedVoucher.expiry}</p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Điều kiện áp dụng:</span>
                <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-0.5">
                  <li>Mỗi tài khoản được áp dụng tối đa 1 lần / ngày.</li>
                  <li>Không áp dụng đồng thời với các chương trình khuyến mãi khác.</li>
                  <li>Voucher không có giá trị quy đổi thành tiền mặt.</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                onClick={() => {
                  handleCopyCode(selectedVoucher.code);
                  setSelectedVoucher(null);
                }}
                className="py-2.5 px-3 rounded-xl border border-blue-500 text-blue-600 font-bold text-xs hover:bg-blue-50 active:scale-95 transition cursor-pointer text-center"
              >
                Sao chép mã
              </button>
              <Link
                href="/"
                onClick={() => setSelectedVoucher(null)}
                className="py-2.5 px-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark active:scale-95 transition cursor-pointer text-center"
              >
                Đặt bãi ngay
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
