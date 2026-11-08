"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { clsx } from "clsx";

interface PageHeaderProps {
  /** Tiêu đề trang */
  title: string;
  /** Subtitle nhỏ phía dưới tiêu đề (tùy chọn) */
  subtitle?: string;
  /** Override hành động Back (mặc định là router.back()) */
  onBack?: () => void;
  /** Nội dung slot bên phải header (icon action, nút ...) */
  rightSlot?: React.ReactNode;
  /** Thêm class tùy chỉnh cho container */
  className?: string;
  /** Màu nền header (mặc định: bg-white/95 backdrop-blur) */
  variant?: "default" | "transparent";
}

export default function PageHeader({
  title,
  subtitle,
  onBack,
  rightSlot,
  className,
  variant = "default",
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header
      className={clsx(
        "sticky top-0 z-30 flex items-center justify-between px-2 py-2.5 border-b border-slate-200/80",
        variant === "default"
          ? "bg-white/95 backdrop-blur-md shadow-sm"
          : "bg-transparent",
        className
      )}
    >
      {/* Nút Back */}
      <button
        onClick={handleBack}
        aria-label="Quay lại"
        className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 active:scale-90 transition-all"
      >
        <ChevronLeft size={24} strokeWidth={2.3} />
      </button>

      {/* Tiêu đề trung tâm */}
      <div className="flex-1 text-center">
        <h1 className="text-[17px] font-bold text-slate-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-slate-500 leading-none mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Slot phải */}
      <div className="w-10 h-10 flex items-center justify-center">
        {rightSlot ?? null}
      </div>
    </header>
  );
}
