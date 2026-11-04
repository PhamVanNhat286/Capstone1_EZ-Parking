import type { PoolClient } from 'pg';
import { pool, query } from '../config/db';

export type HeldReservation = {
  id: number;
  depositAmount: number;
  holdExpiresAt: Date;
};

export async function getHeldReservation(bookingId: unknown): Promise<HeldReservation | null> {
  if (typeof bookingId !== 'string' || !/^EZ-[1-9]\d*$/.test(bookingId)) return null;
  const id = Number(bookingId.slice(3));
  if (!Number.isSafeInteger(id)) return null;
  const found = await query(
    'SELECT id, deposit_amount, hold_expires_at FROM reservations WHERE id=$1 AND status=$2 AND hold_expires_at > NOW()',
    [id, 'holding'],
  );
  if (!found.rowCount) return null;
  const depositAmount = Number(found.rows[0].deposit_amount);
  if (!Number.isSafeInteger(depositAmount) || depositAmount <= 0) return null;
  return {
    id,
    depositAmount,
    holdExpiresAt: new Date(found.rows[0].hold_expires_at),
  };
}

export async function confirmDeposit(
  client: PoolClient,
  reservationId: number,
  provider: 'vnpay' | 'bank',
  reference: string,
  amount: number,
): Promise<'success' | 'late'> {
  const found = await client.query(
    'SELECT id, status, hold_expires_at, deposit_amount FROM reservations WHERE id=$1 FOR UPDATE',
    [reservationId],
  );
  const reservation = found.rows[0];
  if (!reservation || reservation.status !== 'holding' ||
      new Date(reservation.hold_expires_at).getTime() <= Date.now() ||
      Number(reservation.deposit_amount) !== amount) return 'late';

  await client.query(
    "UPDATE reservations SET status='paid', arrival_expires_at=NOW() + INTERVAL '20 minutes', updated_at=NOW() WHERE id=$1",
    [reservationId],
  );
  await client.query(
    "INSERT INTO payments (reservation_id, provider, transaction_ref, payment_type, amount, status, paid_at) VALUES ($1,$2,$3,'deposit',$4,'success',NOW())",
    [reservationId, provider, reference, amount],
  );
  return 'success';
}

export async function withPaymentTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
