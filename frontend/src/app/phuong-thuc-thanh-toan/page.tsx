"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Building2,
  ShieldCheck,
  Trash2,
  Edit3,
  Star,
  Plus,
  AlertCircle,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useStore, type SavedPaymentAccount, getUserChatKey } from "@/store";
import {
  getBankAccountsApi,
  addBankAccountApi,
  updateBankAccountApi,
  deleteBankAccountApi,
  setDefaultBankAccountApi,
} from "@/lib/api";

// Danh sách các ngân hàng phổ biến tại Việt Nam
const POPULAR_BANKS = [
  { code: "MB", name: "MB Bank", shortName: "MB", fullName: "Ngân hàng Quân Đội", color: "bg-blue-600 text-white" },
  { code: "VCB", name: "Vietcombank", shortName: "VCB", fullName: "Ngân hàng Ngoại Thương", color: "bg-emerald-600 text-white" },
  { code: "TCB", name: "Techcombank", shortName: "TCB", fullName: "Ngân hàng Kỹ Thương", color: "bg-red-600 text-white" },
  { code: "BIDV", name: "BIDV", shortName: "BIDV", fullName: "Ngân hàng Đầu tư & Phát triển", color: "bg-teal-700 text-white" },
  { code: "CTG", name: "VietinBank", shortName: "CTG", fullName: "Ngân hàng Công Thương", color: "bg-sky-600 text-white" },
  { code: "ACB", name: "ACB", shortName: "ACB", fullName: "Ngân hàng Á Châu", color: "bg-blue-500 text-white" },
  { code: "VPB", name: "VPBank", shortName: "VPB", fullName: "Ngân hàng Việt Nam Thịnh Vượng", color: "bg-emerald-500 text-white" },
  { code: "TPB", name: "TPBank", shortName: "TPB", fullName: "Ngân hàng Tiên Phong", color: "bg-purple-600 text-white" },
  { code: "STB", name: "Sacombank", shortName: "STB", fullName: "Ngân hàng Sài Gòn Thương Tín", color: "bg-blue-800 text-white" },
  { code: "AGR", name: "Agribank", shortName: "AGR", fullName: "Ngân hàng Nông Nghiệp & PTNT", color: "bg-amber-700 text-white" },
  { code: "HDB", name: "HDBank", shortName: "HDB", fullName: "Ngân hàng Phát triển TP.HCM", color: "bg-yellow-600 text-white" },
  { code: "VIB", name: "VIB", shortName: "VIB", fullName: "Ngân hàng Quốc Tế", color: "bg-blue-900 text-white" },
];

type PaymentType = "vnpay" | "momo" | "banking";

