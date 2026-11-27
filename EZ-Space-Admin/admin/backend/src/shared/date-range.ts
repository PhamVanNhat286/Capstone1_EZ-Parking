interface DateRangeBounds {
  from: string;
  to: string;
}

export interface RangeQueryParams {
  range?: string;
  from?: string;
  to?: string;
}

class RangeValidationError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.name = 'RangeValidationError';
    this.status = 400;
  }
}

const DAY = 86400000;

function formatVn(value: Date | string | number): string {
  return new Date(value).toLocaleString('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false
  });
}

function invalid(message: string): never {
  throw new RangeValidationError(message);
}

function parseDate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalid('Vui lòng chọn đầy đủ từ ngày và đến ngày.');
  }
  const date = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    invalid('Ngày được chọn không hợp lệ.');
  }
  return new Date(value + 'T00:00:00+07:00');
}

export function rangeDates(
  kind: string,
  params: RangeQueryParams = {},
  now: Date = new Date()
): DateRangeBounds {
  if (kind === 'custom') {
    const from = parseDate(params.from);
    const end = parseDate(params.to);
    if (from > end) invalid('Từ ngày phải trước hoặc bằng đến ngày.');
    // SQL uses < to, so include the entire selected end date in Vietnam time.
    return {
      from: from.toISOString(),
      to: new Date(end.getTime() + DAY).toISOString()
    };
  }
  const date = formatVn(now).slice(0, 10);
  let from: Date;
  if (kind === 'today') from = parseDate(date);
  else if (kind === 'week') from = new Date(parseDate(date).getTime() - 6 * DAY);
  else if (kind === 'month') from = parseDate(date.slice(0, 8) + '01');
  else if (kind === 'all') from = parseDate('2000-01-01');
  else invalid('Khoảng thời gian không hợp lệ.');

  return {
    from: from.toISOString(),
    to: new Date(now.getTime() + 1000).toISOString()
  };
}

export function viewRange(range: DateRangeBounds): DateRangeBounds {
  return {
    from: formatVn(range.from),
    to: formatVn(new Date(range.to).getTime() - 1)
  };
}

export function calendarRange(
  year: string | number,
  month: string | number = 'all'
): { from: string; to: string } {
  const yearText = String(year);
  if (!/^\d{4}$/.test(yearText) || Number(yearText) < 2000) {
    invalid('Vui lòng chọn năm từ 2000 đến 9999.');
  }
  if (month === 'all') {
    return { from: `${yearText}-01-01`, to: `${yearText}-12-31` };
  }
  if (!/^(?:[1-9]|1[0-2])$/.test(String(month))) {
    invalid('Tháng phải từ 1 đến 12.');
  }
  const monthText = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(Number(yearText), Number(month), 0)).getUTCDate();
  return {
    from: `${yearText}-${monthText}-01`,
    to: `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`
  };
}

