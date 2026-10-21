"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown, CircleHelp, Clock3, Compass, ExternalLink, Info, LocateFixed, MapPin, Navigation2, QrCode, RefreshCw, ShieldCheck, Ticket, X, ZoomIn, ZoomOut } from "lucide-react";
import { getLotByIdApi } from "@/lib/api";
import { lots } from "@/lib/mock/lots";
import { useStore } from "@/store";

const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function NavigationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const active = useStore((s) => s.activeBooking);
  const history = useStore((s) => s.history);
  const vehicles = useStore((s) => s.vehicles);
  const booking = active?.id === id ? active : history.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const fallback = lots.find((l) => l.id === booking?.lotId) || lots[0];
  const [destination, setDestination] = useState({ name: fallback.name, address: fallback.address, lat: fallback.latitude, lng: fallback.longitude });
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [zoom, setZoom] = useState(15);
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const [expand, setExpand] = useState<"late" | "offline" | "ticket" | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => { setReady(true); const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => {
    if (!booking?.lotId) return;
    const base = lots.find((l) => l.id === booking.lotId) || lots[0];
    setDestination({ name: base.name, address: base.address, lat: base.latitude, lng: base.longitude });
    let cancelled = false;
    void getLotByIdApi(booking.lotId).then((d) => {
      if (cancelled || !d) return;
      const lat = Number(d.latitude), lng = Number(d.longitude);
      setDestination({ name: d.name || base.name, address: d.address || base.address, lat: Number.isFinite(lat) && lat !== 0 ? lat : base.latitude, lng: Number.isFinite(lng) && lng !== 0 ? lng : base.longitude });
    });
    return () => { cancelled = true; };
  }, [booking?.lotId]);
  const locate = () => {
    if (!navigator.geolocation) { setLocationStatus("denied"); return; }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition((p) => { setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationStatus("granted"); }, () => { setOrigin(null); setLocationStatus("denied"); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 });
  };
  const googleUrl = useMemo(() => {
    const end = `${destination.lat},${destination.lng}`;
    const start = origin ? `&origin=${encodeURIComponent(`${origin.lat},${origin.lng}`)}` : "";
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(end)}${start}&travelmode=driving`;
  }, [destination, origin]);
  const embedUrl = useMemo(() => `https://maps.google.com/maps?q=${encodeURIComponent(`${destination.lat},${destination.lng}`)}&z=${zoom}&hl=vi&output=embed`, [destination, zoom]);
  const timeLeft = booking?.status === "paid" ? Math.max(0, Math.ceil(((booking.arrivalExpiresAt || 0) - now) / 1000)) : 0;
  const activeTicket = booking && ["paid", "entered"].includes(booking.status);
  if (!ready) return <div className="min-h-full bg-slate-50 grid place-items-center">Đang mở bản đồ...</div>;
  if (!booking) return <div className="min-h-full bg-slate-50 flex flex-col justify-center text-center p-6"><h2 className="font-extrabold text-xl">Không có lượt đặt chỗ</h2><p className="text-sm text-slate-500 mt-2">Vui lòng chọn bãi trước khi dẫn đường.</p><button onClick={() => router.replace("/")} className="mt-5 bg-blue-600 rounded-xl py-3 text-white font-bold">Tìm bãi đỗ xe</button></div>;
  const openGoogle = () => window.open(googleUrl, "_blank", "noopener,noreferrer");
  return <div className="min-h-full bg-[#f1f5f9] pb-6 text-slate-900 flex flex-col">
    <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2 sticky top-0 z-20"><button onClick={() => router.push(`/ve/${booking.id}`)} aria-label="Quay lại" className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center"><ArrowLeft size={19}/></button><div className="text-center min-w-0"><h1 className="text-base font-black truncate">Dẫn đường đến bãi</h1><p className="text-xs text-slate-500 truncate">{destination.name} • Ô {booking.spotId}</p></div><button onClick={() => setShowHelp(true)} className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center" aria-label="Trợ giúp"><CircleHelp size={18}/></button></header>
    <div className="relative h-[350px] bg-[#e5eaf1] border-b border-slate-200 shrink-0">
      <iframe key={embedUrl} title={`Bản đồ Google Maps của ${destination.name}`} src={embedUrl} referrerPolicy="no-referrer-when-downgrade" loading="lazy" allowFullScreen className="w-full h-full border-0"/>
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2"><button onClick={locate} disabled={locationStatus === "loading"} title="Lấy vị trí hiện tại" className="w-10 h-10 bg-white shadow-md rounded-xl grid place-items-center text-blue-600">{locationStatus === "loading" ? <RefreshCw className="animate-spin" size={19}/> : <LocateFixed size={19}/>}</button><button onClick={() => setZoom((z) => Math.min(19, z + 1))} title="Phóng to" className="w-10 h-10 bg-white shadow-md rounded-xl grid place-items-center"><ZoomIn size={19}/></button><button onClick={() => setZoom((z) => Math.max(10, z - 1))} title="Thu nhỏ" className="w-10 h-10 bg-white shadow-md rounded-xl grid place-items-center"><ZoomOut size={19}/></button></div>
      <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm shadow rounded-xl px-3 py-2.5 flex gap-2 items-start"><MapPin size={18} className="text-blue-600 shrink-0 mt-0.5"/><div className="min-w-0"><p className="text-xs font-extrabold truncate">{destination.name}</p><p className="text-[11px] text-slate-500 line-clamp-2">{destination.address}</p></div></div>
    </div>
    <div className="px-4 pt-4 space-y-4">
      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center gap-3"><Clock3 size={25} className="text-blue-600 shrink-0"/><div className="flex-1"><p className="text-[11px] text-blue-700 font-bold">{activeTicket ? "VÉ ĐÃ ĐẶT CỌC" : "THÔNG TIN VÉ"}</p><p className="text-sm font-extrabold">{booking.status === "paid" ? `Đến trước ${new Date(booking.arrivalExpiresAt || 0).toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit"})}` : booking.status === "entered" ? "Đã vào bãi" : "Vé đã hết hiệu lực"}</p></div>{booking.status === "paid" && <span className="text-lg font-black text-blue-700 tabular-nums">{formatTime(timeLeft)}</span>}</div>
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-3"><div className="flex gap-3 items-center"><span className="w-11 h-11 bg-blue-50 rounded-xl grid place-items-center text-blue-600"><MapPin/></span><div className="flex-1 min-w-0"><h2 className="font-black">{destination.name}</h2><p className="text-xs text-slate-500 mt-0.5">{destination.address}</p></div></div><div className="border-t border-dashed border-slate-200 pt-3 grid grid-cols-2 gap-3"><div><p className="text-[11px] text-slate-500">Ô đỗ của bạn</p><strong className="text-2xl text-blue-700">{booking.spotId}</strong></div><div><p className="text-[11px] text-slate-500">Biển số xe</p><strong className="text-sm">{vehicle?.plate || "-"}</strong></div></div>
        <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-[11px] text-slate-600 leading-5">{locationStatus === "idle" ? "Bạn có thể bật định vị bằng nút tâm ngắm trên bản đồ." : locationStatus === "loading" ? "Đang yêu cầu quyền vị trí..." : locationStatus === "granted" ? "Đã xác định vị trí thiết bị. Google Maps sẽ sử dụng vị trí này khi mở chỉ đường." : "Chưa được cấp quyền định vị. Google Maps có thể tự yêu cầu vị trí hoặc cho bạn chọn điểm xuất phát."}</div>
        <button onClick={openGoogle} className="w-full bg-blue-600 text-white font-extrabold rounded-2xl py-3.5 flex items-center justify-center gap-2"><Navigation2 size={19}/> Dẫn đường bằng Google Maps <ExternalLink size={16}/></button>
        <button onClick={() => router.push(`/ve/${booking.id}`)} className="w-full bg-slate-100 text-blue-700 font-extrabold rounded-2xl py-3.5 flex items-center justify-center gap-2"><QrCode size={18}/> Xem vé QR ngay</button>
        <p className="text-[11px] text-slate-500 flex items-start gap-2"><Info size={15} className="shrink-0 mt-0.5"/> Bản đồ trên hiển thị vị trí bãi. Tuyến đường, thời gian di chuyển và tình trạng giao thông thực tế được Google Maps tính khi bạn nhấn “Dẫn đường”. EZ-Parking không tự vẽ hoặc ước lượng lộ trình.</p></section>
      <section className="bg-white rounded-3xl border border-slate-100 p-4 space-y-1"><h3 className="font-extrabold text-sm mb-2">Hỗ trợ & câu hỏi thường gặp</h3>
        {([
          ["late", "Tôi đến trễ hơn thời hạn thì sao?", "Nếu đến sau thời hạn hiển thị, ô có thể được giải phóng và tiền cọc có thể bị giữ theo chính sách mô phỏng. Vui lòng tìm lại ô nếu vé đã hết hạn."],
          ["offline", "Mất sóng hoặc điện thoại tắt màn hình?", "Có thể lưu ảnh QR trước khi đi. Nếu Google Maps không tải, hãy thử kết nối mạng lại để xem tuyến đường cập nhật."],
          ["ticket", "Mã vé QR của tôi xem ở đâu?", "Nhấn Xem vé QR ngay để mở vé điện tử trong ứng dụng EZ-Parking."],
        ] as const).map(([key, title, value]) => <div className="border-t border-slate-100 first:border-none" key={key}><button onClick={() => setExpand(expand === key ? null : key)} className="w-full py-3 flex gap-2 items-center text-left"><span className="flex-1 text-xs font-bold">{title}</span><ChevronDown size={16} className={expand === key ? "rotate-180" : ""}/></button>{expand === key && <p className="text-xs text-slate-600 pb-3 leading-5">{value}</p>}</div>)}
      </section>
    </div>
    {showHelp && <div className="fixed inset-0 bg-slate-950/60 grid place-items-center z-50 p-5"><div className="bg-white rounded-3xl p-5 w-full max-w-sm"><div className="flex justify-between items-center"><h3 className="font-extrabold">Trung tâm hỗ trợ di chuyển</h3><button onClick={() => setShowHelp(false)} aria-label="Đóng"><X size={19}/></button></div><p className="text-sm text-slate-600 leading-6 my-4">Bật vị trí để Google Maps tính đường từ chỗ bạn đến bãi. Nếu bản đồ nhúng không hiển thị, bấm nút Dẫn đường bằng Google Maps để mở ứng dụng/trang web Google Maps.</p><button onClick={() => setShowHelp(false)} className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold">Đã hiểu</button></div></div>}
  </div>;
}
