import type { PoolClient } from 'pg';

export class PartnerError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const id = (value: unknown) => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new PartnerError(400, 'Mã số lớn phải được truyền dưới dạng chuỗi.');
  const result = String(value ?? '');
  if (!/^[1-9]\d*$/.test(result) || BigInt(result) > 9223372036854775807n) throw new PartnerError(400, 'Mã bản ghi không hợp lệ.');
  return result;
};
const text = (value: unknown, max: number, label: string) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new PartnerError(400, `${label} cần từ 1 đến ${max} ký tự.`);
  return value.trim();
};
const optional = (value: unknown, max: number, label: string) => value === null || value === undefined || value === '' ? null : text(value, max, label);
const number = (value: unknown, min: number, max: number, label: string, integer = false) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new PartnerError(400, `${label} không hợp lệ.`);
  return value;
};
const time = (value: unknown) => {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) throw new PartnerError(400, 'Giờ không hợp lệ.');
  return value;
};
const date = (value: unknown) => {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new PartnerError(400, 'Ngày không hợp lệ.');
  return value;
};
export function assertVersion(row: Record<string, any>, expected: unknown) {
  if (typeof expected !== 'string' || !Number.isFinite(Date.parse(expected))) throw new PartnerError(400, 'Thiếu phiên bản bản ghi. Hãy tải lại dữ liệu.');
  if (new Date(row.updated_at).getTime() !== Date.parse(expected)) throw new PartnerError(409, 'Dữ liệu đã được thay đổi. Hãy làm mới trước khi lưu lại.');
}

export async function requireManager(client: PoolClient, managerId: string, lock = false) {
  const result = await client.query(`SELECT id,full_name,email,phone,role,status,avatar_url,created_at,updated_at FROM users WHERE id=$1 AND role='manager' AND status='active'${lock ? ' FOR SHARE' : ''}`, [managerId]);
  if (!result.rowCount) throw new PartnerError(403, 'Chỉ tài khoản quản lý đang hoạt động được truy cập Partner.');
  return result.rows[0];
}
async function ownLot(client: PoolClient, managerId: string, lotId: string) {
  const assignment = await client.query('SELECT id FROM parking_lot_managers WHERE parking_lot_id=$1 AND manager_id=$2 FOR SHARE', [lotId, managerId]);
  if (!assignment.rowCount) throw new PartnerError(403, 'Bạn không được phân công quản lý bãi này.');
  const result = await client.query('SELECT * FROM parking_lots WHERE id=$1 FOR UPDATE', [lotId]);
  if (!result.rowCount) throw new PartnerError(404, 'Không tìm thấy bãi đỗ.');
  return result.rows[0];
}

// Do not send credentials, QR hashes, OTPs or payment provider payloads to the browser.
export function publicJson(value: any): any {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(publicJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|secret|token|authorization|raw_ipn_payload|otp_code/i.test(key)).map(([key, item]) => [key, publicJson(item)]));
}
const numericFields = new Set(['capacity', 'row_index', 'col_index', 'latitude', 'longitude', 'hourly_rate', 'surcharge', 'deposit_amount', 'total_amount', 'amount', 'final_amount']);
const priceColumns = 'id,parking_lot_id,name,start_time,end_time,hourly_rate,surcharge,effective_from::text,effective_to::text,created_at,updated_at';
export function publicRows(rows: Record<string, any>[]) {
  return rows.map(row => publicJson(Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value !== null && numericFields.has(key) ? Number(value) : value]))));
}

