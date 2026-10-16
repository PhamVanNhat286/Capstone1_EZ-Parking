"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  MapPin, 
  Clock, 
  X, 
  AlertTriangle, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  Navigation, 
  ExternalLink, 
  Compass, 
  Car, 
  Loader2,
  Route,
  Share2
} from "lucide-react";
import { useStore } from "@/store";
import { clsx } from "clsx";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";
import { getLotByIdApi } from "@/lib/api";

// Tọa độ và thông tin các bãi đỗ xe trong hệ thống
const LOT_LOCATIONS: Record<string, { name: string; address: string; lat: number; lng: number }> = {
  "1": { name: "Bãi Hải Châu A", address: "15 Lê Duẩn, Hải Châu 1, Hải Châu, Đà Nẵng", lat: 16.0718, lng: 108.2222 },
  "hai-chau-a": { name: "Bãi Hải Châu A", address: "15 Lê Duẩn, Hải Châu 1, Hải Châu, Đà Nẵng", lat: 16.0718, lng: 108.2222 },
  "2": { name: "Bãi Cầu Rồng", address: "Trần Hưng Đạo, An Hải Tây, Sơn Trà, Đà Nẵng", lat: 16.0610, lng: 108.2270 },
  "cau-rong": { name: "Bãi Cầu Rồng", address: "Trần Hưng Đạo, An Hải Tây, Sơn Trà, Đà Nẵng", lat: 16.0610, lng: 108.2270 },
  "3": { name: "Sân bay Đà Nẵng T1", address: "Ga T1, Cảng hàng không Quốc tế Đà Nẵng, Hải Châu, Đà Nẵng", lat: 16.0538, lng: 108.1995 },
  "san-bay-t1": { name: "Sân bay Đà Nẵng T1", address: "Ga T1, Cảng hàng không Quốc tế Đà Nẵng, Hải Châu, Đà Nẵng", lat: 16.0538, lng: 108.1995 },
};

