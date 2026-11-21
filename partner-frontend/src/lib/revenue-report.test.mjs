import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRevenueReport, defaultRevenueFilter, revenueCalendar, revenueSummaryRows } from './revenue-report.ts';

const base = {
  id: '1', reservation_id: '2', provider: 'vnpay', transaction_ref: 'VNP-001',
  payment_type: 'deposit', amount: 20000, status: 'success',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  response_code: null, ipn_received_at: null, paid_at: '2026-11-15T17:00:00Z',
};
const defaults = defaultRevenueFilter('2026-11-16T03:00:00Z');
const report = (payments, filter = {}) => buildRevenueReport(payments, { ...defaults, ...filter });

test('daily reports include the full Vietnam calendar day and group into 24 hours', () => {
  const rows = [
    { ...base, id: '1', paid_at: '2026-11-15T16:59:59Z' },
    { ...base, id: '2', paid_at: '2026-11-15T17:00:00Z' },
    { ...base, id: '3', paid_at: '2026-11-16T16:59:59Z', amount: 30000 },
    { ...base, id: '4', paid_at: '2026-11-16T17:00:00Z' },
  ];
  const result = report(rows, { mode: 'day' });
  assert.deepEqual(result.payments.map(p => p.id), ['3', '2']);
  assert.equal(result.buckets.length, 24);
  assert.equal(result.buckets[0].receipts, 20000);
  assert.equal(result.buckets[23].receipts, 30000);
  assert.equal(result.totals.receipts, 50000);
  assert.equal(result.buckets[1].transactions, 0);
  assert.equal(revenueCalendar('2026-11-16T00:30:00+07:00').hour, '00');
});

test('monthly reports use paid_at instead of creation date, with leap-day and month boundaries', () => {
  const rows = [
    { ...base, id: '1', paid_at: '2024-01-31T17:00:00Z' },
    { ...base, id: '2', paid_at: '2024-02-29T16:59:59Z' },
    { ...base, id: '3', paid_at: '2024-02-29T17:00:00Z' },
  ];
  const result = report(rows, { mode: 'month', month: '2024-02' });
  assert.equal(result.buckets.length, 29);
  assert.equal(result.totals.transactions, 2);
  assert.equal(result.buckets.at(-1).key, '2024-02-29');
  assert.equal(result.buckets.at(-1).receipts, 20000);
  assert.equal(report([], { month: '2025-02' }).buckets.length, 28);
});

test('yearly reports group 12 months and keep January and December boundaries in Vietnam time', () => {
  const result = report([
    { ...base, id: '1', paid_at: '2025-12-31T17:00:00Z', amount: 10000 },
    { ...base, id: '2', paid_at: '2026-06-15T00:00:00Z', amount: 30000 },
    { ...base, id: '3', paid_at: '2026-12-31T16:59:59Z', amount: 50000 },
    { ...base, id: '4', paid_at: '2026-12-31T17:00:00Z', amount: 99999 },
  ], { mode: 'year', year: '2026' });
  assert.equal(result.buckets.length, 12);
  assert.equal(result.buckets[0].receipts, 10000);
  assert.equal(result.buckets[5].receipts, 30000);
  assert.equal(result.buckets[11].receipts, 50000);
  assert.deepEqual(result.totals, { receipts: 90000, refunds: 0, transactions: 3 });
  assert.equal(result.buckets.reduce((sum, row) => sum + row.receipts, 0), result.totals.receipts);
});

test('pending, failed and refunded statuses never inflate receipts; successful refunds are reported separately', () => {
  const rows = [
    { ...base, amount: 0.1 },
    { ...base, id: '2', amount: 0.2, payment_type: 'final' },
    { ...base, id: '3', amount: 10000, status: 'pending' },
    { ...base, id: '4', amount: 10000, status: 'failed' },
    { ...base, id: '5', amount: 10000, status: 'refunded' },
    { ...base, id: '6', amount: 5000, payment_type: 'refund' },
  ];
  const result = report(rows);
  assert.deepEqual(result.totals, { receipts: 0.3, refunds: 5000, transactions: 6 });
  assert.equal(result.buckets.find(b => b.key === '2026-11-16').refunds, 5000);
  const failed = report(rows, { status: 'failed' });
  assert.equal(failed.payments.length, 1);
  assert.equal(failed.totals.receipts, 0);
});

test('transactions without paid_at use creation date and are explicitly counted as fallback dates', () => {
  const result = report([
    { ...base, id: '1', paid_at: null, created_at: '2026-11-15T18:00:00Z', status: 'pending' },
    { ...base, id: '2', paid_at: null, created_at: '2026-11-14T18:00:00Z' },
  ], { mode: 'day' });
  assert.equal(result.fallbackDates, 1);
  assert.equal(result.payments[0].id, '1');
  assert.equal(result.totals.receipts, 0);
});

test('search and status filters affect totals, breakdown and transactions together without mutating input', () => {
  const rows = [base, { ...base, id: '2', provider: 'momo', transaction_ref: 'MOMO-002', amount: 30000 }];
  const copy = structuredClone(rows);
  const result = report(rows, { query: '  momo  ', status: 'success' });
  assert.equal(result.payments.length, 1);
  assert.equal(result.totals.receipts, 30000);
  assert.equal(result.buckets.reduce((sum, row) => sum + row.transactions, 0), 1);
  assert.deepEqual(rows, copy);
});

test('empty reports retain zero-valued periods without inventing transactions', () => {
  const result = report([], { mode: 'year' });
  assert.equal(result.error, '');
  assert.equal(result.buckets.length, 12);
  assert.ok(result.buckets.every(b => b.transactions === 0 && b.receipts === 0 && b.refunds === 0));
});

test('invalid or reversed periods return a visible error and no misleading totals', () => {
  for (const invalid of [
    { mode: 'day', day: '' }, { mode: 'day', day: '2026-02-30' },
    { mode: 'month', month: '2026-13' }, { mode: 'year', year: '' },
    { mode: 'year', year: '0000' }, { mode: 'year', year: '10000' },
    { mode: 'range', from: '2026-11-17', to: '2026-11-16' },
    { mode: 'range', from: '', to: '2026-11-16' },
  ]) {
    const result = report([base], invalid);
    assert.ok(result.error, JSON.stringify(invalid));
    assert.equal(result.payments.length, 0);
    assert.equal(result.totals.transactions, 0);
  }
});

test('custom ranges remain inclusive and large ranges use bounded month/year groupings', () => {
  const inclusive = report([base], { mode: 'range', from: '2026-11-16', to: '2026-11-16' });
  assert.equal(inclusive.totals.transactions, 1);
  assert.equal(inclusive.buckets.length, 1);
  const months = report([], { mode: 'range', from: '2025-01-01', to: '2026-12-31' });
  assert.equal(months.period.group, 'month'); assert.equal(months.buckets.length, 24);
  const years = report([], { mode: 'range', from: '2000-01-01', to: '2026-12-31' });
  assert.equal(years.period.group, 'year'); assert.equal(years.buckets.length, 27);
  const finalYear = report([], { mode: 'year', year: '9999' });
  assert.equal(finalYear.buckets.length, 12);
});

test('summary export contains the same period totals displayed by the report', () => {
  const result = report([base, { ...base, id: '2', payment_type: 'refund', amount: 5000 }], { mode: 'day' });
  const rows = revenueSummaryRows(result.buckets.filter(b => b.transactions));
  assert.deepEqual(rows[1], ['00:00 – 00:59', 20000, 5000, 2]);
  assert.equal(rows.length, 2);
});
