/* =============================================================
   EZ-SPACE ADMIN - js/pages/users.js
   Trang Quản lý người dùng hệ thống (User Management)
   ============================================================= */
'use strict';

function userButtons(x) {
  let b = actionButton('user-detail', x.id, 'Chi tiết');
  if (x.role === 'admin') {
    return `<div class="live-buttons">${b} <span class="pill brand">Bảo vệ</span></div>`;
  }
  if (x.status === 'banned') {
    b += ' ' + actionButton('user-unlock', x.id, 'Mở khóa', 'btn-ok');
  } else if (x.status === 'inactive') {
    b += ' ' + actionButton('user-unlock', x.id, 'Kích hoạt', 'btn-ok') + ' ' + actionButton('user-lock', x.id, 'Khóa', 'btn-danger');
  } else {
    b += ' ' + actionButton('user-inactive', x.id, 'Tạm ngưng') + ' ' + actionButton('user-lock', x.id, 'Khóa', 'btn-danger');
  }
  return `<div class="live-buttons">${b}</div>`;
}

function users(d) {
  const items = d.items || [];
  const filtered = filterRows(items, 'users');
  const roleCount = r => items.filter(x => x.role === r).length;

  const rows = filtered.map(
    x => `<tr>
      <td>
        <b>${e(x.full_name)}</b>
        <div class="cell-sub">#${n(x.id)} · ${e(x.email)}</div>
      </td>
      <td>${pill(x.role, ROLE[x.role] || x.role)}</td>
      <td>${e(x.phone || '—')}</td>
      <td>
        <b>${nf(x.reservations)}</b> đơn đặt chỗ · <b>${nf(x.vehicles)}</b> xe
        <div class="cell-sub">${nf(x.lots)} bãi đang quản lý</div>
      </td>
      <td>${dt(x.created_at)}</td>
      <td>${pill(x.status, USER[x.status] || x.status)}</td>
      <td>${userButtons(x)}</td>
    </tr>`
  );

  return (
    `<div class="grid-4 live-cards">
      ${kpi('Tổng tài khoản', nf(items.length), 'groups', `${nf(items.filter(x => x.status === 'active').length)} đang hoạt động`)}
      ${kpi('Khách hàng (Tài xế)', nf(roleCount('customer')), 'person', 'Tài khoản đặt chỗ đỗ xe')}
      ${kpi('Chủ bãi / Quản lý', nf(roleCount('manager')), 'store', 'Quản lý vận hành bãi xe')}
      ${kpi('Quản trị viên', nf(roleCount('admin')), 'admin_panel_settings', `${nf(items.filter(x => x.status === 'banned').length)} tài khoản đang bị khóa`)}
    </div>` +
    section(
      'Danh sách người dùng hệ thống',
      controls([
        ['all', 'Tất cả'],
        ['customer', 'Khách hàng'],
        ['manager', 'Chủ bãi'],
        ['admin', 'Quản trị viên'],
        ['inactive', 'Tạm ngưng'],
        ['banned', 'Bị khóa']
      ]) +
        table(['Họ tên & Email', 'Vai trò', 'Điện thoại', 'Hoạt động', 'Ngày đăng ký', 'Trạng thái', 'Thao tác'], rows),
      `Hiển thị ${filtered.length} trên tổng số ${items.length} tài khoản người dùng`
    )
  );
}

window.EZ_RENDER = users;
