'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.EZ_DATE_RANGE = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DAY = 86400000;
  const formatVn = value => new Date(value).toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
  const today = () => formatVn(new Date()).slice(0, 10);

  function invalid(message) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }

  function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      invalid('Vui lòng chọn đầy đủ từ ngày và đến ngày.');
    }
    const date = new Date(value + 'T00:00:00.000Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      invalid('Ngày được chọn không hợp lệ.');
    }
    return new Date(value + 'T00:00:00+07:00');
  }

  function rangeDates(kind, params = {}, now = new Date()) {
    if (kind === 'custom') {
      const from = parseDate(params.from);
      const end = parseDate(params.to);
      if (from > end) invalid('Từ ngày phải trước hoặc bằng đến ngày.');
      // SQL uses < to, so include the entire selected end date in Vietnam time.
      return { from: from.toISOString(), to: new Date(end.getTime() + DAY).toISOString() };
    }
    const date = formatVn(now).slice(0, 10);
    let from;
    if (kind === 'today') from = parseDate(date);
    else if (kind === 'week') from = new Date(parseDate(date).getTime() - 6 * DAY);
    else if (kind === 'month') from = parseDate(date.slice(0, 8) + '01');
    else if (kind === 'all') from = parseDate('2000-01-01');
    else invalid('Khoảng thời gian không hợp lệ.');
    return { from: from.toISOString(), to: new Date(now.getTime() + 1000).toISOString() };
  }

  function viewRange(range) {
    return { from: formatVn(range.from), to: formatVn(new Date(range.to).getTime() - 1) };
  }

  function calendarRange(year, month = 'all') {
    const yearText = String(year);
    if (!/^\d{4}$/.test(yearText) || Number(yearText) < 2000) {
      invalid('Vui lòng chọn năm từ 2000 đến 9999.');
    }
    if (month === 'all') return { from: `${yearText}-01-01`, to: `${yearText}-12-31` };
    if (!/^(?:[1-9]|1[0-2])$/.test(String(month))) invalid('Tháng phải từ 1 đến 12.');
    const monthText = String(month).padStart(2, '0');
    const lastDay = new Date(Date.UTC(Number(yearText), Number(month), 0)).getUTCDate();
    return { from: `${yearText}-${monthText}-01`, to: `${yearText}-${monthText}-${lastDay}` };
  }

  return { rangeDates, viewRange, calendarRange, formatVn, today };
});
