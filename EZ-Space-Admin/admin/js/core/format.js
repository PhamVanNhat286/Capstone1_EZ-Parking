/* =============================================================
   EZ-SPACE ADMIN - js/core/format.js
   Tiện ích truy vấn DOM, định dạng số, tiền tệ và thời gian
   ============================================================= */
'use strict';

const $ = (sel, base = document) => base.querySelector(sel);
const $$ = (sel, base = document) => [...base.querySelectorAll(sel)];

const e = value =>
  String(value ?? '').replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));

const n = value => Number(value) || 0;
const nf = value => n(value).toLocaleString('vi-VN');
const money = value => `${nf(value)} ₫`;
const dt = value => (value ? e(String(value).replace('T', ' ').slice(0, 19)) : '—');
const timeOnly = value => (value ? e(String(value).slice(0, 5)) : '—');

