import type { Payment } from './database-model';

export type RevenueMode = 'day' | 'month' | 'year' | 'range';
export type RevenueFilter = {
  mode: RevenueMode;
  day: string;
  month: string;
  year: string;
  from: string;
  to: string;
  status: Payment['status'] | 'all';
  query: string;
};
export type RevenueTotals = { receipts: number; refunds: number; adminFee: number; partnerRevenue: number; transactions: number };
export type RevenueBucket = RevenueTotals & { key: string; label: string; shortLabel: string };
type Period = { from: string; to: string; label: string; group: 'hour' | 'day' | 'month' | 'year' };

const calendar = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', hourCycle: 'h23',
});
const pad = (n: number) => String(n).padStart(2, '0');
const zero = (): RevenueTotals => ({ receipts: 0, refunds: 0, adminFee: 0, partnerRevenue: 0, transactions: 0 });
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

export function revenueCalendar(stamp: string) {
  if (!Number.isFinite(Date.parse(stamp))) throw new Error('Thời gian giao dịch không hợp lệ.');
  const parts = Object.fromEntries(calendar.formatToParts(new Date(stamp)).map(p => [p.type, p.value]));
  return { day: `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`, hour: parts.hour };
}

export function defaultRevenueFilter(now = new Date().toISOString()): RevenueFilter {
  const { day } = revenueCalendar(now);
  return { mode: 'month', day, month: day.slice(0, 7), year: day.slice(0, 4), from: `${day.slice(0, 7)}-01`, to: day, status: 'all', query: '' };
}

function validDay(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number(day.slice(0, 4)) >= 1
    && Number.isFinite(Date.parse(`${day}T00:00:00Z`))
    && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
}
const displayDay = (day: string) => day.split('-').reverse().join('/');
function monthEnd(month: string) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return `${month}-${pad(date.getUTCDate())}`;
}
function periodFor(filter: RevenueFilter): Period {
  if (filter.mode === 'day') {
    if (!validDay(filter.day)) throw new Error('Chọn ngày báo cáo hợp lệ.');
    return { from: filter.day, to: filter.day, label: `Ngày ${displayDay(filter.day)}`, group: 'hour' };
  }
  if (filter.mode === 'month') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(filter.month) || !validDay(`${filter.month}-01`)) throw new Error('Chọn tháng báo cáo hợp lệ.');
    return { from: `${filter.month}-01`, to: monthEnd(filter.month), label: `Tháng ${Number(filter.month.slice(5))}/${filter.month.slice(0, 4)}`, group: 'day' };
  }
  if (filter.mode === 'year') {
    if (!/^\d{4}$/.test(filter.year) || Number(filter.year) < 1) throw new Error('Nhập năm từ 0001 đến 9999.');
    return { from: `${filter.year}-01-01`, to: `${filter.year}-12-31`, label: `Năm ${filter.year}`, group: 'month' };
  }
  if (filter.mode !== 'range' || !validDay(filter.from) || !validDay(filter.to)) throw new Error('Chọn đủ ngày bắt đầu và ngày kết thúc hợp lệ.');
  if (filter.from > filter.to) throw new Error('Ngày bắt đầu không được sau ngày kết thúc.');
  const days = (Date.parse(`${filter.to}T00:00:00Z`) - Date.parse(`${filter.from}T00:00:00Z`)) / 86400000 + 1;
  const months = (Number(filter.to.slice(0, 4)) - Number(filter.from.slice(0, 4))) * 12 + Number(filter.to.slice(5, 7)) - Number(filter.from.slice(5, 7)) + 1;
  return { from: filter.from, to: filter.to, label: `${displayDay(filter.from)} – ${displayDay(filter.to)}`, group: days <= 366 ? 'day' : months <= 120 ? 'month' : 'year' };
}

function emptyBuckets(period: Period): RevenueBucket[] {
  const rows: RevenueBucket[] = [];
  const add = (key: string, label: string, shortLabel: string) => rows.push({ key, label, shortLabel, ...zero() });
  if (period.group === 'hour') {
    for (let h = 0; h < 24; h++) add(`${period.from}T${pad(h)}`, `${pad(h)}:00 – ${pad(h)}:59`, `${pad(h)}h`);
  } else if (period.group === 'day') {
    const end = Date.parse(`${period.to}T00:00:00Z`);
    for (let stamp = Date.parse(`${period.from}T00:00:00Z`); stamp <= end; stamp += 86400000) {
      const day = new Date(stamp).toISOString().slice(0, 10);
      add(day, displayDay(day), `${day.slice(8)}/${day.slice(5, 7)}`);
    }
  } else if (period.group === 'month') {
    const first = Number(period.from.slice(0, 4)) * 12 + Number(period.from.slice(5, 7)) - 1;
    const last = Number(period.to.slice(0, 4)) * 12 + Number(period.to.slice(5, 7)) - 1;
    for (let index = first; index <= last; index++) {
      const year = Math.floor(index / 12), month = index % 12 + 1;
      const key = `${String(year).padStart(4, '0')}-${pad(month)}`;
      add(key, `Tháng ${month}/${year}`, `T${month}`);
    }
  } else {
    for (let year = Number(period.from.slice(0, 4)); year <= Number(period.to.slice(0, 4)); year++) add(String(year).padStart(4, '0'), `Năm ${year}`, String(year));
  }
  return rows;
}

