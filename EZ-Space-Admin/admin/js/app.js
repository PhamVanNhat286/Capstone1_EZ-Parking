/* =============================================================
   EZ-SPACE ADMIN - js/app.js
   Bộ điều phối tải dữ liệu, tự động làm mới và xử lý sự kiện
   ============================================================= */
'use strict';

function render() {
  if (!lastData) return;
  const root = $('#live-root');
  if (root && typeof window.EZ_RENDER === 'function') {
    root.innerHTML = window.EZ_RENDER(lastData);
  }
}

async function load(silent = false, rangeRequest = null) {
  if (document.hidden && !silent) return;
  if (!silent && !$('#detail-modal')?.hidden) return;
  if (!silent && ($('.range-select.is-open') || document.activeElement?.closest('[data-range-controls]'))) return;
  if (!silent && (rangeLoading || rangeIsDirty())) return;
  const id = ++lastRequest;
  if (rangeRequest) rangeLoading = true;
  const btn = $('#btn-refresh');
  if (btn) btn.disabled = true;
  try {
    const [s, d] = await Promise.all([
      api('summary'),
      api(
        PAGE === 'dashboard' ? 'dashboard' : PAGE,
        'GET',
        undefined,
        PAGE === 'dashboard' || PAGE === 'revenue' ? (rangeRequest?.params || rangeParams()) : {}
      )
    ]);
    if (id !== lastRequest) return;
    if (rangeRequest) {
      viewRange = rangeRequest.params.range;
      appliedCustomRange = viewRange === 'custom' ? { from: rangeRequest.params.from, to: rangeRequest.params.to } : null;
      appliedRangeMode = rangeRequest.mode;
      // Keep alternative filter modes aligned, without overwriting edits made while loading.
      if (JSON.stringify(rangeDraft) === rangeRequest.draftSnapshot) {
        rangeDraft.from = viewRange === 'all' ? EZ_DATE_RANGE.today() : String(d.range.from).slice(0, 10);
        rangeDraft.to = viewRange === 'all' ? EZ_DATE_RANGE.today() : String(d.range.to).slice(0, 10);
        if (rangeRequest.mode !== 'year') {
          rangeDraft.year = rangeDraft.from.slice(0, 4);
          rangeDraft.month = String(Number(rangeDraft.from.slice(5, 7)));
        }
      }
    }
    rangeLoading = false;
    summary = s;
    lastData = d;
    render();
    banner('');
    $$('#admin-name').forEach(x => (x.textContent = window.adminName || 'Admin Hệ Thống'));
    $$('#admin-email').forEach(x => (x.textContent = window.adminEmail || 'admin@ezspace.vn'));
    $$('#sync-time').forEach(x => (x.textContent = 'Cập nhật: ' + String(s.server_time || '').slice(11, 19)));
    $$('[data-pending-badge]').forEach(x => {
      const pendingCount = n(s.lots?.pending);
      x.textContent = pendingCount;
      x.hidden = pendingCount === 0;
    });
  } catch (err) {
    if (id !== lastRequest) return;
    const msg = err.message || 'Không thể tải dữ liệu.';
    banner(msg);
    const root = $('#live-root');
    if (root && !lastData) {
      root.innerHTML = `<section class="card live-loading"><span class="ms">error</span><div><b>Chưa thể tải dữ liệu trang này.</b><p>${e(msg)}</p></div><button class="btn btn-sm" data-retry>Thử lại</button></section>`;
    }
  } finally {
    if (btn) btn.disabled = false;
    if (id === lastRequest) {
      rangeLoading = false;
      const apply = $('[data-apply-range]');
      if (apply) { apply.disabled = false; apply.textContent = 'Áp dụng'; }
    }
  }
}

function closeRangeMenus(except = null) {
  $$('.range-select.is-open').forEach(box => {
    if (box === except) return;
    box.classList.remove('is-open');
    box.querySelector('.range-select-trigger')?.setAttribute('aria-expanded', 'false');
    const menu = box.querySelector('.range-select-menu');
    if (menu) menu.hidden = true;
  });
}

