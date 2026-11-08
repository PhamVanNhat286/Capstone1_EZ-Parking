/* =============================================================
   EZ-SPACE ADMIN - js/core/api.js
   Giao tiếp HTTP API và tự động đồng bộ dữ liệu schema.sql / seed.sql
   ============================================================= */
'use strict';

function notice(msg, type = 'ok') {
  const el = $('#toast');
  if (!el) {
    alert(msg);
    return;
  }
  $('#toast-msg').textContent = msg;
  $('#toast-icon').textContent = type === 'bad' ? 'error' : 'check_circle';
  el.className = 'toast show ' + type;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

function banner(msg) {
  const b = $('#error-banner');
  if (!b) return;
  b.hidden = !msg;
  if (msg) b.textContent = msg;
}

function getCandidateApiBases() {
  const bases = [];
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    const port = window.location.port;
    if (port === '8000' || port === '8001') {
      bases.push(window.location.origin + '/api/admin');
    } else {
      bases.push('http://127.0.0.1:8000/api/admin');
      bases.push(window.location.origin + '/api/admin');
    }
  } else {
    bases.push('http://127.0.0.1:8000/api/admin');
  }
  return bases;
}

async function syncFromAppBackendIfAvailable() {
  if (!window.EZ_SEED_STORE) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch('http://localhost:5000/api/lots', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const json = await res.json();
    if (json && Array.isArray(json.data)) {
      for (const liveLot of json.data) {
        const target = window.EZ_SEED_STORE.db.parking_lots.find(x => Number(x.id) === Number(liveLot.id));
        if (target) {
          target.name = liveLot.name || target.name;
          target.address = liveLot.address || target.address;
          target.capacity = Number(liveLot.capacity ?? target.capacity);
        }
      }
    }
  } catch (_) {}
}

async function api(action, method = 'GET', data, params = {}) {
  const bases = getCandidateApiBases();
  let lastHttpError = null;

  for (const base of bases) {
    try {
      const url = new URL(base);
      url.searchParams.set('action', action);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const opt = {
        method,
        credentials: base.startsWith(window.location.origin) ? 'same-origin' : 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      };
      if (method !== 'GET') {
        opt.headers['Content-Type'] = 'application/json';
        opt.headers['X-CSRF-Token'] = csrf || 'ez-seed-csrf';
        opt.body = JSON.stringify(data || {});
      }
      const response = await fetch(url, opt);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        continue;
      }
      const result = await response.json();
      if (!response.ok) {
        if (response.status >= 500 && window.EZ_SEED_STORE) {
          break;
        }
        lastHttpError = new Error(result.error || `Lỗi HTTP ${response.status}`);
        throw lastHttpError;
      }
      return result;
    } catch (err) {
      if (err === lastHttpError) throw err;
      // Nếu cổng máy chủ chưa mở hoặc đang mở bằng Live Server, tiếp tục thử phương án kế tiếp
    }
  }

  if (window.EZ_SEED_STORE && typeof window.EZ_SEED_STORE.handleRequest === 'function') {
    if (action === 'summary' || action === 'lots') {
      await syncFromAppBackendIfAvailable();
    }
    return window.EZ_SEED_STORE.handleRequest(action, method, data, params);
  }

  throw new Error('Không thể tải dữ liệu quản trị.');
}
