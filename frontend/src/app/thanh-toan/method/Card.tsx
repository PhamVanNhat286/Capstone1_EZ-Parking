'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CardPage() {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const amount = 50000;

  const handleCardPayment = async () => {
    if (!cardNumber || !cardHolder) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin thẻ!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/payment/create-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, cardNumber, cardHolder, bookingId: '1' }),
      });
      const data = await res.json();
      if (data?.success) {
        router.push('/ve/1');
      }
    } catch (err) {
      setErrorMsg('Lỗi xử lý thanh toán thẻ!');
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

        <h1 className="text-2xl font-bold text-emerald-400 mb-2">Thẻ Ngân Hàng</h1>
        <p className="text-slate-400 text-sm mb-6">
          Nhập thông tin thẻ nội địa hoặc quốc tế để hoàn tất giao dịch.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 mb-4">
          <input
            type="text"
            placeholder="Số thẻ (VD: 4000 1234...)"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Tên chủ thẻ (IN HOA KHÔNG DẤU)"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 uppercase"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
            {errorMsg}
          </div>
        )}
      </div>

      <button
        onClick={handleCardPayment}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white shadow-lg transition"
      >
        {loading ? 'Đang xử lý thẻ...' : 'Xác nhận thanh toán ngay'}
      </button>
    </div>
  );
}