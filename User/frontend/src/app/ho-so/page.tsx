"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Signal,
  Wifi,
  Camera,
  BadgeCheck,
  Pencil,
  Car,
  Plus,
  Truck,
  Zap,
  Star,
  CheckCircle2,
  Trash2,
  Heart,
  Wallet,
  CreditCard,
  Tag,
  ChevronRight,
  Settings,
  Bell,
  MapPin,
  Lock,
  HelpCircle,
  PhoneCall,
  LogOut,
  CheckCircle,
  X,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { useStore, Vehicle } from "@/store";
import { lots } from "@/lib/mock/lots";

export default function ProfilePage() {
  const router = useRouter();

  // Store
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const logout = useStore((s) => s.logout);
  const vehicles = useStore((s) => s.vehicles);
  const addVehicle = useStore((s) => s.addVehicle);
  const updateVehicle = useStore((s) => s.updateVehicle);
  const deleteVehicle = useStore((s) => s.deleteVehicle);
  const setDefaultVehicle = useStore((s) => s.setDefaultVehicle);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const history = useStore((s) => s.history);

  // Fallback demo user if not logged in
  const currentUser = user || {
    name: "Phạm Minh",
    email: "minh@example.com",
    phone: "0935313826",
    isLoggedIn: true,
  };

  // Status bar real-time clock
  const [timeStr, setTimeStr] = useState("09:41");
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      setTimeStr(`${h}:${m}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  // Sheets & Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState<Vehicle | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isAvatarSheetOpen, setIsAvatarSheetOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Profile Form state
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [emailInput, setEmailInput] = useState(currentUser.email || "minh@example.com");
  const [phoneInput, setPhoneInput] = useState(currentUser.phone);

  useEffect(() => {
    if (user) {
      setNameInput(user.name);
      setEmailInput(user.email || "minh@example.com");
      setPhoneInput(user.phone);
    }
  }, [user]);

  // Add Vehicle Form state
  const [newVType, setNewVType] = useState<"Sedan" | "SUV" | "EV">("SUV");
  const [newVName, setNewVName] = useState("");
  const [newVPlate, setNewVPlate] = useState("");
  const [newVDefault, setNewVDefault] = useState(false);

  // Edit Vehicle Form state
  const [editVName, setEditVName] = useState("");
  const [editVPlate, setEditVPlate] = useState("");
  const [editVType, setEditVType] = useState<"Sedan" | "SUV" | "EV">("SUV");

  // Change Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<"none" | "weak" | "medium" | "strong">("none");

  // GPS state
  const [gpsEnabled, setGpsEnabled] = useState(true);

  // Favorite lots (starts empty, persisted in localStorage)
  const [favoriteLotIds, setFavoriteLotIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ez_favorite_lots");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("ez_favorite_lots", JSON.stringify(favoriteLotIds));
    } catch {}
  }, [favoriteLotIds]);

  const toggleFavorite = (lotId: string, lotName: string) => {
    if (favoriteLotIds.includes(lotId)) {
      setFavoriteLotIds((prev) => prev.filter((id) => id !== lotId));
      showToast(`Đã bỏ ${lotName} khỏi danh sách yêu thích`);
    } else {
      setFavoriteLotIds((prev) => [...prev, lotId]);
      showToast(`Đã thêm ${lotName} vào vị trí yêu thích`);
    }
  };

  // Real calculation of parking hours from completed bookings
  const totalHours = history
    .filter((b) => b.status === "completed" && b.enteredAt && b.exitedAt)
    .reduce((acc, b) => {
      const diffHours = Math.max(1, Math.round(((b.exitedAt || 0) - (b.enteredAt || 0)) / (1000 * 60 * 60)));
      return acc + diffHours;
    }, 0);

  // Avatar initials
  const initials = currentUser.name
    ? currentUser.name
        .trim()
        .split(" ")
        .map((w) => w[0])
        .slice(-2)
        .join("")
        .toUpperCase()
    : "PM";

  // Form Handlers
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (updateUser) {
      updateUser({
        name: nameInput,
        email: emailInput,
        phone: phoneInput,
      });
    }
    setIsEditProfileOpen(false);
    showToast("Cập nhật hồ sơ thành công!");
  };

  const handleSaveNewVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVName.trim() || !newVPlate.trim()) return;

    const newVehicle: Vehicle = {
      id: "v-" + Date.now(),
      name: newVName.trim(),
      plate: newVPlate.trim().toUpperCase(),
      type: newVType,
      isPrimary: newVDefault || vehicles.length === 0,
      evBodyType: newVType === "EV" ? "SUV" : undefined,
    };

    addVehicle(newVehicle);
    if (newVDefault) {
      setDefaultVehicle(newVehicle.id);
    }

    setNewVName("");
    setNewVPlate("");
    setNewVDefault(false);
    setIsAddVehicleOpen(false);
    showToast(`Đã thêm xe ${newVehicle.plate} thành công!`);
  };

  const handleSaveEditVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditVehicleOpen || !editVName.trim() || !editVPlate.trim()) return;

    updateVehicle(isEditVehicleOpen.id, {
      name: editVName.trim(),
      plate: editVPlate.trim().toUpperCase(),
      type: editVType,
    });

    setIsEditVehicleOpen(null);
    showToast("Đã cập nhật thông tin xe!");
  };

  const handlePasswordInput = (val: string) => {
    setNewPassword(val);
    if (val.length === 0) setPasswordStrength("none");
    else if (val.length < 5) setPasswordStrength("weak");
    else if (val.length < 8) setPasswordStrength("medium");
    else setPasswordStrength("strong");
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      showToast("Mật khẩu xác nhận không khớp!");
      return;
    }
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordStrength("none");
    setIsChangePasswordOpen(false);
    showToast("Mật khẩu đã được thay đổi an toàn!");
  };

  const handleLogoutConfirm = () => {
    setIsLogoutModalOpen(false);
    logout();
    router.push("/dang-nhap");
  };

  // Masked phone: 0935 *** 826
  const maskedPhone = currentUser.phone
    ? currentUser.phone.length > 7
      ? `${currentUser.phone.slice(0, 4)} *** ${currentUser.phone.slice(-3)}`
      : currentUser.phone
    : "0935 *** 826";

  return (
    <div className="relative min-h-full bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-700">
      {/* Dynamic Island & Status Bar Cố Định */}
      <div className="sticky top-0 left-0 right-0 h-11 z-40 bg-slate-50/80 backdrop-blur-md flex items-center justify-between px-6 pt-1 pointer-events-none select-none">
        <span className="text-[13px] font-bold text-slate-900 tracking-tight" suppressHydrationWarning>
          {timeStr}
        </span>

        {/* Dynamic Island Capsule */}
        <div className="w-24 h-6 bg-slate-950 rounded-full flex items-center justify-end px-2 space-x-1.5 shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-blue-950 border border-blue-900"></div>
        </div>

        {/* Icon Pin, Sóng, Wifi */}
        <div className="flex items-center space-x-1.5 text-slate-900">
          <Signal className="w-3.5 h-3.5" />
          <Wifi className="w-3.5 h-3.5" />
          <div className="w-5 h-2.5 border border-slate-800 rounded-sm p-0.5 flex items-center">
            <div className="h-full w-3/4 bg-slate-900 rounded-[1px]"></div>
          </div>
        </div>
      </div>

      {/* Vùng Nội Dung Cuộn Chính */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* 4.1 Header Hồ Sơ (Hero Card) */}
        <div className="relative bg-gradient-to-b from-[#EFF6FF] via-[#DBEAFE]/70 to-[#EFF6FF]/30 pt-3 pb-6 px-5 rounded-b-[32px] border-b border-blue-100/60 overflow-hidden">
          {/* Background Blobs nhẹ nhàng */}
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-200/50 rounded-full blur-2xl pointer-events-none animate-float-blob" />
          <div className="absolute top-20 -left-12 w-36 h-36 bg-sky-200/40 rounded-full blur-xl pointer-events-none" />

          {/* Top bar trong header: Tiêu đề */}
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Hồ sơ khách hàng</span>
            </div>
          </div>

          {/* Avatar & Thông tin cá nhân */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Khung Avatar lớn 80px có breathing glow */}
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full bg-blue-400/30 blur-md animate-pulse-ring"></div>
              <div
                id="avatarContainer"
                className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-blue-700 via-primary to-blue-400 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg border-4 border-white"
              >
                {initials}
              </div>
              {/* Nút camera nhỏ đổi ảnh */}
              <button
                onClick={() => setIsAvatarSheetOpen(true)}
                className="absolute bottom-0 right-0 w-7 h-7 bg-white text-primary rounded-full shadow-md border border-slate-100 flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-transform"
                aria-label="Đổi ảnh đại diện"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tên & Liên hệ */}
            <div className="flex items-center space-x-1.5 justify-center">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{currentUser.name}</h1>
              <BadgeCheck className="w-5 h-5 text-primary fill-blue-100" />
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentUser.email || "minh@example.com"} • {maskedPhone}
            </p>

            {/* Status badge */}
            <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Tài khoản đang hoạt động</span>
            </div>

            {/* Nút Chỉnh sửa hồ sơ */}
            <button
              onClick={() => {
                setNameInput(currentUser.name);
                setEmailInput(currentUser.email || "minh@example.com");
                setPhoneInput(currentUser.phone);
                setIsEditProfileOpen(true);
              }}
              className="mt-3.5 inline-flex items-center space-x-1.5 px-4 py-2 bg-white text-primary border border-blue-200 text-xs font-bold rounded-xl shadow-sm hover:bg-blue-50/50 active:scale-95 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Chỉnh sửa hồ sơ</span>
            </button>
          </div>

          {/* 3 Ô Thống Kê Nhỏ (Lượt đỗ, Giờ đỗ, Xe của tôi) */}
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            <div className="bg-white/90 backdrop-blur rounded-2xl p-2.5 text-center shadow-sm border border-white">
              <span className="text-[10px] font-bold text-slate-600 block uppercase tracking-wider">Lượt đỗ</span>
              <div className="text-lg font-extrabold text-primary mt-0.5">
                {history.length}
              </div>
              <span className="text-[9px] text-slate-600 font-medium">lượt tích lũy</span>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-2xl p-2.5 text-center shadow-sm border border-white">
              <span className="text-[10px] font-bold text-slate-600 block uppercase tracking-wider">Giờ đỗ</span>
              <div className="text-lg font-extrabold text-slate-800 mt-0.5">
                {totalHours}<span className="text-xs font-semibold text-slate-500">h</span>
              </div>
              <span className="text-[9px] text-slate-600 font-medium">trong tháng</span>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-2xl p-2.5 text-center shadow-sm border border-white">
              <span className="text-[10px] font-bold text-slate-600 block uppercase tracking-wider">Xe của tôi</span>
              <div className="text-lg font-extrabold text-primary mt-0.5">{vehicles.length}</div>
              <span className="text-[9px] text-slate-600 font-medium">phương tiện</span>
            </div>
          </div>
        </div>

        {/* Vùng Nội Dung Các Section Chi Tiết */}
        <div className="px-4 mt-5 space-y-5">
          {/* 4.2 Mục "XE CỦA TÔI" (FR-02) */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 flex items-center space-x-1.5">
                  <Car className="w-4 h-4 text-primary" />
                  <span>Xe của tôi</span>
                </h2>
                <p className="text-[11px] text-slate-500">Chọn xe đặt chỗ nhanh & gợi ý ô đỗ tối ưu</p>
              </div>
              <button
                onClick={() => setIsAddVehicleOpen(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold shadow-sm hover:bg-primary-dark active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm xe</span>
              </button>
            </div>

            {/* Carousel cuộn ngang các thẻ xe (Snap) */}
            <div className="flex space-x-3 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1 px-0.5">
              {vehicles.map((v) => {
                const isSuv = v.type === "SUV";
                const isEv = v.type === "EV";
                const isPrimary = v.isPrimary;

                return (
                  <div
                    key={v.id}
                    className={clsx(
                      "snap-center shrink-0 w-[275px] bg-white rounded-2xl p-3.5 shadow-soft relative flex flex-col justify-between transition-all",
                      isPrimary ? "border-2 border-primary/30" : "border border-slate-200"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={clsx(
                              "w-10 h-10 rounded-xl flex items-center justify-center border",
                              isEv
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : isSuv
                                ? "bg-orange-50 text-orange-600 border-orange-100"
                                : "bg-blue-50 text-primary border-blue-100"
                            )}
                          >
                            {isEv ? (
                              <Zap className="w-5 h-5" />
                            ) : isSuv ? (
                              <Truck className="w-5 h-5" />
                            ) : (
                              <Car className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{v.name}</h3>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {isEv ? "Điện thuần • Sạc 60kW" : isSuv ? "7 chỗ máy dầu" : "5 chỗ số tự động"}
                            </span>
                          </div>
                        </div>

                        {isPrimary ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            <span>Mặc định</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setDefaultVehicle(v.id);
                              showToast(`Đã chọn ${v.name} làm xe mặc định`);
                            }}
                            className="text-[10px] font-bold text-primary hover:underline px-1.5 py-0.5 bg-blue-50 rounded"
                          >
                            Đặt mặc định
                          </button>
                        )}
                      </div>

                      {/* Biển số xe kiểu Việt Nam */}
                      <div className="mt-3 bg-slate-50 border border-slate-800/80 rounded-lg p-2 text-center shadow-inner flex items-center justify-between px-3">
                        <span className="text-[10px] font-bold text-slate-400">VN</span>
                        <span className="text-sm font-black tracking-widest text-slate-900 font-mono">
                          {v.plate}
                        </span>
                        <span
                          className={clsx(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                            isEv
                              ? "bg-emerald-100 text-emerald-700"
                              : isSuv
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-primary"
                          )}
                        >
                          {isEv ? "EV SẠC" : v.type}
                        </span>
                      </div>
                    </div>

                    {/* Thao tác xe */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isEv ? "Khớp trụ sạc EV" : isSuv ? "Khớp ô lớn B2" : "Khớp ô tiêu chuẩn"}
                        </span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setIsEditVehicleOpen(v);
                            setEditVName(v.name);
                            setEditVPlate(v.plate);
                            setEditVType(v.type);
                          }}
                          className="text-slate-500 hover:text-primary p-1 active:scale-90"
                          aria-label="Sửa xe"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa xe ${v.plate}?`)) {
                              deleteVehicle(v.id);
                              showToast(`Đã xóa xe ${v.plate} thành công`);
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 active:scale-90"
                          aria-label="Xóa xe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Indicator Dots & Ghi chú xe */}
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex space-x-1.5">
                <span className="w-4 h-1.5 rounded-full bg-primary"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              </div>
              <span className="text-[10px] text-slate-500 italic">💡 Gợi ý ô đỗ theo loại xe SUV / EV</span>
            </div>
          </section>

          {/* VỊ TRÍ ĐỖ YÊU THÍCH */}
          <section id="favoriteLocationsSection">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 flex items-center space-x-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>Vị trí đỗ yêu thích</span>
                </h2>
                <p className="text-[11px] text-slate-500">Bãi đỗ thường xuyên & lối vào nhanh</p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-primary border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Khám phá</span>
              </Link>
            </div>

            {favoriteLotIds.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 text-center border border-dashed border-slate-200 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto mb-2">
                  <Heart className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-700">Chưa có vị trí đỗ yêu thích</h3>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                  Bạn chưa lưu bãi đỗ nào. Khám phá các bãi đỗ gần bạn và bấm biểu tượng trái tim để lưu lại nhé!
                </p>
                <Link
                  href="/"
                  className="mt-3 inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-50 text-primary border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 active:scale-95 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Khám phá bãi đỗ</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lots
                  .filter((lot) => favoriteLotIds.includes(lot.id))
                  .map((lot, idx) => {
                    const isFav = favoriteLotIds.includes(lot.id);
                    const quenSpot = idx === 0 ? "A-07" : "C-12";
                    const floorLabel = idx === 0 ? "Tầng B2" : "Mặt đất";

                    return (
                      <div
                        key={lot.id}
                        className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors"
                      >
                        <Link href={`/bai/${lot.id}`} className="flex items-start space-x-3 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary font-bold text-base shrink-0">
                            P
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h3 className="text-sm font-bold text-slate-900">{lot.name}</h3>
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                {floorLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{lot.address}</p>
                            <div className="flex items-center space-x-3 mt-1.5">
                              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Còn {lot.available.total} chỗ</span>
                              </span>
                              <span className="text-[11px] text-blue-600 font-medium">Ô quen: {quenSpot}</span>
                            </div>
                          </div>
                        </Link>
                        <button
                          onClick={() => toggleFavorite(lot.id, lot.name)}
                          className="p-2 rounded-full text-rose-500 hover:bg-rose-50 active:scale-90 transition-transform shrink-0 ml-2"
                          aria-label="Yêu thích"
                        >
                          <Heart
                            className={clsx(
                              "w-4 h-4 transition-colors",
                              isFav ? "text-rose-500 fill-rose-500" : "text-slate-300"
                            )}
                          />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* 4.3 Mục "THANH TOÁN" */}
          <section className="bg-white rounded-2xl p-4 shadow-soft border border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span>Thanh toán & Giao dịch</span>
            </h2>

            <div className="divide-y divide-slate-100 text-sm">
              {/* Phương thức thanh toán */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Phương thức cọc</div>
                    <div className="text-[11px] text-slate-400">Sandbox VNPay, MoMo QR</div>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md border border-blue-100">
                    VNPay
                  </span>
                  <span className="px-2 py-0.5 bg-pink-50 text-pink-700 font-bold text-[10px] rounded-md border border-pink-100">
                    MoMo
                  </span>
                </div>
              </div>

              {/* Ưu đãi & voucher */}
              <button
                onClick={() => showToast("Bạn có 2 phiếu giảm giá 20% đặt cọc!")}
                className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 rounded-lg px-1 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Ưu đãi & Khuyến mãi</div>
                    <div className="text-[11px] text-slate-400">Giảm giá đỗ xe cuối tuần</div>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    2 mã mới
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            </div>
          </section>

          {/* 4.4 Mục "CÀI ĐẶT ỨNG DỤNG" */}
          <section id="settingsSection" className="bg-white rounded-2xl p-4 shadow-soft border border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <Settings className="w-3.5 h-3.5 text-primary" />
              <span>Cài đặt & Bảo mật</span>
            </h2>

            <div className="divide-y divide-slate-100 text-sm">
              {/* Thông báo bãi đỗ */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Thông báo giữ chỗ</div>
                    <div className="text-[11px] text-slate-400">Nhắc hạn 10p cọc & 20p tới bãi</div>
                  </div>
                </div>
                {/* Toggle switch có animation */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => {
                      setSettings({ notifications: e.target.checked });
                      showToast(e.target.checked ? "Đã bật thông báo đặt bãi" : "Đã tắt thông báo");
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Định vị GPS */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Truy cập vị trí (GPS)</div>
                    <div className="text-[11px] text-slate-400">Tìm bãi trống gần xe nhất</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gpsEnabled}
                    onChange={(e) => {
                      setGpsEnabled(e.target.checked);
                      showToast(e.target.checked ? "Đã bật định vị GPS" : "Đã tắt định vị GPS");
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Đổi mật khẩu */}
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 rounded-lg px-1 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Đổi mật khẩu</div>
                    <div className="text-[11px] text-slate-400">Cập nhật mật khẩu định kỳ</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </section>

          {/* 4.5 Mục "HỖ TRỢ" */}
          <section className="bg-white rounded-2xl p-4 shadow-soft border border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              <span>Hỗ trợ & Thông tin</span>
            </h2>
            <div className="divide-y divide-slate-100 text-xs">
              <a href="tel:19006868" className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-1">
                <div className="flex items-center space-x-3">
                  <PhoneCall className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-700">Tổng đài hỗ trợ 24/7</span>
                </div>
                <span className="font-bold text-primary">1900 6868</span>
              </a>
            </div>
          </section>

          {/* 4.6 Vùng Nguy Hiểm: Đăng Xuất & Xóa Tài Khoản */}
          <div className="space-y-3 pt-2 pb-6">
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full h-12 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 flex items-center justify-center space-x-2 hover:bg-red-100/70 active:scale-95 transition-all text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>

            <div className="text-center">
              <button
                onClick={() => showToast("Chức năng bảo vệ dữ liệu: Vui lòng liên hệ quản trị viên")}
                className="text-[11px] text-slate-400 hover:text-red-500 underline font-medium"
              >
                Yêu cầu xóa tài khoản & dữ liệu xe
              </button>
            </div>

            {/* Logo P & Slogan chân trang */}
            <div className="pt-3 text-center flex flex-col items-center justify-center space-y-1">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary to-blue-400 text-white font-black text-xs flex items-center justify-center shadow-sm">
                P
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                EZ-Space • Đỗ xe thông minh, không lo hết chỗ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS & BOTTOM SHEETS ================= */}

      {/* TOAST NOTIFICATION */}
      <div
        className={clsx(
          "fixed top-12 left-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 text-xs font-semibold transform transition-all duration-300 pointer-events-none max-w-[400px] mx-auto",
          toastMessage ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0"
        )}
      >
        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{toastMessage}</span>
      </div>

      {/* SHEET: CHỈNH SỬA HỒ SƠ */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-[32px] p-5 shadow-2xl sheet-transition max-h-[85%] overflow-y-auto max-w-[430px] w-full mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Chỉnh sửa hồ sơ</h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none font-semibold text-slate-800 font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-glow hover:bg-primary-dark active:scale-95 transition-all mt-4"
              >
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHEET: THÊM XE MỚI */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-[32px] p-5 shadow-2xl sheet-transition max-h-[90%] overflow-y-auto max-w-[430px] w-full mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Thêm xe mới</h3>
                <p className="text-[11px] text-slate-400">Giúp hệ thống chọn ô đỗ vừa vặn với kích thước xe</p>
              </div>
              <button
                onClick={() => setIsAddVehicleOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewVehicle} className="space-y-3.5 text-xs">
              {/* Chọn loại xe */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Loại phương tiện</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVType("Sedan")}
                    className={clsx(
                      "p-2.5 rounded-xl border text-center flex flex-col items-center space-y-1 transition-all",
                      newVType === "Sedan"
                        ? "border-primary bg-blue-50 text-primary font-bold shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Car className="w-4 h-4" />
                    <span className="text-[11px]">Sedan / Cỡ nhỏ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVType("SUV")}
                    className={clsx(
                      "p-2.5 rounded-xl border text-center flex flex-col items-center space-y-1 transition-all",
                      newVType === "SUV"
                        ? "border-primary bg-blue-50 text-orange-600 font-bold shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Truck className="w-4 h-4" />
                    <span className="text-[11px]">SUV / Bán tải</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVType("EV")}
                    className={clsx(
                      "p-2.5 rounded-xl border text-center flex flex-col items-center space-y-1 transition-all",
                      newVType === "EV"
                        ? "border-primary bg-blue-50 text-emerald-600 font-bold shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Zap className="w-4 h-4" />
                    <span className="text-[11px]">Xe điện (EV)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên xe / Hãng xe</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mazda CX-5, Honda CR-V"
                  value={newVName}
                  onChange={(e) => setNewVName(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Biển số xe (Việt Nam)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 43A-999.88 hoặc 51K-123.45"
                  value={newVPlate}
                  onChange={(e) => setNewVPlate(e.target.value.toUpperCase())}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary outline-none font-mono font-bold uppercase"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-700">Đặt làm xe mặc định</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newVDefault}
                    onChange={(e) => setNewVDefault(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-glow hover:bg-primary-dark active:scale-95 transition-all mt-4"
              >
                Lưu xe vào danh sách
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHEET: CHỈNH SỬA XE */}
      {isEditVehicleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-[32px] p-5 shadow-2xl sheet-transition max-h-[90%] overflow-y-auto max-w-[430px] w-full mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Sửa thông tin xe</h3>
                <p className="text-[11px] text-slate-400">Cập nhật biển số hoặc tên xe</p>
              </div>
              <button
                onClick={() => setIsEditVehicleOpen(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditVehicle} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Loại phương tiện</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditVType("Sedan")}
                    className={clsx(
                      "p-2.5 rounded-xl border text-center flex flex-col items-center space-y-1 transition-all",
                      editVType === "Sedan"
                        ? "border-primary bg-blue-50 text-primary font-bold shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Car className="w-4 h-4" />
                    <span className="text-[11px]">Sedan / Cỡ nhỏ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditVType("SUV")}
                    className={clsx(
                      "p-2.5 rounded-xl border text-center flex flex-col items-center space-y-1 transition-all",
                      editVType === "SUV"
                        ? "border-primary bg-blue-50 text-orange-600 font-bold shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Truck className="w-4 h-4" />
                    <span className="text-[11px]">SUV / Bán tải</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditVType("EV")}
                    className={clsx(
                      "p-2.5 rounded-xl border text-center flex flex-col items-center space-y-1 transition-all",
                      editVType === "EV"
                        ? "border-primary bg-blue-50 text-emerald-600 font-bold shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Zap className="w-4 h-4" />
                    <span className="text-[11px]">Xe điện (EV)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên xe / Hãng xe</label>
                <input
                  type="text"
                  value={editVName}
                  onChange={(e) => setEditVName(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Biển số xe (Việt Nam)</label>
                <input
                  type="text"
                  value={editVPlate}
                  onChange={(e) => setEditVPlate(e.target.value.toUpperCase())}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary outline-none font-mono font-bold uppercase"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-glow hover:bg-primary-dark active:scale-95 transition-all mt-4"
              >
                Cập nhật xe
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHEET: ĐỔI MẬT KHẨU */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-[32px] p-5 shadow-2xl sheet-transition max-w-[430px] w-full mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Đổi mật khẩu tài khoản</h3>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 8 ký tự"
                  value={newPassword}
                  onChange={(e) => handlePasswordInput(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                />
                {/* Thanh đo độ mạnh mật khẩu */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden flex">
                  <div
                    className={clsx(
                      "h-full transition-all duration-300",
                      passwordStrength === "none" && "bg-slate-200 w-0",
                      passwordStrength === "weak" && "bg-red-400 w-1/4",
                      passwordStrength === "medium" && "bg-amber-400 w-2/4",
                      passwordStrength === "strong" && "bg-emerald-500 w-full"
                    )}
                  />
                </div>
                <span
                  className={clsx(
                    "text-[10px] mt-1 block",
                    passwordStrength === "none" && "text-slate-400",
                    passwordStrength === "weak" && "text-red-500",
                    passwordStrength === "medium" && "text-amber-600",
                    passwordStrength === "strong" && "text-emerald-600"
                  )}
                >
                  {passwordStrength === "none" && "Độ mạnh: Chưa nhập"}
                  {passwordStrength === "weak" && "Độ mạnh: Yếu (ít nhất 5 ký tự)"}
                  {passwordStrength === "medium" && "Độ mạnh: Trung bình"}
                  {passwordStrength === "strong" && "Độ mạnh: Rất mạnh (An toàn)"}
                </span>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-glow hover:bg-primary-dark active:scale-95 transition-all mt-4"
              >
                Cập nhật mật khẩu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHEET: CHỌN ẢNH ĐẠI DIỆN */}
      {isAvatarSheetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-[32px] p-5 shadow-2xl sheet-transition space-y-2.5 text-xs font-semibold max-w-[430px] w-full mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />
            <h4 className="text-center font-bold text-slate-900 mb-3">Ảnh đại diện</h4>
            <button
              onClick={() => {
                setIsAvatarSheetOpen(false);
                showToast("Đã mở camera để chụp ảnh mới");
              }}
              className="w-full py-3 px-4 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-primary rounded-xl flex items-center space-x-2.5 transition-colors"
            >
              <Camera className="w-4 h-4 text-primary" />
              <span>Chụp ảnh mới</span>
            </button>
            <button
              onClick={() => {
                setIsAvatarSheetOpen(false);
                showToast("Đã chọn ảnh từ thư viện");
              }}
              className="w-full py-3 px-4 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-primary rounded-xl flex items-center space-x-2.5 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-primary" />
              <span>Chọn ảnh từ thư viện</span>
            </button>
            <button
              onClick={() => setIsAvatarSheetOpen(false)}
              className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* DIALOG: XÁC NHẬN ĐĂNG XUẤT */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-5 text-center shadow-2xl max-w-[320px] w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Đăng xuất tài khoản?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng EZ-Space trên thiết bị này?
            </p>
            <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Ở lại
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="py-2.5 px-4 bg-red-600 text-white rounded-xl shadow-md hover:bg-red-700 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
