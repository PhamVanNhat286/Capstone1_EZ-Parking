// Application contract: database/schema.sql on develop. IDs are BIGINT strings.
export const vehicleTypes = ['Sedan', 'SUV', 'EV'] as const;
export const lotStatuses = ['pending', 'active', 'inactive', 'rejected'] as const;
export const slotStatuses = ['available', 'holding', 'occupied', 'unavailable'] as const;
export const slotTypes = ['standard', 'ev_charging', 'large', 'disabled'] as const;
export const reservationStatuses = ['holding', 'paid', 'entered', 'completed', 'cancelled', 'forfeited', 'refunded'] as const;
export type Id = string;
export type VehicleType = typeof vehicleTypes[number];
export type LotStatus = typeof lotStatuses[number];
export type SlotStatus = typeof slotStatuses[number];
export type SlotType = typeof slotTypes[number];
export type ReservationStatus = typeof reservationStatuses[number];
type Timestamps = { created_at: string; updated_at: string };
export type User = Timestamps & { id: Id; full_name: string; email: string; phone: string | null; role: 'customer' | 'manager' | 'admin'; status: 'active' | 'inactive' | 'banned'; avatar_url: string | null };
export type Vehicle = Timestamps & { id: Id; user_id: Id; license_plate: string; vehicle_name: string | null; vehicle_type: VehicleType; is_default: boolean };
export type ParkingLot = Timestamps & { id: Id; name: string; address: string; latitude: number | null; longitude: number | null; description: string | null; open_time: string | null; close_time: string | null; capacity: number; status: LotStatus; approved_by: Id | null; approved_at: string | null };
export type LotVehicleType = { id: Id; parking_lot_id: Id; vehicle_type: VehicleType };
export type LotManager = { id: Id; parking_lot_id: Id; manager_id: Id; assigned_at: string };
export type Slot = Timestamps & { id: Id; parking_lot_id: Id; code: string; row_index: number; col_index: number; slot_type: SlotType; status: SlotStatus; is_active: boolean };
export type PricingRule = Timestamps & { id: Id; parking_lot_id: Id; name: string | null; start_time: string | null; end_time: string | null; hourly_rate: number; surcharge: number; effective_from: string | null; effective_to: string | null };
export type Reservation = Timestamps & { id: Id; user_id: Id; parking_lot_id: Id; slot_id: Id; vehicle_id: Id; start_time: string; expected_end_time: string; status: ReservationStatus; hold_expires_at: string; arrival_expires_at: string | null; hourly_rate: number; deposit_amount: number; total_amount: number | null; cancelled_at: string | null; cancel_reason: string | null };
export type Payment = Timestamps & { id: Id; reservation_id: Id; provider: 'vnpay' | 'momo' | 'card'; transaction_ref: string | null; payment_type: 'deposit' | 'final' | 'refund'; amount: number; status: 'pending' | 'success' | 'failed' | 'refunded'; response_code: string | null; ipn_received_at: string | null; paid_at: string | null };
export type QrTicket = { id: Id; reservation_id: Id; token_hash: string; status: 'active' | 'used' | 'expired' | 'cancelled'; issued_at: string; used_at: string | null; expires_at: string; created_at: string };
export type ParkingSession = Timestamps & { id: Id; reservation_id: Id; check_in_at: string | null; check_out_at: string | null; checked_in_by: Id | null; checked_out_by: Id | null; final_amount: number | null; status: 'active' | 'completed' | 'abandoned' };
export type AuditLog = { id: Id; user_id: Id | null; parking_lot_id: Id | null; action: string; entity_type: string | null; entity_id: Id | null; old_value: unknown; new_value: unknown; note: string | null; created_at: string };
export type ManagerAction = 'lot_created' | 'lot_updated' | 'slot_updated' | 'pricing_updated' | 'reservation_cancelled' | 'report_viewed';
export type ManagerHistory = { id: Id; manager_id: Id; parking_lot_id: Id; action_type: ManagerAction; old_value: unknown; new_value: unknown; note: string | null; created_at: string };
export type PartnerData = { users: User[]; vehicles: Vehicle[]; parking_lots: ParkingLot[]; parking_lot_vehicle_types: LotVehicleType[]; parking_lot_managers: LotManager[]; slots: Slot[]; pricing_rules: PricingRule[]; reservations: Reservation[]; payments: Payment[]; qr_tickets: QrTicket[]; parking_sessions: ParkingSession[]; audit_logs: AuditLog[]; manager_history: ManagerHistory[] };
export const labels: Record<string, string> = { pending: 'Chờ duyệt', active: 'Hoạt động', inactive: 'Tạm ngưng', rejected: 'Từ chối', available: 'Trống', holding: 'Giữ chỗ, chưa cọc', occupied: 'Có xe đỗ', unavailable: 'Không khả dụng', standard: 'Tiêu chuẩn', ev_charging: 'Sạc điện', large: 'Ô lớn', disabled: 'Ưu tiên', paid: 'Đã cọc, chờ đến', entered: 'Đã vào bãi', completed: 'Hoàn thành', cancelled: 'Đã hủy', forfeited: 'Mất cọc / hết hạn', refunded: 'Đã hoàn tiền', success: 'Thành công', failed: 'Thất bại', deposit: 'Tiền cọc', final: 'Thanh toán cuối', refund: 'Hoàn tiền', used: 'Đã sử dụng', expired: 'Hết hạn', abandoned: 'Chưa kết thúc đúng cách', customer: 'Khách hàng', manager: 'Quản lý', admin: 'Quản trị viên', lot_created: 'Đăng ký bãi', lot_updated: 'Cập nhật bãi', slot_updated: 'Cập nhật ô', pricing_updated: 'Cập nhật giá', reservation_cancelled: 'Hủy giữ chỗ', report_viewed: 'Xem báo cáo' };
export const money = (n: number) => `${n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}đ`;
export const dateTime = (s: string | null) => s ? new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
export const reportingDay = (stamp: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(stamp));
export const nextId = (rows: { id: Id }[]) => String(rows.reduce((m, r) => BigInt(r.id) > m ? BigInt(r.id) : m, 0n) + 1n);
export const ownsLot = (db: PartnerData, manager: Id, lot: Id) => db.users.some(u => u.id === manager && u.role === 'manager' && u.status === 'active') && db.parking_lot_managers.some(m => m.manager_id === manager && m.parking_lot_id === lot);
export const managedLots = (db: PartnerData, manager: Id) => db.parking_lots.filter(l => ownsLot(db, manager, l.id));
export function requireLot(db: PartnerData, manager: Id, lot: Id) {
  if (!ownsLot(db, manager, lot)) throw new Error('Bạn không được phân công quản lý bãi này.');
  const result = db.parking_lots.find(l => l.id === lot);
  if (!result) throw new Error('Không tìm thấy bãi.');
  return result;
}
export function summarize(db: PartnerData, lotId: Id) {
  const slots = db.slots.filter(s => s.parking_lot_id === lotId);
  const active = slots.filter(s => s.is_active);
  const reservations = db.reservations.filter(r => r.parking_lot_id === lotId);
  const ids = new Set(reservations.map(r => r.id));
  const payments = db.payments.filter(p => ids.has(p.reservation_id));
  const collected = payments.filter(p => p.status === 'success' && p.payment_type !== 'refund').reduce((n, p) => n + p.amount, 0);
  const refunds = payments.filter(p => p.status === 'success' && p.payment_type === 'refund').reduce((n, p) => n + p.amount, 0);
  return { registered: slots.length, active: active.length, available: active.filter(s => s.status === 'available').length, holding: active.filter(s => s.status === 'holding').length, occupied: active.filter(s => s.status === 'occupied').length, unavailable: slots.filter(s => !s.is_active || s.status === 'unavailable').length, reservations, payments, collected, refunds, net: collected - refunds, sessions: db.parking_sessions.filter(s => ids.has(s.reservation_id)) };
}
function logged(db: PartnerData, manager: Id, lot: Id, action: ManagerAction, entity: string, id: Id, before: unknown, after: unknown, note: string, now: string): PartnerData {
  return { ...db, audit_logs: [{ id: nextId(db.audit_logs), user_id: manager, parking_lot_id: lot, action, entity_type: entity, entity_id: id, old_value: before, new_value: after, note, created_at: now }, ...db.audit_logs], manager_history: [{ id: nextId(db.manager_history), manager_id: manager, parking_lot_id: lot, action_type: action, old_value: before, new_value: after, note, created_at: now }, ...db.manager_history] };
}
function text(value: string, max: number, field: string) {
  const clean = value.trim();
  if (!clean || clean.length > max) throw new Error(`${field} cần từ 1 đến ${max} ký tự.`);
  return clean;
}
const validTime = (value: string | null) => value === null || /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
const validDate = (value: string | null) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export type LotInput = Pick<ParkingLot, 'name' | 'address' | 'latitude' | 'longitude' | 'description' | 'open_time' | 'close_time' | 'capacity'> & { vehicle_types: VehicleType[] };
export function saveLot(db: PartnerData, manager: Id, input: LotInput, id?: Id, now = new Date().toISOString()): PartnerData {
  if (!db.users.some(u => u.id === manager && u.role === 'manager' && u.status === 'active')) throw new Error('Tài khoản quản lý không hoạt động.');
  const previous = id ? requireLot(db, manager, id) : null;
  const name = text(input.name, 150, 'Tên bãi'), address = text(input.address, 255, 'Địa chỉ');
  if (!Number.isInteger(input.capacity) || input.capacity < 0 || input.capacity > 2147483647) throw new Error('Sức chứa phải là số nguyên không âm.');
  if (id && input.capacity < db.slots.filter(s => s.parking_lot_id === id).length) throw new Error('Sức chứa không được thấp hơn số ô đã khai báo.');
  if (!validTime(input.open_time) || !validTime(input.close_time)) throw new Error('Giờ mở / đóng cửa không hợp lệ.');
  if (input.latitude !== null && (!Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90) || input.longitude !== null && (!Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180)) throw new Error('Tọa độ không hợp lệ.');
  if (!input.vehicle_types.length || input.vehicle_types.some(v => !vehicleTypes.includes(v))) throw new Error('Chọn loại xe Sedan, SUV hoặc EV.');
  const lotId = id ?? nextId(db.parking_lots);
  const { vehicle_types, ...fields } = input;
  const row: ParkingLot = { ...(previous ?? { id: lotId, status: 'pending', approved_by: null, approved_at: null, created_at: now }), ...fields, name, address, updated_at: now };
  let seq = BigInt(nextId(db.parking_lot_vehicle_types));
  const result = { ...db, parking_lots: previous ? db.parking_lots.map(l => l.id === lotId ? row : l) : [...db.parking_lots, row], parking_lot_vehicle_types: [...db.parking_lot_vehicle_types.filter(v => v.parking_lot_id !== lotId), ...[...new Set(vehicle_types)].map(vehicle_type => ({ id: String(seq++), parking_lot_id: lotId, vehicle_type }))], parking_lot_managers: previous ? db.parking_lot_managers : [...db.parking_lot_managers, { id: nextId(db.parking_lot_managers), parking_lot_id: lotId, manager_id: manager, assigned_at: now }] };
  return logged(result, manager, lotId, previous ? 'lot_updated' : 'lot_created', 'parking_lots', lotId, previous, row, previous ? 'Cập nhật thông tin bãi' : 'Đăng ký bãi chờ Admin duyệt', now);
}
export function toggleLot(db: PartnerData, manager: Id, lotId: Id, now = new Date().toISOString()) {
  const lot = requireLot(db, manager, lotId);
  if (!['active', 'inactive'].includes(lot.status) || !lot.approved_at) throw new Error('Chỉ có thể tạm ngưng / mở lại bãi đã được duyệt.');
  const after = { ...lot, status: (lot.status === 'active' ? 'inactive' : 'active') as LotStatus, updated_at: now };
  return logged({ ...db, parking_lots: db.parking_lots.map(l => l.id === lotId ? after : l) }, manager, lotId, 'lot_updated', 'parking_lots', lotId, lot, after, 'Thay đổi trạng thái khai thác', now);
}
export type SlotInput = Pick<Slot, 'parking_lot_id' | 'code' | 'row_index' | 'col_index' | 'slot_type' | 'status' | 'is_active'>;
export function saveSlot(db: PartnerData, manager: Id, input: SlotInput, id?: Id, now = new Date().toISOString()) {
  const lot = requireLot(db, manager, input.parking_lot_id);
  const previous = id ? db.slots.find(s => s.id === id && s.parking_lot_id === lot.id) : null;
  if (id && !previous) throw new Error('Không tìm thấy ô trong bãi.');
  if (previous && (['holding', 'occupied'].includes(previous.status) || db.reservations.some(r => r.slot_id === id && ['holding', 'paid', 'entered'].includes(r.status)))) throw new Error('Ô đang có xe hoặc reservation chưa kết thúc; không thể sửa.');
  const code = text(input.code, 10, 'Mã ô');
  if (![input.row_index, input.col_index].every(n => Number.isInteger(n) && n >= 0 && n <= 1000)) throw new Error('Hàng / cột phải là số nguyên từ 0 đến 1.000.');
  if (!slotTypes.includes(input.slot_type) || !['available', 'unavailable'].includes(input.status)) throw new Error('Chỉ cấu hình ô trống hoặc không khả dụng.');
  if (db.slots.some(s => s.parking_lot_id === lot.id && s.id !== id && (s.code === code || s.row_index === input.row_index && s.col_index === input.col_index))) throw new Error('Mã ô hoặc tọa độ đã tồn tại trong bãi.');
  if (!id && db.slots.filter(s => s.parking_lot_id === lot.id).length >= lot.capacity) throw new Error('Số ô đã đạt sức chứa khai báo.');
  const row: Slot = { ...input, id: id ?? nextId(db.slots), code, created_at: previous?.created_at ?? now, updated_at: now };
  return logged({ ...db, slots: previous ? db.slots.map(s => s.id === id ? row : s) : [...db.slots, row] }, manager, lot.id, 'slot_updated', 'slots', row.id, previous, row, 'Cấu hình mã, tọa độ, loại và tình trạng ô', now);
}
export type PricingInput = Pick<PricingRule, 'parking_lot_id' | 'name' | 'start_time' | 'end_time' | 'hourly_rate' | 'surcharge' | 'effective_from' | 'effective_to'>;
export function savePricing(db: PartnerData, manager: Id, input: PricingInput, id?: Id, now = new Date().toISOString()) {
  requireLot(db, manager, input.parking_lot_id);
  const previous = id ? db.pricing_rules.find(p => p.id === id && p.parking_lot_id === input.parking_lot_id) : null;
  if (id && !previous) throw new Error('Không tìm thấy quy tắc giá trong bãi.');
  if (input.name !== null && input.name.length > 100 || !validTime(input.start_time) || !validTime(input.end_time)) throw new Error('Tên tối đa 100 ký tự; giờ phải hợp lệ.');
  if (![input.hourly_rate, input.surcharge].every(n => Number.isFinite(n) && n >= 0 && n <= 9999999999.99 && Math.abs(n * 100 - Math.round(n * 100)) < .001)) throw new Error('Giá và phụ thu phải không âm, tối đa 2 chữ số thập phân.');
  if (!validDate(input.effective_from) || !validDate(input.effective_to) || input.effective_from && input.effective_to && input.effective_from > input.effective_to) throw new Error('Khoảng ngày hiệu lực không hợp lệ.');
  const row: PricingRule = { ...input, id: id ?? nextId(db.pricing_rules), created_at: previous?.created_at ?? now, updated_at: now };
  return logged({ ...db, pricing_rules: previous ? db.pricing_rules.map(p => p.id === id ? row : p) : [...db.pricing_rules, row] }, manager, input.parking_lot_id, 'pricing_updated', 'pricing_rules', row.id, previous, row, 'Cập nhật quy tắc giá dùng chung cho bãi', now);
}
export function cancelHolding(db: PartnerData, manager: Id, reservationId: Id, reason: string, now = new Date().toISOString()) {
  const r = db.reservations.find(r => r.id === reservationId);
  if (!r) throw new Error('Không tìm thấy đặt chỗ.');
  requireLot(db, manager, r.parking_lot_id);
  if (r.status !== 'holding') throw new Error('Chỉ hủy giữ chỗ chưa cọc. Đơn đã cọc cần quy trình hoàn tiền từ backend.');
  const cancel_reason = text(reason, 255, 'Lý do');
  const slot = db.slots.find(s => s.id === r.slot_id);
  if (!slot || slot.status !== 'holding' || db.reservations.some(other => other.id !== r.id && other.slot_id === r.slot_id && ['holding', 'paid', 'entered'].includes(other.status))) throw new Error('Trạng thái ô / reservation không nhất quán; cần kiểm tra trước khi hủy.');
  const after = { ...r, status: 'cancelled' as const, cancelled_at: now, cancel_reason, updated_at: now };
  return logged({ ...db, reservations: db.reservations.map(item => item.id === r.id ? after : item), slots: db.slots.map(s => s.id === r.slot_id ? { ...s, status: 'available', updated_at: now } : s) }, manager, r.parking_lot_id, 'reservation_cancelled', 'reservations', r.id, r, after, cancel_reason, now);
}
export function updateProfile(db: PartnerData, manager: Id, fullName: string, phone: string) {
  const full_name = text(fullName, 100, 'Họ tên');
  const cleanPhone = phone.trim() || null;
  if (cleanPhone && (cleanPhone.length > 20 || !/^\+?[\d ()-]+$/.test(cleanPhone))) throw new Error('Số điện thoại không hợp lệ hoặc vượt 20 ký tự.');
  if (cleanPhone && db.users.some(u => u.id !== manager && u.phone === cleanPhone)) throw new Error('Số điện thoại đã được tài khoản khác sử dụng.');
  return { ...db, users: db.users.map(u => u.id === manager ? { ...u, full_name, phone: cleanPhone, updated_at: new Date().toISOString() } : u) };
}
export function consistencyWarnings(db: PartnerData, lotId: Id) {
  const warnings: string[] = [];
  for (const r of db.reservations.filter(r => r.parking_lot_id === lotId && ['holding', 'paid', 'entered'].includes(r.status))) {
    const s = db.slots.find(s => s.id === r.slot_id);
    const expected = r.status === 'entered' ? 'occupied' : 'holding';
    if (!s || s.parking_lot_id !== lotId || s.status !== expected || !s.is_active) warnings.push(`Reservation #${r.id}: ${r.status} nhưng ô ${s?.code ?? r.slot_id} là ${s?.status ?? 'không tồn tại'} (cần ${expected}).`);
    if (r.status === 'entered' && !db.parking_sessions.some(s => s.reservation_id === r.id && s.status === 'active')) warnings.push(`Reservation #${r.id} đã vào bãi nhưng thiếu parking_session active.`);
  }
  return warnings;
}
// Preview-only transitions. A production scan must verify the signed QR on the server.
export function previewGateIn(db: PartnerData, manager: Id, id: Id, now = new Date().toISOString()): PartnerData {
  const r = db.reservations.find(r => r.id === id);
  if (!r) throw new Error('Không tìm thấy đặt chỗ.');
  const lot = requireLot(db, manager, r.parking_lot_id);
  if (lot.status !== 'active' || r.status !== 'paid') throw new Error('Chỉ nhận xe cho bãi active và đặt chỗ paid.');
  const qr = db.qr_tickets.find(q => q.reservation_id === id);
  if (!qr || qr.status !== 'active' || Date.parse(qr.expires_at) <= Date.parse(now)) throw new Error('Vé QR chưa có, đã dùng hoặc hết hạn.');
  if (r.arrival_expires_at && Date.parse(r.arrival_expires_at) <= Date.parse(now)) throw new Error('Đã quá hạn đến bãi.');
  const slot = db.slots.find(s => s.id === r.slot_id && s.parking_lot_id === lot.id);
  if (!slot || !slot.is_active || slot.status !== 'holding' || db.reservations.some(other => other.id !== id && other.slot_id === slot.id && ['holding', 'paid', 'entered'].includes(other.status))) throw new Error('Ô đỗ không ở trạng thái holding hợp lệ cho đơn này.');
  if (db.parking_sessions.some(s => s.reservation_id === id)) throw new Error('Đặt chỗ đã có phiên đỗ; không tạo trùng phiên.');
  const session: ParkingSession = { id: nextId(db.parking_sessions), reservation_id: id, check_in_at: now, check_out_at: null, checked_in_by: manager, checked_out_by: null, final_amount: null, status: 'active', created_at: now, updated_at: now };
  const after = { ...r, status: 'entered' as const, updated_at: now };
  return { ...db, reservations: db.reservations.map(row => row.id === id ? after : row), slots: db.slots.map(s => s.id === slot.id ? { ...s, status: 'occupied', updated_at: now } : s), qr_tickets: db.qr_tickets.map(q => q.id === qr.id ? { ...q, status: 'used', used_at: now } : q), parking_sessions: [...db.parking_sessions, session], audit_logs: [{ id: nextId(db.audit_logs), user_id: manager, parking_lot_id: lot.id, action: 'CHECK_IN', entity_type: 'parking_sessions', entity_id: session.id, old_value: null, new_value: session, note: 'Ghi nhận xe vào trong bản xem thử', created_at: now }, ...db.audit_logs] };
}
export function previewGateOut(db: PartnerData, manager: Id, id: Id, finalAmount: number, now = new Date().toISOString()): PartnerData {
  const r = db.reservations.find(r => r.id === id);
  if (!r) throw new Error('Không tìm thấy đặt chỗ.');
  requireLot(db, manager, r.parking_lot_id);
  const session = db.parking_sessions.find(s => s.reservation_id === id && s.status === 'active');
  const slot = db.slots.find(s => s.id === r.slot_id && s.parking_lot_id === r.parking_lot_id);
  if (r.status !== 'entered' || !session || !slot || slot.status !== 'occupied') throw new Error('Chỉ trả xe cho đặt chỗ entered có phiên active và ô occupied.');
  if (!Number.isFinite(finalAmount) || finalAmount < 0 || finalAmount > 9999999999.99 || Math.abs(finalAmount * 100 - Math.round(finalAmount * 100)) > .001) throw new Error('Tổng tiền phải không âm, tối đa 2 chữ số thập phân.');
  const paid = db.payments.filter(p => p.reservation_id === id && p.status === 'success').reduce((sum, p) => sum + (p.payment_type === 'refund' ? -p.amount : p.amount), 0);
  if (paid < finalAmount) throw new Error(`Còn thiếu ${money(finalAmount - paid)}; cần xác nhận thanh toán trước khi trả xe.`);
  if (!session.check_in_at || Date.parse(now) < Date.parse(session.check_in_at)) throw new Error('Thời gian ra không được trước thời gian vào.');
  const after: ParkingSession = { ...session, check_out_at: now, checked_out_by: manager, final_amount: finalAmount, status: 'completed', updated_at: now };
  return { ...db, reservations: db.reservations.map(row => row.id === id ? { ...row, status: 'completed', total_amount: finalAmount, updated_at: now } : row), slots: db.slots.map(s => s.id === slot.id ? { ...s, status: 'available', updated_at: now } : s), parking_sessions: db.parking_sessions.map(s => s.id === session.id ? after : s), audit_logs: [{ id: nextId(db.audit_logs), user_id: manager, parking_lot_id: r.parking_lot_id, action: 'CHECK_OUT', entity_type: 'parking_sessions', entity_id: session.id, old_value: session, new_value: after, note: 'Ghi nhận xe ra trong bản xem thử; không tạo thêm giao dịch tiền', created_at: now }, ...db.audit_logs] };
}
export function csv(rows: unknown[][]) {
  const cell = (value: unknown) => { const str = value === null || value === undefined ? '' : String(value); return `"${(/^[=+@\-\t\r]/.test(str) ? "'" : '') + str.replaceAll('"', '""')}"`; };
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
