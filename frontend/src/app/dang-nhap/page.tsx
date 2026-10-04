"use client";
import { useState } from "react";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import BottomSheet from "@/components/ui/BottomSheet";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const router = useRouter();
  const login = useStore((s) => s.login);
  const addToast = useStore((s) => s.addToast);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [pwdError, setPwdError] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Sheets state
  const [sheetContent, setSheetContent] = useState<"none" | "forgot" | "terms" | "privacy">("none");

  const validateEmail = (val: string) => {
    if (!val) return "Email không được để trống";
    const re = /\S+@\S+\.\S+/;
    if (!re.test(val)) return "Định dạng email không hợp lệ";
    return "";
  };

  const validatePassword = (val: string) => {
    if (!val) return "Mật khẩu không được để trống";
    if (val.length < 6) return "Mật khẩu phải từ 6 ký tự trở lên";
    return "";
  };

  const handleBlurEmail = () => setEmailError(validateEmail(email));
  const handleBlurPwd = () => setPwdError(validatePassword(password));

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    
    if (eErr || pErr) {
      setEmailError(eErr);
      setPwdError(pErr);
      triggerShake();
      return;
    }

    setIsLoading(true);
    // Simulate API call 600ms
    await new Promise((r) => setTimeout(r, 600));
    
    login();
    addToast(activeTab === "login" ? "Đăng nhập thành công!" : "Tạo tài khoản thành công!", "success");
    router.push("/");
  };

  const handleSocial = async (provider: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    login();
    addToast(`Đăng nhập bằng ${provider} thành công!`, "success");
    router.push("/");
  };

  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score += 33;
    if (/[A-Z]/.test(password)) score += 33;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 34;
    return score;
  };
  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/4" />

      <div className="relative z-10 w-full max-w-sm mx-auto pt-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#2B4BD1] rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-[#2B4BD1]/30">
            <span className="text-white font-black text-2xl">P</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">EZ-Space</h1>
          <p className="text-slate-500 font-medium">Đỗ xe thông minh, nhàn hạ</p>
        </div>

        {/* Sliding Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-[18px] mb-8 relative">
          {["login", "register"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                setEmailError("");
                setPwdError("");
              }}
              className={clsx(
                "flex-1 py-3 text-sm font-bold relative z-10 transition-colors",
                activeTab === tab ? "text-[#2B4BD1]" : "text-slate-500"
              )}
            >
              {tab === "login" ? "Đăng nhập" : "Đăng ký"}
              {activeTab === tab && (
                <motion.div
                  layoutId="auth-tab"
                  className="absolute inset-0 bg-white rounded-[14px] shadow-sm -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        <motion.form 
          onSubmit={handleAuth} 
          className="space-y-4"
          animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={20} className={emailError ? "text-red-400" : "text-slate-400"} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                onBlur={handleBlurEmail}
                placeholder="Email của bạn"
                className={clsx(
                  "w-full bg-slate-50 border rounded-[16px] py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-all",
                  emailError ? "border-red-400 ring-2 ring-red-100 bg-red-50/50" : "border-slate-200 focus:border-[#2B4BD1] focus:ring-2 focus:ring-[#2B4BD1]/20"
                )}
              />
            </div>
            <AnimatePresence>
              {emailError && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-xs font-bold mt-1.5 pl-2">
                  {emailError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={20} className={pwdError ? "text-red-400" : "text-slate-400"} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwdError(""); }}
                onBlur={handleBlurPwd}
                placeholder="Mật khẩu"
                className={clsx(
                  "w-full bg-slate-50 border rounded-[16px] py-4 pl-12 pr-12 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-all",
                  pwdError ? "border-red-400 ring-2 ring-red-100 bg-red-50/50" : "border-slate-200 focus:border-[#2B4BD1] focus:ring-2 focus:ring-[#2B4BD1]/20"
                )}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <AnimatePresence>
              {pwdError && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-xs font-bold mt-1.5 pl-2">
                  {pwdError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Password strength bar for register */}
            <AnimatePresence>
              {activeTab === "register" && password.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2.5 space-y-1.5">
                  <div className="flex gap-1 h-1.5">
                    <div className={clsx("flex-1 rounded-full transition-colors", strength > 0 ? (strength <= 33 ? "bg-red-500" : strength <= 66 ? "bg-amber-400" : "bg-emerald-500") : "bg-slate-200")} />
                    <div className={clsx("flex-1 rounded-full transition-colors", strength > 33 ? (strength <= 66 ? "bg-amber-400" : "bg-emerald-500") : "bg-slate-200")} />
                    <div className={clsx("flex-1 rounded-full transition-colors", strength > 66 ? "bg-emerald-500" : "bg-slate-200")} />
                  </div>
                  <p className={clsx("text-xs font-bold text-right", strength <= 33 ? "text-red-500" : strength <= 66 ? "text-amber-500" : "text-emerald-500")}>
                    {strength <= 33 ? "Yếu" : strength <= 66 ? "Trung bình" : "Mạnh"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {activeTab === "login" && (
            <div className="text-right pb-1">
              <button type="button" onClick={() => setSheetContent("forgot")} className="text-xs font-bold text-[#2B4BD1] hover:underline">
                Quên mật khẩu?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] shadow-lg shadow-[#2B4BD1]/30 hover:bg-blue-700 transition active:scale-[0.98] mt-2 flex items-center justify-center disabled:opacity-70 disabled:scale-100"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              activeTab === "login" ? "Đăng nhập" : "Tạo tài khoản"
            )}
          </button>
        </motion.form>

        <div className="mt-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hoặc</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button disabled={isLoading} onClick={() => handleSocial("Google")} className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-[16px] border border-slate-200 font-bold text-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </button>
          <button disabled={isLoading} onClick={() => handleSocial("Apple")} className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-[16px] border border-slate-200 font-bold text-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.88 3.58-.8 1.54.12 2.81.79 3.59 2.01-3.02 1.76-2.52 5.92.51 7.07-.68 1.69-1.52 3.12-2.76 3.89zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.3-1.89 4.29-3.74 4.25z"/></svg>
            Apple
          </button>
        </div>

        {activeTab === "register" && (
          <p className="text-center mt-6 text-xs font-medium text-slate-500 px-4">
            Bằng việc đăng ký, bạn đồng ý với{" "}
            <button onClick={() => setSheetContent("terms")} className="font-bold text-[#2B4BD1] hover:underline">Điều khoản</button>
            {" "}và{" "}
            <button onClick={() => setSheetContent("privacy")} className="font-bold text-[#2B4BD1] hover:underline">Chính sách</button>
            {" "}của chúng tôi
          </p>
        )}
      </div>

      {/* Sheets */}
      <BottomSheet isOpen={sheetContent === "forgot"} onClose={() => setSheetContent("none")} title="Quên mật khẩu">
        <p className="text-sm font-medium text-slate-500 mb-6">
          Vui lòng nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn khôi phục mật khẩu.
        </p>
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Mail size={20} className="text-slate-400" />
          </div>
          <input type="email" placeholder="Email của bạn" className="w-full bg-slate-50 border border-slate-200 rounded-[16px] py-4 pl-12 pr-4 text-sm font-medium text-slate-900 focus:border-[#2B4BD1] outline-none" />
        </div>
        <button 
          onClick={() => {
            setSheetContent("none");
            addToast("Đã gửi hướng dẫn khôi phục (giả lập)", "success");
          }}
          className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform"
        >
          Gửi hướng dẫn
        </button>
      </BottomSheet>

      <BottomSheet isOpen={sheetContent === "terms"} onClose={() => setSheetContent("none")} title="Điều khoản sử dụng">
        <div className="prose prose-sm prose-slate text-sm font-medium text-slate-600">
          <p>1. Bạn phải cung cấp thông tin chính xác khi đặt chỗ.</p>
          <p>2. Phí cọc sẽ không được hoàn lại nếu bạn hủy quá 5 phút sau khi đặt.</p>
          <p>3. EZ-Space có quyền từ chối phục vụ nếu phát hiện gian lận.</p>
        </div>
        <button onClick={() => setSheetContent("none")} className="w-full mt-6 bg-slate-100 text-slate-900 font-bold py-4 rounded-[16px] active:scale-95 transition-transform">
          Đã hiểu
        </button>
      </BottomSheet>

      <BottomSheet isOpen={sheetContent === "privacy"} onClose={() => setSheetContent("none")} title="Chính sách bảo mật">
        <div className="prose prose-sm prose-slate text-sm font-medium text-slate-600">
          <p>Chúng tôi cam kết bảo vệ thông tin cá nhân (Biển số xe, SĐT, Email) của bạn an toàn bằng công nghệ mã hóa. Thông tin chỉ được dùng để liên lạc và nhận diện khi bạn vào bãi đỗ.</p>
        </div>
        <button onClick={() => setSheetContent("none")} className="w-full mt-6 bg-slate-100 text-slate-900 font-bold py-4 rounded-[16px] active:scale-95 transition-transform">
          Đã hiểu
        </button>
      </BottomSheet>
    </div>
  );
}
