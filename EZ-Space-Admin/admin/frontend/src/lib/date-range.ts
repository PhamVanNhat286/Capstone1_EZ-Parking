export type RangeMode =
  | 'all'
  | 'today'
  | 'week'
  | 'month'
  | 'calendar-month'
  | 'year'
  | 'custom';

export interface RangeDraft {
  mode: RangeMode;
  year: string;
  month: string;
  from: string;
  to: string;
}

export interface RangeApiParams {
  range: string;
  from?: string;
  to?: string;
}

function formatVn(value: Date | string | number): string {
  return new Date(value).toLocaleString('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false
  });
}

export function today(): string {
  return formatVn(new Date()).slice(0, 10);
}

function invalid(message: string): never {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  throw error;
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

function rangeDates(kind: string, params: { from?: string; to?: string } = {}): void {
  if (kind === 'custom') {
    const from = parseDate(params.from);
    const end = parseDate(params.to);
    if (from > end) invalid('Từ ngày phải trước hoặc bằng đến ngày.');
    return;
  }
  if (!['today', 'week', 'month', 'all'].includes(kind)) {
    invalid('Khoảng thời gian không hợp lệ.');
  }
}

function calendarRange(
  year: string | number,
  month: string | number = 'all'
): { from: string; to: string } {
  const yearText = String(year);
  if (!/^\d{4}$/.test(yearText) || Number(yearText) < 2000) {
    invalid('Vui lòng chọn năm từ 2000 đến 9999.');
  }
  if (month === 'all') return { from: `${yearText}-01-01`, to: `${yearText}-12-31` };
  if (!/^(?:[1-9]|1[0-2])$/.test(String(month))) invalid('Tháng phải từ 1 đến 12.');
  const monthText = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(Number(yearText), Number(month), 0)).getUTCDate();
  return {
    from: `${yearText}-${monthText}-01`,
    to: `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`
  };
}

export function createInitialRangeDraft(): RangeDraft {
  const t = today();
  return {
    mode: 'all',
    year: t.slice(0, 4),
    month: String(Number(t.slice(5, 7))),
    from: t,
    to: t
  };
}

export function draftToRangeParams(draft: RangeDraft): RangeApiParams {
  if (draft.mode === 'year' || draft.mode === 'calendar-month' || draft.mode === 'custom') {
    const dates =
      draft.mode === 'custom'
        ? { from: draft.from, to: draft.to }
        : calendarRange(draft.year, draft.mode === 'year' ? 'all' : draft.month);
    rangeDates('custom', dates);
    return { range: 'custom', ...dates };
  }
  rangeDates(draft.mode);
  return { range: draft.mode };
}

export function isRangeDirty(
  draft: RangeDraft,
  appliedMode: RangeMode,
  appliedParams: RangeApiParams
): boolean {
  try {
    return (
      draft.mode !== appliedMode ||
      JSON.stringify(draftToRangeParams(draft)) !== JSON.stringify(appliedParams)
    );
  } catch {
    return true;
  }
}
