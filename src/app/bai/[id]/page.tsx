"use client";
import { useState, useMemo } from "react";
import { ChevronLeft, Share2, SlidersHorizontal, MapPin, Search, Wind, CarFront, Info, BatteryCharging } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";
import Link from "next/link";

// Mock Grid Data
const generateSpots = () => {
  const spots = [];
  for (let i = 1; i <= 20; i++) {
    const isElevator = i === 1 || i === 2 || i === 11 || i === 12;
    const type = i % 5 === 0 ? "ev" : i % 3 === 0 ? "suv" : "sedan";
    // Mock status: empty (60%), holding (20%), occupied (20%)
    const rand = Math.random();
    const status = rand < 0.6 ? "empty" : rand < 0.8 ? "holding" : "occupied";
    
    spots.push({
      id: `A${i}`,
      type,
      status,
      isElevator,
    });
  }
  return spots;
};

export default function SpotDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const holdSpot = useStore((s) => s.holdSpot);
  const releaseSpot = useStore((s) => s.releaseSpot);
  const activeBooking = useStore((s) => s.activeBooking);
  const addToast = useStore((s) => s.addToast);

  const [spots] = useState(generateSpots());
  const [floor, setFloor] = useState("Tầng 1");
  const [tab, setTab] = useState(searchParams.get("tab") || "Tất cả");

  const [sheet, setSheet] = useState<"none" | "share" | "filter" | "spot" | "conflict">("none");
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  
  // Filter state
  const [filterType, setFilterType] = useState<string>("all");
  const [filterElevator, setFilterElevator] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);

  // Computed matching spots
  const matchingSpots = useMemo(() => {
    return spots.map(s => {
      let match = true;
      if (tab !== "Tất cả" && tab.toLowerCase() !== s.type) match = false;
      if (filterType !== "all" && filterType !== s.type) match = false;
      if (filterElevator && !s.isElevator) match = false;
      return { ...s, match };
    });
  }, [spots, tab, filterType, filterElevator]);

  const bestMatch = useMemo(() => {
    return matchingSpots.find(s => s.match && s.status === "empty");
  }, [matchingSpots]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Bãi đỗ Hải Châu A",
          url: window.location.href
        });
      } catch (err) {
        // Ignored
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast("Đã sao chép liên kết", "success");
    }
    setSheet("none");
  };

  const handleSpotClick = (spot: any) => {
    if (spot.status === "holding" || spot.status === "occupied") {
      // trigger haptic simulation
      if (navigator.vibrate) navigator.vibrate(50);
      addToast(spot.status === "holding" ? "Ô này đang được giữ" : "Ô này đã kín", "error");
      
      // We can trigger a quick visual shake by setting a state, but Toast is enough for now
      return;
    }
    setSelectedSpot(spot);
    setSheet("spot");
  };

  const handleHoldSpot = () => {
    // 10% chance to simulate 409 Conflict
    if (Math.random() < 0.1) {
      setSheet("conflict");
      return;
    }
    
    // Success
    holdSpot("hai-chau-a", selectedSpot.id, "v1");
    setSheet("none");
    router.push(`/dat-cho/${selectedSpot.id}`);
  };

  const handleRelease = () => {
    releaseSpot();
    setConfirmRelease(false);
    addToast("Đã nhả ô", "success");
  };

  const handlePickAlt = (id: string) => {
    holdSpot("hai-chau-a", id, "v1");
    setSheet("none");
    router.push(`/dat-cho/${id}`);
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 z-10 sticky top-0">
        <button onClick={() => router.push("/")} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-[17px] font-bold text-slate-900">Bãi Hải Châu A</h1>
          <p className="text-[11px] font-medium text-slate-500">Đà Nẵng • Cách đây 0,6 km</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSheet("share")} className="w-10 h-10 flex items-center justify-center text-slate-600 active:scale-95 transition-transform">
            <Share2 size={20} />
          </button>
          <button onClick={() => setSheet("filter")} className="w-10 h-10 flex items-center justify-center text-[#2B4BD1] active:scale-95 transition-transform">
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-100 z-10">
        <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
          {["Tầng 1", "Tầng 2", "Tầng B1"].map((f) => (
            <button 
              key={f} 
              onClick={() => { setFloor(f); addToast("Đã chuyển sơ đồ " + f); }}
              className={clsx("px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors", floor === f ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600")}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex p-1 bg-slate-50 rounded-xl mx-4 mb-3 border border-slate-100">
          {["Tất cả", "Sedan", "SUV", "EV"].map((t) => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              className={clsx("flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors", tab === t ? "bg-white text-[#2B4BD1] shadow-sm" : "text-slate-500")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 overflow-y-auto bg-slate-100">
        <div className="p-6 flex flex-col">
          
          <div className="text-center mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            Lối vào <div className="w-8 h-0.5 bg-slate-300 rounded-full" />
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto w-full">
            {matchingSpots.map((spot) => (
              <button
                key={spot.id}
                onClick={() => handleSpotClick(spot)}
                className={clsx(
                  "relative aspect-[2/3] rounded-lg flex flex-col items-center justify-center border-2 transition-all active:scale-95 overflow-hidden",
                  !spot.match && "opacity-30 grayscale", // Dim non-matching
                  spot.status === "empty" ? "bg-white border-slate-200" :
                  spot.status === "holding" ? "bg-amber-100 border-amber-300" :
                  "bg-red-100 border-red-300 cursor-not-allowed",
                  spot.id === activeBooking?.spotId && "ring-4 ring-[#2B4BD1]/50 border-[#2B4BD1] !opacity-100" // Highlight if we are holding it
                )}
              >
                {/* Spot Number */}
                <span className={clsx("text-xs font-black z-10", spot.status === "empty" ? "text-slate-800" : "text-slate-500")}>
                  {spot.id}
                </span>

                {/* Icons */}
                {spot.type === "ev" && <BatteryCharging size={12} className={clsx("absolute bottom-2", spot.status === "empty" ? "text-emerald-500" : "text-slate-400")} />}
                {spot.status !== "empty" && <CarFront size={24} className="absolute text-red-400/70" />}

                {/* Suggestion Label */}
                {bestMatch?.id === spot.id && (
                  <div className="absolute top-0 inset-x-0 bg-emerald-500 text-white text-[8px] font-black text-center py-0.5">
                    Gợi ý
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="text-center mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            Thang máy <div className="w-8 h-0.5 bg-slate-300 rounded-full" />
          </div>

        </div>
      </div>

      {/* Floating Active Hold Banner if they are currently holding a spot */}
      <AnimatePresence>
        {activeBooking && activeBooking.status === "holding" && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-40">
            <div className="bg-[#2B4BD1] text-white rounded-2xl p-4 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-200 mb-0.5">Đang giữ Ô {activeBooking.spotId}</p>
                <div className="font-bold text-sm">Chưa thanh toán cọc</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmRelease(true)} className="px-3 py-2 bg-blue-700 rounded-xl text-xs font-bold active:scale-95">Nhả ô</button>
                <button onClick={() => router.push(`/dat-cho/${activeBooking.id}`)} className="px-3 py-2 bg-white text-[#2B4BD1] rounded-xl text-xs font-bold active:scale-95">Thanh toán</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Release Modal */}
      {confirmRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 max-w-xs w-full text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Nhả ô và chọn lại?</h3>
            <p className="text-sm font-medium text-slate-500 mb-6">Ô này sẽ được giải phóng và người khác có thể đặt ngay lập tức.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRelease(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-[16px] active:scale-95">Không</button>
              <button onClick={handleRelease} className="flex-1 bg-red-500 text-white font-bold py-3.5 rounded-[16px] active:scale-95">Đồng ý nhả</button>
            </div>
          </div>
        </div>
      )}

      {/* Sheets */}
      <BottomSheet isOpen={sheet === "share"} onClose={() => setSheet("none")} title="Chia sẻ bãi đỗ">
        <div className="flex gap-4">
          <button onClick={handleShare} className="flex-1 bg-[#2B4BD1]/10 text-[#2B4BD1] font-bold py-4 rounded-[16px] active:scale-95 transition-transform flex items-center justify-center gap-2">
            <Share2 size={20} /> Gửi / Chia sẻ
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); addToast("Đã sao chép", "success"); setSheet("none"); }} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95 transition-transform">
            Sao chép liên kết
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={sheet === "filter"} onClose={() => setSheet("none")} title="Bộ lọc nâng cao">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold text-slate-900 mb-3 block">Loại xe</label>
            <div className="grid grid-cols-4 gap-2">
              {["all", "sedan", "suv", "ev"].map((t) => (
                <button key={t} onClick={() => setFilterType(t)} className={clsx("py-2.5 rounded-[12px] text-xs font-bold capitalize active:scale-95 transition-transform", filterType === t ? "bg-[#2B4BD1] text-white" : "bg-slate-100 text-slate-600")}>
                  {t === "all" ? "Tất cả" : t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900 mb-3 block">Vị trí ưu tiên</label>
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-[16px] border border-slate-100">
              <div>
                <div className="font-bold text-sm text-slate-900 mb-0.5">Chỉ hiện ô gần thang máy</div>
                <div className="text-xs font-medium text-slate-500">Giảm thiểu khoảng cách đi bộ</div>
              </div>
              <button 
                onClick={() => setFilterElevator(!filterElevator)}
                className={clsx("w-12 h-6 rounded-full transition-colors relative flex items-center", filterElevator ? "bg-[#2B4BD1]" : "bg-slate-200")}
              >
                <div className={clsx("w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute", filterElevator ? "translate-x-[26px]" : "translate-x-[2px]")} />
              </button>
            </div>
          </div>
          <button onClick={() => setSheet("none")} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 mt-4 shadow-lg shadow-[#2B4BD1]/30">
            Áp dụng
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={sheet === "spot"} onClose={() => setSheet("none")} title={`Chi tiết Ô ${selectedSpot?.id}`}>
        {selectedSpot && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-[16px] border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Loại ô</div>
                <div className="font-bold text-slate-900 uppercase">{selectedSpot.type}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-[16px] border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Khoảng cách</div>
                <div className="font-bold text-slate-900">{selectedSpot.isElevator ? "2m tới thang máy" : "15m tới thang máy"}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded-[16px] text-xs font-medium">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>Cọc trước 50.000 ₫ để giữ ô này trong 10 phút. Hủy trong vòng 5 phút đầu sẽ được hoàn 100%.</span>
            </div>

            <button 
              onClick={handleHoldSpot}
              className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform shadow-lg shadow-[#2B4BD1]/30 text-lg flex items-center justify-center gap-2"
            >
              Giữ chỗ 10 phút
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={sheet === "conflict"} onClose={() => setSheet("none")} title="Ô vừa có người giữ">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wind size={24} />
          </div>
          <p className="text-sm font-medium text-slate-600">Rất tiếc, người dùng khác vừa giữ ô này nhanh hơn bạn 1 giây. Dưới đây là các ô thay thế gần nhất:</p>
        </div>
        <div className="space-y-3">
          {["A4", "A7", "B2"].map((alt) => (
            <button 
              key={alt}
              onClick={() => handlePickAlt(alt)}
              className="w-full bg-white border border-slate-200 p-4 rounded-[16px] flex items-center justify-between active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2B4BD1]/10 text-[#2B4BD1] rounded-xl flex items-center justify-center font-black">
                  {alt}
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 text-sm">Gần thang máy • Sedan</div>
                  <div className="text-xs font-medium text-slate-500">Cách vị trí ban đầu 2 ô</div>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-[#2B4BD1] text-white rounded-lg text-xs font-bold shadow-md shadow-[#2B4BD1]/30">
                Chọn
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setSheet("none")} className="w-full mt-4 bg-slate-100 text-slate-900 font-bold py-4 rounded-[16px] active:scale-95">
          Hủy bỏ
        </button>
      </BottomSheet>

    </div>
  );
}
