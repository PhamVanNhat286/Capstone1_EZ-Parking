'use client';

import React from 'react';
import { dt, n } from '@/lib/format';
import { LogRecord } from '@/lib/types';

interface LogDetailModalProps {
  row: LogRecord;
}

export function LogDetailModal({ row }: LogDetailModalProps) {
  const hasDiff = Boolean(row.old_value || row.new_value);

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-x-5 gap-y-2.5 rounded-xl border border-slate-200 bg-slate-50 px-[18px] py-3.5 text-[13px] sm:grid-cols-2 [&_p]:my-1">
        <div>
          <p>
            <b>Mã bản ghi:</b> #{n(row.id)} (
            {row.source === 'manager' ? 'Lịch sử Quản lý bãi' : 'Nhật ký Hệ thống'})
          </p>
          <p>
            <b>Sự kiện:</b> <code className="font-mono">{row.action}</code>
          </p>
          <p>
            <b>Thời gian:</b> {dt(row.created_at)}
          </p>
        </div>
        <div>
          <p>
            <b>Thực hiện bởi:</b> {row.actor || 'Hệ thống'}{' '}
            {row.actor_email ? `(${row.actor_email})` : ''}
          </p>
          <p>
            <b>Đối tượng:</b> {row.entity_type || '—'} #{n(row.entity_id)}
          </p>
          <p>
            <b>Bãi đỗ xe:</b> {row.lot_name || '—'}
          </p>
        </div>
      </div>

      <p className="mb-3 text-[13px]">
        <b>Ghi chú:</b> {row.note || '—'}
      </p>

      {hasDiff ? (
        <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <b className="text-[13px] text-slate-900">Giá trị trước (old_value)</b>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-[10px] bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-200">
              {JSON.stringify(row.old_value ?? null, null, 2)}
            </pre>
          </div>
          <div>
            <b className="text-[13px] text-slate-900">Giá trị mới (new_value)</b>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-[10px] bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-200">
              {JSON.stringify(row.new_value ?? null, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      <h3 className="mb-2.5 mt-5 text-[15px] font-bold text-slate-900">
        Bản ghi đầy đủ (Raw JSON)
      </h3>
      <pre className="mt-2 whitespace-pre-wrap break-words rounded-[10px] bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-200">
        {JSON.stringify(row, null, 2)}
      </pre>
    </>
  );
}
