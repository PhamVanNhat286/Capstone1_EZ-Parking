"use client";

import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './sql-portal.module.css';

export default function SqlTable({ headers, rows, name }: {
  headers: string[];
  rows: { id: string; cells: ReactNode[] }[];
  name: string;
}) {
  const [page, setPage] = useState(0);
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / 10) - 1));
  return <>
    <div className={styles.tableScroll}>
      <table className={styles.table} aria-label={name}>
        <thead><tr>{headers.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.slice(current * 10, current * 10 + 10).map(row => <tr key={row.id}>{row.cells.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {!rows.length && <p className={styles.empty}>Chưa có dữ liệu phù hợp.</p>}
    <div className={styles.pagination}>
      <span>{rows.length ? `${current * 10 + 1}–${Math.min(rows.length, current * 10 + 10)}` : '0'} / {rows.length}</span>
      <button className={styles.secondary} disabled={current === 0} aria-label={`Trang trước: ${name}`} onClick={() => setPage(current - 1)}><ChevronLeft size={13} /></button>
      <button className={styles.secondary} disabled={(current + 1) * 10 >= rows.length} aria-label={`Trang sau: ${name}`} onClick={() => setPage(current + 1)}><ChevronRight size={13} /></button>
    </div>
  </>;
}
