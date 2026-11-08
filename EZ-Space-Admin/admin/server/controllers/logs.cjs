'use strict';
const { q } = require('../db.cjs');

async function logs() {
  const items = await q(`
    SELECT a.*, u.full_name actor, u.email actor_email, u.role actor_role, l.name lot_name
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN parking_lots l ON l.id = a.parking_lot_id
    ORDER BY a.id DESC
    LIMIT 500
  `);

  const manager_history = await q(`
    SELECT h.*, u.full_name actor, u.email actor_email, l.name lot_name
    FROM manager_history h
    JOIN users u ON u.id = h.manager_id
    JOIN parking_lots l ON l.id = h.parking_lot_id
    ORDER BY h.id DESC
    LIMIT 300
  `);

  return { items, manager_history };
}

module.exports = { logs };
