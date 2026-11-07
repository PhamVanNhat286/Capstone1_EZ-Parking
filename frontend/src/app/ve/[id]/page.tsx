"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CarFront,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  MapPin,
  Navigation,
  QrCode,
  Share2,
  Ticket,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getLotByIdApi, getReservationByIdApi, kioskScanInApi, kioskScanOutApi, releaseSpotApi } from "@/lib/api";
import { lots } from "@/lib/mock/lots";
import { useStore } from "@/store";

const DEPOSIT = 50_000;
const money = (n: number) => Math.max(0, n).toLocaleString("vi-VN") + "đ";
const timer = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const activeBooking = useStore((s) => s.activeBooking);
  const history = useStore((s) => s.history);
  const vehicles = useStore((s) => s.vehicles);
  const markEntered = useStore((s) => s.markEntered);
  const markCompleted = useStore((s) => s.markCompleted);
  const markExpired = useStore((s) => s.markExpired);
  const cancelBooking = useStore((s) => s.cancelBooking);
  const addToast = useStore((s) => s.addToast);
  const isDemo = useStore((s) => s.isDemo);

  const [dbBooking, setDbBooking] = useState<any | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch real reservation detail & QR from PostgreSQL Database
  const fetchDbReservation = async () => {
    if (!id) return;
    setIsLoadingDb(true);
    try {
      const res = await getReservationByIdApi(id, user?.token);
      if (res && res.success && res.data) {
        setDbBooking(res.data);
      }
    } catch (err) {
      console.warn("Không thể tải chi tiết vé từ CSDL:", err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbReservation();
  }, [id, user?.token]);

  // Merge DB booking or Fallback to Store
  const booking = dbBooking
    ? {
        id: `EZ-${dbBooking.id}`,
        backendId: dbBooking.id,
        lotId: String(dbBooking.parking_lot_id),
        spotId: dbBooking.slot_code,
        vehicleId: String(dbBooking.vehicle_id || ""),
        status: dbBooking.status,
        holdExpiresAt: dbBooking.hold_expires_at ? new Date(dbBooking.hold_expires_at).getTime() : 0,
        arrivalExpiresAt: dbBooking.arrival_expires_at ? new Date(dbBooking.arrival_expires_at).getTime() : 0,
        startTime: dbBooking.start_time,
        endTime: dbBooking.expected_end_time,
        estimatedHours: 2,
        createdAt: new Date(dbBooking.created_at).getTime(),
        depositAmount: Number(dbBooking.deposit_amount) || DEPOSIT,
        hourlyRate: Number(dbBooking.hourly_rate) || 20000,
        totalAmount: Number(dbBooking.total_amount) || 40000,
        qrPayload: dbBooking.qr_payload,
        licensePlate: dbBooking.license_plate,
        vehicleType: dbBooking.vehicle_type,
        vehicleName: dbBooking.vehicle_name,
        lotName: dbBooking.lot_name,
        lotAddress: dbBooking.lot_address,
        latitude: dbBooking.latitude,
        longitude: dbBooking.longitude,
        checkInAt: dbBooking.check_in_at,
        checkOutAt: dbBooking.check_out_at,
      }
    : activeBooking?.id === id || String(activeBooking?.backendId) === id
    ? activeBooking
    : history.find((item) => item.id === id || String(item.backendId) === id);

  const vehicle = dbBooking
    ? {
        plate: dbBooking.license_plate || "43A-123.45",
        type: dbBooking.vehicle_type || "SUV",
        name: dbBooking.vehicle_name || "Xe của bạn",
      }
    : vehicles.find((v) => v.id === booking?.vehicleId) || {
        plate: "43A-123.45",
        type: "SUV",
        name: "Xe của bạn",
      };

  const fallback = lots.find((l) => l.id === booking?.lotId) || lots[0];

  const [lot, setLot] = useState({
    name: dbBooking?.lot_name || fallback.name,
    address: dbBooking?.lot_address || fallback.address,
    price: dbBooking ? Number(dbBooking.hourly_rate) || fallback.price : fallback.price,
    latitude: dbBooking ? Number(dbBooking.latitude) || fallback.latitude : fallback.latitude,
    longitude: dbBooking ? Number(dbBooking.longitude) || fallback.longitude : fallback.longitude,
  });
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [expandLate, setExpandLate] = useState(false);

  useEffect(() => {
    if (dbBooking) {
      setLot({
        name: dbBooking.lot_name || fallback.name,
        address: dbBooking.lot_address || fallback.address,
        price: Number(dbBooking.hourly_rate) || fallback.price,
        latitude: Number(dbBooking.latitude) || fallback.latitude,
        longitude: Number(dbBooking.longitude) || fallback.longitude,
      });
    }
  }, [dbBooking, fallback]);

  useEffect(() => {
    setReady(true);
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!booking?.lotId) return;
    const base = lots.find((l) => l.id === booking.lotId) || lots[0];
    setLot({
      name: base.name,
      address: base.address,
      price: base.price,
      latitude: base.latitude,
      longitude: base.longitude,
    });
    let cancelled = false;
    void getLotByIdApi(booking.lotId).then((data) => {
      if (cancelled || !data) return;
      const price = Number(data.pricing_rules?.[0]?.hourly_rate || data.price || base.price);
      setLot({
        name: data.name || base.name,
        address: data.address || base.address,
        price: price > 0 ? price : base.price,
        latitude: Number(data.latitude) || base.latitude,
        longitude: Number(data.longitude) || base.longitude,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [booking?.lotId]);

  useEffect(() => {
    if (
      ready &&
      activeBooking?.id === id &&
      activeBooking.status === "paid" &&
      activeBooking.arrivalExpiresAt &&
      activeBooking.arrivalExpiresAt <= now
    ) {
      markExpired();
    }
  }, [ready, activeBooking?.id, activeBooking?.status, activeBooking?.arrivalExpiresAt, id, now, markExpired]);

  if (!ready) {
    return <div className="min-h-full bg-slate-50 grid place-items-center">Đang tải vé...</div>;
  }

  if (!booking) {
    return (
      <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Ticket size={40} className="text-slate-400" />
        <h2 className="text-lg font-extrabold mt-3">Không tìm thấy vé</h2>
        <p className="text-sm text-slate-500 mt-1">Hãy kiểm tra lịch sử hoặc đặt chỗ mới.</p>
        <button
          onClick={() => router.push("/lich-su")}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold mt-5"
        >
          Lịch sử đặt chỗ
        </button>
      </div>
    );
  }

  const validQR = booking.status === "paid" || booking.status === "entered";
  const remaining =
    booking.status === "paid" ? Math.max(0, Math.ceil(((booking.arrivalExpiresAt || 0) - now) / 1000)) : 0;
  const qrPayload =
    dbBooking?.qr_payload ||
    `EZPARKING-DEMO-TICKET|ID=${booking.id}|LOT=${booking.lotId}|SPOT=${booking.spotId}|VEHICLE=${vehicle?.plate || "UNKNOWN"}`;
  const total = lot.price * (booking.estimatedHours || 2);

  const handleScanIn = async () => {
    setIsScanning(true);
    try {
      const resId = dbBooking?.id || booking?.backendId || booking?.id;
      const res = await kioskScanInApi(
        {
          ticket_code: String(booking?.id || `EZ-${resId}`),
          reservation_id: typeof resId === "number" ? resId : parseInt(String(resId).replace(/^[eE][zZ]-/, ""), 10),
          parking_lot_id: dbBooking?.parking_lot_id || booking?.lotId || 1,
        },
        user?.token
      );

      if (res.success) {
        addToast("Barrier đã mở! Xe check-in vào bãi thành công.", "success");
        markEntered();
        await fetchDbReservation();
      } else {
        addToast(res.message || "Quét mã vào bãi thất bại", "error");
      }
    } catch {
      addToast("Lỗi kết nối máy quét barrier", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanOut = async () => {
    setIsScanning(true);
    try {
      const resId = dbBooking?.id || booking?.backendId || booking?.id;
      const res = await kioskScanOutApi(
        {
          ticket_code: String(booking?.id || `EZ-${resId}`),
          reservation_id: typeof resId === "number" ? resId : parseInt(String(resId).replace(/^[eE][zZ]-/, ""), 10),
          parking_lot_id: dbBooking?.parking_lot_id || booking?.lotId || 1,
          slot_code: dbBooking?.slot_code || booking?.spotId,
        },
        user?.token
      );

      if (res.success) {
        addToast("Barrier đã mở! Xe check-out ra bãi thành công. Ô đỗ đã được giải phóng.", "success");
        markCompleted();
        await fetchDbReservation();
      } else {
        addToast(res.message || "Quét mã ra bãi thất bại", "error");
      }
    } catch {
      addToast("Lỗi kết nối máy quét barrier", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      const resId = dbBooking?.id || booking?.backendId || booking?.id;
      if (resId) {
        await releaseSpotApi(resId, user?.token);
      }
      cancelBooking();
      addToast("Đã hủy đơn đặt chỗ và giải phóng ô đỗ trên CSDL.", "info");
      router.replace("/lich-su");
    } catch {
      cancelBooking();
      router.replace("/lich-su");
    }
  };

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(booking.id);
      addToast("Đã sao chép mã vé", "success");
    } catch {
      addToast("Không sao chép được", "error");
    }
  };

  const share = async () => {
    const text = `Vé EZ-Parking ${booking.id} – ${lot.name} – Ô ${booking.spotId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Vé EZ-Parking", text });
      } else {
        await navigator.clipboard.writeText(text);
        addToast("Đã sao chép thông tin vé", "success");
      }
    } catch {
      /* Người dùng đóng hộp thoại chia sẻ */
    }
  };

  const saveQR = () => {
    const svg = document.querySelector("#ticket-qr svg");
    if (!svg) return;
    const el = svg.cloneNode(true) as SVGElement;
    el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([new XMLSerializer().serializeToString(el)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ve-demo-${booking.id}.svg`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast("Đã lưu ảnh QR mô phỏng", "success");
  };

  const openGoogleMaps = () => {
    const destinationQuery = encodeURIComponent(`${lot.name}, ${lot.address || "Đà Nẵng"}`);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const statusText =
    booking.status === "paid"
      ? "ĐÃ ĐẶT CỌC"
      : booking.status === "entered"
      ? "ĐÃ CHECK-IN"
      : booking.status === "completed"
      ? "ĐÃ HOÀN THÀNH"
      : booking.status === "cancelled"
      ? "ĐÃ HỦY"
      : booking.status === "forfeited"
      ? "HẾT HẠN"
      : "CHƯA THANH TOÁN";

  return (
    <div className="h-full flex flex-col bg-[#f1f5f9] text-slate-900 overflow-hidden">
      {/* 1. Header cố định phía trên */}
      <header className="shrink-0 bg-white sticky top-0 z-20 px-4 py-3 flex justify-between items-center border-b border-slate-100 shadow-xs">
        <button
          aria-label="Quay lại"
          onClick={() => router.push(booking.status === "paid" ? "/" : "/lich-su")}
          className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center active:scale-95 transition-transform"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="text-center">
          <h1 className="font-extrabold text-base">Vé vào bãi</h1>
          <p className="text-[11px] text-slate-500">Đưa mã QR cho nhân viên quét tại cổng</p>
        </div>
        <button
          aria-label="Trợ giúp"
          onClick={() => setShowHelp(true)}
          className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center active:scale-95 transition-transform"
        >
          <CircleHelp size={18} />
        </button>
      </header>

      {/* 2. Thân nội dung cuộn (kéo lên kéo xuống thoải mái) */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4 no-scrollbar">
        {/* Card trạng thái & Countdown */}
        <div
          className={`${
            booking.status === "paid"
              ? "bg-blue-50 border-blue-100"
              : booking.status === "entered"
              ? "bg-emerald-50 border-emerald-100"
              : "bg-slate-200 border-slate-300"
          } border rounded-2xl p-4 flex items-center gap-3`}
        >
          <div className="w-11 h-11 rounded-full bg-white grid place-items-center text-blue-600 shrink-0">
            <Clock3 size={23} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex gap-1.5 items-center flex-wrap">
              <span className="text-[10px] font-black bg-blue-600 text-white rounded-md px-2 py-1">{statusText}</span>
              {booking.status === "paid" && (
                <span className="text-base font-black tabular-nums text-blue-700">{timer(remaining)}</span>
              )}
            </div>
            <p className="text-xs font-extrabold mt-1">
              {booking.status === "paid"
                ? `Đến bãi trước ${new Date(booking.arrivalExpiresAt || 0).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : booking.status === "entered"
                ? "Xe đã được xác nhận vào bãi"
                : "Vé không còn dùng để vào bãi"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {booking.status === "paid"
                ? "Quá hạn có thể mất tiền cọc"
                : "Trạng thái được lưu trong hệ thống mô phỏng"}
            </p>
          </div>
          <button onClick={() => setShowRules(true)} className="text-[11px] text-blue-700 font-bold underline shrink-0">
            Quy định
          </button>
        </div>

        {/* Card mã QR & Thông tin chi tiết */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="text-center p-5">
            <div className="text-blue-600 text-xs font-extrabold flex items-center justify-center gap-1.5">
              <QrCode size={17} /> MÃ QR VÀO CỔNG
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {validQR ? "Mở mã tại thanh chắn barrier" : "Chỉ khả dụng khi vé còn hiệu lực"}
            </p>
            <button
              onClick={() => setFullscreen(true)}
              title="Phóng to mã QR"
              disabled={!validQR}
              className={`mx-auto my-4 bg-white p-3 border-2 rounded-2xl relative ${
                validQR ? "border-blue-600" : "border-slate-200 opacity-30"
              }`}
              id="ticket-qr"
            >
              <QRCodeSVG value={qrPayload} size={216} marginSize={1} fgColor="#0f172a" />
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] rounded-full px-3 py-1 whitespace-nowrap">
                Nhấn để phóng to
              </span>
            </button>
            <div className="mt-6 flex justify-center gap-1.5 items-center">
              <strong className="text-lg tracking-wider font-black font-mono">{booking.id}</strong>
              <button onClick={doCopy} title="Sao chép mã vé" className="text-blue-600 p-1 active:scale-95 transition-transform">
                <Copy size={17} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Mã vé chỉ có hiệu lực trong luồng thử nghiệm EZ-Parking, chưa kết nối máy quét tại bãi.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={saveQR}
                className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <Download size={15} /> Lưu mã
              </button>
              <button
                onClick={share}
                className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <Share2 size={15} /> Chia sẻ
              </button>
            </div>
          </div>

          <div className="relative border-t-2 border-dashed border-slate-200 mx-4">
            <span className="absolute -left-7 -top-3 w-5 h-5 rounded-full bg-[#f1f5f9]" />
            <span className="absolute -right-7 -top-3 w-5 h-5 rounded-full bg-[#f1f5f9]" />
          </div>

          <div className="p-4 space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="font-extrabold">{lot.name}</h2>
                <p className="text-xs mt-1 text-slate-500">{lot.address}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-3">
              <div>
                <p className="text-[10px] text-slate-500">Ô đỗ đã đặt</p>
                <p className="text-blue-700 text-xl font-black">{booking.spotId}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Loại xe</p>
                <p className="font-black text-sm">{vehicle?.type || "Xe hơi"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CarFront className="text-blue-600" size={19} />
              <div>
                <strong className="text-sm">{vehicle?.plate || "Không rõ biển số"}</strong>
                <p className="text-xs text-slate-500">{vehicle?.name || "Xe của bạn"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Giờ đặt chỗ</span>
                <p className="font-bold mt-1">
                  {new Date(booking.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Thời gian đỗ</span>
                <p className="font-bold mt-1">
                  {booking.startTime && booking.endTime
                    ? `${booking.startTime} - ${booking.endTime}`
                    : `${booking.estimatedHours || 2} giờ`}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Cọc đã thanh toán</span>
                <b className="text-emerald-700">
                  {["paid", "entered", "completed"].includes(booking.status) ? money(DEPOSIT) : "Chưa thanh toán"}
                </b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phí còn lại ước tính</span>
                <b>{money(Math.max(0, total - DEPOSIT))}</b>
              </div>
            </div>
          </div>
        </section>

        {/* Accordion đến trễ */}
        <button
          onClick={() => setExpandLate((v) => !v)}
          className="bg-white border border-slate-100 w-full px-4 py-3 rounded-2xl text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
        >
          <Clock3 size={17} className="text-amber-600" />
          <span className="flex-1 text-xs font-extrabold">Tôi đến trễ hơn dự kiến thì sao?</span>
          <ChevronDown size={17} className={expandLate ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
        {expandLate && (
          <p className="bg-amber-50 rounded-xl px-4 py-3 text-xs text-amber-900 leading-relaxed animate-fadeIn">
            Nếu không đến bãi trước thời hạn giữ chỗ, lượt đặt có thể bị hủy và mất cọc. Bạn hãy kiểm tra giờ còn lại phía
            trên; đồ án chưa có chính sách gia hạn tự động.
          </p>
        )}

        {/* Kiosk Barrier Scanner Simulator (Nối trực tiếp CSDL PostgreSQL) */}
        {booking.status === "paid" && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Cổng Barrier Vào (Check-in Kiosk)
              </h3>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono">
                CSDL Live
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Mô phỏng máy quét tại barrier cổng vào: Kiểm tra mã vé trên Backend, mở barie, lưu phiên đỗ vào CSDL.
            </p>
            <button
              onClick={handleScanIn}
              disabled={isScanning}
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              <QrCode size={16} />
              <span>{isScanning ? "Đang gửi tín hiệu máy quét..." : "Giả lập quét QR qua Barie vào bãi"}</span>
            </button>
          </div>
        )}

        {booking.status === "entered" && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-white">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Cổng Barrier Ra (Check-out Kiosk)
              </h3>
              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800/80 px-2 py-0.5 rounded-full font-mono">
                CSDL Live
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Mô phỏng quét mã tại barie ra: Tính tổng phí, kết thúc phiên đỗ, nhả ô trống về sẵn sàng trên CSDL.
            </p>
            <button
              onClick={handleScanOut}
              disabled={isScanning}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 disabled:opacity-50"
            >
              <QrCode size={16} />
              <span>{isScanning ? "Đang xử lý kết thúc lượt đỗ..." : "Giả lập quét QR qua Barie ra bãi"}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Khung 3 nút cố định LUÔN Ở DƯỚI CÙNG (không bị cuộn mất) */}
      <div className="shrink-0 bg-white border-t border-slate-200/90 px-4 py-3 space-y-2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(14px+env(safe-area-inset-bottom))]">
        {/* Nút 1: Dẫn đường đến bãi (Đi thẳng vào Google Maps) */}
        {validQR && (
          <button
            onClick={openGoogleMaps}
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white py-3.5 font-extrabold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
          >
            <Navigation size={18} /> Dẫn đường đến bãi <ArrowRight size={17} />
          </button>
        )}

        {/* Nút 2: Trợ giúp */}
        <button
          onClick={() => setShowHelp(true)}
          className="w-full bg-white hover:bg-slate-50 active:scale-[0.99] rounded-2xl border border-slate-200 py-3 text-blue-700 font-bold flex items-center justify-center gap-2 transition-all text-sm"
        >
          <CircleHelp size={17} /> Trợ giúp
        </button>

        {/* Nút 3: Hủy đặt chỗ */}
        {booking.status === "paid" && (
          <button
            onClick={() => setShowCancel(true)}
            className="block mx-auto pt-1 pb-0.5 text-xs font-semibold text-rose-500 hover:text-rose-700 active:scale-95 transition-transform"
          >
            Hủy đặt chỗ
          </button>
        )}
      </div>

      {/* Fullscreen QR Modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-5">
          <button
            aria-label="Đóng"
            onClick={() => setFullscreen(false)}
            className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full"
          >
            <X />
          </button>
          <p className="font-extrabold text-lg mb-1">Đưa mã vào ô quét</p>
          <p className="text-sm text-slate-500 mb-8">
            {lot.name} • Ô {booking.spotId}
          </p>
          <div className="border-4 border-blue-600 rounded-3xl p-5">
            <QRCodeSVG
              value={qrPayload}
              size={Math.min(290, typeof window !== "undefined" ? window.innerWidth - 100 : 270)}
              marginSize={1}
            />
          </div>
          <p className="mt-7 font-mono font-black">{booking.id}</p>
          <p className="text-xs text-slate-500 mt-2">QR mô phỏng • {vehicle?.plate}</p>
        </div>
      )}

      {showRules && (
        <Popup title="Quy định giữ chỗ và tiền cọc" close={() => setShowRules(false)}>
          <p>
            Thời hạn đến bãi được tính từ lúc thanh toán thành công và thể hiện trên vé. Quá hạn, ô đỗ có thể được nhả và
            tiền cọc có thể bị mất. Tiền cọc được khấu trừ vào phí gửi xe khi thanh toán cuối cùng.
          </p>
          <p className="mt-3">Đây là quy trình mô phỏng trong đồ án, chưa phải điều khoản của một bãi xe thật.</p>
        </Popup>
      )}

      {showHelp && (
        <Popup title="Trợ giúp nhanh" close={() => setShowHelp(false)}>
          <p>
            Bạn có thể lưu mã QR, chia sẻ thông tin đặt chỗ hoặc bấm nút Dẫn đường để mở ứng dụng Google Maps trực tiếp chỉ
            đường tới bãi xe. Nếu vé đã hết hạn, hãy quay lại để chọn ô khác.
          </p>
        </Popup>
      )}

      {showCancel && (
        <Popup title="Bạn muốn hủy đặt chỗ?" close={() => setShowCancel(false)}>
          <p>
            Hủy sẽ nhả ô đỗ và lưu kết quả vào lịch sử. Điều kiện hoàn cọc trong đồ án được mô phỏng theo thời gian đặt.
          </p>
          <div className="flex gap-3 mt-5">
            <button className="flex-1 rounded-xl bg-slate-100 py-3 font-bold" onClick={() => setShowCancel(false)}>
              Ở lại
            </button>
            <button
              className="flex-1 rounded-xl bg-rose-600 text-white py-3 font-bold active:scale-95 transition-transform"
              onClick={handleCancelBooking}
            >
              Hủy đặt
            </button>
          </div>
        </Popup>
      )}
    </div>
  );
}

function Popup({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 grid place-items-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-extrabold text-base">{title}</h3>
          <button aria-label="Đóng" onClick={close}>
            <X size={20} />
          </button>
        </div>
        <div className="text-sm text-slate-600 leading-6">{children}</div>
      </div>
    </div>
  );
}
