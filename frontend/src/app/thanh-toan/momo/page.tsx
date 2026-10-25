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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-6 max-w-md mx-auto">
      <div>
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-900 mb-6 flex items-center gap-2">
          ← Quay lại
        </button>
        <h1 className="text-2xl font-bold text-pink-600 mb-2">Thanh toán qua Ví MoMo</h1>
        <p className="text-slate-500 text-sm mb-6">Hệ thống sẽ chuyển sang cổng quét mã QR MoMo.</p>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <div className="bg-pink-50 p-6 rounded-xl border border-pink-100 text-pink-600 font-medium text-sm">
            [ Cổng thanh toán Ví điện tử MoMo ]
          </div>
          <div className="flex justify-between text-sm pt-2"><span className="text-slate-500">Dịch vụ:</span><span className="font-medium text-slate-800">Đặt chỗ đỗ xe</span></div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-100"><span className="text-slate-500">Tổng tiền:</span><span className="text-emerald-600">{amount.toLocaleString('vi-VN')} đ</span></div>
        </div>
      </div>
      <button onClick={handleMomoPayment} disabled={loading} className="w-full py-4 rounded-xl bg-pink-600 hover:bg-pink-700 font-semibold text-white shadow-md transition">
        {loading ? 'Đang tạo giao dịch...' : 'Xác nhận thanh toán MoMo'}
      </button>
    </div>
  );
}