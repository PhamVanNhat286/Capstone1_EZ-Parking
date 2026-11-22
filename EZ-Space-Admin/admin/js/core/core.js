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
  appliedCustomRange = null,
  appliedRangeMode = 'all',
  rangeLoading = false,
  rangeDraft = {
    mode: 'all',
    year: EZ_DATE_RANGE.today().slice(0, 4),
    month: String(Number(EZ_DATE_RANGE.today().slice(5, 7))),
    from: EZ_DATE_RANGE.today(),
    to: EZ_DATE_RANGE.today()
  },
  tab = PAGE === 'records' ? 'reservations' : 'all',
  search = '',
  lastRequest = 0,
  noticeTimer;

function rangeParams() {
  return viewRange === 'custom'
    ? { range: 'custom', ...appliedCustomRange }
    : { range: viewRange };
}

function draftRangeParams() {
  if (['year', 'calendar-month', 'custom'].includes(rangeDraft.mode)) {
    const dates = rangeDraft.mode === 'custom'
      ? { from: rangeDraft.from, to: rangeDraft.to }
      : EZ_DATE_RANGE.calendarRange(rangeDraft.year, rangeDraft.mode === 'year' ? 'all' : rangeDraft.month);
    EZ_DATE_RANGE.rangeDates('custom', dates);
    return { range: 'custom', ...dates };
  }
  EZ_DATE_RANGE.rangeDates(rangeDraft.mode);
  return { range: rangeDraft.mode };
}

function rangeIsDirty() {
  try {
    return rangeDraft.mode !== appliedRangeMode || JSON.stringify(draftRangeParams()) !== JSON.stringify(rangeParams());
  } catch (_) {
    return true;
  }
}
