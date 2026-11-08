/* =============================================================
   EZ-SPACE ADMIN - js/actions/export.js
   Xuất dữ liệu trang hiện tại ra file CSV (UTF-8 BOM)
   ============================================================= */
'use strict';

function csv(rows, filename) {
  const safe = v => {
    let str = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
    return '"' + str.replaceAll('"', '""') + '"';
  };
  const csvString = '\ufeff' + rows.map(r => r.map(safe).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csvString], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportNow() {
  if (!lastData) return;
  let arr = [];
  if (PAGE === 'records') {
    const rows = lastData[tab] || [];
    const fields = rows.length ? Object.keys(rows[0]) : [];
    arr = [fields, ...rows.map(x => fields.map(k => x[k]))];
  } else if (PAGE === 'lots') {
    arr = [
      ['ID', 'Tên bãi', 'Địa chỉ', 'Trạng thái', 'Sức chứa', 'Tổng ô', 'Ô trống', 'Ô đang đỗ', 'Ô giữ chỗ', 'Quản lý', 'Người duyệt', 'Giá từ'],
      ...lastData.items.map(x => [
        x.id, x.name, x.address, LOT[x.status] || x.status, x.capacity,
        x.slot_total, x.slot_available, x.slot_occupied, x.slot_holding,
        x.managers, x.approver_name, x.min_rate
      ])
    ];
  } else if (PAGE === 'users') {
    arr = [
      ['ID', 'Họ tên', 'Email', 'Điện thoại', 'Vai trò', 'Trạng thái', 'Số xe', 'Số đơn', 'Bãi quản lý', 'Ngày tạo'],
      ...lastData.items.map(x => [
        x.id, x.full_name, x.email, x.phone, ROLE[x.role] || x.role,
        USER[x.status] || x.status, x.vehicles, x.reservations, x.lots, x.created_at
      ])
    ];
  } else if (PAGE === 'revenue') {
    arr = [
      ['ID thanh toán', 'Mã đơn', 'Khách hàng', 'Biển số', 'Bãi đỗ', 'Cổng', 'Loại', 'Số tiền', 'Trạng thái', 'Thời gian'],
      ...lastData.recent.map(x => [
        x.id, x.reservation_id, x.customer, x.license_plate, x.lot_name,
        x.provider, x.payment_type, x.amount, x.status, x.paid_at
      ])
    ];
  } else if (PAGE === 'logs') {
    arr = [
      ['Nguồn', 'ID', 'Thời gian', 'Sự kiện', 'Tác nhân', 'Đối tượng', 'Bãi đỗ', 'Ghi chú'],
      ...(window.liveLogs || []).map(x => [
        x.source, x.id, x.created_at, x.action, x.actor,
        (x.entity_type || '') + '#' + (x.entity_id || ''), x.lot_name, x.note
      ])
    ];
  }
  if (!arr.length) return;
  csv(arr, `ezspace_${PAGE}_${new Date().toISOString().slice(0, 10)}.csv`);
  notice('Đã xuất báo cáo CSV thành công.');
}
