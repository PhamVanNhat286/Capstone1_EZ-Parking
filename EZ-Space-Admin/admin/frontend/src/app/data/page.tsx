'use client';

import React, { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { FilterToolbar } from '@/components/FilterToolbar';
import { KpiCard } from '@/components/KpiCard';
import { ErrorCard, LoadingCard } from '@/components/PageState';
import { Pill } from '@/components/Pill';
import { SectionCard } from '@/components/SectionCard';
import { useAdmin } from '@/context/AdminContext';
import {
  CHAT_ROLE,
  LOT,
  OTP_PURPOSE,
  PAY_PROVIDER,
  PAY_STATUS,
  PAY_TYPE,
  QR_STATUS,
  RES,
  SESSION_STATUS,
  SLOT_STATUS,
  SLOT_TYPE,
  USER
} from '@/lib/constants';
import { downloadCsv } from '@/lib/csv';
import { dt, money, nf } from '@/lib/format';
import { RecordsResponse } from '@/lib/types';
import { useAdminPageData } from '@/lib/useAdminPageData';

type RecordKind =
  | 'reservations'
  | 'vehicles'
  | 'slots'
  | 'payments'
  | 'tickets'
  | 'sessions'
  | 'pricing'
  | 'chat_messages'
  | 'otps';

const RECORD_SETS: Array<[RecordKind, string]> = [
  ['reservations', 'Đơn đặt chỗ'],
  ['vehicles', 'Xe đăng ký'],
  ['slots', 'Ô đỗ 2D'],
  ['payments', 'Thanh toán'],
  ['tickets', 'Vé QR'],
  ['sessions', 'Phiên đỗ xe'],
  ['pricing', 'Quy tắc giá'],
  ['chat_messages', 'Trợ lý AI (Chat)'],
  ['otps', 'Xác thực OTP']
];

const RECORD_LABELS: Record<string, string> = {
  id: 'ID', user_id: 'ID khách', customer: 'Khách hàng', owner: 'Chủ xe',
  user_name: 'Người dùng', lot_name: 'Bãi đỗ xe', parking_lot_id: 'ID bãi',
  slot_id: 'ID ô', slot_code: 'Mã ô', code: 'Mã ô', license_plate: 'Biển số',
  vehicle_name: 'Tên xe', vehicle_type: 'Loại xe', is_default: 'Mặc định',
  start_time: 'Bắt đầu', expected_end_time: 'Kết thúc dự kiến',
  hold_expires_at: 'Hạn giữ chỗ (10p)', arrival_expires_at: 'Hạn tới bãi (20p)',
  hourly_rate: 'Giá / giờ', deposit_amount: 'Tiền cọc', total_amount: 'Tổng tiền',
  cancelled_at: 'Hủy lúc', cancel_reason: 'Lý do hủy', created_at: 'Thời gian tạo',
  updated_at: 'Cập nhật lúc', row_index: 'Hàng (2D)', col_index: 'Cột (2D)',
  slot_type: 'Loại ô', status: 'Trạng thái', is_active: 'Kích hoạt',
  provider: 'Cổng TT', transaction_ref: 'Mã giao dịch', payment_type: 'Loại TT',
  amount: 'Số tiền', response_code: 'Mã phản hồi', ipn_received_at: 'Nhận IPN lúc',
  paid_at: 'Thanh toán lúc', reservation_id: 'Mã đơn', issued_at: 'Phát hành lúc',
  used_at: 'Quét lúc', expires_at: 'Hết hạn lúc', check_in_at: 'Giờ Check-in',
  check_out_at: 'Giờ Check-out', checked_in_by_name: 'NV Check-in',
  checked_out_by_name: 'NV Check-out', final_amount: 'Tiền tất toán',
  name: 'Tên quy tắc giá', end_time: 'Kết thúc', surcharge: 'Phụ phí',
  effective_from: 'Áp dụng từ', effective_to: 'Áp dụng đến', role: 'Vai trò',
  message: 'Nội dung tin nhắn', email: 'Email nhận', purpose: 'Mục đích OTP',
  attempts: 'Số lần thử', is_used: 'Đã dùng'
};

const RECORD_COLUMNS: Record<RecordKind, string[]> = {
  reservations: [
    'id', 'customer', 'lot_name', 'slot_code', 'license_plate', 'vehicle_type',
    'status', 'start_time', 'expected_end_time', 'hold_expires_at', 'arrival_expires_at',
    'hourly_rate', 'deposit_amount', 'total_amount', 'cancel_reason', 'created_at'
  ],
  vehicles: ['id', 'owner', 'license_plate', 'vehicle_name', 'vehicle_type', 'is_default', 'created_at'],
  slots: ['id', 'lot_name', 'code', 'row_index', 'col_index', 'slot_type', 'status', 'is_active'],
  payments: [
    'id', 'reservation_id', 'customer', 'lot_name', 'provider', 'payment_type',
    'transaction_ref', 'amount', 'status', 'response_code', 'paid_at'
  ],
  tickets: ['id', 'reservation_id', 'customer', 'lot_name', 'slot_code', 'status', 'issued_at', 'used_at', 'expires_at'],
  sessions: [
    'id', 'reservation_id', 'customer', 'lot_name', 'slot_code', 'license_plate',
    'check_in_at', 'check_out_at', 'checked_in_by_name', 'checked_out_by_name', 'final_amount', 'status'
  ],
  pricing: ['id', 'lot_name', 'name', 'start_time', 'end_time', 'hourly_rate', 'surcharge', 'effective_from', 'effective_to'],
  chat_messages: ['id', 'user_name', 'role', 'message', 'created_at'],
  otps: ['id', 'email', 'purpose', 'attempts', 'is_used', 'expires_at', 'created_at']
};

const MONEY_FIELDS = new Set([
  'hourly_rate', 'deposit_amount', 'total_amount', 'amount', 'final_amount', 'surcharge'
]);

const TIME_FIELDS = new Set([
  'created_at', 'updated_at', 'start_time', 'expected_end_time', 'hold_expires_at',
  'arrival_expires_at', 'cancelled_at', 'paid_at', 'ipn_received_at', 'issued_at',
  'used_at', 'expires_at', 'check_in_at', 'check_out_at'
]);

function renderRecordCell(
  kind: RecordKind,
  item: Record<string, unknown>,
  key: string
): React.ReactNode {
  const v = item[key];
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  if (MONEY_FIELDS.has(key)) return <b>{money(v)}</b>;
  if (key === 'status') {
    const label =
      RES[s] || LOT[s] || USER[s] || SLOT_STATUS[s] || PAY_STATUS[s] || QR_STATUS[s] || SESSION_STATUS[s] || s;
    return <Pill tone={s} label={label} />;
  }
  if (key === 'slot_type') return <Pill tone="brand" label={SLOT_TYPE[s] || s} />;
  if (key === 'vehicle_type') return <Pill tone="brand" label={s} />;
  if (key === 'provider') return PAY_PROVIDER[s] || s;
  if (key === 'payment_type') return <Pill tone={s} label={PAY_TYPE[s] || s} />;
  if (key === 'purpose') return <Pill tone="warn" label={OTP_PURPOSE[s] || s} />;
  if (key === 'role' && kind === 'chat_messages') return <Pill tone={s} label={CHAT_ROLE[s] || s} />;
  if (key === 'is_default' || key === 'is_active' || key === 'is_used') {
    return v ? <Pill tone="ok" label="Có" /> : <Pill tone="muted" label="Không" />;
  }
  if (key === 'message') return <div className="max-w-[380px] whitespace-normal leading-normal">{s}</div>;
  if (TIME_FIELDS.has(key) && s.length > 10) return dt(s);
  return s;
}

export default function DataPage() {
  const { notice } = useAdmin();
  const { data, loadError, reload } = useAdminPageData<RecordsResponse>(
    'records',
    'Không thể tải dữ liệu nghiệp vụ.'
  );

  const [tab, setTab] = useState<RecordKind>('reservations');
  const [search, setSearch] = useState('');

  const items = useMemo(
    () => (data?.[tab] as Array<Record<string, unknown>> | undefined) || [],
    [data, tab]
  );

  const filtered = useMemo(() => {
    const kw = search.toLocaleLowerCase('vi-VN');
    return items.filter(
      x =>
        !search ||
        Object.values(x).some(v => String(v ?? '').toLocaleLowerCase('vi-VN').includes(kw))
    );
  }, [items, search]);

  function handleExport() {
    const fields = filtered.length ? Object.keys(filtered[0]) : Object.keys(items[0] || {});
    if (!fields.length) return;
    downloadCsv(
      [fields, ...filtered.map(x => fields.map(k => x[k]))],
      `ezspace_records_${new Date().toISOString().slice(0, 10)}.csv`
    );
    notice('Đã xuất báo cáo CSV thành công.');
  }

  if (!data) {
    if (loadError) return <ErrorCard message={loadError} onRetry={() => void reload(true)} />;
    return <LoadingCard />;
  }

  const tabs: Array<[string, string]> = RECORD_SETS.map(([k, label]) => [
    k,
    `${label} (${((data[k] as unknown[] | undefined) || []).length})`
  ]);
  const cols = RECORD_COLUMNS[tab];
  const sectionTitle = RECORD_SETS.find(([k]) => k === tab)?.[1] || 'Dữ liệu nghiệp vụ';

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Đơn đặt chỗ" value={nf((data.reservations || []).length)} icon="event_available" sub="Bảng reservations" />
        <KpiCard label="Xe cá nhân" value={nf((data.vehicles || []).length)} icon="directions_car" sub="Bảng vehicles" />
        <KpiCard label="Ô đỗ 2D" value={nf((data.slots || []).length)} icon="local_parking" sub="Bảng slots" />
        <KpiCard label="Thanh toán" value={nf((data.payments || []).length)} icon="payments" sub="Bảng payments" />
        <KpiCard label="Vé QR Kiosk" value={nf((data.tickets || []).length)} icon="qr_code" sub="Bảng qr_tickets" />
        <KpiCard label="Phiên đỗ xe" value={nf((data.sessions || []).length)} icon="schedule" sub="Bảng parking_sessions" />
        <KpiCard label="Quy tắc giá" value={nf((data.pricing || []).length)} icon="price_change" sub="Bảng pricing_rules" />
        <KpiCard
          label="Tin nhắn AI & OTP"
          value={`${nf((data.chat_messages || []).length)} / ${nf(data.otp_stats?.total)}`}
          icon="info"
          sub="Chat AI & Email OTP"
        />
      </div>

      <SectionCard
        title={sectionTitle}
        subtitle={`Hiển thị ${filtered.length} trên tổng số ${items.length} bản ghi`}
      >
        <FilterToolbar
          tabs={tabs}
          activeTab={tab}
          onTabChange={k => setTab(k as RecordKind)}
          search={search}
          onSearchChange={setSearch}
          onExport={handleExport}
        />

        <DataTable headers={cols.map(k => RECORD_LABELS[k] || k)} hasRows={filtered.length > 0}>
          {filtered.map((item, idx) => (
            <tr key={String(item.id ?? idx)}>
              {cols.map(key => (
                <td key={key}>{renderRecordCell(tab, item, key)}</td>
              ))}
            </tr>
          ))}
        </DataTable>
      </SectionCard>
    </>
  );
}
