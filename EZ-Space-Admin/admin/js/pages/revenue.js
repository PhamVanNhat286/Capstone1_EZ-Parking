/* =============================================================
   EZ-SPACE ADMIN - js/pages/revenue.js
   Trang Báo cáo doanh thu Admin (5% tiền thực thu mỗi lượt đặt ô)
   ============================================================= */
'use strict';

function lotRevenueChart(lots) {
  if (!lots.length) return '<div class="live-empty">Chưa có bãi đỗ để thống kê trong kỳ này.</div>';

  const values = lots.map(lot => n(lot.admin_revenue));
  const highest = Math.max(0, ...values);
  const lowest = Math.min(0, ...values);
  const roughStep = (Math.max(highest, -lowest) || 1000) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10].find(factor => factor * magnitude >= roughStep) * magnitude;
  const upper = Math.ceil(highest / step) * step || (lowest === 0 ? step * 4 : 0);
  const lower = Math.floor(lowest / step) * step;
  const width = Math.max(720, lots.length * 140 + 100);
  const left = Math.max(76, nf(Math.max(upper, -lower)).length * 8 + 24);
  const plotWidth = width - left - 24;
  const columnWidth = plotWidth / lots.length;
  const y = value => 34 + ((upper - value) / (upper - lower)) * 192;
  const baseline = y(0);
  const ticks = Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, i) => {
    const value = upper - i * step;
    return `<g><line x1="${left}" x2="${width - 24}" y1="${y(value)}" y2="${y(value)}" class="lot-chart-grid${value === 0 ? ' is-baseline' : ''}"/><text x="${left - 12}" y="${y(value) + 4}" text-anchor="end" class="lot-chart-tick">${nf(value)}</text></g>`;
  }).join('');

  const bars = lots.map((lot, index) => {
    const value = values[index];
    const center = left + columnWidth * (index + 0.5);
    const barWidth = Math.min(52, columnWidth * 0.45);
    const label = String(lot.name || `Bãi #${n(lot.id)}`);
    const shortLabel = label.length > 24 ? label.slice(0, 22) + '…' : label;
    const description = `${label}: ${money(value)}${value < 0 ? ' (giảm do hoàn tiền)' : ''}`;
    return `<g class="lot-chart-column" tabindex="0" role="img" aria-label="${e(description)}">
      <title>${e(description)}</title>
      ${value === 0
        ? `<line x1="${center - barWidth / 2}" x2="${center + barWidth / 2}" y1="${baseline}" y2="${baseline}" class="lot-chart-zero"/>`
        : `<rect x="${center - barWidth / 2}" y="${Math.min(y(value), baseline)}" width="${barWidth}" height="${Math.abs(y(value) - baseline)}" rx="4" class="lot-chart-bar${value < 0 ? ' is-negative' : ''}"/>`}
      <text x="${center}" y="${value < 0 ? y(value) + 18 : y(value) - 10}" text-anchor="middle" class="lot-chart-value">${nf(value)}</text>
      <text x="${center}" y="267" text-anchor="middle" class="lot-chart-name">${e(shortLabel)}</text>
      <text x="${center}" y="287" text-anchor="middle" class="lot-chart-tick">Bãi #${n(lot.id)}</text>
    </g>`;
  }).join('');

  return `<div class="lot-revenue-chart">
    <div class="lot-chart-legend"><span>Đơn vị: VNĐ</span><span><i></i>Doanh thu Admin (5%)</span>${lowest < 0 ? '<span><i class="is-negative"></i>Giảm do hoàn tiền</span>' : ''}</div>
    <div class="lot-chart-scroll" tabindex="0" role="region" aria-label="Biểu đồ cột doanh thu theo bãi; cuộn ngang để xem tất cả bãi">
      <svg viewBox="0 0 ${width} 310" style="min-width:${width}px" role="group" aria-label="Doanh thu Admin của ${lots.length} bãi đỗ trong khoảng thời gian đã chọn"><title>Doanh thu Admin theo từng bãi đỗ</title>${ticks}${bars}</svg>
    </div>
    <p class="lot-chart-hint">Di chuột vào cột để xem tên bãi và số tiền. Cuộn ngang khi có nhiều bãi.</p>
  </div>`;
}

