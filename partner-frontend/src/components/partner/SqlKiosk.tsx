"use client";

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, LogIn, LogOut, Search } from 'lucide-react';
import jsQR from 'jsqr';
import { dateTime, labels, money } from '@/lib/database-model';
import { useSqlWorkspace } from './SqlWorkspace';
import { Field } from './SqlForms';
import styles from './sql-portal.module.css';

export type KioskTicket = {
  reservation_id: string; code: string; status: string; parking_lot_id: string; lot_name: string; slot_code: string;
  license_plate: string | null; vehicle_type: string | null; customer_name: string; customer_phone: string | null;
  start_time: string; expected_end_time: string; arrival_expires_at: string | null;
  hourly_rate: number; deposit_amount: number; total_amount: number | null; paid_total: number;
  qr_status: string | null; qr_expires_at: string | null; qr_used_at: string | null;
  session_id: string | null; session_status: string | null; check_in_at: string | null; check_out_at: string | null; final_amount: number | null;
  allowed_action: 'check_in' | 'check_out' | null; duration_minutes?: number; amount_due?: number;
};
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

export default function SqlKiosk() {
  const { selectedId, call, busy } = useSqlWorkspace();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef(0);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState<KioskTicket | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const stopCamera = () => {
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setScanning(false);
  };
  useEffect(() => stopCamera, []);
  useEffect(() => { setTicket(null); setSuccess(''); setError(''); }, [selectedId]);

  const lookup = async (value: string) => {
    const clean = value.trim();
    if (!clean) { setError('Nhập mã vé, ví dụ EZ-59 hoặc 59.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try { setTicket(await call<KioskTicket>('/kiosk/lookup', { code: clean, parking_lot_id: selectedId })); }
    catch (cause) { setTicket(null); setError(cause instanceof Error ? cause.message : 'Không kiểm tra được vé.'); }
    finally { setLoading(false); }
  };

  const startCamera = async () => {
    setError(''); setSuccess('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('Trình duyệt không hỗ trợ camera. Hãy nhập mã vé thủ công.'); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    } catch { setError('Không mở được camera. Kiểm tra quyền truy cập camera hoặc nhập mã vé thủ công.'); return; }
    setScanning(true);
    const element = video.current!;
    element.srcObject = stream.current;
    await element.play().catch(() => {});
    const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = Native ? new Native({ formats: ['qr_code'] }) : null;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const tick = async () => {
      if (!stream.current) return;
      if (element.readyState >= 2 && element.videoWidth) {
        let value: string | undefined;
        try {
          if (detector) value = (await detector.detect(element))[0]?.rawValue;
          else if (context) {
            canvas.width = element.videoWidth; canvas.height = element.videoHeight;
            context.drawImage(element, 0, 0);
            value = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' })?.data;
          }
        } catch { /* keep scanning */ }
        if (value) { stopCamera(); setCode(value); void lookup(value); return; }
      }
      frame.current = requestAnimationFrame(() => void tick());
    };
    frame.current = requestAnimationFrame(() => void tick());
  };

  const confirm = async (action: 'check_in' | 'check_out') => {
    if (!ticket) return;
    setError(''); setSuccess('');
    try {
      const result = await call<KioskTicket>(action === 'check_in' ? '/kiosk/check-in' : '/kiosk/check-out', { code: ticket.reservation_id, parking_lot_id: selectedId }, true);
      setTicket(result);
      setSuccess(action === 'check_in'
        ? `Đã xác nhận vào bãi: ${result.code} · ô ${result.slot_code}.`
        : `Đã xác nhận ra bãi: ${result.code} · ${result.duration_minutes ?? 0} phút · tổng ${money(result.final_amount ?? 0)}${result.amount_due ? ` · cần thu thêm ${money(result.amount_due)}` : ' · không phải thu thêm'}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xác nhận được.'); }
  };

  return <div className={styles.twoColumns}>
    <section className={styles.panel}>
      <div className={styles.panelHead}><div><h2>Kiểm tra vé tại cổng</h2><small>Quét QR trên app khách hoặc nhập mã vé</small></div></div>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0f172a', aspectRatio: '4 / 3', display: scanning ? 'block' : 'none' }}>
        <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{ position: 'absolute', inset: '18%', border: '3px solid #60a5fa', borderRadius: 14 }} />
      </div>
      <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: scanning ? 12 : 0 }}>
        {scanning
          ? <button type="button" className={styles.secondary} onClick={stopCamera}><CameraOff size={15} />Tắt camera</button>
          : <button type="button" className={styles.primary} onClick={() => void startCamera()}><Camera size={15} />Mở camera quét QR</button>}
      </div>
      <form className={styles.form} style={{ marginTop: 18 }} onSubmit={e => { e.preventDefault(); void lookup(code); }}>
        <Field label="Mã vé (khi không quét được QR)"><input value={code} onChange={e => setCode(e.target.value)} required maxLength={500} placeholder="Ví dụ: EZ-59 hoặc 59" autoComplete="off" /></Field>
        <button className={styles.primary} type="submit" disabled={loading}><Search size={15} />{loading ? 'Đang kiểm tra…' : 'Kiểm tra vé'}</button>
      </form>
      {error && <p className={styles.error} role="alert" style={{ marginTop: 14 }}>{error}</p>}
      {success && <p className={styles.notice} role="status" style={{ marginTop: 14 }}>{success}</p>}
    </section>
    <section className={styles.panel}>
      <h2>Thông tin vé & phiên đỗ</h2>
      {!ticket ? <p className={styles.empty}>Quét QR hoặc nhập mã vé để xem thông tin.</p> : <>
        <dl className={styles.definition}>
          <div><dt>Mã vé</dt><dd><b>{ticket.code}</b> · <span className={styles.badge} data-state={ticket.status}>{labels[ticket.status] ?? ticket.status}</span></dd></div>
          <div><dt>Khách hàng</dt><dd>{ticket.customer_name} · {ticket.customer_phone ?? '—'}</dd></div>
          <div><dt>Xe / ô đỗ</dt><dd>{ticket.license_plate ?? '—'} ({ticket.vehicle_type ?? '—'}) · Ô {ticket.slot_code}</dd></div>
          <div><dt>Thời gian dự kiến</dt><dd>{dateTime(ticket.start_time)} → {dateTime(ticket.expected_end_time)}</dd></div>
          <div><dt>Hạn đến bãi</dt><dd>{dateTime(ticket.arrival_expires_at)}</dd></div>
          <div><dt>Vé QR</dt><dd>{ticket.qr_status ? labels[ticket.qr_status] ?? ticket.qr_status : 'Chưa phát hành'}</dd></div>
          <div><dt>Giá chốt / đã thanh toán</dt><dd>{money(ticket.hourly_rate)}/giờ · đã thu {money(ticket.paid_total)}</dd></div>
          <div><dt>Vào / ra thực tế</dt><dd>{dateTime(ticket.check_in_at)} / {dateTime(ticket.check_out_at)}</dd></div>
          {ticket.final_amount !== null && <div><dt>Tổng tiền phiên</dt><dd>{money(ticket.final_amount)}</dd></div>}
        </dl>
        <div className={styles.actions}>
          {ticket.allowed_action === 'check_in' && <button className={styles.primary} disabled={busy} onClick={() => void confirm('check_in')}><LogIn size={15} />{busy ? 'Đang xác nhận…' : 'Xác nhận vào bãi'}</button>}
          {ticket.allowed_action === 'check_out' && <button className={styles.primary} disabled={busy} onClick={() => void confirm('check_out')}><LogOut size={15} />{busy ? 'Đang xác nhận…' : 'Xác nhận ra bãi'}</button>}
          {!ticket.allowed_action && <p className={styles.note}>Vé ở trạng thái “{labels[ticket.status] ?? ticket.status}”, không thể vào hoặc ra bãi.</p>}
        </div>
      </>}
    </section>
  </div>;
}
