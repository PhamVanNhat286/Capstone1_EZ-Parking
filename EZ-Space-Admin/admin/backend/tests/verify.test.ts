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

test('schema.sql, seed.sql and core database tables are covered in Express controllers', () => {
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
    'chat_messages'
  ];

  for (const table of schemaTables) {
    assert.match(controllersSource, new RegExp(table), 'Thiếu truy vấn bảng ' + table);
  }
});

test('Express server enforces localhost binding, strict CSRF protection and RESTful /api/admin routes', () => {
  const serverSource = fs.readFileSync(path.join(backendRoot, 'src/server.ts'), 'utf8');
  const routesSource = fs.readFileSync(path.join(backendRoot, 'src/routes/admin.routes.ts'), 'utf8');
  const frontendApiSource = fs.readFileSync(path.join(adminRoot, 'frontend/src/lib/api.ts'), 'utf8');
  assert.match(serverSource, /app\.listen\(port,\s*'127\.0\.0\.1'/);
  assert.match(routesSource, /x-csrf-token/);
  assert.doesNotMatch(routesSource, /ez-seed-csrf/);
  assert.match(routesSource, /'\/platform-config'/);
  assert.match(routesSource, /'\/admin\/auth'/);
  assert.match(routesSource, /pruneExpiredSessions/);
  assert.match(routesSource, /'\/admin\/lots\/:id\/status'/);
  assert.match(routesSource, /'\/admin\/users\/:id\/status'/);
  assert.match(routesSource, /'\/admin\/settings'/);
  assert.match(routesSource, /'\/admin\/settings\/cache-flush'/);
  assert.match(routesSource, /\.patch\(/);
  assert.match(routesSource, /\.post\(/);
  assert.doesNotMatch(frontendApiSource, /searchParams\.set\('action'/);
});

test('Admin uses sql/schema.sql and sql/seed.sql and runs strictly from PostgreSQL without hardcoded mock secrets/profiles', () => {
  const poolSource = fs.readFileSync(path.join(backendRoot, 'src/db/pool.ts'), 'utf8');
  const lotsSource = fs.readFileSync(path.join(backendRoot, 'src/controllers/lots.ts'), 'utf8');
  const seedSource = fs.readFileSync(path.join(adminRoot, 'sql/seed.sql'), 'utf8');
  const settingsSource = fs.readFileSync(path.join(backendRoot, 'src/controllers/settings.ts'), 'utf8');
  const utilsSource = fs.readFileSync(path.join(backendRoot, 'src/controllers/utils.ts'), 'utf8');
  const dashboardSource = fs.readFileSync(path.join(backendRoot, 'src/controllers/dashboard.ts'), 'utf8');
  const revenueSource = fs.readFileSync(path.join(backendRoot, 'src/controllers/revenue.ts'), 'utf8');

  assert.match(poolSource, /sql\/schema\.sql/);
  assert.match(poolSource, /sql\/seed\.sql/);
  assert.match(poolSource, /dbSeedPromise\s*=\s*null/);
  assert.match(lotsSource, /'REJECT_LOT'/);
  assert.match(seedSource, /50000\.00/);
  assert.doesNotMatch(seedSource, /\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy/);
  assert.match(settingsSource, /DEPOSIT_AMOUNT/);
  assert.match(settingsSource, /deposit_amount:\s*50000/);
  assert.match(settingsSource, /PAYMENT_PROVIDERS/);
  assert.match(settingsSource, /VNPay Sandbox/);
  assert.match(settingsSource, /API_ARCHITECTURE/);
  assert.match(settingsSource, /RESTful JSON API/);
  assert.match(settingsSource, /enum_range/);
  assert.match(settingsSource, /raw_ipn_payload/);
  assert.doesNotMatch(settingsSource, /EZSPACE_SANDBOX_DEMO_HMAC_KEY/);
  assert.doesNotMatch(utilsSource, /0905000111/);
  assert.doesNotMatch(utilsSource, /admin@ezspace\.vn/);
  assert.match(dashboardSource, /loadCurrentConfig/);
  assert.match(revenueSource, /loadCurrentConfig/);
});

test('Next.js frontend has all 6 App Router pages and does not show DB connection pills or login.html', () => {
  const frontendAppDir = path.join(adminRoot, 'frontend/src/app');
  const pages = [
    'page.tsx',
    'lots/page.tsx',
    'users/page.tsx',
    'revenue/page.tsx',
    'logs/page.tsx',
    'settings/page.tsx'
  ];

  for (const page of pages) {
    assert.ok(fs.existsSync(path.join(frontendAppDir, page)), `Thiếu trang Next.js: ${page}`);
  }
  assert.ok(!fs.existsSync(path.join(frontendAppDir, 'data/page.tsx')), 'Trang /data phải được gỡ bỏ');

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
