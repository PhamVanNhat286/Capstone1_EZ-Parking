"use client";

import { useRef, useState, type PointerEvent } from 'react';
import { money } from '@/lib/database-model';
import type { RevenueBucket } from '@/lib/revenue-report';
import styles from './revenue-bar-chart.module.css';

const height = 300;
const margin = { left: 76, right: 24, top: 24, bottom: 40 };
const plotHeight = height - margin.top - margin.bottom;

export default function RevenueBarChart({ buckets }: { buckets: RevenueBucket[] }) {
  const width = Math.max(760, buckets.length * 28 + margin.left + margin.right);
  const plotWidth = width - margin.left - margin.right;
  const groupWidth = plotWidth / Math.max(1, buckets.length);
  const barWidth = Math.min(16, groupWidth * .22);
  const [active, setActive] = useState<number | null>(null);
  const points = useRef<(SVGGElement | null)[]>([]);
  const peak = Math.max(0, ...buckets.flatMap(row => [row.receipts, row.refunds]));
  const roughStep = Math.max(peak || 100000, .04) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = ([1, 2, 2.5, 5, 10].find(value => value * magnitude >= roughStep) ?? 10) * magnitude;
  const intervals = Math.max(1, Math.ceil((peak || 100000) / step));
  const maximum = intervals * step;
  const x = (index: number) => margin.left + (index + .5) * groupWidth;
  const y = (amount: number) => margin.top + plotHeight * (1 - amount / maximum);
  const labelEvery = Math.max(1, Math.ceil(80 / groupWidth));
  const current = active === null ? null : buckets[active];
  const selectNearest = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const chartX = (event.clientX - rect.left) / rect.width * width;
    setActive(Math.max(0, Math.min(buckets.length - 1, Math.floor((chartX - margin.left) / groupWidth))));
  };

  return <div className={styles.root}>
    <div className={styles.legend}><span><i />Thu thành công</span><span><i />Hoàn tiền thành công</span><span><i />Partner sau phí Admin 5%</span><small>Đơn vị: VNĐ</small></div>
    <div className={styles.scroll}>
      <div className={styles.canvas} style={{ minWidth: width }}>
        <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Biểu đồ cột doanh thu và hoàn tiền theo thời gian"
          onPointerMove={selectNearest} onPointerDown={selectNearest}
          onPointerLeave={() => { if (!points.current.some(point => point === document.activeElement)) setActive(null); }}>
          {Array.from({ length: intervals + 1 }, (_, index) => {
            const value = index * step;
            return <g key={index} aria-hidden="true"><line x1={margin.left} x2={width - margin.right} y1={y(value)} y2={y(value)} className={styles.gridLine} /><text x={margin.left - 12} y={y(value) + 4} textAnchor="end" className={styles.axisLabel}>{value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</text></g>;
          })}
          <line x1={margin.left} x2={width - margin.right} y1={y(0)} y2={y(0)} className={styles.baseline} aria-hidden="true" />
          {buckets.map((row, index) => <g key={row.key} ref={node => { points.current[index] = node; }} role="button"
            tabIndex={index === (active ?? 0) ? 0 : -1}
            aria-label={`${row.label}: thu ${money(row.receipts)}, phí Admin ${money(row.adminFee)}, Partner ${money(row.partnerRevenue)}, hoàn ${money(row.refunds)}, ${row.transactions} giao dịch`}
            onFocus={() => setActive(index)} onBlur={() => setActive(null)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(index); return; }
              const next = event.key === 'ArrowRight' ? Math.min(buckets.length - 1, index + 1) : event.key === 'ArrowLeft' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? buckets.length - 1 : null;
              if (next !== null) { event.preventDefault(); points.current[next]?.focus(); }
            }}>
            <title>{`${row.label}: thu ${money(row.receipts)}, phí Admin ${money(row.adminFee)}, Partner ${money(row.partnerRevenue)}, hoàn ${money(row.refunds)}`}</title>
            <rect x={x(index) - groupWidth / 2 + 1} y={margin.top} width={Math.max(0, groupWidth - 2)} height={plotHeight} className={styles.selection} data-active={active === index} />
            {(['receipts', 'refunds', 'partnerRevenue'] as const).map((key, series) => <rect key={key}
              x={x(index) + (series - 1) * (barWidth + 1) - barWidth / 2}
              y={y(row[key])} width={barWidth} height={Math.max(0, y(0) - y(row[key]))}
              rx={1.5} className={styles[key]} aria-hidden="true" />)}
          </g>)}
          {buckets.map((row, index) => (index % labelEvery === 0 || index === buckets.length - 1) && <text key={row.key} x={x(index)} y={height - 13} textAnchor={index === 0 ? 'start' : index === buckets.length - 1 ? 'end' : 'middle'} className={styles.axisLabel} aria-hidden="true">{row.shortLabel}</text>)}
        </svg>
        {current && <div className={styles.tooltip} style={{ left: `${Math.max(20, Math.min(80, x(active!) / width * 100))}%` }} role="status">
          <b>{current.label}</b><span>Thu thành công<strong>{money(current.receipts)}</strong></span><span>Hoàn tiền<strong>{money(current.refunds)}</strong></span><span>Phí Admin 5%<strong>{money(current.adminFee)}</strong></span><span>Partner sau phí Admin<strong>{money(current.partnerRevenue)}</strong></span><small>{current.transactions} giao dịch</small>
        </div>}
      </div>
    </div>
    <p className={styles.hint}>Mỗi nhóm cột là một mốc thời gian. Di chuột hoặc chạm để xem số tiền; dùng phím ← → để chuyển mốc. Cuộn ngang để xem đủ các mốc.</p>
  </div>;
}
