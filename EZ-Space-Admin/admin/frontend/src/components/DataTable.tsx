'use client';

import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface DataTableProps {
  headers: string[];
  empty?: string;
  hasRows: boolean;
  children: ReactNode;
}

export function DataTable({
  headers,
  empty = 'Không có dữ liệu phù hợp',
  hasRows,
  children
}: DataTableProps) {
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[720px] border-collapse text-left [&_tbody_tr:hover]:bg-slate-50/80 [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr]:transition-colors [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_td]:border-b [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-4 [&_td]:align-middle [&_td]:text-[12.5px] [&_td]:leading-[1.55] [&_td]:text-slate-700 [&_td_b]:font-bold [&_td_b]:text-slate-900">
        <thead>
          <tr>
            {headers.map(h => (
              <th
                key={h}
                className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 first:pl-6 last:pr-6"
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
              <td colSpan={headers.length} className="!px-6 !py-10 text-center">
                <Icon
                  name="find_in_page"
                  className="mx-auto mb-2 text-slate-400"
                  sizeClass="h-9 w-9"
                />
                <p className="text-[13px] font-semibold text-slate-500">{empty}</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
