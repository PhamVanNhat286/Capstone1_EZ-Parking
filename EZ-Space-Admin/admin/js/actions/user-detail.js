/* =============================================================
   EZ-SPACE ADMIN - js/actions/user-detail.js
   Xem hồ sơ người dùng, danh sách xe cá nhân, bãi phụ trách & đơn đặt chỗ
   ============================================================= */
'use strict';

async function userDetail(id) {
  const d = await api('user', 'GET', undefined, { id });
  const u = d.user;

  const vehRows = d.vehicles.map(v => `
    <tr>
      <td class="mono"><b>${e(v.license_plate)}</b></td>
      <td>${e(v.vehicle_name || '—')}</td>
      <td>${pill('brand', v.vehicle_type)}</td>
      <td>${v.is_default ? pill('active', 'Mặc định') : '<span class="muted">Phụ</span>'}</td>
      <td>${dt(v.created_at)}</td>
    </tr>
  `);

  const lotRows = d.lots.map(l => `
    <tr>
      <td><b>${e(l.name)}</b><div class="cell-sub">#${n(l.id)} · ${e(l.address)}</div></td>
      <td>${nf(l.capacity)} chỗ</td>
      <td>${pill(l.status, LOT[l.status] || l.status)}</td>
      <td>${dt(l.assigned_at)}</td>
    </tr>
  `);

  const resRows = d.reservations.map(r => `
    <tr>
      <td class="mono">#${n(r.id)}</td>
      <td><b>${e(r.lot_name)}</b><div class="cell-sub">Ô ${e(r.slot_code)}</div></td>
      <td>${e(r.license_plate)} (${e(r.vehicle_type)})</td>
      <td>${pill(r.status, RES[r.status] || r.status)}</td>
      <td>${money(r.deposit_amount)}</td>
      <td>${r.total_amount ? money(r.total_amount) : '—'}</td>
      <td>${dt(r.created_at)}</td>
    </tr>
  `);

  modal(
    `Hồ sơ người dùng: ${u.full_name}`,
    `<div class="user-detail-grid">
      <div>
        <p><b>ID tài khoản:</b> #${n(u.id)}</p>
        <p><b>Họ và tên:</b> ${e(u.full_name)}</p>
        <p><b>Email:</b> ${e(u.email)}</p>
        <p><b>Số điện thoại:</b> ${e(u.phone || '—')}</p>
      </div>
      <div>
        <p><b>Vai trò:</b> ${pill(u.role, ROLE[u.role] || u.role)}</p>
        <p><b>Trạng thái:</b> ${pill(u.status, USER[u.status] || u.status)}</p>
        <p><b>Ngày đăng ký:</b> ${dt(u.created_at)}</p>
        <p><b>Tin nhắn Trợ lý AI:</b> ${nf(d.chat_count)} tin nhắn</p>
      </div>
    </div>
    ${d.lots.length ? `<h3>Bãi đỗ xe đang quản lý (${nf(d.lots.length)})</h3>${table(['Bãi đỗ & Địa chỉ', 'Sức chứa', 'Trạng thái', 'Phân công lúc'], lotRows)}` : ''}
    <h3>Phương tiện cá nhân đã đăng ký (${nf(d.vehicles.length)})</h3>
    ${table(['Biển số xe', 'Tên hiển thị', 'Loại xe', 'Mặc định', 'Ngày thêm'], vehRows, 'Người dùng chưa đăng ký phương tiện')}
    <h3>Lịch sử đặt chỗ gần đây (${nf(d.reservations.length)})</h3>
    ${table(['Mã đơn', 'Bãi / Ô đỗ', 'Phương tiện', 'Trạng thái', 'Tiền cọc', 'Tổng tiền', 'Thời gian tạo'], resRows, 'Chưa có lịch sử đặt chỗ')}`
  );
}

