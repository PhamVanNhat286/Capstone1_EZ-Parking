/* =============================================================
   EZ-SPACE ADMIN - js/core.js
   Trạng thái toàn cục của trang hiện tại
   ============================================================= */
'use strict';

const PAGE = document.body.dataset.page;
const STATUS_LABELS = { paid:'Đã cọc', holding:'Giữ chỗ', entered:'Đã vào', completed:'Hoàn thành' };
let csrf = '',
  lastData = null,
  summary = null,
  viewRange='all',
  tab = PAGE === 'records' ? 'reservations' : 'all',
  search = '',
  lastRequest = 0,
  settingDirty = false,
  noticeTimer;