export async function loadSnapshot(client: PoolClient, managerId: string) {
  const manager = await requireManager(client, managerId);
  const lots = (await client.query('SELECT l.* FROM parking_lots l JOIN parking_lot_managers m ON m.parking_lot_id=l.id WHERE m.manager_id=$1 ORDER BY l.id', [managerId])).rows;
  const lotIds = lots.map(lot => lot.id);
  const scoped = async (table: string, columns = '*') => (await client.query(`SELECT ${columns} FROM ${table} WHERE parking_lot_id=ANY($1::bigint[]) ORDER BY id`, [lotIds])).rows;
  const reservations = await scoped('reservations');
  const reservationIds = reservations.map(row => row.id);
  const related = async (table: string, columns = '*') => (await client.query(`SELECT ${columns} FROM ${table} WHERE reservation_id=ANY($1::bigint[]) ORDER BY id`, [reservationIds])).rows;
  const payments = await related('payments', 'id,reservation_id,provider,transaction_ref,payment_type,amount,status,response_code,ipn_received_at,paid_at,created_at,updated_at');
  const tickets = await related('qr_tickets', 'id,reservation_id,status,issued_at,used_at,expires_at,created_at');
  const sessions = await related('parking_sessions');
  const assignments = await scoped('parking_lot_managers');
  const audit = (await client.query('SELECT * FROM audit_logs WHERE parking_lot_id=ANY($1::bigint[]) OR (parking_lot_id IS NULL AND user_id=$2) ORDER BY id DESC', [lotIds, managerId])).rows;
  const history = await scoped('manager_history');
  const userIds = [...new Set([managerId, ...reservations.map(r => r.user_id), ...assignments.map(m => m.manager_id), ...sessions.flatMap(s => [s.checked_in_by, s.checked_out_by]), ...audit.map(a => a.user_id), ...history.map(h => h.manager_id)].filter(Boolean))];
  const users = (await client.query('SELECT id,full_name,email,phone,role,status,avatar_url,created_at,updated_at FROM users WHERE id=ANY($1::bigint[]) ORDER BY id', [userIds])).rows;
  const vehicles = (await client.query('SELECT * FROM vehicles WHERE id=ANY($1::bigint[]) ORDER BY id', [[...new Set(reservations.map(r => r.vehicle_id))]])).rows;
  const pricing = await scoped('pricing_rules', priceColumns);
  const data = {
    users, vehicles, parking_lots: lots, parking_lot_managers: assignments,
    parking_lot_vehicle_types: await scoped('parking_lot_vehicle_types'), slots: await scoped('slots'),
    pricing_rules: pricing, reservations, payments, qr_tickets: tickets, parking_sessions: sessions,
    audit_logs: audit, manager_history: history,
  };
  return { manager_id: String(manager.id), synced_at: new Date().toISOString(), data: Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, publicRows(rows)])) };
}

async function log(client: PoolClient, manager: string, lot: string | null, action: string, table: string, entityId: string, before: any, after: any, note: string) {
  const values = [manager, lot, action, table, entityId, before === null ? null : JSON.stringify(publicJson(before)), JSON.stringify(publicJson(after)), note];
  await client.query('INSERT INTO audit_logs(user_id,parking_lot_id,action,entity_type,entity_id,old_value,new_value,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', values);
  if (lot) await client.query('INSERT INTO manager_history(manager_id,parking_lot_id,action_type,old_value,new_value,note) VALUES($1,$2,$3,$4,$5,$6)', [manager, lot, action, values[5], values[6], note]);
}
// Column/table names below are application constants, never request input.
async function write(client: PoolClient, table: string, fields: Record<string, any>, recordId?: string) {
  const columns = Object.keys(fields), values = Object.values(fields);
  const returning = table === 'pricing_rules' ? priceColumns : '*';
  const sql = recordId
    ? `UPDATE ${table} SET ${columns.map((column, i) => `${column}=$${i + 1}`).join(',')},updated_at=NOW() WHERE id=$${values.length + 1} RETURNING ${returning}`
    : `INSERT INTO ${table}(${columns.join(',')}) VALUES(${values.map((_, i) => `$${i + 1}`).join(',')}) RETURNING ${returning}`;
  return (await client.query(sql, recordId ? [...values, recordId] : values)).rows[0];
}

