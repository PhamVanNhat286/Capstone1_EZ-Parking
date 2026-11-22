import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COMMISSION_RATE,
  withPaymentRevenue,
  withReportRevenue,
  withRevenue
} from '../src/shared/revenue-math';

test('5% of deposit plus final payment gives exact admin and owner split', () => {
  const row = withRevenue({ deposits: 20000, finals: 20000, refunds: 0 });
  assert.equal(COMMISSION_RATE, 0.05);
  assert.equal(row.received, 40000);
  assert.equal(row.net_received, 40000);
  assert.equal(row.admin_revenue, 2000);
  assert.equal(row.owner_revenue, 38000);
});

test('refunds reduce admin revenue; failed and pending payments do not count', () => {
  const payments = [
    withPaymentRevenue({ id: 1, payment_type: 'deposit', amount: '20000', status: 'success' }),
    withPaymentRevenue({ id: 2, payment_type: 'final', amount: '20000', status: 'success' }),
    withPaymentRevenue({ id: 3, payment_type: 'refund', amount: '10000', status: 'success' }),
    withPaymentRevenue({ id: 4, payment_type: 'refund', amount: '5000', status: 'refunded' }),
    withPaymentRevenue({ id: 5, payment_type: 'final', amount: 900000, status: 'failed' }),
    withPaymentRevenue({ id: 6, payment_type: 'deposit', amount: 900000, status: 'pending' }),
    withPaymentRevenue({ id: 7, payment_type: 'refund', amount: 900000, status: 'failed' }),
    withPaymentRevenue({ id: 8, payment_type: 'refund', amount: 900000, status: 'pending' })
  ];

  const totalAdmin = payments.reduce((sum, p) => sum + p.admin_revenue, 0);
  const totalNet = payments.reduce((sum, p) => sum + p.net_received, 0);
  assert.equal(totalNet, 25000);
  assert.equal(totalAdmin, 1250);
  assert.equal(payments.find(p => p.id === 3)?.admin_revenue, -500);
  assert.equal(payments.find(p => p.id === 4)?.admin_revenue, -250);
  assert.ok(payments.filter(p => p.id >= 5).every(p => p.admin_revenue === 0));
});

test('full refunds and empty periods produce zero admin revenue', () => {
  assert.equal(withRevenue({ received: 20000, refunds: 20000 }).admin_revenue, 0);
  assert.equal(withRevenue({ received: 0, refunds: 0 }).owner_revenue, 0);
});

test('refund in a later reporting period remains a negative revenue adjustment', () => {
  const row = withRevenue({ received: 0, refunds: 20000 });
  assert.equal(row.admin_revenue, -1000);
  assert.equal(row.owner_revenue, -19000);
});

test('withReportRevenue enriches every breakdown consistently', () => {
  const report = withReportRevenue({
    range: { from: '2026-11-01 00:00:00', to: '2026-11-30 23:59:59' },
    totals: { received: 60000, refunds: 0 },
    byLot: [{ id: 1, received: 60000, refunds: 0 }],
    byProvider: [{ provider: 'vnpay', received: 40000, refunds: 0 }, { provider: 'momo', received: 20000, refunds: 0 }],
    byVehicle: [{ vehicle_type: 'SUV', received: 60000, refunds: 0 }],
    byDay: [{ day: '2026-11-07', deposits: 40000, finals: 20000, refunds: 0 }],
    recent: [
      { id: 1, payment_type: 'deposit', amount: 20000, status: 'success' },
      { id: 2, payment_type: 'deposit', amount: 20000, status: 'success' },
      { id: 3, payment_type: 'final', amount: 20000, status: 'success' }
    ]
  });

  assert.equal(report.totals.admin_revenue, 3000);
  assert.equal(report.totals.owner_revenue, 57000);
  assert.equal(report.commission.rate, 0.05);
  assert.equal(report.byProvider.reduce((s, r) => s + r.admin_revenue, 0), 3000);
  assert.equal(report.recent.reduce((s, r) => s + r.admin_revenue, 0), 3000);
});

test('currency rounding is symmetric for a payment and its refund', () => {
  assert.equal(withRevenue({ received: '123.45', refunds: 0 }).admin_revenue, 6.17);
  assert.equal(withPaymentRevenue({ payment_type: 'deposit', amount: 0.1, status: 'success' }).admin_revenue, 0.01);
  assert.equal(withPaymentRevenue({ payment_type: 'refund', amount: 0.1, status: 'refunded' }).admin_revenue, -0.01);
});
