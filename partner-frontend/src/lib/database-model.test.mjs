import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createSqlPreview, databaseSource } from './database-seed.ts';
import { vehicleTypes, lotStatuses, slotStatuses, slotTypes, reservationStatuses, managedLots, summarize, saveLot, saveSlot, savePricing, toggleLot, cancelHolding, updateProfile, consistencyWarnings, previewGateIn, previewGateOut, csv, nextId, reportingDay } from './database-model.ts';

const now = '2026-11-08T03:00:00.000Z';
const seed = () => createSqlPreview(now);
const lotInput = db => { const l = db.parking_lots[0]; return { name: l.name, address: l.address, latitude: l.latitude, longitude: l.longitude, description: l.description, open_time: l.open_time, close_time: l.close_time, capacity: l.capacity, vehicle_types: ['Sedan', 'SUV', 'EV'] }; };
const priceInput = db => { const { parking_lot_id, name, start_time, end_time, hourly_rate, surcharge, effective_from, effective_to } = db.pricing_rules[0]; return { parking_lot_id, name, start_time, end_time, hourly_rate, surcharge, effective_from, effective_to }; };
const slotInput = db => { const { parking_lot_id, code, row_index, col_index, slot_type, status, is_active } = db.slots[0]; return { parking_lot_id, code, row_index, col_index, slot_type, status, is_active }; };

