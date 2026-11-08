'use strict';
const { q, first, safeFirst, audit, withTx, err } = require('../db.cjs');
const { pass, validId, getActor } = require('./utils.cjs');

async function users() {
  const items = await q(`
    SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.avatar_url, u.created_at, u.updated_at,
           (SELECT COUNT(*)::int FROM vehicles v WHERE v.user_id = u.id) vehicles,
           (SELECT COUNT(*)::int FROM reservations r WHERE r.user_id = u.id) reservations,
           (SELECT COUNT(*)::int FROM parking_lot_managers m WHERE m.manager_id = u.id) lots
    FROM users u
    ORDER BY u.id
  `);
  return { items };
}

async function user(params) {
  const id = validId(params.id);
  const profile = await first(
    `SELECT id, full_name, email, phone, role, status, avatar_url, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  if (!profile.id) err('Không tìm thấy người dùng.', 404);

  const vehicles = await q(
    `SELECT id, license_plate, vehicle_name, vehicle_type, is_default, created_at
     FROM vehicles WHERE user_id = $1 ORDER BY is_default DESC, id`,
    [id]
  );

  const lots = await q(
    `SELECT l.id, l.name, l.address, l.status, l.capacity, m.assigned_at
     FROM parking_lot_managers m
     JOIN parking_lots l ON l.id = m.parking_lot_id
     WHERE m.manager_id = $1
     ORDER BY l.id`,
    [id]
  );

  const reservations = await q(
    `SELECT r.id, l.name AS lot_name, s.code AS slot_code, v.license_plate, v.vehicle_type,
            r.status, r.deposit_amount, r.total_amount, r.start_time, r.expected_end_time, r.created_at
     FROM reservations r
     JOIN parking_lots l ON l.id = r.parking_lot_id
     JOIN slots s ON s.id = r.slot_id
     JOIN vehicles v ON v.id = r.vehicle_id
     WHERE r.user_id = $1
     ORDER BY r.id DESC
     LIMIT 20`,
    [id]
  );

  const chat = await safeFirst(
    `SELECT COUNT(*)::int total FROM chat_messages WHERE user_id = $1`,
    [id],
    { total: 0 }
  );

  return { user: profile, vehicles, lots, reservations, chat_count: chat.total };
}

async function userStatus(input) {
  const id = validId(input.id);
  const to = pass(input.status);
  if (!['active', 'inactive', 'banned'].includes(to)) err('Trạng thái tài khoản không hợp lệ.');
  return withTx(async client => {
    const actor = await getActor(client);
    const lock = await client.query('SELECT id, full_name, role, status FROM users WHERE id = $1 FOR UPDATE', [id]);
    const old = lock.rows[0];
    if (!old) err('Không tìm thấy người dùng.', 404);
    if (id === actor || old.role === 'admin') err('Không cho phép thay đổi trạng thái quản trị viên.', 403);
    if (old.status === to) err('Tài khoản đã ở trạng thái này.', 409);
    const updated = await client.query(
      `UPDATE users SET status = $1::user_status WHERE id = $2 RETURNING id, full_name, role, status`,
      [to, id]
    );
    await audit(
      client,
      actor,
      null,
      'USER_STATUS_CHANGED',
      'users',
      id,
      old,
      updated.rows[0],
      pass(input.reason) || `Cập nhật trạng thái tài khoản ${old.full_name} sang ${to}`
    );
    return { ok: true, item: updated.rows[0] };
  });
}

module.exports = { users, user, userStatus };
