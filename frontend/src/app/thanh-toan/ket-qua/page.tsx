'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { useStore } from '@/store';

type Payment = {
  booking_id: string;
  amount_vnd: number;
  status: 'pending' | 'success' | 'failed' | 'expired' | 'late';
  transaction_no?: string | null;
  bank_code?: string | null;
  sepay_transaction_id?: string | null;
};

export default function PaymentResultPage() {
  return <Suspense fallback={<div className="p-6 text-center">Đang tải kết quả thanh toán...</div>}><PaymentResult /></Suspense>;
}

function PaymentResult() {
  const router = useRouter();
  const params = useSearchParams();
  const method = params.get('method') === 'bank' ? 'bank' : 'vnpay';
  const attempt = params.get('attempt');
  const booking = useStore((state) => state.activeBooking);
  const payDeposit = useStore((state) => state.payDeposit);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attempt || !/^[0-9a-f]{24}$/.test(attempt)) {
      setError('Mã giao dịch không hợp lệ.');
      return;
    }
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/payment/${method}-status/${attempt}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Không đọc được kết quả thanh toán.');
        const data = await response.json();
        if (stopped) return;
        setPayment(data.payment);
        setError('');
      } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : 'Không đọc được kết quả thanh toán.');
      }
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 3000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [attempt, method]);

  useEffect(() => {
    if (payment?.status === 'success' && booking?.id === payment.booking_id && booking.status === 'holding') {
      payDeposit(method);
    }
  }, [payment?.status, payment?.booking_id, booking?.id, booking?.status, method, payDeposit]);

  const success = payment?.status === 'success';
  const failed = payment?.status === 'failed' || payment?.status === 'expired' || payment?.status === 'late';
  const selectMethod = () => {
    const current = useStore.getState().activeBooking;
    router.replace(current && current.id === payment?.booking_id && current.status === 'holding' && current.holdExpiresAt > Date.now()
      ? '/dat-cho/' + encodeURIComponent(current.spotId)
      : '/');
  };

  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900 grid place-items-center">
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h1 className={`text-center text-xl font-extrabold ${success ? 'text-emerald-700' : failed ? 'text-red-700' : 'text-amber-700'}`}>
        {success ? 'Đã xác nhận tiền cọc' : failed ? 'Thanh toán chưa thành công' : 'Đang xác nhận thanh toán'}
      </h1>
      <p className="text-center text-sm text-slate-600">
        {success ? booking?.id === payment.booking_id ? 'Giao dịch đã được xác nhận. Bạn có thể xem vé đặt chỗ.' : 'Giao dịch đã được ghi nhận, nhưng không tìm thấy vé trên thiết bị này. Vui lòng liên hệ hỗ trợ với mã đặt chỗ bên dưới.' : failed ? 'Bạn có thể chọn lại VNPay hoặc chuyển khoản ngân hàng nếu đơn còn hạn.' : error || 'Vui lòng chờ hệ thống kiểm tra giao dịch.'}
      </p>
      <div className="rounded-2xl bg-slate-50 p-4 text-sm space-y-2">
        <div className="flex justify-between gap-3"><span>Mã đặt chỗ</span><strong>{payment?.booking_id || booking?.id || '—'}</strong></div>
        <div className="flex justify-between gap-3"><span>Phương thức</span><strong>{method === 'bank' ? 'Chuyển khoản ngân hàng' : 'VNPay'}</strong></div>
        {payment && <div className="flex justify-between gap-3"><span>Tiền cọc</span><strong>{Number(payment.amount_vnd).toLocaleString('vi-VN')} đ</strong></div>}
        {success && payment?.transaction_no && <div className="flex justify-between gap-3"><span>Mã giao dịch</span><strong>{payment.transaction_no}</strong></div>}
        {success && payment?.sepay_transaction_id && <div className="flex justify-between gap-3"><span>Mã giao dịch</span><strong>{payment.sepay_transaction_id}</strong></div>}
      </div>
      {success && booking?.id === payment.booking_id ?
        <button onClick={() => router.replace('/ve/' + encodeURIComponent(booking.id))} className="w-full rounded-2xl bg-emerald-700 p-3.5 font-bold text-white">Xem vé đặt chỗ</button> :
        success ? <button onClick={() => router.replace('/')} className="w-full rounded-2xl bg-blue-600 p-3.5 font-bold text-white">Về trang chủ</button> :
        <button onClick={selectMethod} className="w-full rounded-2xl bg-blue-600 p-3.5 font-bold text-white">{failed ? 'Chọn lại phương thức' : 'Quay lại chọn thanh toán'}</button>}
    </div>
  </main>;
}
