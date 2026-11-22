import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Server } from 'node:http';
import { pool } from '../config/db';
import app from '../app';
import { executeCleanup } from '../services/expiration.worker';
import { confirmDeposit, withPaymentTransaction } from '../payment/reservation';

// Each run gets an isolated schema in the configured PostgreSQL database.
// No existing application tables are truncated or reseeded.
const schema = `partner_test_${Date.now()}_${process.pid}`;
let server: Server | undefined;
let origin = '';
let token = '';
let customerToken = '';
let createdLot = '';
let createdSlot = '';
let createdPrice = '';
const json = async (url: string, method = 'GET', body?: object, auth: string | null = token) => {
  const response = await fetch(`${origin}/api${url}`, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() as any };
};
const snapshot = async () => {
  const result = await json('/partner/snapshot'); assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body.data.data;
};
before(async () => {
  pool.options.options = `-c search_path=${schema},public`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${schema}`);
    assert.equal((await client.query('SELECT current_schema()')).rows[0].current_schema, schema);
    await client.query(await readFile(path.resolve('..', 'database', 'schema.sql'), 'utf8'));
    await client.query(await readFile(path.resolve('..', 'database', 'seed.sql'), 'utf8'));
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server!.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  origin = `http://127.0.0.1:${address.port}`;
  const manager = await json('/auth/login', 'POST', { email: 'manager@ezspace.vn', password: 'password123' }, null);
  assert.equal(manager.status, 200, JSON.stringify(manager.body)); token = manager.body.data.token;
  const customer = await json('/auth/login', 'POST', { email: 'customer@ezspace.vn', password: 'password123' }, null);
  assert.equal(customer.status, 200); customerToken = customer.body.data.token;
});
after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  // This name is generated locally, never supplied by a request or .env.
  if (/^partner_test_\d+_\d+$/.test(schema)) await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => {});
  await pool.end();
});

