import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoLot, summarizeLot, transitionSession } from './overview-model.ts';
import { dashboardRevenue, dashboardVehicleCounts } from './dashboard-overview.ts';

test('dashboard range totals reconcile with completed sessions and hourly buckets', () => {
  const lot = createDemoLot();
  const today = dashboardRevenue(lot, 'today');
  const yesterday = dashboardRevenue(lot, 'yesterday');
  const all = dashboardRevenue(lot, 'all');
  assert.equal(today.total, 80000);
  assert.equal(yesterday.total, 140 * 60000);
  assert.equal(all.total, today.total + yesterday.total);
  for (const summary of [today, yesterday, all]) assert.equal(summary.hourly.reduce((sum, h) => sum + h.value, 0) + summary.unassigned, summary.total);
});
test('new checkout updates revenue without inventing an absolute hour', () => {
  const lot = createDemoLot();
  const updated = transitionSession(lot, 'EZ-8919', 'checkout');
  const revenue = dashboardRevenue(updated, 'today');
  assert.equal(revenue.total, 160000);
  assert.equal(revenue.unassigned, 80000);
  assert.equal(revenue.completed.length, 2);
});
test('vehicle counters include every active holding and occupied session exactly once', () => {
  const lot = createDemoLot();
  const counts = dashboardVehicleCounts(lot);
  const summary = summarizeLot(lot);
  assert.equal(counts.small + counts.large, summary.holding + summary.occupied);
  const empty = { ...lot, sessions: [], slots: [] };
  assert.deepEqual(dashboardVehicleCounts(empty), { small: 0, large: 0 });
  assert.equal(dashboardRevenue(empty, 'today').total, 0);
});
