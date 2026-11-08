'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'lots.html', 'users.html', 'revenue.html', 'logs.html', 'data.html', 'settings.html'];

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.match(html, /id="live-root"/, page + ' thiếu vùng hiển thị');
  assert.match(html, /js\/app\.js/, page + ' thiếu script điều phối');
  const refs = [...html.matchAll(/(?:src|href)="((?:css|js)\/[^"?]+)"/g)].map(x => x[1]);
  for (const file of refs) {
    assert.ok(fs.existsSync(path.join(root, file)), page + ' thiếu ' + file);
  }
  assert.doesNotMatch(html, /href="login\.html"/i);
  assert.doesNotMatch(html, /Đang kiểm tra PostgreSQL|PostgreSQL · app thật|id="sync-pill"|id="topbar-status"/i, page + ' vẫn còn nhãn trạng thái kết nối DB');
}

const walk = dir =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(x =>
        x.isDirectory() ? walk(path.join(dir, x.name)) : [path.join(dir, x.name)]
      )
    : [];

for (const file of [...walk(path.join(root, 'js')), ...walk(path.join(root, 'server')), ...walk(path.join(root, 'scripts'))].filter(x => /\.(?:js|cjs)$/.test(x))) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

const index = fs.readFileSync(path.join(root, 'server/index.cjs'), 'utf8');
assert.match(index, /server\.listen\(port,'127\.0\.0\.1'/);
assert.match(index, /x-csrf-token/);
assert.match(index, /\/api\/admin/);

const allControllers = walk(path.join(root, 'server/controllers'))
  .filter(x => x.endsWith('.cjs'))
  .map(f => fs.readFileSync(f, 'utf8'))
  .join('\n');

const schemaTables = [
  'users',
  'vehicles',
  'parking_lots',
  'parking_lot_vehicle_types',
  'parking_lot_managers',
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

for (const table of schemaTables) {
  assert.match(allControllers, new RegExp(table), 'Thiếu truy vấn bảng ' + table);
}

const core = fs.readFileSync(path.join(root, 'js/core.js'), 'utf8');
assert.match(core, /paid:'Đã cọc'/);
assert.match(core, /viewRange='all'/);

assert.ok(fs.existsSync(path.join(root, 'sql/schema.sql')), 'Thiếu sql/schema.sql');
assert.ok(fs.existsSync(path.join(root, 'sql/seed.sql')), 'Thiếu sql/seed.sql');

const seedStore = require('../server/data/seed-store.cjs');
const sum = seedStore.summary();
assert.equal(sum.users.total, 4, 'Số lượng users từ seed.sql phải là 4');
assert.equal(sum.vehicles.total, 4, 'Số lượng vehicles từ seed.sql phải là 4');
assert.equal(sum.lots.total, 3, 'Số lượng parking_lots từ seed.sql phải là 3');
assert.equal(sum.slots.total, 55, 'Số lượng slots từ seed.sql phải là 55');
assert.equal(sum.tickets.total, 1, 'Số lượng qr_tickets từ seed.sql phải là 1');
assert.equal(sum.sessions.total, 1, 'Số lượng parking_sessions từ seed.sql phải là 1');

const rec = seedStore.records();
assert.equal(rec.reservations.length, 3, 'Số lượng reservations từ seed.sql phải là 3');
assert.equal(rec.payments.length, 3, 'Số lượng payments từ seed.sql phải là 3');
assert.equal(rec.pricing.length, 5, 'Số lượng pricing_rules từ seed.sql phải là 5');

const rev = seedStore.revenue({ range: 'all' });
assert.equal(rev.totals.received, 60000, 'Tổng thu từ seed.sql phải là 60,000đ');

const lg = seedStore.logs();
assert.equal(lg.items.length, 2, 'Số lượng audit_logs từ seed.sql phải là 2');

console.log(`OK: ${pages.length} trang HTML, đầy đủ 15 bảng schema.sql & dữ liệu seed.sql, tách file theo từng mục, đã loại bỏ hiển thị trạng thái kết nối DB.`);
