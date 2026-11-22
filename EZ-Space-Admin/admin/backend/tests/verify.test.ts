import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { adminRoot, backendRoot } from '../src/config/env';

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
  );
}

test('schema.sql, seed.sql and all 15 database tables are covered in Express controllers', () => {
  assert.ok(fs.existsSync(path.join(adminRoot, 'sql/schema.sql')), 'Thiếu sql/schema.sql');
  assert.ok(fs.existsSync(path.join(adminRoot, 'sql/seed.sql')), 'Thiếu sql/seed.sql');

  const controllersSource = walk(path.join(backendRoot, 'src/controllers'))
    .filter(f => f.endsWith('.ts'))
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
    assert.match(controllersSource, new RegExp(table), 'Thiếu truy vấn bảng ' + table);
  }
});

test('Express server enforces localhost binding, strict CSRF protection and /api/admin route', () => {
  const serverSource = fs.readFileSync(path.join(backendRoot, 'src/server.ts'), 'utf8');
  const routesSource = fs.readFileSync(path.join(backendRoot, 'src/routes/admin.routes.ts'), 'utf8');
  assert.match(serverSource, /app\.listen\(port,\s*'127\.0\.0\.1'/);
  assert.match(routesSource, /x-csrf-token/);
  assert.doesNotMatch(routesSource, /ez-seed-csrf/);
  assert.match(routesSource, /'\/admin'/);
});

test('Next.js frontend has all 7 App Router pages and does not show DB connection pills or login.html', () => {
  const frontendAppDir = path.join(adminRoot, 'frontend/src/app');
  const pages = [
    'page.tsx',
    'lots/page.tsx',
    'users/page.tsx',
    'revenue/page.tsx',
    'logs/page.tsx',
    'data/page.tsx',
    'settings/page.tsx'
  ];

  for (const page of pages) {
    assert.ok(fs.existsSync(path.join(frontendAppDir, page)), `Thiếu trang Next.js: ${page}`);
  }

  const allFrontendSrc = walk(path.join(adminRoot, 'frontend/src'))
    .filter(f => /\.(ts|tsx)$/.test(f))
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n');

  assert.doesNotMatch(allFrontendSrc, /href="login\.html"/i);
  assert.doesNotMatch(
    allFrontendSrc,
    /Đang kiểm tra PostgreSQL|PostgreSQL · app thật|id="sync-pill"|id="topbar-status"/i
  );
});
