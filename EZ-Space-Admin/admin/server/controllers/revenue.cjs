'use strict';
const { q, first, rangeDates } = require('../db.cjs');
const { viewRange } = require('./utils.cjs');

async function revenue(params) {
  const range = rangeDates(params.range || 'month');
  const a = [range.from, range.to];

  const totals = await first(
    `SELECT COUNT(*)::int transactions,
            COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type IN ('deposit', 'final')), 0) received,
            COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type = 'deposit'), 0) deposits,
            COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type = 'final'), 0) finals,
            COALESCE(SUM(amount) FILTER (WHERE payment_type = 'refund' AND status IN ('success', 'refunded')), 0) refunds,
            COUNT(*) FILTER (WHERE status = 'success' AND payment_type = 'deposit')::int paid_deposits
     FROM payments
     WHERE paid_at >= $1 AND paid_at < $2`,
    a
  );

  const byLot = await q(
    `SELECT l.id, l.name, l.status,
            COUNT(DISTINCT r.id) FILTER (WHERE p.status = 'success' AND p.payment_type = 'deposit')::int bookings,
            COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success' AND p.payment_type = 'deposit'), 0) deposits,
            COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success' AND p.payment_type = 'final'), 0) finals,
            COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success' AND p.payment_type IN ('deposit', 'final')), 0) received,
            COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'refund' AND p.status IN ('success', 'refunded')), 0) refunds,
            COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success' AND p.payment_type = 'deposit' AND r.status = 'forfeited'), 0) forfeited_deposits
     FROM parking_lots l
     LEFT JOIN reservations r ON r.parking_lot_id = l.id
     LEFT JOIN payments p ON p.reservation_id = r.id AND p.paid_at >= $1 AND p.paid_at < $2
     GROUP BY l.id
     ORDER BY received DESC, l.id`,
    a
  );

  const byProvider = await q(
    `SELECT provider,
            COUNT(*)::int transactions,
            COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type IN ('deposit', 'final')), 0) received
     FROM payments
     WHERE paid_at >= $1 AND paid_at < $2
     GROUP BY provider
     ORDER BY received DESC`,
    a
  );

  const byVehicle = await q(
    `SELECT v.vehicle_type,
            COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success' AND p.payment_type IN ('deposit', 'final')), 0) received,
            COUNT(DISTINCT p.reservation_id)::int bookings
     FROM payments p
     JOIN reservations r ON r.id = p.reservation_id
     JOIN vehicles v ON v.id = r.vehicle_id
     WHERE p.paid_at >= $1 AND p.paid_at < $2
     GROUP BY v.vehicle_type
     ORDER BY received DESC`,
    a
  );

  const recent = await q(
    `SELECT p.id, p.reservation_id, p.provider, p.payment_type, p.amount, p.status,
            p.transaction_ref, p.response_code, p.paid_at,
            l.name lot_name, u.full_name customer, v.license_plate
     FROM payments p
     JOIN reservations r ON r.id = p.reservation_id
     JOIN parking_lots l ON l.id = r.parking_lot_id
     JOIN users u ON u.id = r.user_id
     JOIN vehicles v ON v.id = r.vehicle_id
     WHERE p.paid_at >= $1 AND p.paid_at < $2
     ORDER BY p.paid_at DESC, p.id DESC
     LIMIT 200`,
    a
  );

  const byDay = (
    await q(
      `SELECT (paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text AS "day",
              COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type = 'deposit'), 0) deposits,
              COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type = 'final'), 0) finals
       FROM payments
       WHERE paid_at >= $1 AND paid_at < $2
       GROUP BY 1
       ORDER BY 1 DESC
       LIMIT 120`,
      a
    )
  ).reverse();

  return { range: viewRange(range), totals, byLot, byProvider, byVehicle, recent, byDay, commission: null };
}

module.exports = { revenue };
