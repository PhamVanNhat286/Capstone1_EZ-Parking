/* Giao diện users: chỉ chứa trình bày và dữ liệu cho trang này. */
function users(d){const items=d.items,filtered=filterRows(items,'users');
 const roleCount=r=>items.filter(x=>x.role===r).length;
 const rows=filtered.map(x=>`<tr><td><b>${e(x.full_name)}</b><div class="cell-sub">#${n(x.id)} · ${e(x.email)}</div></td><td>${pill(x.role,ROLE[x.role]||x.role)}</td><td>${e(x.phone||'—')}</td><td><b>${nf(x.reservations)}</b> đặt chỗ · ${nf(x.vehicles)} xe<div class="cell-sub">${nf(x.lots)} bãi phụ trách</div></td><td>${dt(x.created_at)}</td><td>${pill(x.status,USER[x.status])}</td><td>${x.role==='admin'?'<span class="muted">Được bảo vệ</span>':x.status==='banned'?actionButton('user-unlock',x.id,'Mở khóa','btn-ok'):actionButton('user-lock',x.id,'Khóa','btn-danger')}</td></tr>`);
 return `<div class="grid-4 live-cards">${kpi('Tổng tài khoản',nf(items.length),'groups')}${kpi('Khách hàng',nf(roleCount('customer')),'person')}${kpi('Chủ bãi',nf(roleCount('manager')),'store')}${kpi('Quản trị viên',nf(roleCount('admin')),'admin_panel_settings',`${nf(items.filter(x=>x.status==='banned').length)} tài khoản đang bị khóa`)}</div>`+
 section('Danh sách người dùng hệ thống',controls([['all','Tất cả'],['customer','Khách hàng'],['manager','Chủ bãi'],['banned','Bị khóa']])+table(['Tên / email','Vai trò','Điện thoại','Hoạt động','Ngày tạo','Trạng thái','Thao tác'],rows),`Hiển thị ${filtered.length} trên tổng ${items.length} người dùng`);
}

window.EZ_RENDER = users;
