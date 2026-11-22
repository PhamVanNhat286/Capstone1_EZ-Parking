'use client';

import React from 'react';
import { DataTable } from '@/components/DataTable';
import { ErrorCard, LoadingCard } from '@/components/PageState';
import { Pill } from '@/components/Pill';
import { SectionCard } from '@/components/SectionCard';
import { LOT } from '@/lib/constants';
import { dt, money, n, timeOnly } from '@/lib/format';
import { SettingsResponse } from '@/lib/types';
import { useAdminPageData } from '@/lib/useAdminPageData';

export default function SettingsPage() {
  const { data, loadError, reload } = useAdminPageData<SettingsResponse>(
    'settings',
    'Không thể tải cài đặt nền tảng.'
  );

  if (!data) {
    if (loadError) return <ErrorCard message={loadError} onRetry={() => void reload(true)} />;
    return <LoadingCard />;
  }

  return (
    <>
      <SectionCard
        title="Quy tắc nghiệp vụ & Thông số vận hành hệ thống"
        subtitle="Các quy chuẩn đặt chỗ, giữ chỗ, vé QR và phương thức thanh toán đang áp dụng trên toàn hệ thống."
      >
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 pt-5 md:grid-cols-2 xl:grid-cols-3">
          {(data.rules || []).map(r => (
            <div
              key={r.code}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-[18px] py-4"
            >
              <div className="flex items-center justify-between gap-2">
                <b className="text-[13.5px] text-slate-900">{r.name}</b>
                <Pill tone="brand" label={r.code} mono />
              </div>
              <div className="text-[15px] font-extrabold text-brand">{r.value}</div>
              <p className="text-xs leading-[1.55] text-slate-500">{r.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Cấu hình Bảng giá theo khung giờ tại các bãi đỗ (Pricing Rules)"
        subtitle={`Đang áp dụng ${(data.pricing || []).length} quy tắc tính giá theo khung giờ.`}
      >
        <DataTable
          headers={[
            'Bãi đỗ xe', 'Tên khung giá', 'Khung giờ áp dụng',
            'Đơn giá / giờ', 'Phụ phí giờ cao điểm', 'Thời hạn hiệu lực'
          ]}
          hasRows={(data.pricing || []).length > 0}
        >
          {(data.pricing || []).map(p => (
            <tr key={p.id}>
              <td>
                <b>{p.lot_name}</b>
                <div className="mt-0.5 font-mono text-[11.5px] text-slate-500">
                  Bãi #{n(p.parking_lot_id)}
                </div>
              </td>
              <td><b>{p.name || 'Khung giờ tiêu chuẩn'}</b></td>
              <td>{timeOnly(p.start_time)} – {timeOnly(p.end_time)}</td>
              <td><b>{money(p.hourly_rate)}</b></td>
              <td>{money(p.surcharge)}</td>
              <td>{p.effective_from || '—'} → {p.effective_to || '—'}</td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Phân công Chủ bãi / Quản lý vận hành"
          subtitle="Danh sách phân quyền quản lý bãi xe (parking_lot_managers)."
        >
          <DataTable
            headers={['Bãi đỗ xe', 'Người quản lý', 'Điện thoại', 'Ngày phân công']}
            hasRows={(data.managers || []).length > 0}
          >
            {(data.managers || []).map(m => (
              <tr key={m.id}>
                <td>
                  <b>{m.lot_name}</b>
                  <div className="mt-0.5 text-[11.5px] text-slate-500">
                    <Pill tone={m.lot_status} label={LOT[m.lot_status] || m.lot_status} />
                  </div>
                </td>
                <td>
                  <b>{m.full_name}</b>
                  <div className="mt-0.5 text-[11.5px] text-slate-500">
                    #{n(m.manager_id)} · {m.email}
                  </div>
                </td>
                <td>{m.phone || '—'}</td>
                <td>{dt(m.assigned_at)}</td>
              </tr>
            ))}
          </DataTable>
        </SectionCard>

        <SectionCard
          title="Phân loại phương tiện cho phép theo bãi"
          subtitle="Cấu hình loại xe hỗ trợ tại từng bãi (parking_lot_vehicle_types)."
        >
          <DataTable
            headers={['Bãi đỗ xe', 'Loại xe được phép đỗ']}
            hasRows={(data.lot_vehicles || []).length > 0}
          >
            {(data.lot_vehicles || []).map(v => (
              <tr key={v.parking_lot_id}>
                <td>
                  <b>{v.lot_name}</b>
                  <div className="mt-0.5 font-mono text-[11.5px] text-slate-500">
                    Bãi #{n(v.parking_lot_id)}
                  </div>
                </td>
                <td>
                  {v.vehicle_types ? (
                    <div className="flex flex-wrap gap-1.5">
                      {v.vehicle_types.split(', ').map(t => (
                        <Pill key={t} tone="brand" label={t} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Chưa cấu hình</span>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        </SectionCard>
      </div>
    </>
  );
}
