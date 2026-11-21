import test from 'node:test';
import assert from 'node:assert/strict';
import { getLotAvailability } from './lot-availability.ts';
import { createSqlPreview } from './database-seed.ts';

const slot = (id, extra = {}) => ({ id, parking_lot_id: '1', code: `A-${id}`, row_index: 0, col_index: Number(id), slot_type: 'standard', status: 'available', is_active: true, created_at: '', updated_at: '', ...extra });

test('available positions are scoped to the requested lot and exclude held, occupied and inactive slots', () => {
  const result = getLotAvailability([
    slot('1'), slot('2', { status: 'holding' }), slot('3', { status: 'occupied' }),
    slot('4', { status: 'unavailable' }), slot('5', { is_active: false }), slot('6', { parking_lot_id: '2' }),
  ], '1');
  assert.equal(result.registered, 5);
  assert.deepEqual(result.available.map(s => s.id), ['1']);
});

test('Sedan, SUV and EV follow the existing backend mapping; priority positions remain separate', () => {
  const result = getLotAvailability([slot('1'), slot('2', { slot_type: 'large' }), slot('3', { slot_type: 'ev_charging' }), slot('4', { slot_type: 'disabled' })], '1');
  assert.deepEqual(result.groups.map(g => [g.label, g.slots.map(s => s.id)]), [['Sedan', ['1']], ['SUV', ['2']], ['EV', ['3']], ['Ưu tiên', ['4']]]);
  assert.equal(result.groups.reduce((count, group) => count + group.slots.length, 0), result.available.length);
});

test('positions keep their exact codes and sort by physical row and column without mutating input', () => {
  const input = [slot('3', { code: 'B-01', row_index: 1, col_index: 0 }), slot('2', { code: 'A-02', col_index: 1 }), slot('1', { code: 'A-01', col_index: 0 })];
  const before = structuredClone(input);
  assert.deepEqual(getLotAvailability(input, '1').available.map(s => s.code), ['A-01', 'A-02', 'B-01']);
  assert.deepEqual(input, before);
});

test('a full or unconfigured lot returns zero available positions in every category', () => {
  for (const slots of [[], [slot('1', { status: 'occupied' })]]) {
    const result = getLotAvailability(slots, '1');
    assert.equal(result.available.length, 0);
    assert.ok(result.groups.every(group => group.slots.length === 0));
  }
});

test('SQL seed availability counts actual positions instead of declared lot capacity', () => {
  const db = createSqlPreview('2026-11-21T00:00:00.000Z');
  const result = getLotAvailability(db.slots, '1');
  assert.equal(result.registered, 20);
  assert.equal(result.available.length, 14);
  assert.ok(result.available.every(s => s.parking_lot_id === '1' && s.is_active && s.status === 'available'));
  assert.equal(result.groups.reduce((count, group) => count + group.slots.length, 0), 14);
  assert.equal(getLotAvailability(db.slots, 'missing').available.length, 0);
});
