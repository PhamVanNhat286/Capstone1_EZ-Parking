'use strict';
const { pool, cfg } = require('../server/db.cjs');

(async () => {
  try {
    const client = await pool.connect();
    try {
      const p = await client.query(`SELECT current_database() name, current_setting('server_version') pg_version, NOW() time`);
      console.log('Database:', p.rows[0]);
      const tables = [
        'users',
        'vehicles',
        'parking_lots',
        'parking_lot_managers',
        'parking_lot_vehicle_types',
        'slots',
        'pricing_rules',
        'reservations',
        'payments',
        'qr_tickets',
        'parking_sessions',
        'audit_logs',
        'manager_history',
        'email_otps',
        'chat_messages'
      ];
      const t = await client.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1::text[])',
        [tables]
      );
      const found = new Set(t.rows.map(x => x.table_name));
      const missing = tables.filter(x => !found.has(x));
      if (missing.length) {
        console.error('Thiếu bảng trong schema:', missing.join(', '));
        process.exitCode = 1;
        return;
      }
      for (const tb of ['users', 'parking_lots', 'slots', 'reservations', 'payments', 'vehicles', 'chat_messages']) {
        const r = await client.query(`SELECT COUNT(*)::int count FROM ${tb}`);
        console.log(`${tb}:`, r.rows[0].count);
      }
      console.log('OK: Tất cả 15 bảng của schema.sql đều đầy đủ.');
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Lỗi kiểm tra database:', e.message);
    console.error('Host / DB / Port:', cfg.DB_HOST || '127.0.0.1', cfg.DB_NAME || 'ez_space', cfg.DB_PORT || '5432');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
