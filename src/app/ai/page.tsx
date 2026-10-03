"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, AIMessage } from "@/store";
import { lots } from "@/lib/mock/lots";
import { getFallbackResponse } from "@/lib/ai/fallback";
import { ChevronLeft, RefreshCw, Sparkles, Send, Mic, MapPin, CheckCircle2, MoreHorizontal } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export default function AIPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, aiMessages, addAiMessage, clearAiMessages } = useStore();
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [hasSpeech, setHasSpeech] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, isTyping, input]);

  // Initial query from home page "Ask AI" button
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setInput(q);
      // Remove query param without reloading
      window.history.replaceState({}, "", "/ai");
      // Optional: Auto submit? The prompt says "gửi sẵn", let's auto send.
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

  const handleSend = (text: string = input) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Add User Message
    const userMsg: AIMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed, timestamp: Date.now() };
    addAiMessage(userMsg);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setIsTyping(true);

    // Mock AI Processing Delay
    setTimeout(() => {
      setIsTyping(false);
      const res = getFallbackResponse(trimmed);
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
    }, 600);
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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + "px"; // max ~4 lines
    }
  };

  const formatTime = (ts: number) => {
    return `Hôm nay, ${new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="bg-[#F7F8FC] flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={handleClear} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-400 active:scale-95">
          <RefreshCw size={20} />
        </button>
        <div className="text-center flex-1 flex flex-col items-center">
          <h1 className="text-[17px] font-bold text-slate-900 flex items-center gap-1">Trợ lý EZ-Space <Sparkles size={16} className="text-amber-500 fill-amber-500" /></h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trực tuyến</span>
          </div>
        </div>
        <div className="w-10" />
      </div>

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
            <p className="text-sm font-medium text-slate-500 mb-8 max-w-[260px]">Hỏi tôi về chỗ trống, giá, chỗ sạc EV hay giờ vắng.</p>
            
            <div className="flex gap-2 overflow-x-auto w-full no-scrollbar pb-4 px-2">
              {["Tìm chỗ rẻ nhất gần tôi", "Còn chỗ SUV không?", "Bãi nào có sạc EV?", "Giờ nào bãi vắng nhất?"].map((chip) => (
                <button key={chip} onClick={() => handleSend(chip)} className="shrink-0 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-full text-sm font-bold shadow-sm active:scale-95 transition-transform">
                  {chip}
                </button>
              ))}
            </div>
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
                      return (
                        <div key={card.lotId} className="bg-white border border-slate-100 rounded-[20px] p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {lot.available.total} ô trống
                            </div>
                            <div className="text-xs font-bold text-slate-500">{lot.distance.toString().replace(".", ",")} km • {Math.round(lot.distance * 3)} phút</div>
                          </div>
                          <h3 className="font-black text-slate-900 text-base mb-1">{lot.name}</h3>
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
                    
                    {msg.chips && (
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pt-2 pb-1">
                        {msg.chips.map(chip => (
                          <button key={chip} onClick={() => handleSend(chip)} className="shrink-0 bg-white border border-[#2B4BD1]/30 text-[#2B4BD1] px-4 py-2 rounded-full text-sm font-bold active:scale-95 transition-transform shadow-sm">
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
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
      <div className="bg-white border-t border-slate-100 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shrink-0 z-30">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-[24px] p-2 pr-2.5 focus-within:border-[#2B4BD1] focus-within:ring-1 focus-within:ring-[#2B4BD1] transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            placeholder="Hỏi gì đó đi..."
            className="flex-1 max-h-[100px] bg-transparent resize-none outline-none text-slate-900 text-[15px] font-medium placeholder:text-slate-400 p-2.5 no-scrollbar"
            rows={1}
          />
          {hasSpeech && input.length === 0 && (
            <button onClick={handleSpeech} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 active:scale-95 transition-transform mb-0.5">
              <Mic size={20} />
            </button>
          )}
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-[#2B4BD1] text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-50 disabled:bg-slate-300 mb-0.5"
          >
            <Send size={18} className="ml-1" />
          </button>
        </div>
        <div className="text-center mt-3">
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
