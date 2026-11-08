'use strict';
const { q, first, safeQuery } = require('../db.cjs');

async function records() {
  const reservations = await q(`
    SELECT r.id, r.user_id, u.full_name customer, r.parking_lot_id, l.name lot_name,
           r.slot_id, s.code slot_code, v.license_plate, v.vehicle_name, v.vehicle_type,
           r.start_time, r.expected_end_time, r.status, r.hold_expires_at, r.arrival_expires_at,
           r.hourly_rate, r.deposit_amount, r.total_amount, r.cancelled_at, r.cancel_reason,
           r.created_at, r.updated_at
    FROM reservations r
    JOIN users u ON u.id = r.user_id
    JOIN parking_lots l ON l.id = r.parking_lot_id
    JOIN slots s ON s.id = r.slot_id
    JOIN vehicles v ON v.id = r.vehicle_id
    ORDER BY r.id DESC
    LIMIT 1000
  `);

  const vehicles = await q(`
    SELECT v.id, v.user_id, u.full_name owner, u.email owner_email,
           v.license_plate, v.vehicle_name, v.vehicle_type, v.is_default, v.created_at, v.updated_at
    FROM vehicles v
    JOIN users u ON u.id = v.user_id
    ORDER BY v.id DESC
    LIMIT 1000
  `);

  const slots = await q(`
    SELECT s.id, s.parking_lot_id, l.name lot_name, s.code,
           s.row_index, s.col_index, s.slot_type, s.status, s.is_active, s.created_at, s.updated_at
    FROM slots s
    JOIN parking_lots l ON l.id = s.parking_lot_id
    ORDER BY s.parking_lot_id, s.row_index, s.col_index
    LIMIT 2000
  `);

  const payments = await q(`
    SELECT p.id, p.reservation_id, u.full_name customer, l.name lot_name,
           p.provider, p.transaction_ref, p.payment_type, p.amount, p.status,
           p.response_code, p.ipn_received_at, p.paid_at, p.created_at
    FROM payments p
    JOIN reservations r ON r.id = p.reservation_id
    JOIN parking_lots l ON l.id = r.parking_lot_id
    JOIN users u ON u.id = r.user_id
    ORDER BY p.id DESC
    LIMIT 1000
  `);

  const tickets = await q(`
    SELECT qt.id, qt.reservation_id, u.full_name customer, l.name lot_name, s.code slot_code,
           qt.status, qt.issued_at, qt.used_at, qt.expires_at, qt.created_at
    FROM qr_tickets qt
    JOIN reservations r ON r.id = qt.reservation_id
    JOIN users u ON u.id = r.user_id
    JOIN parking_lots l ON l.id = r.parking_lot_id
    JOIN slots s ON s.id = r.slot_id
    ORDER BY qt.id DESC
    LIMIT 1000
  `);

  const sessions = await q(`
    SELECT ps.id, ps.reservation_id, u.full_name customer, l.name lot_name, s.code slot_code,
           v.license_plate, ps.check_in_at, ps.check_out_at,
           u_in.full_name checked_in_by_name, u_out.full_name checked_out_by_name,
           ps.checked_in_by, ps.checked_out_by,
           ps.final_amount, ps.status, ps.created_at
    FROM parking_sessions ps
    JOIN reservations r ON r.id = ps.reservation_id
    JOIN users u ON u.id = r.user_id
    JOIN parking_lots l ON l.id = r.parking_lot_id
    JOIN slots s ON s.id = r.slot_id
    JOIN vehicles v ON v.id = r.vehicle_id
    LEFT JOIN users u_in ON u_in.id = ps.checked_in_by
    LEFT JOIN users u_out ON u_out.id = ps.checked_out_by
    ORDER BY ps.id DESC
    LIMIT 1000
  `);

  const pricing = await q(`
    SELECT pr.id, l.name lot_name, pr.parking_lot_id, pr.name,
           pr.start_time, pr.end_time, pr.hourly_rate, pr.surcharge,
           pr.effective_from, pr.effective_to, pr.created_at
    FROM pricing_rules pr
    JOIN parking_lots l ON l.id = pr.parking_lot_id
    ORDER BY pr.parking_lot_id, pr.id
    LIMIT 1000
  `);

  const chat_messages = await safeQuery(`
    SELECT cm.id, cm.user_id, u.full_name user_name, u.email user_email,
           cm.role, cm.message, cm.created_at
    FROM chat_messages cm
    JOIN users u ON u.id = cm.user_id
    ORDER BY cm.id DESC
    LIMIT 500
  `);

  const otps = await q(`
    SELECT id, email, purpose, attempts, is_used, expires_at, created_at
    FROM email_otps
    ORDER BY id DESC
    LIMIT 500
  `);

  const otp_stats = await first(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE is_used)::int used,
           COUNT(*) FILTER (WHERE expires_at < NOW())::int expired
    FROM email_otps
  `);

  return {
    reservations,
    vehicles,
    slots,
    payments,
    tickets,
    sessions,
    pricing,
    chat_messages,
    otps,
    otp_stats
  };
}

module.exports = { records };
