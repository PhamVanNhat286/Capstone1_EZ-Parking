"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { 
  User, History, CarFront, Wallet, Bell, HelpCircle, LogOut, 
  ChevronRight, CheckCircle2, Phone, KeyRound, Pencil
} from "lucide-react";
import { clsx } from "clsx";
import BottomSheet from "@/components/ui/BottomSheet";

export default function ProfilePage() {
  const router = useRouter();
  const { user, settings, setSettings, linkedWallet, toggleWallet, logout } = useStore();
  const [sheet, setSheet] = useState<"none" | "wallet" | "help" | "logout" | "change-pass" | "edit-info">("none");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Change password form state
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // Edit info form state
  const [editName, setEditName] = useState(user?.name ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");

  if (!user) return null;

  const toggleNotif = () => {
    setSettings({ notifications: !settings.notifications });
  };

  const handleLogout = () => {
    logout();
    router.push("/dang-nhap");
  };

  const Row = ({ icon: Icon, label, value, onClick, isToggle, toggleValue, danger }: any) => (
    <button
      onClick={onClick}
      className={clsx(
        "w-full bg-white p-4 flex items-center justify-between transition-colors active:bg-slate-50",
        danger ? "text-red-500" : "text-slate-700"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={danger ? "text-red-400" : "text-slate-400"} />
        <span className="font-bold text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-medium text-slate-400">{value}</span>}
        {isToggle ? (
          <div className={clsx("w-12 h-6 rounded-full transition-colors relative flex items-center", toggleValue ? "bg-[#2B4BD1]" : "bg-slate-200")}>
            <div className={clsx("w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute", toggleValue ? "translate-x-[26px]" : "translate-x-[2px]")} />
          </div>
        ) : (
          <ChevronRight size={16} className={danger ? "text-red-400" : "text-slate-300"} />
        )}
      </div>
    </button>
  );

  const faqs = [
    { q: "Làm sao để hủy đặt chỗ?", a: "Bạn có thể hủy đặt chỗ miễn phí trong 5 phút đầu tiên. Sau 5 phút, phí cọc sẽ không được hoàn lại." },
    { q: "Thời gian giữ chỗ là bao lâu?", a: "Hệ thống giữ chỗ cho bạn tối đa 20 phút kể từ lúc thanh toán cọc thành công." },
    { q: "Tôi muốn thay đổi biển số xe?", a: "Vào mục 'Xe của tôi' để thêm xe mới hoặc chỉnh sửa biển số xe hiện tại." }
  ];

  return (
    <div className="bg-slate-50 pb-6">

      {/* Blue header — compact, flush to top */}
      <div className="bg-[#2B4BD1] pt-4 pb-16 px-5 text-white">
        <h1 className="text-xl font-black mb-4">Hồ sơ</h1>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shrink-0">
            <User size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">{user.name}</h2>
            <p className="text-blue-200 text-sm font-medium">{user.phone}</p>
          </div>
        </div>
      </div>

      {/* All feature rows in one frame */}
      <div className="-mt-10 mx-4 relative z-10 space-y-3">
        <div className="rounded-[20px] overflow-hidden shadow-sm border border-slate-100 divide-y divide-slate-100">
          <Row icon={History}    label="Đặt chỗ và lịch sử"      onClick={() => router.push("/lich-su")} />
          <Row icon={CarFront}   label="Xe của tôi"               onClick={() => router.push("/xe-cua-toi")} />
          <Row icon={Wallet}     label="Ví thanh toán sandbox"    value={linkedWallet ? "Đã liên kết" : "Chưa liên kết"} onClick={() => setSheet("wallet")} />
          <Row icon={Pencil}     label="Sửa thông tin cá nhân"    onClick={() => { setEditName(user.name); setEditPhone(user.phone); setSheet("edit-info"); }} />
          <Row icon={KeyRound}   label="Đổi mật khẩu"            onClick={() => { setOldPass(""); setNewPass(""); setConfirmPass(""); setSheet("change-pass"); }} />
          <Row icon={Bell}       label="Thông báo"                isToggle toggleValue={settings.notifications} onClick={toggleNotif} />
          <Row icon={HelpCircle} label="Trợ giúp & FAQ"          onClick={() => setSheet("help")} />
          <Row icon={LogOut}     label="Đăng xuất"                danger onClick={() => setSheet("logout")} />
        </div>
      </div>

      {/* ── Wallet sheet ── */}
      <BottomSheet isOpen={sheet === "wallet"} onClose={() => setSheet("none")} title="Ví thanh toán Sandbox">
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-[16px] border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-100 text-pink-600 font-black rounded-xl flex items-center justify-center text-xl">M</div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900">Ví MoMo (Sandbox)</h4>
              <p className="text-xs font-medium text-slate-500">Dùng để giả lập thanh toán</p>
            </div>
            {linkedWallet && <CheckCircle2 className="text-emerald-500" size={20} />}
          </div>
          <button
            onClick={() => { toggleWallet(); setSheet("none"); }}
            className={clsx("w-full font-bold py-4 rounded-[16px] active:scale-95 transition-transform",
              linkedWallet ? "bg-red-50 text-red-600" : "bg-[#2B4BD1] text-white shadow-lg shadow-[#2B4BD1]/30"
            )}
          >
            {linkedWallet ? "Hủy liên kết" : "Liên kết ngay"}
          </button>
        </div>
      </BottomSheet>

      {/* ── Help sheet ── */}
      <BottomSheet isOpen={sheet === "help"} onClose={() => setSheet("none")} title="Trợ giúp & FAQ">
        <div className="space-y-3 mb-6">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-slate-50 rounded-[16px] border border-slate-100 overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-slate-900 text-sm"
              >
                {faq.q}
                <ChevronRight size={16} className={clsx("text-slate-400 transition-transform", faqOpen === i && "rotate-90")} />
              </button>
              {faqOpen === i && (
                <div className="px-4 pb-4 text-sm text-slate-600 font-medium">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
        <a href="tel:1900-6868" className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 flex items-center justify-center gap-2">
          <Phone size={18} /> Gọi tổng đài 1900-6868
        </a>
      </BottomSheet>

      {/* ── Logout sheet ── */}
      <BottomSheet isOpen={sheet === "logout"} onClose={() => setSheet("none")} title="Đăng xuất">
        <p className="text-center text-sm font-medium text-slate-500 mb-6">Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?</p>
        <div className="flex gap-3">
          <button onClick={() => setSheet("none")} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-[16px] active:scale-95">Không</button>
          <button onClick={handleLogout} className="flex-1 bg-red-500 text-white font-bold py-4 rounded-[16px] active:scale-95">Đăng xuất</button>
        </div>
      </BottomSheet>

      {/* ── Change password sheet ── */}
      <BottomSheet isOpen={sheet === "change-pass"} onClose={() => setSheet("none")} title="Đổi mật khẩu">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={oldPass}
              onChange={e => setOldPass(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#2B4BD1] focus:ring-1 focus:ring-[#2B4BD1] transition"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Mật khẩu mới</label>
            <input
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#2B4BD1] focus:ring-1 focus:ring-[#2B4BD1] transition"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#2B4BD1] focus:ring-1 focus:ring-[#2B4BD1] transition"
            />
          </div>
          <button
            onClick={() => {
              if (!oldPass || !newPass || newPass !== confirmPass) return;
              setSheet("none");
            }}
            disabled={!oldPass || !newPass || newPass !== confirmPass}
            className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed mt-2 shadow-lg shadow-[#2B4BD1]/30"
          >
            Xác nhận đổi mật khẩu
          </button>
        </div>
      </BottomSheet>

      {/* ── Edit info sheet ── */}
      <BottomSheet isOpen={sheet === "edit-info"} onClose={() => setSheet("none")} title="Sửa thông tin cá nhân">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Họ và tên</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Nhập họ và tên"
              className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#2B4BD1] focus:ring-1 focus:ring-[#2B4BD1] transition"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Số điện thoại</label>
            <input
              type="tel"
              value={editPhone}
              onChange={e => setEditPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#2B4BD1] focus:ring-1 focus:ring-[#2B4BD1] transition"
            />
          </div>
          <button
            onClick={() => setSheet("none")}
            disabled={!editName.trim() || !editPhone.trim()}
            className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed mt-2 shadow-lg shadow-[#2B4BD1]/30"
          >
            Lưu thay đổi
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
