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

async function load(silent = false) {
  if (document.hidden && !silent) return;
  if (PAGE === 'settings' && settingDirty && !silent) return;
  const id = ++lastRequest;
  const btn = $('#btn-refresh');
  if (btn) btn.disabled = true;
  try {
    const [s, d] = await Promise.all([
      api('summary'),
      api(
        PAGE === 'dashboard' ? 'dashboard' : PAGE,
        'GET',
        undefined,
        PAGE === 'dashboard' || PAGE === 'revenue' ? { range: viewRange } : {}
      )
    ]);
    if (id !== lastRequest) return;
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
    if (root) {
      root.innerHTML = `<section class="card live-loading"><span class="ms">error</span><div><b>Chưa thể tải dữ liệu trang này.</b><p>${e(msg)}</p></div><button class="btn btn-sm" data-retry>Thử lại</button></section>`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

document.addEventListener('click', async ev => {
  const button = ev.target.closest('button');
  if (!button) return;
  try {
    if (button.matches('[data-retry]')) {
      await load(true);
      return;
    }
    if (button.matches('[data-range]')) {
      viewRange = button.dataset.range;
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

$('#modal-close')?.addEventListener('click', closeModal);
$('#detail-modal')?.addEventListener('click', ev => {
  if (ev.target.id === 'detail-modal') closeModal();
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') closeModal();
});
$('#btn-refresh')?.addEventListener('click', () => {
  settingDirty = false;
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
