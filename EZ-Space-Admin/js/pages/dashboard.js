/* Giao diện dashboard: chỉ chứa trình bày và dữ liệu cho trang này. */
function occupancy(s){
 const total=n(s.total), a=n(s.available),h=n(s.holding),o=n(s.occupied),u=n(s.unavailable);
 const percent=val=>total?(val*100/total).toFixed(2)+'%':'0%';
 return `<div class="occupancy"><div class="occ-track"><i style="width:${percent(o)};background:#ef4444"></i><i style="width:${percent(h)};background:#eab308"></i><i style="width:${percent(a)};background:#22c55e"></i><i style="width:${percent(u)};background:#9ca3af"></i></div><div class="occ-label"><span>Đang đỗ: <b>${nf(o)}</b></span><span>Đang giữ: <b>${nf(h)}</b></span><span>Trống: <b>${nf(a)}</b></span><span>Không sử dụng: <b>${nf(u)}</b></span></div><p class="muted">Đếm theo các ô đã tạo trong bảng <code>slots</code> (${nf(total)} ô), không phải toàn bộ sức chứa khai báo.</p></div>`;
}
function dashboard(d){
 const u=summary.users,l=summary.lots,s=summary.slots;
 const books=d.books,pay=d.payments,bookTotal=n(books.total);
 const max=Math.max(1,...d.hourly.map(x=>n(x.amount)));
 const hours=Array.from({length:12},(_,i)=>i*2);
 const chart=hours.map(h=>{
  const inHours=d.hourly.filter(x=>Math.floor(n(x.hour)/2)*2===h);
  const total=inHours.reduce((z,v)=>z+n(v.amount),0);
  const pct=Math.round(total/Math.max(max*2,1)*100);
  return `<div class="graph-col" title="${String(h).padStart(2,'0')}:00 – ${nf(total)} lượt"><div class="graph-value">${total||''}</div><div class="graph-bar" style="height:${Math.max(pct,total?8:0)}%"></div><small>${String(h).padStart(2,'0')}:00</small></div>`;
 }).join('');
 const recentRows=d.recent.map(x=>`<tr><td class="mono">#${n(x.id)}</td><td><b>${e(x.customer)}</b><div class="cell-sub">${e(x.license_plate)}</div></td><td>${e(x.lot_name)}<div class="cell-sub">Ô ${e(x.slot_code)}</div></td><td class="reservation-status">${pill(x.status,RES[x.status]||x.status)}</td><td>${money(x.deposit_amount)}</td><td>${dt(x.created_at)}</td></tr>`);
 const pendingRows=d.pending.map(x=>`<tr><td><b>${e(x.name)}</b><div class="cell-sub">${e(x.address)}</div></td><td>${e(x.managers||'Chưa phân công')}</td><td>${nf(x.capacity)}</td><td>${pill('pending','Chờ duyệt')}</td><td>${actionButton('lot-approve',x.id,'Duyệt','btn-ok')} ${actionButton('lot-reject',x.id,'Từ chối','btn-danger')}</td></tr>`);
 const auditRows=d.logs.map(x=>`<tr><td>${dt(x.created_at)}</td><td>${e(x.action)}</td><td>${e(x.actor||'Hệ thống')}</td><td>${e(x.note||'—')}</td></tr>`);
 const services=`<div class="service-list">
 <div class="service-row"><div class="service-label"><span class="ms">database</span><div>MySQL / MariaDB<small>Truy vấn dữ liệu qua PHP PDO · ${e(summary.server_time)}</small></div></div><span class="service-tag">Kết nối OK</span></div>
 <div class="service-row"><div class="service-label"><span class="ms">code</span><div>PHP API<small>Endpoint nghiệp vụ trên localhost</small></div></div><span class="service-tag">Phản hồi OK</span></div>
 <div class="service-row"><div class="service-label"><span class="ms">schedule</span><div>Cron xử lý quá hạn<small>Chưa có tín hiệu xác nhận lịch chạy</small></div></div><span class="service-tag warn">Chưa xác minh</span></div>
 <div class="service-row"><div class="service-label"><span class="ms">payments</span><div>Cổng thanh toán<small>Chỉ đọc giao dịch đã lưu trong MySQL</small></div></div><span class="service-tag warn">Chưa tích hợp</span></div>
 </div>`;
 const metrics=`<div class="reference-metrics-row"><div><b>${nf(books.total)}</b><small>Đơn trong kỳ</small></div><div><b>${nf(n(books.paid)+n(books.completed))}</b><small>Đã cọc/Hoàn thành*</small></div><div><b>${nf(n(books.cancelled)+n(books.forfeited))}</b><small>Hủy / No-show</small></div></div>`;
 return ranges()+`<div class="grid-4 live-cards">${[
  kpi('Tổng người dùng',nf(u.total),'groups',`${nf(u.customers)} khách hàng · ${nf(u.managers)} chủ bãi`),
  kpi('Bãi đỗ vận hành',nf(l.active),'apartment',`${nf(l.pending)} bãi chờ phê duyệt`),
  kpi('Đặt chỗ trong kỳ',nf(books.total),'event_available',`${nf(s.occupied)} ô đang đỗ · ${nf(s.holding)} ô giữ chỗ`),
  kpi('Dòng tiền đã thu',money(pay.received),'payments',`Theo giao dịch thành công · ${nf(pay.successful)} giao dịch`)
 ].join('')}</div>`+
 `<div class="reference-dashboard-hero">
 ${section('Lưu lượng đặt chỗ & Tỷ lệ lấp đầy theo khung giờ',`<div class="simple-graph">${chart}</div>${metrics}<div class="ref-note" style="margin:0 24px 22px"><span class="ms">info</span><span>Biểu đồ đếm <b>đơn đã tạo theo giờ</b> trong kỳ. Trạng thái ô đỗ bên dưới là ảnh chụp hiện tại, không phải dự báo tỷ lệ lấp đầy theo giờ.</span></div>`,`Phân tích lượt đặt chỗ từ ${dt(d.range.from)} đến ${dt(d.range.to)}`)}
 ${section('Trạng thái Dịch vụ & Cron Jobs',services,'Chỉ hiển thị các trạng thái có bằng chứng từ API, không giả lập trạng thái Redis/VNPay.')}
 </div>`+
 section('Tình trạng ô đỗ theo dữ liệu thực tế',occupancy(s),`Sức chứa bãi khai báo: ${nf(l.capacity)} · Ô được thiết lập: ${nf(s.total)}`)+
 section(`Bãi đỗ xe chờ phê duyệt (${nf(l.pending)})`,table(['Bãi đỗ & Địa chỉ','Chủ bãi','Sức chứa','Trạng thái','Thao tác'],pendingRows,'Không có bãi chờ duyệt'),'Thông tin lấy trực tiếp từ bảng parking_lots; thao tác duyệt lưu vào MySQL.')+
 `<div class="reference-section-grid">${section('Nhật ký hoạt động mới nhất',table(['Thời gian','Hành động','Tác nhân','Ghi chú'],auditRows))}${section('Đơn đặt chỗ mới nhất',table(['Mã đơn','Khách hàng','Bãi / Ô','Trạng thái','Tiền cọc','Ngày tạo'],recentRows))}</div>`;
}

window.EZ_RENDER = dashboard;