export function buildRevenueReport(payments: readonly Payment[], filter: RevenueFilter) {
  let period: Period;
  try { period = periodFor(filter); } catch (error) {
    return { error: error instanceof Error ? error.message : 'Khoảng thời gian không hợp lệ.', period: null, payments: [] as Payment[], buckets: [] as RevenueBucket[], totals: zero(), fallbackDates: 0 };
  }
  const buckets = emptyBuckets(period);
  const byKey = new Map(buckets.map(row => [row.key, row]));
  const totals = zero();
  const query = normalize(filter.query.trim());
  let fallbackDates = 0;
  const selected = payments.filter(p => {
    if (filter.status !== 'all' && filter.status !== p.status) return false;
    if (!normalize([p.id, p.reservation_id, p.transaction_ref, p.provider].join(' ')).includes(query)) return false;
    const { day } = revenueCalendar(p.paid_at ?? p.created_at);
    return day >= period.from && day <= period.to;
  }).sort((a, b) => Date.parse(b.paid_at ?? b.created_at) - Date.parse(a.paid_at ?? a.created_at));
  // Accumulate integer cents to preserve numeric(12,2) values across buckets.
  for (const p of selected) {
    const { day, hour } = revenueCalendar(p.paid_at ?? p.created_at);
    const key = period.group === 'hour' ? `${day}T${hour}` : period.group === 'day' ? day : period.group === 'month' ? day.slice(0, 7) : day.slice(0, 4);
    const row = byKey.get(key)!;
    row.transactions++;
    totals.transactions++;
    if (!p.paid_at) fallbackDates++;
    if (p.status !== 'success') continue;
    const amount = Math.round(p.amount * 100);
    if (p.payment_type === 'refund') { row.refunds += amount; totals.refunds += amount; }
    else {
      // Round the 5% share once per successful receipt to SQL's two decimal places.
      // Summing the same shares keeps day/month/year reports consistent.
      const adminFee = Math.round(amount * 5 / 100);
      row.receipts += amount; totals.receipts += amount;
      row.adminFee += adminFee; totals.adminFee += adminFee;
      row.partnerRevenue += amount - adminFee; totals.partnerRevenue += amount - adminFee;
    }
  }
  for (const row of [...buckets, totals]) {
    row.receipts /= 100;
    row.refunds /= 100;
    row.adminFee /= 100;
    row.partnerRevenue /= 100;
  }
  return { error: '', period, payments: selected, buckets, totals, fallbackDates };
}

/**
 * All-time totals with the same rule as the revenue report: successful deposit/final payments are receipts,
 * Admin keeps 5% of each receipt (rounded per transaction), Partner keeps the rest; refunds are shown separately.
 */
export function revenueTotals(payments: readonly Payment[]) {
  const counted = payments.filter(p => p.status === 'success' && p.payment_type !== 'refund')
    .sort((a, b) => Date.parse(b.paid_at ?? b.created_at) - Date.parse(a.paid_at ?? a.created_at));
  let receipts = 0, adminFee = 0, refunds = 0;
  for (const p of counted) { const cents = Math.round(p.amount * 100); receipts += cents; adminFee += Math.round(cents * 5 / 100); }
  for (const p of payments) if (p.status === 'success' && p.payment_type === 'refund') refunds += Math.round(p.amount * 100);
  return { counted, receipts: receipts / 100, adminFee: adminFee / 100, partnerRevenue: (receipts - adminFee) / 100, refunds: refunds / 100 };
}

export function revenueSummaryRows(buckets: readonly RevenueBucket[]): unknown[][] {
  return [['Kỳ', 'Thu thành công (VND)', 'Phí Admin 5% (VND)', 'Partner sau phí Admin (VND)', 'Hoàn tiền thành công (VND)', 'Số giao dịch'],
    ...buckets.map(b => [b.label, b.receipts, b.adminFee, b.partnerRevenue, b.refunds, b.transactions])];
}
