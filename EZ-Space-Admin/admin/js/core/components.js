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

function rangeSelect(id, name, value, options) {
  const current = options.find(([k]) => String(k) === String(value)) || options[0];
  const items = options
    .map(([k, label]) => {
      const selected = String(k) === String(current[0]);
      return `<button type="button" class="range-select-option${selected ? ' is-selected' : ''}" role="option" aria-selected="${selected}" data-range-option="${e(name)}" data-value="${e(k)}"><span>${e(label)}</span>${selected ? '<svg class="range-select-check" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16.25 5.625L8.125 13.75L3.75 9.375" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</button>`;
    })
    .join('');
  return `<div class="range-select" data-range-select="${e(name)}">
    <input type="hidden" name="${e(name)}" value="${e(current[0])}">
    <button type="button" id="${e(id)}" class="range-select-trigger" data-range-trigger="${e(name)}" aria-haspopup="listbox" aria-expanded="false">
      <span class="range-select-label">${e(current[1])}</span>
      <svg class="range-select-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5.5 7.75L10 12.25L14.5 7.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="range-select-menu" role="listbox" aria-labelledby="${e(id)}" hidden>${items}</div>
  </div>`;
}

function ranges() {
  const activeRange = lastData?.range;
  const dateLabel = value => String(value).slice(0, 10).split('-').reverse().join('/');
  const caption = viewRange === 'all' ? 'Đang xem: Tất cả thời gian' : activeRange
    ? `Đang xem: ${dateLabel(activeRange.from)} – ${dateLabel(activeRange.to)}` : '';
  const mode = rangeDraft.mode;
  const modes = [['all', 'Tất cả thời gian'], ['today', 'Hôm nay'], ['week', '7 ngày gần đây'],
    ['month', 'Tháng này'], ['calendar-month', 'Theo tháng'], ['year', 'Theo năm'], ['custom', 'Khoảng ngày']];
  const months = Array.from({ length: 12 }, (_, i) => [String(i + 1), `Tháng ${i + 1}`]);
  const yearField = `<div class="range-field range-year"><label for="range-year">Năm</label><input id="range-year" name="year" type="number" min="2000" max="9999" step="1" value="${e(rangeDraft.year)}" required></div>`;
  const monthField = `<div class="range-field range-month"><label for="range-month">Tháng</label>${rangeSelect('range-month', 'month', rangeDraft.month, months)}</div>`;
  const dateFields = `<div class="range-field"><label for="range-from">Từ ngày</label><input id="range-from" name="from" type="date" value="${e(rangeDraft.from)}" required></div>
    <div class="range-field"><label for="range-to">Đến ngày</label><input id="range-to" name="to" type="date" value="${e(rangeDraft.to)}" required></div>`;

  return `<div class="range-toolbar" id="range-controls" data-range-controls>
    <form class="range-filter" data-range-form aria-label="Lọc thời gian thống kê">
      <div class="range-filter-fields">
        <div class="range-field range-mode"><label for="range-mode">Thời gian</label>${rangeSelect('range-mode', 'mode', mode, modes)}</div>
        ${mode === 'year' ? yearField : mode === 'calendar-month' ? monthField + yearField : mode === 'custom' ? dateFields : ''}
        <button type="submit" class="btn btn-sm btn-primary" data-apply-range ${rangeLoading ? 'disabled' : ''}>${rangeLoading ? 'Đang tải…' : 'Áp dụng'}</button>
      </div>
      <div class="range-filter-status" aria-live="polite">
        <span class="range-caption">${e(caption)}</span>
        <span class="range-pending" ${rangeIsDirty() ? '' : 'hidden'}>Thay đổi chưa áp dụng</span>
      </div>
    </form>
  </div>`;
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

