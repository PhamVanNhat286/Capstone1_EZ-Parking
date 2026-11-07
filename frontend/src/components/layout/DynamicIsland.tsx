import React from "react";
import { clsx } from "clsx";

interface DynamicIslandProps {
  className?: string;
}

/**
 * DynamicIsland Component
 * Mô phỏng Dynamic Island chuẩn iPhone:
 * - Viên thuốc đen ở giữa đỉnh màn hình
 * - 2 camera/cảm biến bên phải viên thuốc
 * - Đã loại bỏ giờ, pin, vạch sóng theo yêu cầu
 */
export default function DynamicIsland({ className }: DynamicIslandProps) {
  return (
    <div
      className={clsx(
        "w-full pt-3 pb-1.5 flex items-center justify-center bg-white/95 backdrop-blur-md shrink-0 z-50 select-none pointer-events-none",
        className
      )}
    >
      {/* Dynamic Island Capsule */}
      <div className="w-24 h-6 bg-slate-950 rounded-full flex items-center justify-end px-2 space-x-1.5 shadow-sm">
        {/* Cảm biến & Camera trước */}
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
        <div className="w-2.5 h-2.5 rounded-full bg-blue-950 border border-blue-900" />
      </div>
    </div>
  );
}
