"use client";

import { useState, type ReactNode } from 'react';
import { vehicleTypes, slotTypes, labels, type LotInput, type SlotInput, type PricingInput, type VehicleType, type SlotType, type SlotStatus } from '@/lib/database-model';
import { useSqlWorkspace } from './SqlWorkspace';
import styles from './sql-portal.module.css';

export type Editor = { kind: 'lot' | 'slot' | 'pricing' | 'profile'; id?: string };
const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
const optional = (form: FormData, name: string) => field(form, name) || null;
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className={styles.field}><span>{label}</span>{children}</label>; }

export default function SqlForm({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { db, managerId, selectedId, saveEditor, busy } = useSqlWorkspace();
  const [error, setError] = useState('');
  const lot = db.parking_lots.find(l => l.id === editor.id);
  const slot = db.slots.find(s => s.id === editor.id);
  const price = db.pricing_rules.find(p => p.id === editor.id);
  const user = db.users.find(u => u.id === managerId)!;
  const [version] = useState(() => editor.kind === 'profile' ? user.updated_at : editor.kind === 'lot' ? lot?.updated_at : editor.kind === 'slot' ? slot?.updated_at : price?.updated_at);
  const supported = db.parking_lot_vehicle_types.filter(v => v.parking_lot_id === lot?.id).map(v => v.vehicle_type);
  return <form className={styles.form} onSubmit={async e => {
    e.preventDefault(); setError('');
    const form = new FormData(e.currentTarget);
    try {
      if (editor.kind === 'lot') {
        const input: LotInput = { name: field(form, 'name'), address: field(form, 'address'), description: optional(form, 'description'), latitude: lot?.latitude ?? null, longitude: lot?.longitude ?? null, open_time: lot?.open_time ?? null, close_time: lot?.close_time ?? null, capacity: Number(field(form, 'capacity')), vehicle_types: form.getAll('vehicle_types') as VehicleType[] };
        await saveEditor(editor, { ...input, expected_updated_at: version });
      } else if (editor.kind === 'slot') {
        const input: SlotInput = { parking_lot_id: selectedId, code: field(form, 'code'), row_index: Number(field(form, 'row_index')), col_index: Number(field(form, 'col_index')), slot_type: field(form, 'slot_type') as SlotType, status: field(form, 'status') as SlotStatus, is_active: form.has('is_active') };
        await saveEditor(editor, { ...input, expected_updated_at: version });
      } else if (editor.kind === 'pricing') {
        const input: PricingInput = { parking_lot_id: selectedId, name: optional(form, 'name'), start_time: optional(form, 'start_time'), end_time: optional(form, 'end_time'), hourly_rate: Number(field(form, 'hourly_rate')), surcharge: Number(field(form, 'surcharge')), effective_from: optional(form, 'effective_from'), effective_to: optional(form, 'effective_to') };
        await saveEditor(editor, { ...input, expected_updated_at: version });
      } else await saveEditor(editor, { full_name: field(form, 'full_name'), phone: field(form, 'phone'), expected_updated_at: version });
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu dữ liệu.'); }
  }}>
    {editor.kind === 'lot' && <>
      <Field label="Tên bãi"><input name="name" required maxLength={150} defaultValue={lot?.name} /></Field>
      <Field label="Địa chỉ"><input name="address" required maxLength={255} defaultValue={lot?.address} /></Field>
      <Field label="Mô tả"><textarea name="description" rows={3} defaultValue={lot?.description ?? ''} /></Field>
      <Field label="Sức chứa khai báo"><input name="capacity" type="number" required min={0} max={2147483647} step={1} defaultValue={lot?.capacity ?? 20} /></Field>
      <fieldset className={styles.choices}><legend>Loại xe tiếp nhận</legend>{vehicleTypes.map(type => <label key={type}><input type="checkbox" name="vehicle_types" value={type} defaultChecked={supported.includes(type)} />{type}</label>)}</fieldset>
      <p className={styles.note}>{lot ? 'Trạng thái duyệt và người duyệt được giữ nguyên.' : 'Bãi mới ở trạng thái chờ Admin duyệt; chưa có ô đỗ được tạo tự động.'}</p>
    </>}
    {editor.kind === 'slot' && <>
      <Field label="Mã ô"><input name="code" maxLength={10} required defaultValue={slot?.code} placeholder="A-01" /></Field>
      <div className={styles.columns}><Field label="Hàng (bắt đầu từ 0)"><input name="row_index" type="number" required min={0} max={1000} defaultValue={slot?.row_index ?? Math.max(-1, ...db.slots.filter(s => s.parking_lot_id === selectedId).map(s => s.row_index)) + 1} /></Field><Field label="Cột (bắt đầu từ 0)"><input name="col_index" type="number" required min={0} max={1000} defaultValue={slot?.col_index ?? 0} /></Field></div>
      <Field label="Loại ô"><select name="slot_type" defaultValue={slot?.slot_type ?? 'standard'}>{slotTypes.map(type => <option value={type} key={type}>{labels[type]}</option>)}</select></Field>
      <Field label="Trạng thái"><select name="status" defaultValue={slot?.status ?? 'available'}><option value="available">Trống</option><option value="unavailable">Không khả dụng</option></select></Field>
      <label className={styles.check}><input name="is_active" type="checkbox" defaultChecked={slot?.is_active ?? true} />Đưa ô vào khai thác</label>
      <p className={styles.note}>Ô có xe hoặc còn đặt chỗ không thể sửa. Mã và tọa độ phải duy nhất trong bãi.</p>
    </>}
    {editor.kind === 'pricing' && <>
      <Field label="Tên quy tắc"><input name="name" maxLength={100} defaultValue={price?.name ?? ''} /></Field>
      <div className={styles.columns}><Field label="Từ giờ"><input name="start_time" type="time" step={1} defaultValue={price?.start_time ?? ''} /></Field><Field label="Đến giờ"><input name="end_time" type="time" step={1} defaultValue={price?.end_time ?? ''} /></Field></div>
      <div className={styles.columns}><Field label="Giá theo giờ (đ)"><input name="hourly_rate" required type="number" min={0} max={9999999999.99} step="0.01" defaultValue={price?.hourly_rate ?? 0} /></Field><Field label="Phụ thu (đ)"><input name="surcharge" required type="number" min={0} max={9999999999.99} step="0.01" defaultValue={price?.surcharge ?? 0} /></Field></div>
      <div className={styles.columns}><Field label="Hiệu lực từ"><input name="effective_from" type="date" defaultValue={price?.effective_from ?? ''} /></Field><Field label="Hiệu lực đến"><input name="effective_to" type="date" defaultValue={price?.effective_to ?? ''} /></Field></div>
      <p className={styles.note}>Giá dùng chung cho bãi và hiển thị ngay trên ứng dụng khách. Khung giờ qua đêm: đặt “Từ giờ” lớn hơn “Đến giờ” (ví dụ 22:00 → 06:00). Đặt chỗ đã tạo giữ nguyên giá đã chốt.</p>
    </>}
    {editor.kind === 'profile' && <>
      <Field label="Họ và tên"><input name="full_name" required maxLength={100} defaultValue={user.full_name} /></Field>
      <Field label="Số điện thoại"><input name="phone" maxLength={20} defaultValue={user.phone ?? ''} /></Field>
      <Field label="Email"><input readOnly value={user.email} /></Field>
      <p className={styles.note}>Vai trò và trạng thái tài khoản chỉ hiển thị, không tự thay đổi quyền truy cập.</p>
    </>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.actions}><button type="button" className={styles.secondary} onClick={onClose} disabled={busy}>Hủy</button><button className={styles.primary} type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
  </form>;
}
