/* =============================================================
   EZ-SPACE ADMIN - js/pages/records.js
   Trang Dữ liệu nghiệp vụ (Operational Data) - Khớp đầy đủ schema.sql
   ============================================================= */
'use strict';

const RECORD_SETS = [
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

const RECORD_LABELS = {
  id: 'ID',
  user_id: 'ID khách',
  customer: 'Khách hàng',
  owner: 'Chủ xe',
  user_name: 'Người dùng',
  lot_name: 'Bãi đỗ xe',
  parking_lot_id: 'ID bãi',
  slot_id: 'ID ô',
  slot_code: 'Mã ô',
  code: 'Mã ô',
  license_plate: 'Biển số',
  vehicle_name: 'Tên xe',
  vehicle_type: 'Loại xe',
  is_default: 'Mặc định',
  start_time: 'Bắt đầu',
  expected_end_time: 'Kết thúc dự kiến',
  hold_expires_at: 'Hạn giữ chỗ (10p)',
  arrival_expires_at: 'Hạn tới bãi (20p)',
  hourly_rate: 'Giá / giờ',
  deposit_amount: 'Tiền cọc',
  total_amount: 'Tổng tiền',
  cancelled_at: 'Hủy lúc',
  cancel_reason: 'Lý do hủy',
  created_at: 'Thời gian tạo',
  updated_at: 'Cập nhật lúc',
  row_index: 'Hàng (2D)',
  col_index: 'Cột (2D)',
  slot_type: 'Loại ô',
  status: 'Trạng thái',
  is_active: 'Kích hoạt',
  provider: 'Cổng TT',
  transaction_ref: 'Mã giao dịch',
  payment_type: 'Loại TT',
  amount: 'Số tiền',
  response_code: 'Mã phản hồi',
  ipn_received_at: 'Nhận IPN lúc',
  paid_at: 'Thanh toán lúc',
  reservation_id: 'Mã đơn',
  issued_at: 'Phát hành lúc',
  used_at: 'Quét lúc',
  expires_at: 'Hết hạn lúc',
  check_in_at: 'Giờ Check-in',
  check_out_at: 'Giờ Check-out',
  checked_in_by_name: 'NV Check-in',
  checked_out_by_name: 'NV Check-out',
  final_amount: 'Tiền tất toán',
  name: 'Tên quy tắc giá',
  end_time: 'Kết thúc',
  surcharge: 'Phụ phí',
  effective_from: 'Áp dụng từ',
  effective_to: 'Áp dụng đến',
  role: 'Vai trò',
  message: 'Nội dung tin nhắn',
  email: 'Email nhận',
  purpose: 'Mục đích OTP',
  attempts: 'Số lần thử',
  is_used: 'Đã dùng'
};

const MONEY_FIELDS = new Set([
  'hourly_rate',
  'deposit_amount',
  'total_amount',
  'amount',
  'final_amount',
  'surcharge'
]);

const TIME_FIELDS = new Set([
  'created_at',
  'updated_at',
  'start_time',
  'expected_end_time',
  'hold_expires_at',
  'arrival_expires_at',
  'cancelled_at',
  'paid_at',
  'ipn_received_at',
  'issued_at',
  'used_at',
  'expires_at',
  'check_in_at',
  'check_out_at'
]);

function formatRecordCell(kind, item, key) {
  const v = item[key];
  if (v === null || v === undefined || v === '') return '—';
  if (MONEY_FIELDS.has(key)) return `<b>${e(money(v))}</b>`;
  if (key === 'status') {
    const label =
      RES[v] ||
      LOT[v] ||
      USER[v] ||
      SLOT_STATUS[v] ||
      PAY_STATUS[v] ||
      QR_STATUS[v] ||
      SESSION_STATUS[v] ||
      v;
    return pill(v, label);
  }
  if (key === 'slot_type') return pill('brand', SLOT_TYPE[v] || v);
  if (key === 'vehicle_type') return pill('brand', v);
  if (key === 'provider') return e(PAY_PROVIDER[v] || v);
  if (key === 'payment_type') return pill(v, PAY_TYPE[v] || v);
  if (key === 'purpose') return pill('warn', OTP_PURPOSE[v] || v);
  if (key === 'role' && kind === 'chat_messages') return pill(v, CHAT_ROLE[v] || v);
  if (key === 'is_default' || key === 'is_active' || key === 'is_used') {
    return v ? pill('ok', 'Có') : pill('muted', 'Không');
  }
  if (key === 'message') return `<div class="msg-cell">${e(v)}</div>`;
  if (TIME_FIELDS.has(key) && String(v).length > 10) return dt(v);
  return e(v);
}

function records(d) {
  const tabs = RECORD_SETS.map(([k, v]) => [k, `${v} (${(d[k] || []).length})`]);
  const kind = RECORD_SETS.some(([k]) => k === tab) ? tab : 'reservations';
  const items = d[kind] || [];
  const kw = search.toLocaleLowerCase('vi-VN');
  const filtered = items.filter(
    x => !search || Object.values(x).some(v => String(v ?? '').toLocaleLowerCase('vi-VN').includes(kw))
  );

  const keys = {
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
  }[kind];

  const rows = filtered.map(
    item => `<tr>${keys.map(key => `<td>${formatRecordCell(kind, item, key)}</td>`).join('')}</tr>`
  );

  return (
    `<div class="records-kpi-grid live-cards">
      ${kpi('Đơn đặt chỗ', nf((d.reservations || []).length), 'event_available', 'Bảng reservations')}
      ${kpi('Xe cá nhân', nf((d.vehicles || []).length), 'directions_car', 'Bảng vehicles')}
      ${kpi('Ô đỗ 2D', nf((d.slots || []).length), 'local_parking', 'Bảng slots')}
      ${kpi('Thanh toán', nf((d.payments || []).length), 'payments', 'Bảng payments')}
      ${kpi('Vé QR Kiosk', nf((d.tickets || []).length), 'qr_code', 'Bảng qr_tickets')}
      ${kpi('Phiên đỗ xe', nf((d.sessions || []).length), 'schedule', 'Bảng parking_sessions')}
      ${kpi('Quy tắc giá', nf((d.pricing || []).length), 'price_change', 'Bảng pricing_rules')}
      ${kpi('Tin nhắn AI & OTP', `${nf((d.chat_messages || []).length)} / ${nf((d.otp_stats || {}).total)}`, 'info', `Chat AI & Email OTP`)}
    </div>` +
    section(
      RECORD_SETS.find(([k]) => k === kind)?.[1] || 'Dữ liệu nghiệp vụ',
      controls(tabs) + table(keys.map(k => RECORD_LABELS[k] || k), rows),
      `Hiển thị ${filtered.length} trên tổng số ${items.length} bản ghi`
    )
  );
}

window.EZ_RENDER = records;
