"use client";

import { useState } from 'react';
import { Accessibility, Car, MapPin, Search, Truck, Zap } from 'lucide-react';
import { labels, type ParkingLot, type PartnerData, type SlotType } from '@/lib/database-model';
import { getLotAvailability } from '@/lib/lot-availability';
import styles from './sql-lot-availability.module.css';

const icons = { standard: Car, large: Truck, ev_charging: Zap, disabled: Accessibility };

export default function SqlLotAvailability({ lot, db }: { lot: ParkingLot; db: PartnerData }) {
  const [type, setType] = useState<SlotType | 'all'>('all');
  const [query, setQuery] = useState('');
  const availability = getLotAvailability(db.slots, lot.id);
  const groups = availability.groups.filter(group => group.slotType !== 'disabled' || group.registered > 0);
  const visible = availability.available.filter(slot => (type === 'all' || slot.slot_type === type) && slot.code.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected = groups.find(group => group.slotType === type);

  return <div className={styles.root}>
    <header className={styles.lotInfo}>
      <span className={styles.status} data-state={lot.status}>{labels[lot.status]}</span>
      <h3>{lot.name}</h3>
      <p><MapPin size={14} aria-hidden="true" />{lot.address}</p>
      <span className={styles.hours}>Giờ hoạt động: {lot.open_time?.slice(0, 5) ?? '—'} – {lot.close_time?.slice(0, 5) ?? '—'}</span>
    </header>
    {lot.status !== 'active' && <p className={styles.warning}>Bãi chưa hoạt động. Các vị trí trống dưới đây chưa thể nhận đặt chỗ.</p>}
    <div className={styles.summary}>
      <div><strong>{availability.available.length}</strong><span>vị trí còn trống</span></div>
      <span>Trong {availability.registered} ô đã tạo</span>
    </div>
    <p className={styles.hint}>Chọn loại xe để xem số lượng và mã vị trí còn trống.</p>
    <div className={styles.types} data-count={groups.length} role="group" aria-label="Lọc ô trống theo loại xe">
      {groups.map(group => {
        const Icon = icons[group.slotType];
        return <button key={group.slotType} type="button" aria-pressed={type === group.slotType} onClick={() => setType(group.slotType)}>
          <Icon size={21} aria-hidden="true" /><b>{group.label}</b><strong>{group.slots.length}</strong><span>vị trí trống</span>
        </button>;
      })}
    </div>
    <div className={styles.listHeading}><h3>{selected ? `Ô trống ${selected.label}` : 'Tất cả vị trí còn trống'}</h3><button type="button" aria-pressed={type === 'all'} onClick={() => setType('all')}>Tất cả ({availability.available.length})</button></div>
    <label className={styles.search}><Search size={16} aria-hidden="true" /><input type="search" aria-label="Tìm mã ô trống" placeholder="Tìm vị trí, ví dụ A-01…" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <p className={styles.result} role="status">Hiển thị {visible.length} vị trí{selected ? ` · ${selected.description}` : ''}</p>
    {visible.length ? <ul className={styles.positions} aria-label="Các vị trí còn trống">
      {visible.map(slot => {
        const group = availability.groups.find(group => group.slotType === slot.slot_type)!;
        const Icon = icons[slot.slot_type];
        return <li key={slot.id}><div><b>{slot.code}</b><span>Trống</span></div><p><Icon size={17} aria-hidden="true" />{group.label}</p><small>Hàng {slot.row_index + 1} · Cột {slot.col_index + 1}</small></li>;
      })}
    </ul> : <p className={styles.empty}>{availability.registered === 0 ? 'Bãi chưa có vị trí đỗ được tạo.' : query.trim() ? 'Không tìm thấy mã ô trống phù hợp.' : selected ? `Hiện không còn vị trí trống cho ${selected.label}.` : 'Hiện không còn vị trí trống trong bãi.'}</p>}
    <p className={styles.hint}>Chỉ hiển thị ô đang khai thác và còn trống; ô đã có xe, đang giữ chỗ hoặc ngừng sử dụng được loại khỏi danh sách.</p>
  </div>;
}
