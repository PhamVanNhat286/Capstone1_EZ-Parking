/* =============================================================
   EZ-SPACE ADMIN - js/core/components.js
   Các thành phần UI dùng chung: KPI, Section, Table, Filter
   ============================================================= */
'use strict';

const pill = (key, label) => `<span class="pill ${COLORS[key] || 'muted'}">${e(label ?? key)}</span>`;

const actionButton = (kind, id, label, style = '') =>
  `<button class="btn btn-sm ${style}" data-do="${e(kind)}" data-id="${n(id)}">${e(label)}</button>`;

function kpi(label, value, icon = 'analytics', sub = '') {
  return `<div class="card kpi"><div class="kpi-top"><span>${e(label)}</span><div class="ico brand"><span class="ms">${e(icon)}</span></div></div><div class="kpi-value">${e(value)}</div><div class="kpi-sub">${sub}</div></div>`;
}

function section(title, body, subtitle = '') {
  return `<section class="card live-section"><div class="card-head"><div><h2>${e(title)}</h2>${subtitle ? `<p>${e(subtitle)}</p>` : ''}</div></div>${body}</section>`;
}

function table(headers, rows, empty = 'Không có dữ liệu phù hợp') {
  return `<div class="table-wrap"><table class="upper live-table"><thead><tr>${headers.map(x => `<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="live-empty">${e(empty)}</td></tr>`}</tbody></table></div>`;
}

function ranges() {
  return `<div class="live-toolbar"><div class="live-filters">${[
    ['today', 'Hôm nay'],
    ['week', '7 ngày'],
    ['month', 'Tháng này'],
    ['all', 'Tất cả']
  ]
    .map(([key, name]) => `<button data-range="${key}" class="btn btn-sm ${viewRange === key ? 'btn-primary' : ''}">${name}</button>`)
    .join('')}</div><span class="muted">Lọc thống kê theo khoảng thời gian.</span></div>`;
}

function controls(names) {
  return `<div class="live-toolbar"><div class="live-filters">${names
    .map(([key, name]) => `<button class="btn btn-sm ${tab === key ? 'btn-primary' : ''}" data-filter="${key}">${e(name)}</button>`)
    .join('')}</div><div class="live-toolbar-right"><input class="live-search" id="list-search" aria-label="Tìm kiếm" placeholder="Tìm theo tên, mã hoặc thông tin..." value="${e(search)}"><button class="btn btn-sm" data-export>Xuất CSV</button></div></div>`;
}

function filterRows(items, kind) {
  return items.filter(x => {
    const accepts =
      tab === 'all' ||
      (kind === 'users' && tab === 'manager' && x.role === 'manager') ||
      (kind === 'users' && tab === 'customer' && x.role === 'customer') ||
      (kind === 'users' && tab === 'admin' && x.role === 'admin') ||
      (kind === 'users' && tab === 'banned' && x.status === 'banned') ||
      (kind === 'users' && tab === 'inactive' && x.status === 'inactive') ||
      (kind === 'lots' && tab === x.status) ||
      (kind === 'logs' && (tab === x.action || tab === x.category || (tab === 'LOT_ACTIONS' && ['APPROVE_LOT', 'REJECT_LOT', 'LOT_STATUS_CHANGED', 'lot_created', 'lot_updated'].includes(x.action)) || (tab === 'SLOT_ACTIONS' && ['UPDATE_SLOT', 'slot_updated', 'pricing_updated'].includes(x.action))));
    if (!accepts) return false;
    if (!search) return true;
    const kw = search.toLocaleLowerCase('vi-VN');
    return Object.values(x).some(v => String(v ?? '').toLocaleLowerCase('vi-VN').includes(kw));
  });
}

