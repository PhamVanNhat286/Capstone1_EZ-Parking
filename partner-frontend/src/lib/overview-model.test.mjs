import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoLot, summarizeLot, transitionSession, registerWalkIn, setSlotLock, activeSessionForSlot } from './overview-model.ts';

test('initial operational totals and active sessions agree for both lots', () => {
  for (const id of ['hai-chau-1', 'vincom']) {
    const lot = createDemoLot(id);
    const summary = summarizeLot(lot);
    assert.equal(summary.capacity, id === 'vincom' ? 80 : 120);
    assert.equal(summary.available + summary.holding + summary.occupied, summary.capacity);
    assert.equal(new Set(lot.slots.map(s => s.id)).size, lot.slots.length);
    assert.equal(new Set(lot.sessions.map(s => s.id)).size, lot.sessions.length);
    for (const slot of lot.slots) assert.equal(Boolean(activeSessionForSlot(lot, slot.id)), ['holding', 'occupied'].includes(slot.state));
  }
});

test('checkin consumes holding; checkout releases exactly one space', () => {
  const lot = createDemoLot();
  const checkedIn = transitionSession(lot, 'EZ-8921', 'checkin');
  assert.equal(summarizeLot(checkedIn).holding, 17);
  assert.equal(summarizeLot(checkedIn).occupied, 61);
  const checkedOut = transitionSession(checkedIn, 'EZ-8921', 'checkout');
  assert.equal(summarizeLot(checkedOut).available, 43);
  assert.equal(summarizeLot(checkedOut).occupied, 60);
  assert.equal(summarizeLot(checkedOut).capacity, 120);
  assert.throws(() => transitionSession(checkedOut, 'EZ-8921', 'checkout'));
  assert.equal(summarizeLot(lot).holding, 18, 'the original fixture is not mutated');
});

test('cancellation requires a reason and cannot cancel parked vehicles', () => {
  const lot = createDemoLot();
  assert.throws(() => transitionSession(lot, 'EZ-8921', 'cancel', ' '));
  assert.throws(() => transitionSession(lot, 'EZ-8919', 'cancel', 'Đổi lịch'));
  const cancelled = transitionSession(lot, 'EZ-8921', 'cancel', 'Khách đổi lịch');
  assert.equal(summarizeLot(cancelled).available, 43);
  assert.equal(cancelled.sessions.find(s => s.id === 'EZ-8921').reason, 'Khách đổi lịch');
});

test('walk-in registration refuses occupied spaces and duplicate active plates', () => {
  const lot = createDemoLot();
  const input = { customer: 'Khách thử', plate: '59A-123.45', vehicle: 'sedan', slotId: 'A-01' };
  const registered = registerWalkIn(lot, input);
  assert.equal(summarizeLot(registered).available, 41);
  assert.equal(summarizeLot(registered).occupied, 61);
  assert.throws(() => registerWalkIn(registered, { ...input, slotId: 'A-04' }));
  assert.throws(() => registerWalkIn(lot, { ...input, slotId: 'A-03' }));
  assert.throws(() => registerWalkIn(lot, { ...input, plate: 'invalid' }));
});

test('maintenance changes operational capacity and cannot lock an occupied slot', () => {
  const lot = createDemoLot();
  const locked = setSlotLock(lot, 'A-01', true);
  assert.equal(summarizeLot(locked).capacity, 119);
  assert.equal(summarizeLot(locked).available, 41);
  assert.equal(summarizeLot(setSlotLock(locked, 'A-01', false)).capacity, 120);
  assert.throws(() => setSlotLock(lot, 'A-03', true));
});
