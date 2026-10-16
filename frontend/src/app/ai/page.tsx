"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, AIMessage } from "@/store";
import { lots } from "@/lib/mock/lots";
import { getFallbackResponse, calculateDistance } from "@/lib/ai/fallback";
import { 
  ChevronLeft, RefreshCw, Sparkles, Send, Mic, MapPin, 
  CheckCircle2, MoreHorizontal, Navigation, X, Loader2, Compass 
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

const PRESET_LOCATIONS = [
  { label: "Chân Cầu Rồng (Sơn Trà)", latitude: 16.0610, longitude: 108.2270 },
  { label: "15 Lê Duẩn (Hải Châu)", latitude: 16.0718, longitude: 108.2222 },
  { label: "Sân bay Đà Nẵng (Ga T1)", latitude: 16.0538, longitude: 108.1995 },
];

export default function AIPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, aiMessages, addAiMessage, clearAiMessages } = useStore();
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [hasSpeech, setHasSpeech] = useState(false);
  
  // Trạng thái vị trí người dùng
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; label?: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tự động định vị GPS khi người dùng mở trang AI lần đầu (nếu được hỗ trợ)
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            label: "GPS của bạn",
          });
        },
        () => {
          // Người dùng từ chối cấp quyền hoặc lỗi, giữ null
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, isTyping, input]);

  // Initial query from home page "Ask AI" button
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
      setInput(input + " " + e.results[0][0].transcript);
    };
  };

  // Hàm kích hoạt định vị GPS thực tế
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "GPS của bạn",
        });
        setIsLocating(false);
        setShowLocationPicker(false);
      },
      (err) => {
        console.warn("Lỗi lấy GPS:", err);
        setIsLocating(false);
        // Hiển thị chọn điểm mẫu tại Đà Nẵng nếu không bật được GPS
        setShowLocationPicker(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSend = async (text: string = input, locationOverride?: typeof userLocation) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const activeLoc = locationOverride !== undefined ? locationOverride : userLocation;

    // Add User Message
    const userMsg: AIMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed, timestamp: Date.now() };
    addAiMessage(userMsg);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: trimmed,
          userLocation: activeLoc ? { latitude: activeLoc.latitude, longitude: activeLoc.longitude } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch AI response");
      }

      const res = await response.json();
      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: res.text,
        cards: res.cards,
        chips: res.chips,
        timestamp: Date.now()
      };
      setStreamingId(aiMsg.id);
      addAiMessage(aiMsg);
    } catch (err) {
      console.warn("Using fallback response due to API error:", err);
      const res = getFallbackResponse(
        trimmed, 
        activeLoc ? { latitude: activeLoc.latitude, longitude: activeLoc.longitude } : undefined
      );
      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: res.text,
        cards: res.cards,
        chips: res.chips,
        timestamp: Date.now()
      };
      setStreamingId(aiMsg.id);
      addAiMessage(aiMsg);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    if (confirm("Bạn có chắc muốn xóa lịch sử trò chuyện không?")) {
      clearAiMessages();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 500) setInput(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + "px";
    }
  };

  const formatTime = (ts: number) => {
    return `Hôm nay, ${new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="bg-[#F7F8FC] flex flex-col h-full relative">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={handleClear} title="Xóa lịch sử trò chuyện" className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-400 active:scale-95">
          <RefreshCw size={20} />
        </button>
        <div className="text-center flex-1 flex flex-col items-center">
          <h1 className="text-[17px] font-bold text-slate-900 flex items-center gap-1">Trợ lý EZ-Space <Sparkles size={16} className="text-amber-500 fill-amber-500" /></h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trực tuyến</span>
          </div>
        </div>
        <button 
          onClick={() => setShowLocationPicker(!showLocationPicker)}
          title="Chọn vị trí hiện tại"
          className={clsx(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95",
            userLocation ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500"
          )}
        >
          <MapPin size={18} className={userLocation ? "fill-emerald-600" : ""} />
        </button>
      </div>

      {/* Modal / Dropdown chọn vị trí mẫu */}
      <AnimatePresence>
        {showLocationPicker && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 right-3 left-3 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-40 space-y-3"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Compass size={14} className="text-[#2B4BD1]" /> Vị trí của bạn
              </span>
              <button onClick={() => setShowLocationPicker(false)} className="text-slate-400 p-1">
                <X size={16} />
              </button>
            </div>

            <button 
              onClick={handleGetLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 bg-[#2B4BD1] text-white py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-transform shadow-sm"
            >
              {isLocating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
              {isLocating ? "Đang dò GPS..." : "Lấy vị trí GPS hiện tại"}
            </button>

            <div className="text-[11px] font-semibold text-slate-400 pt-1">Hoặc chọn điểm thử nghiệm tại Đà Nẵng:</div>
            <div className="space-y-1.5">
              {PRESET_LOCATIONS.map((loc) => (
                <button
                  key={loc.label}
                  onClick={() => {
                    setUserLocation(loc);
                    setShowLocationPicker(false);
                  }}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors",
                    userLocation?.label === loc.label ? "bg-blue-50 text-[#2B4BD1] border border-blue-200" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400" />
                    {loc.label}
                  </span>
                  {userLocation?.label === loc.label && <CheckCircle2 size={14} className="text-[#2B4BD1]" />}
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

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
        {aiMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center mt-12">
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }} 
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-20 h-20 bg-blue-50 text-[#2B4BD1] rounded-full flex items-center justify-center mb-6 relative"
            >
              <Sparkles size={32} />
              <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-[#F7F8FC] rounded-full"></div>
            </motion.div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Chào {user?.name.split(" ").pop() || "bạn"}, bạn muốn tìm chỗ đỗ thế nào?</h2>
            <p className="text-sm font-medium text-slate-500 mb-2 max-w-[260px]">Hỏi tôi về bãi gần nhất, chỗ trống, giá vé hay chỗ sạc EV.</p>
          </div>
        ) : (
          <AnimatePresence>
            {aiMessages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={clsx("flex flex-col max-w-[85%]", msg.role === "user" ? "self-end items-end" : "self-start items-start")}
              >
                <div className={clsx("flex items-end gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  {msg.role === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-[#2B4BD1] text-white flex items-center justify-center shrink-0 mb-1">
                      <Sparkles size={14} />
                    </div>
                  )}
                  <div className={clsx("p-4 rounded-[20px] shadow-sm", msg.role === "user" ? "bg-[#2B4BD1] text-white rounded-br-sm" : "bg-white text-slate-800 rounded-bl-sm border border-slate-100")}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                      {msg.role === "ai" && streamingId === msg.id ? (
                        <StreamingText text={msg.text} onComplete={() => setStreamingId(null)} />
                      ) : (
                        msg.text
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-1.5 px-1">{formatTime(msg.timestamp)}</div>

                {/* AI Cards & Chips */}
                {msg.role === "ai" && (
                  <div className="mt-3 w-[85vw] max-w-[340px] pl-10 space-y-3">
                    {msg.cards?.map(card => {
                      const lot = lots.find(l => l.id === card.lotId);
                      if (!lot) return null;

                      // Tính khoảng cách hiển thị trực tiếp nếu có vị trí
                      let distanceText = "";
                      if (userLocation && lot.latitude && lot.longitude) {
                        const dist = calculateDistance(userLocation.latitude, userLocation.longitude, lot.latitude, lot.longitude);
                        distanceText = ` • Cách ~${dist} km`;
                      }

                      return (
                        <div key={card.lotId} className="bg-white border border-slate-100 rounded-[20px] p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {lot.available.total} ô trống
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 truncate max-w-[55%] text-right">{lot.district}{distanceText}</div>
                          </div>
                          <h3 className="font-black text-slate-900 text-base mb-1">{lot.name}</h3>
                          <div className="text-xs text-slate-500 mb-2">{lot.address}</div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {lot.labels.map(l => <span key={l} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{l}</span>)}
                          </div>
                          <p className="text-xs font-medium text-[#2B4BD1] bg-blue-50 px-3 py-2 rounded-xl mb-3 border border-blue-100">{card.reason}</p>
                          <div className="flex justify-between items-center mb-4">
                            <div><span className="font-black text-slate-900">{lot.price.toLocaleString("vi-VN")} ₫</span><span className="text-xs text-slate-500">/giờ</span></div>
                            <div className="text-xs font-bold text-slate-500">Cọc 50.000 ₫</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => router.push(`/bai/${lot.id}${card.tab ? `?tab=${card.tab}` : ""}`)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform">Xem sơ đồ</button>
                            <button onClick={() => router.push(`/bai/${lot.id}${card.tab ? `?tab=${card.tab}` : ""}`)} className="flex-1 bg-[#2B4BD1] text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform shadow-lg shadow-[#2B4BD1]/30">Giữ chỗ</button>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isTyping && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2 self-start">
            <div className="w-8 h-8 rounded-full bg-[#2B4BD1] text-white flex items-center justify-center shrink-0 mb-1">
              <Sparkles size={14} />
            </div>
            <div className="bg-white p-4 rounded-[20px] rounded-bl-sm border border-slate-100 shadow-sm flex gap-1">
              <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-slate-300 rounded-full"></motion.span>
              <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-slate-300 rounded-full"></motion.span>
              <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-slate-300 rounded-full"></motion.span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-100 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shrink-0 z-30 space-y-2.5">
        
        {/* Thanh trạng thái vị trí */}
        {userLocation && (
          <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium truncate">
              <MapPin size={13} className="text-emerald-600 shrink-0 fill-emerald-600" />
              <span>Định vị: <strong className="font-bold">{userLocation.label || "GPS hiện tại"}</strong></span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowLocationPicker(true)} className="text-[#2B4BD1] font-bold text-[11px] hover:underline">
                Đổi
              </button>
              <button onClick={() => setUserLocation(null)} title="Hủy định vị" className="text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {aiMessages.length === 0 && (
          <div className="flex gap-2 overflow-x-auto w-full no-scrollbar pb-0.5">
            {["Tìm chỗ rẻ nhất gần tôi", "Còn chỗ SUV không?", "Bãi nào có sạc EV?", "Giờ nào bãi vắng nhất?"].map((chip) => (
              <button 
                key={chip} 
                onClick={() => {
                  if (chip.includes("gần") && !userLocation) {
                    handleGetLocation();
                  }
                  handleSend(chip);
                }} 
                className="shrink-0 bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-full text-xs font-bold shadow-xs active:scale-95 transition-all hover:bg-slate-100 hover:border-slate-300"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 bg-slate-50 border border-slate-200 rounded-[24px] p-1.5 pr-2 focus-within:border-[#2B4BD1] focus-within:ring-1 focus-within:ring-[#2B4BD1] transition-all">
          <button 
            onClick={() => setShowLocationPicker(!showLocationPicker)}
            title="Định vị vị trí hiện tại"
            className={clsx(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all mb-0.5",
              userLocation ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500 hover:text-[#2B4BD1] border border-slate-200"
            )}
          >
            {isLocating ? <Loader2 size={16} className="animate-spin text-[#2B4BD1]" /> : <MapPin size={17} className={userLocation ? "fill-emerald-700" : ""} />}
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            placeholder={userLocation ? "Hỏi tìm bãi gần tôi, giá, chỗ trống..." : "Hỏi gì đó đi (hoặc bật định vị)..."}
            className="flex-1 max-h-[100px] bg-transparent resize-none outline-none text-slate-900 text-[15px] font-medium placeholder:text-slate-400 p-2 no-scrollbar"
            rows={1}
          />
          
          {hasSpeech && input.length === 0 && (
            <button onClick={handleSpeech} className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 active:scale-95 transition-transform mb-0.5">
              <Mic size={18} />
            </button>
          )}

          <button 
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full bg-[#2B4BD1] text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-50 disabled:bg-slate-300 mb-0.5"
          >
            <Send size={16} className="translate-x-[-1px] translate-y-[1px]" />
          </button>
        </div>
        <div className="text-center mt-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trợ lý có thể sai, hãy kiểm tra trước khi đặt chỗ</p>
        </div>
      </div>
    </div>
  );
}

const StreamingText = ({ text, onComplete }: { text: string, onComplete: () => void }) => {
  const [display, setDisplay] = useState("");
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplay(text.substring(0, i));
      i++;
      if (i > text.length) {
        clearInterval(interval);
        onComplete();
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return <span>{display}</span>;
};