document.addEventListener('click', async ev => {
  const trigger = ev.target.closest('[data-range-trigger]');
  if (trigger) {
    const box = trigger.closest('.range-select');
    const menu = box?.querySelector('.range-select-menu');
    if (box && menu) {
      const opening = !box.classList.contains('is-open');
      closeRangeMenus(box);
      box.classList.toggle('is-open', opening);
      trigger.setAttribute('aria-expanded', String(opening));
      menu.hidden = !opening;
    }
    return;
  }
  const option = ev.target.closest('[data-range-option]');
  if (option) {
    const field = option.dataset.rangeOption;
    const val = option.dataset.value;
    if (field === 'mode' || field === 'month') {
      rangeDraft[field] = val;
      $('#range-controls').outerHTML = ranges();
      $(`#range-${field}`)?.focus();
    }
    return;
  }
  if (!ev.target.closest('.range-select')) {
    closeRangeMenus();
  }
  const button = ev.target.closest('button');
  if (!button) return;
  try {
    if (button.matches('[data-retry]')) {
      await load(true);
      return;
    }
    if (button.matches('[data-filter]')) {
      tab = button.dataset.filter;
      render();
      return;
    }
    if (button.matches('[data-export]')) {
      exportNow();
      return;
    }
    if (button.dataset.do) {
      const id = n(button.dataset.id);
      button.disabled = true;
      if (button.dataset.do === 'lot-detail') {
        await lotDetail(id);
      } else if (button.dataset.do.startsWith('lot-')) {
        await mutateLot(button.dataset.do, id);
      } else if (button.dataset.do === 'user-detail') {
        await userDetail(id);
      } else if (button.dataset.do.startsWith('user-')) {
        await mutateUser(button.dataset.do, id);
      } else if (button.dataset.do === 'log-detail' && typeof logDetail === 'function') {
        logDetail(id);
      }
    }
  } catch (err) {
    banner(err.message);
    notice(err.message, 'bad');
  } finally {
    button.disabled = false;
  }
});

document.addEventListener('input', ev => {
  const rangeKeys = { 'range-from': 'from', 'range-to': 'to', 'range-year': 'year', 'range-month': 'month' };
  if (rangeKeys[ev.target.id]) {
    rangeDraft[rangeKeys[ev.target.id]] = ev.target.value;
    const pending = $('.range-pending');
    if (pending) pending.hidden = !rangeIsDirty();
  }
  if (ev.target.id === 'list-search') {
    search = ev.target.value;
    const start = ev.target.selectionStart;
    render();
    const el = $('#list-search');
    if (el) {
      el.focus();
      el.setSelectionRange(start, start);
    }
  }
});

document.addEventListener('change', ev => {
  if (ev.target.id !== 'range-mode') return;
  rangeDraft.mode = ev.target.value;
  $('#range-controls').outerHTML = ranges();
  $('#range-mode').focus();
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') closeRangeMenus();
});

document.addEventListener('submit', async ev => {
  if (!ev.target.matches('[data-range-form]')) return;
  ev.preventDefault();
  try {
    const params = draftRangeParams();
    const apply = $('[data-apply-range]');
    apply.disabled = true;
    apply.textContent = 'Đang tải…';
    await load(true, { params, mode: rangeDraft.mode, draftSnapshot: JSON.stringify(rangeDraft) });
  } catch (err) {
    banner(err.message);
    notice(err.message, 'bad');
  }
});

$('#modal-close')?.addEventListener('click', closeModal);
$('#detail-modal')?.addEventListener('click', ev => {
  if (ev.target.id === 'detail-modal') closeModal();
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') closeModal();
});
$('#btn-refresh')?.addEventListener('click', () => {
  load(true);
});

(async () => {
  try {
    const auth = await api('auth');
    csrf = auth.csrf;
    window.adminName = auth.user;
    window.adminEmail = auth.email;
    await load(true);
    setInterval(() => load(), 20000);
  } catch (err) {
    banner(err.message || 'Không thể kết nối máy chủ quản trị.');
  }
})();
