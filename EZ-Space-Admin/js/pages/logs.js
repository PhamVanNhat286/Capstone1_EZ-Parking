/* Giao diện logs: chỉ chứa trình bày và dữ liệu cho trang này. */
function logs(d){
 const base=d.items.map(x=>({...x,source:'admin',category:x.action}));
 const mgr=d.manager_history.map(x=>({...x,source:'manager',action:x.action_type,category:x.action_type,user_id:x.manager_id,entity_type:'parking_lots',entity_id:x.parking_lot_id}));
 const all=[...base,...mgr].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))||n(b.id)-n(a.id));
 const filtered=filterRows(all,'logs');
 const rows=filtered.map(x=>`<tr><td>${dt(x.created_at)}</td><td>${pill(x.source,x.source==='manager'?'Manager':'Audit')}<div class="cell-sub mono">#${n(x.id)}</div></td><td><b>${e(x.action)}</b></td><td>${e(x.actor||'Hệ thống')}</td><td>${e(x.entity_type||'—')} #${n(x.entity_id)}</td><td>${e(x.lot_name||'—')}</td><td>${e(x.note||'—')}</td><td>${actionButton('log-detail',x.source==='manager'?-n(x.id):n(x.id),'JSON')}</td></tr>`);
 window.liveLogs=all;
 return `<div class="grid-4 live-cards">${kpi('Audit logs tải về',nf(base.length),'receipt_long')}${kpi('Lịch sử quản lý',nf(mgr.length),'history')}${kpi('Thao tác tài khoản',nf(base.filter(x=>x.action==='USER_STATUS_CHANGED').length),'person')}${kpi('Thao tác bãi',nf(base.filter(x=>x.action==='LOT_STATUS_CHANGED').length),'apartment')}</div>`+
 section('Hộp đen nhật ký và lịch sử thay đổi',controls([['all','Tất cả'],['USER_STATUS_CHANGED','Khóa/mở tài khoản'],['LOT_STATUS_CHANGED','Duyệt/trạng thái bãi'],['SETTINGS_UPDATED','Cài đặt']])+table(['Thời gian','Nguồn','Sự kiện','Tác nhân','Đối tượng','Bãi đỗ','Ghi chú','Chi tiết'],rows),`Tải tối đa 500 audit logs và 300 manager history mới nhất. Đang hiển thị ${filtered.length} dòng.`);
}

window.EZ_RENDER = logs;
