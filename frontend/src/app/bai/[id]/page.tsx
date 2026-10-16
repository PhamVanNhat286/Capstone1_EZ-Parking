"use client";
import { useState, useMemo, useEffect } from "react";
import { 
  ChevronLeft, 
  Share2, 
  SlidersHorizontal, 
  MapPin, 
  Wind, 
  CarFront, 
  Info, 
  BatteryCharging, 
  Zap, 
  Check, 
  RefreshCw, 
  CheckCircle2, 
  Plus, 
  ChevronRight,
  Filter,
  X
} from "lucide-react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { getLotSlotsApi, getLotByIdApi } from "@/lib/api";
import { useStore, Vehicle } from "@/store";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";
import Link from "next/link";

// Mock Grid Data fallback
const generateSpots = () => {
  const spots = [];
  for (let i = 1; i <= 20; i++) {
    const isElevator = i === 1 || i === 2 || i === 11 || i === 12;
    const type = i % 5 === 0 ? "ev" : i % 3 === 0 ? "suv" : "sedan";
    const rand = Math.random();
    const status = rand < 0.6 ? "empty" : rand < 0.8 ? "holding" : "occupied";
    
    spots.push({
      id: `A${i < 10 ? "0" + i : i}`,
      type,
      status,
      isElevator,
    });
  }
  return spots;
};

// Kiểm tra tính tương thích của ô đỗ với loại xe và nhu cầu sạc
export const isSpotMatchingVehicle = (
  spot: any, 
  vehicle: Vehicle | null, 
  needsCharging: boolean | null
): boolean => {
  if (!vehicle) return true;

  // 1. Xe Sedan: Chỉ hiện những ô được để Sedan và SUV (không hiện ô sạc EV)
  if (vehicle.type === "Sedan") {
    return spot.type === "sedan" || spot.type === "suv";
  }

  // 2. Xe SUV: Chỉ hiện ô SUV (vì sedan quá nhỏ không vừa SUV)
  if (vehicle.type === "SUV") {
    return spot.type === "suv";
  }

  // 3. Xe điện (EV):
  if (vehicle.type === "EV") {
    // Nếu có cần sạc: chỉ hiện những ô xe điện được sạc (ev)
    if (needsCharging === true) {
      return spot.type === "ev";
    }

    // Nếu không cần sạc: hiện những ô mà xe có thể đậu được, TRỪ những ô sạc
    // Dựa vào dữ liệu dáng xe điện đã đưa lên (Sedan hay SUV)
    const evBody = vehicle.evBodyType || "SUV";
    if (evBody === "Sedan") {
      // Dáng Sedan: đỗ được ô sedan hoặc suv, nhưng trừ ô sạc
      return (spot.type === "sedan" || spot.type === "suv") && spot.type !== "ev";
    } else {
      // Dáng SUV: chỉ đỗ được ô suv, trừ ô sạc
      return spot.type === "suv" && spot.type !== "ev";
    }
  }

  return true;
};

