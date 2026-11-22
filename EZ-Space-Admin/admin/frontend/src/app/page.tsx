'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Icon } from '@/components/Icon';
import { KpiCard } from '@/components/KpiCard';
import { ErrorCard, LoadingCard } from '@/components/PageState';
import { Pill } from '@/components/Pill';
import { RangeFilter } from '@/components/RangeFilter';
import { SectionCard } from '@/components/SectionCard';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/lib/api';
import { MANAGER_ACTION, RES } from '@/lib/constants';
import {
  createInitialRangeDraft,
  isRangeDirty,
  RangeApiParams,
  RangeDraft,
  RangeMode,
  today
} from '@/lib/date-range';
import { dt, money, n, nf } from '@/lib/format';
import { DashboardResponse, SummaryResponse } from '@/lib/types';
import { useAdminActions } from '@/lib/useAdminActions';

export default function DashboardPage() {
  const {
    authReady,
    summary,
    refreshSummary,
    refreshTick,
    setRefreshing,
    setErrorBanner,
    notice,
    modal
  } = useAdmin();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [localSummary, setLocalSummary] = useState<SummaryResponse | null>(summary);
  const [loadError, setLoadError] = useState('');
  const [rangeDraft, setRangeDraft] = useState<RangeDraft>(createInitialRangeDraft);
  const [appliedMode, setAppliedMode] = useState<RangeMode>('all');
  const [appliedParams, setAppliedParams] = useState<RangeApiParams>({ range: 'all' });
  const [rangeLoading, setRangeLoading] = useState(false);

  const reqIdRef = useRef(0);
  const draftRef = useRef(rangeDraft);
  draftRef.current = rangeDraft;

  const fetchData = useCallback(
    async (
      silent = false,
      rangeRequest?: { params: RangeApiParams; mode: RangeMode; draftSnapshot: string }
    ) => {
      if (!silent) {
        if (document.hidden || modal.open || rangeLoading) return;
        if (isRangeDirty(draftRef.current, appliedMode, appliedParams)) return;
      }

      const id = ++reqIdRef.current;
      if (rangeRequest) setRangeLoading(true);
      setRefreshing(true);

      try {
        const queryParams = rangeRequest ? rangeRequest.params : appliedParams;
        const [s, d] = await Promise.all([
          refreshSummary(),
          api<DashboardResponse>('dashboard', 'GET', undefined, {
            range: queryParams.range,
            from: queryParams.from,
            to: queryParams.to
          })
        ]);
        if (id !== reqIdRef.current) return;

        if (rangeRequest) {
          setAppliedMode(rangeRequest.mode);
          setAppliedParams(rangeRequest.params);
          if (JSON.stringify(draftRef.current) === rangeRequest.draftSnapshot) {
            const nextFrom =
              rangeRequest.params.range === 'all' ? today() : String(d.range.from).slice(0, 10);
            const nextTo =
              rangeRequest.params.range === 'all' ? today() : String(d.range.to).slice(0, 10);
            setRangeDraft(prev => ({
              ...prev,
              from: nextFrom,
              to: nextTo,
              year: rangeRequest.mode === 'year' ? prev.year : nextFrom.slice(0, 4),
              month:
                rangeRequest.mode === 'year' ? prev.month : String(Number(nextFrom.slice(5, 7)))
            }));
          }
        }

        if (s) setLocalSummary(s);
        setData(d);
        setLoadError('');
        setErrorBanner('');
      } catch (err) {
        if (id !== reqIdRef.current) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu.';
        setLoadError(msg);
        setErrorBanner(msg);
        if (rangeRequest) notice(msg, 'bad');
      } finally {
        setRefreshing(false);
        if (id === reqIdRef.current) setRangeLoading(false);
      }
    },
    [appliedMode, appliedParams, modal.open, notice, rangeLoading, refreshSummary, setErrorBanner, setRefreshing]
  );

  const { mutateLot } = useAdminActions(() => {
    void fetchData(true);
  });

  useEffect(() => {
    if (!authReady) return;
    void fetchData(true);
  }, [authReady, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authReady) return;
    const timer = setInterval(() => void fetchData(false), 20000);
    return () => clearInterval(timer);
  }, [authReady, fetchData]);

  const effectiveSummary = localSummary || summary;

  if (!data) {
    if (loadError) return <ErrorCard message={loadError} onRetry={() => void fetchData(true)} />;
    return <LoadingCard />;
  }

  const u = effectiveSummary?.users;
  const l = effectiveSummary?.lots;
  const s = effectiveSummary?.slots;
  const ses = effectiveSummary?.sessions;
  const tkt = effectiveSummary?.tickets;
  const veh = effectiveSummary?.vehicles;
  const chat = effectiveSummary?.chat;
  const books = data.books;
  const pay = data.payments;

  const slotTotal = n(s?.total);
  const slotAvail = n(s?.available);
  const slotHold = n(s?.holding);
  const slotOcc = n(s?.occupied);
  const slotUnavail = n(s?.unavailable);
  const pct = (val: number) => (slotTotal ? `${((val * 100) / slotTotal).toFixed(2)}%` : '0%');

  const maxHourly = Math.max(1, ...(data.hourly || []).map(x => n(x.amount)));
  const hours = Array.from({ length: 12 }, (_, i) => i * 2);

  return (
    <>
      <RangeFilter
        draft={rangeDraft}
        onDraftChange={setRangeDraft}
        appliedMode={appliedMode}
        appliedParams={appliedParams}
        activeRange={data.range}
        loading={rangeLoading}
        onApply={(params, mode, draftSnapshot) =>
          void fetchData(true, { params, mode, draftSnapshot })
        }
        onValidationError={msg => {
          setErrorBanner(msg);
          notice(msg, 'bad');
        }}
      />

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tổng người dùng"
          value={nf(u?.total)}
          icon="groups"
          sub={`${nf(u?.customers)} khách hàng · ${nf(u?.managers)} chủ bãi`}
        />
        <KpiCard
          label="Bãi đỗ vận hành"
          value={nf(l?.active)}
          icon="apartment"
          sub={`${nf(l?.pending)} bãi chờ phê duyệt · Tổng ${nf(l?.total)} bãi`}
        />
        <KpiCard
          label="Đặt chỗ trong kỳ"
          value={nf(books?.total)}
          icon="event_available"
          sub={`${nf(s?.occupied)} ô đang đỗ · ${nf(s?.holding)} ô giữ chỗ`}
        />
        <KpiCard
          label="Doanh thu Admin (5%)"
          value={money(pay?.admin_revenue)}
          icon="payments"
          sub="5% tiền thực thu sau hoàn tiền của mỗi lượt đặt ô"
        />
      </div>

      <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[minmax(0,1.7fr)_minmax(290px,1fr)]">
        <SectionCard
          title="Lưu lượng đặt chỗ theo khung giờ"
          subtitle={`Thống kê lượt đặt chỗ từ ${dt(data.range.from)} đến ${dt(data.range.to)}`}
          className="h-full"
        >
          <div className="mx-6 my-4 flex h-[205px] items-end gap-2 pt-4">
            {hours.map(h => {
              const inHours = (data.hourly || []).filter(
                x => Math.floor(n(x.hour) / 2) * 2 === h
              );
              const total = inHours.reduce((z, v) => z + n(v.amount), 0);
              const barPct = Math.round((total / Math.max(maxHourly * 2, 1)) * 100);
              const label = `${String(h).padStart(2, '0')}:00`;
              return (
                <div
                  key={h}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[5px]"
                  title={`${label} – ${nf(total)} lượt`}
                >
                  <div className="text-[11.5px] font-bold text-slate-700">{total || ''}</div>
                  <div
                    className="min-h-[1px] w-[min(38px,100%)] rounded-t-[5px] bg-gradient-to-b from-blue-400 to-blue-600"
                    style={{ height: `${Math.max(barPct, total ? 8 : 0)}%` }}
                  />
                  <small className="text-[10px] text-slate-500">{label}</small>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 px-6 py-4 text-center">
            <div className="min-w-0 px-2">
              <b className="block text-lg text-slate-900">{nf(books?.total)}</b>
              <small className="text-[10.5px] text-slate-400">Tổng đơn trong kỳ</small>
            </div>
            <div className="min-w-0 px-2">
              <b className="block text-lg text-slate-900">
                {nf(n(books?.paid) + n(books?.entered) + n(books?.completed))}
              </b>
              <small className="text-[10.5px] text-slate-400">Đã cọc / Hoàn thành</small>
            </div>
            <div className="min-w-0 px-2">
              <b className="block text-lg text-slate-900">
                {nf(n(books?.cancelled) + n(books?.forfeited))}
              </b>
              <small className="text-[10.5px] text-slate-400">Đã hủy / No-show</small>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Chỉ số Vận hành & Tiện ích"
          subtitle="Tổng hợp phiên đỗ xe, vé QR, phương tiện và trợ lý AI."
          className="h-full"
        >
          <div className="divide-y divide-slate-100 px-6 pb-5 pt-2">
            <div className="flex items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-2.5 text-[12.5px] font-bold text-slate-700">
                <Icon name="schedule" className="text-brand" />
                <div>
                  Phiên đỗ xe thực tế
                  <small className="mt-0.5 block text-[11px] font-medium leading-snug text-slate-400">
                    Đang đỗ: {nf(ses?.active)} · Đã rời bãi: {nf(ses?.completed)}
                  </small>
                </div>
              </div>
              <span className="whitespace-nowrap rounded-[7px] bg-green-100 px-2.5 py-[5px] text-[11px] font-extrabold text-green-700">
                {nf(ses?.total)} phiên
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-2.5 text-[12.5px] font-bold text-slate-700">
                <Icon name="qr_code" className="text-brand" />
                <div>
                  Vé QR Check-in Kiosk
                  <small className="mt-0.5 block text-[11px] font-medium leading-snug text-slate-400">
                    Còn hiệu lực: {nf(tkt?.active)} · Đã quét: {nf(tkt?.used)}
                  </small>
                </div>
              </div>
              <span className="whitespace-nowrap rounded-[7px] bg-brand-tint px-2.5 py-[5px] text-[11px] font-extrabold text-brand">
                {nf(tkt?.total)} vé
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-2.5 text-[12.5px] font-bold text-slate-700">
                <Icon name="directions_car" className="text-brand" />
                <div>
                  Phương tiện đăng ký
                  <small className="mt-0.5 block text-[11px] font-medium leading-snug text-slate-400">
                    SUV: {nf(veh?.suv)} · Sedan: {nf(veh?.sedan)} · EV: {nf(veh?.ev)}
                  </small>
                </div>
              </div>
              <span className="whitespace-nowrap rounded-[7px] bg-brand-tint px-2.5 py-[5px] text-[11px] font-extrabold text-brand">
                {nf(veh?.total)} xe
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-2.5 text-[12.5px] font-bold text-slate-700">
                <Icon name="info" className="text-brand" />
                <div>
                  Tương tác Trợ lý AI
                  <small className="mt-0.5 block text-[11px] font-medium leading-snug text-slate-400">
                    Khách hỏi: {nf(chat?.user_msgs)} · Phản hồi AI: {nf(chat?.ai_msgs)}
                  </small>
                </div>
              </div>
              <span className="whitespace-nowrap rounded-[7px] bg-brand-tint px-2.5 py-[5px] text-[11px] font-extrabold text-brand">
                {nf(chat?.total)} tin nhắn
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Tình trạng lấp đầy ô đỗ toàn hệ thống"
        subtitle={`Tổng sức chứa khai báo: ${nf(l?.capacity)} chỗ · Tổng ô trên sơ đồ 2D: ${nf(s?.total)} ô`}
      >
        <div className="mx-6 mb-[22px] mt-[18px]">
          <div className="flex h-[18px] w-full overflow-hidden rounded-full bg-slate-200">
            <i className="block h-full bg-red-500" style={{ width: pct(slotOcc) }} title={`Đang đỗ: ${nf(slotOcc)}`} />
            <i className="block h-full bg-yellow-500" style={{ width: pct(slotHold) }} title={`Đang giữ chỗ: ${nf(slotHold)}`} />
            <i className="block h-full bg-green-500" style={{ width: pct(slotAvail) }} title={`Trống: ${nf(slotAvail)}`} />
            <i className="block h-full bg-gray-400" style={{ width: pct(slotUnavail) }} title={`Ngưng sử dụng: ${nf(slotUnavail)}`} />
          </div>
          <div className="mb-2 mt-3.5 flex flex-wrap gap-x-6 gap-y-2.5 text-[13px] text-slate-700">
            <span>Đang đỗ: <b>{nf(slotOcc)}</b></span>
            <span>Đang giữ chỗ: <b>{nf(slotHold)}</b></span>
            <span>Trống: <b>{nf(slotAvail)}</b></span>
            <span>Ngưng sử dụng: <b>{nf(slotUnavail)}</b></span>
          </div>
          <p className="text-xs text-slate-500">
            Phân loại ô đỗ: Tiêu chuẩn <b>{nf(s?.standard)}</b> · Trạm sạc EV{' '}
            <b>{nf(s?.ev_charging)}</b> · Xe lớn/SUV <b>{nf(s?.large)}</b> · Ưu tiên KT{' '}
            <b>{nf(s?.disabled)}</b>.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title={`Bãi đỗ xe chờ phê duyệt (${nf(l?.pending)})`}
        subtitle="Kiểm duyệt các bãi đỗ xe mới đăng ký trước khi đưa vào vận hành."
      >
        <DataTable
          headers={['Bãi đỗ & Địa chỉ', 'Chủ bãi', 'Sức chứa', 'Trạng thái', 'Thao tác']}
          hasRows={(data.pending || []).length > 0}
          empty="Hiện không có bãi đỗ nào đang chờ phê duyệt"
        >
          {(data.pending || []).map(x => (
            <tr key={x.id}>
              <td>
                <b>{x.name}</b>
                <div className="mt-0.5 text-[11.5px] text-slate-500">{x.address}</div>
              </td>
              <td>{x.managers || 'Chưa phân công'}</td>
              <td>{nf(x.capacity)} chỗ</td>
              <td><Pill tone="pending" label="Chờ duyệt" /></td>
              <td>
                <div className="flex min-w-[125px] flex-wrap gap-1.5">
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
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Nhật ký hoạt động mới nhất">
          <DataTable
            headers={['Thời gian', 'Sự kiện', 'Tác nhân', 'Ghi chú']}
            hasRows={(data.logs || []).length > 0}
          >
            {(data.logs || []).map(x => (
              <tr key={x.id}>
                <td>{dt(x.created_at)}</td>
                <td>
                  <b>{MANAGER_ACTION[x.action] || x.action}</b>
                  <div className="mt-0.5 font-mono text-[11.5px] text-slate-500">{x.action}</div>
                </td>
                <td>{x.actor || 'Hệ thống'}</td>
                <td>{x.note || '—'}</td>
              </tr>
            ))}
          </DataTable>
        </SectionCard>

        <SectionCard title="Đơn đặt chỗ mới nhất">
          <DataTable
            headers={['Mã đơn', 'Khách hàng', 'Bãi / Ô', 'Trạng thái', 'Tiền cọc', 'Ngày tạo']}
            hasRows={(data.recent || []).length > 0}
          >
            {(data.recent || []).map(x => (
              <tr key={x.id}>
                <td className="font-mono">#{n(x.id)}</td>
                <td>
                  <b>{x.customer}</b>
                  <div className="mt-0.5 text-[11.5px] text-slate-500">
                    {x.license_plate} ({x.vehicle_type})
                  </div>
                </td>
                <td>
                  {x.lot_name}
                  <div className="mt-0.5 text-[11.5px] text-slate-500">Ô {x.slot_code}</div>
                </td>
                <td className="min-w-[102px] whitespace-nowrap">
                  <Pill tone={x.status} label={RES[x.status] || x.status} />
                </td>
                <td>{money(x.deposit_amount)}</td>
                <td>{dt(x.created_at)}</td>
              </tr>
            ))}
          </DataTable>
        </SectionCard>
      </div>
    </>
  );
}
