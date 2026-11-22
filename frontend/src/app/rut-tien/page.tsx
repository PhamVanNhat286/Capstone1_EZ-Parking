"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Wallet,
  CheckCircle2,
  Plus,
  ShieldCheck,
  AlertCircle,
  Clock,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { useStore, type SavedPaymentAccount } from "@/store";
import { withdrawWalletApi, getWalletApi } from "@/lib/api";

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000];

export default function WithdrawPage() {
  const router = useRouter();
  const {
    user,
    walletBalance,
    setWalletBalance,
    updateWalletBalance,
    savedPaymentAccounts,
    addToast,
  } = useStore();

  // Chỉ lấy các tài khoản ngân hàng (banking)
  const bankAccounts = savedPaymentAccounts.filter(
    (acc) => acc.type === "banking" || (acc.bankName && acc.accountNumber)
  );

  // Tài khoản được chọn: Mặc định chọn tài khoản default hoặc tài khoản đầu tiên
  const defaultAcc = bankAccounts.find((a) => a.isDefault) || bankAccounts[0];
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    defaultAcc ? defaultAcc.id : ""
  );

  useEffect(() => {
    if (!selectedAccountId && bankAccounts.length > 0) {
      const def = bankAccounts.find((a) => a.isDefault) || bankAccounts[0];
      if (def) setSelectedAccountId(def.id);
    }
  }, [bankAccounts, selectedAccountId]);

  // Cập nhật số dư ví thực tế từ backend khi vào trang
  useEffect(() => {
    if (user?.token) {
      getWalletApi(user.token).then((res) => {
        if (res.success && res.data?.balance !== undefined) {
          setWalletBalance(Number(res.data.balance));
        }
      });
    }
  }, [user?.token, setWalletBalance]);

  // Số tiền muốn rút
  const [amountStr, setAmountStr] = useState<string>(
    walletBalance > 0 ? String(walletBalance) : "50000"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    txId?: number | string;
  } | null>(null);

  const withdrawAmount = Number(amountStr) || 0;
  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId);

  // Xử lý xác nhận rút tiền
  const handleConfirmWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccount) {
      addToast("Vui lòng chọn tài khoản ngân hàng nhận tiền", "error");
      return;
    }

    if (withdrawAmount < 10000) {
      addToast("Số tiền rút tối thiểu là 10.000đ", "error");
      return;
    }

    if (withdrawAmount > walletBalance) {
      addToast(`Số dư không đủ (Khả dụng: ${walletBalance.toLocaleString("vi-VN")}đ)`, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (user?.token) {
        const res = await withdrawWalletApi(
          user.token,
          {
            amount: withdrawAmount,
            bank_name: selectedAccount.bankName || "Ngân hàng liên kết",
            account_number: selectedAccount.accountNumber,
            account_name: selectedAccount.accountName,
          }
        );

        if (res.success) {
          updateWalletBalance(-withdrawAmount);
          setSuccessData({
            amount: withdrawAmount,
            bankName: selectedAccount.bankName || "Ngân hàng liên kết",
            accountNumber: selectedAccount.accountNumber,
            accountName: selectedAccount.accountName,
            txId: res.data?.transaction?.id || `WTX-${Date.now()}`,
          });
          addToast(res.message || "Rút tiền thành công!", "success");
        } else {
          addToast(res.message || "Rút tiền thất bại. Vui lòng thử lại.", "error");
        }
      } else {
        // Fallback local state nếu chưa có token
        updateWalletBalance(-withdrawAmount);
        setSuccessData({
          amount: withdrawAmount,
          bankName: selectedAccount.bankName || "Ngân hàng liên kết",
          accountNumber: selectedAccount.accountNumber,
          accountName: selectedAccount.accountName,
          txId: `WTX-${Date.now()}`,
        });
        addToast("Rút tiền về tài khoản ngân hàng thành công!", "success");
      }
    } catch (err: any) {
      addToast(err.message || "Lỗi kết nối khi gửi yêu cầu rút tiền", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Màn hình giao dịch thành công
  if (successData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between max-w-[480px] mx-auto text-slate-800">
        <header className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <button
            onClick={() => router.push("/ho-so")}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">Kết quả giao dịch</h1>
          <div className="w-9" />
        </header>

        <div className="p-6 flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
            Rút tiền thành công
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            +{successData.amount.toLocaleString("vi-VN")}đ
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
            Hệ thống đã gửi lệnh chuyển tiền Napas 247 tới tài khoản ngân hàng của bạn.
          </p>

          {/* Chi tiết tài khoản nhận */}
          <div className="w-full bg-white rounded-3xl p-4.5 border border-slate-100 shadow-soft mt-6 text-left space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span>Mã giao dịch:</span>
              <span className="font-mono font-bold text-slate-800">#{successData.txId}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Ngân hàng nhận:</span>
              <span className="font-bold text-slate-900">{successData.bankName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Số tài khoản:</span>
              <span className="font-bold text-slate-900 tracking-wider">
                {successData.accountNumber}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Chủ tài khoản:</span>
              <span className="font-bold text-slate-900">{successData.accountName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Thời gian thực hiện:</span>
              <span className="font-medium text-slate-700">
                {new Date().toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center font-bold">
              <span className="text-slate-700">Phí giao dịch:</span>
              <span className="text-emerald-600">Miễn phí (0đ)</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 space-y-2">
          <button
            onClick={() => router.push("/ho-so")}
            className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-md hover:bg-primary-dark active:scale-[0.98] transition cursor-pointer"
          >
            Về trang cá nhân
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between max-w-[480px] mx-auto pb-8">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-xs">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold text-slate-900">Rút tiền</h1>
        </div>
        <div className="w-9" />
      </header>

      <form onSubmit={handleConfirmWithdraw} className="p-4 space-y-4 flex-1">
        {/* SỐ DƯ VÍ HIỆN TẠI */}
        <section className="bg-white rounded-3xl p-4 shadow-soft border border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-primary border border-blue-100 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Số dư khả dụng</span>
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {walletBalance.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>
        </section>

        {/* MỤC: CHỌN TÀI KHOẢN NGÂN HÀNG (CHỈ LỰA CHỌN, BẤM THÊM ĐIỀU HƯỚNG SANG PHƯƠNG THỨC THANH TOÁN) */}
        <section className="bg-white rounded-3xl p-4 shadow-soft border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Tài khoản nhận tiền</span>
            </h2>
          </div>

          {bankAccounts.length === 0 ? (
            /* Khi chưa có tài khoản ngân hàng nào */
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-primary flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">Chưa có tài khoản ngân hàng liên kết</p>
              <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto">
                Bạn cần thêm tài khoản ngân hàng để nhận tiền chuyển khoản về.
              </p>
              <div className="pt-2">
                <Link
                  href="/phuong-thuc-thanh-toan"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary-dark transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm tài khoản ngân hàng</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Danh sách ngân hàng: Người dùng CHỈ VIỆC LỰA CHỌN */
            <div className="space-y-2">
              {bankAccounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={clsx(
                      "p-3 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99]",
                      isSelected
                        ? "border-primary bg-blue-50/40 shadow-xs"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow-xs",
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200/60"
                        )}
                      >
                        {acc.bankName ? acc.bankName.slice(0, 3).toUpperCase() : "NH"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {acc.bankName || "Tài khoản ngân hàng"}
                          </span>
                          {acc.isDefault && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">
                          {acc.accountNumber}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide truncate">
                          {acc.accountName}
                        </p>
                      </div>
                    </div>

                    {/* Radio Checkmark */}
                    <div
                      className={clsx(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}

              {/* Nút thêm ngân hàng chuyển sang trang phương thức thanh toán */}
              <Link
                href="/phuong-thuc-thanh-toan"
                className="w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-primary rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary hover:bg-blue-50/20 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm tài khoản ngân hàng khác &rarr;</span>
              </Link>
            </div>
          )}
        </section>

        {/* MỤC: NHẬP SỐ TIỀN RÚT */}
        <section className="bg-white rounded-3xl p-4 shadow-soft border border-slate-100 space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Số tiền rút
            </label>
          </div>

          <div className="relative">
            <input
              type="number"
              step="10000"
              min="10000"
              max={walletBalance}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="Nhập số tiền (tối thiểu 10.000đ)"
              className="w-full text-lg font-black text-slate-900 py-3 px-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-primary transition"
              required
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              VNĐ
            </span>
          </div>

          {/* Quick chips */}
          <div className="flex gap-2 pt-1">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmountStr(String(val))}
                className={clsx(
                  "flex-1 text-[11px] font-bold py-2 rounded-xl border transition-all cursor-pointer",
                  amountStr === String(val)
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                {val >= 1000 ? `${val / 1000}k` : val}
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-500 space-y-1 border border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Chuyển khoản nhanh Napas 247</span>
            </div>
            <p className="text-[10px] text-slate-400">
              * Tiền sẽ được chuyển thẳng về tài khoản ngân hàng của bạn chỉ trong vài giây. Miễn phí giao dịch.
            </p>
          </div>
        </section>

        {/* NÚT XÁC NHẬN RÚT TIỀN */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              bankAccounts.length === 0 ||
              withdrawAmount < 10000 ||
              withdrawAmount > walletBalance
            }
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-md hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {isSubmitting
                ? "Đang xử lý chuyển tiền..."
                : bankAccounts.length === 0
                  ? "Vui lòng thêm tài khoản ngân hàng"
                  : withdrawAmount > walletBalance
                    ? "Số dư ví không đủ"
                    : "Xác nhận rút"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