export default function SpotDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const holdSpot = useStore((s) => s.holdSpot);
  const releaseSpot = useStore((s) => s.releaseSpot);
  const activeBooking = useStore((s) => s.activeBooking);
  const addToast = useStore((s) => s.addToast);
  const vehicles = useStore((s) => s.vehicles);

  const lotId = (params?.id as string) || "1";
  const [spots, setSpots] = useState<any[]>(generateSpots());
  const [lotInfo, setLotInfo] = useState<{ name: string; address?: string } | null>(null);

  // Vehicle selection state
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [needsCharging, setNeedsCharging] = useState<boolean | null>(null);
  const [vehicleModalStep, setVehicleModalStep] = useState<"none" | "choose_vehicle" | "ask_charging" | "idle">("none");
  const [hasInitializedVehicle, setHasInitializedVehicle] = useState(false);
  const [onlyShowMatching, setOnlyShowMatching] = useState(true);

  // Fetch lot data
  useEffect(() => {
    getLotSlotsApi(lotId).then((data) => {
      if (data && data.length > 0) {
        setSpots(data);
      }
    });

    getLotByIdApi(lotId).then((lot) => {
      if (lot) setLotInfo(lot);
    });
  }, [lotId]);

  // Quy trình xác định loại xe dựa vào dữ liệu người dùng khi bấm vào bãi đỗ
  useEffect(() => {
    if (hasInitializedVehicle) return;

    // Không có xe nào trong dữ liệu
    if (!vehicles || vehicles.length === 0) {
      setVehicleModalStep("choose_vehicle");
      setHasInitializedVehicle(true);
      return;
    }

    // Trường hợp 1: Người dùng chỉ có đúng 1 xe
    if (vehicles.length === 1) {
      const singleVehicle = vehicles[0];
      setSelectedVehicle(singleVehicle);

      if (singleVehicle.type === "EV") {
        // Xe điện -> Mở trang hỏi có cần sạc không
        setVehicleModalStep("ask_charging");
      } else {
        // Sedan hoặc SUV -> Tự động xác định và đóng modal
        setNeedsCharging(null);
        setVehicleModalStep("none");
        addToast(
          singleVehicle.type === "Sedan" 
            ? `Xe Sedan (${singleVehicle.name}): Chỉ hiện ô Sedan & SUV`
            : `Xe SUV (${singleVehicle.name}): Chỉ hiện ô SUV`,
          "info"
        );
      }
      setHasInitializedVehicle(true);
      return;
    }

    // Trường hợp 2: Người dùng có từ 2 xe trở lên -> Mở trang hỏi đang đi loại xe gì
    setVehicleModalStep("choose_vehicle");
    setHasInitializedVehicle(true);
  }, [vehicles, hasInitializedVehicle, addToast]);

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

      // 1. Áp dụng quy tắc loại xe & nhu cầu sạc của người dùng
      if (selectedVehicle) {
        if (!isSpotMatchingVehicle(s, selectedVehicle, needsCharging)) {
          match = false;
        }
      }

      // 2. Các bộ lọc bổ sung (tab loại ô, thang máy)
      if (tab !== "Tất cả" && tab.toLowerCase() !== s.type) match = false;
      if (filterType !== "all" && filterType !== s.type) match = false;
      if (filterElevator && !s.isElevator) match = false;

      return { ...s, match };
    });
  }, [spots, selectedVehicle, needsCharging, tab, filterType, filterElevator]);

  // Danh sách các ô hiển thị trên giao diện
  const visibleSpots = useMemo(() => {
    if (onlyShowMatching) {
      return matchingSpots.filter(s => s.match);
    }
    return matchingSpots;
  }, [matchingSpots, onlyShowMatching]);

  const matchingCount = useMemo(() => {
    return matchingSpots.filter(s => s.match).length;
  }, [matchingSpots]);

  const bestMatch = useMemo(() => {
    return matchingSpots.find(s => s.match && s.status === "empty");
  }, [matchingSpots]);

  // Xử lý khi chọn xe từ danh sách
  const handleSelectVehicle = (v: Vehicle) => {
    setSelectedVehicle(v);

    if (v.type === "EV") {
      // Nếu là xe điện -> chuyển sang bước hỏi nhu cầu sạc
      setVehicleModalStep("ask_charging");
    } else {
      // Nếu là Sedan hoặc SUV -> hoàn tất lựa chọn
      setNeedsCharging(null);
      setVehicleModalStep("none");
      addToast(
        v.type === "Sedan" 
          ? `Đã chọn ${v.name} (Sedan) • Chỉ hiển thị ô Sedan & SUV`
          : `Đã chọn ${v.name} (SUV) • Chỉ hiển thị ô SUV`,
        "info"
      );
    }
  };

  // Xử lý khi chọn nhu cầu sạc cho xe điện
  const handleChargingChoice = (needsCharge: boolean) => {
    setNeedsCharging(needsCharge);
    setVehicleModalStep("none");

    if (needsCharge) {
      addToast(`⚡ Đã bật lọc: Chỉ hiển thị ô sạc xe điện`, "success");
    } else {
      const body = selectedVehicle?.evBodyType || "SUV";
      addToast(
        `🅿️ Đã bật lọc: Ô đỗ phù hợp (${body}), không kèm sạc`, 
        "info"
      );
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: lotInfo?.name || "Bãi đỗ xe EZ-Space",
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
      if (navigator.vibrate) navigator.vibrate(50);
      addToast(spot.status === "holding" ? "Ô này đang được giữ" : "Ô này đã kín", "error");
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
    
    // Success - bind to the chosen vehicle
    holdSpot(lotId, selectedSpot.id, selectedVehicle?.id || "v1");
    setSheet("none");
    router.push(`/dat-cho/${selectedSpot.id}`);
  };

  const handleRelease = () => {
    releaseSpot();
    setConfirmRelease(false);
    addToast("Đã nhả ô", "success");
  };

  const handlePickAlt = (id: string) => {
    holdSpot(lotId, id, selectedVehicle?.id || "v1");
    setSheet("none");
    router.push(`/dat-cho/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 z-10 sticky top-0">
        <button 
          onClick={() => router.push("/")} 
          className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <h1 className="text-[16px] font-bold text-slate-900 dark:text-white truncate">
            {lotInfo?.name || "Bãi đỗ xe thông minh"}
          </h1>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center justify-center gap-1">
            <MapPin size={11} className="shrink-0" />
            {lotInfo?.address || "Đà Nẵng"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setSheet("share")} 
            className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
          >
            <Share2 size={20} />
          </button>
          <button 
            onClick={() => setSheet("filter")} 
            className="w-10 h-10 flex items-center justify-center text-[#2B4BD1] dark:text-blue-400 active:scale-95 transition-transform"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Selected Vehicle & Filter Indicator Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-3 shadow-md z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              {selectedVehicle?.type === "EV" ? (
                <Zap size={20} className="text-amber-400" />
              ) : selectedVehicle?.type === "SUV" ? (
                <CarFront size={20} className="text-blue-300" />
              ) : (
                <CarFront size={20} className="text-cyan-300" />
              )}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white truncate">
                  {selectedVehicle?.name || "Chưa chọn xe"}
                </span>
                {selectedVehicle?.plate && (
                  <span className="bg-white/20 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/30">
                    {selectedVehicle.plate}
                  </span>
                )}
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {selectedVehicle?.type === "EV" 
                    ? `EV (${selectedVehicle.evBodyType || "SUV"})` 
                    : selectedVehicle?.type || "Xe"}
                </span>
              </div>

              <p className="text-[11px] text-blue-200/90 font-medium truncate mt-0.5 flex items-center gap-1.5">
                {selectedVehicle?.type === "Sedan" && (
                  <span>🟢 Đang hiện ô <b>Sedan & SUV</b></span>
                )}
                {selectedVehicle?.type === "SUV" && (
                  <span>🔵 Đang hiện ô <b>SUV</b></span>
                )}
                {selectedVehicle?.type === "EV" && needsCharging === true && (
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <Zap size={11} /> Đang hiện <b>ô sạc EV</b>
                  </span>
                )}
                {selectedVehicle?.type === "EV" && needsCharging === false && (
                  <span>
                    🅿️ Đang hiện ô <b>{selectedVehicle.evBodyType || "SUV"}</b> (trừ ô sạc)
                  </span>
                )}
                <span className="text-white/60">•</span>
                <span className="text-emerald-400 font-bold">{matchingCount} ô phù hợp</span>
              </p>
            </div>
          </div>

          {/* Action button to switch vehicle or change charging option */}
          <button
            onClick={() => {
              if (vehicles.length >= 2) {
                setVehicleModalStep("choose_vehicle");
              } else if (selectedVehicle?.type === "EV") {
                setVehicleModalStep("ask_charging");
              } else {
                setVehicleModalStep("choose_vehicle");
              }
            }}
            className="shrink-0 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl backdrop-blur-sm border border-white/25 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw size={13} className="text-blue-300" />
            <span>Đổi xe</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 z-10">
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
          {/* Tầng */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {["Tầng 1", "Tầng 2", "Tầng B1"].map((f) => (
              <button 
                key={f} 
                onClick={() => { setFloor(f); addToast("Đã chuyển sơ đồ " + f); }}
                className={clsx(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors", 
                  floor === f 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" 
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Toggle only show matching spots */}
          <button
            onClick={() => setOnlyShowMatching(!onlyShowMatching)}
            className={clsx(
              "text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all border",
              onlyShowMatching
                ? "bg-blue-50 text-[#2B4BD1] border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
            )}
          >
            <Filter size={12} />
            <span>{onlyShowMatching ? "Chỉ hiện ô hợp lệ" : "Hiện tất cả"}</span>
          </button>
        </div>

        {/* Quick Tabs */}
        <div className="flex p-1 bg-slate-50 dark:bg-slate-900/60 rounded-xl mx-4 my-2 border border-slate-100 dark:border-slate-700">
          {["Tất cả", "Sedan", "SUV", "EV"].map((t) => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors", 
                tab === t 
                  ? "bg-white dark:bg-slate-800 text-[#2B4BD1] dark:text-blue-400 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4">
        <div className="max-w-md mx-auto flex flex-col">
          
          <div className="text-center mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            Lối vào <div className="w-8 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Empty state if no spots match current vehicle filter */}
          {visibleSpots.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-700 my-6 shadow-sm">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CarFront size={28} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                Không tìm thấy ô đỗ phù hợp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Các ô đỗ thỏa mãn tiêu chí của xe <b>{selectedVehicle?.name}</b> hiện không có sẵn hoặc đang kín.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setOnlyShowMatching(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold active:scale-95"
                >
                  Xem toàn bộ sơ đồ
                </button>
                <button
                  onClick={() => setVehicleModalStep("choose_vehicle")}
                  className="px-4 py-2.5 bg-[#2B4BD1] text-white rounded-xl text-xs font-bold active:scale-95"
                >
                  Đổi loại xe khác
                </button>
              </div>
            </div>
          ) : (
            /* Grid Layout */
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-w-sm mx-auto w-full">
              {visibleSpots.map((spot) => {
                const isMatch = spot.match;
                const isSelected = spot.id === activeBooking?.spotId;
                const isEmpty = spot.status === "empty";
                const isHolding = spot.status === "holding";
                const isOccupied = spot.status === "occupied";

                return (
                  <button
                    key={spot.id}
                    onClick={() => handleSpotClick(spot)}
                    className={clsx(
                      "relative aspect-[2/3] rounded-xl flex flex-col items-center justify-between p-2 border-2 transition-all active:scale-95 overflow-hidden shadow-xs",
                      !isMatch && "opacity-30 grayscale",
                      isEmpty ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#2B4BD1]" :
                      isHolding ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800" :
                      "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 cursor-not-allowed",
                      isSelected && "ring-4 ring-[#2B4BD1]/50 border-[#2B4BD1] !opacity-100"
                    )}
                  >
                    {/* Top Row: Type & Elevator Indicator */}
                    <div className="w-full flex items-center justify-between">
                      <span className={clsx(
                        "text-[9px] font-black uppercase px-1 rounded",
                        spot.type === "ev" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" :
                        spot.type === "suv" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      )}>
                        {spot.type}
                      </span>
                      {spot.isElevator && (
                        <span className="text-[8px] font-bold text-slate-400" title="Gần thang máy">
                          🚪
                        </span>
                      )}
                    </div>

                    {/* Spot ID */}
                    <span className={clsx(
                      "text-xs font-black tracking-tight",
                      isEmpty ? "text-slate-900 dark:text-white" : "text-slate-500"
                    )}>
                      {spot.id}
                    </span>

                    {/* Status/Type Icon */}
                    <div className="flex items-center justify-center">
                      {spot.type === "ev" ? (
                        <BatteryCharging 
                          size={15} 
                          className={clsx(isEmpty ? "text-emerald-500" : "text-slate-400")} 
                        />
                      ) : isOccupied ? (
                        <CarFront size={16} className="text-red-500/80" />
                      ) : isHolding ? (
                        <CarFront size={16} className="text-amber-500/80" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    {/* Suggestion Label */}
                    {bestMatch?.id === spot.id && (
                      <div className="absolute top-0 inset-x-0 bg-emerald-500 text-white text-[7px] font-black text-center py-0.5">
                        GỢI Ý
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          
          <div className="text-center mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            Thang máy & Cầu thang <div className="w-8 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

        </div>
      </div>

      {/* ============================================================== */}
      {/* TRANG HỎI 1: BẠN ĐANG ĐI LOẠI XE GÌ NÀO? (KHI CÓ TỪ 2 XE TRỞ LÊN) */}
      {/* ============================================================== */}
      <AnimatePresence>
        {vehicleModalStep === "choose_vehicle" && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[28px] p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2B4BD1]/10 text-[#2B4BD1] dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <CarFront size={26} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    Bạn đang đi loại xe gì nào?
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Bãi: <span className="font-bold text-[#2B4BD1] dark:text-blue-400">{lotInfo?.name || "Bãi đỗ xe"}</span> • Chọn xe để lọc ô phù hợp
                  </p>
                </div>
                <button
                  onClick={() => setVehicleModalStep("idle")}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Vehicle list from user's data */}
              <div className="space-y-3 my-4">
                {vehicles && vehicles.length > 0 ? (
                  vehicles.map((v) => {
                    const isSelected = selectedVehicle?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => handleSelectVehicle(v)}
                        className={clsx(
                          "w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.98] relative flex items-center gap-4",
                          isSelected
                            ? "bg-blue-50/70 dark:bg-blue-950/40 border-[#2B4BD1] shadow-sm ring-2 ring-[#2B4BD1]/20"
                            : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        )}
                      >
                        {/* Icon */}
                        <div className={clsx(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                          v.type === "EV" 
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" 
                            : v.type === "SUV"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        )}>
                          {v.type === "EV" ? <Zap size={22} /> : <CarFront size={22} />}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {v.name}
                            </span>
                            {v.isPrimary && (
                              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                Mặc định
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 shadow-2xs">
                              {v.plate}
                            </span>
                            
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {v.type === "EV" 
                                ? `Xe điện (Dáng ${v.evBodyType || "SUV"})`
                                : `Xe ${v.type}`}
                            </span>
                          </div>

                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                            {v.type === "Sedan" && "👉 Sẽ hiển thị các ô Sedan & SUV"}
                            {v.type === "SUV" && "👉 Sẽ chỉ hiển thị các ô SUV kích thước lớn"}
                            {v.type === "EV" && "👉 Sẽ hỏi nhu cầu sạc điện tại bãi"}
                          </p>
                        </div>

                        {/* Radio / Selection Indicator */}
                        <div className="shrink-0">
                          <div className={clsx(
                            "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors",
                            isSelected 
                              ? "bg-[#2B4BD1] border-[#2B4BD1] text-white" 
                              : "border-slate-300 dark:border-slate-600"
                          )}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-6 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <CarFront size={32} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bạn chưa có xe nào trong dữ liệu
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      Vui lòng thêm xe của bạn hoặc chọn nhanh loại xe tạm thời để tiếp tục
                    </p>
                    <div className="flex flex-col gap-2 px-4">
                      <Link 
                        href="/xe-cua-toi" 
                        className="w-full bg-[#2B4BD1] text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Plus size={16} /> Thêm xe vào hồ sơ
                      </Link>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleSelectVehicle({ id: "temp-sedan", name: "Xe Sedan mẫu", plate: "43A-SEDAN", type: "Sedan" })}
                          className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-xs font-bold"
                        >
                          Sedan
                        </button>
                        <button
                          onClick={() => handleSelectVehicle({ id: "temp-suv", name: "Xe SUV mẫu", plate: "43A-SUV99", type: "SUV" })}
                          className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-xs font-bold"
                        >
                          SUV
                        </button>
                        <button
                          onClick={() => handleSelectVehicle({ id: "temp-ev", name: "Xe EV mẫu", plate: "43E-EV888", type: "EV", evBodyType: "SUV" })}
                          className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-xs font-bold"
                        >
                          Xe điện EV
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer link to manage vehicles */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link 
                  href="/xe-cua-toi" 
                  className="text-xs font-bold text-[#2B4BD1] dark:text-blue-400 flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Quản lý xe của tôi
                </Link>
                {selectedVehicle && (
                  <button
                    onClick={() => setVehicleModalStep("none")}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5"
                  >
                    Bỏ qua & giữ nguyên
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* TRANG HỎI 2: XE ĐIỆN -> CÓ CẦN SẠC KHÔNG?                         */}
      {/* ============================================================== */}
      <AnimatePresence>
        {vehicleModalStep === "ask_charging" && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[28px] p-6 w-full max-w-md border border-slate-100 dark:border-slate-800 shadow-2xl"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <BatteryCharging size={36} className="animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                  Bạn có cần sạc điện không?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 px-4">
                  Xe điện: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedVehicle?.name}</span> ({selectedVehicle?.plate})
                  <span className="block mt-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                    Dáng xe: {selectedVehicle?.evBodyType === "Sedan" ? "Sedan" : "SUV"}
                  </span>
                </p>
              </div>

              {/* 2 Options */}
              <div className="space-y-3">
                {/* Option 1: Có cần sạc */}
                <button
                  onClick={() => handleChargingChoice(true)}
                  className="w-full text-left p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-50 active:scale-[0.98] transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <Zap size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                      Có, tôi cần sạc pin ⚡
                    </h4>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 font-medium mt-0.5">
                      Chỉ hiển thị các ô xe điện có trang bị trụ sạc EV
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-emerald-600 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Option 2: Không cần sạc */}
                <button
                  onClick={() => handleChargingChoice(false)}
                  className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#2B4BD1] active:scale-[0.98] transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-[#2B4BD1] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <CarFront size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      Không, chỉ cần chỗ đỗ xe 🅿️
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Hiện ô đỗ phù hợp ({selectedVehicle?.evBodyType === "Sedan" ? "Sedan & SUV" : "SUV"}), trừ các ô có trụ sạc
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-slate-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Back button if user has multiple cars */}
              {vehicles.length >= 2 && (
                <div className="mt-4 pt-3 text-center border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setVehicleModalStep("choose_vehicle")}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 active:scale-95 py-1"
                  >
                    ← Quay lại chọn xe khác
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Active Hold Banner if user currently holds a spot */}
      <AnimatePresence>
        {activeBooking && activeBooking.status === "holding" && (
          <motion.div 
            initial={{ y: 100 }} 
            animate={{ y: 0 }} 
            exit={{ y: 100 }} 
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-40"
          >
            <div className="bg-[#2B4BD1] text-white rounded-2xl p-4 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-200 mb-0.5">Đang giữ Ô {activeBooking.spotId}</p>
                <div className="font-bold text-sm">Chưa thanh toán cọc</div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmRelease(true)} 
                  className="px-3 py-2 bg-blue-700 rounded-xl text-xs font-bold active:scale-95"
                >
                  Nhả ô
                </button>
                <button 
                  onClick={() => router.push(`/dat-cho/${activeBooking.id}`)} 
                  className="px-3 py-2 bg-white text-[#2B4BD1] rounded-xl text-xs font-bold active:scale-95"
                >
                  Thanh toán
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Release Modal */}
      {confirmRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-[24px] p-6 max-w-xs w-full text-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Nhả ô và chọn lại?</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
              Ô này sẽ được giải phóng và người khác có thể đặt ngay lập tức.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmRelease(false)} 
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-[16px] active:scale-95"
              >
                Không
              </button>
              <button 
                onClick={handleRelease} 
                className="flex-1 bg-red-500 text-white font-bold py-3.5 rounded-[16px] active:scale-95"
              >
                Đồng ý nhả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheets */}
      <BottomSheet isOpen={sheet === "share"} onClose={() => setSheet("none")} title="Chia sẻ bãi đỗ">
        <div className="flex gap-4">
          <button 
            onClick={handleShare} 
            className="flex-1 bg-[#2B4BD1]/10 text-[#2B4BD1] dark:bg-blue-500/20 dark:text-blue-300 font-bold py-4 rounded-[16px] active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Share2 size={20} /> Gửi / Chia sẻ
          </button>
          <button 
            onClick={() => { 
              navigator.clipboard.writeText(window.location.href); 
              addToast("Đã sao chép liên kết", "success"); 
              setSheet("none"); 
            }} 
            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-4 rounded-[16px] active:scale-95 transition-transform"
          >
            Sao chép liên kết
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={sheet === "filter"} onClose={() => setSheet("none")} title="Bộ lọc nâng cao">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold text-slate-900 dark:text-white mb-3 block">Loại xe</label>
            <div className="grid grid-cols-4 gap-2">
              {["all", "sedan", "suv", "ev"].map((t) => (
                <button 
                  key={t} 
                  onClick={() => setFilterType(t)} 
                  className={clsx(
                    "py-2.5 rounded-[12px] text-xs font-bold capitalize active:scale-95 transition-transform", 
                    filterType === t 
                      ? "bg-[#2B4BD1] text-white" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {t === "all" ? "Tất cả" : t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900 dark:text-white mb-3 block">Vị trí ưu tiên</label>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-[16px] border border-slate-100 dark:border-slate-700">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">Chỉ hiện ô gần thang máy</div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Giảm thiểu khoảng cách đi bộ</div>
              </div>
              <button 
                onClick={() => setFilterElevator(!filterElevator)}
                className={clsx(
                  "w-12 h-6 rounded-full transition-colors relative flex items-center", 
                  filterElevator ? "bg-[#2B4BD1]" : "bg-slate-200 dark:bg-slate-600"
                )}
              >
                <div className={clsx(
                  "w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute", 
                  filterElevator ? "translate-x-[26px]" : "translate-x-[2px]"
                )} />
              </button>
            </div>
          </div>
          <button 
            onClick={() => setSheet("none")} 
            className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 mt-4 shadow-lg shadow-[#2B4BD1]/30"
          >
            Áp dụng
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={sheet === "spot"} onClose={() => setSheet("none")} title={`Chi tiết Ô ${selectedSpot?.id}`}>
        {selectedSpot && (
          <div className="space-y-3">
            {/* Cột trái: LOẠI Ô | Cột phải: ĐƠN GIÁ (bỏ ô khoảng cách) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-[16px] border border-slate-100 dark:border-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Loại ô</div>
                <div className="font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5 text-base">
                  {selectedSpot.type === "ev" ? (
                    <>
                      <Zap size={16} className="text-amber-500 fill-amber-500" />
                      <span>EV</span>
                    </>
                  ) : (
                    <span>{selectedSpot.type}</span>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-[16px] border border-slate-100 dark:border-slate-700">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Đơn giá</div>
                <div className="font-bold text-slate-900 dark:text-white text-base">
                  20.000đ/giờ
                </div>
              </div>
            </div>

            {/* Hàng ngang ở giữa: KHUNG GIỜ (09:00 - 12:00) */}
            <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-[16px] border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Khung giờ</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                09:00 - 12:00
              </div>
            </div>

            {/* Hàng ngang phía dưới: Xe đặt chỗ */}
            <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-[16px] border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Xe đặt chỗ</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm text-right font-mono">
                {selectedVehicle 
                  ? `${selectedVehicle.name} (${selectedVehicle.plate})`
                  : "Chưa chọn xe"}
              </div>
            </div>
            
            {/* Dòng ghi chú cọc 50.000đ */}
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 p-3 rounded-[16px] text-xs font-medium border border-blue-100 dark:border-blue-900/40">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>Cọc trước 50.000 ₫ để giữ ô này trong 10 phút. Hủy trong vòng 5 phút đầu sẽ được hoàn 100%.</span>
            </div>

            {/* Nút bấm 'Xác nhận giữ chỗ' ở dưới cùng */}
            <button 
              onClick={handleHoldSpot}
              className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform shadow-lg shadow-[#2B4BD1]/30 text-lg flex items-center justify-center gap-2"
            >
              Xác nhận giữ chỗ
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={sheet === "conflict"} onClose={() => setSheet("none")} title="Ô vừa có người giữ">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wind size={24} />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Rất tiếc, người dùng khác vừa giữ ô này nhanh hơn bạn 1 giây. Dưới đây là các ô thay thế gần nhất:
          </p>
        </div>
        <div className="space-y-3">
          {["A-04", "A-07", "B-02"].map((alt) => (
            <button 
              key={alt}
              onClick={() => handlePickAlt(alt)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-[16px] flex items-center justify-between active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2B4BD1]/10 text-[#2B4BD1] dark:text-blue-400 rounded-xl flex items-center justify-center font-black">
                  {alt}
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">Gần thang máy</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Cách vị trí ban đầu 2 ô</div>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-[#2B4BD1] text-white rounded-lg text-xs font-bold shadow-md shadow-[#2B4BD1]/30">
                Chọn
              </div>
            </button>
          ))}
        </div>
        <button 
          onClick={() => setSheet("none")} 
          className="w-full mt-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold py-4 rounded-[16px] active:scale-95"
        >
          Hủy bỏ
        </button>
      </BottomSheet>

    </div>
  );
}
