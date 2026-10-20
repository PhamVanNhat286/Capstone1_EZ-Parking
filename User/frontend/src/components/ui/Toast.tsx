"use client";
import { useEffect } from "react";
import { useStore } from "@/store";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";

export default function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  const tick = useStore((s) => s.tick);

  useEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [tick]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-[400px] px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={clsx(
              "px-4 py-3 rounded-xl shadow-lg font-medium text-sm text-center border",
              t.type === "error" ? "bg-red-50 text-red-600 border-red-200" :
              t.type === "success" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
              "bg-slate-800 text-white border-slate-700"
            )}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
