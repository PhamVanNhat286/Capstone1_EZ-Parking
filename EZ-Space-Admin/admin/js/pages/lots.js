/* =============================================================
   EZ-SPACE ADMIN - js/pages/lots.js
   Trang Quản lý & Phê duyệt bãi đỗ (Lot Operations)
   ============================================================= */
'use strict';

function lotButtons(x) {
  let b = actionButton('lot-detail', x.id, 'Chi tiết');
  if (x.status === 'pending') {
    b += ' ' + actionButton('lot-approve', x.id, 'Duyệt', 'btn-ok') + ' ' + actionButton('lot-reject', x.id, 'Từ chối', 'btn-danger');
  }
  if (x.status === 'active') {
    b += ' ' + actionButton('lot-suspend', x.id, 'Tạm ngừng', 'btn-danger');
  }
  if (x.status === 'inactive') {
    b += ' ' + actionButton('lot-activate', x.id, 'Kích hoạt', 'btn-ok');
  }
  if (x.status === 'rejected' || x.status === 'inactive') {
    b += ' ' + actionButton('lot-reconsider', x.id, 'Thẩm định lại');
  }
  return `<div class="live-buttons">${b}</div>`;
}

function lots(d) {
  const items = d.items || [];
  const filtered = filterRows(items, 'lots');
  const count = k => items.filter(x => x.status === k).length;

  const rows = filtered.map(
    x => `<tr>
      <td>
        <b>${e(x.name)}</b>
        <div class="cell-sub mono">#${n(x.id)} · ${e(x.address)}</div>
      </td>
      <td>
        ${e(x.managers || 'Chưa phân công')}
        <div class="cell-sub">Duyệt bởi: ${e(x.approver_name || '—')}</div>
      </td>
      <td>
        <b>${nf(x.capacity)}</b> chỗ khai báo
        <div class="cell-sub">${nf(x.slot_total)} ô 2D · ${nf(x.slot_available)} trống · ${nf(x.slot_occupied)} đỗ · ${nf(x.slot_holding)} giữ</div>
      </td>
      <td>
        <b>${e(x.vehicle_types || 'Chưa cấu hình')}</b>
        <div class="cell-sub">Giá từ ${x.min_rate === null ? '—' : money(x.min_rate)}/giờ</div>
      </td>
      <td>${timeOnly(x.open_time)} – ${timeOnly(x.close_time)}</td>
      <td>${pill(x.status, LOT[x.status])}</td>
      <td>${lotButtons(x)}</td>
    </tr>`
  );

  return (
    `<div class="grid-4 live-cards">
      ${kpi('Tổng số bãi đỗ', nf(items.length), 'apartment', `Tổng sức chứa ${nf(items.reduce((s, x) => s + n(x.capacity), 0))} chỗ`)}
      ${kpi('Đang hoạt động', nf(count('active')), 'check_circle', 'Đang mở nhận đặt chỗ')}
      ${kpi('Chờ phê duyệt', nf(count('pending')), 'pending_actions', 'Cần quản trị viên thẩm định')}
      ${kpi('Tạm ngừng / Từ chối', nf(count('inactive') + count('rejected')), 'block', `${nf(count('inactive'))} tạm ngừng · ${nf(count('rejected'))} từ chối`)}
    </div>` +
    section(
      'Danh sách bãi đỗ xe trên hệ thống',
      controls([
        ['all', 'Tất cả'],
        ['pending', 'Chờ duyệt'],
        ['active', 'Hoạt động'],
        ['inactive', 'Tạm ngừng'],
        ['rejected', 'Từ chối']
      ]) +
        table(
          ['Bãi đỗ & Địa chỉ', 'Quản lý & Phê duyệt', 'Sức chứa / Sơ đồ 2D', 'Loại xe / Bảng giá', 'Giờ mở cửa', 'Trạng thái', 'Thao tác'],
          rows
        ),
      `Hiển thị ${filtered.length} trên tổng số ${items.length} bãi đỗ xe`
    )
  );
}

window.EZ_RENDER = lots;
