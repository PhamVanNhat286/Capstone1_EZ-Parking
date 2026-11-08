/* =============================================================
   EZ-SPACE ADMIN - js/actions/modal.js
   Đóng/mở hộp thoại xem chi tiết
   ============================================================= */
'use strict';

function modal(title, content) {
  $('#modal-title').textContent = title;
  $('#modal-content').innerHTML = content;
  $('#detail-modal').hidden = false;
  document.body.classList.add('modal-active');
}

function closeModal() {
  $('#detail-modal').hidden = true;
  document.body.classList.remove('modal-active');
}
