import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendarRange, rangeDates, viewRange } from '../src/shared/date-range';

test('a selected day includes all 24 hours in Vietnam time', () => {
  const range = rangeDates('custom', { from: '2026-11-07', to: '2026-11-07' });
  assert.deepEqual(range, { from: '2026-11-06T17:00:00.000Z', to: '2026-11-07T17:00:00.000Z' });
  assert.deepEqual(viewRange(range), { from: '2026-11-07 00:00:00', to: '2026-11-07 23:59:59' });
});

test('date ranges cross month, year and leap-day boundaries correctly', () => {
  assert.equal(rangeDates('custom', { from: '2026-12-31', to: '2027-01-01' }).to, '2027-01-01T17:00:00.000Z');
  const leap = rangeDates('custom', { from: '2028-02-28', to: '2028-02-29' });
  assert.equal(new Date(leap.to).getTime() - new Date(leap.from).getTime(), 2 * 86400000);
});

test('missing, impossible and reversed dates are rejected with HTTP 400', () => {
  for (const params of [
    {},
    { from: '2026-11-07' },
    { from: '07/11/2026', to: '2026-11-07' },
    { from: '2026-02-29', to: '2026-03-01' },
    { from: '2026-11-08', to: '2026-11-07' },
    { from: '2026-13-01', to: '2026-13-01' }
  ]) {
    assert.throws(
      () => rangeDates('custom', params),
      (error: unknown) => (error as { status?: number }).status === 400
    );
  }
});

test('existing presets keep Vietnam day boundaries even when UTC is on the previous date', () => {
  const now = new Date('2026-10-31T18:00:00Z');
  assert.equal(rangeDates('today', {}, now).from, '2026-10-31T17:00:00.000Z');
  assert.equal(rangeDates('week', {}, now).from, '2026-10-25T17:00:00.000Z');
  assert.equal(rangeDates('month', {}, now).from, '2026-10-31T17:00:00.000Z');
  assert.equal(rangeDates('all', {}, now).from, '1999-12-31T17:00:00.000Z');
});

test('year and month selection include the complete calendar period, including leap days', () => {
  assert.deepEqual(calendarRange('2026', 'all'), { from: '2026-01-01', to: '2026-12-31' });
  assert.deepEqual(calendarRange('2026', '11'), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(calendarRange('2026', '12'), { from: '2026-12-01', to: '2026-12-31' });
  assert.deepEqual(calendarRange('2027', '2'), { from: '2027-02-01', to: '2027-02-28' });
  assert.deepEqual(calendarRange('2028', '2'), { from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(viewRange(rangeDates('custom', calendarRange('2026', 'all'))), {
    from: '2026-01-01 00:00:00',
    to: '2026-12-31 23:59:59'
  });
});

test('invalid years and months cannot silently select a different period', () => {
  for (const year of ['', '26', '1999', '10000', '2026.5', 'abcd']) {
    assert.throws(
      () => calendarRange(year, 'all'),
      (error: unknown) => (error as { status?: number }).status === 400
    );
  }
  for (const month of ['', '0', '13', '1.5', 'abc']) {
    assert.throws(
      () => calendarRange('2026', month),
      (error: unknown) => (error as { status?: number }).status === 400
    );
  }
});