function revenue(d) {
  const t = d.totals || {};
  const cash = n(t.received);
  const adminRevenue = n(t.admin_revenue);

  const lotRows = (d.byLot || []).map(x => {
    return `<tr>
      <td><b>${e(x.name)}</b><div class="cell-sub">Mã bãi #${n(x.id)} · ${LOT[x.status] || x.status}</div></td>
      <td>${nf(x.bookings)}</td>
      <td>${money(x.deposits)}</td>
      <td>${money(x.finals)}</td>
      <td>${money(x.forfeited_deposits)}</td>
      <td>${money(x.refunds)}</td>
      <td>${money(x.net_received)}</td>
      <td><b>${money(x.admin_revenue)}</b></td>
      <td>${money(x.owner_revenue)}</td>
    </tr>`;
  });

  const vehRows = (d.byVehicle || []).map(
    x => `<tr>
      <td><b>${e(x.vehicle_type)}</b></td>
      <td>${nf(x.bookings)}</td>
      <td>${money(x.admin_revenue)}</td>
      <td>${adminRevenue > 0 ? ((n(x.admin_revenue) / adminRevenue) * 100).toFixed(1) + '%' : '—'}</td>
    </tr>`
  );

  const providerRows = (d.byProvider || []).map(
    x => `<tr>
      <td><b>${e(PAY_PROVIDER[x.provider] || x.provider)}</b></td>
      <td>${nf(x.transactions)}</td>
      <td>${money(x.received)}</td>
      <td><b>${money(x.admin_revenue)}</b></td>
    </tr>`
  );

  const paymentRows = (d.recent || []).map(
    x => `<tr>
      <td class="mono">#${n(x.id)} / Đơn #${n(x.reservation_id)}</td>
      <td><b>${e(x.customer || '—')}</b><div class="cell-sub">${e(x.license_plate || '—')}</div></td>
      <td>${e(x.lot_name)}<div class="cell-sub">Ô ${e(x.slot_code || '—')}</div></td>
      <td>${e(PAY_PROVIDER[x.provider] || x.provider)}<div class="cell-sub mono">${e(x.transaction_ref || '—')}</div></td>
      <td>${pill(x.payment_type, PAY_TYPE[x.payment_type] || x.payment_type)}</td>
      <td><b>${money(x.amount)}</b></td>
      <td><b>${money(x.admin_revenue)}</b></td>
      <td>${pill(x.status, PAY_STATUS[x.status] || x.status)}</td>
      <td>${dt(x.paid_at)}</td>
    </tr>`
  );

  const daily = d.byDay || [];
  const maxDay = Math.max(1, ...daily.map(x => Math.abs(n(x.admin_revenue))));
  const dailyChart = daily.length
    ? `<div class="simple-graph ref-revenue-bars">${daily
        .map(x => {
          const total = n(x.admin_revenue);
          return `<div class="graph-col" title="${e(x.day)}: ${money(total)}${total < 0 ? ' (giảm do hoàn tiền)' : ''}"><div class="graph-value">${total ? nf(total) : ''}</div><div class="graph-bar${total < 0 ? ' is-negative' : ''}" style="height:${total ? Math.max(8, Math.round((100 * Math.abs(total)) / maxDay)) : 0}%"></div><small>${e(String(x.day).slice(5))}</small></div>`;
        })
        .join('')}</div>`
    : `<div class="live-empty">Chưa có giao dịch thanh toán thành công trong kỳ được chọn.</div>`;

  const maxVehicle = Math.max(1, ...(d.byVehicle || []).map(x => Math.abs(n(x.admin_revenue))));
  const colors = ['#2563EB', '#16A34A', '#D97706', '#7C3AED', '#0EA5E9'];
  const vehicleChart = `<div class="ref-chart-items">${
    (d.byVehicle || []).length
      ? d.byVehicle
          .map(
            (x, i) => `<div class="ref-chart-item">
              <div class="ref-chart-item-head">
                <b>${e(x.vehicle_type)}</b>
                <span>${money(x.admin_revenue)}</span>
              </div>
              <div class="ref-chart-track">
                <i style="width:${Math.min(100, (Math.abs(n(x.admin_revenue)) / maxVehicle) * 100)}%;background:${n(x.admin_revenue) < 0 ? '#DC2626' : colors[i % colors.length]}"></i>
              </div>
            </div>`
          )
          .join('')
      : '<div class="live-empty">Chưa có dữ liệu doanh thu theo loại xe.</div>'
  }</div>`;

  return (
    ranges() +
    `<div class="grid-4 live-cards">
      ${kpi('Doanh thu Admin (5%)', money(adminRevenue), 'account_balance_wallet', '5% tiền thực thu sau hoàn tiền của mỗi lượt đặt ô')}
      ${kpi('Phần của chủ bãi (95%)', money(t.owner_revenue), 'account_balance', 'Phần còn lại sau khi trừ doanh thu Admin')}
      ${kpi('Tổng tiền khách thanh toán', money(cash), 'payments', `Cọc: ${money(t.deposits)} · Tất toán: ${money(t.finals)}`)}
      ${kpi('Tiền hoàn cho khách', money(t.refunds), 'receipt_long', `Tiền thực thu sau hoàn: ${money(t.net_received)}`)}
    </div>` +
    section(
      'Doanh thu Admin theo bãi đỗ',
      lotRevenueChart(d.byLot || []),
      'So sánh phần doanh thu 5% của từng bãi trong khoảng thời gian đang chọn.'
    ) +
    `<div class="reference-section-grid">
      ${section('Doanh thu Admin theo ngày', dailyChart, '5% × (tiền cọc + tiền tất toán − tiền hoàn). Cột đỏ là khoản giảm do hoàn tiền.')}
      ${section('Doanh thu Admin theo loại phương tiện', vehicleChart, 'Phần 5% Admin nhận từ mỗi lượt đặt ô của SUV, Sedan và EV.')}
    </div>` +
    section(
      'Đối soát tài chính theo từng bãi đỗ xe',
      table(['Bãi đỗ xe', 'Lượt cọc', 'Tiền đặt cọc', 'Thanh toán cuối', 'Cọc No-show', 'Tiền hoàn', 'Thực thu', 'Admin (5%)', 'Chủ bãi (95%)'], lotRows),
      `Kỳ đối soát từ ${dt(d.range.from)} đến ${dt(d.range.to)}`
    ) +
    `<div class="reference-section-grid">
      ${section('Chi tiết doanh thu Admin theo loại xe', table(['Loại xe', 'Số đơn', 'Admin (5%)', 'Tỷ trọng'], vehRows))}
      ${section('Thống kê theo cổng thanh toán', table(['Cổng thanh toán', 'Số giao dịch', 'Tiền khách trả', 'Admin (5%)'], providerRows))}
    </div>` +
    section(
      'Danh sách giao dịch thanh toán gần nhất',
      `<div class="live-toolbar"><span class="muted">Tối đa 200 giao dịch gần nhất. Hoàn tiền làm giảm tương ứng phần 5% của Admin.</span><button class="btn btn-sm" data-export>Xuất CSV giao dịch</button></div>` +
        table(['Mã GD / Đơn', 'Khách hàng', 'Bãi / Ô đỗ', 'Cổng / Mã tham chiếu', 'Loại', 'Số tiền', 'Admin (5%)', 'Trạng thái', 'Thời gian'], paymentRows)
    )
  );
}

window.EZ_RENDER = revenue;
