import test from 'node:test';
import assert from 'node:assert/strict';
import { initialManagedLots, validateLotInput, updateLotProfile, changeLotStatus, syncOverviewProfile } from './managed-lots.ts';
import { createDemoLot, summarizeLot } from './overview-model.ts';

test('four initial approval states are distinct and each code is unique', () => {
  const lots = initialManagedLots();
  assert.deepEqual(lots.map(lot => lot.status), ['active', 'pending', 'rejected', 'paused']);
  assert.equal(new Set(lots.map(lot => lot.code)).size, lots.length);
});

test('lot profiles reject duplicate names, invalid capacities, times and vehicle kinds', () => {
  const lots = initialManagedLots();
  const input = { ...lots[0], name: 'Bãi mới' };
  assert.equal(validateLotInput(input, lots).name, 'Bãi mới');
  assert.throws(() => validateLotInput({ ...input, name: lots[0].name }, lots));
  assert.throws(() => validateLotInput({ ...input, capacity: 2.5 }, lots));
  assert.throws(() => validateLotInput({ ...input, capacity: 77 }, lots, undefined, 78));
  assert.throws(() => validateLotInput({ ...input, opens: '25:00' }, lots));
  assert.throws(() => validateLotInput({ ...input, vehicles: [] }, lots));
  assert.equal(validateLotInput({ ...input, opens: '22:00', closes: '06:00' }, lots).opens, '22:00');
});

test('resubmission can only move a rejected lot back to pending', () => {
  const lots = initialManagedLots();
  const rejected = lots[2];
  const pending = updateLotProfile(rejected, { ...rejected, name: 'Hồ sơ đã bổ sung' }, true);
  assert.equal(pending.status, 'pending');
  assert.equal(pending.rejectionReason, undefined);
  assert.throws(() => updateLotProfile(lots[1], lots[1]));
  assert.throws(() => changeLotStatus(pending, 'resume'));
  assert.throws(() => changeLotStatus(rejected, 'resume'));
});

test('pause and resume preserve the approved profile and forbid approval bypass', () => {
  const active = initialManagedLots()[0];
  const paused = changeLotStatus(active, 'pause');
  assert.equal(paused.status, 'paused');
  assert.equal(paused.capacity, active.capacity);
  assert.equal(changeLotStatus(paused, 'resume').status, 'active');
  assert.throws(() => changeLotStatus(initialManagedLots()[1], 'pause'));
});

test('capacity changes preserve occupied and held slots and reject loss of active sessions', () => {
  const overview = createDemoLot();
  const profile = initialManagedLots()[0];
  const smaller = syncOverviewProfile(overview, { ...profile, capacity: 90 });
  assert.equal(summarizeLot(smaller).capacity, 90);
  assert.equal(summarizeLot(smaller).occupied, 60);
  assert.equal(summarizeLot(smaller).holding, 18);
  assert.equal(smaller.sessions, overview.sessions);
  assert.throws(() => syncOverviewProfile(overview, { ...profile, capacity: 77 }));
  const larger = syncOverviewProfile(smaller, { ...profile, capacity: 130 });
  assert.equal(summarizeLot(larger).capacity, 130);
  assert.equal(new Set(larger.slots.map(slot => slot.id)).size, larger.slots.length);
});

test('a previously paused lot starts with its own capacity and no invented cars', () => {
  const lot = initialManagedLots()[3];
  const summary = summarizeLot(syncOverviewProfile(undefined, lot));
  assert.equal(summary.capacity, 80);
  assert.equal(summary.available, 80);
  assert.equal(summary.occupied, 0);
  assert.equal(summary.holding, 0);
});
