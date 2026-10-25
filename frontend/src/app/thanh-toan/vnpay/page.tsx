'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VNPayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const amount = 50000;

  const handleVNPayPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/payment/create-vnpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, orderInfo: 'Thanh toan VNPay EZ-Parking', bookingId: '1' }),
      });
      const data = await res.json();
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (err) {
      alert('Không kết nối được server VNPay!');
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
        <h1 className="text-2xl font-bold text-blue-600 mb-2">Thanh toán qua VNPay</h1>
        <p className="text-slate-500 text-sm mb-6">Hệ thống sẽ chuyển hướng bạn sang cổng thanh toán VNPay Sandbox.</p>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex justify-between text-sm"><span className="text-slate-500">Dịch vụ:</span><span className="font-medium text-slate-800">Đặt chỗ đỗ xe</span></div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-100"><span className="text-slate-500">Tổng tiền:</span><span className="text-emerald-600">{amount.toLocaleString('vi-VN')} đ</span></div>
        </div>
      </div>
      <button onClick={handleVNPayPayment} disabled={loading} className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-white shadow-md transition">
        {loading ? 'Đang chuyển hướng...' : 'Xác nhận thanh toán VNPay'}
      </button>
    </div>
  );
}