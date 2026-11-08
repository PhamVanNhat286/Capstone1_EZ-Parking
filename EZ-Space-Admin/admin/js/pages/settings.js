/* =============================================================
   EZ-SPACE ADMIN - js/pages/settings.js
   Trang Cài đặt nền tảng (Platform Settings)
   ============================================================= */
'use strict';

function settings(d) {
  const rulesHtml = (d.rules || [])
    .map(
      r => `<div class="setting-rule-card">
        <div class="rule-head">
          <b>${e(r.name)}</b>
          <span class="pill brand mono">${e(r.code)}</span>
        </div>
        <div class="rule-val">${e(r.value)}</div>
        <p>${e(r.desc)}</p>
      </div>`
    )
    .join('');

  const pricingRows = (d.pricing || []).map(
    p => `<tr>
      <td><b>${e(p.lot_name)}</b><div class="cell-sub mono">Bãi #${n(p.parking_lot_id)}</div></td>
      <td><b>${e(p.name || 'Khung giờ tiêu chuẩn')}</b></td>
      <td>${timeOnly(p.start_time)} – ${timeOnly(p.end_time)}</td>
      <td><b>${money(p.hourly_rate)}</b></td>
      <td>${money(p.surcharge)}</td>
      <td>${e(p.effective_from || '—')} → ${e(p.effective_to || '—')}</td>
    </tr>`
  );

  const mgrRows = (d.managers || []).map(
    m => `<tr>
      <td><b>${e(m.lot_name)}</b><div class="cell-sub">${pill(m.lot_status, LOT[m.lot_status] || m.lot_status)}</div></td>
      <td><b>${e(m.full_name)}</b><div class="cell-sub">#${n(m.manager_id)} · ${e(m.email)}</div></td>
      <td>${e(m.phone || '—')}</td>
      <td>${dt(m.assigned_at)}</td>
    </tr>`
  );

  const vehRows = (d.lot_vehicles || []).map(
    v => `<tr>
      <td><b>${e(v.lot_name)}</b><div class="cell-sub mono">Bãi #${n(v.parking_lot_id)}</div></td>
      <td>${
        v.vehicle_types
          ? v.vehicle_types
              .split(', ')
              .map(t => pill('brand', t))
              .join(' ')
          : '<span class="muted">Chưa cấu hình</span>'
      }</td>
    </tr>`
  );

  return (
    section(
      'Quy tắc nghiệp vụ & Thông số vận hành hệ thống',
      `<div class="settings-rules-grid">${rulesHtml}</div>`,
      'Các quy chuẩn đặt chỗ, giữ chỗ, vé QR và phương thức thanh toán đang áp dụng trên toàn hệ thống.'
    ) +
    section(
      'Cấu hình Bảng giá theo khung giờ tại các bãi đỗ (Pricing Rules)',
      table(['Bãi đỗ xe', 'Tên khung giá', 'Khung giờ áp dụng', 'Đơn giá / giờ', 'Phụ phí giờ cao điểm', 'Thời hạn hiệu lực'], pricingRows),
      `Đang áp dụng ${(d.pricing || []).length} quy tắc tính giá theo khung giờ.`
    ) +
    `<div class="reference-section-grid">
      ${section(
        'Phân công Chủ bãi / Quản lý vận hành',
        table(['Bãi đỗ xe', 'Người quản lý', 'Điện thoại', 'Ngày phân công'], mgrRows),
        'Danh sách phân quyền quản lý bãi xe (parking_lot_managers).'
      )}
      ${section(
        'Phân loại phương tiện cho phép theo bãi',
        table(['Bãi đỗ xe', 'Loại xe được phép đỗ'], vehRows),
        'Cấu hình loại xe hỗ trợ tại từng bãi (parking_lot_vehicle_types).'
      )}
    </div>`
  );
}

window.EZ_RENDER = settings;
