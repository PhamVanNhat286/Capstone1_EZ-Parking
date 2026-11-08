'use strict';
const { Pool, types } = require('pg');
const { cfg } = require('./config/env.cjs');

// Giữ ngày/giờ PostgreSQL ở timezone do server trả về, thay vì đổi về UTC khi JSON hóa.
for (const oid of [1082, 1083, 1114, 1184]) {
  types.setTypeParser(oid, value => value);
}

const pool = new Pool({
  host: cfg.DB_HOST || '127.0.0.1',
  port: Number(cfg.DB_PORT || 5432),
  database: cfg.DB_NAME || 'ez_space',
  user: cfg.DB_USER || 'postgres',
  password: cfg.DB_PASSWORD || '',
  connectionTimeoutMillis: 3500,
  max: 7,
  idleTimeoutMillis: 20000,
  options: '-c timezone=Asia/Ho_Chi_Minh'
});

const q = async (sql, params = []) => {
  try {
    return (await pool.query(sql, params)).rows;
  } catch (error) {
    const statement = String(sql).replace(/\s+/g, ' ').trim();
    console.error('[EZ-Space PostgreSQL QUERY FAILED]', {
      code: error.code || 'UNKNOWN',
      message: error.message,
      detail: error.detail || undefined,
      hint: error.hint || undefined,
      position: error.position || undefined,
      statement: statement.slice(0, 1600),
      parameter_count: params.length
    });
    throw error;
  }
};

const first = async (sql, params = []) => (await q(sql, params))[0] || {};

async function safeQuery(sql, params = [], fallback = []) {
  try {
    return (await pool.query(sql, params)).rows;
  } catch (error) {
    if (error && error.code === '42P01') return fallback;
    throw error;
  }
}

async function safeFirst(sql, params = [], fallback = {}) {
  const rows = await safeQuery(sql, params, []);
  return rows[0] || fallback;
}

function rangeDates(kind) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).filter(x => x.type !== 'literal').map(x => [x.type, x.value])
  );
  const yr = Number(parts.year);
  const mo = Number(parts.month);
  const day = Number(parts.day);
  const atVn = (y, m, d) => new Date(Date.UTC(y, m - 1, d, -7, 0, 0));
  let from;
  if (kind === 'today') from = atVn(yr, mo, day);
  else if (kind === 'week') from = atVn(yr, mo, day - 6);
  else if (kind === 'month') from = atVn(yr, mo, 1);
  else if (kind === 'all') from = atVn(2000, 1, 1);
  else {
    const e = new Error('Khoảng thời gian không hợp lệ.');
    e.status = 400;
    throw e;
  }
  return { from: from.toISOString(), to: new Date(Date.now() + 1000).toISOString() };
}

async function audit(client, actor, lot, action, entity, id, before, after, note) {
  await client.query(
    `INSERT INTO audit_logs (user_id, parking_lot_id, action, entity_type, entity_id, old_value, new_value, note)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
    [actor, lot, action, entity, id, JSON.stringify(before), JSON.stringify(after), String(note || '').slice(0, 250)]
  );
}

async function withTx(task) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await task(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function err(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  throw e;
}

module.exports = { pool, q, first, safeQuery, safeFirst, rangeDates, audit, withTx, err, cfg };
