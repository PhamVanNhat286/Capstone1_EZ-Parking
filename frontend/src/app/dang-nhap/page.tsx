"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Signal,
  Wifi,
  LogIn,
  UserPlus,
  Check,
  CheckCircle2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  User,
  Phone,
  ShieldCheck,
  Car,
  Truck,
  Zap,
  ChevronLeft,
  ChevronRight,
  Info,
  UserCheck,
} from "lucide-react";
import { loginApi, registerApi } from "@/lib/api";
import { useStore } from "@/store";

export default function AuthPage() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const addToast = useStore((s) => s.addToast);
  const addVehicle = useStore((s) => s.addVehicle);

  // Screen view: 'login' | 'register'
  const [view, setView] = useState<"login" | "register">("login");
  const isDark = false;

  // Register Wizard Step: 1 | 2
  const [regStep, setRegStep] = useState<number>(1);

  // Form States
  const [loginData, setLoginData] = useState({
    account: "",
    password: "",
    rememberMe: true,
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regData, setRegData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    licensePlate: "",
    vehicleType: "sedan" as "sedan" | "suv" | "ev",
    agreeTerms: false,
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // UI Feedback State: 'idle' | 'loading' | 'success'
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [successMsg, setSuccessMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pass = regData.password;
    if (!pass) {
      return {
        score: 0,
        text: "Chưa nhập",
        color: "bg-slate-300",
        textColor: "text-slate-400",
        width: "0%",
      };
    }
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) {
      return {
        score: 1,
        text: "Yếu",
        color: "bg-rose-500",
        textColor: "text-rose-600",
        width: "33%",
      };
    } else if (score <= 3) {
      return {
        score: 2,
        text: "Trung bình",
        color: "bg-amber-500",
        textColor: "text-amber-600",
        width: "66%",
      };
    } else {
      return {
        score: 3,
        text: "Mạnh & An toàn",
        color: "bg-emerald-500",
        textColor: "text-emerald-600",
        width: "100%",
      };
    }
  }, [regData.password]);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!loginData.account.trim()) {
      errs.account = "Vui lòng nhập Email hoặc Số điện thoại";
    }
    if (!loginData.password) {
      errs.password = "Vui lòng nhập mật khẩu";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStatus("loading");

    try {
      const res = await loginApi(loginData.account.trim(), loginData.password);
      if (res.success && res.data) {
        if (typeof window !== "undefined") {
          localStorage.setItem("ezspace_token", res.data.token);
        }
        login({
          name: res.data.user.full_name,
          email: res.data.user.email,
          phone: res.data.user.phone,
          role: res.data.user.role,
          token: res.data.token,
        });
        setStatus("success");
        setSuccessMsg("Đăng nhập thành công! Đang chuyển hướng...");
        setTimeout(() => {
          setStatus("idle");
          router.push("/");
        }, 1200);
      } else {
        setStatus("idle");
        const errMsg = res.message || "Tài khoản hoặc mật khẩu không chính xác";
        setErrors({ general: errMsg });
        addToast(errMsg, "error");
      }
    } catch {
      setStatus("idle");
      const netErrMsg = "Không thể kết nối đến máy chủ Backend (vui lòng kiểm tra API)";
      setErrors({ general: netErrMsg });
      addToast(netErrMsg, "error");
    }
  };

  // Handle Register Step 1 Next
  const handleRegisterNext = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!regData.fullName.trim()) errs.fullName = "Vui lòng nhập họ và tên";
    if (!regData.email.trim() || !/\S+@\S+\.\S+/.test(regData.email)) {
      errs.email = "Email không hợp lệ";
    }
    if (
      !regData.phone.trim() ||
      !/^[0-9]{9,11}$/.test(regData.phone.replace(/\s+/g, ""))
    ) {
      errs.phone = "Số điện thoại không hợp lệ (9-11 số)";
    }
    if (!regData.password || regData.password.length < 6) {
      errs.password = "Mật khẩu phải từ 6 ký tự trở lên";
    }
    if (regData.password !== regData.confirmPassword) {
      errs.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setRegStep(2);
  };

  // Handle Register Final Submit
  const handleRegisterSubmit = async (skipVehicle = false) => {
    if (!regData.agreeTerms) {
      setErrors({ agreeTerms: "Bạn cần đồng ý với Điều khoản & Chính sách" });
      return;
    }
    setErrors({});
    setStatus("loading");

    try {
      const res = await registerApi({
        full_name: regData.fullName.trim(),
        email: regData.email.trim(),
        password: regData.password,
        phone: regData.phone.trim(),
      });

      if (!res.success) {
        setStatus("idle");
        const errMsg = res.message || "Đăng ký không thành công. Vui lòng kiểm tra lại!";
        setErrors({ general: errMsg });
        addToast(errMsg, "error");
        return;
      }

      // Nếu người dùng có nhập xe thì lưu vào store
      if (!skipVehicle && regData.licensePlate.trim()) {
        addVehicle({
          id: `veh-${Date.now()}`,
          name:
            regData.vehicleType === "sedan"
              ? "Sedan cá nhân"
              : regData.vehicleType === "suv"
              ? "SUV gầm cao"
              : "VinFast VF e34",
          plate: regData.licensePlate.trim().toUpperCase(),
          type:
            regData.vehicleType === "sedan"
              ? "Sedan"
              : regData.vehicleType === "suv"
              ? "SUV"
              : "EV",
          isPrimary: true,
        });
      }

      setStatus("success");
      setSuccessMsg(
        skipVehicle
          ? "Đăng ký thành công! Đang chuyển sang đăng nhập..."
          : "Đăng ký thành công! Xe đã được liên kết."
      );

      setTimeout(() => {
        setStatus("idle");
        setView("login");
        setRegStep(1);
        setLoginData({
          account: regData.email,
          password: regData.password,
          rememberMe: true,
        });
        addToast("Đăng ký thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo.", "success");
      }, 1500);
    } catch {
      setStatus("idle");
      const netErrMsg = "Không thể kết nối đến máy chủ Backend khi đăng ký!";
      setErrors({ general: netErrMsg });
      addToast(netErrMsg, "error");
    }
  };

  // Social login mock
  const handleSocialLogin = (provider: string) => {
    setStatus("loading");
    setTimeout(() => {
      login({
        name: `Tài khoản ${provider}`,
        email: `driver_${provider.toLowerCase()}@ezspace.vn`,
        phone: "0905999888",
        role: "customer",
        token: `token-${provider.toLowerCase()}`,
      });
      setStatus("success");
      setSuccessMsg(`Đăng nhập qua ${provider} thành công!`);
      setTimeout(() => {
        setStatus("idle");
        router.push("/");
      }, 1000);
    }, 1000);
  };

  return (
    <div
      className={`min-h-full w-full flex items-center justify-center p-0 select-none font-sans overflow-x-hidden antialiased transition-colors duration-500 ${
        isDark
          ? "bg-slate-950 text-slate-100"
          : "bg-gradient-to-br from-slate-100 via-[#EDF2F7] to-slate-200 text-slate-800"
      }`}
    >
      {/* PHONE FRAME CONTAINER */}
      <div
        className={`relative w-full max-w-[390px] h-[844px] max-h-[844px] rounded-[48px] overflow-hidden flex flex-col border-[10px] transition-colors duration-500 my-auto ${
          isDark
            ? "bg-gradient-to-b from-navy-950 via-[#0C1427] to-[#080D1A] border-slate-800 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]"
            : "bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9] border-[#E2E8F0] text-slate-800 shadow-[0_25px_60px_-15px_rgba(100,116,139,0.35)]"
        }`}
      >
        {/* DYNAMIC ISLAND & PHONE NOTCH */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-7 pt-3 pb-1 select-none pointer-events-none">
          <span
            className={`text-[13px] font-bold tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            09:41
          </span>

          {/* Dynamic Island pill */}
          <div className="w-24 h-6 bg-slate-950 rounded-full mx-auto flex items-center justify-between px-2.5 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80"></div>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 text-[11px] font-semibold ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            <Signal size={13} />
            <Wifi size={13} />
            <div className="w-5 h-2.5 border border-current rounded-[3px] p-0.5 flex items-center">
              <div className="w-full h-full bg-current rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* FLOATING AMBIENT GLOW BLOBS */}
        <div
          className={`absolute -top-16 -left-16 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
            isDark ? "bg-blue-600/20" : "bg-sky-200/50"
          }`}
        ></div>
        <div
          className={`absolute top-44 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
            isDark ? "bg-indigo-600/20" : "bg-blue-200/40"
          }`}
        ></div>
        <div
          className={`absolute bottom-10 left-10 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isDark ? "bg-emerald-500/10" : "bg-emerald-200/40"
          }`}
        ></div>

        {/* APP HEADER */}
        <div className="relative pt-12 px-6 flex items-center justify-between z-20">
          {/* Logo Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-400 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
              <div
                className={`w-full h-full rounded-[14px] flex items-center justify-center backdrop-blur-sm ${
                  isDark ? "bg-navy-950/80" : "bg-white"
                }`}
              >
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500 text-xl tracking-tighter">
                  P
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  EZ-Space
                </h1>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase tracking-wider border border-blue-200/70">
                  Smart
                </span>
              </div>
              <p
                className={`text-[10px] leading-none ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Đỗ xe thông minh, không lo hết chỗ
              </p>
            </div>
          </div>
        </div>

        {/* HERO SECTION: INTERACTIVE 2D PARKING SIMULATION */}
        <div
          className={`relative mx-6 mt-3 mb-2 rounded-2xl overflow-hidden border p-2.5 z-10 transition-all ${
            isDark
              ? "border-slate-700/40 bg-slate-900/60 shadow-inner"
              : "border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md"
          }`}
        >
          {/* 2D Parking Grid Canvas Simulator */}
          <div
            className={`relative w-full h-[76px] rounded-xl border p-2 overflow-hidden flex items-center justify-between transition-colors ${
              isDark ? "bg-[#090d16] border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            {/* Lane markings */}
            <div
              className={`absolute inset-x-2 top-1/2 -translate-y-1/2 h-0 border-b border-dashed pointer-events-none ${
                isDark ? "border-slate-700/80" : "border-slate-300"
              }`}
            ></div>

            {/* Parking slots Row A (Left) */}
            <div className="flex flex-col gap-1.5 z-10">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-10 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                    isDark
                      ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
                      : "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                  }`}
                >
                  A1
                </div>
                <div
                  className={`w-10 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                    isDark
                      ? "border-rose-500/80 bg-rose-500/20 text-rose-400"
                      : "border-rose-400 bg-rose-50 text-rose-600"
                  }`}
                >
                  A2
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-10 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold animate-pulse-subtle ${
                    isDark
                      ? "border-amber-400/80 bg-amber-400/15 text-amber-300"
                      : "border-amber-400 bg-amber-50 text-amber-700"
                  }`}
                >
                  A3
                </div>
                <div
                  className={`w-10 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                    isDark
                      ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-400"
                      : "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                  }`}
                >
                  A4
                </div>
              </div>
            </div>

            {/* Animated Target Slot B2 (Right side) that changes status */}
            <div className="flex flex-col gap-1.5 z-10">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-10 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                    isDark
                      ? "border-rose-500/80 bg-rose-500/20 text-rose-400"
                      : "border-rose-400 bg-rose-50 text-rose-600"
                  }`}
                >
                  B1
                </div>
                {/* DYNAMIC OCCUPIED SPOT */}
                <div
                  className={`w-10 h-6 rounded-md border animate-spot-occupy flex items-center justify-center text-[10px] font-bold relative transition-colors duration-300 ${
                    !isDark ? "shadow-sm" : ""
                  }`}
                >
                  <span>B2</span>
                  <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-10 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                    isDark
                      ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-400"
                      : "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                  }`}
                >
                  B3
                </div>
                <div
                  className={`w-10 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold ${
                    isDark
                      ? "border-amber-400/80 bg-amber-400/15 text-amber-300"
                      : "border-amber-400 bg-amber-50 text-amber-700"
                  }`}
                >
                  B4
                </div>
              </div>
            </div>

            {/* ANIMATED CAR TRAVELLING INTO SPOT */}
            <div className="absolute top-0 left-0 animate-car-loop pointer-events-none z-20">
              <div className="w-5 h-3 bg-gradient-to-r from-blue-600 to-sky-500 rounded-sm shadow-[0_2px_8px_rgba(37,99,235,0.4)] flex items-center justify-between px-0.5 border border-white">
                <div className="w-1 h-1.5 bg-amber-300 rounded-2xs"></div>
                <div className="w-1 h-1 bg-white/70 rounded-2xs"></div>
                <div className="w-1 h-1.5 bg-rose-500 rounded-2xs"></div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB SWITCH: LOGIN / REGISTER */}
        <div className="px-6 mb-2 z-20">
          <div
            className={`p-1 rounded-2xl flex items-center transition-all ${
              isDark
                ? "bg-slate-900/80 border border-slate-800"
                : "bg-slate-200/70 border border-slate-200 shadow-inner"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setView("login");
                setStatus("idle");
                setErrors({});
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                view === "login"
                  ? isDark
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-white text-blue-600 shadow-sm"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LogIn size={14} />
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setView("register");
                setRegStep(1);
                setStatus("idle");
                setErrors({});
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                view === "register"
                  ? isDark
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-white text-blue-600 shadow-sm"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus size={14} />
              Đăng ký
            </button>
          </div>
        </div>

        {/* MAIN SCROLLABLE FORM CONTAINER */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 pt-1 z-20">
          {/* STATUS TOAST NOTIFICATION */}
          {status === "success" && (
            <div
              className={`mb-3 p-3 rounded-2xl border text-xs flex items-center gap-2.5 animate-fade-slide ${
                isDark
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check size={14} />
              </div>
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* GENERAL ERROR BANNER */}
          {errors.general && (
            <div
              className={`mb-3 p-3 rounded-2xl border text-xs flex items-start gap-2.5 animate-fade-slide ${
                isDark
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                  : "bg-rose-50 border-rose-200 text-rose-800 shadow-sm"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Info size={13} />
              </div>
              <span className="font-semibold leading-relaxed">{errors.general}</span>
            </div>
          )}

          {/* ==================== VIEW 1: LOGIN ==================== */}
          {view === "login" && (
            <div className="space-y-4 animate-fade-slide">
              {/* Header text */}
              <div>
                <h2
                  className={`text-xl font-extrabold tracking-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Chào mừng trở lại! 👋
                </h2>
                <p
                  className={`text-xs mt-0.5 ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Đăng nhập để đặt chỗ nhanh và mở khóa barie tự động
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {/* Email / Phone Field */}
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1.5 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Email hoặc Số điện thoại
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="text"
                      value={loginData.account}
                      onChange={(e) =>
                        setLoginData({ ...loginData, account: e.target.value })
                      }
                      placeholder="example@ezspace.vn hoặc 0912..."
                      className={`w-full pl-10 pr-3.5 py-3 rounded-2xl text-xs border transition-all outline-none ${
                        errors.account
                          ? "border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : ""
                      } ${
                        isDark
                          ? "bg-slate-900/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-blue-500 focus:bg-slate-900"
                          : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-sm"
                      }`}
                    />
                  </div>
                  {errors.account && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">
                      {errors.account}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      className={`text-xs font-semibold ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      Mật khẩu
                    </label>
                    <a
                      href="#forgot"
                      onClick={(e) => {
                        e.preventDefault();
                        addToast(
                          "Liên kết khôi phục mật khẩu đã được gửi đến email/SĐT của bạn.",
                          "info"
                        );
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition"
                    >
                      Quên mật khẩu?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      placeholder="Nhập mật khẩu an toàn"
                      className={`w-full pl-10 pr-10 py-3 rounded-2xl text-xs border transition-all outline-none ${
                        errors.password
                          ? "border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : ""
                      } ${
                        isDark
                          ? "bg-slate-900/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-blue-500 focus:bg-slate-900"
                          : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-sm"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loginData.rememberMe}
                      onChange={(e) =>
                        setLoginData({
                          ...loginData,
                          rememberMe: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`text-xs ${
                        isDark ? "text-slate-300" : "text-slate-600 font-medium"
                      }`}
                    >
                      Ghi nhớ đăng nhập trên thiết bị này
                    </span>
                  </label>
                </div>

                {/* Submit Button with Loading & Feedback */}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="relative w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 hover:opacity-95 disabled:opacity-60 overflow-hidden cursor-pointer"
                >
                  {/* Shimmer sweep effect */}
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                  {status === "loading" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={17} className="animate-spin" />
                      Đang xác thực...
                    </span>
                  ) : status === "success" ? (
                    <span className="flex items-center gap-2 text-white">
                      <CheckCircle2 size={17} />
                      Đăng nhập thành công!
                    </span>
                  ) : (
                    <>
                      <span>Đăng nhập</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div
                  className={`flex-grow border-t ${
                    isDark ? "border-slate-800" : "border-slate-200"
                  }`}
                ></div>
                <span
                  className={`flex-shrink mx-3 text-[11px] uppercase tracking-wider font-semibold ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  hoặc tiếp tục với
                </span>
                <div
                  className={`flex-grow border-t ${
                    isDark ? "border-slate-800" : "border-slate-200"
                  }`}
                ></div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("Google")}
                  className={`min-h-[44px] px-3 py-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-semibold transition active:scale-95 ${
                    isDark
                      ? "bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin("Apple")}
                  className={`min-h-[44px] px-3 py-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-semibold transition active:scale-95 ${
                    isDark
                      ? "bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  <svg
                    className={`w-4 h-4 fill-current shrink-0 ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                    viewBox="0 0 170 170"
                  >
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.07-7.65-7.85-11.87-14.34-5.78-8.91-10.4-19.1-13.86-30.56-3.46-11.46-5.2-22.18-5.2-32.17 0-14.65 3.82-26.4 11.46-35.25 7.64-8.86 17.1-13.37 28.38-13.56 5.4 0 11.26 1.44 17.58 4.31 6.32 2.87 10.3 4.37 11.95 4.5 1.5.13 5.48-1.44 11.95-4.7 6.47-3.26 12.33-4.7 17.58-4.31 13.06 1.05 23.47 5.92 31.23 14.61-11.45 6.94-17.06 16.5-16.82 28.69.24 9.53 3.93 17.48 11.07 23.85 7.15 6.37 15.71 10.02 25.68 10.96-2.12 6.37-4.7 12.59-7.75 18.66zM119.22 31.84c0-7.39 2.68-14.18 8.04-20.36 5.37-6.18 11.94-9.98 19.72-11.41.35 1.3.52 2.55.52 3.75 0 7.39-2.77 14.3-8.31 20.73-5.54 6.43-12.34 10.15-20.4 11.16-.24-1.29-.36-2.58-.36-3.87z" />
                  </svg>
                  Apple
                </button>
              </div>

              {/* Bottom Link to Register */}
              <div className="pt-2 text-center">
                <p
                  className={`text-xs ${
                    isDark ? "text-slate-400" : "text-slate-600 font-medium"
                  }`}
                >
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView("register");
                      setRegStep(1);
                      setErrors({});
                    }}
                    className="text-blue-600 hover:text-blue-700 font-bold transition ml-1 underline decoration-blue-500/40 underline-offset-4 cursor-pointer"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ==================== VIEW 2: REGISTER WIZARD ==================== */}
          {view === "register" && (
            <div className="space-y-3 animate-fade-slide">
              {/* Wizard Header & Step Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2
                      className={`text-lg font-extrabold tracking-tight ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {regStep === 1
                        ? "Tạo tài khoản mới"
                        : "Hồ sơ phương tiện"}
                    </h2>
                    <p
                      className={`text-[11px] ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {regStep === 1
                        ? "Bước 1: Thông tin cá nhân & bảo mật"
                        : "Bước 2: Thêm xe để tự động nhận diện biển"}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    {regStep}/2
                  </span>
                </div>

                {/* Progress Indicator */}
                <div
                  className={`w-full rounded-full h-1.5 overflow-hidden flex ${
                    isDark ? "bg-slate-800" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      regStep === 1
                        ? "w-1/2 bg-blue-600"
                        : "w-full bg-gradient-to-r from-blue-600 to-emerald-500"
                    }`}
                  ></div>
                </div>
              </div>

              {/* REGISTER STEP 1: ACCOUNT DETAILS */}
              {regStep === 1 && (
                <form
                  onSubmit={handleRegisterNext}
                  className="space-y-2.5 pt-1"
                >
                  {/* Full Name */}
                  <div>
                    <label
                      className={`block text-[11px] font-semibold mb-1 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      Họ và tên
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        value={regData.fullName}
                        onChange={(e) =>
                          setRegData({ ...regData, fullName: e.target.value })
                        }
                        placeholder="Nguyễn Văn Minh"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border outline-none ${
                          errors.fullName ? "border-rose-500" : ""
                        } ${
                          isDark
                            ? "bg-slate-900/90 border-slate-700 text-white placeholder-slate-500"
                            : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        }`}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-[10px] text-rose-500 mt-0.5 font-medium">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label
                        className={`block text-[11px] font-semibold mb-1 ${
                          isDark ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail size={15} />
                        </div>
                        <input
                          type="email"
                          value={regData.email}
                          onChange={(e) =>
                            setRegData({ ...regData, email: e.target.value })
                          }
                          placeholder="minh.nguyen@gmail.com"
                          className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border outline-none ${
                            errors.email ? "border-rose-500" : ""
                          } ${
                            isDark
                              ? "bg-slate-900/90 border-slate-700 text-white placeholder-slate-500"
                              : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 shadow-sm"
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-[10px] text-rose-500 mt-0.5 font-medium">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className={`block text-[11px] font-semibold mb-1 ${
                          isDark ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        Số điện thoại (Nhận mã OTP)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone size={15} />
                        </div>
                        <input
                          type="tel"
                          value={regData.phone}
                          onChange={(e) =>
                            setRegData({ ...regData, phone: e.target.value })
                          }
                          placeholder="0912 345 678"
                          className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border outline-none ${
                            errors.phone ? "border-rose-500" : ""
                          } ${
                            isDark
                              ? "bg-slate-900/90 border-slate-700 text-white placeholder-slate-500"
                              : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 shadow-sm"
                          }`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-[10px] text-rose-500 mt-0.5 font-medium">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password & Strength Meter */}
                  <div>
                    <label
                      className={`block text-[11px] font-semibold mb-1 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock size={15} />
                      </div>
                      <input
                        type={showRegPassword ? "text" : "password"}
                        value={regData.password}
                        onChange={(e) =>
                          setRegData({ ...regData, password: e.target.value })
                        }
                        placeholder="Ít nhất 6 ký tự"
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-xs border outline-none ${
                          errors.password ? "border-rose-500" : ""
                        } ${
                          isDark
                            ? "bg-slate-900/90 border-slate-700 text-white placeholder-slate-500"
                            : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Password Strength Real-Time Bar */}
                    {regData.password && (
                      <div className="mt-1.5 space-y-1">
                        <div
                          className={`w-full rounded-full h-1 overflow-hidden ${
                            isDark ? "bg-slate-800" : "bg-slate-200"
                          }`}
                        >
                          <div
                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                            style={{ width: passwordStrength.width }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span
                            className={
                              isDark ? "text-slate-400" : "text-slate-500"
                            }
                          >
                            Độ mạnh mật khẩu:
                          </span>
                          <span
                            className={`font-semibold ${passwordStrength.textColor}`}
                          >
                            {passwordStrength.text}
                          </span>
                        </div>
                      </div>
                    )}
                    {errors.password && (
                      <p className="text-[10px] text-rose-500 mt-0.5 font-medium">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      className={`block text-[11px] font-semibold mb-1 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <ShieldCheck size={15} />
                      </div>
                      <input
                        type={showRegConfirm ? "text" : "password"}
                        value={regData.confirmPassword}
                        onChange={(e) =>
                          setRegData({
                            ...regData,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Nhập lại mật khẩu"
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-xs border outline-none ${
                          errors.confirmPassword ? "border-rose-500" : ""
                        } ${
                          isDark
                            ? "bg-slate-900/90 border-slate-700 text-white placeholder-slate-500"
                            : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirm(!showRegConfirm)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showRegConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[10px] text-rose-500 mt-0.5 font-medium">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Button Next Step */}
                  <button
                    type="submit"
                    className="w-full min-h-[48px] mt-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
                  >
                    <span>Tiếp tục (Thêm hồ sơ xe)</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {/* REGISTER STEP 2: VEHICLE PROFILE */}
              {regStep === 2 && (
                <div className="space-y-3.5 pt-1 animate-fade-slide">
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                      isDark
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                        : "bg-blue-50 border-blue-200 text-blue-800"
                    }`}
                  >
                    <Info
                      size={18}
                      className="shrink-0 text-blue-600 mt-0.5"
                    />
                    <span>
                      Thêm biển số xe giúp hệ thống camera AI tự động mở barie
                      khi bạn đến bãi xe EZ-Space mà không cần quét thẻ!
                    </span>
                  </div>

                  {/* License Plate Input */}
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-1.5 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      Biển số xe của bạn (Ví dụ: 51K-889.92)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Car size={16} />
                      </div>
                      <input
                        type="text"
                        value={regData.licensePlate}
                        onChange={(e) =>
                          setRegData({
                            ...regData,
                            licensePlate: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="51K-889.92"
                        className={`w-full pl-10 pr-3.5 py-3 rounded-2xl text-xs font-mono font-bold tracking-wider uppercase border outline-none ${
                          isDark
                            ? "bg-slate-900 border-slate-700 text-amber-300 placeholder-slate-500"
                            : "bg-white border-slate-300 text-blue-700 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 shadow-sm"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Vehicle Type Card Selector (Sedan / SUV / EV) */}
                  <div>
                    <label
                      className={`block text-xs font-semibold mb-2 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      Chọn phân loại xe
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Sedan */}
                      <div
                        onClick={() =>
                          setRegData({ ...regData, vehicleType: "sedan" })
                        }
                        className={`cursor-pointer p-2.5 rounded-2xl border text-center transition-all transform active:scale-95 ${
                          regData.vehicleType === "sedan"
                            ? isDark
                              ? "border-blue-500 bg-blue-600/20 shadow-md shadow-blue-500/20 scale-[1.02]"
                              : "border-blue-600 bg-blue-50 text-blue-900 shadow-sm scale-[1.02]"
                            : isDark
                            ? "border-slate-800 bg-slate-900/70 opacity-70"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 mx-auto mb-1.5 rounded-full flex items-center justify-center ${
                            regData.vehicleType === "sedan"
                              ? "bg-blue-600 text-white"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          <Car size={18} />
                        </div>
                        <p className="text-[11px] font-bold">Sedan</p>
                        <p
                          className={`text-[9px] ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Xe 4-5 chỗ
                        </p>
                        {regData.vehicleType === "sedan" && (
                          <div className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-600">
                            <Check size={11} /> Đã chọn
                          </div>
                        )}
                      </div>

                      {/* SUV / MPV */}
                      <div
                        onClick={() =>
                          setRegData({ ...regData, vehicleType: "suv" })
                        }
                        className={`cursor-pointer p-2.5 rounded-2xl border text-center transition-all transform active:scale-95 ${
                          regData.vehicleType === "suv"
                            ? isDark
                              ? "border-blue-500 bg-blue-600/20 shadow-md shadow-blue-500/20 scale-[1.02]"
                              : "border-blue-600 bg-blue-50 text-blue-900 shadow-sm scale-[1.02]"
                            : isDark
                            ? "border-slate-800 bg-slate-900/70 opacity-70"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 mx-auto mb-1.5 rounded-full flex items-center justify-center ${
                            regData.vehicleType === "suv"
                              ? "bg-indigo-600 text-white"
                              : "bg-indigo-100 text-indigo-600"
                          }`}
                        >
                          <Truck size={18} />
                        </div>
                        <p className="text-[11px] font-bold">SUV / MPV</p>
                        <p
                          className={`text-[9px] ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Gầm cao
                        </p>
                        {regData.vehicleType === "suv" && (
                          <div className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-600">
                            <Check size={11} /> Đã chọn
                          </div>
                        )}
                      </div>

                      {/* EV Electric Car */}
                      <div
                        onClick={() =>
                          setRegData({ ...regData, vehicleType: "ev" })
                        }
                        className={`cursor-pointer p-2.5 rounded-2xl border text-center transition-all transform active:scale-95 ${
                          regData.vehicleType === "ev"
                            ? isDark
                              ? "border-emerald-500 bg-emerald-600/20 shadow-md shadow-emerald-500/20 scale-[1.02]"
                              : "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm scale-[1.02]"
                            : isDark
                            ? "border-slate-800 bg-slate-900/70 opacity-70"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 mx-auto mb-1.5 rounded-full flex items-center justify-center ${
                            regData.vehicleType === "ev"
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-100 text-emerald-600"
                          }`}
                        >
                          <Zap size={18} />
                        </div>
                        <p className="text-[11px] font-bold">Xe Điện</p>
                        <p
                          className={`text-[9px] ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Cổng sạc EV
                        </p>
                        {regData.vehicleType === "ev" && (
                          <div className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                            <Check size={11} /> Đã chọn
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Agree Terms Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regData.agreeTerms}
                        onChange={(e) =>
                          setRegData({
                            ...regData,
                            agreeTerms: e.target.checked,
                          })
                        }
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className={`text-[11px] leading-relaxed ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        Tôi đồng ý với{" "}
                        <a
                          href="#terms"
                          onClick={(e) => {
                            e.preventDefault();
                            addToast(
                              "Điều khoản dịch vụ đỗ xe thông minh EZ-Space.",
                              "info"
                            );
                          }}
                          className="text-blue-600 font-semibold underline"
                        >
                          Điều khoản dịch vụ
                        </a>{" "}
                        và{" "}
                        <a
                          href="#privacy"
                          onClick={(e) => {
                            e.preventDefault();
                            addToast(
                              "Chính sách bảo mật dữ liệu khách hàng.",
                              "info"
                            );
                          }}
                          className="text-blue-600 font-semibold underline"
                        >
                          Chính sách bảo mật
                        </a>
                      </span>
                    </label>
                    {errors.agreeTerms && (
                      <p className="text-[10px] text-rose-500 font-medium mt-1">
                        {errors.agreeTerms}
                      </p>
                    )}
                  </div>

                  {/* Buttons: Submit or Skip */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRegisterSubmit(false)}
                      disabled={status === "loading"}
                      className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
                    >
                      {status === "loading" ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={17} className="animate-spin" />
                          Đang tạo tài khoản...
                        </span>
                      ) : (
                        <>
                          <UserCheck size={16} />
                          <span>Hoàn tất & Đăng ký</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                          isDark
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <ChevronLeft size={15} />
                        Quay lại bước 1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegisterSubmit(true)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold underline cursor-pointer ${
                          isDark
                            ? "text-slate-400 hover:text-amber-400 decoration-slate-600"
                            : "text-slate-500 hover:text-blue-600 decoration-slate-400"
                        }`}
                      >
                        Bỏ qua bước này
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Back to login option */}
              <div className="pt-2 text-center">
                <p
                  className={`text-xs ${
                    isDark ? "text-slate-400" : "text-slate-600 font-medium"
                  }`}
                >
                  Đã có tài khoản EZ-Space?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setErrors({});
                    }}
                    className="text-blue-600 hover:text-blue-700 font-bold transition ml-1 underline decoration-blue-500/40 cursor-pointer"
                  >
                    Đăng nhập ngay
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PHONE BOTTOM INDICATOR BAR */}
        <div className="w-full py-2 flex justify-center items-center pointer-events-none z-50">
          <div
            className={`w-32 h-1 rounded-full ${
              isDark ? "bg-slate-700" : "bg-slate-400/80"
            }`}
          ></div>
        </div>
      </div>
    </div>
  );
}
