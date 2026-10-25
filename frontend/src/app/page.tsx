"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Mic,
  SlidersHorizontal,
  MapPin,
  Bell,
  ChevronDown,
  ChevronRight,
  Car,
  Zap,
  Umbrella,
  Navigation,
  Tag,
  Clock,
  PlusCircle,
  CreditCard,
  CheckCircle,
  Camera,
  QrCode,
  BookmarkCheck,
  BadgePercent,
  History,
  Sparkles,
  X,
  ArrowUpLeft,
  Navigation2,
} from "lucide-react";
import { clsx } from "clsx";
import { lots, Lot } from "@/lib/mock/lots";
import { getLotsApi } from "@/lib/api";
import { useStore } from "@/store";
import BottomSheet from "@/components/ui/BottomSheet";

const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Hàm tính khoảng cách địa lý (km) theo công thức Haversine
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function ExploreContent() {
  const router = useRouter();

  // Zustand Store
  const user = useStore((s) => s.user);
  const vehicles = useStore((s) => s.vehicles);
  const activeBooking = useStore((s) => s.activeBooking);
  const addToast = useStore((s) => s.addToast);
  const cancelBooking = useStore((s) => s.cancelBooking);

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0] || {
    plate: "43A-123.45",
    type: "SUV",
  };

  // GPS Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Tự động kích hoạt GPS khi mở app (âm thầm không hiện toast che màn hình)
  const requestGpsLocation = () => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setIsGpsActive(true);
          setIsLocating(false);
          setCurrentArea("Vị trí GPS của bạn 📍");
        },
        (error) => {
          setIsLocating(false);
          console.warn("Lỗi hoặc từ chối GPS:", error.message);
          // Mặc định fallback tọa độ trung tâm Đà Nẵng (Hải Châu)
          setUserLocation({ lat: 16.0718, lng: 108.2222 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  useEffect(() => {
    requestGpsLocation();
  }, []);

  // Lời chào theo thời gian thực (Real-time greeting)
  const [greeting, setGreeting] = useState("Chào bạn,");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting("Chào buổi sáng,");
      } else if (hour >= 12 && hour < 14) {
        setGreeting("Chào buổi trưa,");
      } else if (hour >= 14 && hour < 18) {
        setGreeting("Chào buổi chiều,");
      } else {
        setGreeting("Chào buổi tối,");
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  // Real lots from API
  const [lotsList, setLotsList] = useState<Lot[]>(lots);
  useEffect(() => {
    getLotsApi().then((data) => {
      if (data && data.length > 0) {
        setLotsList(data);
      }
    });
  }, []);

  // Filter chips state
  const [activeFilter, setActiveFilter] = useState("Ô tô");
  const filters = ["Ô tô", "Sạc xe điện (EV)", "Có mái che", "Gần nhất", "Giá rẻ"];

  // Search & Typewriter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [sheetContent, setSheetContent] = useState<"none" | "notif" | "area">("none");
  const [currentArea, setCurrentArea] = useState("Hải Châu, Đà Nẵng");

  const searchPhrases = [
    "Bạn muốn đỗ xe ở đâu?...",
    "Bãi đỗ xe Hải Châu...",
    "Bãi đỗ xe Cầu Rồng...",
    "Sân bay Đà Nẵng T1...",
    "Gần tôi (bán kính 1km)...",
  ];
  const [typewriterText, setTypewriterText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter effect
  useEffect(() => {
    const currentPhrase = searchPhrases[phraseIndex];
    const typingSpeed = isDeleting ? 45 : 90;

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentPhrase.length) {
        setTypewriterText(currentPhrase.substring(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      } else if (isDeleting && charIndex > 0) {
        setTypewriterText(currentPhrase.substring(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      } else if (!isDeleting && charIndex === currentPhrase.length) {
        setTimeout(() => setIsDeleting(true), 1600);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPhraseIndex((p) => (p + 1) % searchPhrases.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, phraseIndex]);

  // Active reservation card demo state: 'ENTERED' | 'HOLDING' | 'PAID'
  const [demoParkingState, setDemoParkingState] = useState<"ENTERED" | "HOLDING" | "PAID">("ENTERED");

  // Determine current effective state (prefer real booking if available)
  const currentParkingState = activeBooking
    ? activeBooking.status === "entered"
      ? "ENTERED"
      : activeBooking.status === "paid"
      ? "PAID"
      : "HOLDING"
    : demoParkingState;

  // Realtime duration clock for ENTERED state
  const [parkedSeconds, setParkedSeconds] = useState(8315); // ~ 2h 18m 35s
  const [holdingSeconds, setHoldingSeconds] = useState(584); // 9m 44s
  const [paidSeconds, setPaidSeconds] = useState(1130); // 18m 50s

  useEffect(() => {
    const interval = setInterval(() => {
      setParkedSeconds((s) => s + 1);
      setHoldingSeconds((s) => (s > 0 ? s - 1 : 0));
      setPaidSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // AI Bubble popup toggle
  const [showAiBubble, setShowAiBubble] = useState(false);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatMinSec = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Filter lots based on search query & activeFilter, and compute exact distance from userLocation
  const filteredLots = useMemo(() => {
    let result = lotsList.map((lot) => {
      let distance = lot.distance;
      if (userLocation && lot.latitude && lot.longitude) {
        distance = calculateDistanceKm(userLocation.lat, userLocation.lng, lot.latitude, lot.longitude);
      }
      return {
        ...lot,
        distance,
      };
    });

    if (searchQuery.trim()) {
      const q = normalize(searchQuery.trim());
      result = result.filter(
        (l) =>
          normalize(l.name).includes(q) ||
          normalize(l.district).includes(q) ||
          (l.address && normalize(l.address).includes(q))
      );
    }

    if (activeFilter === "Sạc xe điện (EV)") {
      result = result.filter((l) => l.available.ev > 0 || l.labels.some((lbl) => lbl.toLowerCase().includes("ev")));
    } else if (activeFilter === "Có mái che") {
      result = result.filter((l) => l.labels.some((lbl) => lbl.toLowerCase().includes("mái che")));
    } else if (activeFilter === "Gần nhất") {
      result.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    } else if (activeFilter === "Giá rẻ") {
      result.sort((a, b) => a.price - b.price);
    } else {
      // Mặc định: Nếu có GPS, ưu tiên hiển thị bãi gần nhất trước
      if (userLocation) {
        result.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      }
    }

    return result;
  }, [lotsList, searchQuery, activeFilter, userLocation]);

  // Find lot details if active booking exists
  const bookedLot = activeBooking
    ? lotsList.find((l) => String(l.id).toLowerCase() === String(activeBooking.lotId).toLowerCase())
    : null;
  const bookedLotName = bookedLot?.name || (activeBooking ? "Bãi Hải Châu A" : "Bãi đỗ xe Hải Châu");

  const userName = user?.name || "Minh Trần";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative w-full min-h-screen flex flex-col bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9] text-slate-800 font-sans pb-6">
      
      {/* ================= 1. DYNAMIC ISLAND & STATUS BAR ================= */}
      <div className="relative z-40 flex items-center justify-between px-6 pt-3 pb-1 select-none pointer-events-none bg-white/70 backdrop-blur-md">
        <span className="text-[13px] font-bold text-slate-900 tracking-tight">09:41</span>

        {/* Dynamic Island Pill */}
        <div className="w-24 h-6 bg-slate-950 rounded-full mx-auto flex items-center justify-between px-2.5 shadow-inner">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
          <span className="text-xs">📶</span>
          <span className="text-xs">📶</span>
          <div className="w-5 h-2.5 border border-current rounded-[3px] p-0.5 flex items-center">
            <div className="w-full h-full bg-current rounded-2xs" />
          </div>
        </div>
      </div>

      {/* ================= 2. FIXED HEADER ================= */}
      <header className="relative z-30 px-5 pt-2 pb-2.5 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between shadow-xs">
        {/* User Avatar + Greeting + Location */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-400 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-500/25 border-2 border-white ring-1 ring-blue-100">
              {userInitials}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <p suppressHydrationWarning className="text-[11px] font-medium text-slate-500 leading-none">
              {greeting}
            </p>
            <h2 className="text-[14px] font-extrabold text-slate-900 tracking-tight flex items-center gap-1 mt-0.5">
              {userName} 👋
            </h2>
            <button
              onClick={() => setSheetContent("area")}
              className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold mt-0.5 hover:underline text-left"
            >
              <div className="relative flex items-center justify-center">
                <MapPin size={12} className={isGpsActive ? "text-emerald-600" : "text-blue-600"} />
                {isGpsActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                )}
              </div>
              <span className="truncate max-w-[130px]">{currentArea}</span>
              {isLocating && <span className="text-[9px] text-slate-400 animate-pulse">(Đang dò...)</span>}
              <ChevronDown size={12} className="shrink-0 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Notification Bell */}
        <div className="flex items-center gap-2">
          {/* Quick GPS Refresh Pill */}
          <button
            onClick={requestGpsLocation}
            title="Lấy lại tọa độ GPS"
            className={clsx(
              "px-2 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 transition active:scale-95",
              isGpsActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            )}
          >
            <Navigation size={10} className={clsx(isGpsActive ? "text-emerald-600" : "text-slate-500", isLocating && "animate-spin")} />
            <span>{isGpsActive ? "GPS Bật" : "Bật GPS"}</span>
          </button>

          <button
            onClick={() => setSheetContent("notif")}
            type="button"
            className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 transition flex items-center justify-center text-slate-700"
          >
            <div className="animate-bell-wiggle inline-flex">
              <Bell size={18} />
            </div>
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center border-2 border-white">
              3
            </span>
          </button>
        </div>
      </header>

      {/* ================= 3. SCROLLABLE CONTAINER ================= */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-4 pt-3 pb-8">

        {/* 3.1 SEARCH BAR WITH TYPEWRITER EFFECT */}
        <div className="relative z-30">
          <div className="flex items-center gap-2">
            <div
              onClick={() => setShowSearchHistory(!showSearchHistory)}
              className="flex-1 flex items-center gap-2.5 bg-white border border-slate-200/90 rounded-[14px] px-3.5 py-2.5 shadow-sm hover:border-blue-400 cursor-pointer transition-all"
            >
              <Search size={18} className="text-blue-600 shrink-0" />
              <div className="flex-1 text-xs text-slate-400 font-medium truncate">
                {searchQuery ? (
                  <span className="text-slate-800 font-semibold">{searchQuery}</span>
                ) : (
                  <span>
                    {typewriterText}
                    <span className="text-blue-600 animate-pulse font-bold">|</span>
                  </span>
                )}
              </div>
              {searchQuery && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Voice button */}
            <button
              onClick={() => {
                addToast("Đang lắng nghe: 'Tìm bãi đỗ xe gần nhất'...", "info");
                setSearchQuery("Hải Châu");
              }}
              className="w-10 h-10 rounded-[14px] bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 active:scale-95 transition shrink-0"
              title="Tìm kiếm bằng giọng nói"
            >
              <Mic size={18} />
            </button>

            {/* AI Search / Filter button */}
            <button
              onClick={() => router.push(`/ai?q=${encodeURIComponent(searchQuery || "Tìm bãi đỗ gần nhất")}`)}
              className="w-10 h-10 rounded-[14px] bg-gradient-to-tr from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center justify-center active:scale-95 transition shrink-0"
              title="AI Trợ lý đỗ xe"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>

          {/* Quick Search History Dropdown Popover */}
          {showSearchHistory && (
            <div className="absolute top-12 left-0 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 animate-fade-up">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px] font-bold text-slate-500">
                <span>Gợi ý & Tìm kiếm gần đây</span>
                <button onClick={() => setShowSearchHistory(false)} className="text-blue-600 hover:underline">
                  Đóng
                </button>
              </div>
              <div className="space-y-1 mt-2">
                {[
                  "Bãi Hải Châu A",
                  "Bãi Cầu Rồng",
                  "Sân bay Đà Nẵng T1",
                  "15 Lê Duẩn, Hải Châu",
                  "Đường Trần Hưng Đạo, Sơn Trà",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSearchQuery(item);
                      setShowSearchHistory(false);
                    }}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" />
                      <span>{item}</span>
                    </div>
                    <ArrowUpLeft size={14} className="text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3.2 ACTIVE VEHICLE */}
        <div>
          {/* Current Selected Vehicle Strip */}
          <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 rounded-xl px-3 py-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-base">🚘</span>
              <span className="text-slate-600 font-medium">Xe của bạn:</span>
              <span className="font-extrabold text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200/80 shadow-2xs font-mono">
                {activeVehicle.plate}
              </span>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                {activeVehicle.type}
              </span>
            </div>
            <Link
              href="/xe-cua-toi"
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
            >
              <span>Đổi xe</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* 3.3 CARD ĐẶT CHỖ HIỆN TẠI (ACTIVE RESERVATION CARD) - CHỈ HIỆN KHI CÓ ĐƠN THỰC TẾ */}
        {activeBooking && (
          <div className="bg-white rounded-[22px] border border-slate-200/90 p-3.5 shadow-sm relative overflow-hidden">
            {/* Header Status Badge */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Đơn đặt chỗ đang hoạt động
              </span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Mã: {activeBooking.id}
              </span>
            </div>

          {/* --- STATE 1: ĐANG ĐỖ (ENTERED) --- */}
          {currentParkingState === "ENTERED" && (
            <div className="space-y-3 animate-fade-up">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Đang đỗ xe • Bãi {activeBooking?.spotId || "A1"}
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-1.5">{bookedLotName}</h3>
                  <p className="text-[11px] text-slate-500">Vào bãi lúc 07:22 • Cổng chính</p>
                </div>

                {/* Circular visual progress 62% */}
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500"
                      strokeDasharray="62, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-[11px] font-black text-slate-800">62%</span>
                    <span className="text-[8px] text-slate-400 leading-none">gói 4h</span>
                  </div>
                </div>
              </div>

              {/* Slot Details Box */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Biển số</p>
                  <p className="text-xs font-black text-blue-900 font-mono mt-0.5">{activeVehicle.plate}</p>
                </div>
                <div className="border-x border-slate-200">
                  <p className="text-[10px] text-slate-400 font-semibold">Ô đỗ xe</p>
                  <p className="text-xs font-black text-emerald-600 mt-0.5">{activeBooking?.spotId || "A1 - 04"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Tạm tính</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">35.000đ</p>
                </div>
              </div>

              {/* Realtime Live Timer Counter */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Clock size={14} className="text-blue-600" />
                  <span>Thời gian đỗ:</span>
                </div>
                <div className="font-mono text-sm font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {formatTime(parkedSeconds)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  onClick={() => addToast("Đã chọn gia hạn thêm 2 giờ (+30.000đ)", "success")}
                  className="py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <PlusCircle size={14} />
                  + Gia hạn thêm
                </button>
                <button
                  onClick={() => addToast(`Đang bật dẫn đường tới ô ${activeBooking?.spotId || "A1-04"}`, "info")}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Navigation size={14} />
                  Dẫn đường xe
                </button>
              </div>
            </div>
          )}

          {/* --- STATE 2: ĐANG GIỮ CHỖ (HOLDING) --- */}
          {currentParkingState === "HOLDING" && (
            <div className="space-y-3 animate-fade-up border-l-4 border-amber-400 pl-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    Đang giữ chỗ trước (Tối đa 15p)
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-1.5">{bookedLotName}</h3>
                  <p className="text-[11px] text-slate-500">
                    Giữ chỗ ô: <strong className="text-slate-800">{activeBooking?.spotId || "A1-02"}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block">Hết hạn sau</span>
                  <span className="font-mono text-base font-extrabold text-amber-600">
                    {formatMinSec(holdingSeconds)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                ⚠️ Vui lòng đến bãi đỗ trước khi hết thời gian giữ chỗ để không bị hủy lượt.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  onClick={() => {
                    cancelBooking();
                    setDemoParkingState("ENTERED");
                    addToast("Đã hủy giữ chỗ thành công", "info");
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-rose-600 font-bold text-xs transition active:scale-95"
                >
                  Hủy giữ chỗ
                </button>
                <Link
                  href={activeBooking ? `/dat-cho/${activeBooking.spotId}` : `/bai/${lotsList[0]?.id || "hai-chau-a"}`}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <CreditCard size={14} />
                  Thanh toán cọc (20k)
                </Link>
              </div>
            </div>
          )}

          {/* --- STATE 3: ĐÃ THANH TOÁN (PAID) --- */}
          {currentParkingState === "PAID" && (
            <div className="space-y-3 animate-fade-up border-l-4 border-blue-500 pl-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                    <CheckCircle size={12} className="text-blue-600" />
                    Chờ đến bãi • Đã thanh toán
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-1.5">{bookedLotName}</h3>
                  <p className="text-[11px] text-slate-500">
                    Mã ô đỗ định danh: <strong className="text-blue-600">{activeBooking?.spotId || "B2-07"}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block">Barie mở sau</span>
                  <span className="font-mono text-base font-extrabold text-blue-600">
                    {formatMinSec(paidSeconds)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-blue-600" />
                  <span className="text-xs text-slate-700 font-medium">
                    Camera AI đã nhận dạng biển <strong>{activeVehicle.plate}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  onClick={() => addToast("Đang kích hoạt bản đồ chỉ đường tới bãi đỗ...", "info")}
                  className="py-2.5 px-3 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Navigation size={14} />
                  Dẫn đường
                </button>
                <Link
                  href={activeBooking ? `/ve/${activeBooking.id}` : "/lich-su"}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <QrCode size={14} />
                  Xem vé QR
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

        {/* 3.4 TRUY CẬP NHANH (QUICK ACTIONS 4 BUTTONS) */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Truy cập nhanh</h3>
          <div className="grid grid-cols-4 gap-2.5">
            {/* 1. Đặt chỗ */}
            <Link
              href={`/bai/${lotsList[0]?.id || "hai-chau-a"}`}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-1.5 hover:border-blue-300 hover:bg-blue-50/30 active:scale-95 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BookmarkCheck size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Đặt chỗ</span>
            </Link>

            {/* 2. Xe của tôi */}
            <Link
              href="/xe-cua-toi"
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-1.5 hover:border-blue-300 hover:bg-blue-50/30 active:scale-95 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Car size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Xe của tôi</span>
            </Link>

            {/* 3. Ưu đãi */}
            <button
              onClick={() => addToast("Kho ưu đãi: Bạn có 1 mã giảm giá 20% đỗ xe cuối tuần!", "info")}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-1.5 hover:border-blue-300 hover:bg-blue-50/30 active:scale-95 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <BadgePercent size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Ưu đãi</span>
            </button>

            {/* 4. Lịch sử */}
            <Link
              href="/lich-su"
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-1.5 hover:border-blue-300 hover:bg-blue-50/30 active:scale-95 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <History size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Lịch sử</span>
            </Link>
          </div>
        </div>

        {/* 3.5 BÃI ĐỖ GẦN BẠN (NEARBY PARKING LOTS HORIZONTAL CAROUSEL) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bãi đỗ gần bạn</h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">Realtime</span>
            </div>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center"
            >
              Xem tất cả ({filteredLots.length})
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Horizontal Scrollable Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {filters.map((chip) => {
              const isActive = activeFilter === chip;
              return (
                <button
                  key={chip}
                  onClick={() => setActiveFilter(chip)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 scale-[1.02]"
                      : "bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50"
                  }`}
                >
                  {chip === "Ô tô" && <Car size={13} />}
                  {chip === "Sạc xe điện (EV)" && (
                    <Zap size={13} className={isActive ? "text-amber-300" : "text-emerald-500"} />
                  )}
                  {chip === "Có mái che" && <Umbrella size={13} />}
                  {chip === "Gần nhất" && <Navigation size={13} />}
                  {chip === "Giá rẻ" && <Tag size={13} />}
                  <span>{chip}</span>
                </button>
              );
            })}
          </div>

          {/* Horizontal Scroll Cards */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {filteredLots.map((lot) => {
              const availableCount = lot.available?.total ?? 0;
              const isFull = availableCount === 0;

              return (
                <div
                  key={lot.id}
                  className={clsx(
                    "min-w-[250px] max-w-[250px] bg-white rounded-2xl border border-slate-200/90 p-3 shadow-sm flex flex-col justify-between shrink-0 transition-transform active:scale-[0.99]",
                    isFull && "opacity-75"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
                          isFull
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : availableCount <= 3
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                      >
                        <span
                          className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            isFull ? "bg-rose-500" : availableCount <= 3 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                        />
                        {isFull ? "Đã đỗ đầy" : `${availableCount} chỗ trống`}
                      </span>
                      <span className="text-[11px] font-black text-blue-700">
                        {lot.price.toLocaleString("vi-VN")}đ
                        <span className="text-[9px] font-normal text-slate-400">/h</span>
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-800 mt-2 line-clamp-1">{lot.name}</h4>
                    <p className="text-[10px] text-blue-700 font-bold mt-0.5 flex items-center gap-1">
                      <Navigation2 size={11} className="text-blue-500 shrink-0" />
                      <span>
                        {lot.distance !== undefined
                          ? `${lot.distance} km • ${Math.max(1, Math.round(lot.distance * 3))} phút di chuyển`
                          : "0.4 km • 3 phút di chuyển"}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                      <MapPin size={10} className="text-slate-400 shrink-0" />
                      <span className="truncate">{lot.address || `${lot.district}, Đà Nẵng`}</span>
                    </p>

                    {/* Interactive 8-Slot LED Matrix Replica */}
                    <div className="mt-2.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[8px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                        <span>SƠ ĐỒ TRỰC QUAN</span>
                        <span className={isFull ? "text-rose-600" : "text-emerald-600"}>
                          {isFull ? "HẾT CHỖ" : `${Math.min(availableCount, 8)}/8 TRỐNG`}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"].map((code, idx) => {
                          const isOccupied = isFull || idx >= (availableCount % 8 === 0 && availableCount > 0 ? 8 : (availableCount % 8) + 1);
                          return (
                            <div
                              key={code}
                              className={clsx(
                                "h-4 rounded border text-[8px] font-bold flex items-center justify-center",
                                isOccupied
                                  ? "border-rose-400 bg-rose-100 text-rose-700"
                                  : "border-emerald-500 bg-emerald-100 text-emerald-700"
                              )}
                            >
                              {code}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/bai/${lot.id}`}
                    className={clsx(
                      "w-full mt-3 py-2 rounded-xl text-center font-bold text-xs shadow-xs active:scale-95 transition block",
                      isFull
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                  >
                    {isFull ? "Báo khi có chỗ" : "Đặt chỗ ngay"}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* ================= 4. AI ASSISTANT FLOATING ACTION BUTTON (FAB) ================= */}
      <div className="fixed bottom-20 right-4 z-40">
        {/* AI Speech Bubble */}
        <AnimatePresence>
          {showAiBubble && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-14 right-0 w-64 bg-white p-3 rounded-2xl shadow-xl border border-blue-200 text-xs"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1 text-blue-600 font-bold text-[11px]">
                  <Sparkles size={13} />
                  <span>EZ-Space AI Trợ lý</span>
                </div>
                <button onClick={() => setShowAiBubble(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              </div>
              <p className="text-slate-700 mt-1.5 text-[11px]">
                "Tôi có thể giúp bạn tìm bãi đỗ xe SUV gần {currentArea.split(",")[0]} có trạm sạc dưới 30k/h nhé!"
              </p>
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => {
                    setShowAiBubble(false);
                    setActiveFilter("Sạc xe điện (EV)");
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px] hover:bg-blue-100 transition"
                >
                  ⚡ Bãi có sạc EV
                </button>
                <button
                  onClick={() => router.push("/ai")}
                  className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 transition"
                >
                  Mở Chat AI
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glowing Breath FAB */}
        <button
          onClick={() => setShowAiBubble(!showAiBubble)}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-blue-700 text-white flex items-center justify-center animate-glow-breath active:scale-90 transition-transform cursor-pointer border-2 border-white shadow-lg shadow-blue-600/40"
          title="Hỏi trợ lý ảo AI EZ-Space"
        >
          <Sparkles size={22} className="animate-spin-slow" />
        </button>
      </div>

      {/* ================= 5. BOTTOM SHEETS / MODALS ================= */}
      {/* Notifications BottomSheet */}
      <BottomSheet isOpen={sheetContent === "notif"} onClose={() => setSheetContent("none")} title="Thông báo hệ thống">
        <div className="space-y-3">
          {[
            { title: "Phiếu giảm giá 20%", desc: "Bạn có 1 mã ưu đãi 20% sắp hết hạn tại bãi đỗ Cầu Rồng!", time: "10 phút trước" },
            { title: "Nhận dạng biển số thành công", desc: `Xe ${activeVehicle.plate} đã được đồng bộ với trạm camera tự động.`, time: "1 giờ trước" },
            { title: "Cập nhật hệ thống EZ-Space", desc: "Đã tối ưu hóa thuật toán đề xuất ô đỗ gần thang máy.", time: "Hôm qua" },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-xs mb-0.5">{item.title}</h4>
                <p className="text-[11px] text-slate-500 mb-1">{item.desc}</p>
                <span className="text-[9px] font-bold text-slate-400">{item.time}</span>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setSheetContent("none");
              addToast("Đã đánh dấu đọc tất cả thông báo", "success");
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 rounded-2xl mt-3 active:scale-95 transition"
          >
            Đánh dấu đã đọc tất cả
          </button>
        </div>
      </BottomSheet>

      {/* Area Selector BottomSheet */}
      <BottomSheet isOpen={sheetContent === "area"} onClose={() => setSheetContent("none")} title="Chọn khu vực đỗ xe">
        <div className="space-y-2">
          {/* Nút định vị GPS trực tiếp */}
          <button
            onClick={() => {
              requestGpsLocation();
              setSheetContent("none");
            }}
            className="w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/25 mb-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Navigation size={16} className={isLocating ? "animate-spin" : ""} />
              </div>
              <div>
                <p className="text-xs font-black">Vị trí GPS hiện tại</p>
                <p className="text-[10px] text-blue-100 font-medium">Tự động tìm bãi gần bạn nhất</p>
              </div>
            </div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md">Bật ngay</span>
          </button>

          {["Hải Châu", "Sơn Trà", "Thanh Khê", "Ngũ Hành Sơn", "Liên Chiểu"].map((dist) => (
            <button
              key={dist}
              onClick={() => {
                setCurrentArea(`${dist}, Đà Nẵng`);
                setSearchQuery(dist);
                setSheetContent("none");
              }}
              className={clsx(
                "w-full text-left px-4 py-3.5 rounded-2xl font-bold transition-colors active:scale-95 flex items-center justify-between",
                currentArea.includes(dist)
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100"
              )}
            >
              <span>Quận {dist}</span>
              {currentArea.includes(dist) && <CheckCircle size={16} className="text-white" />}
            </button>
          ))}
        </div>
      </BottomSheet>

    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ExploreContent />
    </Suspense>
  );
}
