/* =============================================================
   EZ-SPACE ADMIN - js/actions/lot-status.js
   Phê duyệt, từ chối, tạm ngừng và kích hoạt lại bãi đỗ xe
   ============================================================= */
'use strict';

async function mutateLot(kind, id) {
  const configs = {
    'lot-approve': {
      to: 'active',
      title: 'Phê duyệt bãi đỗ xe',
      desc: 'Bãi đỗ sẽ được kích hoạt và mở nhận đặt chỗ trên toàn hệ thống.',
      confirmText: 'Phê duyệt ngay',
      confirmStyle: 'btn-ok'
    },
    'lot-activate': {
      to: 'active',
      title: 'Kích hoạt lại bãi đỗ xe',
      desc: 'Bãi đỗ sẽ hoạt động trở lại và cho phép khách hàng đặt chỗ.',
      confirmText: 'Kích hoạt lại',
      confirmStyle: 'btn-ok'
    },
    'lot-reconsider': {
      to: 'pending',
      title: 'Đưa bãi đỗ về chờ thẩm định',
      desc: 'Chuyển trạng thái bãi đỗ về danh sách chờ quản trị viên phê duyệt lại.',
      confirmText: 'Chuyển chờ duyệt',
      confirmStyle: 'btn-primary'
    },
    'lot-reject': {
      to: 'rejected',
      title: 'Từ chối hồ sơ bãi đỗ xe',
      desc: 'Vui lòng chọn hoặc nhập lý do từ chối để lưu vào nhật ký đối soát hệ thống.',
      withReason: true,
      requireReason: true,
      reasonLabel: 'Lý do từ chối phê duyệt',
      reasonPlaceholder: 'Nhập lý do từ chối bãi đỗ (tối thiểu 3 ký tự)...',
      suggestions: [
        'Hồ sơ pháp lý chưa đầy đủ',
        'Sơ đồ ô đỗ 2D chưa khớp thực tế',
        'Thông tin bảng giá chưa hợp lệ'
      ],
      confirmText: 'Xác nhận từ chối',
      confirmStyle: 'btn-danger'
    },
    'lot-suspend': {
      to: 'inactive',
      title: 'Tạm ngừng vận hành bãi đỗ',
      desc: 'Bãi đỗ sẽ tạm ngừng nhận đơn đặt chỗ mới cho đến khi được kích hoạt lại.',
      withReason: true,
      requireReason: true,
      reasonLabel: 'Lý do tạm ngừng',
      reasonPlaceholder: 'Nhập lý do tạm ngừng vận hành (tối thiểu 3 ký tự)...',
      suggestions: [
        'Bảo trì định kỳ hạ tầng bãi đỗ',
        'Tạm ngừng theo yêu cầu chủ bãi',
        'Kiểm tra quy chuẩn an toàn vận hành'
      ],
      confirmText: 'Tạm ngừng bãi',
      confirmStyle: 'btn-danger'
    }
  };

  const cfg = configs[kind];
  if (!cfg) return;
  const row = lastData?.items?.find(x => n(x.id) === id) || lastData?.pending?.find(x => n(x.id) === id);
  const name = row?.name || `Bãi đỗ #${id}`;
  const sub = row?.address ? `#${id} · ${row.address}` : `Mã bãi #${id}`;

  const res = await confirmModal({
    title: cfg.title,
    targetName: name,
    targetSub: sub,
    statusBadge: pill(cfg.to, LOT[cfg.to]),
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

  await api('lot_status', 'POST', { id, status: cfg.to, reason: res.reason });
  notice(`Đã cập nhật trạng thái bãi "${name}" sang ${LOT[cfg.to]}.`);
  await load(true);
}
