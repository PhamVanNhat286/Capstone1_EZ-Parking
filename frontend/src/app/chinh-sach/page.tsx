"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Clock,
  RotateCcw,
  Car,
  Lock,
  PhoneCall,
  Mail,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function PolicyPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-full bg-slate-50 flex flex-col font-sans text-slate-800 antialiased pb-12">
      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-30 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition flex items-center justify-center text-slate-700 cursor-pointer"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Chính sách & Quy định</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Nền tảng đỗ xe thông minh EZ-Space</p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center">
          <ShieldCheck size={18} />
        </div>
      </header>

      {/* 2. BODY CONTENT */}
      <main className="flex-1 px-4 pt-4 space-y-3.5">
        {/* Banner giới thiệu */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-bold text-white mb-2">
              Phiên bản 2026 • Cập nhật mới nhất
            </span>
            <h2 className="text-sm font-bold leading-snug">Quy định dịch vụ & Quyền lợi khách hàng</h2>
            <p className="text-[11px] text-blue-100 mt-1 leading-relaxed">
              EZ-Space cam kết xây dựng hệ sinh thái đỗ xe thông minh văn minh, tiện lợi, minh bạch và đảm bảo quyền lợi tối đa cho mọi tài xế.
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Mục 1: Đặt cọc & Giữ chỗ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Điều khoản 1</span>
              <h3 className="text-xs font-bold text-slate-900">Đặt cọc & Giữ chỗ độc quyền</h3>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 leading-relaxed pl-1 space-y-1.5 pt-1">
            <p>
              • Người dùng đặt cọc <strong className="text-slate-900 font-bold">50.000₫ / lượt</strong> để tiến hành giữ chỗ tại bãi đỗ mong muốn.
            </p>
            <p>
              • Vị trí ô đỗ bạn chọn sẽ được khóa độc quyền trong <strong className="text-slate-900 font-bold">10 phút</strong> trên hệ thống, đảm bảo không có bất kỳ phương tiện nào khác đỗ vào.
            </p>
            <p>
              • Tiền cọc sẽ được trừ trực tiếp vào hóa đơn thanh toán khi bạn hoàn tất lượt đỗ tại bãi.
            </p>
          </div>
        </div>

        {/* Mục 2: Thời hạn đến bãi */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Điều khoản 2</span>
              <h3 className="text-xs font-bold text-slate-900">Thời hạn di chuyển đến bãi đỗ</h3>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 leading-relaxed pl-1 space-y-1.5 pt-1">
            <p>
              • Vé có thể quét sớm tối đa <strong className="text-slate-900 font-bold">20 phút trước giờ vào đã đặt</strong> nếu ô đỗ đã sẵn sàng. Hạn đến trễ là 20 phút sau giờ vào đã đặt.
            </p>
            <p>
              • Khi đến cổng bãi đỗ, camera nhận diện biển số tự động hoặc bạn quét mã QR vé đỗ tại trụ barie để mở cổng vào bãi.
            </p>
            <p>
              • Quá hạn đến trễ mà chưa check-in, hệ thống hủy lượt đặt và xử lý cọc theo quy định.
            </p>
          </div>
        </div>

        {/* Mục 3: Hoàn cọc */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <RotateCcw size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Điều khoản 3</span>
              <h3 className="text-xs font-bold text-slate-900">Chính sách hoàn cọc 100% linh hoạt</h3>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 leading-relaxed pl-1 space-y-1.5 pt-1">
            <p>
              • Trường hợp bạn đổi lộ trình, bạn có thể chủ động hủy giữ chỗ trực tiếp trong mục <strong className="text-slate-900 font-bold">Vé đang đỗ</strong>.
            </p>
            <p>
              • Nếu hủy trong vòng <strong className="text-emerald-700 font-bold">5 phút đầu tiên</strong>, toàn bộ <strong className="text-emerald-700 font-bold">100% tiền cọc (50.000₫)</strong> sẽ được hoàn tự động về ví hoặc tài khoản ngân hàng của bạn.
            </p>
            <p>
              • Nếu bãi đỗ xảy ra sự cố đột xuất hoặc barie không mở được do lỗi kỹ thuật của hệ thống, EZ-Space cam kết hoàn cọc 100% và hỗ trợ chuyển sang bãi đỗ lân cận.
            </p>
          </div>
        </div>

        {/* Mục 4: An toàn bãi đỗ & Trạm sạc EV */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Car size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Điều khoản 4</span>
              <h3 className="text-xs font-bold text-slate-900">Quy chuẩn đỗ xe & Trạm sạc EV</h3>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 leading-relaxed pl-1 space-y-1.5 pt-1">
            <p>
              • Vui lòng đỗ đúng ô số đã hướng dẫn, đúng vạch kẻ và phù hợp kích thước phương tiện (Sedan, SUV, EV).
            </p>
            <p>
              • Đối với vị trí có trụ sạc xe điện EV: Vui lòng di chuyển xe ra ô đỗ thông thường sau khi hoàn thành quá trình sạc để nhường trụ sạc cho tài xế khác.
            </p>
            <p>
              • Tắt máy, gập gương, khóa xe cẩn thận và không để lại các tài sản có giá trị lớn hoặc chất dễ cháy nổ trên xe.
            </p>
          </div>
        </div>

        {/* Mục 5: Bảo mật thông tin */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Điều khoản 5</span>
              <h3 className="text-xs font-bold text-slate-900">Bảo mật thông tin & Quyền riêng tư</h3>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 leading-relaxed pl-1 space-y-1.5 pt-1">
            <p>
              • Mọi dữ liệu về biển số xe, số điện thoại, định vị GPS và lịch sử giao dịch được bảo mật tuyệt đối theo chuẩn mã hóa SSL/TLS 256-bit.
            </p>
            <p>
              • Thông tin vị trí GPS chỉ được sử dụng cho mục đích tìm kiếm bãi xe gần nhất và điều hướng đến vị trí đỗ, tuyệt đối không chia sẻ cho bên thứ ba.
            </p>
          </div>
        </div>

        {/* Mục 6: Hotline & Hỗ trợ */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 border border-blue-100 space-y-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <HelpCircle size={18} className="text-primary" />
            <h3 className="text-xs font-bold">Kênh hỗ trợ khách hàng 24/7</h3>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Nếu bạn gặp bất kỳ vấn đề nào trong quá trình đặt chỗ, di chuyển hoặc thanh toán tại bãi, vui lòng liên hệ ngay với chúng tôi:
          </p>
          
          <div className="grid grid-cols-1 gap-2 pt-1">
            <a
              href="tel:19006868"
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-200 hover:border-primary transition shadow-2xs group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                  <PhoneCall size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Tổng đài hỗ trợ khẩn cấp</div>
                  <div className="text-xs font-extrabold text-primary">1900 6868 (24/7)</div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-primary px-2.5 py-1 bg-blue-50 rounded-lg">Gọi ngay</span>
            </a>

            <div className="flex items-center space-x-2.5 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Mail size={16} />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Hỗ trợ qua thư điện tử</div>
                <div className="text-xs font-bold text-slate-700">hotro@ezspace.vn</div>
              </div>
            </div>
          </div>
        </div>

        {/* Nút hoàn tất quay lại */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-3 bg-primary text-white font-bold rounded-2xl shadow-md shadow-primary/20 hover:bg-primary-dark active:scale-95 transition text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Tôi đã hiểu & Quay lại</span>
          </button>
        </div>
      </main>
    </div>
  );
}
