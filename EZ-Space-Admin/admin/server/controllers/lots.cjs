'use strict';
const { q, first, audit, withTx, err } = require('../db.cjs');
const { pass, validId, getActor } = require('./utils.cjs');

async function lots() {
  const items = await q(`
    SELECT l.*,
           (SELECT u.full_name FROM users u WHERE u.id = l.approved_by) approver_name,
           (SELECT STRING_AGG(DISTINCT u.full_name || ' (' || u.email || ')', ', ')
            FROM parking_lot_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE pm.parking_lot_id = l.id) managers,
           (SELECT STRING_AGG(v.vehicle_type::text, ', ')
            FROM parking_lot_vehicle_types v
            WHERE v.parking_lot_id = l.id) vehicle_types,
           (SELECT COUNT(*)::int FROM slots s WHERE s.parking_lot_id = l.id) slot_total,
           (SELECT COUNT(*)::int FROM slots s WHERE s.parking_lot_id = l.id AND s.status = 'available' AND s.is_active) slot_available,
           (SELECT COUNT(*)::int FROM slots s WHERE s.parking_lot_id = l.id AND s.status = 'occupied' AND s.is_active) slot_occupied,
           (SELECT COUNT(*)::int FROM slots s WHERE s.parking_lot_id = l.id AND s.status = 'holding' AND s.is_active) slot_holding,
           (SELECT COUNT(*)::int FROM slots s WHERE s.parking_lot_id = l.id AND (s.status = 'unavailable' OR NOT s.is_active)) slot_unavailable,
           (SELECT MIN(hourly_rate) FROM pricing_rules p WHERE p.parking_lot_id = l.id) min_rate,
           (SELECT MAX(hourly_rate) FROM pricing_rules p WHERE p.parking_lot_id = l.id) max_rate,
           (SELECT COUNT(*)::int FROM reservations r WHERE r.parking_lot_id = l.id) reservations
    FROM parking_lots l
    ORDER BY CASE l.status::text
               WHEN 'pending' THEN 1
               WHEN 'active' THEN 2
               WHEN 'inactive' THEN 3
               WHEN 'rejected' THEN 4
               ELSE 5
             END,
             l.id DESC
  `);
  return { items };
}

async function lot(params) {
  const id = validId(params.id);
  const lotRow = await first(
    `SELECT l.*, u.full_name AS approver_name
     FROM parking_lots l
     LEFT JOIN users u ON u.id = l.approved_by
     WHERE l.id = $1`,
    [id]
  );
  if (!lotRow.id) err('Không tìm thấy bãi đỗ xe.', 404);

  return {
    lot: lotRow,
    slots: await q('SELECT * FROM slots WHERE parking_lot_id = $1 ORDER BY row_index, col_index', [id]),
    pricing: await q('SELECT * FROM pricing_rules WHERE parking_lot_id = $1 ORDER BY start_time', [id]),
    managers: await q(
      `SELECT u.id, u.full_name, u.email, u.phone, m.assigned_at
       FROM parking_lot_managers m
       JOIN users u ON m.manager_id = u.id
       WHERE m.parking_lot_id = $1
       ORDER BY m.assigned_at`,
      [id]
    ),
    vehicles: await q('SELECT vehicle_type FROM parking_lot_vehicle_types WHERE parking_lot_id = $1', [id]),
    reservations: await q(
      'SELECT status, COUNT(*)::int amount FROM reservations WHERE parking_lot_id = $1 GROUP BY status',
      [id]
    )
  };
}

async function lotStatus(input) {
  const id = validId(input.id);
  const to = pass(input.status);
  const reason = pass(input.reason);
  if (!['active', 'inactive', 'rejected', 'pending'].includes(to)) err('Trạng thái bãi không hợp lệ.');
  if (['rejected', 'inactive'].includes(to) && reason.length < 3) {
    err('Cần nhập lý do từ chối hoặc tạm ngừng (ít nhất 3 ký tự).');
  }
  const allowed = {
    pending: ['active', 'rejected'],
    active: ['inactive'],
    inactive: ['active', 'pending'],
    rejected: ['pending']
  };
  return withTx(async client => {
    const actor = await getActor(client);
    const lock = await client.query(
      'SELECT id, name, status, approved_by, approved_at FROM parking_lots WHERE id = $1 FOR UPDATE',
      [id]
    );
    const old = lock.rows[0];
    if (!old) err('Không tìm thấy bãi đỗ xe.', 404);
    if (!allowed[old.status]?.includes(to)) {
      err(`Không thể chuyển trạng thái từ ${old.status} sang ${to}.`, 409);
    }
    const upd = await client.query(
      `UPDATE parking_lots
       SET status = $1::parking_lot_status,
           approved_by = CASE WHEN $1::parking_lot_status = 'active' THEN $2 ELSE approved_by END,
           approved_at = CASE WHEN $1::parking_lot_status = 'active' THEN NOW() ELSE approved_at END
       WHERE id = $3
       RETURNING id, name, status, approved_by, approved_at`,
      [to, actor, id]
    );
    const actionCode = old.status === 'pending' && to === 'active' ? 'APPROVE_LOT' : 'LOT_STATUS_CHANGED';
    const defaultNote =
      actionCode === 'APPROVE_LOT'
        ? `Admin duyệt mở bãi ${old.name}`
        : `Cập nhật trạng thái bãi ${old.name} sang ${to}`;
    await audit(client, actor, id, actionCode, 'parking_lots', id, old, upd.rows[0], reason || defaultNote);
    return { ok: true, item: upd.rows[0] };
  });
}

module.exports = { lots, lot, lotStatus };
