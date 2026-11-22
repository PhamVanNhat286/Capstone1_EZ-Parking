'use client';

import React from 'react';
import { LOT, RES, SLOT_STATUS, SLOT_TYPE } from '@/lib/constants';
import { dt, money, n, nf, timeOnly } from '@/lib/format';
import { LotDetailResponse } from '@/lib/types';
import { DataTable } from './DataTable';
import { Pill } from './Pill';

const SLOT_STYLE: Record<string, string> = {
  available: 'bg-green-100 border-green-300 text-green-800',
  holding: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  occupied: 'bg-red-100 border-red-300 text-red-800',
  unavailable: 'bg-slate-200 border-slate-300 text-slate-500'
};

interface LotDetailModalProps {
  data: LotDetailResponse;
}

export function LotDetailModal({ data }: LotDetailModalProps) {
  const x = data.lot;
  const types = data.vehicles.map(v => v.vehicle_type).join(', ') || 'Chưa cấu hình';
  const maxCol = data.slots.reduce((m, s) => Math.max(m, n(s.col_index) + 1), 5);
  const resSummary =
    data.reservations.map(r => `${RES[r.status] || r.status}: ${nf(r.amount)}`).join(' · ') ||
    'Chưa có đơn đặt chỗ';

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-x-5 gap-y-2.5 rounded-xl border border-slate-200 bg-slate-50 px-[18px] py-3.5 text-[13px] sm:grid-cols-2 [&_p]:my-1">
        <div>
          <p>
            <b>Mã bãi:</b> #{n(x.id)} · <Pill tone={x.status} label={LOT[x.status] || x.status} />
          </p>
          <p>
            <b>Địa chỉ:</b> {x.address}
          </p>
          <p>
            <b>Mô tả:</b> {x.description || '—'}
          </p>
          <p>
            <b>Tọa độ GPS:</b> {x.latitude ?? '—'}, {x.longitude ?? '—'}
          </p>
          <p>
            <b>Giờ mở cửa:</b> {timeOnly(x.open_time)} – {timeOnly(x.close_time)}
          </p>
        </div>
        <div>
          <p>
            <b>Chủ bãi / Quản lý:</b>{' '}
            {data.managers.map(m => `${m.full_name} (${m.phone || m.email})`).join(', ') ||
              'Chưa phân công'}
          </p>
          <p>
            <b>Sức chứa khai báo:</b> {nf(x.capacity)} chỗ · <b>Ô trên sơ đồ 2D:</b>{' '}
            {nf(data.slots.length)} ô
          </p>
          <p>
            <b>Loại xe hỗ trợ:</b> {types}
          </p>
          <p>
            <b>Phê duyệt bởi:</b> {x.approver_name || '—'} ({dt(x.approved_at)})
          </p>
          <p>
            <b>Thống kê đơn:</b> {resSummary}
          </p>
        </div>
      </div>

      <h3 className="mb-2.5 mt-5 text-[15px] font-bold text-slate-900">
        Sơ đồ ma trận ô đỗ 2D ({nf(data.slots.length)} ô)
      </h3>
      <div
        className="mb-3.5 mt-3 grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(88px, 1fr))` }}
      >
        {data.slots.length ? (
          data.slots.map(s => {
            const stClass = !s.is_active ? 'unavailable' : s.status;
            const stLabel = !s.is_active
              ? 'Ngưng hoạt động'
              : SLOT_STATUS[s.status] || s.status;
            const typeLabel = SLOT_TYPE[s.slot_type] || s.slot_type;
            return (
              <div
                key={s.id}
                title={`Ô ${s.code} (Hàng ${n(s.row_index) + 1}, Cột ${n(s.col_index) + 1}) - ${typeLabel} - ${stLabel}`}
                className={`flex flex-col items-center justify-center gap-1 rounded-[9px] border px-1.5 py-3 text-center text-[13px] font-bold ${
                  SLOT_STYLE[stClass] || 'border-slate-300 bg-slate-100 text-slate-700'
                }`}
              >
                <span>{s.code}</span>
                <small className="text-[10px] font-semibold opacity-85">{typeLabel}</small>
              </div>
            );
          })
        ) : (
          <span className="text-slate-500">Chưa thiết lập sơ đồ ô đỗ</span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3.5 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-[3px] bg-green-500" /> Trống (available)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-[3px] bg-yellow-400" /> Đang giữ chỗ (holding)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-[3px] bg-red-500" /> Đã có xe đỗ (occupied)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-[3px] bg-slate-400" /> Ngưng sử dụng (unavailable)
        </span>
      </div>

      <h3 className="mb-2.5 mt-5 text-[15px] font-bold text-slate-900">
        Bảng giá theo khung giờ ({nf(data.pricing.length)} quy tắc)
      </h3>
      <DataTable
        headers={['Tên quy tắc giá', 'Khung giờ', 'Giá / giờ', 'Phụ phí', 'Hiệu lực']}
        hasRows={data.pricing.length > 0}
        empty="Chưa cấu hình quy tắc giá"
      >
        {data.pricing.map(p => (
          <tr key={p.id}>
            <td>
              <b>{p.name || 'Khung giờ'}</b>
            </td>
            <td>
              {timeOnly(p.start_time)} – {timeOnly(p.end_time)}
            </td>
            <td>
              <b>{money(p.hourly_rate)}</b>
            </td>
            <td>{money(p.surcharge)}</td>
            <td>
              {p.effective_from || '—'} → {p.effective_to || '—'}
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
