/* =============================================================
   EZ-SPACE ADMIN - js/actions/log-detail.js
   Xem chi tiết bản ghi nhật ký hệ thống & đối chiếu JSON trước/sau
   ============================================================= */
'use strict';

function logDetail(id) {
  const row = (window.liveLogs || []).find(
    x => n(x.id) === Math.abs(id) && x.source === (id < 0 ? 'manager' : 'admin')
  );
  if (!row) return;
  const hasDiff = row.old_value || row.new_value;
  const diffHtml = hasDiff
    ? `<div class="log-diff-grid">
        <div>
          <b>Giá trị trước (old_value)</b>
          <pre class="json-pre">${e(JSON.stringify(row.old_value ?? null, null, 2))}</pre>
        </div>
        <div>
          <b>Giá trị mới (new_value)</b>
          <pre class="json-pre">${e(JSON.stringify(row.new_value ?? null, null, 2))}</pre>
        </div>
      </div>`
    : '';

  modal(
    `Chi tiết nhật ký: ${row.action}`,
    `<div class="user-detail-grid">
      <div>
        <p><b>Mã bản ghi:</b> #${n(row.id)} (${row.source === 'manager' ? 'Lịch sử Quản lý bãi' : 'Nhật ký Hệ thống'})</p>
        <p><b>Sự kiện:</b> <code>${e(row.action)}</code></p>
        <p><b>Thời gian:</b> ${dt(row.created_at)}</p>
      </div>
      <div>
        <p><b>Thực hiện bởi:</b> ${e(row.actor || 'Hệ thống')} ${row.actor_email ? `(${e(row.actor_email)})` : ''}</p>
        <p><b>Đối tượng:</b> ${e(row.entity_type || '—')} #${n(row.entity_id)}</p>
        <p><b>Bãi đỗ xe:</b> ${e(row.lot_name || '—')}</p>
      </div>
    </div>
    <p style="margin-bottom:12px"><b>Ghi chú:</b> ${e(row.note || '—')}</p>
    ${diffHtml}
    <h3>Bản ghi đầy đủ (Raw JSON)</h3>
    <pre class="json-pre">${e(JSON.stringify(row, null, 2))}</pre>`
  );
}

