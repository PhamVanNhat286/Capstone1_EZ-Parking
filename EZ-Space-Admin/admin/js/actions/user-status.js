/* =============================================================
   EZ-SPACE ADMIN - js/actions/user-status.js
   Khóa, mở khóa hoặc tạm ngưng tài khoản người dùng
   ============================================================= */
'use strict';

async function mutateUser(kind, id) {
  const configs = {
    'user-lock': {
      to: 'banned',
      title: 'Khóa tài khoản người dùng',
      desc: 'Tài khoản bị khóa sẽ không thể đăng nhập hoặc đặt chỗ trên hệ thống.',
      withReason: true,
      requireReason: false,
      reasonLabel: 'Lý do khóa tài khoản',
      reasonPlaceholder: 'Nhập lý do khóa tài khoản...',
      suggestions: [
        'Vi phạm chính sách đặt chỗ nhiều lần',
        'Đặt chỗ nhưng không đến (No-show)',
        'Phát hiện hoạt động bất thường'
      ],
      confirmText: 'Khóa tài khoản',
      confirmStyle: 'btn-danger'
    },
    'user-inactive': {
      to: 'inactive',
      title: 'Tạm ngưng tài khoản',
      desc: 'Tạm ngưng quyền hoạt động của tài khoản cho đến khi được kích hoạt lại.',
      confirmText: 'Tạm ngưng',
      confirmStyle: 'btn-primary'
    },
    'user-unlock': {
      to: 'active',
      title: 'Kích hoạt / Mở khóa tài khoản',
      desc: 'Khôi phục toàn bộ quyền truy cập và giao dịch cho tài khoản này.',
      confirmText: 'Kích hoạt ngay',
      confirmStyle: 'btn-ok'
    }
  };

  const cfg = configs[kind];
  if (!cfg) return;
  const row = lastData?.items?.find(x => n(x.id) === id);
  const name = row?.full_name || `Tài khoản #${id}`;
  const sub = row?.email ? `#${id} · ${row.email}` : `ID #${id}`;

  const res = await confirmModal({
    title: cfg.title,
    targetName: name,
    targetSub: sub,
    statusBadge: pill(cfg.to, USER[cfg.to]),
    description: cfg.desc,
    withReason: Boolean(cfg.withReason),
    requireReason: Boolean(cfg.requireReason),
    reasonLabel: cfg.reasonLabel,
    reasonPlaceholder: cfg.reasonPlaceholder,
    suggestions: cfg.suggestions || [],
    confirmText: cfg.confirmText,
    confirmStyle: cfg.confirmStyle
  });
  if (!res) return;

  await api('user_status', 'POST', { id, status: cfg.to, reason: res.reason });
  notice(`Đã cập nhật trạng thái tài khoản "${name}" sang ${USER[cfg.to]}.`);
  await load(true);
}
