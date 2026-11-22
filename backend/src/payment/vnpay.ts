import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../config/db';
import { confirmDeposit, getHeldReservation, withPaymentTransaction } from './reservation';

const router = Router();
function credentials() {
  return {
    tmnCode: process.env.VNP_TMN_CODE?.trim() || '',
    secret: process.env.VNP_HASH_SECRET?.trim() || '',
  };
}

function encodedParams(params: Record<string, string>): string {
  return Object.keys(params).sort()
    .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
    .join('&');
}

function vnpDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (name: string) => parts.find((item) => item.type === name)?.value || '';
  return `${part('year')}${part('month')}${part('day')}${part('hour')}${part('minute')}${part('second')}`;
}

function customerIp(req: Request): string {
  const address = req.socket.remoteAddress || '';
  if (!address || address === '::1') return '127.0.0.1';
  return address.startsWith('::ffff:') ? address.slice(7) : address;
}

function verifyReply(values: Record<string, unknown>): boolean {
  const { secret } = credentials();
  const hash = values.vnp_SecureHash;
  if (!secret || typeof hash !== 'string' || !/^[0-9a-f]{128}$/i.test(hash)) return false;
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      if (typeof value !== 'string') return false;
      fields[key] = value;
    }
  }
  const expected = crypto.createHmac('sha512', secret).update(encodedParams(fields)).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(hash, 'hex'));
}

async function recordReply(values: Record<string, unknown>) {
  if (!verifyReply(values) || values.vnp_TmnCode !== credentials().tmnCode) {
    return { code: '97', message: 'Invalid signature' };
  }
  const ref = values.vnp_TxnRef;
  if (typeof ref !== 'string' || !/^[0-9a-f]{24}$/.test(ref)) {
    return { code: '01', message: 'Order not found' };
  }
  return withPaymentTransaction(async (client) => {
    const found = await client.query(
      'SELECT booking_id, amount_vnd, status FROM vnpay_payment_attempts WHERE txn_ref=$1 FOR UPDATE',
      [ref],
    );
    if (!found.rowCount) return { code: '01', message: 'Order not found' };
    const attempt = found.rows[0];
    if (values.vnp_Amount !== String(attempt.amount_vnd * 100)) {
      return { code: '04', message: 'Invalid amount' };
    }
    if (attempt.status !== 'pending') {
      return { code: '02', message: 'Order already confirmed', bookingId: attempt.booking_id, ref };
    }
    const success = values.vnp_ResponseCode === '00' && values.vnp_TransactionStatus === '00';
    const status = success
      ? await confirmDeposit(client, Number(String(attempt.booking_id).slice(3)), 'vnpay', ref, Number(attempt.amount_vnd))
      : 'failed';
    await client.query(
      'UPDATE vnpay_payment_attempts SET status=$2, transaction_no=$3, bank_code=$4, confirmed_at=NOW() WHERE txn_ref=$1',
      [ref, status,
        typeof values.vnp_TransactionNo === 'string' ? values.vnp_TransactionNo : null,
        typeof values.vnp_BankCode === 'string' ? values.vnp_BankCode : null],
    );
    return { code: '00', message: 'Confirm success', bookingId: attempt.booking_id, ref };
  });
}

router.post('/create-vnpay', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;
    const reservation = await getHeldReservation(bookingId);
    if (!reservation) return res.status(400).json({ success: false, message: 'Đơn giữ chỗ không còn hiệu lực' });
    const { tmnCode, secret } = credentials();
    if (!tmnCode || !secret) return res.status(503).json({ success: false, message: 'Chưa cấu hình VNPay' });

    const ref = crypto.randomBytes(12).toString('hex');
    const now = new Date();
    const createDate = vnpDate(now);
    const expireDate = vnpDate(reservation.holdExpiresAt);
    const backendUrl = (process.env.PUBLIC_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
    const fields: Record<string, string> = {
      vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn', vnp_CurrCode: 'VND', vnp_TxnRef: ref,
      vnp_OrderInfo: `Thanh toan coc EZ Parking ${bookingId.replace(/[^A-Za-z0-9]/g, '')}`, vnp_OrderType: 'other',
      vnp_Amount: String(reservation.depositAmount * 100),
      vnp_ReturnUrl: `${backendUrl}/api/payment/vnpay-return`,
      vnp_IpAddr: customerIp(req),
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };
    const signed = encodedParams(fields);
    const hash = crypto.createHmac('sha512', secret).update(signed).digest('hex');
    await query(
      'INSERT INTO vnpay_payment_attempts (txn_ref, booking_id, amount_vnd) VALUES ($1,$2,$3)',
      [ref, bookingId, reservation.depositAmount],
    );
    const gatewayUrl = process.env.VNP_PAYMENT_URL?.trim() || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    return res.json({ success: true, paymentUrl: `${gatewayUrl}?${signed}&vnp_SecureHash=${hash}`, attemptId: ref });
  } catch (error) {
    console.error('Lỗi tạo link VNPay:', error);
    return res.status(500).json({ success: false, message: 'Không tạo được link thanh toán' });
  }
});

router.get('/vnpay-ipn', async (req: Request, res: Response) => {
  try {
    const result = await recordReply(req.query);
    return res.json({ RspCode: result.code, Message: result.message });
  } catch (error) {
    console.error('Lỗi IPN VNPay:', error);
    return res.json({ RspCode: '99', Message: 'Internal error' });
  }
});

router.get('/vnpay-return', async (req: Request, res: Response) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  try {
    const result = await recordReply(req.query);
    if (!result.bookingId || !result.ref) return res.redirect(`${frontendUrl}/thanh-toan/vnpay?error=invalid-result`);
    return res.redirect(`${frontendUrl}/thanh-toan/ket-qua?method=vnpay&attempt=${result.ref}`);
  } catch (error) {
    console.error('Lỗi VNPay return:', error);
    return res.redirect(`${frontendUrl}/thanh-toan/vnpay?error=return-failed`);
  }
});

router.get('/vnpay-status/:ref', async (req: Request, res: Response) => {
  const ref = req.params.ref;
  if (typeof ref !== 'string' || !/^[0-9a-f]{24}$/.test(ref)) return res.status(400).json({ success: false });
  try {
    const found = await query(
      'SELECT booking_id, amount_vnd, status, transaction_no, bank_code FROM vnpay_payment_attempts WHERE txn_ref=$1',
      [ref],
    );
    if (!found.rowCount) return res.status(404).json({ success: false });
    return res.json({ success: true, payment: found.rows[0] });
  } catch (error) {
    console.error('Lỗi đọc trạng thái VNPay:', error);
    return res.status(500).json({ success: false });
  }
});

export default router;
