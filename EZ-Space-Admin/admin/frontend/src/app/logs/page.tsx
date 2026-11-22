'use client';

import React, { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { FilterToolbar } from '@/components/FilterToolbar';
import { KpiCard } from '@/components/KpiCard';
import { LogDetailModal } from '@/components/LogDetailModal';
import { ErrorCard, LoadingCard } from '@/components/PageState';
import { Pill } from '@/components/Pill';
import { SectionCard } from '@/components/SectionCard';
import { useAdmin } from '@/context/AdminContext';
import { MANAGER_ACTION } from '@/lib/constants';
import { downloadCsv } from '@/lib/csv';
import { dt, n, nf } from '@/lib/format';
import { LogRecord, LogsResponse } from '@/lib/types';
import { useAdminPageData } from '@/lib/useAdminPageData';

const LOG_TABS: Array<[string, string]> = [
  ['all', 'Tất cả'],
  ['LOT_ACTIONS', 'Duyệt & Trạng thái bãi'],
  ['SLOT_ACTIONS', 'Cập nhật Ô đỗ & Giá'],
  ['USER_STATUS_CHANGED', 'Tài khoản người dùng']
];

const LOT_ACTION_SET = new Set([
  'APPROVE_LOT',
  'REJECT_LOT',
  'LOT_STATUS_CHANGED',
  'lot_created',
  'lot_updated'
]);
const SLOT_ACTION_SET = new Set(['UPDATE_SLOT', 'slot_updated', 'pricing_updated']);

export default function LogsPage() {
  const { notice, openModal } = useAdmin();
  const { data, loadError, reload } = useAdminPageData<LogsResponse>(
    'logs',
    'Không thể tải nhật ký hệ thống.'
  );

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const { base, mgr, all } = useMemo(() => {
    const baseList: LogRecord[] = (data?.items || []).map(x => ({
      ...x,
      id: n(x.id),
      source: 'admin',
      action: String(x.action || ''),
      category: String(x.action || ''),
      actor: x.actor ? String(x.actor) : null,
      actor_email: x.actor_email ? String(x.actor_email) : '',
      entity_type: x.entity_type ? String(x.entity_type) : null,
      entity_id: x.entity_id ? n(x.entity_id) : null,
      lot_name: x.lot_name ? String(x.lot_name) : null,
      note: x.note ? String(x.note) : null,
      created_at: String(x.created_at || '')
    }));

    const mgrList: LogRecord[] = (data?.manager_history || []).map(x => ({
      ...x,
      id: n(x.id),
      source: 'manager',
      action: String(x.action_type || ''),
      category: String(x.action_type || ''),
      user_id: n(x.manager_id),
      actor: x.actor ? String(x.actor) : null,
      actor_email: x.actor_email ? String(x.actor_email) : '',
      entity_type: 'parking_lots',
      entity_id: n(x.parking_lot_id),
      lot_name: x.lot_name ? String(x.lot_name) : null,
      note: x.note ? String(x.note) : null,
      created_at: String(x.created_at || '')
    }));

    const merged = [...baseList, ...mgrList].sort(
      (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || n(b.id) - n(a.id)
    );
    return { base: baseList, mgr: mgrList, all: merged };
  }, [data]);

  const filtered = useMemo(() => {
    const kw = search.toLocaleLowerCase('vi-VN');
    return all.filter(x => {
      const accepts =
        tab === 'all' ||
        tab === x.action ||
        tab === x.category ||
        (tab === 'LOT_ACTIONS' && LOT_ACTION_SET.has(x.action)) ||
        (tab === 'SLOT_ACTIONS' && SLOT_ACTION_SET.has(x.action));
      if (!accepts) return false;
      if (!search) return true;
      return Object.values(x).some(v =>
        String(v ?? '').toLocaleLowerCase('vi-VN').includes(kw)
      );
    });
  }, [all, tab, search]);

  function handleExport() {
    if (!filtered.length) return;
    downloadCsv(
      [
        ['Nguồn', 'ID', 'Thời gian', 'Sự kiện', 'Tác nhân', 'Đối tượng', 'Bãi đỗ', 'Ghi chú'],
        ...filtered.map(x => [
          x.source, x.id, x.created_at, x.action, x.actor,
          `${x.entity_type || ''}#${x.entity_id || ''}`, x.lot_name, x.note
        ])
      ],
      `ezspace_logs_${new Date().toISOString().slice(0, 10)}.csv`
    );
    notice('Đã xuất báo cáo CSV thành công.');
  }

  if (!data) {
    if (loadError) return <ErrorCard message={loadError} onRetry={() => void reload(true)} />;
    return <LoadingCard />;
  }

  const lotActionsCount = all.filter(x => LOT_ACTION_SET.has(x.action)).length;
  const slotActionsCount = all.filter(x => SLOT_ACTION_SET.has(x.action)).length;
  const userActionsCount = all.filter(x => x.action === 'USER_STATUS_CHANGED').length;

  return (
    <>
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Nhật ký hệ thống (Audit)"
          value={nf(base.length)}
          icon="receipt_long"
          sub="Bản ghi từ bảng audit_logs"
        />
        <KpiCard
          label="Lịch sử Chủ bãi (Manager)"
          value={nf(mgr.length)}
          icon="history"
          sub="Bản ghi từ bảng manager_history"
        />
        <KpiCard
          label="Thao tác Bãi & Ô đỗ"
          value={nf(lotActionsCount + slotActionsCount)}
          icon="apartment"
          sub={`${nf(lotActionsCount)} bãi đỗ · ${nf(slotActionsCount)} ô đỗ/giá`}
        />
        <KpiCard
          label="Thao tác Tài khoản"
          value={nf(userActionsCount)}
          icon="person"
          sub="Khóa, mở khóa & phân quyền"
        />
      </div>

      <SectionCard
        title="Nhật ký hoạt động & Lịch sử thay đổi dữ liệu"
        subtitle={`Hiển thị ${filtered.length} trên tổng số ${all.length} bản ghi nhật ký`}
      >
        <FilterToolbar
          tabs={LOG_TABS}
          activeTab={tab}
          onTabChange={setTab}
          search={search}
          onSearchChange={setSearch}
          onExport={handleExport}
        />

        <DataTable
          headers={[
            'Thời gian', 'Nguồn', 'Sự kiện', 'Thực hiện bởi',
            'Đối tượng', 'Bãi đỗ xe', 'Ghi chú', 'Chi tiết'
          ]}
          hasRows={filtered.length > 0}
        >
          {filtered.map(x => (
            <tr key={`${x.source}-${x.id}`}>
              <td>{dt(x.created_at)}</td>
              <td>
                <Pill
                  tone={x.source === 'manager' ? 'manager' : 'admin'}
                  label={x.source === 'manager' ? 'Quản lý bãi' : 'Hệ thống'}
                />
                <div className="mt-0.5 font-mono text-[11.5px] text-slate-500">#{n(x.id)}</div>
              </td>
              <td>
                <b>{MANAGER_ACTION[x.action] || x.action}</b>
                <div className="mt-0.5 font-mono text-[11.5px] text-slate-500">{x.action}</div>
              </td>
              <td>
                <b>{x.actor || 'Hệ thống'}</b>
                <div className="mt-0.5 text-[11.5px] text-slate-500">{x.actor_email || ''}</div>
              </td>
              <td className="font-mono">{x.entity_type || '—'} #{n(x.entity_id)}</td>
              <td>{x.lot_name || '—'}</td>
              <td>{x.note || '—'}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-sm whitespace-nowrap"
                  onClick={() =>
                    openModal(`Chi tiết nhật ký: ${x.action}`, <LogDetailModal row={x} />)
                  }
                >
                  Chi tiết
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>
    </>
  );
}
