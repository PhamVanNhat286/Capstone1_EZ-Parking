'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MomoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const amount = 50000;

  const handleMomoPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/payment/create-momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, orderInfo: 'Thanh toan MoMo EZ-Parking', bookingId: '1' }),
      });
      const data = await res.json();
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (err) {
      alert('Không kết nối được server MoMo!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 max-w-md mx-auto">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Quay lại
        </button>

        <h1 className="text-2xl font-bold text-pink-400 mb-2">Thanh toán qua Ví MoMo</h1>
        <p className="text-slate-400 text-sm mb-6">
          Quét mã QR trực tiếp bằng ứng dụng MoMo trên điện thoại của bạn.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-slate-500 text-sm">
            [ Khung hiển thị mã QR MoMo ]
          </div>
          <div className="flex justify-between text-base font-bold pt-2">
            <span className="text-slate-400">Tổng tiền:</span>
            <span className="text-emerald-400">{amount.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleMomoPayment}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-pink-600 hover:bg-pink-500 font-semibold text-white shadow-lg transition"
      >
        {loading ? 'Đang tạo giao dịch...' : 'Thanh toán qua MoMo'}
      </button>
    </div>
  );
}