'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const store = require('../server/data/seed-store.cjs');
const { withPaymentRevenue, withRevenue } = require('../js/core/revenue-math.js');
const root = path.resolve(__dirname, '..');

function withPayments(payments, check) {
  const previous = store.db.payments;
  store.db.payments = payments;
  try { check(store.revenue({ range: 'all' })); }
  finally { store.db.payments = previous; }
}

const payment = (id, type, amount, status = 'success', reservation = 3) => ({
  ...store.db.payments[0], id, reservation_id: reservation,
  payment_type: type, amount, status
});

function assertBreakdowns(report, expected) {
  assert.equal(report.totals.admin_revenue, expected);
  assert.equal(store.dashboard({ range: 'all' }).payments.admin_revenue, expected);
  for (const key of ['byLot', 'byProvider', 'byVehicle', 'byDay', 'recent']) {
    assert.equal(report[key].reduce((sum, row) => sum + row.admin_revenue, 0), expected, key);
  }
}

test('5% of deposit plus final payment for one slot, without counting the booking total twice', () => {
  withPayments([payment(1, 'deposit', 20000), payment(2, 'final', 20000)], report => {
    assertBreakdowns(report, 2000);
    assert.equal(report.totals.received, 40000);
    assert.equal(report.totals.owner_revenue, 38000);
    assert.equal(report.commission.rate, 0.05);
    assert.ok(report.recent.every(row => row.slot_code === 'A-01'));
  });
});

test('refunds reduce admin revenue in every breakdown; failed and pending payments do not count', () => {
  withPayments([
    payment(1, 'deposit', '20000'), payment(2, 'final', '20000'),
    payment(3, 'refund', '10000'), payment(4, 'refund', '5000', 'refunded'),
    payment(5, 'final', 900000, 'failed'), payment(6, 'deposit', 900000, 'pending'),
    payment(7, 'refund', 900000, 'failed'), payment(8, 'refund', 900000, 'pending')
  ], report => {
    assertBreakdowns(report, 1250);
    assert.equal(report.totals.net_received, 25000);
    assert.equal(report.totals.owner_revenue, 23750);
    assert.equal(report.recent.find(row => row.id === 3).admin_revenue, -500);
    assert.equal(report.recent.find(row => row.id === 4).admin_revenue, -250);
    assert.ok(report.recent.filter(row => row.id >= 5).every(row => row.admin_revenue === 0));
  });
});

test('full refunds and an empty period produce no admin revenue', () => {
  withPayments([payment(1, 'deposit', 20000), payment(2, 'refund', 20000)], report => assertBreakdowns(report, 0));
  withPayments([], report => {
    assertBreakdowns(report, 0);
    assert.equal(report.totals.owner_revenue, 0);
  });
});

test('a refund in a later reporting period remains a negative revenue adjustment', () => {
  withPayments([
    { ...payment(1, 'deposit', 20000), paid_at: '1999-01-01 10:00:00' },
    payment(2, 'refund', 20000, 'refunded')
  ], report => {
    assertBreakdowns(report, -1000);
    assert.equal(report.totals.owner_revenue, -19000);
    assert.equal(report.recent.length, 1);
  });
});

test('unpaid held slots create no commission; paid no-show deposits remain collected money', () => {
  const reservation = store.db.reservations.find(row => row.id === 3);
  const previousStatus = reservation.status;
  reservation.status = 'forfeited';
  try {
    withPayments([payment(1, 'deposit', 20000)], report => {
      assertBreakdowns(report, 1000);
      assert.equal(report.byLot.find(row => row.id === 1).forfeited_deposits, 20000);
    });
  } finally { reservation.status = previousStatus; }
});

test('currency rounding is symmetric for a payment and its refund', () => {
  assert.equal(withRevenue({ received: '123.45', refunds: 0 }).admin_revenue, 6.17);
  assert.equal(withPaymentRevenue(payment(1, 'deposit', 0.1)).admin_revenue, 0.01);
  assert.equal(withPaymentRevenue(payment(2, 'refund', 0.1)).admin_revenue, -0.01);
});

