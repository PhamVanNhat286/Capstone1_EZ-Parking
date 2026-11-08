/* =============================================================
   EZ-SPACE ADMIN - js/actions/user-status.js
   Khóa, mở khóa hoặc tạm ngưng tài khoản người dùng
   ============================================================= */
'use strict';

async function mutateUser(kind, id) {
  const map = {
    'user-lock': 'banned',
    'user-unlock': 'active',
    'user-inactive': 'inactive'
  };
  const to = map[kind];
  if (!to) return;
  const row = lastData?.items?.find(x => n(x.id) === id);
  const label = to === 'banned' ? 'Khóa' : to === 'inactive' ? 'Tạm ngưng' : 'Kích hoạt lại';
  let reason = '';
  if (to === 'banned') {
    reason = prompt(`Nhập lý do khóa tài khoản "${row?.full_name || '#' + id}" (tùy chọn):`, '') || '';
  } else if (!confirm(`Xác nhận ${label.toLowerCase()} tài khoản "${row?.full_name || '#' + id}"?`)) {
    return;
  }
  await api('user_status', 'POST', { id, status: to, reason });
  notice(`Đã cập nhật trạng thái tài khoản "${row?.full_name || '#' + id}".`);
  await load(true);
}
