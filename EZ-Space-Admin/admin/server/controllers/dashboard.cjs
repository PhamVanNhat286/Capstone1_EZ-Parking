'use strict';
const { q, first, safeFirst, rangeDates } = require('../db.cjs');
const { viewRange } = require('./utils.cjs');

async function summary() {
  const users = await first(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE role = 'customer')::int customers,
           COUNT(*) FILTER (WHERE role = 'manager')::int managers,
           COUNT(*) FILTER (WHERE role = 'admin')::int admins,
           COUNT(*) FILTER (WHERE status = 'active')::int active,
           COUNT(*) FILTER (WHERE status = 'inactive')::int inactive,
           COUNT(*) FILTER (WHERE status = 'banned')::int banned
    FROM users
  `);

  const lots = await first(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE status = 'active')::int active,
           COUNT(*) FILTER (WHERE status = 'pending')::int pending,
           COUNT(*) FILTER (WHERE status = 'inactive')::int inactive,
           COUNT(*) FILTER (WHERE status = 'rejected')::int rejected,
           COALESCE(SUM(capacity), 0)::int capacity
    FROM parking_lots
  `);

  const slots = await first(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE status = 'available' AND is_active)::int available,
           COUNT(*) FILTER (WHERE status = 'holding' AND is_active)::int holding,
           COUNT(*) FILTER (WHERE status = 'occupied' AND is_active)::int occupied,
           COUNT(*) FILTER (WHERE status = 'unavailable' OR NOT is_active)::int unavailable,
           COUNT(*) FILTER (WHERE slot_type = 'standard')::int standard,
           COUNT(*) FILTER (WHERE slot_type = 'ev_charging')::int ev_charging,
           COUNT(*) FILTER (WHERE slot_type = 'large')::int large,
           COUNT(*) FILTER (WHERE slot_type = 'disabled')::int disabled
    FROM slots
  `);

  const sessions = await first(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE status = 'active')::int active,
           COUNT(*) FILTER (WHERE status = 'completed')::int completed,
           COUNT(*) FILTER (WHERE status = 'abandoned')::int abandoned
    FROM parking_sessions
  `);

  const tickets = await first(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE status = 'active')::int active,
           COUNT(*) FILTER (WHERE status = 'used')::int used,
           COUNT(*) FILTER (WHERE status = 'expired')::int expired,
           COUNT(*) FILTER (WHERE status = 'cancelled')::int cancelled
    FROM qr_tickets
  `);

  const vehicles = await first(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE vehicle_type = 'Sedan')::int sedan,
           COUNT(*) FILTER (WHERE vehicle_type = 'SUV')::int suv,
           COUNT(*) FILTER (WHERE vehicle_type = 'EV')::int ev
    FROM vehicles
  `);

  const chat = await safeFirst(
    `SELECT COUNT(*)::int total,
            COUNT(*) FILTER (WHERE role = 'user')::int user_msgs,
            COUNT(*) FILTER (WHERE role = 'ai')::int ai_msgs
     FROM chat_messages`,
    [],
    { total: 0, user_msgs: 0, ai_msgs: 0 }
  );

  return {
    users,
    lots,
    slots,
    sessions,
    tickets,
    vehicles,
    chat,
    server_time: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
  };
}

async function dashboard(params) {
  const range = rangeDates(params.range || 'today');
  const a = [range.from, range.to];

  const books = await first(
    `SELECT COUNT(*)::int total,
            COUNT(*) FILTER (WHERE status = 'holding')::int holding,
            COUNT(*) FILTER (WHERE status = 'paid')::int paid,
            COUNT(*) FILTER (WHERE status = 'entered')::int entered,
            COUNT(*) FILTER (WHERE status = 'completed')::int completed,
            COUNT(*) FILTER (WHERE status = 'cancelled')::int cancelled,
            COUNT(*) FILTER (WHERE status = 'forfeited')::int forfeited,
            COUNT(*) FILTER (WHERE status = 'refunded')::int refunded
     FROM reservations
     WHERE created_at >= $1 AND created_at < $2`,
    a
  );

  const payments = await first(
    `SELECT COUNT(*)::int transactions,
            COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type IN ('deposit', 'final')), 0) received,
            COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type = 'deposit'), 0) deposits,
            COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type = 'final'), 0) finals,
            COALESCE(SUM(amount) FILTER (WHERE payment_type = 'refund' AND status IN ('success', 'refunded')), 0) refunds,
            COUNT(*) FILTER (WHERE status = 'success')::int successful
     FROM payments
     WHERE paid_at >= $1 AND paid_at < $2`,
    a
  );

  const hourly = await q(
    `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS "hour",status,COUNT(*)::int amount
     FROM reservations
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY 1, status
     ORDER BY "hour"`,
    a
  );

  const recent = await q(`
    SELECT r.id, r.status, r.created_at, r.start_time, r.expected_end_time,
           r.deposit_amount, r.total_amount,
           l.name lot_name, u.full_name customer,
           s.code slot_code, v.license_plate, v.vehicle_type
    FROM reservations r
    JOIN users u ON u.id = r.user_id
    JOIN parking_lots l ON l.id = r.parking_lot_id
    JOIN slots s ON s.id = r.slot_id
    JOIN vehicles v ON v.id = r.vehicle_id
    ORDER BY r.id DESC
    LIMIT 12
  `);

  const pending = await q(`
    SELECT l.id, l.name, l.address, l.capacity, l.open_time, l.close_time, l.created_at,
           STRING_AGG(DISTINCT u.full_name, ', ') managers
    FROM parking_lots l
    LEFT JOIN parking_lot_managers m ON m.parking_lot_id = l.id
    LEFT JOIN users u ON u.id = m.manager_id
    WHERE l.status = 'pending'
    GROUP BY l.id
    ORDER BY l.created_at ASC
    LIMIT 10
  `);

  const logs = await q(`
    SELECT a.id, a.action, a.note, a.created_at, a.entity_type, a.entity_id,
           u.full_name actor, l.name lot_name
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN parking_lots l ON l.id = a.parking_lot_id
    ORDER BY a.id DESC
    LIMIT 8
  `);

  return { range: viewRange(range), books, payments, hourly, recent, pending, logs };
}

module.exports = { summary, dashboard };