export async function saveLot(client: PoolClient, manager: string, input: any, recordId?: string) {
  const before = recordId ? await ownLot(client, manager, recordId) : null;
  if (before) assertVersion(before, input.expected_updated_at);
  const fields = {
    name: text(input.name, 150, 'Tên bãi'), address: text(input.address, 255, 'Địa chỉ'),
    description: optional(input.description, 20000, 'Mô tả'),
    latitude: input.latitude === null ? null : number(input.latitude, -90, 90, 'Vĩ độ'),
    longitude: input.longitude === null ? null : number(input.longitude, -180, 180, 'Kinh độ'),
    open_time: time(input.open_time), close_time: time(input.close_time), capacity: number(input.capacity, 0, 2147483647, 'Sức chứa', true),
  };
  if (!Array.isArray(input.vehicle_types) || input.vehicle_types.length === 0 || input.vehicle_types.some((v: unknown) => !['Sedan', 'SUV', 'EV'].includes(String(v)))) throw new PartnerError(400, 'Chọn loại xe Sedan, SUV hoặc EV.');
  if (before) {
    const count = (await client.query('SELECT COUNT(*) FROM slots WHERE parking_lot_id=$1', [recordId])).rows[0].count;
    if (fields.capacity < Number(count)) throw new PartnerError(409, 'Sức chứa không được thấp hơn số ô đã tạo.');
  }
  const after = await write(client, 'parking_lots', fields, recordId);
  if (!recordId) await client.query('INSERT INTO parking_lot_managers(parking_lot_id,manager_id) VALUES($1,$2)', [after.id, manager]);
  await client.query('DELETE FROM parking_lot_vehicle_types WHERE parking_lot_id=$1', [after.id]);
  for (const type of new Set(input.vehicle_types)) await client.query('INSERT INTO parking_lot_vehicle_types(parking_lot_id,vehicle_type) VALUES($1,$2)', [after.id, type]);
  await log(client, manager, after.id, before ? 'lot_updated' : 'lot_created', 'parking_lots', after.id, before, after, before ? 'Cập nhật bãi đỗ' : 'Đăng ký bãi chờ Admin duyệt');
  return after.id;
}
export async function toggleLot(client: PoolClient, manager: string, lotId: string, input: any) {
  const before = await ownLot(client, manager, lotId);
  assertVersion(before, input.expected_updated_at);
  if (!['active', 'inactive'].includes(before.status) || !before.approved_at) throw new PartnerError(409, 'Chỉ tạm ngưng hoặc mở lại bãi đã được duyệt.');
  const after = await write(client, 'parking_lots', { status: before.status === 'active' ? 'inactive' : 'active' }, lotId);
  await log(client, manager, lotId, 'lot_updated', 'parking_lots', lotId, before, after, 'Thay đổi trạng thái khai thác');
  return after.id;
}
export async function saveSlot(client: PoolClient, manager: string, input: any, recordId?: string) {
  const lotId = id(input.parking_lot_id), lot = await ownLot(client, manager, lotId);
  const before = recordId ? (await client.query('SELECT * FROM slots WHERE id=$1 AND parking_lot_id=$2 FOR UPDATE', [recordId, lotId])).rows[0] : null;
  if (recordId && !before) throw new PartnerError(404, 'Không tìm thấy ô trong bãi.');
  if (before) {
    assertVersion(before, input.expected_updated_at);
    const linked = await client.query("SELECT id FROM reservations WHERE slot_id=$1 AND status IN ('holding','paid','entered') LIMIT 1", [recordId]);
    if (['holding', 'occupied'].includes(before.status) || linked.rowCount) throw new PartnerError(409, 'Ô đang có xe hoặc còn đặt chỗ; không thể sửa.');
  } else {
    const count = (await client.query('SELECT COUNT(*) FROM slots WHERE parking_lot_id=$1', [lotId])).rows[0].count;
    if (Number(count) >= lot.capacity) throw new PartnerError(409, 'Số ô đã đạt sức chứa khai báo.');
  }
  if (!['standard', 'large', 'ev_charging', 'disabled'].includes(input.slot_type) || !['available', 'unavailable'].includes(input.status) || typeof input.is_active !== 'boolean') throw new PartnerError(400, 'Loại ô, trạng thái hoặc khai thác không hợp lệ.');
  const after = await write(client, 'slots', { parking_lot_id: lotId, code: text(input.code, 10, 'Mã ô'), row_index: number(input.row_index, 0, 1000, 'Hàng', true), col_index: number(input.col_index, 0, 1000, 'Cột', true), slot_type: input.slot_type, status: input.status, is_active: input.is_active }, recordId);
  await log(client, manager, lotId, 'slot_updated', 'slots', after.id, before, after, 'Cấu hình vị trí và tình trạng ô đỗ');
  return after.id;
}
export async function savePricing(client: PoolClient, manager: string, input: any, recordId?: string) {
  const lotId = id(input.parking_lot_id); await ownLot(client, manager, lotId);
  const before = recordId ? (await client.query(`SELECT ${priceColumns} FROM pricing_rules WHERE id=$1 AND parking_lot_id=$2 FOR UPDATE`, [recordId, lotId])).rows[0] : null;
  if (recordId && !before) throw new PartnerError(404, 'Không tìm thấy quy tắc giá trong bãi.');
  if (before) assertVersion(before, input.expected_updated_at);
  const hourly_rate = number(input.hourly_rate, 0, 9999999999.99, 'Giá giờ'), surcharge = number(input.surcharge, 0, 9999999999.99, 'Phụ thu');
  if ([hourly_rate, surcharge].some(n => Math.abs(n * 100 - Math.round(n * 100)) > .001)) throw new PartnerError(400, 'Giá tối đa hai chữ số thập phân.');
  const effective_from = date(input.effective_from), effective_to = date(input.effective_to);
  if (effective_from && effective_to && effective_from > effective_to) throw new PartnerError(400, 'Ngày kết thúc không được trước ngày bắt đầu.');
  const after = await write(client, 'pricing_rules', { parking_lot_id: lotId, name: optional(input.name, 100, 'Tên quy tắc'), start_time: time(input.start_time), end_time: time(input.end_time), hourly_rate, surcharge, effective_from, effective_to }, recordId);
  await log(client, manager, lotId, 'pricing_updated', 'pricing_rules', after.id, before, after, 'Cập nhật giá cho các đặt chỗ mới');
  return after.id;
}
export async function cancelHolding(client: PoolClient, manager: string, reservationId: string, input: any) {
  const lookup = (await client.query('SELECT parking_lot_id,slot_id FROM reservations WHERE id=$1', [reservationId])).rows[0];
  if (!lookup) throw new PartnerError(404, 'Không tìm thấy đặt chỗ.');
  await ownLot(client, manager, lookup.parking_lot_id);
  const slot = (await client.query('SELECT * FROM slots WHERE id=$1 FOR UPDATE', [lookup.slot_id])).rows[0];
  const before = (await client.query('SELECT * FROM reservations WHERE id=$1 FOR UPDATE', [reservationId])).rows[0];
  if (before.status !== 'holding') throw new PartnerError(409, 'Chỉ hủy giữ chỗ chưa thanh toán cọc.');
  const other = await client.query("SELECT id FROM reservations WHERE slot_id=$1 AND id<>$2 AND status IN ('holding','paid','entered') LIMIT 1", [lookup.slot_id, reservationId]);
  if (!slot || slot.status !== 'holding' || other.rowCount) throw new PartnerError(409, 'Trạng thái ô và đặt chỗ không nhất quán; cần kiểm tra trước khi hủy.');
  const reason = text(input.reason, 255, 'Lý do hủy');
  const after = await write(client, 'reservations', { status: 'cancelled', cancelled_at: new Date(), cancel_reason: reason }, reservationId);
  await write(client, 'slots', { status: 'available' }, slot.id);
  await log(client, manager, before.parking_lot_id, 'reservation_cancelled', 'reservations', reservationId, before, after, reason);
  return reservationId;
}
export async function saveProfile(client: PoolClient, manager: string, input: any) {
  const before = (await client.query('SELECT id,full_name,phone,updated_at FROM users WHERE id=$1 FOR UPDATE', [manager])).rows[0];
  assertVersion(before, input.expected_updated_at);
  const phone = optional(input.phone, 20, 'Số điện thoại');
  if (phone && !/^\+?[\d ()-]+$/.test(phone)) throw new PartnerError(400, 'Số điện thoại không hợp lệ.');
  const after = (await client.query('UPDATE users SET full_name=$1,phone=$2,updated_at=NOW() WHERE id=$3 RETURNING id,full_name,phone,updated_at', [text(input.full_name, 100, 'Họ tên'), phone, manager])).rows[0];
  await log(client, manager, null, 'PROFILE_UPDATED', 'users', manager, before, after, 'Cập nhật hồ sơ quản lý');
  return manager;
}
