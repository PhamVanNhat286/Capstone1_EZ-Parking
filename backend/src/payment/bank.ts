import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../config/db';
import { confirmDeposit, getHeldReservation, withPaymentTransaction } from './reservation';

const router = Router();
const SEPAY_API = 'https://userapi.sepay.vn/v2';

function sepayConfig() {
  return {
    token: process.env.SEPAY_API_TOKEN?.trim() || '',
    accountNumber: process.env.SEPAY_BANK_ACCOUNT_NO?.trim() || '',
  };
}

type SepayAccount = {
  account_number: string;
  account_holder_name: string;
  bank_bin: string;
  bank_full_name?: string;
  bank_short_name?: string;
  active?: number;
};

async function getSepayAccount(): Promise<SepayAccount> {
  const config = sepayConfig();
  if (!config.token || !config.accountNumber) throw new Error('SEPAY_NOT_CONFIGURED');
  const url = new URL(SEPAY_API + '/bank-accounts');
  url.searchParams.set('q', config.accountNumber);
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + config.token },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('SEPAY_API_' + response.status);
  const result = await response.json() as { data?: SepayAccount[] };
  const account = result.data?.find((item) => item.account_number === config.accountNumber && item.active !== 0);
  if (!account || !/^\d{6}$/.test(account.bank_bin) ||
      !account.account_holder_name?.trim()) throw new Error('SEPAY_ACCOUNT_NOT_FOUND');
  return account;
}

function transferContent(bin: string, code: string) {
  return bin === '970415' ? `SEVQR ${code}` : code;
}

function qrUrl(bin: string, accountNumber: string, accountName: string, code: string, amount: number) {
  const params = new URLSearchParams({ amount: String(amount), addInfo: transferContent(bin, code), accountName });
  return `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.svg?${params}`;
}

