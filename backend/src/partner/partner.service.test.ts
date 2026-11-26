import test from 'node:test';
import assert from 'node:assert/strict';
import { id, publicJson, publicRows, assertVersion, PartnerError, ticketReservationId } from './partner.service';

test('record identifiers preserve PostgreSQL bigint precision and reject malformed input', () => {
  assert.equal(id('9007199254740993'), '9007199254740993');
  assert.equal(id('9223372036854775807'), '9223372036854775807');
  for (const invalid of [0, -1, '0', '1 OR 1=1', '1.5', '9223372036854775808', 9007199254740993]) assert.throws(() => id(invalid), PartnerError);
});
test('public JSON removes nested credentials, QR hashes, OTPs and provider payloads', () => {
  const input = { id: '1', password_hash: 'private', before: { token_hash: 'private', phone: '0905', raw_ipn_payload: { key: 'private' } }, list: [{ otp_code: '123456', status: 'active' }] };
  assert.deepEqual(publicJson(input), { id: '1', before: { phone: '0905' }, list: [{ status: 'active' }] });
  assert.equal(input.password_hash, 'private');
});
test('database numeric and timestamp values become consistent frontend values without changing IDs or SQL dates', () => {
  const result = publicRows([{ id: '9007199254740993', amount: '123.45', latitude: null, created_at: new Date('2026-11-22T00:00:00Z'), effective_from: '2026-01-01' }])[0];
  assert.equal(result.id, '9007199254740993'); assert.equal(result.amount, 123.45);
  assert.equal(result.latitude, null); assert.equal(result.created_at, '2026-11-22T00:00:00.000Z'); assert.equal(result.effective_from, '2026-01-01');
});
test('stale and missing record versions cannot overwrite an existing update', () => {
  const row = { updated_at: new Date('2026-11-22T00:00:01Z') };
  assert.doesNotThrow(() => assertVersion(row, '2026-11-22T00:00:01.000Z'));
  assert.throws(() => assertVersion(row, '2026-11-22T00:00:00Z'), error => error instanceof PartnerError && error.status === 409);
  assert.throws(() => assertVersion(row, undefined), error => error instanceof PartnerError && error.status === 400);
});
test('gate kiosk accepts EZ-59, 59, the QR payload and JSON ticket codes', () => {
  for (const code of ['59', 'EZ-59', 'ez59', ' EZ-59 ', 'EZPARKING-DEMO-TICKET|ID=59|LOT=1|SPOT=A-01|VEHICLE=43A', '{"reservation_id":59}', 59]) assert.equal(ticketReservationId(code), '59');
  for (const invalid of ['', 'EZ-', 'abc', 'EZ-0', 'XID=59', null]) assert.throws(() => ticketReservationId(invalid), PartnerError);
});
