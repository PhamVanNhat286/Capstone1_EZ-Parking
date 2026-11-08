/* =============================================================
   EZ-SPACE ADMIN - js/pages/dashboard.js
   Trang Tổng quan nền tảng (Platform Overview)
   ============================================================= */
'use strict';

function occupancy(s) {
  const total = n(s.total),
    a = n(s.available),
    h = n(s.holding),
    o = n(s.occupied),
    u = n(s.unavailable);
  const percent = val => (total ? ((val * 100) / total).toFixed(2) + '%' : '0%');
  return `<div class="occupancy">
    <div class="occ-track">
      <i style="width:${percent(o)};background:#ef4444" title="Đang đỗ: ${nf(o)}"></i>
      <i style="width:${percent(h)};background:#eab308" title="Đang giữ chỗ: ${nf(h)}"></i>
      <i style="width:${percent(a)};background:#22c55e" title="Trống: ${nf(a)}"></i>
      <i style="width:${percent(u)};background:#9ca3af" title="Ngưng sử dụng: ${nf(u)}"></i>
    </div>
    <div class="occ-label">
      <span>Đang đỗ: <b>${nf(o)}</b></span>
      <span>Đang giữ chỗ: <b>${nf(h)}</b></span>
      <span>Trống: <b>${nf(a)}</b></span>
      <span>Ngưng sử dụng: <b>${nf(u)}</b></span>
    </div>
    <p class="muted">Phân loại ô đỗ: Tiêu chuẩn <b>${nf(s.standard)}</b> · Trạm sạc EV <b>${nf(s.ev_charging)}</b> · Xe lớn/SUV <b>${nf(s.large)}</b> · Ưu tiên KT <b>${nf(s.disabled)}</b>.</p>
  </div>`;
}

