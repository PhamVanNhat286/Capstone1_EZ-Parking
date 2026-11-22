'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { rangeDates, viewRange, calendarRange } = require('../js/core/date-range.js');
const store = require('../server/data/seed-store.cjs');

test('a selected day includes all 24 hours in Vietnam time', () => {
  const range = rangeDates('custom', { from: '2026-11-07', to: '2026-11-07' });
  assert.deepEqual(range, { from: '2026-11-06T17:00:00.000Z', to: '2026-11-07T17:00:00.000Z' });
  assert.deepEqual(viewRange(range), { from: '2026-11-07 00:00:00', to: '2026-11-07 23:59:59' });
});

test('date ranges cross month, year and leap-day boundaries correctly', () => {
  assert.equal(rangeDates('custom', { from: '2026-12-31', to: '2027-01-01' }).to, '2027-01-01T17:00:00.000Z');
  const leap = rangeDates('custom', { from: '2028-02-28', to: '2028-02-29' });
  assert.equal(new Date(leap.to) - new Date(leap.from), 2 * 86400000);
});

test('missing, impossible and reversed dates are rejected with HTTP 400', () => {
  for (const params of [
    {}, { from: '2026-11-07' }, { from: '07/11/2026', to: '2026-11-07' },
    { from: '2026-02-29', to: '2026-03-01' },
    { from: '2026-11-08', to: '2026-11-07' },
    { from: '2026-13-01', to: '2026-13-01' }
  ]) {
    assert.throws(() => rangeDates('custom', params), error => error.status === 400);
  }
});

test('existing presets keep Vietnam day boundaries even when UTC is on the previous date', () => {
  const now = new Date('2026-10-31T18:00:00Z');
  assert.equal(rangeDates('today', {}, now).from, '2026-10-31T17:00:00.000Z');
  assert.equal(rangeDates('week', {}, now).from, '2026-10-25T17:00:00.000Z');
  assert.equal(rangeDates('month', {}, now).from, '2026-10-31T17:00:00.000Z');
  assert.equal(rangeDates('all', {}, now).from, '1999-12-31T17:00:00.000Z');
});

test('revenue and dashboard include both end-of-day transactions and exclude the next day', () => {
  const original = store.db.payments;
  const times = ['2026-11-06 23:59:59', '2026-11-07 00:00:00', '2026-11-07 23:59:59', '2026-11-08 00:00:00'];
  store.db.payments = times.map((paid_at, i) => ({ ...original[0], id: i + 10, paid_at, amount: 20000 }));
  try {
    const params = { range: 'custom', from: '2026-11-07', to: '2026-11-07' };
    const report = store.revenue(params);
    assert.equal(report.totals.received, 40000);
    assert.equal(report.totals.admin_revenue, 2000);
    assert.deepEqual(report.recent.map(row => row.id), [12, 11]);
    assert.equal(report.byDay.length, 1);
    assert.equal(report.range.to, '2026-11-07 23:59:59');
    assert.equal(store.dashboard(params).payments.admin_revenue, 2000);
    assert.equal(store.revenue({ range: 'custom', from: '2026-11-09', to: '2026-11-09' }).totals.admin_revenue, 0);
    assert.equal(store.revenue({ range: 'all' }).totals.admin_revenue, 4000);
  } finally { store.db.payments = original; }
});

test('year and month selection include the complete calendar period, including leap days', () => {
  assert.deepEqual(calendarRange('2026', 'all'), { from: '2026-01-01', to: '2026-12-31' });
  assert.deepEqual(calendarRange('2026', '11'), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(calendarRange('2026', '12'), { from: '2026-12-01', to: '2026-12-31' });
  assert.deepEqual(calendarRange('2027', '2'), { from: '2027-02-01', to: '2027-02-28' });
  assert.deepEqual(calendarRange('2028', '2'), { from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(viewRange(rangeDates('custom', calendarRange('2026', 'all'))), {
    from: '2026-01-01 00:00:00', to: '2026-12-31 23:59:59'
  });
});

test('invalid years and months cannot silently select a different period', () => {
  for (const year of ['', '26', '1999', '10000', '2026.5', 'abcd']) {
    assert.throws(() => calendarRange(year, 'all'), error => error.status === 400);
  }
  for (const month of ['', '0', '13', '1.5', 'abc']) {
    assert.throws(() => calendarRange('2026', month), error => error.status === 400);
  }
});

test('lot chart totals follow the selected year or month without including adjacent periods', () => {
  const original = store.db.payments;
  const times = [
    '2025-12-31 23:59:59', '2026-01-01 00:00:00',
    '2026-11-30 23:59:59', '2026-12-31 23:59:59', '2027-01-01 00:00:00'
  ];
  store.db.payments = times.map((paid_at, i) => ({ ...original[0], id: i + 20, paid_at, amount: 20000 }));
  try {
    const yearParams = { range: 'custom', ...calendarRange('2026', 'all') };
    const monthParams = { range: 'custom', ...calendarRange('2026', '11') };
    const yearReport = store.revenue(yearParams);
    const monthReport = store.revenue(monthParams);
    assert.equal(yearReport.totals.admin_revenue, 3000);
    assert.equal(yearReport.byLot.find(lot => lot.id === 1).admin_revenue, 3000);
    assert.equal(yearReport.recent.length, 3);
    assert.equal(monthReport.totals.admin_revenue, 1000);
    assert.equal(monthReport.byLot.find(lot => lot.id === 1).admin_revenue, 1000);
    assert.equal(monthReport.recent.length, 1);
    assert.equal(store.dashboard(yearParams).payments.admin_revenue, 3000);
    assert.equal(store.dashboard(monthParams).payments.admin_revenue, 1000);
  } finally { store.db.payments = original; }
});
