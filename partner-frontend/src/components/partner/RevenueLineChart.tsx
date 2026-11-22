"use client";

import { useId, useRef, useState, type PointerEvent } from 'react';
import { money } from '@/lib/database-model';
import type { RevenueBucket } from '@/lib/revenue-report';
import styles from './revenue-line-chart.module.css';

const width = 760, height = 300;
const margin = { left: 76, right: 24, top: 24, bottom: 40 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

export default function RevenueLineChart({ buckets }: { buckets: RevenueBucket[] }) {
  const gradientId = useId().replaceAll(':', '');
  const [active, setActive] = useState<number | null>(null);
  const points = useRef<(SVGGElement | null)[]>([]);
  const peak = Math.max(0, ...buckets.flatMap(row => [row.receipts, row.refunds]));
  const roughStep = Math.max(peak || 100000, .04) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = ([1, 2, 2.5, 5, 10].find(value => value * magnitude >= roughStep) ?? 10) * magnitude;
  const intervals = Math.max(1, Math.ceil((peak || 100000) / step));
  const maximum = intervals * step;
  const x = (index: number) => margin.left + (buckets.length === 1 ? plotWidth / 2 : index / Math.max(1, buckets.length - 1) * plotWidth);
  const y = (amount: number) => margin.top + plotHeight * (1 - amount / maximum);
  const line = (key: 'receipts' | 'refunds') => buckets.map((row, index) => `${x(index)},${y(row[key])}`).join(' ');
  const area = buckets.length ? `${x(0)},${y(0)} ${line('receipts')} ${x(buckets.length - 1)},${y(0)}` : '';
  const labelEvery = Math.max(1, Math.ceil((buckets.length - 1) / 6));
  const current = active === null ? null : buckets[active];
  const selectNearest = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const chartX = (event.clientX - rect.left) / rect.width * width;
    setActive(Math.max(0, Math.min(buckets.length - 1, Math.round((chartX - margin.left) / plotWidth * (buckets.length - 1)))));
  };

  return <div className={styles.root}>
    <div className={styles.legend}><span><i />Thu thành công</span><span><i />Hoàn tiền thành công</span><small>Đơn vị: VNĐ</small></div>
    <div className={styles.scroll}>
      <div className={styles.canvas}>
        <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Biểu đồ đường thu và hoàn tiền theo thời gian"
          onPointerMove={selectNearest} onPointerDown={selectNearest}
          onPointerLeave={() => { if (!points.current.some(point => point === document.activeElement)) setActive(null); }}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".16" /><stop offset="100%" stopColor="#2563eb" stopOpacity=".01" /></linearGradient></defs>
          {Array.from({ length: intervals + 1 }, (_, index) => {
            const value = index * step;
            return <g key={index} aria-hidden="true"><line x1={margin.left} x2={width - margin.right} y1={y(value)} y2={y(value)} className={styles.gridLine} /><text x={margin.left - 12} y={y(value) + 4} textAnchor="end" className={styles.axisLabel}>{value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</text></g>;
          })}
          <polygon points={area} fill={`url(#${gradientId})`} aria-hidden="true" />
          <polyline points={line('receipts')} className={styles.receipts} aria-hidden="true" />
          <polyline points={line('refunds')} className={styles.refunds} aria-hidden="true" />
          {current && <line x1={x(active!)} x2={x(active!)} y1={margin.top} y2={y(0)} className={styles.cursor} aria-hidden="true" />}
          {buckets.map((row, index) => <g key={row.key} ref={node => { points.current[index] = node; }} role="button"
            tabIndex={index === (active ?? 0) ? 0 : -1}
            aria-label={`${row.label}: thu ${money(row.receipts)}, hoàn ${money(row.refunds)}, ${row.transactions} giao dịch`}
            onFocus={() => setActive(index)} onBlur={() => setActive(null)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(index); return; }
              const next = event.key === 'ArrowRight' ? Math.min(buckets.length - 1, index + 1) : event.key === 'ArrowLeft' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? buckets.length - 1 : null;
              if (next !== null) { event.preventDefault(); points.current[next]?.focus(); }
            }}>
            <title>{`${row.label}: thu ${money(row.receipts)}, hoàn ${money(row.refunds)}`}</title>
            <circle cx={x(index)} cy={y(row.receipts)} r={active === index ? 5 : row.receipts > 0 || buckets.length === 1 ? 3 : 0} className={styles.receiptDot} />
            <circle cx={x(index)} cy={y(row.refunds)} r={active === index ? 4 : row.refunds > 0 ? 3 : 0} className={styles.refundDot} />
          </g>)}
          {buckets.map((row, index) => (index % labelEvery === 0 || index === buckets.length - 1) && <text key={row.key} x={x(index)} y={height - 13} textAnchor={index === 0 ? 'start' : index === buckets.length - 1 ? 'end' : 'middle'} className={styles.axisLabel} aria-hidden="true">{row.shortLabel}</text>)}
        </svg>
        {current && <div className={styles.tooltip} style={{ left: `${Math.max(20, Math.min(80, x(active!) / width * 100))}%` }} role="status">
          <b>{current.label}</b><span>Thu thành công<strong>{money(current.receipts)}</strong></span><span>Hoàn tiền<strong>{money(current.refunds)}</strong></span><small>{current.transactions} giao dịch</small>
        </div>}
      </div>
    </div>
    <p className={styles.hint}>Di chuột hoặc chạm để xem số tiền tại từng mốc. Dùng phím ← → để di chuyển giữa các mốc.</p>
  </div>;
}
