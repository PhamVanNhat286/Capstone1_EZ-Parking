'use client';

import React from 'react';

interface DataTableProps {
  headers: string[];
  empty?: string;
  hasRows: boolean;
  children: React.ReactNode;
}

export function DataTable({
  headers,
  empty = 'Không có dữ liệu phù hợp',
  hasRows,
  children
}: DataTableProps) {
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[720px] border-collapse text-left [&_tbody_tr:hover]:bg-page [&_tbody_tr:last-child_td]:border-b-0 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_td]:border-b [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-4 [&_td]:align-middle [&_td]:text-[12.5px] [&_td]:leading-[1.55] [&_td]:text-slate-700 [&_td_b]:font-bold [&_td_b]:text-slate-900">
        <thead>
          <tr>
            {headers.map(h => (
              <th
                key={h}
                className="whitespace-nowrap border-b border-slate-200 bg-page px-3 py-3.5 text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-400 first:pl-6 last:pr-6"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={headers.length} className="!px-4 !py-7 text-center text-slate-400">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
