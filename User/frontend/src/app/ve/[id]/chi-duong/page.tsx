"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BatteryFull, CheckCircle2, ChevronDown, ChevronUp,
  CircleHelp, Copy, ExternalLink, Info, LocateFixed, MapPin,
  Navigation, Phone, QrCode, Signal, Wifi, X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStore } from "@/store";
import { getLotByAnyId } from "@/lib/mock/lots";

// CÁCH DÙNG:
// 1. Tạo frontend/.env.local và đặt NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=API_KEY_CUA_BAN
// 2. Bật Maps Embed API trên Google Cloud, giới hạn key cho website localhost:3000.
// 3. Khởi động lại npm run dev.
// Có key: Google Maps thật trong iframe; sau khi cấp GPS, Google Maps vẽ đường xe ô tô.
// Chưa có key: vẫn xem thử vị trí bãi qua URL Google Maps công khai (không đảm bảo hỗ trợ lâu dài),
// nhưng KHÔNG có tuyến đường trong iframe. Nút "Mở Google Maps" vẫn dẫn đường thật.
const MAPS_EMBED_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim() || "";
const ARRIVAL_WINDOW_SEC = 20 * 60;

type Point = { lat: number; lng: number };
type Dialog = "ticket" | "maps" | "help" | "call" | null;
const clock = (ms: number) => new Date(ms).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const countdown = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const haversine = (a: Point, b: Point) => {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export default function DirectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const activeBooking = useStore((s) => s.activeBooking);
  const history = useStore((s) => s.history);
  const addToast = useStore((s) => s.addToast);
  const booking = activeBooking?.id === id ? activeBooking : history.find((b) => b.id === id);
  const lot = getLotByAnyId(booking?.lotId);
  const ticketHref = `/ve/${encodeURIComponent(id)}`;
  const [now, setNow] = useState(() => Date.now());
  const [point, setPoint] = useState<Point | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState<Dialog>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const destination = useMemo(() => ({ lat: lot.latitude, lng: lot.longitude }), [lot.latitude, lot.longitude]);
  const latlng = `${destination.lat},${destination.lng}`;
  const googleUrl = useMemo(() => {
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", latlng);
    url.searchParams.set("travelmode", "driving");
    url.searchParams.set("dir_action", "navigate");
    if (point) url.searchParams.set("origin", `${point.lat},${point.lng}`);
    return url.toString();
  }, [latlng, point]);

  // Bản đồ của GOOGLE, không tự vẽ SVG / không dùng OpenStreetMap hay OSRM.
  // Google Embed API key dùng cho cả hiển thị địa điểm và đường lái xe.
  const googleEmbedUrl = useMemo(() => {
    if (!MAPS_EMBED_KEY) {
      // Cách nhúng Google Maps cũ, chỉ dùng để xem địa điểm khi chưa cấu hình API key.
      // Đây không phải Maps Embed API chính thức và không bảo đảm luôn dùng được.
      return `https://maps.google.com/maps?q=${encodeURIComponent(latlng)}&z=16&output=embed`;
    }
    const mode = point ? "directions" : "place";
    const url = new URL(`https://www.google.com/maps/embed/v1/${mode}`);
    url.searchParams.set("key", MAPS_EMBED_KEY);
    url.searchParams.set("language", "vi");
    url.searchParams.set("region", "VN");
    if (point) {
      url.searchParams.set("origin", `${point.lat},${point.lng}`);
      url.searchParams.set("destination", latlng);
      url.searchParams.set("mode", "driving");
      url.searchParams.set("units", "metric");
    } else {
      url.searchParams.set("q", latlng);
      url.searchParams.set("zoom", "16");
      url.searchParams.set("maptype", mapType);
    }
    return url.toString();
  }, [latlng, point, mapType]);

  const locate = () => {
    if (!navigator.geolocation) {
      addToast("Trình duyệt không hỗ trợ vị trí GPS", "error");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setPoint(next);
        setGpsBusy(false);
        setMapLoaded(false);
        if (MAPS_EMBED_KEY) {
          addToast("Đã lấy GPS; Google Maps đang tải tuyến đường ô tô", "success");
        } else {
          addToast("Đã lấy GPS; cần Maps Embed API key để vẽ tuyến trong trang", "info");
        }
      },
      (error) => {
        setGpsBusy(false);
        addToast(error.code === 1 ? "Bạn chưa cấp quyền vị trí cho trình duyệt" : "Không lấy được GPS; có thể mở Google Maps để chỉ đường", "error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const openGoogleMaps = () => {
    setModal(null);
    window.open(googleUrl, "_blank", "noopener,noreferrer");
  };
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); addToast("Đã sao chép", "success"); }
    catch { addToast("Không sao chép được", "error"); }
  };

  if (!booking) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center gap-4">
      <MapPin size={44} className="text-slate-400" />
      <h1 className="text-lg font-bold">Không tìm thấy lượt đặt chỗ</h1>
      <button onClick={() => router.push("/lich-su")} className="rounded-xl bg-blue-600 text-white font-semibold px-5 py-3">Xem lịch sử</button>
    </div>
  );

  const expiry = booking.arrivalExpiresAt || now;
  const remaining = booking.arrivalExpiresAt ? Math.max(0, Math.ceil((expiry - now) / 1000)) : 0;
  const percentage = Math.min(1, remaining / ARRIVAL_WINDOW_SEC);
  const paid = booking.status === "paid" && remaining > 0;
  const status = booking.status === "entered" ? "ĐÃ VÀO BÃI" : paid ? "ĐÃ ĐẶT CỌC" : "HẾT HIỆU LỰC";
  const straightKm = point ? haversine(point, destination) : null;
  const questions = [
    ["Đã định vị nhưng chưa hiện đường?", "Cần bật Maps Embed API và cấu hình NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY để Google Maps hiển thị tuyến xe ô tô ngay trong trang. Nếu chưa có, nhấn Mở Google Maps."],
    ["Tôi đến trễ thì sao?", "Lượt giữ chỗ có thời hạn theo dữ liệu của ứng dụng. Khi quá hạn, vui lòng kiểm tra lại trạng thái vé."],
    ["Xem vé QR ở đâu?", "Nhấn nút Xem vé ở phía trên để mở vé của đúng lượt đặt chỗ."],
  ] as const;

  return (
    <div className="min-h-[100dvh] bg-[#f0f4f8] flex items-center justify-center p-0 md:p-6 font-sans text-[#171c1f]">
      <div className="w-full md:max-w-[390px] h-[100dvh] md:h-[844px] relative flex flex-col overflow-hidden bg-white md:rounded-[46px] md:shadow-[0_25px_60px_-15px_rgba(15,23,42,.35),0_0_0_8px_#1e293b]">
        {/* Google Maps chính thức (khi có key) hoặc bản đồ Google vị trí kiểu nhúng cũ. */}
        <div className="absolute inset-0 bg-[#e5ebf2]">
          {!mapLoaded && <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">Đang tải bản đồ Google Maps...</div>}
          <iframe
            key={googleEmbedUrl}
            src={googleEmbedUrl}
            title={point && MAPS_EMBED_KEY ? "Google Maps chỉ đường ô tô đến bãi" : "Bản đồ Google Maps vị trí bãi đỗ"}
            className="absolute inset-0 w-full h-full border-0"
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => setMapLoaded(true)}
          />
        </div>

        {/* Phần đầu điện thoại và các thẻ nổi được giữ giống ảnh mẫu. */}
        <div className="absolute top-0 inset-x-0 h-11 z-20 px-7 flex items-center justify-between text-[11px] font-bold pointer-events-none bg-gradient-to-b from-white/70 to-transparent">
          <span>{clock(now)}</span>
          <span className="w-28 h-7 bg-black rounded-full flex items-center justify-end pr-3 gap-1"><span className="w-2 h-2 rounded-full bg-emerald-700"/><span className="w-2 h-2 rounded-full bg-slate-700"/></span>
          <span className="flex items-center gap-1"><Signal size={14}/><Wifi size={14}/><BatteryFull size={17}/></span>
        </div>

        <div className="absolute z-20 top-12 left-3 right-3 space-y-2.5 pointer-events-none">
          <header className="bg-white/95 backdrop-blur rounded-2xl px-3.5 py-2.5 shadow-lg flex items-center justify-between gap-2 pointer-events-auto">
            <button type="button" aria-label="Quay lại vé" className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full shrink-0" onClick={() => router.push(ticketHref)}><ArrowLeft size={18}/></button>
            <div className="min-w-0 text-center"><h1 className="text-[15px] font-extrabold">Dẫn đường đến bãi</h1><p className="text-[11px] text-slate-500 truncate">{lot.name} • Ô {booking.spotId}</p></div>
            <button type="button" aria-label="Trợ giúp" className="w-9 h-9 shrink-0 flex items-center justify-center bg-slate-100 rounded-full" onClick={() => setModal("help")}><CircleHelp size={19}/></button>
          </header>
          <div className="bg-white/95 backdrop-blur rounded-2xl px-3 py-3 shadow-lg flex items-center gap-2 pointer-events-auto">
            <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="w-11 h-11 -rotate-90"><circle cx="24" cy="24" r="18" fill="none" stroke="#e2e8f0" strokeWidth="3.5"/><circle cx="24" cy="24" r="18" fill="none" stroke={remaining < 60 ? "#ef4444" : remaining < 180 ? "#f59e0b" : "#2563eb"} strokeWidth="3.5" strokeDasharray="113.1" strokeDashoffset={113.1 * (1 - percentage)} strokeLinecap="round" /></svg>
              <span className="absolute text-[9px] font-bold">{countdown(remaining)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex gap-1.5 items-center"><span className={`shrink-0 text-[9px] rounded px-1.5 py-1 font-bold ${paid ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-700"}`}>{status}</span><span className="truncate text-[11px] text-slate-500">Đến trước {booking.arrivalExpiresAt ? clock(expiry) : "—"}</span></div>
              <p className="text-[12px] font-extrabold truncate mt-1">{point && MAPS_EMBED_KEY ? "Google Maps: tuyến xe ô tô" : "Google Maps · vị trí bãi xe"}</p>
            </div>
            <button type="button" onClick={() => setModal("ticket")} className="shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-xl text-blue-700 bg-blue-50 font-bold text-[11px]"><QrCode size={15}/> Xem vé</button>
          </div>
          {!MAPS_EMBED_KEY && <div className="bg-white/95 rounded-xl px-3 py-2 shadow text-[10px] text-slate-700 flex gap-2 items-start pointer-events-auto"><Info size={15} className="shrink-0 text-blue-600"/><span>Đang xem bản đồ Google Maps. Muốn <strong>hiện đường đi ngay trong khung này</strong>, cần cấu hình Maps Embed API key. Bạn vẫn có thể bấm “Mở Google Maps” để chỉ đường.</span></div>}
        </div>

        <div className="absolute z-20 right-3 top-[222px] flex flex-col gap-2 pointer-events-auto">
          <button type="button" title="Lấy vị trí GPS" aria-label="Lấy vị trí GPS" onClick={locate} disabled={gpsBusy} className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600 disabled:opacity-60"><LocateFixed size={20}/></button>
          {Boolean(MAPS_EMBED_KEY) && !point && <button type="button" title="Chuyển chế độ bản đồ Google" aria-label="Chuyển kiểu bản đồ" onClick={() => { setMapType((v) => v === "roadmap" ? "satellite" : "roadmap"); setMapLoaded(false); }} className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-700 text-[10px] font-extrabold">{mapType === "roadmap" ? "Vệ tinh" : "Bản đồ"}</button>}
        </div>

        <div className={`absolute inset-x-0 bottom-0 z-20 rounded-t-[30px] bg-white shadow-[0_-12px_35px_rgba(15,23,42,.18)] flex flex-col transition-[height] duration-300 ${expanded ? "h-[72%]" : "h-[244px]"}`}>
          <button type="button" aria-label={expanded ? "Thu gọn thông tin" : "Mở rộng thông tin"} onClick={() => setExpanded((v) => !v)} className="w-full flex justify-center pt-3 pb-2"><span className="w-12 h-1.5 bg-slate-300 rounded-full"/></button>
          <div className="px-5 pb-3 shrink-0">
            <button type="button" className="w-full flex items-center gap-2.5 text-left mb-3" onClick={() => setExpanded((v) => !v)}>
              <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 flex items-center justify-center"><MapPin size={20}/></div>
              <div className="flex-1 min-w-0"><h2 className="text-[15px] font-extrabold truncate">{lot.name}</h2><p className="text-[11px] text-slate-500 truncate">{lot.address}</p></div>
              <div className="text-blue-700 text-[11px] font-bold flex items-center gap-1">{expanded ? "Thu gọn" : "Chi tiết"}{expanded ? <ChevronDown size={17}/> : <ChevronUp size={17}/>}</div>
            </button>
            <button type="button" onClick={openGoogleMaps} className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-[14px] shadow-md"><ExternalLink size={19}/> Mở Google Maps</button>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button type="button" onClick={locate} disabled={gpsBusy} className="h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center gap-1.5 font-bold text-xs disabled:opacity-60"><Navigation size={16}/>{gpsBusy ? "Đang lấy GPS" : point ? "Cập nhật GPS" : "Lấy GPS & tìm đường"}</button>
              <button type="button" onClick={() => setModal("call")} className="h-10 rounded-xl bg-slate-100 flex items-center justify-center gap-1.5 text-slate-700 font-bold text-xs"><Phone size={16}/> Liên hệ bãi</button>
            </div>
          </div>
          {expanded && <div className="min-h-0 overflow-y-auto px-5 pb-12 pt-2 space-y-4 text-xs">
            <section className="bg-slate-50 p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center"><h3 className="text-[10px] text-slate-500 font-extrabold uppercase">Vị trí giữ chỗ của bạn</h3><span className="bg-amber-100 text-amber-900 px-2 py-1 rounded-full font-extrabold">Ô {booking.spotId}</span></div>
              <div className="bg-white rounded-xl p-3 grid grid-cols-2 gap-2 text-center"><div><span className="block text-[10px] text-slate-500">Khoảng cách đường thẳng</span><strong className="text-sm">{straightKm === null ? "—" : `${straightKm.toFixed(2)} km`}</strong></div><div><span className="block text-[10px] text-slate-500">Hạn check-in</span><strong className="text-sm text-blue-600">{booking.arrivalExpiresAt ? clock(expiry) : "—"}</strong></div></div>
              <p className="bg-blue-50 p-3 rounded-xl text-slate-700 leading-relaxed"><Info size={15} className="text-blue-600 inline mr-1"/> Bản đồ và tuyến đường hiển thị bởi Google Maps, không phải sơ đồ vẽ tay. Thời gian đi đường và quãng đường ô tô (khi đã bật Maps Embed API và cấp GPS) được Google Maps hiển thị ngay trong bản đồ; ứng dụng không tự lấy được chúng từ iframe. Nếu chưa có key, mở Google Maps để xem đường đi thực tế.</p>
              <button type="button" onClick={() => copy(latlng)} className="flex w-full justify-between items-center gap-2 text-slate-500"><span>Tọa độ bãi</span><strong className="font-mono text-slate-800 flex items-center gap-1">{destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}<Copy size={14}/></strong></button>
            </section>
            <div className="space-y-2"><h3 className="uppercase text-[10px] tracking-wider text-slate-500 font-bold">Hỗ trợ và câu hỏi</h3>{questions.map(([question, answer], index) => <div key={question} className="border-b border-slate-100"><button type="button" className="w-full py-3 flex items-center justify-between gap-2 text-left font-bold" onClick={() => setFaqOpen(faqOpen === index ? null : index)}>{question}<ChevronDown size={16}/></button>{faqOpen === index && <p className="pb-3 text-[11px] leading-relaxed text-slate-500">{answer}</p>}</div>)}</div>
          </div>}
        </div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-800 rounded-full z-30 pointer-events-none"/>

        {modal && <div className="absolute inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] flex items-end" onClick={() => setModal(null)}>
          <div className="w-full bg-white rounded-t-[30px] p-5 pb-8 space-y-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-2"><h2 className="font-extrabold text-[17px]">{modal === "ticket" ? "Vé QR vào bãi" : modal === "maps" ? "Google Maps" : modal === "call" ? "Liên hệ bãi" : "Trợ giúp"}</h2><button type="button" onClick={() => setModal(null)} aria-label="Đóng"><X size={21}/></button></div>
            {modal === "ticket" && <><div className="flex flex-col items-center gap-2 bg-slate-50 rounded-2xl p-4"><QRCodeSVG value={String(booking.id)} size={170}/><b className="font-mono text-xs break-all">{booking.id}</b></div><p className="text-xs">Ô đỗ: <strong>{booking.spotId}</strong> · {status}</p><button className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold" onClick={() => router.push(ticketHref)}>Xem vé QR đầy đủ</button></>}
            {modal === "maps" && <button className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold" onClick={openGoogleMaps}>Mở Google Maps</button>}
            {modal === "call" && <p className="text-xs text-slate-600">Chưa có số hotline đã xác minh của <strong>{lot.name}</strong> trong dữ liệu mẫu. Vui lòng liên hệ trực tiếp nhân viên bãi.</p>}
            {modal === "help" && <><p className="text-xs text-slate-600">Địa chỉ bãi đỗ: <strong>{lot.address}</strong>.</p><p className="text-xs text-slate-600">Bấm GPS để xem đường trong bản đồ Google khi đã cấu hình Maps Embed API key, hoặc nhấn Mở Google Maps để dẫn đường ngay.</p></>}
            <button type="button" className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold" onClick={() => setModal(null)}>Đóng</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
