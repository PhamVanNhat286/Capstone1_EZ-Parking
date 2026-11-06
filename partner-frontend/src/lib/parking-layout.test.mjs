import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoLot, summarizeLot } from './overview-model.ts';
import { createParkingLayout, validateParkingLayout, placeLayoutCell, moveLayoutCells, removeLayoutCells, publishParkingLayout, trimLayoutToInventory } from './parking-layout.ts';
import { initialManagedLots, syncOverviewProfile } from './managed-lots.ts';
const allowed = ['sedan', 'suv', 'ev'];
const setup = () => { const lot = createDemoLot(); return { lot, layout: createParkingLayout(lot) }; };
test('initial 96-cell plan preserves all 78 active sessions and uses unique positions', () => {
  const { lot, layout } = setup();
  assert.equal(layout.cells.length, 96);
  assert.doesNotThrow(() => validateParkingLayout(layout, lot, 120, allowed));
  for (const s of lot.sessions.filter(s => ['holding', 'confirmed', 'parked'].includes(s.status))) assert.ok(layout.cells.some(c => c.slotId === s.slotId));
});
test('busy cells cannot be removed, renamed or locked', () => {
  const { lot, layout } = setup();
  assert.throws(() => removeLayoutCells(layout, ['A-07'], lot));
  for (const patch of [{ code: 'X-07' }, { locked: true }]) assert.throws(() => validateParkingLayout({ ...layout, cells: layout.cells.map(c => c.slotId === 'A-07' ? { ...c, ...patch } : c) }, lot, 120, allowed));
});
test('placement takes an actual unplaced space; capacity and collisions are enforced', () => {
  const { lot, layout } = setup();
  const next = placeLayoutCell(layout, lot, 120, 'ground', 0, 0);
  assert.equal(next.cells.length, 97);
  assert.doesNotThrow(() => validateParkingLayout(next, lot, 120, allowed));
  assert.throws(() => placeLayoutCell(next, lot, 120, 'ground', 0, 0));
  assert.throws(() => placeLayoutCell(layout, lot, 96, 'ground', 0, 0));
});
test('moving a selection is atomic and rejects overlap or out-of-bounds', () => {
  const { layout } = setup();
  const moved = moveLayoutCells(layout, ['A-01', 'A-02'], 'ground', 0, 0);
  assert.equal(moved.cells.filter(c => c.floor === 'ground').length, 2);
  assert.throws(() => moveLayoutCells(layout, ['A-01'], 'b1', 0, 1));
  assert.throws(() => moveLayoutCells(layout, ['A-01'], 'b1', -1, 0));
  assert.equal(layout.cells.find(c => c.slotId === 'A-01').col, 0);
});
test('invalid codes, duplicate identities and unsupported vehicles cannot be published', () => {
  const { lot, layout } = setup();
  for (const patch of [{ code: 'bad' }, { code: 'A-02' }, { vehicle: 'truck' }]) assert.throws(() => publishParkingLayout({ ...layout, cells: layout.cells.map((c, i) => i === 0 ? { ...c, ...patch } : c) }, lot, 120, allowed));
});
test('publishing a maintenance edit preserves active sessions and updates operational totals', () => {
  const { lot, layout } = setup();
  const draft = { ...layout, cells: layout.cells.map(c => c.slotId === 'A-01' ? { ...c, locked: true, code: 'Z-01' } : c) };
  const result = publishParkingLayout(draft, lot, 120, allowed);
  assert.equal(summarizeLot(result.lot).available, 41);
  assert.equal(summarizeLot(result.lot).locked, 2);
  assert.deepEqual(result.lot.sessions, lot.sessions);
  assert.ok(result.layout.cells.some(c => c.slotId === 'Z-01'));
  assert.ok(result.layout.savedAt);
  assert.equal(summarizeLot(lot).available, 42);
});
test('a reservation created outside the canvas prevents dropping it at publish time', () => {
  const { lot, layout } = setup();
  const unplaced = lot.slots.find(s => !layout.cells.some(c => c.slotId === s.id));
  const changed = { ...lot, slots: lot.slots.map(s => s.id === unplaced.id ? { ...s, state: 'holding' } : s) };
  assert.throws(() => publishParkingLayout(layout, changed, 120, allowed));
});
test('reducing the registered capacity reconciles layout references without losing busy slots', () => {
  const { lot, layout } = setup();
  const resized = syncOverviewProfile(lot, { ...initialManagedLots()[0], capacity: 78 });
  const trimmed = trimLayoutToInventory(layout, resized, 78);
  assert.equal(trimmed.cells.length, 78);
  assert.ok(trimmed.cells.every(c => resized.slots.some(s => s.id === c.slotId)));
  assert.doesNotThrow(() => validateParkingLayout(trimmed, resized, 78, allowed));
  assert.deepEqual(resized.sessions, lot.sessions);
});
