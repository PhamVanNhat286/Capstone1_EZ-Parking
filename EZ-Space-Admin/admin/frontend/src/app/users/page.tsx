'use client';

import React, { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { FilterToolbar } from '@/components/FilterToolbar';
import { KpiCard } from '@/components/KpiCard';
import { ErrorCard, LoadingCard } from '@/components/PageState';
import { Pill } from '@/components/Pill';
import { SectionCard } from '@/components/SectionCard';
import { useAdmin } from '@/context/AdminContext';
import { ROLE, USER } from '@/lib/constants';
import { downloadCsv } from '@/lib/csv';
import { dt, n, nf } from '@/lib/format';
import { UsersResponse } from '@/lib/types';
import { useAdminActions } from '@/lib/useAdminActions';
import { useAdminPageData } from '@/lib/useAdminPageData';

const USER_TABS: Array<[string, string]> = [
  ['all', 'Tất cả'],
  ['customer', 'Khách hàng'],
  ['manager', 'Chủ bãi'],
  ['admin', 'Quản trị viên'],
  ['inactive', 'Tạm ngưng'],
  ['banned', 'Bị khóa']
];

export default function UsersPage() {
  const { notice } = useAdmin();
  const { data, loadError, reload } = useAdminPageData<UsersResponse>(
    'users',
    'Không thể tải danh sách người dùng.'
  );
  const { openUserDetail, mutateUser } = useAdminActions(() => void reload(true));

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const items = useMemo(() => data?.items || [], [data]);

  const filtered = useMemo(() => {
    const kw = search.toLocaleLowerCase('vi-VN');
    return items.filter(x => {
      const accepts =
        tab === 'all' ||
        (tab === 'manager' && x.role === 'manager') ||
        (tab === 'customer' && x.role === 'customer') ||
        (tab === 'admin' && x.role === 'admin') ||
        (tab === 'banned' && x.status === 'banned') ||
        (tab === 'inactive' && x.status === 'inactive');
      if (!accepts) return false;
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
        ['ID', 'Họ tên', 'Email', 'Điện thoại', 'Vai trò', 'Trạng thái', 'Số xe', 'Số đơn', 'Bãi quản lý', 'Ngày tạo'],
        ...filtered.map(x => [
          x.id, x.full_name, x.email, x.phone, ROLE[x.role] || x.role,
          USER[x.status] || x.status, x.vehicles, x.reservations, x.lots, x.created_at
        ])
      ],
      `ezspace_users_${new Date().toISOString().slice(0, 10)}.csv`
    );
    notice('Đã xuất báo cáo CSV thành công.');
  }

  if (!data) {
    if (loadError) return <ErrorCard message={loadError} onRetry={() => void reload(true)} />;
    return <LoadingCard />;
  }

  const roleCount = (r: string) => items.filter(x => x.role === r).length;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tổng tài khoản"
          value={nf(items.length)}
          icon="groups"
          tone="brand"
          sub={`${nf(items.filter(x => x.status === 'active').length)} đang hoạt động`}
        />
        <KpiCard
          label="Khách hàng (Tài xế)"
          value={nf(roleCount('customer'))}
          icon="person"
          tone="ok"
          sub="Tài khoản đặt chỗ đỗ xe"
        />
        <KpiCard
          label="Chủ bãi / Quản lý"
          value={nf(roleCount('manager'))}
          icon="store"
          tone="warn"
          sub="Quản lý vận hành bãi xe"
        />
        <KpiCard
          label="Quản trị viên"
          value={nf(roleCount('admin'))}
          icon="admin_panel_settings"
          tone="brand"
          sub={`${nf(items.filter(x => x.status === 'banned').length)} tài khoản đang bị khóa`}
        />
      </div>

      <SectionCard
        title="Danh sách người dùng hệ thống"
        subtitle={`Hiển thị ${filtered.length} trên tổng số ${items.length} tài khoản người dùng`}
        icon="group"
      >
        <FilterToolbar
          tabs={USER_TABS}
          activeTab={tab}
          onTabChange={setTab}
          search={search}
          onSearchChange={setSearch}
          onExport={handleExport}
        />

        <DataTable
          headers={[
            'Họ tên & Email',
            'Vai trò',
            'Điện thoại',
            'Hoạt động',
            'Ngày đăng ký',
            'Trạng thái',
            'Thao tác'
          ]}
          hasRows={filtered.length > 0}
        >
          {filtered.map(x => (
            <tr key={x.id}>
              <td>
                <b>{x.full_name}</b>
                <div className="mt-0.5 text-[11.5px] text-slate-500">
                  #{n(x.id)} · {x.email}
                </div>
              </td>
              <td><Pill tone={x.role} label={ROLE[x.role] || x.role} /></td>
              <td>{x.phone || '—'}</td>
              <td>
                <b>{nf(x.reservations)}</b> đơn đặt chỗ · <b>{nf(x.vehicles)}</b> xe
                <div className="mt-0.5 text-[11.5px] text-slate-500">
                  {nf(x.lots)} bãi đang quản lý
                </div>
              </td>
              <td>{dt(x.created_at)}</td>
              <td><Pill tone={x.status} label={USER[x.status] || x.status} /></td>
              <td>
                <div className="flex min-w-[125px] flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    className="btn btn-sm whitespace-nowrap"
                    onClick={() => void openUserDetail(x.id)}
                  >
                    Chi tiết
                  </button>
                  {x.role === 'admin' ? (
                    <Pill tone="brand" label="Bảo vệ" />
                  ) : x.status === 'banned' ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-ok whitespace-nowrap"
                      onClick={() => void mutateUser('user-unlock', x)}
                    >
                      Mở khóa
                    </button>
                  ) : x.status === 'inactive' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-ok whitespace-nowrap"
                        onClick={() => void mutateUser('user-unlock', x)}
                      >
                        Kích hoạt
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger whitespace-nowrap"
                        onClick={() => void mutateUser('user-lock', x)}
                      >
                        Khóa
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm whitespace-nowrap"
                        onClick={() => void mutateUser('user-inactive', x)}
                      >
                        Tạm ngưng
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger whitespace-nowrap"
                        onClick={() => void mutateUser('user-lock', x)}
                      >
                        Khóa
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>
    </>
  );
}
