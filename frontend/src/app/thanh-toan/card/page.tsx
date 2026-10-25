'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CardPage() {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const amount = 50000;

  const handleFormatCard = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleFormatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setExpiryDate(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setExpiryDate(digits);
    }
  };

  const handleCardPayment = async () => {
    setErrorMsg('');
    if (!cardNumber || !cardHolder || !expiryDate || !cvv) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin thẻ ngân hàng!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/payment/create-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, cardNumber, cardHolder, expiryDate, cvv, bookingId: '1' }),
      });
      const data = await res.json();
      if (data?.success) {
        router.push(data.redirectUrl || '/ve/1');
      } else {
        setErrorMsg(data?.message || 'Thẻ không hợp lệ!');
      }
    } catch (err) {
      setErrorMsg('Không kết nối được tới máy chủ thanh toán!');
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
        <h1 className="text-2xl font-bold text-emerald-600 mb-2">Thẻ Ngân Hàng / Quốc Tế</h1>
        <p className="text-slate-500 text-sm mb-6">Hỗ trợ thẻ Visa, MasterCard, JCB và ATM nội địa.</p>

        {/* Thẻ mô phỏng */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl p-5 mb-6 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs uppercase tracking-widest text-emerald-100">EZ-Parking Card</span>
            <span className="font-bold italic text-lg">VISA</span>
          </div>
          <div className="text-xl font-mono tracking-widest mb-4">
            {cardNumber || '•••• •••• •••• ••••'}
          </div>
          <div className="flex justify-between text-xs uppercase text-emerald-50">
            <div>
              <p className="text-[10px] text-emerald-200">Chủ thẻ</p>
              <p className="font-semibold">{cardHolder || 'NGUYEN VAN A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-200">Hết hạn</p>
              <p className="font-semibold">{expiryDate || 'MM/YY'}</p>
            </div>
          </div>
        </div>

        {/* Form nhập */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 mb-4 shadow-sm">
          <input type="text" placeholder="Số thẻ (16 chữ số)" value={cardNumber} onChange={(e) => handleFormatCard(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500" />
          <input type="text" placeholder="Tên chủ thẻ (IN HOA KHÔNG DẤU)" value={cardHolder} onChange={(e) => handleFormatCard(e.target.value.toUpperCase())} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 uppercase" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="MM/YY" value={expiryDate} onChange={(e) => handleFormatExpiry(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500" />
            <input type="password" maxLength={3} placeholder="CVV (3 số)" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        {errorMsg && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm mb-4">{errorMsg}</div>}
      </div>

      <button onClick={handleCardPayment} disabled={loading} className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white shadow-md transition">
        {loading ? 'Đang xử lý thẻ...' : `Thanh toán ${amount.toLocaleString('vi-VN')} đ`}
      </button>
    </div>
  );
}