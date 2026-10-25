'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function SelectPaymentPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-md mx-auto flex flex-col justify-center space-y-6">
      <h1 className="text-2xl font-bold text-center mb-2">Chọn phương thức thanh toán</h1>
      
      {/* Nút chọn VNPay */}
      <button
        onClick={() => router.push('/thanh-toan/vnpay')}
        className="w-full p-4 rounded-2xl bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 flex items-center justify-between transition"
      >
        <span className="font-semibold text-blue-400">Thanh toán qua VNPay</span>
        <span>→</span>
      </button>

      {/* Nút chọn MoMo */}
      <button
        onClick={() => router.push('/thanh-toan/momo')}
        className="w-full p-4 rounded-2xl bg-pink-600/20 border border-pink-500/40 hover:bg-pink-600/30 flex items-center justify-between transition"
      >
        <span className="font-semibold text-pink-400">Thanh toán qua Ví MoMo</span>
        <span>→</span>
      </button>

      {/* Nút chọn Thẻ ngân hàng */}
      <button
        onClick={() => router.push('/thanh-toan/card')}
        className="w-full p-4 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 flex items-center justify-between transition"
      >
        <span className="font-semibold text-emerald-400">Thanh toán qua Thẻ ngân hàng</span>
        <span>→</span>
      </button>
    </div>
  );
}