test('source hashes match the actual checked-out SQL; frontend enums use exact database values', async () => {
  for (const [file, key] of [['schema.sql', 'schema_sha256'], ['seed.sql', 'seed_sha256']]) {
    const content = await readFile(new URL(`../../../database/${file}`, import.meta.url), 'utf8');
    assert.equal(createHash('sha256').update(content.replaceAll('\r\n', '\n')).digest('hex'), databaseSource[key]);
  }
  for (const [name, values] of [['vehicle_type', vehicleTypes], ['parking_lot_status', lotStatuses], ['slot_status', slotStatuses], ['slot_type', slotTypes], ['reservation_status', reservationStatuses]]) assert.deepEqual(values, databaseSource.enums[name]);
});
test('SQL seed rows retain real counts, links and the incomplete capacity inventory', () => {
  const db = seed();
  assert.equal(db.users.length, 4); assert.equal(db.vehicles.length, 4); assert.equal(db.parking_lots.length, 3);
  assert.equal(db.slots.length, 55); assert.equal(db.reservations.length, 3); assert.equal(db.payments.length, 3);
  assert.equal(db.qr_tickets.length, 1); assert.equal(db.parking_sessions.length, 1);
  assert.equal(db.parking_lots[0].capacity, 80); assert.equal(summarize(db, '1').registered, 20);
  assert.deepEqual(managedLots(db, '2').map(l => l.id), ['1', '2']);
  assert.deepEqual(managedLots(db, '3'), []);
  for (const [name, rows] of Object.entries(db)) for (const row of rows) {
    assert.equal(typeof row.id, 'string');
    for (const key of Object.keys(row)) assert.ok(databaseSource.tables[name].includes(key), `${name}.${key} does not exist in SQL`);
    assert.deepEqual(Object.keys(row).sort(), databaseSource.tables[name].filter(key => !['password_hash', 'raw_ipn_payload'].includes(key)).sort(), `Incomplete public row for ${name}`);
    assert.ok(!('password_hash' in row)); assert.ok(!('raw_ipn_payload' in row));
  }
  for (const r of db.reservations) { assert.ok(db.vehicles.some(v => v.id === r.vehicle_id)); assert.ok(db.slots.some(s => s.id === r.slot_id)); assert.ok(db.users.some(u => u.id === r.user_id)); }
});
test('seed NOW intervals resolve against one clock, including multi-interval expressions', () => {
  const db = seed();
  assert.equal(db.reservations[0].hold_expires_at, '2026-11-08T03:08:00.000Z');
  assert.equal(db.reservations[2].arrival_expires_at, '2026-11-07T03:20:00.000Z');
  assert.equal(db.parking_sessions[0].check_in_at, '2026-11-07T03:10:00.000Z');
  assert.equal(nextId([{ id: '9007199254740993' }]), '9007199254740994');
});
test('availability uses only active slot records, never declared capacity or fabricated reservations', () => {
  const db = seed(); const original = summarize(db, '1');
  assert.equal(original.available, 14); assert.equal(original.holding, 2); assert.equal(original.occupied, 4);
  db.slots[0].is_active = false;
  assert.equal(summarize(db, '1').available, 13);
  assert.equal(summarize(db, '1').unavailable, 1);
  assert.equal(summarize(db, '1').sessions.filter(s => s.status === 'active').length, 0);
});
test('payments produce income without double-counting reservation or session totals', () => {
  const db = seed();
  assert.equal(summarize(db, '1').collected, 60000);
  const base = db.payments[0];
  db.payments.push({ ...base, id: '4', amount: 999999, status: 'pending' }, { ...base, id: '5', amount: 999999, status: 'failed' }, { ...base, id: '6', amount: 5000, payment_type: 'refund', status: 'success' });
  assert.equal(summarize(db, '1').collected, 60000);
  assert.equal(summarize(db, '1').refunds, 5000); assert.equal(summarize(db, '1').net, 55000);
});
test('creating a lot assigns current manager but cannot self-approve or generate imaginary slots', () => {
  const db = seed(); const result = saveLot(db, '2', { ...lotInput(db), name: 'Bãi mới' }, undefined, now);
  const added = result.parking_lots.at(-1);
  assert.equal(added.status, 'pending'); assert.equal(added.approved_by, null); assert.equal(added.approved_at, null);
  assert.ok(managedLots(result, '2').some(l => l.id === added.id));
  assert.equal(result.slots.length, db.slots.length);
  assert.equal(result.manager_history[0].action_type, 'lot_created');
  assert.throws(() => toggleLot(result, '2', added.id), /đã được duyệt/);
  assert.throws(() => saveLot(db, '3', lotInput(db)), /quản lý/);
  assert.equal(db.parking_lots.length, 3);
});
test('lot edits respect ownership, SQL length limits, coordinates, inventory and inactive enum', () => {
  const db = seed();
  assert.throws(() => saveLot(db, '2', lotInput(db), '3'), /phân công/);
  for (const invalid of [{ name: 'x'.repeat(151) }, { address: 'x'.repeat(256) }, { capacity: 19 }, { capacity: -1 }, { latitude: 91 }, { longitude: 181 }, { open_time: '25:00' }, { vehicle_types: ['UP_TO_4_SEATS'] }]) assert.throws(() => saveLot(db, '2', { ...lotInput(db), ...invalid }, '1'));
  const paused = toggleLot(db, '2', '1', now);
  assert.equal(paused.parking_lots[0].status, 'inactive');
  assert.equal(toggleLot(paused, '2', '1', now).parking_lots[0].status, 'active');
});
test('slot edits enforce unique code and unique grid per lot, while allowing same grid in another lot', () => {
  const db = seed(); const input = slotInput(db);
  assert.throws(() => saveSlot(db, '2', { ...input, code: 'A-02' }, '1'), /đã tồn tại/);
  assert.throws(() => saveSlot(db, '2', { ...input, col_index: 1 }, '1'), /đã tồn tại/);
  assert.throws(() => saveSlot(db, '2', { ...input, row_index: -1 }, '1'), /Hàng/);
  assert.throws(() => saveSlot(db, '2', { ...input, code: '12345678901' }, '1'), /10/);
  const result = saveSlot(db, '2', { ...input, code: 'NEW', row_index: 5, col_index: 0 }, undefined, now);
  assert.equal(result.slots.at(-1).row_index, 5); assert.equal(result.manager_history[0].action_type, 'slot_updated');
});
test('slots linked to unfinished reservations are protected even if their recorded status looks empty', () => {
  const db = seed(); db.slots[2].status = 'available';
  const input = { ...slotInput(db), code: 'X', row_index: 8, col_index: 0 };
  assert.throws(() => saveSlot(db, '2', input, '3'), /chưa kết thúc/);
  assert.throws(() => saveSlot(db, '2', { ...input, status: 'occupied' }), /Chỉ cấu hình/);
});
test('pricing preserves reservation snapshots; supports overnight/null periods and SQL precision', () => {
  const db = seed(); const input = priceInput(db);
  const result = savePricing(db, '2', { ...input, hourly_rate: 25432.25, start_time: '22:00:00', end_time: '06:00:00' }, '1', now);
  assert.equal(result.pricing_rules[0].hourly_rate, 25432.25);
  assert.deepEqual(result.reservations, db.reservations); assert.deepEqual(result.payments, db.payments);
  for (const invalid of [{ hourly_rate: -1 }, { hourly_rate: 10000000000 }, { surcharge: 0.001 }, { effective_from: '2026-02-30' }, { effective_from: '2026-12-01', effective_to: '2026-01-01' }]) assert.throws(() => savePricing(db, '2', { ...input, ...invalid }, '1'));
  const blank = savePricing(db, '2', { ...input, start_time: null, end_time: null, effective_from: null, effective_to: null });
  assert.equal(blank.pricing_rules.at(-1).effective_to, null);
});
test('cancelling an unpaid hold releases only its slot, records audit and does not fabricate a refund', () => {
  const db = seed(); const result = cancelHolding(db, '2', '1', 'Khách đổi lịch', now);
  assert.equal(result.reservations[0].status, 'cancelled'); assert.equal(result.slots[2].status, 'available');
  assert.deepEqual(result.payments, db.payments); assert.equal(result.reservations[1].status, 'paid');
  assert.equal(result.manager_history[0].action_type, 'reservation_cancelled');
  assert.equal(db.reservations[0].status, 'holding');
  assert.throws(() => cancelHolding(result, '2', '1', 'Lặp lại'), /Chỉ hủy/);
  assert.throws(() => cancelHolding(db, '2', '2', 'Đã cọc'), /hoàn tiền/);
  assert.throws(() => cancelHolding(db, '2', '1', ''), /Lý do/);
});
test('seed conflicts are reported instead of being silently repaired or counted as parking sessions', () => {
  const db = seed(); const warnings = consistencyWarnings(db, '1');
  assert.equal(warnings.length, 1); assert.match(warnings[0], /#2.*paid.*A-04.*occupied/);
  assert.equal(db.slots[3].status, 'occupied');
  assert.throws(() => previewGateIn(db, '2', '2', now), /holding hợp lệ/);
  assert.throws(() => previewGateIn(db, '2', '1', now), /paid/);
});
test('valid gate check-in updates reservation, slot, QR, session together and rejects replay', () => {
  const db = seed(); db.slots[3].status = 'holding'; // Separate, internally consistent test scenario.
  const entered = previewGateIn(db, '2', '2', now);
  assert.equal(entered.reservations[1].status, 'entered'); assert.equal(entered.slots[3].status, 'occupied');
  assert.equal(entered.qr_tickets[0].status, 'used'); assert.equal(entered.qr_tickets[0].used_at, now);
  assert.equal(entered.parking_sessions.at(-1).reservation_id, '2');
  assert.equal(entered.parking_sessions.at(-1).checked_in_by, '2');
  assert.throws(() => previewGateIn(entered, '2', '2', now), /paid/);
  assert.equal(db.reservations[1].status, 'paid');
});
test('gate check-in refuses expired, reused and cross-manager tickets', () => {
  const db = seed(); db.slots[3].status = 'holding';
  assert.throws(() => previewGateIn(db, '3', '2', now), /phân công/);
  assert.throws(() => previewGateIn(db, '2', '2', '2026-11-08T03:16:00Z'), /hết hạn/);
  db.qr_tickets[0].status = 'used';
  assert.throws(() => previewGateIn(db, '2', '2', now), /đã dùng/);
});
test('checkout requires actual successful funds and cannot manufacture a final payment', () => {
  const db = seed(); db.slots[3].status = 'holding';
  const entered = previewGateIn(db, '2', '2', now);
  assert.throws(() => previewGateOut(entered, '2', '2', 40000, now), /thiếu/);
  const result = previewGateOut(entered, '2', '2', 20000, now);
  assert.equal(result.reservations[1].status, 'completed'); assert.equal(result.slots[3].status, 'available');
  assert.equal(result.parking_sessions.at(-1).final_amount, 20000);
  assert.deepEqual(result.payments, db.payments);
  assert.throws(() => previewGateOut(result, '2', '2', 20000, now), /entered/);
});
test('profile changes obey public SQL fields and never edit role/email or other users', () => {
  const db = seed(); const changed = updateProfile(db, '2', 'Người quản lý mới', '0905999999');
  assert.equal(changed.users[1].full_name, 'Người quản lý mới');
  assert.equal(changed.users[1].role, 'manager'); assert.equal(changed.users[1].email, db.users[1].email);
  assert.deepEqual(changed.users[0], db.users[0]);
  assert.throws(() => updateProfile(db, '2', 'x'.repeat(101), '0905'), /100/);
  assert.throws(() => updateProfile(db, '2', 'Tên', db.users[0].phone), /đã được/);
});
test('CSV quotes commas, newlines and quotes; neutralizes spreadsheet formulas', () => {
  const output = csv([['mã', 'ghi chú'], ['=1+1', 'Khách, nói "hủy"\nngày mai']]);
  assert.ok(output.startsWith('\uFEFF')); assert.ok(output.includes('"\'=1+1"')); assert.ok(output.includes('Khách, nói ""hủy""\nngày mai'));
});
test('report date filters use Vietnam calendar dates across UTC midnight boundaries', () => {
  assert.equal(reportingDay('2026-11-07T18:30:00Z'), '2026-11-08');
  assert.equal(reportingDay('2026-11-08T16:59:59Z'), '2026-11-08');
  assert.equal(reportingDay('2026-11-08T17:00:00Z'), '2026-11-09');
});