test('live Partner rejects missing tokens and customer accounts', async () => {
  assert.equal((await json('/partner/snapshot', 'GET', undefined, null)).status, 401);
  assert.equal((await json('/partner/snapshot', 'GET', undefined, customerToken)).status, 403);
});
test('legacy seed hashes never allow a password shortcut', async () => {
  const original = (await pool.query('SELECT password_hash FROM users WHERE id=2')).rows[0].password_hash;
  try {
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=2', ['$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy']);
    const result = await json('/auth/login', 'POST', { email: 'manager@ezspace.vn', password: '123456' }, null);
    assert.equal(result.status, 401);
  } finally { await pool.query('UPDATE users SET password_hash=$1 WHERE id=2', [original]); }
});
test('snapshot scopes every table to managed lots and removes secrets', async () => {
  const result = await json('/partner/snapshot?manager_id=1');
  assert.equal(result.status, 200);
  assert.equal(result.body.data.manager_id, '2');
  const data = result.body.data.data;
  assert.deepEqual(data.parking_lots.map((l: any) => l.id), ['1', '2']);
  assert.equal(data.slots.length, 35); assert.equal(data.reservations.length, 3);
  assert.equal(data.payments.reduce((sum: number, p: any) => sum + p.amount, 0), 60000);
  assert.equal(typeof data.payments[0].amount, 'number');
  assert.equal(data.pricing_rules[0].effective_from, '2026-01-01');
  assert.doesNotMatch(JSON.stringify(data), /password_hash|raw_ipn_payload|token_hash|otp_code/);
  assert.ok(data.slots.every((s: any) => ['1', '2'].includes(s.parking_lot_id)));
});
test('manager cannot write another lot or self-approve a new lot', async () => {
  const input = { name: 'Integration test lot', address: 'Test address', description: null, latitude: null, longitude: null, open_time: '06:00', close_time: '23:00', capacity: 3, vehicle_types: ['Sedan', 'SUV', 'EV'], status: 'active', approved_by: '2' };
  assert.equal((await json('/partner/lots/3', 'PUT', input)).status, 403);
  const created = await json('/partner/lots', 'POST', input); assert.equal(created.status, 200); createdLot = created.body.data.id;
  const lot = (await snapshot()).parking_lots.find((l: any) => l.id === createdLot);
  assert.equal(lot.status, 'pending'); assert.equal(lot.approved_by, null);
  assert.equal((await pool.query('SELECT manager_id FROM parking_lot_managers WHERE parking_lot_id=$1', [createdLot])).rows[0].manager_id, '2');
});
test('slot writes persist, reject duplicates, protect bookings and detect stale edits', async () => {
  const input = { parking_lot_id: createdLot, code: 'TEST-01', row_index: 0, col_index: 0, slot_type: 'large', status: 'available', is_active: true };
  const added = await json('/partner/slots', 'POST', input); assert.equal(added.status, 200); createdSlot = added.body.data.id;
  assert.equal((await json('/partner/slots', 'POST', input)).status, 409);
  let data = await snapshot();
  const row = data.slots.find((s: any) => s.id === createdSlot);
  assert.equal(row.slot_type, 'large');
  const body = { ...input, code: 'TEST-02', expected_updated_at: row.updated_at };
  assert.equal((await json(`/partner/slots/${createdSlot}`, 'PUT', body)).status, 200);
  assert.equal((await json(`/partner/slots/${createdSlot}`, 'PUT', body)).status, 409);
  data = await snapshot();
  const held = data.slots.find((s: any) => s.id === data.reservations.find((r: any) => r.status === 'holding').slot_id);
  assert.equal((await json(`/partner/slots/${held.id}`, 'PUT', { ...held, expected_updated_at: held.updated_at })).status, 409);
  assert.equal((await pool.query('SELECT code FROM slots WHERE id=$1', [createdSlot])).rows[0].code, 'TEST-02');
});
test('pricing validation preserves booked amounts and SQL dates', async () => {
  const input = { parking_lot_id: createdLot, name: 'Test price', start_time: '22:00', end_time: '06:00', hourly_rate: 25000, surcharge: 5000, effective_from: '2026-01-01', effective_to: '2026-12-31' };
  assert.equal((await json('/partner/pricing', 'POST', { ...input, effective_to: '2025-01-01' })).status, 400);
  const created = await json('/partner/pricing', 'POST', input); assert.equal(created.status, 200); createdPrice = created.body.data.id;
  const data = await snapshot();
  const price = data.pricing_rules.find((p: any) => p.id === createdPrice);
  assert.equal(price.effective_from, '2026-01-01'); assert.equal(price.hourly_rate, 25000);
  assert.equal(data.reservations.find((r: any) => r.id === '2').deposit_amount, 20000);
});
test('cancellation updates reservation, slot and both audit logs atomically', async () => {
  assert.equal((await json('/partner/reservations/2/cancel', 'POST', { reason: 'Already paid' })).status, 409);
  const result = await json('/partner/reservations/1/cancel', 'POST', { reason: 'Integration test cancellation' }); assert.equal(result.status, 200);
  const data = await snapshot(); const reservation = data.reservations.find((r: any) => r.id === '1');
  assert.equal(reservation.status, 'cancelled');
  assert.equal(data.slots.find((s: any) => s.id === reservation.slot_id).status, 'available');
  assert.equal(data.payments.length, 3);
  assert.ok(data.audit_logs.some((a: any) => a.action === 'reservation_cancelled' && a.entity_id === '1'));
  assert.ok(data.manager_history.some((a: any) => a.action_type === 'reservation_cancelled'));
  assert.equal((await json('/partner/reservations/1/cancel', 'POST', { reason: 'Duplicate' })).status, 409);
});
test('profile saves affect only the current manager and preserve role/email', async () => {
  const before = (await snapshot()).users.find((u: any) => u.id === '2');
  assert.equal((await json('/partner/profile', 'PATCH', { full_name: 'Manager integration test', phone: before.phone, expected_updated_at: before.updated_at, role: 'admin', id: '1', email: 'changed@example.com' })).status, 200);
  const after = (await snapshot()).users.find((u: any) => u.id === '2');
  assert.equal(after.full_name, 'Manager integration test'); assert.equal(after.email, before.email); assert.equal(after.role, 'manager');
});
test('bank payments and later database changes appear in the next snapshot', async () => {
  await pool.query("INSERT INTO payments(reservation_id,provider,payment_type,amount,status,paid_at) VALUES(3,'bank','final',123.45,'success',NOW())");
  const data = await snapshot(); const payment = data.payments.find((p: any) => p.provider === 'bank');
  assert.equal(payment.amount, 123.45);
  assert.equal(data.payments.length, 4);
});
test('the shared banking flow updates the same reservation and payment rows read by Partner', async () => {
  const slot = (await pool.query("INSERT INTO slots(parking_lot_id,code,row_index,col_index,slot_type,status) VALUES(1,'BANK-HLD',8,0,'large','holding') RETURNING id")).rows[0];
  const booking = (await pool.query("INSERT INTO reservations(user_id,parking_lot_id,slot_id,vehicle_id,start_time,expected_end_time,status,hold_expires_at,hourly_rate,deposit_amount) VALUES(3,1,$1,1,NOW(),NOW()+INTERVAL '2 hours','holding',NOW()+INTERVAL '8 minutes',20000,20000) RETURNING id", [slot.id])).rows[0];
  assert.equal(await withPaymentTransaction(client => confirmDeposit(client, Number(booking.id), 'bank', 'TEST_BANK_SYNC', 20000)), 'success');
  const data = await snapshot();
  assert.equal(data.reservations.find((r: any) => r.id === booking.id).status, 'paid');
  assert.equal(data.slots.find((s: any) => s.id === slot.id).status, 'holding');
  const payment = data.payments.find((p: any) => p.transaction_ref === 'TEST_BANK_SYNC');
  assert.equal(payment.provider, 'bank'); assert.equal(payment.amount, 20000); assert.equal(payment.status, 'success');
});
test('expiration worker retains slots for paid bookings whose arrival deadline has not passed', async () => {
  await pool.query("UPDATE slots SET status='holding' WHERE id=(SELECT slot_id FROM reservations WHERE id=2)");
  await pool.query("UPDATE reservations SET arrival_expires_at=NOW()+INTERVAL '20 minutes' WHERE id=2");
  await executeCleanup();
  const result = await pool.query('SELECT s.status FROM slots s JOIN reservations r ON r.slot_id=s.id WHERE r.id=2');
  assert.equal(result.rows[0].status, 'holding');
});
test('manager status revocation is enforced even while a signed token remains valid', async () => {
  await pool.query("UPDATE users SET status='inactive' WHERE id=2");
  assert.equal((await json('/partner/snapshot')).status, 403);
  assert.equal((await json('/partner/profile', 'PATCH', { full_name: 'Cannot save', phone: null })).status, 403);
});
