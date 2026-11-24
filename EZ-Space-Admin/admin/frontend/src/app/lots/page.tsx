'use client';

import React, { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { FilterToolbar } from '@/components/FilterToolbar';
import { KpiCard } from '@/components/KpiCard';
import { ErrorCard, LoadingCard } from '@/components/PageState';
import { Pill } from '@/components/Pill';
import { SectionCard } from '@/components/SectionCard';
import { useAdmin } from '@/context/AdminContext';
import { LOT } from '@/lib/constants';
import { downloadCsv } from '@/lib/csv';
import { money, n, nf, timeOnly } from '@/lib/format';
import { LotsResponse } from '@/lib/types';
import { useAdminActions } from '@/lib/useAdminActions';
import { useAdminPageData } from '@/lib/useAdminPageData';

const LOT_TABS: Array<[string, string]> = [
  ['all', 'Tất cả'],
  ['pending', 'Chờ duyệt'],
  ['active', 'Hoạt động'],
  ['inactive', 'Tạm ngừng'],
  ['rejected', 'Từ chối']
];

export default function LotsPage() {
  const { notice } = useAdmin();
  const { data, loadError, reload } = useAdminPageData<LotsResponse>(
    'lots',
    'Không thể tải danh sách bãi đỗ.'
  );
  const { openLotDetail, mutateLot } = useAdminActions(() => void reload(true));

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const items = useMemo(() => data?.items || [], [data]);

  const filtered = useMemo(() => {
    const kw = search.toLocaleLowerCase('vi-VN');
    return items.filter(x => {
      if (tab !== 'all' && x.status !== tab) return false;
      if (!search) return true;
      return Object.values(x).some(v =>
        String(v ?? '').toLocaleLowerCase('vi-VN').includes(kw)
      );
    });
  }, [items, tab, search]);

  function handleExport() {
    if (!filtered.length) return;
    downloadCsv(
      [
        [
          'ID', 'Tên bãi', 'Địa chỉ', 'Trạng thái', 'Sức chứa', 'Tổng ô',
          'Ô trống', 'Ô đang đỗ', 'Ô giữ chỗ', 'Quản lý', 'Người duyệt', 'Giá từ'
        ],
        ...filtered.map(x => [
          x.id, x.name, x.address, LOT[x.status] || x.status, x.capacity, x.slot_total,
          x.slot_available, x.slot_occupied, x.slot_holding, x.managers, x.approver_name, x.min_rate
        ])
      ],
      `ezspace_lots_${new Date().toISOString().slice(0, 10)}.csv`
    );
    notice('Đã xuất báo cáo CSV thành công.');
  }

  if (!data) {
    if (loadError) return <ErrorCard message={loadError} onRetry={() => void reload(true)} />;
    return <LoadingCard />;
  }

  const count = (status: string) => items.filter(x => x.status === status).length;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tổng số bãi đỗ"
          value={nf(items.length)}
          icon="apartment"
          tone="brand"
          sub={`Tổng sức chứa ${nf(items.reduce((s, x) => s + n(x.capacity), 0))} chỗ`}
        />
        <KpiCard
          label="Đang hoạt động"
          value={nf(count('active'))}
          icon="check_circle"
          tone="ok"
          sub="Đang mở nhận đặt chỗ"
        />
        <KpiCard
          label="Chờ phê duyệt"
          value={nf(count('pending'))}
          icon="pending_actions"
          tone="warn"
          sub="Cần quản trị viên thẩm định"
        />
        <KpiCard
          label="Tạm ngừng / Từ chối"
          value={nf(count('inactive') + count('rejected'))}
          icon="block"
          tone="bad"
          sub={`${nf(count('inactive'))} tạm ngừng · ${nf(count('rejected'))} từ chối`}
        />
      </div>

      <SectionCard
        title="Danh sách bãi đỗ xe trên hệ thống"
        subtitle={`Hiển thị ${filtered.length} trên tổng số ${items.length} bãi đỗ xe`}
        icon="apartment"
      >
        <FilterToolbar
          tabs={LOT_TABS}
          activeTab={tab}
          onTabChange={setTab}
          search={search}
          onSearchChange={setSearch}
          onExport={handleExport}
        />

        <DataTable
          headers={[
            'Bãi đỗ & Địa chỉ',
            'Quản lý & Phê duyệt',
            'Sức chứa / Sơ đồ 2D',
            'Loại xe / Bảng giá',
            'Giờ mở cửa',
            'Trạng thái',
            'Thao tác'
          ]}
          hasRows={filtered.length > 0}
        >
          {filtered.map(x => (
            <tr key={x.id}>
              <td>
                <b>{x.name}</b>
                <div className="mt-0.5 font-mono text-[11.5px] text-slate-500">
                  #{n(x.id)} · {x.address}
                </div>
              </td>
              <td>
                {x.managers || 'Chưa phân công'}
                <div className="mt-0.5 text-[11.5px] text-slate-500">
                  Duyệt bởi: {x.approver_name || '—'}
                </div>
              </td>
              <td>
                <b>{nf(x.capacity)}</b> chỗ khai báo
                <div className="mt-0.5 text-[11.5px] text-slate-500">
                  {nf(x.slot_total)} ô 2D · {nf(x.slot_available)} trống · {nf(x.slot_occupied)} đỗ ·{' '}
                  {nf(x.slot_holding)} giữ
                </div>
              </td>
              <td>
                <b>{x.vehicle_types || 'Chưa cấu hình'}</b>
                <div className="mt-0.5 text-[11.5px] text-slate-500">
                  Giá từ {x.min_rate === null ? '—' : money(x.min_rate)}/giờ
                </div>
              </td>
              <td>
                {timeOnly(x.open_time)} – {timeOnly(x.close_time)}
              </td>
              <td>
                <Pill tone={x.status} label={LOT[x.status] || x.status} />
              </td>
              <td>
                <div className="flex min-w-[125px] flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="btn btn-sm whitespace-nowrap"
                    onClick={() => void openLotDetail(x.id)}
                  >
                    Chi tiết
                  </button>
                  {x.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-ok whitespace-nowrap"
                        onClick={() => void mutateLot('lot-approve', x)}
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger whitespace-nowrap"
                        onClick={() => void mutateLot('lot-reject', x)}
                      >
                        Từ chối
                      </button>
                    </>
                  ) : null}
                  {x.status === 'active' ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger whitespace-nowrap"
                      onClick={() => void mutateLot('lot-suspend', x)}
                    >
                      Tạm ngừng
                    </button>
                  ) : null}
                  {x.status === 'inactive' ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-ok whitespace-nowrap"
                      onClick={() => void mutateLot('lot-activate', x)}
                    >
                      Kích hoạt
                    </button>
                  ) : null}
                  {x.status === 'rejected' || x.status === 'inactive' ? (
                    <button
                      type="button"
                      className="btn btn-sm whitespace-nowrap"
                      onClick={() => void mutateLot('lot-reconsider', x)}
                    >
                      Thẩm định lại
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>
    </>
  );
}
