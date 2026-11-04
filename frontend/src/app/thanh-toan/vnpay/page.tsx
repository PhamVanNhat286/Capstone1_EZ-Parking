'use client';

import { API_BASE_URL } from '@/lib/config';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { lots } from '@/lib/mock/lots';
import { getLotByIdApi } from '@/lib/api';

const DEPOSIT = 50_000;

export default function VNPayPage() {
  const router = useRouter();
  const booking = useStore((state) => state.activeBooking);
  const vehicles = useStore((state) => state.vehicles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fallbackRate = lots.find((lot) => lot.id === booking?.lotId)?.price ?? 0;
  const [hourlyRate, setHourlyRate] = useState(fallbackRate);
  const hours = booking?.estimatedHours || 2;
  const estimatedTotal = Math.max(0, Math.round(hourlyRate * hours));

  useEffect(() => {
    if (!booking?.lotId) return;
    let cancelled = false;
    setHourlyRate(lots.find((lot) => lot.id === booking.lotId)?.price ?? 0);
    void getLotByIdApi(booking.lotId).then((lot) => {
      if (cancelled || !lot) return;
      const price = Number(lot.pricing_rules?.[0]?.hourly_rate || lot.price || 0);
      if (price > 0) setHourlyRate(price);
    });
    return () => { cancelled = true; };
  }, [booking?.lotId]);

  const startPayment = async () => {
    if (!booking || booking.status !== 'holding' || booking.holdExpiresAt <= Date.now()) {
      setError('Chỗ giữ đã hết hạn. Vui lòng đặt chỗ lại.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/payment/create-vnpay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.paymentUrl) throw new Error(data?.message || 'Không tạo được link thanh toán.');
      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được máy chủ thanh toán.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-6 max-w-md mx-auto">
      <div>
        <button onClick={() => router.replace(booking?.status === "holding" && booking.holdExpiresAt > Date.now() ? "/dat-cho/" + encodeURIComponent(booking.spotId) : "/")} className="text-sm text-slate-500 mb-6">← Chọn phương thức thanh toán</button>
        <h1 className="text-2xl font-bold text-blue-600 mb-2">Ngân hàng / Thẻ qua VNPay</h1>
        <p className="text-slate-500 text-sm mb-6">Bạn sẽ chọn phương thức thanh toán trên trang VNPay.</p>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between text-sm"><span>Mã đặt chỗ</span><strong>{booking?.id || 'Chưa có'}</strong></div>
          <div className="flex justify-between text-sm"><span>Bãi đỗ</span><strong>{lots.find((lot) => lot.id === booking?.lotId)?.name || booking?.lotId || 'Chưa có'}</strong></div>
          <div className="flex justify-between text-sm"><span>Ô đỗ</span><strong>{booking?.spotId || 'Chưa có'}</strong></div>
          <div className="flex justify-between text-sm"><span>Biển số</span><strong>{vehicles.find((vehicle) => vehicle.id === booking?.vehicleId)?.plate || 'Chưa có'}</strong></div>
          <div className="flex justify-between text-sm"><span>Thời gian dự kiến</span><strong>{hours} giờ</strong></div>
          <div className="flex justify-between text-sm"><span>Giá dự kiến</span><strong>{estimatedTotal.toLocaleString('vi-VN')} đ</strong></div>
          <div className="flex justify-between text-sm"><span>Tiền cọc</span><strong>{DEPOSIT.toLocaleString('vi-VN')} đ</strong></div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
      <button onClick={startPayment} disabled={loading || !booking} className="w-full py-4 rounded-xl bg-blue-600 disabled:bg-slate-300 font-semibold text-white">
        {loading ? 'Đang chuyển đến VNPay...' : 'Tiếp tục thanh toán'}
      </button>
    </div>
  );
}
