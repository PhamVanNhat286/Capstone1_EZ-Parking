/* Giao diện lots: chỉ chứa trình bày và dữ liệu cho trang này. */
function lotButtons(x){
 let b=actionButton('lot-detail',x.id,'Chi tiết');
 if(x.status==='pending') b+=' '+actionButton('lot-approve',x.id,'Duyệt','btn-ok')+' '+actionButton('lot-reject',x.id,'Từ chối','btn-danger');
 if(x.status==='active') b+=' '+actionButton('lot-suspend',x.id,'Tạm ngừng','btn-danger');
 if(x.status==='inactive') b+=' '+actionButton('lot-activate',x.id,'Kích hoạt','btn-ok');
 if(x.status==='rejected'||x.status==='inactive') b+=' '+actionButton('lot-reconsider',x.id,'Thẩm định lại');
 return `<div class="live-buttons">${b}</div>`;
}
function lots(d){const items=d.items,filtered=filterRows(items,'lots');
 const count=k=>items.filter(x=>x.status===k).length;
 const rows=filtered.map(x=>`<tr><td><b>${e(x.name)}</b><div class="cell-sub mono">#${n(x.id)} · ${e(x.address)}</div></td><td>${e(x.managers||'Chưa phân công')}</td><td><b>${nf(x.capacity)}</b> khai báo<div class="cell-sub">${nf(x.slot_total)} ô · ${nf(x.slot_available)} trống · ${nf(x.slot_occupied)} đang đỗ · ${nf(x.slot_holding)} giữ</div></td><td>${e(x.vehicle_types||'Chưa cấu hình')}<div class="cell-sub">Từ ${x.min_rate===null?'—':money(x.min_rate)}/giờ</div></td><td>${e((x.open_time||'—').slice(0,5))}–${e((x.close_time||'—').slice(0,5))}</td><td>${pill(x.status,LOT[x.status])}</td><td>${lotButtons(x)}</td></tr>`);
 return `<div class="grid-4 live-cards">${kpi('Tổng số bãi',nf(items.length),'apartment')}${kpi('Đang vận hành',nf(count('active')),'check_circle')}${kpi('Chờ phê duyệt',nf(count('pending')),'pending_actions')}${kpi('Tạm ngừng / Từ chối',nf(count('inactive')+count('rejected')),'block')}</div>`+
 `<div class="ref-note"><span class="ms">info</span><span>Danh sách và trạng thái được truy vấn trực tiếp từ <b>parking_lots</b>. Khi duyệt hoặc từ chối, thay đổi sẽ được ghi vào MySQL và ghi nhật ký.</span></div>`+
 section('Danh sách bãi đỗ',controls([['all','Tất cả'],['pending','Chờ duyệt'],['active','Hoạt động'],['inactive','Tạm ngừng'],['rejected','Từ chối']])+table(['Bãi & địa chỉ','Quản lý','Sức chứa / ô đỗ','Loại xe / giá','Giờ mở','Trạng thái','Thao tác'],rows),`Hiển thị ${filtered.length} trên tổng ${items.length} bãi từ MySQL`);
}

window.EZ_RENDER = lots;
