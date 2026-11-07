/* Giao diện revenue: chỉ chứa trình bày và dữ liệu cho trang này. */
function revenue(d){
 const t=d.totals,comm=n(d.commission),cash=n(t.received),cashNet=cash-n(t.refunds),net=cashNet*(1-comm/100);
 const lotRows=d.byLot.map(x=>{const total=n(x.received)-n(x.refunds);return `<tr><td><b>${e(x.name)}</b><div class="cell-sub">Mã bãi #${n(x.id)}</div></td><td>${nf(x.bookings)}</td><td>${money(x.deposits)}</td><td>${money(x.finals)}</td><td>${money(x.forfeited_deposits)}</td><td>${money(x.refunds)}</td><td>${money(total)}</td><td>${money(total*comm/100)}</td><td><b>${money(total*(1-comm/100))}</b></td></tr>`;});
 const vehRows=d.byVehicle.map(x=>`<tr><td>${e(x.vehicle_type)}</td><td>${nf(x.bookings)}</td><td>${money(x.received)}</td><td>${cash?(n(x.received)/cash*100).toFixed(1):0}%</td></tr>`);
 const providerRows=d.byProvider.map(x=>`<tr><td>${e(x.provider)}</td><td>${nf(x.transactions)}</td><td>${money(x.received)}</td></tr>`);
 const paymentRows=d.recent.map(x=>`<tr><td>#${n(x.id)} / #${n(x.reservation_id)}</td><td>${e(x.lot_name)}</td><td>${e(x.provider)}</td><td>${e(x.payment_type)}</td><td>${money(x.amount)}</td><td>${pill(x.status,x.status)}</td><td>${dt(x.paid_at)}</td></tr>`);
 const daily=d.byDay||[];
 const maxDay=Math.max(1,...daily.map(x=>n(x.deposits)+n(x.finals)));
 const dailyChart=daily.length?`<div class="simple-graph ref-revenue-bars">${daily.map(x=>{const total=n(x.deposits)+n(x.finals);return `<div class="graph-col" title="${e(x.day)}: ${money(total)}"><div class="graph-value">${total?nf(total):''}</div><div class="graph-bar" style="height:${total?Math.max(8,Math.round(100*total/maxDay)):0}%"></div><small>${e(String(x.day).slice(5))}</small></div>`;}).join('')}</div>`:`<div class="live-empty">Chưa có giao dịch thành công trong kỳ được chọn.</div>`;
 const maxVehicle=Math.max(1,cash);
 const colors=['#2563EB','#16A34A','#D97706','#7C3AED','#0EA5E9'];
 const vehicleChart=`<div class="ref-chart-items">${d.byVehicle.length?d.byVehicle.map((x,i)=>`<div class="ref-chart-item"><div class="ref-chart-item-head"><b>${e(x.vehicle_type)}</b><span>${money(x.received)} · ${cash?(n(x.received)/maxVehicle*100).toFixed(1):'0'}%</span></div><div class="ref-chart-track"><i style="width:${Math.max(0,Math.min(100,n(x.received)/maxVehicle*100))}%;background:${colors[i%colors.length]}"></i></div></div>`).join(''):'<div class="live-empty">Chưa có doanh thu phân loại theo xe.</div>'}</div>`;
 return ranges()+`<div class="grid-4 live-cards">${kpi('Tổng doanh thu ghi nhận',money(cash),'payments',`${nf(t.transactions)} giao dịch trong kỳ`)}${kpi('Tổng tiền cọc',money(t.deposits),'account_balance')}${kpi('Thanh toán cuối',money(t.finals),'receipt_long')}${kpi(`Hoa hồng ước tính (${comm}%)`,money(cashNet*comm/100),'pie_chart',`Đối tác nhận dự tính: ${money(net)}`)}</div>`+
 `<p class="live-explain"><b>Dữ liệu thật:</b> Doanh thu lấy từ payments thành công, tiền hoàn trừ riêng. Tiền phạt No-show là phần cọc của đơn forfeited, không cộng hai lần. <b>Hoa hồng và đối tác nhận chỉ là ước tính</b>, chưa phải số dư đã chuyển khoản/đối soát ngân hàng.</p>`+
 `<div class="reference-section-grid">${section('Biểu đồ tăng trưởng dòng tiền đặt cọc',dailyChart,'Doanh thu theo ngày (tối đa 120 ngày có giao dịch gần nhất trong kỳ).')}${section('Phân bổ doanh thu theo loại xe',vehicleChart,'Tỷ trọng các giao dịch thành công được gắn với xe trong MySQL.')}</div>`+
 section('Đối soát tài chính theo Chủ bãi / Bãi đỗ xe',table(['Bãi đỗ','Lượt cọc','Tiền cọc','Thanh toán cuối','Cọc No-show','Tiền hoàn','Thu ròng','Hoa hồng ước tính','Đối tác nhận ước tính'],lotRows),`Từ ${dt(d.range.from)} đến ${dt(d.range.to)}`)+
 `<div class="reference-section-grid">${section('Chi tiết nguồn thu theo loại xe',table(['Loại xe','Đơn có thanh toán','Doanh thu','Tỷ trọng'],vehRows))}${section('Cổng thanh toán đã ghi nhận',table(['Cổng','Giao dịch','Tiền thu'],providerRows))}</div>`+
 section('Giao dịch gần nhất trong kỳ (tối đa 200)',`<div class="live-toolbar"><button class="btn btn-sm" data-export>Xuất CSV giao dịch</button></div>`+table(['Giao dịch / Đơn','Bãi đỗ','Cổng','Loại','Số tiền','Trạng thái','Thanh toán lúc'],paymentRows));
}

window.EZ_RENDER = revenue;