router.post('/create-bank', async (req: Request, res: Response) => {
  const bookingId = req.body?.bookingId;
  const reservation = await getHeldReservation(bookingId);
  if (!reservation) return res.status(400).json({ success: false, message: 'Đơn giữ chỗ không còn hiệu lực' });
  let account: SepayAccount;
  try {
    account = await getSepayAccount();
  } catch (error) {
    console.warn('[Bank] SePay account lookup failed:', error);
    return res.status(503).json({ success: false, message: 'Chưa kết nối được SePay API. Kiểm tra token API Access và tài khoản nhận trong backend/.env.' });
  }
  const bin = account.bank_bin;
  const accountNumber = account.account_number;
  const accountName = account.account_holder_name;
  const bankName = account.bank_full_name?.trim() || account.bank_short_name?.trim() || account.bank_bin;
  if (reservation.holdExpiresAt.getTime() <= Date.now()) {
    return res.status(409).json({ success: false, message: 'Đơn giữ chỗ đã hết hạn' });
  }
  const attemptId = crypto.randomBytes(12).toString('hex');
  const transferCode = `EZP${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  try {
    await query(
      `INSERT INTO bank_payment_attempts (attempt_id, booking_id, transfer_code, account_number, bank_bin, bank_name, account_name, amount_vnd, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0))`,
      [attemptId, bookingId, transferCode, accountNumber, bin, bankName, accountName, reservation.depositAmount, reservation.holdExpiresAt.getTime()],
    );
    return res.json({ success: true, attemptId, transferCode, amount: reservation.depositAmount,
      bankBin: bin, bankName, accountNumber, accountName, transferContent: transferContent(bin, transferCode), qrUrl: qrUrl(bin, accountNumber, accountName, transferCode, reservation.depositAmount) });
  } catch (error) {
    console.error('[Bank] Create error:', error);
    return res.status(500).json({ success: false, message: 'Không tạo được yêu cầu chuyển khoản' });
  }
});

const lastApiChecks = new Map<string, number>();

async function syncFromSepayApi(attemptId: string) {
  const config = sepayConfig();
  if (!config.token) return;
  const now = Date.now();
  if (now - (lastApiChecks.get(attemptId) || 0) < 10_000) return;
  if (lastApiChecks.size > 500) lastApiChecks.clear();
  lastApiChecks.set(attemptId, now);

  const found = await query(
    'SELECT transfer_code, account_number, amount_vnd, status, created_at FROM bank_payment_attempts WHERE attempt_id=$1',
    [attemptId],
  );
  const attempt = found.rows[0];
  if (!attempt || attempt.status !== 'pending') return;

  const url = new URL(SEPAY_API + '/transactions');
  url.searchParams.set('q', attempt.transfer_code);
  url.searchParams.set('amount_in_min', String(attempt.amount_vnd));
  url.searchParams.set('amount_in_max', String(attempt.amount_vnd));
  url.searchParams.set('transfer_type', 'in');
  url.searchParams.set('per_page', '20');
  url.searchParams.set('timestamp_format', 'iso8601');
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + config.token },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.warn('[Bank] SePay API status:', response.status);
    return;
  }
  const result = await response.json() as { data?: unknown[] };
  if (!Array.isArray(result.data)) return;
  for (const item of result.data) {
    if (!item || typeof item !== 'object') continue;
    const transaction = item as Record<string, unknown>;
    const transactionId = transaction.id;
    const content = transaction.transaction_content;
    const transactionDate = transaction.transaction_date;
    if (typeof transactionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(transactionId) ||
        typeof content !== 'string' || typeof transactionDate !== 'string' ||
        transaction.account_number !== attempt.account_number ||
        transaction.transfer_type !== 'in' || Number(transaction.amount_in) !== attempt.amount_vnd ||
        !content.toUpperCase().split(/[^A-Z0-9]/).includes(attempt.transfer_code)) continue;
    const receivedAt = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(transactionDate)
      ? transactionDate.replace(' ', 'T') + '+07:00'
      : transactionDate);
    if (Number.isNaN(receivedAt.getTime()) || receivedAt < new Date(attempt.created_at)) continue;
    await withPaymentTransaction(async (client) => {
      const locked = await client.query(
        'SELECT booking_id, amount_vnd, expires_at, status FROM bank_payment_attempts WHERE attempt_id=$1 FOR UPDATE',
        [attemptId],
      );
      const current = locked.rows[0];
      if (!current || current.status !== 'pending') return;
      const status = receivedAt <= new Date(current.expires_at)
        ? await confirmDeposit(client, Number(String(current.booking_id).slice(3)), 'bank', transactionId, Number(current.amount_vnd))
        : 'late';
      await client.query(
        'UPDATE bank_payment_attempts SET status=$2, sepay_transaction_id=$3, confirmed_at=$4 WHERE attempt_id=$1',
        [attemptId, status, transactionId, receivedAt.toISOString()],
      );
    });
    return;
  }
}

export function startBankReconciliationWorker() {
  if (!sepayConfig().token) return;
  let running = false;
  const reconcile = async () => {
    if (running) return;
    running = true;
    try {
      const found = await query(
        "SELECT attempt_id FROM bank_payment_attempts WHERE status='pending' AND created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC LIMIT 20",
      );
      for (const row of found.rows) {
        try { await syncFromSepayApi(row.attempt_id); }
        catch (error) { console.warn('[Bank] Reconciliation failed:', error); }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } catch (error) {
      console.warn('[Bank] Could not list pending payments:', error);
    } finally {
      running = false;
    }
  };
  void reconcile();
  setInterval(() => { void reconcile(); }, 20_000);
}

router.get('/bank-status/:attemptId', async (req: Request, res: Response) => {
  const attemptId = req.params.attemptId;
  if (typeof attemptId !== 'string' || !/^[0-9a-f]{24}$/.test(attemptId)) {
    return res.status(400).json({ success: false });
  }
  try {
    try { await syncFromSepayApi(attemptId); }
    catch (error) { console.warn('[Bank] SePay API check failed:', error); }
    const found = await query(
      `SELECT booking_id, amount_vnd, transfer_code, account_number, bank_bin, bank_name, account_name, status, sepay_transaction_id, expires_at
       FROM bank_payment_attempts WHERE attempt_id=$1`, [attemptId],
    );
    if (!found.rowCount) return res.status(404).json({ success: false });
    const payment = found.rows[0];
    const bin = payment.bank_bin;
    const accountName = payment.account_name;
    return res.json({ success: true, payment: {
      ...payment,
      status: payment.status === 'pending' && Date.now() > new Date(payment.expires_at).getTime() ? 'expired' : payment.status,
      bank_bin: bin,
      account_name: accountName,
      transfer_content: transferContent(bin, payment.transfer_code),
      qr_url: qrUrl(bin, payment.account_number, accountName, payment.transfer_code, Number(payment.amount_vnd)),
    } });
  } catch (error) {
    console.error('[Bank] Status error:', error);
    return res.status(500).json({ success: false });
  }
});

export default router;
