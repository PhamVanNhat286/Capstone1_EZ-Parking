"use client";

import { useState } from 'react';
import { CalendarDays, Download, Search } from 'lucide-react';
import { csv, dateTime, labels, money, summarize, type Payment } from '@/lib/database-model';
import { buildRevenueReport, defaultRevenueFilter, revenueSummaryRows, type RevenueMode, type RevenueTotals } from '@/lib/revenue-report';
import { useSqlWorkspace } from './SqlWorkspace';
import SqlTable from './SqlTable';
import RevenueLineChart from './RevenueLineChart';
import { Field } from './SqlForms';
import styles from './sql-portal.module.css';
import reportStyles from './sql-revenue.module.css';

const modes: { value: RevenueMode; label: string }[] = [
  { value: 'day', label: 'Theo ngày' },
  { value: 'month', label: 'Theo tháng' },
  { value: 'year', label: 'Theo năm' },
  { value: 'range', label: 'Khoảng ngày' },
];
const groupLabels = { hour: 'giờ', day: 'ngày', month: 'tháng', year: 'năm' };
function exportCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Totals({ totals }: { totals: RevenueTotals }) {
  return <div className={`${styles.cards} ${reportStyles.totals}`} aria-label="Tổng doanh thu kỳ đang chọn">
    {[
      ['Thu thành công', money(totals.receipts), 'Tiền cọc và thanh toán cuối thành công'],
      ['Hoàn tiền thành công', money(totals.refunds), 'Các giao dịch hoàn tiền thành công'],
      ['Số giao dịch', String(totals.transactions), 'Trong kỳ và theo bộ lọc đang chọn'],
    ].map(([label, value, note]) => <article key={label} className={styles.card}><small>{label}</small><strong>{value}</strong><p>{note}</p></article>)}
  </div>;
}

