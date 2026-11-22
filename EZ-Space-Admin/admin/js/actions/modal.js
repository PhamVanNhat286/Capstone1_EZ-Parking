/* =============================================================
   EZ-SPACE ADMIN - js/actions/modal.js
   Đóng/mở hộp thoại xem chi tiết & hộp thoại xác nhận thao tác
   ============================================================= */
'use strict';

let activeDialogResolve = null;

function modal(title, content, isDialog = false) {
  if (activeDialogResolve) {
    const resolve = activeDialogResolve;
    activeDialogResolve = null;
    resolve(null);
  }
  const card = $('#detail-modal .live-modal-card');
  if (card) card.classList.toggle('is-dialog', Boolean(isDialog));
  $('#modal-title').textContent = title;
  $('#modal-content').innerHTML = content;
  $('#detail-modal').hidden = false;
  document.body.classList.add('modal-active');
}

function closeModal() {
  if (activeDialogResolve) {
    const resolve = activeDialogResolve;
    activeDialogResolve = null;
    resolve(null);
  }
  const el = $('#detail-modal');
  if (el) el.hidden = true;
  $('#detail-modal .live-modal-card')?.classList.remove('is-dialog');
  document.body.classList.remove('modal-active');
}

function confirmModal({
  title,
  targetName,
  targetSub = '',
  statusBadge = '',
  description = '',
  withReason = false,
  requireReason = false,
  reasonLabel = 'Lý do thực hiện',
  reasonPlaceholder = 'Nhập lý do...',
  suggestions = [],
  confirmText = 'Xác nhận',
  confirmStyle = 'btn-primary'
}) {
  const chipsHtml = suggestions.length
    ? `<div class="dialog-chips" aria-label="Gợi ý nhanh">${suggestions
        .map(text => `<button type="button" class="dialog-chip" data-dialog-chip="${e(text)}">${e(text)}</button>`)
        .join('')}</div>`
    : '';

  const reasonHtml = withReason
    ? `<div class="dialog-field">
        <label for="dialog-reason">${e(reasonLabel)} ${requireReason ? '<span class="dialog-req">*</span>' : '<span class="muted">(Tùy chọn)</span>'}</label>
        ${chipsHtml}
        <textarea id="dialog-reason" class="dialog-textarea" rows="3" maxlength="250" placeholder="${e(reasonPlaceholder)}"></textarea>
        <div id="dialog-error" class="dialog-error" hidden>Vui lòng nhập lý do tối thiểu 3 ký tự.</div>
      </div>`
    : '';

  const html = `<form id="dialog-form" class="dialog-form" novalidate>
    <div class="dialog-target">
      <div class="dialog-target-info">
        <b>${e(targetName)}</b>
        ${targetSub ? `<small>${e(targetSub)}</small>` : ''}
      </div>
      ${statusBadge}
    </div>
    ${description ? `<p class="dialog-desc">${e(description)}</p>` : ''}
    ${reasonHtml}
    <div class="dialog-actions">
      <button type="button" class="btn" data-dialog-cancel>Hủy bỏ</button>
      <button type="submit" class="btn ${e(confirmStyle)}">${e(confirmText)}</button>
    </div>
  </form>`;

  modal(title, html, true);

  return new Promise(resolve => {
    activeDialogResolve = resolve;
    const form = $('#dialog-form');
    const textarea = $('#dialog-reason');
    const errorEl = $('#dialog-error');

    if (textarea) {
      setTimeout(() => textarea.focus(), 20);
      textarea.addEventListener('input', () => {
        if (errorEl && textarea.value.trim().length >= 3) errorEl.hidden = true;
      });
    } else {
      setTimeout(() => form?.querySelector('button[type="submit"]')?.focus(), 20);
    }

    form?.addEventListener('click', ev => {
      const chip = ev.target.closest('[data-dialog-chip]');
      if (chip && textarea) {
        textarea.value = chip.dataset.dialogChip;
        if (errorEl) errorEl.hidden = true;
        textarea.focus();
        return;
      }
      if (ev.target.closest('[data-dialog-cancel]')) {
        closeModal();
      }
    });

    form?.addEventListener('submit', ev => {
      ev.preventDefault();
      const reason = textarea ? textarea.value.trim() : '';
      if (requireReason && reason.length < 3) {
        if (errorEl) errorEl.hidden = false;
        textarea?.focus();
        return;
      }
      const done = activeDialogResolve;
      activeDialogResolve = null;
      closeModal();
      if (done) done({ confirmed: true, reason });
    });
  });
}
