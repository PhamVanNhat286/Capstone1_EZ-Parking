'use strict';
const { err, safeFirst } = require('../db.cjs');

const pass = v => (typeof v === 'string' ? v.trim() : '');

const validId = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) err('ID không hợp lệ');
  return n;
};

const viewRange = range => {
  const f = x => new Date(x).toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
  return { from: f(range.from), to: f(range.to) };
};

async function getActor(client) {
  const r = await client.query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1`);
  if (!r.rows[0]) err('Hệ thống chưa có tài khoản quản trị viên đang hoạt động.', 503);
  return Number(r.rows[0].id);
}

async function getAdminProfile() {
  try {
    const row = await safeFirst(
      `SELECT id, full_name, email, phone, role FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1`,
      [],
      {}
    );
    return {
      id: row.id || 1,
      full_name: row.full_name || 'Admin Hệ Thống',
      email: row.email || 'admin@ezspace.vn',
      phone: row.phone || '0905000111'
    };
  } catch (_) {
    return { id: 1, full_name: 'Admin Hệ Thống', email: 'admin@ezspace.vn', phone: '0905000111' };
  }
}

module.exports = { pass, validId, viewRange, getActor, getAdminProfile };