function dashboard(d) {
  const u = summary.users || {},
    l = summary.lots || {},
    s = summary.slots || {},
    ses = summary.sessions || {},
    tkt = summary.tickets || {},
    veh = summary.vehicles || {},
    chat = summary.chat || {};
  const books = d.books || {},
    pay = d.payments || {};

  const max = Math.max(1, ...(d.hourly || []).map(x => n(x.amount)));
  const hours = Array.from({ length: 12 }, (_, i) => i * 2);
  const chart = hours
    .map(h => {
      const inHours = (d.hourly || []).filter(x => Math.floor(n(x.hour) / 2) * 2 === h);
      const total = inHours.reduce((z, v) => z + n(v.amount), 0);
      const pct = Math.round((total / Math.max(max * 2, 1)) * 100);
      return `<div class="graph-col" title="${String(h).padStart(2, '0')}:00 – ${nf(total)} lượt"><div class="graph-value">${total || ''}</div><div class="graph-bar" style="height:${Math.max(pct, total ? 8 : 0)}%"></div><small>${String(h).padStart(2, '0')}:00</small></div>`;
    })
    .join('');

  const recentRows = (d.recent || []).map(
    x => `<tr>
      <td class="mono">#${n(x.id)}</td>
      <td><b>${e(x.customer)}</b><div class="cell-sub">${e(x.license_plate)} (${e(x.vehicle_type)})</div></td>
      <td>${e(x.lot_name)}<div class="cell-sub">Ô ${e(x.slot_code)}</div></td>
      <td class="reservation-status">${pill(x.status, RES[x.status] || x.status)}</td>
      <td>${money(x.deposit_amount)}</td>
      <td>${dt(x.created_at)}</td>
    </tr>`
  );

  const pendingRows = (d.pending || []).map(
    x => `<tr>
      <td><b>${e(x.name)}</b><div class="cell-sub">${e(x.address)}</div></td>
      <td>${e(x.managers || 'Chưa phân công')}</td>
      <td>${nf(x.capacity)} chỗ</td>
      <td>${pill('pending', 'Chờ duyệt')}</td>
      <td>${actionButton('lot-approve', x.id, 'Duyệt', 'btn-ok')} ${actionButton('lot-reject', x.id, 'Từ chối', 'btn-danger')}</td>
    </tr>`
  );

  const auditRows = (d.logs || []).map(
    x => `<tr>
      <td>${dt(x.created_at)}</td>
      <td><b>${e(MANAGER_ACTION[x.action] || x.action)}</b><div class="cell-sub mono">${e(x.action)}</div></td>
      <td>${e(x.actor || 'Hệ thống')}</td>
      <td>${e(x.note || '—')}</td>
    </tr>`
  );

  const opsPanel = `<div class="service-list">
    <div class="service-row">
      <div class="service-label">
        <span class="ms">schedule</span>
        <div>Phiên đỗ xe thực tế<small>Đang đỗ: ${nf(ses.active)} · Đã rời bãi: ${nf(ses.completed)}</small></div>
      </div>
      <span class="service-tag ok">${nf(ses.total)} phiên</span>
    </div>
    <div class="service-row">
      <div class="service-label">
        <span class="ms">qr_code</span>
        <div>Vé QR Check-in Kiosk<small>Còn hiệu lực: ${nf(tkt.active)} · Đã quét: ${nf(tkt.used)}</small></div>
      </div>
      <span class="service-tag">${nf(tkt.total)} vé</span>
    </div>
    <div class="service-row">
      <div class="service-label">
        <span class="ms">directions_car</span>
        <div>Phương tiện đăng ký<small>SUV: ${nf(veh.suv)} · Sedan: ${nf(veh.sedan)} · EV: ${nf(veh.ev)}</small></div>
      </div>
      <span class="service-tag">${nf(veh.total)} xe</span>
    </div>
    <div class="service-row">
      <div class="service-label">
        <span class="ms">info</span>
        <div>Tương tác Trợ lý AI<small>Khách hỏi: ${nf(chat.user_msgs)} · Phản hồi AI: ${nf(chat.ai_msgs)}</small></div>
      </div>
      <span class="service-tag">${nf(chat.total)} tin nhắn</span>
    </div>
  </div>`;

  const metrics = `<div class="reference-metrics-row">
    <div><b>${nf(books.total)}</b><small>Tổng đơn trong kỳ</small></div>
    <div><b>${nf(n(books.paid) + n(books.entered) + n(books.completed))}</b><small>Đã cọc / Hoàn thành</small></div>
    <div><b>${nf(n(books.cancelled) + n(books.forfeited))}</b><small>Đã hủy / No-show</small></div>
  </div>`;

  return (
    ranges() +
    `<div class="grid-4 live-cards">${[
      kpi('Tổng người dùng', nf(u.total), 'groups', `${nf(u.customers)} khách hàng · ${nf(u.managers)} chủ bãi`),
      kpi('Bãi đỗ vận hành', nf(l.active), 'apartment', `${nf(l.pending)} bãi chờ phê duyệt · Tổng ${nf(l.total)} bãi`),
      kpi('Đặt chỗ trong kỳ', nf(books.total), 'event_available', `${nf(s.occupied)} ô đang đỗ · ${nf(s.holding)} ô giữ chỗ`),
      kpi('Dòng tiền đã thu', money(pay.received), 'payments', `${nf(pay.successful)} giao dịch thanh toán thành công`)
    ].join('')}</div>` +
    `<div class="reference-dashboard-hero">
      ${section(
        'Lưu lượng đặt chỗ theo khung giờ',
        `<div class="simple-graph">${chart}</div>${metrics}`,
        `Thống kê lượt đặt chỗ từ ${dt(d.range.from)} đến ${dt(d.range.to)}`
      )}
      ${section('Chỉ số Vận hành & Tiện ích', opsPanel, 'Tổng hợp phiên đỗ xe, vé QR, phương tiện và trợ lý AI.')}
    </div>` +
    section(
      'Tình trạng lấp đầy ô đỗ toàn hệ thống',
      occupancy(s),
      `Tổng sức chứa khai báo: ${nf(l.capacity)} chỗ · Tổng ô trên sơ đồ 2D: ${nf(s.total)} ô`
    ) +
    section(
      `Bãi đỗ xe chờ phê duyệt (${nf(l.pending)})`,
      table(['Bãi đỗ & Địa chỉ', 'Chủ bãi', 'Sức chứa', 'Trạng thái', 'Thao tác'], pendingRows, 'Hiện không có bãi đỗ nào đang chờ phê duyệt'),
      'Kiểm duyệt các bãi đỗ xe mới đăng ký trước khi đưa vào vận hành.'
    ) +
    `<div class="reference-section-grid">
      ${section('Nhật ký hoạt động mới nhất', table(['Thời gian', 'Sự kiện', 'Tác nhân', 'Ghi chú'], auditRows))}
      ${section('Đơn đặt chỗ mới nhất', table(['Mã đơn', 'Khách hàng', 'Bãi / Ô', 'Trạng thái', 'Tiền cọc', 'Ngày tạo'], recentRows))}
    </div>`
  );
}

window.EZ_RENDER = dashboard;
