'use client';

import React from 'react';
import { LOT, RES, ROLE, USER } from '@/lib/constants';
import { dt, money, n, nf } from '@/lib/format';
import { UserDetailResponse } from '@/lib/types';
import { DataTable } from './DataTable';
import { Pill } from './Pill';

interface UserDetailModalProps {
  data: UserDetailResponse;
}

export function UserDetailModal({ data }: UserDetailModalProps) {
  const u = data.user;

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-x-5 gap-y-2.5 rounded-xl border border-slate-200 bg-slate-50 px-[18px] py-3.5 text-[13px] sm:grid-cols-2 [&_p]:my-1">
        <div>
          <p>
            <b>ID tài khoản:</b> #{n(u.id)}
          </p>
          <p>
            <b>Họ và tên:</b> {u.full_name}
          </p>
          <p>
            <b>Email:</b> {u.email}
          </p>
          <p>
            <b>Số điện thoại:</b> {u.phone || '—'}
          </p>
        </div>
        <div>
          <p>
            <b>Vai trò:</b> <Pill tone={u.role} label={ROLE[u.role] || u.role} />
          </p>
          <p>
            <b>Trạng thái:</b> <Pill tone={u.status} label={USER[u.status] || u.status} />
          </p>
          <p>
            <b>Ngày đăng ký:</b> {dt(u.created_at)}
          </p>
        </div>
      </div>

      {data.lots.length > 0 ? (
        <>
          <h3 className="mb-2.5 mt-5 text-[15px] font-bold text-slate-900">
            Bãi đỗ xe đang quản lý ({nf(data.lots.length)})
          </h3>
          <DataTable
            headers={['Bãi đỗ & Địa chỉ', 'Sức chứa', 'Trạng thái', 'Phân công lúc']}
            hasRows={data.lots.length > 0}
          >
            {data.lots.map(l => (
              <tr key={l.id}>
                <td>
                  <b>{l.name}</b>
                  <div className="mt-0.5 text-[11.5px] text-slate-500">
                    #{n(l.id)} · {l.address}
                  </div>
                </td>
                <td>{nf(l.capacity)} chỗ</td>
                <td>
                  <Pill tone={l.status} label={LOT[l.status] || l.status} />
                </td>
                <td>{dt(l.assigned_at)}</td>
              </tr>
            ))}
          </DataTable>
        </>
      ) : null}

      <h3 className="mb-2.5 mt-5 text-[15px] font-bold text-slate-900">
        Phương tiện cá nhân đã đăng ký ({nf(data.vehicles.length)})
      </h3>
      <DataTable
        headers={['Biển số xe', 'Tên hiển thị', 'Loại xe', 'Mặc định', 'Ngày thêm']}
        hasRows={data.vehicles.length > 0}
        empty="Người dùng chưa đăng ký phương tiện"
      >
        {data.vehicles.map(v => (
          <tr key={v.id}>
            <td className="font-mono">
              <b>{v.license_plate}</b>
            </td>
            <td>{v.vehicle_name || '—'}</td>
            <td>
              <Pill tone="brand" label={v.vehicle_type} />
            </td>
            <td>
              {v.is_default ? (
                <Pill tone="active" label="Mặc định" />
              ) : (
                <span className="text-xs text-slate-500">Phụ</span>
              )}
            </td>
            <td>{dt(v.created_at)}</td>
          </tr>
        ))}
      </DataTable>

      <h3 className="mb-2.5 mt-5 text-[15px] font-bold text-slate-900">
        Lịch sử đặt chỗ gần đây ({nf(data.reservations.length)})
      </h3>
      <DataTable
        headers={['Mã đơn', 'Bãi / Ô đỗ', 'Phương tiện', 'Trạng thái', 'Tiền cọc', 'Tổng tiền', 'Thời gian tạo']}
        hasRows={data.reservations.length > 0}
        empty="Chưa có lịch sử đặt chỗ"
      >
        {data.reservations.map(r => (
          <tr key={r.id}>
            <td className="font-mono">#{n(r.id)}</td>
            <td>
              <b>{r.lot_name}</b>
              <div className="mt-0.5 text-[11.5px] text-slate-500">Ô {r.slot_code}</div>
            </td>
            <td>
              {r.license_plate} ({r.vehicle_type})
            </td>
            <td>
              <Pill tone={r.status} label={RES[r.status] || r.status} />
            </td>
            <td>{money(r.deposit_amount)}</td>
            <td>{r.total_amount ? money(r.total_amount) : '—'}</td>
            <td>{dt(r.created_at)}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