// Tính khoảng cách giữa 2 tọa độ (Haversine formula - km)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const activeBooking = useStore((s) => s.activeBooking);
  const history = useStore((s) => s.history);
  const cancelBooking = useStore((s) => s.cancelBooking);
  const markExpired = useStore((s) => s.markExpired);
  const markEntered = useStore((s) => s.markEntered);
  const markCompleted = useStore((s) => s.markCompleted);
  const fastForward = useStore((s) => s.fastForward);
  const isDemo = useStore((s) => s.isDemo);
  const addToast = useStore((s) => s.addToast);
  const vehicles = useStore((s) => s.vehicles);

  // Find booking in active or history
  const bookingInfo = activeBooking?.id === id ? activeBooking : history.find(b => b.id === id);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [qrToken, setQrToken] = useState(Date.now().toString());
  const [qrProgress, setQrProgress] = useState(100);
  const [showCancel, setShowCancel] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Navigation Map Modal state
  const [showNavigation, setShowNavigation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; isReal: boolean } | null>(null);
  const [lotDetails, setLotDetails] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);

  // Vehicle info
  const vehicle = vehicles.find(v => v.id === bookingInfo?.vehicleId);
  const vehiclePlate = vehicle?.plate || "43A-123.45";

  useEffect(() => {
    if (!bookingInfo) {
      router.push("/");
    }
  }, [bookingInfo, router]);

  // Load lot coordinates and details
  useEffect(() => {
    if (!bookingInfo?.lotId) return;

    const lotKey = String(bookingInfo.lotId).toLowerCase();
    const fallback = LOT_LOCATIONS[lotKey] || {
      name: "Bãi Hải Châu A",
      address: "15 Lê Duẩn, Hải Châu, Đà Nẵng",
      lat: 16.0678,
      lng: 108.2208,
    };
    setLotDetails(fallback);

    getLotByIdApi(bookingInfo.lotId).then((data) => {
      if (data) {
        setLotDetails({
          name: data.name || fallback.name,
          address: data.address || fallback.address,
          lat: data.latitude ? Number(data.latitude) : fallback.lat,
          lng: data.longitude ? Number(data.longitude) : fallback.lng,
        });
      }
    });
  }, [bookingInfo?.lotId]);

  // Handle Expiration & Timer for `paid` state
  useEffect(() => {
    if (bookingInfo?.status === "paid" && bookingInfo.arrivalExpiresAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((bookingInfo.arrivalExpiresAt! - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          markExpired();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Vibrate on expire
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [bookingInfo, markExpired]);

  // QR Token Rotation (Every 30s)
  useEffect(() => {
    if (bookingInfo?.status === "paid" || bookingInfo?.status === "entered") {
      const interval = setInterval(() => {
        setQrToken(Date.now().toString());
        setQrProgress(100);
      }, 30000);
      
      const tick = setInterval(() => {
        setQrProgress(p => Math.max(0, p - (100 / 300))); // 100ms interval -> 300 ticks in 30s
      }, 100);

      return () => { clearInterval(interval); clearInterval(tick); };
    }
  }, [bookingInfo]);

  if (!bookingInfo) return null;

  const isRefundable = (Date.now() - bookingInfo.createdAt) < 5 * 60 * 1000;
  
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCancel = () => {
    cancelBooking();
    setShowCancel(false);
    addToast("Đã hủy đặt chỗ", "success");
  };

  // Kích hoạt lấy vị trí hiện tại và mở bản đồ dẫn đường
  const handleOpenNavigation = () => {
    setIsLocating(true);
    addToast("Đang định vị vị trí hiện tại...", "info");

    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isReal: true,
          });
          setIsLocating(false);
          setShowNavigation(true);
          addToast("Đã xác định vị trí của bạn", "success");
        },
        (error) => {
          console.warn("Không lấy được GPS, sử dụng vị trí mô phỏng gần bãi:", error);
          // Fallback location trung tâm Đà Nẵng (gần Cầu Rồng / Bạch Đằng)
          setUserLocation({
            lat: 16.0630,
            lng: 108.2225,
            isReal: false,
          });
          setIsLocating(false);
          setShowNavigation(true);
          addToast("Đang dùng vị trí ước tính tại Đà Nẵng", "info");
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      setUserLocation({
        lat: 16.0630,
        lng: 108.2225,
        isReal: false,
      });
      setIsLocating(false);
      setShowNavigation(true);
    }
  };

  // Tính khoảng cách và thời gian dự kiến
  const targetLot = lotDetails || {
    name: "Bãi Hải Châu A",
    address: "15 Lê Duẩn, Hải Châu 1, Hải Châu, Đà Nẵng",
    lat: 16.0718,
    lng: 108.2222,
  };

  const currentLat = userLocation?.lat || 16.0630;
  const currentLng = userLocation?.lng || 16.0225;
  const distanceKm = calculateDistanceKm(currentLat, currentLng, targetLot.lat, targetLot.lng);
  const estimatedMins = Math.max(3, Math.round((distanceKm / 25) * 60)); // Giả định tốc độ 25 km/h trong đô thị

  // Mở ứng dụng chỉ đường ngoài (dùng địa chỉ cụ thể để ghim chính xác 15 Lê Duẩn)
  const openExternalGoogleMaps = () => {
    const dest = encodeURIComponent(targetLot.address);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${dest}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const openExternalAppleMaps = () => {
    const dest = encodeURIComponent(targetLot.address);
    const url = `https://maps.apple.com/?saddr=${currentLat},${currentLng}&daddr=${dest}&dirflg=d`;
    window.open(url, "_blank");
  };

  return (
    <div className={clsx("min-h-screen flex flex-col pb-32 transition-colors duration-500", 
      bookingInfo.status === "cancelled" ? "bg-slate-100 dark:bg-slate-900" :
      bookingInfo.status === "forfeited" ? "bg-slate-900" :
      "bg-[#2B4BD1]"
    )}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button 
          onClick={() => router.push(bookingInfo.status === "paid" ? "/" : "/lich-su")} 
          className="w-10 h-10 flex items-center justify-center -ml-2 text-white/80 active:scale-95"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-[17px] font-bold text-white">
            {bookingInfo.status === "cancelled" ? "Vé đã hủy" :
             bookingInfo.status === "forfeited" ? "Vé đã hết hạn" :
             bookingInfo.status === "entered" ? "Đang đỗ xe" :
             bookingInfo.status === "completed" ? "Đã hoàn tất" :
             "Vé điện tử"}
          </h1>
        </div>
        <div className="w-10" />
      </div>

      {/* Ticket Card */}
      <div className="flex-1 px-6 pt-4">
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-2xl relative overflow-hidden transition-colors">
          
          {/* Status Overlay for Forfeited / Cancelled */}
          <AnimatePresence>
            {bookingInfo.status === "forfeited" && (
              <motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-[2px]">
                <div className="border-4 border-red-500 text-red-500 font-black text-4xl p-3 uppercase rotate-[-15deg] rounded-lg tracking-widest">
                  Vô Hiệu
                </div>
                <div className="mt-8 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-center border border-red-100 dark:border-red-900 max-w-[240px]">
                  <p className="font-bold text-sm mb-1">Quá hạn đến bãi</p>
                  <p className="text-xs font-medium">Bạn đã không đến bãi đúng giờ quy định. Tiền cọc đã bị trừ vào phí giữ chỗ.</p>
                </div>
              </motion.div>
            )}
            
            {bookingInfo.status === "cancelled" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90">
                <XCircle size={48} className="text-slate-300 mb-4" />
                <div className="text-slate-500 font-bold text-lg mb-1">Đã hủy</div>
                {isRefundable ? (
                  <div className="text-emerald-500 font-bold text-sm bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 rounded-full">Đã hoàn tiền 50.000 ₫</div>
                ) : (
                  <div className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-950/40 px-4 py-2 rounded-full">Không được hoàn cọc</div>
                )}
              </div>
            )}

            {bookingInfo.status === "completed" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95">
                <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                <div className="text-slate-900 dark:text-white font-black text-xl mb-1">Đã hoàn tất</div>
                <div className="text-slate-500 font-medium text-sm mb-4">Cảm ơn bạn đã sử dụng dịch vụ</div>
                <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                  <p className="text-xs font-bold text-slate-400 mb-1">Tổng chi phí</p>
                  <p className="text-2xl font-black text-[#2B4BD1] dark:text-blue-400">50.000 ₫</p>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Lot and Slot Info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-1">
              {targetLot.name}
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Ô đỗ <span className="font-bold text-[#2B4BD1] dark:text-blue-400">{bookingInfo.spotId}</span> • Biển số <span className="font-mono font-bold">{vehiclePlate}</span>
            </p>
          </div>

          {/* QR Section */}
          <div className="flex flex-col items-center justify-center mb-8 relative">
            <div 
              className={clsx("relative p-3 rounded-2xl border-2 transition-opacity", 
                bookingInfo.status === "entered" ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20" : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900",
                bookingInfo.status === "forfeited" && "opacity-20 blur-sm"
              )}
            >
              <button 
                onClick={() => setShowFullscreen(true)}
                className="relative active:scale-95 transition-transform"
              >
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={qrToken}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <QRCodeSVG value={`${bookingInfo.id}|${qrToken}`} size={180} />
                  </motion.div>
                </AnimatePresence>

                {/* Scan overlay if entered */}
                {bookingInfo.status === "entered" && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex flex-col items-center justify-center backdrop-blur-[1px]">
                    <CheckCircle2 size={48} className="text-emerald-600 drop-shadow-md" />
                    <span className="text-emerald-700 font-bold mt-2 bg-emerald-50/80 px-3 py-1 rounded-full text-xs">Đã quét vào</span>
                  </div>
                )}
              </button>
            </div>
            
            {/* Auto refresh timer */}
            {(bookingInfo.status === "paid" || bookingInfo.status === "entered") && (
              <div className="mt-4 flex items-center gap-2 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-600">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="8" cy="8" r="7" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                    <circle 
                      cx="8" 
                      cy="8" 
                      r="7" 
                      fill="none" 
                      stroke="#2B4BD1" 
                      strokeWidth="2" 
                      strokeDasharray="44" 
                      strokeDashoffset={44 - (44 * qrProgress) / 100} 
                      className="transition-all duration-75" 
                    />
                  </svg>
                  <QrCode size={8} className="text-[#2B4BD1]" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Tự động làm mới
                </span>
              </div>
            )}
          </div>

          {/* Time & Status Info */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
            {bookingInfo.status === "paid" && (
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-[16px] p-4 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/60 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-900 dark:text-orange-200 mb-0.5">Thời gian đến bãi</p>
                    <p className="text-[10px] font-medium text-orange-700 dark:text-orange-300">Đến đúng giờ để giữ cọc</p>
                  </div>
                </div>
                <div className="text-xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
                  {formatTimer(timeLeft)}
                </div>
              </div>
            )}

            {bookingInfo.status === "entered" && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-[16px] p-4 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-0.5">Giờ vào bãi</p>
                    <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Đang tính phí đỗ xe</p>
                  </div>
                </div>
                <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                  {new Date(bookingInfo.enteredAt || Date.now()).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[16px] border border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mã vé (Token)</p>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{bookingInfo.id}</p>
              </div>
              <button 
                onClick={() => { navigator.clipboard.writeText(bookingInfo.id); addToast("Đã chép mã vé", "success"); }} 
                className="text-[#2B4BD1] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform"
              >
                Chép
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Actions below card */}
      <div className="px-6 mt-6 space-y-3">
        {bookingInfo.status === "paid" && (
          <>
            {/* NÚT DẪN ĐƯỜNG ĐẾN BÃI */}
            <button 
              onClick={handleOpenNavigation}
              disabled={isLocating}
              className="w-full bg-white text-[#2B4BD1] font-bold py-4 rounded-[18px] active:scale-95 flex items-center justify-center gap-2 shadow-xl hover:bg-slate-50 transition-all text-base disabled:opacity-80"
            >
              {isLocating ? (
                <>
                  <Loader2 size={20} className="animate-spin text-[#2B4BD1]" />
                  <span>Đang định vị GPS...</span>
                </>
              ) : (
                <>
                  <MapPin size={20} className="text-[#2B4BD1]" />
                  <span>Dẫn đường đến bãi</span>
                </>
              )}
            </button>

            <button 
              onClick={() => setShowCancel(true)} 
              className="w-full bg-transparent text-white/80 hover:text-white font-bold py-3 rounded-[16px] active:scale-95 text-sm transition-colors"
            >
              Hủy đặt chỗ
            </button>
          </>
        )}

        {bookingInfo.status === "entered" && (
          <button 
            onClick={() => router.push("/")} 
            className="w-full bg-white text-[#2B4BD1] font-bold py-4 rounded-[16px] active:scale-95 flex items-center justify-center gap-2 shadow-lg"
          >
            Về màn hình chính
          </button>
        )}

        {bookingInfo.status === "forfeited" && (
          <>
            <button 
              onClick={() => router.push("/")} 
              className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 shadow-lg shadow-[#2B4BD1]/30"
            >
              Tìm chỗ đỗ mới
            </button>
            <button 
              onClick={() => router.push("/")} 
              className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95"
            >
              Về trang chủ
            </button>
            <button 
              onClick={() => addToast("Chính sách: Khách hàng đến trễ 20 phút sẽ mất cọc", "info")} 
              className="w-full bg-transparent text-slate-500 font-bold py-4 rounded-[16px] active:scale-95"
            >
              Xem chính sách hoàn cọc
            </button>
          </>
        )}

        {bookingInfo.status === "cancelled" && (
          <>
            <button 
              onClick={() => router.push(`/bai/${bookingInfo.lotId}`)} 
              className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 shadow-lg shadow-[#2B4BD1]/30 transition-transform"
            >
              Đặt lại ô này
            </button>
            <button 
              onClick={() => router.push("/")} 
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 rounded-[16px] active:scale-95 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
            >
              Về màn hình chính
            </button>
          </>
        )}

        {bookingInfo.status === "completed" && (
          <button 
            onClick={() => router.push("/")} 
            className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 shadow-lg shadow-[#2B4BD1]/30"
          >
            Về trang chủ
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL BẢN ĐỒ DẪN ĐƯỜNG TRỰC TIẾP TRONG APP (IN-APP NAVIGATION) */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showNavigation && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#2B4BD1] text-white flex items-center justify-center shadow-md shadow-[#2B4BD1]/30 shrink-0">
                    <Navigation size={20} className="rotate-45" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight truncate">
                      Lộ trình đến {targetLot.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="shrink-0 text-red-500" />
                      {targetLot.address}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowNavigation(false)}
                  className="w-9 h-9 rounded-full bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all shrink-0 ml-2"
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Map View Frame */}
              <div className="relative w-full h-[280px] sm:h-[320px] bg-slate-100 dark:bg-slate-950">
                <iframe
                  title="Bản đồ dẫn đường đến bãi xe"
                  src={`https://maps.google.com/maps?saddr=${currentLat},${currentLng}&daddr=${encodeURIComponent(targetLot.address)}&hl=vi&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                />

                {/* GPS Status Floating Pill */}
                <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {userLocation?.isReal ? "GPS vị trí của bạn" : "Tọa độ tại Đà Nẵng"}
                  </span>
                </div>
              </div>

              {/* Route Metrics and Info */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-center">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">Khoảng cách</p>
                    <p className="text-base font-black text-blue-950 dark:text-blue-200 tabular-nums">{distanceKm} km</p>
                  </div>
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Dự kiến</p>
                    <p className="text-base font-black text-emerald-950 dark:text-emerald-200 tabular-nums">~{estimatedMins} phút</p>
                  </div>
                  <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-center">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Ô đỗ xe</p>
                    <p className="text-base font-black text-amber-950 dark:text-amber-200">{bookingInfo.spotId}</p>
                  </div>
                </div>

                {/* Countdown Warning */}
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-orange-500 shrink-0" />
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Thời hạn đến bãi giữ cọc:
                    </span>
                  </div>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-sm">
                    {formatTimer(timeLeft)}
                  </span>
                </div>

                {/* Buttons to Launch External GPS Navigation */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={openExternalGoogleMaps}
                    className="w-full bg-[#2B4BD1] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#2B4BD1]/30 transition-all text-sm"
                  >
                    <Navigation size={18} />
                    <span>Mở Google Maps (Chỉ đường giọng nói)</span>
                    <ExternalLink size={14} className="opacity-70" />
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={openExternalAppleMaps}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-3 rounded-xl active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                    >
                      <span>Mở Apple Maps</span>
                    </button>
                    <button
                      onClick={() => setShowNavigation(false)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold py-3 rounded-xl active:scale-95 transition-all text-xs"
                    >
                      Đóng & Xem vé QR
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen QR Modal */}
      <AnimatePresence>
        {showFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setShowFullscreen(false)}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6"
          >
            <button className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md active:scale-95">
              <X size={28} />
            </button>
            <div className="bg-white p-6 rounded-[32px] w-full max-w-sm flex items-center justify-center aspect-square">
              <QRCodeSVG value={`${bookingInfo.id}|${qrToken}`} className="w-full h-full" />
            </div>
            <p className="text-white/60 font-medium mt-8 text-center px-8">
              Chạm vào bất cứ đâu để đóng
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Dialog */}
      <BottomSheet isOpen={showCancel} onClose={() => setShowCancel(false)} title="Hủy đặt chỗ?">
        {isRefundable ? (
          <div className="flex items-start gap-3 bg-emerald-50 text-emerald-800 p-4 rounded-[16px] mb-6 border border-emerald-100">
            <CheckCircle2 size={24} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm mb-1">Hoàn cọc 100%</h4>
              <p className="text-xs font-medium text-emerald-700">Bạn hủy trong vòng 5 phút đầu, hệ thống sẽ tự động hoàn 50.000 ₫ về thẻ/ví của bạn.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-[16px] mb-6 border border-red-100">
            <AlertTriangle size={24} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm mb-1">Không hoàn cọc</h4>
              <p className="text-xs font-medium text-red-700">Đã quá 5 phút kể từ lúc đặt, việc hủy lúc này sẽ không được hoàn lại 50.000 ₫.</p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setShowCancel(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95">Không</button>
          <button onClick={handleCancel} className="flex-1 bg-red-500 text-white font-bold py-4 rounded-[16px] active:scale-95">Xác nhận hủy</button>
        </div>
      </BottomSheet>

      {/* Demo Tools */}
      {isDemo && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 flex gap-2 z-40 overflow-x-auto">
          {bookingInfo.status === "paid" && (
            <>
              <button onClick={markEntered} className="flex-1 bg-emerald-500 py-2 px-3 rounded font-bold text-xs whitespace-nowrap">Quét tại cổng (Vào)</button>
              <button onClick={fastForward} className="flex-1 bg-amber-500 py-2 px-3 rounded font-bold text-xs whitespace-nowrap">Tua TG (-20p)</button>
            </>
          )}
          {bookingInfo.status === "entered" && (
            <button onClick={markCompleted} className="flex-1 bg-blue-500 py-2 px-3 rounded font-bold text-xs whitespace-nowrap">Quét tại cổng (Ra)</button>
          )}
        </div>
      )}
    </div>
  );
}