export default function PaymentMethodsPage() {
  const router = useRouter();
  const {
    user,
    savedPaymentAccounts,
    setSavedPaymentAccounts,
    addSavedPaymentAccount,
    updateSavedPaymentAccount,
    deleteSavedPaymentAccount,
    setDefaultPaymentAccount,
    addToast,
  } = useStore();
  const visiblePaymentAccounts = savedPaymentAccounts.filter((account) => account.type !== "momo");

  // Đồng bộ danh sách tài khoản ngân hàng từ backend DB khi tải trang
  useEffect(() => {
    if (user?.token) {
      getBankAccountsApi(user.token).then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const mapped: SavedPaymentAccount[] = res.data.map((item: any) => ({
            id: String(item.id),
            type: item.type || "banking",
            accountName: item.account_name,
            accountNumber: item.account_number,
            bankName: item.bank_name,
            isDefault: Boolean(item.is_default),
            createdAt: new Date(item.created_at).getTime(),
          }));
          setSavedPaymentAccounts(mapped);
        }
      });
    }
  }, [user?.token, setSavedPaymentAccounts]);

  // Form State
  const [selectedType, setSelectedType] = useState<PaymentType>("banking");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedBank, setSelectedBank] = useState("MB Bank");
  const [branch, setBranch] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Mode state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Deletion confirm modal
  const [deleteTarget, setDeleteTarget] = useState<SavedPaymentAccount | null>(null);

  // Form Validation Errors
  const [errors, setErrors] = useState<{
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  }>({});

  // Reset form
  const resetForm = () => {
    setAccountName("");
    setAccountNumber("");
    setSelectedBank("MB Bank");
    setBranch("");
    setIsDefault(savedPaymentAccounts.length === 0);
    setEditingId(null);
    setErrors({});
  };

  // Start Editing
  const handleStartEdit = (item: SavedPaymentAccount) => {
    setEditingId(item.id);
    setSelectedType(item.type);
    setAccountName(item.accountName);
    setAccountNumber(item.accountNumber);
    if (item.bankName) setSelectedBank(item.bankName);
    setIsDefault(Boolean(item.isDefault));
    setErrors({});

    // Scroll smoothly to form
    const el = document.getElementById("payment-form-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Form Validation
  const validateForm = () => {
    const errs: typeof errors = {};

    const cleanName = accountName.trim();
    if (!cleanName) {
      errs.accountName = "Vui lòng nhập tên chủ tài khoản";
    } else if (cleanName.length < 3) {
      errs.accountName = "Tên chủ tài khoản quá ngắn";
    }

    const cleanNum = accountNumber.replace(/\s+/g, "");
    if (!cleanNum) {
      errs.accountNumber =
        selectedType === "momo"
          ? "Vui lòng nhập số điện thoại ví MoMo"
          : "Vui lòng nhập số tài khoản (STK)";
    } else if (selectedType === "momo") {
      const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
      if (!phoneRegex.test(cleanNum)) {
        errs.accountNumber = "Số điện thoại MoMo không hợp lệ (10 chữ số, bắt đầu 03, 05, 07, 08, 09)";
      }
    } else {
      if (cleanNum.length < 6) {
        errs.accountNumber = "Số tài khoản phải có ít nhất 6 chữ số";
      }
    }

    if ((selectedType === "banking" || selectedType === "vnpay") && !selectedBank) {
      errs.bankName = "Vui lòng chọn ngân hàng";
    }

    // RÀNG BUỘC NGHIỆP VỤ: Không được trùng cặp (Ngân hàng + STK) trên toàn hệ thống (tên chủ thẻ được phép trùng)
    if (!errs.accountNumber && (selectedType === "banking" || selectedType === "vnpay")) {
      const checkBank = selectedBank.trim().toLowerCase();
      const checkNum = cleanNum.toLowerCase();

      const allMap = useStore.getState().userPaymentAccounts || {};
      const currentKey = getUserChatKey(user);

      for (const [k, list] of Object.entries(allMap)) {
        const dup = (list || []).find(
          (a) =>
            a.id !== editingId &&
            (a.bankName || "").trim().toLowerCase() === checkBank &&
            a.accountNumber.trim().replace(/\s+/g, "").toLowerCase() === checkNum
        );
        if (dup) {
          if (k !== currentKey) {
            errs.accountNumber = `Tài khoản ngân hàng ${selectedBank} (STK: ${cleanNum}) đã được liên kết với một tài khoản khác trong hệ thống.`;
          } else {
            errs.accountNumber = `Bạn đã có tài khoản ngân hàng ${selectedBank} (STK: ${cleanNum}) trong danh sách rồi.`;
          }
          break;
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Form (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formattedName = accountName.trim().toUpperCase();
    const formattedNumber = accountNumber.trim().replace(/\s+/g, "");
    setIsSubmitting(true);

    try {
      if (user?.token) {
        if (editingId) {
          const res = await updateBankAccountApi(user.token, editingId, {
            type: selectedType,
            bank_name: selectedType === "banking" || selectedType === "vnpay" ? selectedBank : "Ngân hàng",
            account_number: formattedNumber,
            account_name: formattedName,
            branch: branch ? branch.trim() : undefined,
            is_default: isDefault,
          });

          if (!res.success) {
            addToast(res.message || "Cập nhật tài khoản ngân hàng thất bại", "error");
            setErrors((prev) => ({ ...prev, accountNumber: res.message }));
            return;
          }

          updateSavedPaymentAccount(editingId, {
            type: selectedType,
            accountName: formattedName,
            accountNumber: formattedNumber,
            bankName: selectedType === "banking" || selectedType === "vnpay" ? selectedBank : undefined,
            isDefault,
          });
          if (isDefault) {
            setDefaultPaymentAccount(editingId);
          }
          addToast("Đã cập nhật thông tin thanh toán thành công!", "success");
          resetForm();
        } else {
          const res = await addBankAccountApi(user.token, {
            type: selectedType,
            bank_name: selectedType === "banking" || selectedType === "vnpay" ? selectedBank : "Ngân hàng",
            account_number: formattedNumber,
            account_name: formattedName,
            branch: branch ? branch.trim() : undefined,
            is_default: isDefault,
          });

          if (!res.success) {
            addToast(res.message || "Không thể liên kết tài khoản ngân hàng", "error");
            setErrors((prev) => ({ ...prev, accountNumber: res.message }));
            return;
          }

          const newAccount: SavedPaymentAccount = {
            id: String(res.data?.id || `pay_${Date.now()}`),
            type: selectedType,
            accountName: formattedName,
            accountNumber: formattedNumber,
            bankName: selectedType === "banking" || selectedType === "vnpay" ? selectedBank : undefined,
            isDefault: res.data?.is_default ?? isDefault,
            createdAt: Date.now(),
          };
          addSavedPaymentAccount(newAccount);
          addToast("Đã liên kết phương thức thanh toán thành công!", "success");
          resetForm();
        }
      } else {
        // Fallback local / demo mode
        if (editingId) {
          updateSavedPaymentAccount(editingId, {
            type: selectedType,
            accountName: formattedName,
            accountNumber: formattedNumber,
            bankName: selectedType === "banking" || selectedType === "vnpay" ? selectedBank : undefined,
            isDefault,
          });
          if (isDefault) setDefaultPaymentAccount(editingId);
          addToast("Đã cập nhật thông tin thanh toán thành công!", "success");
          resetForm();
        } else {
          const newAccount: SavedPaymentAccount = {
            id: "pay_" + Date.now().toString(),
            type: selectedType,
            accountName: formattedName,
            accountNumber: formattedNumber,
            bankName: selectedType === "banking" || selectedType === "vnpay" ? selectedBank : undefined,
            isDefault,
            createdAt: Date.now(),
          };
          addSavedPaymentAccount(newAccount);
          addToast("Đã lưu phương thức thanh toán thành công!", "success");
          resetForm();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (user?.token) {
      await deleteBankAccountApi(user.token, deleteTarget.id);
    }
    deleteSavedPaymentAccount(deleteTarget.id);
    addToast("Đã xoá phương thức thanh toán", "info");
    if (editingId === deleteTarget.id) resetForm();
    setDeleteTarget(null);
  };

  return (
    <div className="relative min-h-full bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-700 pb-16">
      {/* HEADER */}
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
              <span>Phương thức thanh toán</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Quản lý tài khoản & liên kết cọc giữ chỗ</p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-primary flex items-center justify-center">
          <ShieldCheck size={16} />
        </div>
      </header>

      {/* 3. MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto px-4 pt-3.5 space-y-4">


        {/* SECTION: DANH SÁCH ĐÃ LƯU */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              <span>Tài khoản đã liên kết ({visiblePaymentAccounts.length})</span>
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
              >
                Hủy chế độ sửa
              </button>
            )}
          </div>

          {visiblePaymentAccounts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">Chưa có phương thức nào được lưu</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                Chọn phương thức và điền thông tin bên dưới để bắt đầu liên kết thanh toán.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visiblePaymentAccounts.map((account) => {
                const isBanking = account.type === "banking";
                const isMomo = account.type === "momo";
                const isVnpay = account.type === "vnpay";

                return (
                  <div
                    key={account.id}
                    className={clsx(
                      "bg-white rounded-2xl p-4 border transition-all shadow-xs relative overflow-hidden",
                      account.isDefault
                        ? "border-primary/60 bg-gradient-to-b from-blue-50/40 to-white"
                        : "border-slate-200/90"
                    )}
                  >
                    {/* Default badge top-right */}
                    {account.isDefault && (
                      <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-bl-xl tracking-wider flex items-center gap-1">
                        <Check size={10} strokeWidth={3} />
                        Mặc định
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      {/* Brand icon */}
                      <div
                        className={clsx(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow-xs",
                          isBanking && "bg-slate-900 text-white",
                          isMomo && "bg-pink-600 text-white",
                          isVnpay && "bg-blue-600 text-white"
                        )}
                      >
                        {isBanking && (account.bankName ? account.bankName.slice(0, 4) : "BANK")}
                        {isMomo && "MoMo"}
                        {isVnpay && "VNPAY"}
                      </div>

                      {/* Info details */}
                      <div className="flex-1 min-w-0 pr-12">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900">
                            {isBanking
                              ? account.bankName || "Ngân hàng"
                              : isMomo
                              ? "Ví điện tử MoMo"
                              : "Cổng thanh toán VNPay"}
                          </span>
                        </div>

                        {/* Masked account number */}
                        <div className="font-mono text-sm font-black text-slate-800 tracking-wider mt-1">
                          {account.accountNumber.length > 4
                            ? `•••• ${account.accountNumber.slice(-4)}`
                            : account.accountNumber}
                        </div>

                        {/* Account holder name */}
                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wide truncate">
                          {account.accountName}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      {!account.isDefault ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (user?.token) {
                              await setDefaultBankAccountApi(user.token, account.id);
                            }
                            setDefaultPaymentAccount(account.id);
                            addToast("Đã đặt làm phương thức thanh toán mặc định", "success");
                          }}
                          className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Star size={13} />
                          Đặt làm mặc định
                        </button>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(account)}
                          className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-50 transition cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(account)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION: FORM CHỌN PHƯƠNG THỨC & NHẬP THÔNG TIN */}
        <section
          id="payment-form-section"
          className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-4"
        >
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-primary" />
              <span>{editingId ? "Cập nhật phương thức thanh toán" : "Thêm phương thức thanh toán mới"}</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="grid grid-cols-2 gap-2">
                {/* VNPay */}
                <button
                  type="button"
                  onClick={() => setSelectedType("vnpay")}
                  className={clsx(
                    "p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all cursor-pointer",
                    selectedType === "vnpay"
                      ? "border-blue-600 bg-blue-50/70 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-1.5 shadow-xs">
                    VNP
                  </div>
                  <span className="font-extrabold text-xs text-slate-900">VNPay</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">Quét mã QR</span>
                </button>

                {/* Internet Banking */}
                <button
                  type="button"
                  onClick={() => setSelectedType("banking")}
                  className={clsx(
                    "p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all cursor-pointer",
                    selectedType === "banking"
                      ? "border-slate-900 bg-slate-100/80 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <Building2 size={16} />
                  </div>
                  <span className="font-extrabold text-xs text-slate-900">Banking</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">Tài khoản NH</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1 border-t border-slate-100">

              {/* Nếu chọn Banking hoặc VNPay -> Cho chọn ngân hàng */}
              {(selectedType === "banking" || selectedType === "vnpay") && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    Ngân hàng {selectedType === "vnpay" ? "liên kết" : "thụ hưởng"} <span className="text-rose-500">*</span>
                  </label>

                  {/* Dropdown hoặc Select */}
                  <div className="relative">
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white transition appearance-none cursor-pointer"
                    >
                      {POPULAR_BANKS.map((b) => (
                        <option key={b.code} value={b.name}>
                          {b.name} - {b.fullName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* SỐ TÀI KHOẢN HOẶC SỐ ĐIỆN THOẠI */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {selectedType === "momo" ? "Số điện thoại ví MoMo" : "Số tài khoản (STK)"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setAccountNumber(val);
                      if (errors.accountNumber) {
                        setErrors((prev) => ({ ...prev, accountNumber: undefined }));
                      }
                    }}
                    placeholder={
                      selectedType === "momo"
                        ? "Ví dụ: 0912345678"
                        : "Ví dụ: 1903686868888"
                    }
                    className={clsx(
                      "w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-bold tracking-wider outline-none transition",
                      errors.accountNumber
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border-slate-200 focus:border-primary focus:bg-white"
                    )}
                  />
                  {accountNumber && (
                    <button
                      type="button"
                      onClick={() => setAccountNumber("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {errors.accountNumber && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.accountNumber}
                  </p>
                )}
              </div>

              {/* TÊN CHỦ TÀI KHOẢN */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên chủ tài khoản (In hoa không dấu / có dấu) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value.toUpperCase());
                    if (errors.accountName) {
                      setErrors((prev) => ({ ...prev, accountName: undefined }));
                    }
                  }}
                  placeholder="Ví dụ: NGUYEN VAN A"
                  className={clsx(
                    "w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider outline-none transition",
                    errors.accountName
                      ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                      : "border-slate-200 focus:border-primary focus:bg-white"
                  )}
                />
                {errors.accountName && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.accountName}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Vui lòng nhập chính xác họ và tên theo tài khoản ngân hàng hoặc ví đã đăng ký.
                </p>
              </div>

              {/* Chi nhánh / Ghi chú (chỉ hiển thị với banking) */}
              {selectedType === "banking" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Chi nhánh ngân hàng (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Ví dụ: Chi nhánh Đà Nẵng"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary focus:bg-white transition"
                  />
                </div>
              )}

            </div>

            {/* BUTTON SUBMIT */}
            <div className="flex gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary text-white font-extrabold text-xs py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-primary-dark active:scale-[0.99] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Check size={16} strokeWidth={2.5} />
                <span>
                  {isSubmitting
                    ? "Đang lưu..."
                    : editingId
                    ? "Cập nhật thay đổi"
                    : "Lưu phương thức thanh toán"}
                </span>
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900">Xóa phương thức thanh toán?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn có chắc chắn muốn xóa tài khoản{" "}
                <strong className="text-slate-800">
                  {deleteTarget.bankName || deleteTarget.type.toUpperCase()} (•••• {deleteTarget.accountNumber.slice(-4)})
                </strong>
                ? Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2.5 px-4 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 active:scale-95 transition shadow-sm cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
