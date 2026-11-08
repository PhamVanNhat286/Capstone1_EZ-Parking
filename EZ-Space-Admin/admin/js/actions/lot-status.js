/* =============================================================
   EZ-SPACE ADMIN - js/actions/lot-status.js
   Phê duyệt, từ chối, tạm ngừng và kích hoạt lại bãi đỗ xe
   ============================================================= */
'use strict';

async function mutateLot(kind, id) {
  const map = {
    'lot-approve': 'active',
    'lot-reject': 'rejected',
    'lot-suspend': 'inactive',
    'lot-activate': 'active',
    'lot-reconsider': 'pending'
  };
  const to = map[kind];
  if (!to) return;
  const row = lastData?.items?.find(x => n(x.id) === id) || lastData?.pending?.find(x => n(x.id) === id);
  const name = row?.name || `#${id}`;
  let reason = '';
  if (to === 'rejected' || to === 'inactive') {
    reason = prompt(`Nhập lý do ${to === 'rejected' ? 'từ chối' : 'tạm ngừng'} bãi "${name}":`, '');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      notice('Vui lòng nhập lý do tối thiểu 3 ký tự.', 'bad');
      return;
    }
  } else if (!confirm(`Xác nhận chuyển trạng thái bãi "${name}" sang "${LOT[to]}"?`)) {
    return;
  }
  await api('lot_status', 'POST', { id, status: to, reason });
  notice(`Đã cập nhật trạng thái bãi "${name}" sang ${LOT[to]}.`);
  closeModal();
  await load(true);
}
