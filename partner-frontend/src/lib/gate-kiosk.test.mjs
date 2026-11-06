import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoLot, transitionSession } from './overview-model.ts';
import { inspectGateTicket } from './gate-kiosk.ts';

test('gate checks booking state and rejects repeated check-in and check-out', () => {
  const lot = createDemoLot();
  assert.equal(inspectGateTicket(lot, 'EZ-8921', 'in').status, 'valid');
  const parked = transitionSession(lot, 'EZ-8921', 'checkin');
  assert.equal(inspectGateTicket(parked, 'EZ-8921', 'in').status, 'rejected');
  assert.equal(inspectGateTicket(parked, 'EZ-8921', 'out').status, 'valid');
  const completed = transitionSession(parked, 'EZ-8921', 'checkout');
  assert.equal(inspectGateTicket(completed, 'EZ-8921', 'out').status, 'rejected');
});
test('invalid, wrong-lot, expired and cancelled tickets never validate', () => {
  const lot = createDemoLot();
  for (const raw of ['', '{broken', '{}', 'EZ-missing', 'EZ-8904', JSON.stringify({ lotId: 'other', sessionId: 'EZ-8921' }), JSON.stringify({ lotId: lot.id, sessionId: 'EZ-8921', expiresAt: 1 })]) {
    assert.equal(inspectGateTicket(lot, raw, 'in').status, 'rejected', raw);
  }
  assert.equal(inspectGateTicket(lot, JSON.stringify({ lotId: lot.id, sessionId: 'EZ-8921' }), 'in').status, 'valid');
});
test('wrong direction and paused check-in are rejected; exit remains possible', () => {
  const lot = createDemoLot();
  assert.equal(inspectGateTicket(lot, 'EZ-8921', 'out').status, 'rejected');
  assert.equal(inspectGateTicket(lot, 'EZ-8919', 'in').status, 'rejected');
  assert.equal(inspectGateTicket(lot, 'EZ-8921', 'in', true).status, 'rejected');
  assert.equal(inspectGateTicket(lot, 'EZ-8919', 'out', true).status, 'valid');
});
test('quote subtracts deposit and refuses mismatched slot state without mutation', () => {
  const lot = createDemoLot();
  const snapshot = JSON.stringify(lot);
  const result = inspectGateTicket(lot, 'EZ-8919', 'out');
  assert.equal(result.total, 80000);
  assert.equal(result.due, 30000);
  assert.equal(JSON.stringify(lot), snapshot);
  const conflict = { ...lot, slots: lot.slots.map(s => s.id === 'B-03' ? { ...s, state: 'locked' } : s) };
  assert.equal(inspectGateTicket(conflict, 'EZ-8919', 'out').status, 'rejected');
});