function browser(page) {
  const context = vm.createContext({ document: { body: { dataset: { page } } } });
  vm.runInContext('window = globalThis;', context);
  const html = fs.readFileSync(path.join(root, 'pages', page === 'dashboard' ? 'index.html' : 'revenue.html'), 'utf8');
  const sources = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match => match[1].replace(/^\.\.\//, ''));
  for (const src of sources) {
    if (src === 'js/core/icons.js' || src === 'js/core/app.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, src), 'utf8'), context, { filename: src });
  }
  vm.runInContext("summary = EZ_SEED_STORE.summary(); lastData = EZ_SEED_STORE[PAGE]({ range: 'all' });", context);
  return context;
}

test('browser sample store, dashboard and revenue page show the same 5% figures', () => {
  for (const page of ['dashboard', 'revenue']) {
    const context = browser(page);
    const html = vm.runInContext('EZ_RENDER(lastData)', context);
    assert.match(html, /Doanh thu Admin \(5%\)/);
    assert.match(html, /class="kpi-value">3\.000 ₫/);
    assert.doesNotMatch(html, /NaN|undefined/);
    if (page === 'revenue') {
      assert.match(html, /class="kpi-value">57\.000 ₫/);
      assert.match(html, /Ô A-01/);
      vm.runInContext("EZ_SEED_STORE.db.payments = [{ ...EZ_SEED_STORE.db.payments[0], payment_type: 'refund', amount: 20000, status: 'refunded' }]; lastData = EZ_SEED_STORE.revenue({ range: 'all' });", context);
      const refundHtml = vm.runInContext('EZ_RENDER(lastData)', context);
      assert.match(refundHtml, /graph-bar is-negative/);
      assert.match(refundHtml, /class="kpi-value">-1\.000 ₫/);
    }
  }
});

test('CSV identifies the slot and keeps customer payments separate from the 5% admin share', () => {
  const context = browser('revenue');
  vm.runInContext('csv = rows => { exportedRows = rows; }; notice = () => {}; exportNow();', context);
  const rows = JSON.parse(vm.runInContext('JSON.stringify(exportedRows)', context));
  const adminColumn = rows[0].indexOf('Admin (5%)');
  const amountColumn = rows[0].indexOf('Số tiền');
  const slotColumn = rows[0].indexOf('Ô đỗ');
  assert.ok(adminColumn >= 0 && slotColumn >= 0);
  assert.equal(rows.slice(1).reduce((sum, row) => sum + row[adminColumn], 0), 3000);
  assert.equal(rows.slice(1).reduce((sum, row) => sum + row[amountColumn], 0), 60000);
  assert.ok(rows.slice(1).every(row => row[slotColumn]));
});

test('editing a filter keeps the displayed period until a successful load; failed loads preserve it', async () => {
  const context = browser('revenue');
  vm.runInContext(`
    document.querySelector = () => null;
    document.querySelectorAll = () => [];
    document.addEventListener = () => {};
    setInterval = () => {};
    api = action => {
      if (action === 'summary') return Promise.resolve({});
      if (action === 'auth') return new Promise(() => {});
      return new Promise(resolve => { resolveReport = resolve; });
    };
  `, context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/core/app.js'), 'utf8'), context);
  vm.runInContext(`
    rangeDraft = { mode: 'calendar-month', year: '2026', month: '6', from: '', to: '' };
    request = { mode: rangeDraft.mode, params: draftRangeParams(), draftSnapshot: JSON.stringify(rangeDraft) };
  `, context);
  const pending = vm.runInContext('load(true, request)', context);
  assert.equal(vm.runInContext('rangeParams().range', context), 'all', 'Do not change the applied filter before data arrives');
  vm.runInContext('resolveReport(EZ_SEED_STORE.revenue(request.params));', context);
  await pending;
  assert.equal(vm.runInContext('rangeParams().from', context), '2026-06-01');
  assert.equal(vm.runInContext('rangeIsDirty()', context), false);
  assert.equal(vm.runInContext('rangeDraft.from', context), '2026-06-01');
  assert.equal(vm.runInContext('rangeDraft.to', context), '2026-06-30');

  vm.runInContext("rangeDraft.month = '3';", context);
  const html = vm.runInContext('ranges()', context);
  assert.match(html, /Đang xem: 01\/06\/2026 – 30\/06\/2026/);
  assert.match(html, /class="range-pending" >Thay đổi chưa áp dụng/);
  assert.equal(vm.runInContext('rangeParams().from', context), '2026-06-01');
  vm.runInContext("api = async () => { throw new Error('Test connection error'); };", context);
  await vm.runInContext('load(true, { mode: rangeDraft.mode, params: draftRangeParams() })', context);
  assert.equal(vm.runInContext('rangeParams().from', context), '2026-06-01');
  assert.equal(vm.runInContext('lastData.range.from', context), '2026-06-01 00:00:00');
  assert.equal(vm.runInContext('rangeLoading', context), false);
});
