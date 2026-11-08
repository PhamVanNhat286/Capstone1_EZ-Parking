/* =============================================================
   EZ-SPACE ADMIN - js/actions/lot-detail.js
   Xem chi tiết bãi đỗ xe, sơ đồ ma trận 2D (row_index, col_index) & bảng giá
   ============================================================= */
'use strict';

async function lotDetail(id) {
  const d = await api('lot', 'GET', undefined, { id });
  const x = d.lot;
  const types = d.vehicles.map(v => v.vehicle_type).join(', ') || 'Chưa cấu hình';
  const maxCol = d.slots.reduce((m, s) => Math.max(m, n(s.col_index) + 1), 5);

  const slotsHtml = d.slots
    .map(s => {
      const stClass = !s.is_active ? 'unavailable' : e(s.status);
      const stLabel = !s.is_active ? 'Ngưng hoạt động' : (SLOT_STATUS[s.status] || s.status);
      const typeLabel = SLOT_TYPE[s.slot_type] || s.slot_type;
      return `<div title="Ô ${e(s.code)} (Hàng ${n(s.row_index) + 1}, Cột ${n(s.col_index) + 1}) - ${e(typeLabel)} - ${e(stLabel)}" class="slot ${stClass}">
        <span>${e(s.code)}</span>
        <small>${e(typeLabel)}</small>
      </div>`;
    })
    .join('');

  const prices = d.pricing.map(p => `
    <tr>
      <td><b>${e(p.name || 'Khung giờ')}</b></td>
      <td>${timeOnly(p.start_time)} – ${timeOnly(p.end_time)}</td>
      <td><b>${money(p.hourly_rate)}</b></td>
      <td>${money(p.surcharge)}</td>
      <td>${e(p.effective_from || '—')} → ${e(p.effective_to || '—')}</td>
    </tr>
  `);

  const resSummary =
    d.reservations.map(r => `${RES[r.status] || r.status}: ${nf(r.amount)}`).join(' · ') || 'Chưa có đơn đặt chỗ';

  modal(
    `Chi tiết bãi đỗ: ${x.name}`,
    `<div class="lot-meta-grid">
      <div>
        <p><b>Mã bãi:</b> #${n(x.id)} · ${pill(x.status, LOT[x.status])}</p>
        <p><b>Địa chỉ:</b> ${e(x.address)}</p>
        <p><b>Mô tả:</b> ${e(x.description || '—')}</p>
        <p><b>Tọa độ GPS:</b> ${e(x.latitude || '—')}, ${e(x.longitude || '—')}</p>
        <p><b>Giờ mở cửa:</b> ${timeOnly(x.open_time)} – ${timeOnly(x.close_time)}</p>
      </div>
      <div>
        <p><b>Chủ bãi / Quản lý:</b> ${e(d.managers.map(m => `${m.full_name} (${m.phone || m.email})`).join(', ') || 'Chưa phân công')}</p>
        <p><b>Sức chứa khai báo:</b> ${nf(x.capacity)} chỗ · <b>Ô trên sơ đồ 2D:</b> ${nf(d.slots.length)} ô</p>
        <p><b>Loại xe hỗ trợ:</b> ${e(types)}</p>
        <p><b>Phê duyệt bởi:</b> ${e(x.approver_name || '—')} (${dt(x.approved_at)})</p>
        <p><b>Thống kê đơn:</b> ${e(resSummary)}</p>
      </div>
    </div>
    <h3>Sơ đồ ma trận ô đỗ 2D (${nf(d.slots.length)} ô)</h3>
    <div class="slot-grid" style="--cols:${maxCol}">${slotsHtml || '<span>Chưa thiết lập sơ đồ ô đỗ</span>'}</div>
    <div class="slot-legend">
      <span><i style="background:#22c55e"></i> Trống (available)</span>
      <span><i style="background:#facc15"></i> Đang giữ chỗ (holding)</span>
      <span><i style="background:#ef4444"></i> Đã có xe đỗ (occupied)</span>
      <span><i style="background:#94a3b8"></i> Ngưng sử dụng (unavailable)</span>
    </div>
    <h3>Bảng giá theo khung giờ (${nf(d.pricing.length)} quy tắc)</h3>
    ${table(['Tên quy tắc giá', 'Khung giờ', 'Giá / giờ', 'Phụ phí', 'Hiệu lực'], prices, 'Chưa cấu hình quy tắc giá')}`
  );
}