export default function SqlRevenue({ onInspect }: { onInspect: (id: string) => void }) {
  const { db, selectedId } = useSqlWorkspace();
  const [filter, setFilter] = useState(() => defaultRevenueFilter());
  const [activeOnly, setActiveOnly] = useState(true);
  const report = buildRevenueReport(summarize(db, selectedId).payments, filter);
  const visibleBuckets = activeOnly ? report.buckets.filter(row => row.transactions > 0) : report.buckets;
  const tableKey = `${selectedId}-${JSON.stringify(filter)}-${activeOnly}`;
  const filename = report.period ? `${filter.mode}-${report.period.from}-${report.period.to}` : 'invalid';

  return <>
    <section className={styles.panel} aria-label="Chọn kỳ báo cáo">
      <div className={styles.panelHead}><div><h2>Kỳ báo cáo doanh thu</h2><small>Chọn ngày, tháng hoặc năm để xem tổng hợp và giao dịch trong kỳ</small></div><CalendarDays size={20} color="#2563eb" /></div>
      <div className={reportStyles.modes} role="group" aria-label="Chế độ báo cáo">
        {modes.map(mode => <button key={mode.value} type="button" aria-pressed={filter.mode === mode.value} className={filter.mode === mode.value ? styles.primary : styles.secondary} onClick={() => setFilter(current => ({ ...current, mode: mode.value }))}>{mode.label}</button>)}
      </div>
      <div className={reportStyles.filters}>
        {filter.mode === 'day' && <Field label="Ngày báo cáo"><input type="date" min="0001-01-01" max="9999-12-31" value={filter.day} onChange={e => setFilter(current => ({ ...current, day: e.target.value }))} /></Field>}
        {filter.mode === 'month' && <Field label="Tháng báo cáo"><input type="month" min="0001-01" max="9999-12" value={filter.month} onChange={e => setFilter(current => ({ ...current, month: e.target.value }))} /></Field>}
        {filter.mode === 'year' && <Field label="Năm báo cáo"><input type="number" min={1} max={9999} step={1} value={filter.year} onChange={e => setFilter(current => ({ ...current, year: e.target.value }))} /></Field>}
        {filter.mode === 'range' && <>
          <Field label="Từ ngày"><input type="date" min="0001-01-01" max="9999-12-31" value={filter.from} onChange={e => setFilter(current => ({ ...current, from: e.target.value }))} /></Field>
          <Field label="Đến ngày"><input type="date" min="0001-01-01" max="9999-12-31" value={filter.to} onChange={e => setFilter(current => ({ ...current, to: e.target.value }))} /></Field>
        </>}
        <Field label="Trạng thái thanh toán"><select value={filter.status} onChange={e => setFilter(current => ({ ...current, status: e.target.value as Payment['status'] | 'all' }))}>
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ thanh toán</option>
          <option value="success">Thành công</option>
          <option value="failed">Thất bại</option>
          <option value="refunded">Đã hoàn tiền</option>
        </select></Field>
        <button type="button" className={styles.secondary} onClick={() => setFilter(current => ({ ...defaultRevenueFilter(), mode: current.mode, status: current.status, query: current.query }))}>Kỳ hiện tại</button>
      </div>
      <p className={styles.note}>Báo cáo theo ngày thanh toán, giờ Việt Nam (UTC+7). Giao dịch chưa có ngày thanh toán được xếp theo ngày tạo.</p>
    </section>

    {report.error ? <p role="alert" className={styles.error}>{report.error}</p> : <>
      <div className={reportStyles.periodHeading} aria-live="polite"><h2>{report.period!.label}</h2><span>Tổng hợp theo {groupLabels[report.period!.group]}</span></div>
      <Totals totals={report.totals} />
      <section className={styles.panel} aria-label="Biểu đồ doanh thu">
        <div className={styles.panelHead}><div><h2>Biểu đồ doanh thu theo thời gian</h2><small>Diễn biến tiền thu và hoàn tiền theo {groupLabels[report.period!.group]} trong kỳ đang chọn</small></div></div>
        <RevenueLineChart key={tableKey} buckets={report.buckets} />
        {report.totals.transactions === 0 && <p className={styles.empty} role="status">Không có giao dịch trong kỳ theo bộ lọc đang chọn.</p>}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>Tổng hợp theo {groupLabels[report.period!.group]}</h2><button className={styles.secondary} onClick={() => exportCsv(`partner-tong-hop-${filename}.csv`, revenueSummaryRows(visibleBuckets))}><Download size={14} />Xuất tổng hợp</button></div>
        <label className={reportStyles.activeOnly}><input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} />Chỉ hiển thị kỳ có giao dịch</label>
        <SqlTable key={`summary-${tableKey}`} name="Tổng hợp doanh thu" headers={['Kỳ', 'Thu thành công', 'Hoàn tiền', 'Số giao dịch']} rows={visibleBuckets.map(row => ({ id: row.key, cells: [row.label, money(row.receipts), money(row.refunds), row.transactions] }))} />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>Giao dịch thanh toán</h2><button className={styles.secondary} onClick={() => exportCsv(`partner-giao-dich-${filename}.csv`, [
          ['id', 'reservation_id', 'provider', 'transaction_ref', 'payment_type', 'amount', 'status', 'created_at', 'paid_at'],
          ...report.payments.map(p => [p.id, p.reservation_id, p.provider, p.transaction_ref, p.payment_type, p.amount, p.status, p.created_at, p.paid_at]),
        ])}><Download size={14} />Xuất giao dịch</button></div>
        <div className={styles.toolbar}>
          <Search size={17} /><input type="search" aria-label="Tìm giao dịch doanh thu" placeholder="Tìm mã giao dịch, đơn đặt chỗ hoặc cổng thanh toán…" value={filter.query} onChange={e => setFilter(current => ({ ...current, query: e.target.value }))} />
          <button className={styles.secondary} onClick={() => setFilter(current => ({ ...current, query: '', status: 'all' }))}>Xóa bộ lọc</button>
        </div>
        <SqlTable key={`payments-${tableKey}`} name="Thanh toán" headers={['Giao dịch', 'Đặt chỗ', 'Cổng', 'Loại', 'Số tiền', 'Trạng thái', 'Thanh toán lúc']} rows={report.payments.map(p => ({ id: p.id, cells: [
          <button onClick={() => onInspect(p.id)}>#{p.id}<small>{p.transaction_ref ?? '—'}</small></button>, `#${p.reservation_id}`, p.provider.toUpperCase(), labels[p.payment_type], money(p.amount),
          <span className={styles.badge} data-state={p.status}>{p.status === 'pending' ? 'Chờ thanh toán' : labels[p.status]}</span>, dateTime(p.paid_at),
        ] }))} />
        <p className={styles.note}>Chỉ giao dịch thành công được tính vào tiền thu và hoàn tiền; không cộng lại tổng tiền đặt chỗ hoặc phiên đỗ.</p>
        {report.fallbackDates > 0 && <p className={styles.note}>{report.fallbackDates} giao dịch trong kỳ chưa có ngày thanh toán, đang được xếp theo ngày tạo.</p>}
      </section>
    </>}
  </>;
}
