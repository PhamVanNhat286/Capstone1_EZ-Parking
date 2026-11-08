/* =============================================================
   EZ-SPACE ADMIN - js/pages/logs.js
   Trang Nhật ký hệ thống & Đối soát (System Audit Logs)
   ============================================================= */
'use strict';

function logs(d) {
  const base = (d.items || []).map(x => ({
    ...x,
    source: 'admin',
    category: x.action
  }));

  const mgr = (d.manager_history || []).map(x => ({
    ...x,
    source: 'manager',
    action: x.action_type,
    category: x.action_type,
    user_id: x.manager_id,
    entity_type: 'parking_lots',
    entity_id: x.parking_lot_id
  }));

  const all = [...base, ...mgr].sort(
    (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || n(b.id) - n(a.id)
  );
  const filtered = filterRows(all, 'logs');

  const rows = filtered.map(
    x => `<tr>
      <td>${dt(x.created_at)}</td>
      <td>
        ${pill(x.source === 'manager' ? 'manager' : 'admin', x.source === 'manager' ? 'Quản lý bãi' : 'Hệ thống')}
        <div class="cell-sub mono">#${n(x.id)}</div>
      </td>
      <td>
        <b>${e(MANAGER_ACTION[x.action] || x.action)}</b>
        <div class="cell-sub mono">${e(x.action)}</div>
      </td>
      <td>
        <b>${e(x.actor || 'Hệ thống')}</b>
        <div class="cell-sub">${e(x.actor_email || '')}</div>
      </td>
      <td class="mono">${e(x.entity_type || '—')} #${n(x.entity_id)}</td>
      <td>${e(x.lot_name || '—')}</td>
      <td>${e(x.note || '—')}</td>
      <td>${actionButton('log-detail', x.source === 'manager' ? -n(x.id) : n(x.id), 'Chi tiết')}</td>
    </tr>`
  );

  window.liveLogs = all;

  const lotActionsCount = all.filter(x =>
    ['APPROVE_LOT', 'REJECT_LOT', 'LOT_STATUS_CHANGED', 'lot_created', 'lot_updated'].includes(x.action)
  ).length;
  const slotActionsCount = all.filter(x =>
    ['UPDATE_SLOT', 'slot_updated', 'pricing_updated'].includes(x.action)
  ).length;
  const userActionsCount = all.filter(x => x.action === 'USER_STATUS_CHANGED').length;

  return (
    `<div class="grid-4 live-cards">
      ${kpi('Nhật ký hệ thống (Audit)', nf(base.length), 'receipt_long', 'Bản ghi từ bảng audit_logs')}
      ${kpi('Lịch sử Chủ bãi (Manager)', nf(mgr.length), 'history', 'Bản ghi từ bảng manager_history')}
      ${kpi('Thao tác Bãi & Ô đỗ', nf(lotActionsCount + slotActionsCount), 'apartment', `${nf(lotActionsCount)} bãi đỗ · ${nf(slotActionsCount)} ô đỗ/giá`)}
      ${kpi('Thao tác Tài khoản', nf(userActionsCount), 'person', 'Khóa, mở khóa & phân quyền')}
    </div>` +
    section(
      'Nhật ký hoạt động & Lịch sử thay đổi dữ liệu',
      controls([
        ['all', 'Tất cả'],
        ['LOT_ACTIONS', 'Duyệt & Trạng thái bãi'],
        ['SLOT_ACTIONS', 'Cập nhật Ô đỗ & Giá'],
        ['USER_STATUS_CHANGED', 'Tài khoản người dùng']
      ]) +
        table(['Thời gian', 'Nguồn', 'Sự kiện', 'Thực hiện bởi', 'Đối tượng', 'Bãi đỗ xe', 'Ghi chú', 'Chi tiết'], rows),
      `Hiển thị ${filtered.length} trên tổng số ${all.length} bản ghi nhật ký`
    )
  );
}

window.EZ_RENDER = logs;
