"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
};

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay — covers full container including nav */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] max-w-[430px] mx-auto"
          />
          {/* Sheet panel */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) onClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-[32px] z-[101] flex flex-col max-h-[90vh] shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
          >
            <div className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between px-6 pb-4 shrink-0 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap min-w-0">{title}</h2>
              <button 
                onClick={onClose}
                className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="overflow-y-auto px-6 py-6 pb-8">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}