'use client';

import { API_BASE_URL } from '@/lib/config';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { lots } from '@/lib/mock/lots';
import { getLotByIdApi } from '@/lib/api';
import { calculateDetailedFee } from '@/lib/pricing';

const DEPOSIT = 50_000;
const formatDateDMY = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

export default function VNPayPage() {
  const router = useRouter();
  const booking = useStore((state) => state.activeBooking);
  const vehicles = useStore((state) => state.vehicles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fallbackRate = lots.find((lot) => lot.id === booking?.lotId)?.price ?? 0;
  const [hourlyRate, setHourlyRate] = useState(fallbackRate);
  const [lotName, setLotName] = useState(lots.find((lot) => lot.id === booking?.lotId)?.name || booking?.lotId || 'Chưa có');
  const hours = booking?.estimatedHours || 2;
  const feeDetails = calculateDetailedFee(
    booking?.lotId || '1',
    booking?.startTime || '',
    hours,
    hourlyRate || fallbackRate || 15000,
    booking?.createdAt ? new Date(booking.createdAt) : new Date()
  );
  const estimatedTotal = Math.max(0, Math.round(feeDetails.totalFee));
  const vehicle = vehicles.find((item) => item.id === booking?.vehicleId);
  const timeRange = (() => {
    if (!booking) return { startTime: 'Chưa có', endTime: 'Chưa có', startDate: '', endDate: '' };
    const baseMs = booking.createdAt || Date.now();
    const startDateObj = new Date(baseMs);
    let startTime = startDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (booking.startTime && booking.startTime.includes(':')) {
      const [sH, sM] = booking.startTime.split(':').map(Number);
      if (!isNaN(sH) && !isNaN(sM)) {
        startDateObj.setHours(sH, sM, 0, 0);
        if (startDateObj.getTime() < baseMs - 12 * 3600000) {
          startDateObj.setDate(startDateObj.getDate() + 1);
        }
        startTime = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
      }
    }

    const endDateObj = new Date(startDateObj.getTime() + hours * 3600000);
    let endTime = endDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (booking.endTime && booking.endTime.includes(':')) {
      const [eH, eM] = booking.endTime.split(':').map(Number);
      if (!isNaN(eH) && !isNaN(eM)) {
        endDateObj.setTime(startDateObj.getTime());
        endDateObj.setHours(eH, eM, 0, 0);
        if (endDateObj.getTime() <= startDateObj.getTime()) {
          endDateObj.setDate(endDateObj.getDate() + 1);
        }
        endTime = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
      }
    }

    return {
      startTime,
      endTime,
      startDate: formatDateDMY(startDateObj),
      endDate: formatDateDMY(endDateObj),
    };
  })();

  useEffect(() => {
    if (!booking?.lotId) return;
    let cancelled = false;
    setHourlyRate(lots.find((lot) => lot.id === booking.lotId)?.price ?? 0);
    setLotName(lots.find((lot) => lot.id === booking.lotId)?.name || booking.lotId);
    void getLotByIdApi(booking.lotId).then((lot) => {
      if (cancelled || !lot) return;
      if (lot.name) setLotName(lot.name);
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
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-[470px]">
        <button onClick={() => router.replace(booking?.status === 'holding' && booking.holdExpiresAt > Date.now() ? '/dat-cho/' + encodeURIComponent(booking.spotId) : '/')} className="mb-5 text-sm font-medium text-blue-700">← Chọn phương thức thanh toán</button>
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">EZ-Space</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Thanh toán qua VNPay</h1>
          <p className="mt-1 text-sm text-slate-500">Chọn ngân hàng hoặc thẻ trên trang thanh toán VNPay.</p>
        </div>

        <section className="overflow-hidden rounded-[26px] border border-blue-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="bg-blue-700 px-5 py-5 text-white">
            <p className="text-sm text-blue-100">Tiền cọc cần thanh toán</p>
            <p className="mt-1 text-[34px] font-extrabold tracking-tight">{DEPOSIT.toLocaleString('vi-VN')} đ</p>
            <p className="mt-1 text-xs text-blue-100">Đơn {booking?.id || 'Chưa có'}</p>
          </div>
          <div className="space-y-3 p-5 text-sm">
            <div className="flex justify-between gap-3"><span className="text-slate-500">Bãi đỗ</span><strong className="text-right">{lotName}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Ô đỗ</span><strong>{booking?.spotId || 'Chưa có'}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Biển số</span><strong className="text-right">{vehicle?.plate || 'Chưa có'}</strong></div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-xs text-slate-500">Giờ vào dự kiến</span>
                <strong className="mt-1 block">{timeRange.startTime}</strong>
                {timeRange.startDate && <span className="mt-0.5 block text-[11px] text-slate-500">{timeRange.startDate}</span>}
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-xs text-slate-500">Giờ ra dự kiến</span>
                <strong className="mt-1 block">{timeRange.endTime}</strong>
                {timeRange.endDate && <span className="mt-0.5 block text-[11px] text-slate-500">{timeRange.endDate}</span>}
              </div>
            </div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Thời lượng dự kiến</span><strong>{hours} giờ</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Giá đỗ dự kiến</span><strong>{estimatedTotal.toLocaleString('vi-VN')} đ</strong></div>
            <div className="flex justify-between gap-3 border-t border-dashed border-slate-200 pt-3"><span className="text-slate-500">Tiền cọc thanh toán ngay</span><strong className="text-blue-700">{DEPOSIT.toLocaleString('vi-VN')} đ</strong></div>
          </div>
        </section>

        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button onClick={startPayment} disabled={loading || !booking} className="mt-5 w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white disabled:bg-slate-300">
          {loading ? 'Đang chuyển đến VNPay...' : 'Tiếp tục thanh toán'}
        </button>
      </div>
    </main>
  );
}
