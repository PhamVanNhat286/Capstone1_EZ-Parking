"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Mic,
  MapPin,
  CheckCircle2,
  Navigation,
  X,
  Loader2,
  Compass,
  RotateCcw,
  SlidersHorizontal,
  Car,
  Zap,
  Umbrella,
  Clock,
  Check,
  ShieldCheck,
  CreditCard,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";
import { useStore, AIMessage } from "@/store";
import { lots, Lot } from "@/lib/mock/lots";
import { getLotsApi } from "@/lib/api";
import { getFallbackResponse, calculateDistance } from "@/lib/ai/fallback";

const PRESET_LOCATIONS = [
  { label: "15 Lê Duẩn (Hải Châu)", latitude: 16.0718, longitude: 108.2222 },
  { label: "Chân Cầu Rồng (Sơn Trà)", latitude: 16.061, longitude: 108.227 },
  { label: "Sân bay Đà Nẵng (Ga T1)", latitude: 16.0538, longitude: 108.1995 },
];

function AIContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Store
  const user = useStore((s) => s.user);
  const vehicles = useStore((s) => s.vehicles);
  const aiMessages = useStore((s) => s.aiMessages);
  const addAiMessage = useStore((s) => s.addAiMessage);
  const clearAiMessages = useStore((s) => s.clearAiMessages);
  const holdSpot = useStore((s) => s.holdSpot);
  const addToast = useStore((s) => s.addToast);

  const activeVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0] || {
    id: "v1",
    plate: "43A-123.45",
    type: "SUV",
  };

  // Real lots from API
  const [lotsList, setLotsList] = useState<Lot[]>(lots);
  useEffect(() => {
    getLotsApi().then((data) => {
      if (data && data.length > 0) setLotsList(data);
    });
  }, []);

  // Chat input & state
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState("Đang phân tích yêu cầu bãi đỗ...");
  const [hasSpeech, setHasSpeech] = useState(false);

  // User location (GPS)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; label?: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);

  // Booking confirmation modal
  const [bookingModal, setBookingModal] = useState<{
    lotId: string;
    lotName: string;
    slotCode: string;
    deposit: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Realtime clock for status bar
  const [clockTime, setClockTime] = useState("");
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto GPS on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedDenial = sessionStorage.getItem("ezspace_gps_denied") === "true";
      if (storedDenial) setGpsDenied(true);

      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: "geolocation" as PermissionName })
          .then((p) => {
            if (p.state === "denied") {
              setGpsDenied(true);
              sessionStorage.setItem("ezspace_gps_denied", "true");
            } else if (p.state === "granted") {
              setGpsDenied(false);
              sessionStorage.removeItem("ezspace_gps_denied");
            }
            p.onchange = () => {
              if (p.state === "denied") {
                setGpsDenied(true);
                sessionStorage.setItem("ezspace_gps_denied", "true");
              } else if (p.state === "granted") {
                setGpsDenied(false);
                sessionStorage.removeItem("ezspace_gps_denied");
              }
            };
          })
          .catch(() => {});
      }

      if (navigator.geolocation && !userLocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              label: "GPS của bạn",
            });
            setGpsDenied(false);
            sessionStorage.removeItem("ezspace_gps_denied");
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setGpsDenied(true);
              sessionStorage.setItem("ezspace_gps_denied", "true");
            }
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, isTyping]);

  // Initial query from URL search params (e.g. from Home page search)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setInput(q);
      window.history.replaceState({}, "", "/ai");
      handleSend(q);
    }
  }, [searchParams]);

  // Web Speech API check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) setHasSpeech(true);
    }
  }, []);

  const handleSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.start();
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      addToast("Trình duyệt không hỗ trợ định vị GPS", "error");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "GPS hiện tại",
        });
        setIsLocating(false);
        setShowLocationPicker(false);
        addToast("Đã cập nhật vị trí GPS của bạn!", "success");
      },
      (err) => {
        setIsLocating(false);
        setShowLocationPicker(true);
        addToast("Không lấy được GPS, bạn có thể chọn điểm mẫu bên dưới", "info");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Pipeline simulation states
  const pipelineStates = [
    "Đang nhận diện từ khóa và vị trí...",
    "Đang lọc bãi phù hợp cho xe...",
    "Đang kiểm tra ô trống theo thời gian thực...",
    "Đang sắp xếp theo giá và khoảng cách...",
  ];

  const handleSend = async (textToSend: string = input) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    // Check GPS: If denied or not yet available, notify the user
    if (gpsDenied || !userLocation) {
      addToast("Cần bật GPS để xác định vị trí hiện tại của bạn", "error");
      if (!gpsDenied && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              label: "GPS của bạn",
            });
            setGpsDenied(false);
            sessionStorage.removeItem("ezspace_gps_denied");
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setGpsDenied(true);
              sessionStorage.setItem("ezspace_gps_denied", "true");
            }
          },
          { enableHighAccuracy: true, timeout: 4000 }
        );
      }
    }

    // 1. Add User message
    const userMsg: AIMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
    };
    addAiMessage(userMsg);
    setInput("");
    setIsTyping(true);
    scrollToBottom();

    // 2. Typing animation simulation
    let stateIdx = 0;
    setTypingStatus(pipelineStates[0]);
    const stateInterval = setInterval(() => {
      stateIdx = (stateIdx + 1) % pipelineStates.length;
      setTypingStatus(pipelineStates[stateIdx]);
    }, 400);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          userLocation: userLocation
            ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
            : undefined,
        }),
      });

      clearInterval(stateInterval);

      if (!response.ok) {
        throw new Error("Failed to fetch AI response");
      }

      const res = await response.json();
      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: res.text,
        cards: Array.isArray(res.cards) ? res.cards.slice(0, 1) : [],
        chips: res.chips,
        timestamp: Date.now(),
      };
      addAiMessage(aiMsg);
    } catch (err) {
      clearInterval(stateInterval);
      console.warn("Using fallback AI response:", err);
      const res = getFallbackResponse(
        trimmed,
        userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : undefined
      );
      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: res.text,
        cards: Array.isArray(res.cards) ? res.cards.slice(0, 1) : [],
        chips: res.chips,
        timestamp: Date.now(),
      };
      addAiMessage(aiMsg);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const handleConfirmBooking = () => {
    if (!bookingModal) return;
    holdSpot(bookingModal.lotId, bookingModal.slotCode, activeVehicle.id);
    addToast(`Đã giữ ô ${bookingModal.slotCode} trong 10 phút!`, "success");
    const targetSpot = bookingModal.slotCode;
    setBookingModal(null);
    router.push(`/dat-cho/${targetSpot}`);
  };

  // Helper: Extract NLP Entity Chips from text
  const extractEntityChips = (text: string) => {
    const q = text.toLowerCase();
    const chips: string[] = [];
    if (q.includes("hải châu") || q.includes("vincom") || q.includes("đà nẵng")) {
      chips.push("📍 Khu vực Hải Châu");
    } else if (q.includes("sơn trà") || q.includes("cầu rồng")) {
      chips.push("📍 Chân Cầu Rồng, Sơn Trà");
    } else if (q.includes("sân bay")) {
      chips.push("📍 Sân bay Đà Nẵng T1");
    }
    if (q.includes("suv") || q.includes("7 chỗ") || q.includes("lớn")) {
      chips.push(`🚙 SUV 7 chỗ (${activeVehicle.plate})`);
    } else if (q.includes("sedan") || q.includes("4 chỗ")) {
      chips.push("🚗 Sedan tiêu chuẩn");
    } else if (q.includes("ev") || q.includes("sạc") || q.includes("điện")) {
      chips.push("⚡ Sạc nhanh EV (60kW)");
    }
    return chips;
  };

  return (
    <div className="relative w-full h-full bg-[#F8FAFC] text-slate-800 font-sans flex flex-col overflow-hidden">
      
      {/* Background Ambient Gradients */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 bg-indigo-300/15 rounded-full blur-3xl pointer-events-none" />

      {/* ================= 1. DYNAMIC ISLAND & STATUS BAR ================= */}
      <header className="relative z-30 pt-3 px-6 pb-1 flex justify-between items-center text-slate-900 select-none bg-white/70 backdrop-blur-md border-b border-slate-200/50 shrink-0">
        <span className="text-[14px] font-bold tracking-tight" suppressHydrationWarning>
          {clockTime || "09:41"}
        </span>

        {/* Dynamic Island */}
        <div className="w-[116px] h-[30px] bg-black rounded-full mx-auto flex items-center justify-between px-2.5 shadow-inner">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500/80 animate-pulse" />
            <div className="w-3 h-3 rounded-full bg-slate-900" />
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-800 text-xs">
          <span>📶</span>
          <span>📶</span>
          <div className="w-5 h-2.5 border-[1.5px] border-slate-800 rounded-[3px] p-[1px] flex items-center">
            <div className="h-full w-3/4 bg-slate-800 rounded-[1.5px]" />
          </div>
        </div>
      </header>

      {/* ================= 2. APP HEADER ================= */}
      <div className="relative z-20 px-4 py-2.5 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          {/* Avatar AI with Breathing Glow */}
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center text-white">
              <Sparkles size={20} className="animate-spin-slow" />
            </div>
            {/* Online status green pulse */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-[15px] font-bold text-slate-900 tracking-tight">Trợ lý EZ-Space</h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Trả lời tức thì
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-1">
          {/* New chat button */}
          <button
            onClick={() => {
              clearAiMessages();
              addToast("Đã bắt đầu phiên trò chuyện mới với AI", "info");
            }}
            title="Đoạn chat mới"
            className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Location Picker Popover */}
      <AnimatePresence>
        {showLocationPicker && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-28 right-4 left-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-40 space-y-3"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Compass size={14} className="text-blue-600" /> Vị trí hỗ trợ AI
              </span>
              <button onClick={() => setShowLocationPicker(false)} className="text-slate-400 p-1 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <button
              onClick={handleGetLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl text-xs font-bold active:scale-95 transition shadow-sm"
            >
              {isLocating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
              {isLocating ? "Đang dò GPS..." : "Lấy vị trí GPS hiện tại"}
            </button>

            <div className="text-[11px] font-semibold text-slate-400 pt-1">Hoặc chọn điểm thử nghiệm:</div>
            <div className="space-y-1.5">
              {PRESET_LOCATIONS.map((loc) => (
                <button
                  key={loc.label}
                  onClick={() => {
                    setUserLocation(loc);
                    setShowLocationPicker(false);
                    addToast(`Đã chọn vị trí: ${loc.label}`, "info");
                  }}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors",
                    userLocation?.label === loc.label
                      ? "bg-blue-50 text-blue-600 border border-blue-200"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400" />
                    {loc.label}
                  </span>
                  {userLocation?.label === loc.label && <CheckCircle2 size={14} className="text-blue-600" />}
                </button>
              ))}
            </div>

            {userLocation && (
              <button
                onClick={() => {
                  setUserLocation(null);
                  setShowLocationPicker(false);
                }}
                className="w-full text-center text-xs font-bold text-rose-500 pt-1 hover:underline"
              >
                Hủy chia sẻ vị trí
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= 3. MAIN CHAT SCROLLER ================= */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar relative z-10">
        
        {/* WELCOME / EMPTY STATE */}
        {aiMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-2 pb-4 text-center">
            {/* AI FLUID GLOWING ORB */}
            <div className="relative my-2">
              <div
                onClick={() => handleSend("Tìm bãi đỗ SUV gần Hải Châu dưới 30k")}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-400 via-blue-600 to-indigo-800 animate-orb-float animate-orb-pulse flex items-center justify-center shadow-lg relative cursor-pointer active:scale-95 transition-transform"
              >
                <Sparkles size={36} className="text-white drop-shadow-md animate-pulse" />
                <div className="absolute -inset-1.5 rounded-full border border-blue-400/30 animate-spin-slow" />
              </div>
            </div>

            <h2 className="text-[20px] font-extrabold text-slate-900 tracking-tight mt-1">
              Xin chào {user?.name.split(" ").pop() || "Minh"} 👋
            </h2>
            <p className="text-[13px] text-slate-500 font-medium max-w-[270px] mt-1 leading-relaxed">
              Mình là trợ lý đỗ xe thông minh. Cứ hỏi tự nhiên, mình sẽ tìm bãi đỗ và giữ chỗ tức thì!
            </p>

            {/* QUICK SUGGESTIONS GRID (2x2) */}
            <div className="w-full mt-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                  <Sparkles size={14} className="mr-1 text-blue-500" />
                  Gợi ý nhanh
                </span>
                <span
                  onClick={() => handleSend("Gợi ý các bãi đỗ xe tốt nhất tại Đà Nẵng")}
                  className="text-[11px] text-blue-600 font-medium cursor-pointer hover:underline"
                >
                  Xem thêm
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left">
                {/* Prompt 1 */}
                <button
                  onClick={() => handleSend("Tìm bãi đỗ SUV gần Hải Châu dưới 30k")}
                  className="p-2.5 bg-white border border-slate-200/70 hover:border-blue-400 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-left flex flex-col justify-between group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Car size={16} />
                  </div>
                  <p className="text-[12px] font-semibold text-slate-800 leading-snug group-hover:text-blue-600">
                    Tìm bãi SUV gần Hải Châu dưới 30k
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">Phổ biến nhất</span>
                </button>

                {/* Prompt 2 */}
                <button
                  onClick={() => handleSend("Bãi nào có trạm sạc xe điện EV gần đây?")}
                  className="p-2.5 bg-white border border-slate-200/70 hover:border-amber-400 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-left flex flex-col justify-between group"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Zap size={16} />
                  </div>
                  <p className="text-[12px] font-semibold text-slate-800 leading-snug group-hover:text-amber-600">
                    Bãi nào có trạm sạc xe điện EV?
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">Sạc nhanh 60kW</span>
                </button>

                {/* Prompt 3 */}
                <button
                  onClick={() => {
                    if (!userLocation) handleGetLocation();
                    handleSend("Bãi còn chỗ trống gần tôi nhất");
                  }}
                  className="p-2.5 bg-white border border-slate-200/70 hover:border-emerald-400 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-left flex flex-col justify-between group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Navigation size={16} />
                  </div>
                  <p className="text-[12px] font-semibold text-slate-800 leading-snug group-hover:text-emerald-600">
                    Bãi còn chỗ trống gần tôi nhất
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">Bán kính 1.5km</span>
                </button>

                {/* Prompt 4 */}
                <button
                  onClick={() => handleSend("Giá đỗ xe và phụ thu cuối tuần ở Cầu Rồng?")}
                  className="p-2.5 bg-white border border-slate-200/70 hover:border-purple-400 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-left flex flex-col justify-between group"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <CreditCard size={16} />
                  </div>
                  <p className="text-[12px] font-semibold text-slate-800 leading-snug group-hover:text-purple-600">
                    Giá đỗ xe cuối tuần Cầu Rồng
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">Biểu phí chi tiết</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TIME DIVIDER - Chỉ hiển thị khi đã có tin nhắn trong cuộc hội thoại */}
        {aiMessages.length > 0 && (
          <div className="flex items-center justify-center my-1 select-none">
            <span className="px-2.5 py-0.5 bg-slate-200/70 text-slate-500 rounded-full text-[10px] font-semibold tracking-wider">
              HÔM NAY
            </span>
          </div>
        )}

        {/* GPS Permission Warning Banner */}
        {gpsDenied && (
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-sm">📍</span>
              <span className="font-semibold text-[11px] leading-tight">
                Cần bật GPS để xác định vị trí hiện tại của bạn
              </span>
            </div>
            <button
              type="button"
              onClick={handleGetLocation}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-[10px] font-bold shrink-0 transition cursor-pointer"
            >
              Bật GPS
            </button>
          </div>
        )}

        {/* MESSAGE STREAM CONTAINER */}
        <div className="space-y-4">
          <AnimatePresence>
            {aiMessages.map((msg) => {
              const isUser = msg.role === "user";
              const timeStr = new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const entityChips = isUser ? extractEntityChips(msg.text) : [];

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={clsx(
                    "flex flex-col space-y-1.5",
                    isUser ? "items-end" : "items-start"
                  )}
                >
                  {isUser ? (
                    /* User Message Bubble */
                    <>
                      <div className="flex items-end justify-end space-x-1.5 max-w-[85%]">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3.5 py-2.5 rounded-2xl rounded-br-sm shadow-md shadow-blue-500/10">
                          <p className="text-[13px] font-medium leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 pr-1 text-[10px] text-slate-400 font-medium">
                        <span>{timeStr}</span>
                        <Check size={12} className="text-blue-600" />
                      </div>

                      {/* NLP Entity Chips */}
                      {entityChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end pr-0.5 mt-0.5">
                          {entityChips.map((chip, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    /* AI Message Bubble & Rich Cards */
                    <div className="flex items-start space-x-2 w-full max-w-full">
                      {/* Mini AI Avatar */}
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-[11px] shadow-sm mt-0.5">
                        ✨
                      </div>

                      <div className="flex-1 min-w-0 space-y-2.5">
                        {/* Text Bubble */}
                        <div className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm text-slate-800">
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>

                        {/* VERTICAL RICH CARDS (BÃI ĐỖ XE TƯƠNG ỨNG - TỐI ĐA 1 BÃI PHÙ HỢP NHẤT) */}
                        {msg.cards && msg.cards.length > 0 && (
                          <div className="w-full flex flex-col space-y-3 py-1">
                            {msg.cards.slice(0, 1).map((card, cIdx) => {
                              const lot = lotsList.find((l) => l.id === card.lotId) || lotsList[0];
                              const isTop = cIdx === 0;

                              let distanceText = "0.4 km • 3 phút";
                              if (userLocation && lot.latitude && lot.longitude) {
                                const dist = calculateDistance(
                                  userLocation.latitude,
                                  userLocation.longitude,
                                  lot.latitude,
                                  lot.longitude
                                );
                                distanceText = `${dist} km • ${Math.max(1, Math.round(dist * 3))} phút`;
                              }

                              const availableCount = lot.available?.total ?? 14;

                              return (
                                <div
                                  key={card.lotId + cIdx}
                                  className={clsx(
                                    "w-full bg-white rounded-2xl p-3 shadow-md relative transition-transform hover:-translate-y-0.5",
                                    isTop ? "border-2 border-blue-500 shadow-blue-500/10" : "border border-slate-200"
                                  )}
                                >
                                  {/* Badge Best Match */}
                                  {isTop && (
                                    <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center space-x-1">
                                      <span>✨ Phù hợp nhất</span>
                                    </div>
                                  )}

                                  <div className="flex items-start justify-between mt-1">
                                    <div>
                                      <h4 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-1">
                                        {lot.name}
                                      </h4>
                                      <p className="text-[11px] text-slate-500 font-medium truncate max-w-[170px]">
                                        {lot.address || `${lot.district}, Đà Nẵng`}
                                      </p>
                                    </div>
                                    <span className="text-[13px] font-extrabold text-blue-600">
                                      {lot.price.toLocaleString("vi-VN")}đ
                                      <span className="text-[10px] font-normal text-slate-400">/h</span>
                                    </span>
                                  </div>

                                  {/* Availability & Distance */}
                                  <div className="flex items-center space-x-2 my-2 text-[11px] font-semibold">
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-200 flex items-center">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                                      Còn {availableCount} ô trống
                                    </span>
                                    <span className="text-slate-500">📍 {distanceText}</span>
                                  </div>

                                  {/* Feature tags */}
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                                      ✓ Rộng 2.6m (Khớp SUV)
                                    </span>
                                    {lot.labels.slice(0, 2).map((lbl) => (
                                      <span
                                        key={lbl}
                                        className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded"
                                      >
                                        {lbl}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <Link
                                      href={`/bai/${lot.id}`}
                                      className="py-2 px-2 rounded-xl border border-blue-500 text-blue-600 font-bold text-[11px] text-center hover:bg-blue-50 active:scale-95 transition"
                                    >
                                      Xem sơ đồ
                                    </Link>
                                    <button
                                      onClick={() =>
                                        setBookingModal({
                                          lotId: lot.id,
                                          lotName: lot.name,
                                          slotCode: "A-03",
                                          deposit: 30000,
                                        })
                                      }
                                      className="py-2 px-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-[11px] text-center shadow-sm hover:shadow active:scale-95 transition flex items-center justify-center space-x-1"
                                    >
                                      <ShieldCheck size={13} />
                                      <span>Giữ chỗ</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* TYPING INDICATOR */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-start space-y-1.5"
            >
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[11px]">
                  ✨
                </div>
                <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce-dot1" />
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce-dot2" />
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce-dot3" />
                </div>
              </div>
              <p className="text-[11px] text-blue-600 font-semibold pl-9 animate-pulse">
                {typingStatus}
              </p>
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>
      </main>

      {/* ================= 4. INPUT BAR SECTION ================= */}
      <div className="relative z-20 px-3 py-2 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] shrink-0">
        
        {/* Smart Prompt Chips Bar */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pb-1.5">
          {[
            { label: "Trạm sạc EV", icon: "⚡", query: "Bãi nào có trạm sạc xe điện EV gần đây?" },
            { label: "Gần Hải Châu", icon: "📍", query: "Tìm bãi đỗ xe gần khu vực Hải Châu" },
            { label: "Có mái che", icon: "☂️", query: "Tìm bãi đỗ có mái che an toàn" },
            { label: "Gửi qua đêm", icon: "🌙", query: "Biểu phí gửi xe ô tô qua đêm như thế nào?" },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSend(chip.query)}
              className="flex-shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-full text-[11px] font-semibold border border-slate-200/70 transition-all active:scale-95 flex items-center gap-1"
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Chat Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <div className="relative flex-1 flex items-center">
            {/* Mic button */}
            <button
              type="button"
              onClick={handleSpeech}
              title="Nhập bằng giọng nói"
              className={clsx(
                "absolute left-2.5 p-1 rounded-full active:scale-90 transition-transform",
                hasSpeech ? "text-slate-400 hover:text-blue-600" : "text-slate-300"
              )}
            >
              <Mic size={16} />
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn tin với AI để tìm bãi đỗ..."
              className="w-full h-11 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-[14px] text-[13px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
              autoComplete="off"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-11 h-11 rounded-[14px] bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 active:scale-95 hover:opacity-95 transition-all flex-shrink-0 disabled:opacity-50 disabled:bg-slate-300 cursor-pointer disabled:cursor-not-allowed"
            title="Gửi tin nhắn"
          >
            <Send size={17} className="-translate-x-[1px] translate-y-[1px]" />
          </button>
        </form>
      </div>

      {/* ================= 5. QUICK BOOKING CONFIRMATION MODAL ================= */}
      <AnimatePresence>
        {bookingModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end justify-center">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="w-full max-w-[400px] bg-white rounded-t-[28px] p-5 shadow-2xl border-t border-slate-200 pb-8"
            >
              {/* Drag bar */}
              <div
                className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4 cursor-pointer"
                onClick={() => setBookingModal(null)}
              />

              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-full">
                    XÁC NHẬN QUA TRỢ LÝ AI
                  </span>
                  <h3 className="text-[18px] font-extrabold text-slate-900 mt-1">{bookingModal.lotName}</h3>
                  <p className="text-[12px] text-slate-500 font-medium">Bãi A • Vị trí khuyến nghị tối ưu nhất</p>
                </div>
                <button
                  onClick={() => setBookingModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* Chi tiết ô & tiền cọc */}
              <div className="my-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500 font-medium">Vị trí ô gợi ý:</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Ô {bookingModal.slotCode}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500 font-medium">Xe đăng ký:</span>
                  <span className="font-bold text-slate-800">
                    {activeVehicle.plate} ({activeVehicle.type})
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500 font-medium">Thời gian giữ chỗ:</span>
                  <span className="font-bold text-amber-600 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                    10 phút đếm ngược
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-700 font-bold text-[14px]">Tiền cọc giữ chỗ:</span>
                  <span className="text-[17px] font-extrabold text-blue-600">
                    {bookingModal.deposit.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-medium text-center mb-4">
                🛡️ Khoản cọc sẽ được hoàn lại hoặc trừ thẳng vào tiền đỗ xe thực tế của bạn.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setBookingModal(null)}
                  className="py-3 rounded-xl border border-slate-300 font-bold text-[13px] text-slate-700 active:scale-95 transition"
                >
                  Để sau
                </button>
                <button
                  onClick={handleConfirmBooking}
                  className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-[13px] text-white shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center justify-center space-x-1.5"
                >
                  <ShieldCheck size={16} />
                  <span>Giữ chỗ 10 phút</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <AIContent />
    </Suspense>
  );
}
