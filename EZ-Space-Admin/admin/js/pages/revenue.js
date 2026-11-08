/* =============================================================
   EZ-SPACE ADMIN - js/pages/revenue.js
   Trang Báo cáo doanh thu tổng (Global Revenue)
   ============================================================= */
'use strict';

function revenue(d) {
  const t = d.totals || {};
  const cash = n(t.received);
  const cashNet = cash - n(t.refunds);

  const lotRows = (d.byLot || []).map(x => {
    const total = n(x.received) - n(x.refunds);
    return `<tr>
      <td><b>${e(x.name)}</b><div class="cell-sub">Mã bãi #${n(x.id)} · ${LOT[x.status] || x.status}</div></td>
      <td>${nf(x.bookings)}</td>
      <td>${money(x.deposits)}</td>
      <td>${money(x.finals)}</td>
      <td>${money(x.forfeited_deposits)}</td>
      <td>${money(x.refunds)}</td>
      <td><b>${money(total)}</b></td>
    </tr>`;
  });

  const vehRows = (d.byVehicle || []).map(
    x => `<tr>
      <td><b>${e(x.vehicle_type)}</b></td>
      <td>${nf(x.bookings)}</td>
      <td>${money(x.received)}</td>
      <td>${cash ? ((n(x.received) / cash) * 100).toFixed(1) : 0}%</td>
    </tr>`
  );

  const providerRows = (d.byProvider || []).map(
    x => `<tr>
      <td><b>${e(PAY_PROVIDER[x.provider] || x.provider)}</b></td>
      <td>${nf(x.transactions)}</td>
      <td>${money(x.received)}</td>
    </tr>`
  );

  const paymentRows = (d.recent || []).map(
    x => `<tr>
      <td class="mono">#${n(x.id)} / Đơn #${n(x.reservation_id)}</td>
      <td><b>${e(x.customer || '—')}</b><div class="cell-sub">${e(x.license_plate || '—')}</div></td>
      <td>${e(x.lot_name)}</td>
      <td>${e(PAY_PROVIDER[x.provider] || x.provider)}<div class="cell-sub mono">${e(x.transaction_ref || '—')}</div></td>
      <td>${pill(x.payment_type, PAY_TYPE[x.payment_type] || x.payment_type)}</td>
      <td><b>${money(x.amount)}</b></td>
      <td>${pill(x.status, PAY_STATUS[x.status] || x.status)}</td>
      <td>${dt(x.paid_at)}</td>
    </tr>`
  );

  const daily = d.byDay || [];
  const maxDay = Math.max(1, ...daily.map(x => n(x.deposits) + n(x.finals)));
  const dailyChart = daily.length
    ? `<div class="simple-graph ref-revenue-bars">${daily
        .map(x => {
          const total = n(x.deposits) + n(x.finals);
          return `<div class="graph-col" title="${e(x.day)}: ${money(total)}"><div class="graph-value">${total ? nf(total) : ''}</div><div class="graph-bar" style="height:${total ? Math.max(8, Math.round((100 * total) / maxDay)) : 0}%"></div><small>${e(String(x.day).slice(5))}</small></div>`;
        })
        .join('')}</div>`
    : `<div class="live-empty">Chưa có giao dịch thanh toán thành công trong kỳ được chọn.</div>`;

  const maxVehicle = Math.max(1, cash);
  const colors = ['#2563EB', '#16A34A', '#D97706', '#7C3AED', '#0EA5E9'];
  const vehicleChart = `<div class="ref-chart-items">${
    (d.byVehicle || []).length
      ? d.byVehicle
          .map(
            (x, i) => `<div class="ref-chart-item">
              <div class="ref-chart-item-head">
                <b>${e(x.vehicle_type)}</b>
                <span>${money(x.received)} · ${cash ? ((n(x.received) / maxVehicle) * 100).toFixed(1) : '0'}%</span>
              </div>
              <div class="ref-chart-track">
                <i style="width:${Math.max(0, Math.min(100, (n(x.received) / maxVehicle) * 100))}%;background:${colors[i % colors.length]}"></i>
              </div>
            </div>`
          )
          .join('')
      : '<div class="live-empty">Chưa có dữ liệu doanh thu theo loại xe.</div>'
  }</div>`;

  return (
    ranges() +
    `<div class="grid-4 live-cards">
      ${kpi('Tổng doanh thu ghi nhận', money(cash), 'payments', `${nf(t.transactions)} giao dịch trong kỳ`)}
      ${kpi('Tổng tiền đặt cọc', money(t.deposits), 'account_balance', `${nf(t.paid_deposits)} lượt đặt cọc thành công`)}
      ${kpi('Thanh toán khi rời bãi', money(t.finals), 'receipt_long', 'Tất toán phiên đỗ xe')}
      ${kpi('Doanh thu ròng', money(cashNet), 'account_balance_wallet', `Sau khi trừ hoàn tiền (${money(t.refunds)})`)}
    </div>` +
    `<div class="reference-section-grid">
      ${section('Biểu đồ doanh thu theo ngày', dailyChart, 'Tổng hợp tiền đặt cọc và thanh toán cuối theo ngày.')}
      ${section('Cơ cấu doanh thu theo loại phương tiện', vehicleChart, 'Tỷ trọng đóng góp doanh thu giữa SUV, Sedan và EV.')}
    </div>` +
    section(
      'Đối soát tài chính theo từng bãi đỗ xe',
      table(['Bãi đỗ xe', 'Lượt cọc', 'Tiền đặt cọc', 'Thanh toán cuối', 'Cọc No-show', 'Tiền hoàn', 'Thu ròng'], lotRows),
      `Kỳ đối soát từ ${dt(d.range.from)} đến ${dt(d.range.to)}`
    ) +
    `<div class="reference-section-grid">
      ${section('Chi tiết nguồn thu theo loại xe', table(['Loại xe', 'Số đơn', 'Doanh thu', 'Tỷ trọng'], vehRows))}
      ${section('Thống kê theo cổng thanh toán', table(['Cổng thanh toán', 'Số giao dịch', 'Tổng tiền thu'], providerRows))}
    </div>` +
    section(
      'Danh sách giao dịch thanh toán gần nhất',
      `<div class="live-toolbar"><span class="muted">Hiển thị tối đa 200 giao dịch gần nhất trong kỳ.</span><button class="btn btn-sm" data-export>Xuất CSV giao dịch</button></div>` +
        table(['Mã GD / Đơn', 'Khách hàng', 'Bãi đỗ', 'Cổng / Mã tham chiếu', 'Loại', 'Số tiền', 'Trạng thái', 'Thời gian'], paymentRows)
    )
  );
}

window.EZ_RENDER = revenue;
