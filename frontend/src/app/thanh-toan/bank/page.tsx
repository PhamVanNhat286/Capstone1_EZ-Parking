'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, CarFront, Check, Clock3, Copy, ExternalLink, Landmark, LoaderCircle, QrCode, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { getLotByIdApi } from '@/lib/api';
import { lots } from '@/lib/mock/lots';
import { useStore } from '@/store';

const DEPOSIT = 50_000;
const money = (value: number) => Math.max(0, Math.round(value)).toLocaleString('vi-VN') + ' đ';
const dateTime = (value: number) => new Date(value).toLocaleString('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

type BankPayment = {
  booking_id: string;
  amount_vnd: number;
  transfer_code: string;
  transfer_content: string;
  account_number: string;
  account_name: string;
  bank_bin: string;
  bank_name: string | null;
  qr_url: string;
  expires_at: string;
  status: 'pending' | 'success' | 'late' | 'expired';
};

export default function BankPaymentPage() {
  const router = useRouter();
  const booking = useStore((state) => state.activeBooking);
  const vehicles = useStore((state) => state.vehicles);
  const [attemptId, setAttemptId] = useState('');
  const [payment, setPayment] = useState<BankPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [hourlyRate, setHourlyRate] = useState(lots.find((lot) => lot.id === booking?.lotId)?.price ?? 0);

  const hours = booking?.estimatedHours || 2;
  const estimatedStart = booking?.createdAt || 0;
  const estimatedEnd = estimatedStart + hours * 60 * 60 * 1000;
  const estimatedPrice = hourlyRate * hours;
  const lot = lots.find((item) => item.id === booking?.lotId);
  const vehicle = vehicles.find((item) => item.id === booking?.vehicleId);

  useEffect(() => {
    if (!booking?.lotId) return;
    let cancelled = false;
    setHourlyRate(lots.find((item) => item.id === booking.lotId)?.price ?? 0);
    void getLotByIdApi(booking.lotId).then((result) => {
      if (cancelled || !result) return;
      const price = Number(result.pricing_rules?.[0]?.hourly_rate || result.price || 0);
      if (price > 0) setHourlyRate(price);
    });
    return () => { cancelled = true; };
  }, [booking?.lotId]);

  useEffect(() => {
    if (!booking?.id) return;
    const saved = window.sessionStorage.getItem('ez-bank-attempt-' + booking.id);
    if (saved && /^[0-9a-f]{24}$/.test(saved)) setAttemptId(saved);
  }, [booking?.id]);

  useEffect(() => {
    if (!attemptId || !booking?.id) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(API_BASE_URL + '/payment/bank-status/' + attemptId, { cache: 'no-store' });
        if (!res.ok) throw new Error('Không đọc được trạng thái chuyển khoản.');
        const data = await res.json();
        if (data.payment?.booking_id !== booking.id) throw new Error('Mã giao dịch không khớp đặt chỗ.');
        if (stopped) return;
        setPayment(data.payment);
        setError('');
        if (data.payment.status === 'success') {
          router.replace('/thanh-toan/ket-qua?method=bank&attempt=' + attemptId);
        }
      } catch (err) {
        if (!stopped) setError(err instanceof Error ? err.message : 'Không đọc được trạng thái chuyển khoản.');
      }
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 3000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [attemptId, booking?.id, router]);

  const createPayment = async () => {
    if (!booking || booking.status !== 'holding' || booking.holdExpiresAt <= Date.now()) {
      setError('Chỗ giữ đã hết hạn. Vui lòng đặt chỗ lại.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE_URL + '/payment/create-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, holdExpiresAt: booking.holdExpiresAt }),
      });
      const data = await res.json();
      if (!res.ok || !data?.attemptId) throw new Error(data?.message || 'Không tạo được mã chuyển khoản.');
      window.sessionStorage.setItem('ez-bank-attempt-' + booking.id, data.attemptId);
      setAttemptId(data.attemptId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được máy chủ thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      window.setTimeout(() => setCopied(''), 2500);
    } catch {
      setError('Không sao chép được. Vui lòng chọn và sao chép thủ công.');
    }
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
        <div className="mx-auto max-w-[440px] rounded-3xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold">Chưa có đơn đặt chỗ</h1>
          <p className="mt-2 text-sm text-slate-500">Hãy chọn ô đỗ trước khi thanh toán tiền cọc.</p>
          <button onClick={() => router.push('/')} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Tìm bãi đỗ</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7f8] text-slate-900">
      <div className="mx-auto max-w-[470px] px-4 pb-10 pt-5">
        <header className="mb-5 flex items-center gap-3">
          <button onClick={() => router.replace(booking.status === 'holding' && booking.holdExpiresAt > Date.now() ? '/dat-cho/' + encodeURIComponent(booking.spotId) : '/')} aria-label="Quay lại chọn phương thức" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">EZ-Space</p>
            <h1 className="text-xl font-bold tracking-tight">Chuyển khoản ngân hàng</h1>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="bg-[#123b38] px-5 py-5 text-white">
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-100">Tiền cọc cần thanh toán</span>
              <ShieldCheck size={19} className="text-emerald-200" />
            </div>
            <div className="mt-2 text-[34px] font-extrabold leading-none tracking-tight">{money(payment?.amount_vnd ?? DEPOSIT)}</div>
            <p className="mt-3 text-xs text-emerald-100">Đơn {booking.id} · Chỉ chuyển đúng số tiền và nội dung bên dưới</p>
          </div>

          {!payment && !attemptId && (
            <div className="px-5 py-6">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <QrCode size={30} />
              </div>
              <h2 className="mt-4 text-center text-base font-bold">Tạo mã thanh toán cho đơn này</h2>
              <p className="mx-auto mt-1 max-w-[300px] text-center text-sm leading-5 text-slate-500">
                Mã VietQR sẽ có sẵn số tiền, tài khoản nhận và nội dung chuyển khoản.
              </p>
              <button onClick={createPayment} disabled={loading || booking.status !== 'holding'} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:bg-slate-300">
                {loading && <LoaderCircle size={17} className="animate-spin" />}
                {loading ? 'Đang tạo mã...' : 'Tạo mã VietQR'}
              </button>
            </div>
          )}

          {!payment && attemptId && (
            <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-slate-600">
              <LoaderCircle size={18} className="animate-spin text-emerald-700" /> Đang tải thông tin chuyển khoản...
            </div>
          )}

          {payment && (
            <div className="px-5 pb-6 pt-5">
              {payment.status === 'pending' ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> Đang chờ chuyển khoản
                  </div>
                  <div className="mx-auto mt-4 w-fit rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
                    <img src={payment.qr_url} alt="Mã VietQR thanh toán tiền cọc" className="h-[230px] w-[230px] object-contain" />
                  </div>
                  <a href={payment.qr_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700">
                    Mở mã QR để lưu <ExternalLink size={14} />
                  </a>
                </>
              ) : payment.status === 'success' ? (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
                  Đã xác nhận tiền cọc. Đang mở vé của bạn...
                </div>
              ) : (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">
                  {payment.status === 'late'
                    ? 'Tiền đến sau hạn giữ chỗ. Vui lòng liên hệ hỗ trợ để đối soát.'
                    : 'Mã đã hết hạn. Vui lòng đặt chỗ lại trước khi chuyển tiền.'}
                </div>
              )}

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-3.5">
                  <Landmark size={19} className="mt-0.5 shrink-0 text-emerald-700" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Ngân hàng nhận</p>
                    <p className="mt-0.5 text-sm font-bold">{payment.bank_name || 'Ngân hàng ' + payment.bank_bin}</p>
                  </div>
                </div>
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Tên người thụ hưởng</p>
                  <p className="mt-0.5 break-words text-sm font-bold uppercase">{payment.account_name}</p>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Số tài khoản</p>
                    <p className="mt-0.5 select-all break-all text-base font-bold tabular-nums">{payment.account_number}</p>
                  </div>
                  {payment.status === 'pending' && <button onClick={() => void copy(payment.account_number, 'account')} aria-label="Sao chép số tài khoản" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
                    {copied === 'account' ? <Check size={17} /> : <Copy size={17} />}
                  </button>}
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Nội dung chuyển khoản</p>
                    <p className="mt-0.5 select-all break-all text-base font-bold tracking-wide text-emerald-800">{payment.transfer_content}</p>
                  </div>
                  {payment.status === 'pending' && <button onClick={() => void copy(payment.transfer_content, 'content')} aria-label="Sao chép nội dung chuyển khoản" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
                    {copied === 'content' ? <Check size={17} /> : <Copy size={17} />}
                  </button>}
                </div>
              </div>

              {payment.status === 'pending' && (
                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-900">
                  <strong>Dùng cùng một điện thoại?</strong> Sao chép số tài khoản và nội dung ở trên, rồi chuyển trong ứng dụng ngân hàng. Hệ thống sẽ tự xác nhận khi tiền vào.
                  <p className="mt-1 text-emerald-700">Mã có hiệu lực đến {new Date(payment.expires_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {error && <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Chi tiết đặt chỗ</h2>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{booking.id}</span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Building2 size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0"><p className="text-xs text-slate-500">Bãi đỗ</p><p className="font-semibold">{lot?.name || booking.lotId}</p></div>
            </div>
            <div className="flex items-start gap-3">
              <CarFront size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0"><p className="text-xs text-slate-500">Ô đỗ · Biển số</p><p className="font-semibold">{booking.spotId} · {vehicle?.plate || 'Chưa có'}</p></div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13} /> Giờ vào dự kiến</div>
              <p className="mt-1 text-sm font-bold tabular-nums">{booking.startTime || dateTime(estimatedStart)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13} /> Giờ ra dự kiến</div>
              <p className="mt-1 text-sm font-bold tabular-nums">{booking.endTime || dateTime(estimatedEnd)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Thời lượng dự kiến: {hours} giờ. Thời gian thực tế được tính khi xe vào và ra bãi.</p>
          <div className="mt-4 space-y-2 border-t border-dashed border-slate-200 pt-4 text-sm">
            <div className="flex justify-between text-slate-600"><span>Giá đỗ dự kiến</span><span className="font-semibold text-slate-900">{money(estimatedPrice)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Tiền cọc thanh toán ngay</span><span className="font-bold text-emerald-700">{money(DEPOSIT)}</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
