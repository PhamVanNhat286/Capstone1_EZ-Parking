'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Icon } from '@/components/Icon';
import { KpiCard } from '@/components/KpiCard';
import { ErrorCard, LoadingCard } from '@/components/PageState';
import { Pill } from '@/components/Pill';
import { RangeFilter } from '@/components/RangeFilter';
import { SectionCard } from '@/components/SectionCard';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/lib/api';
import { LOT, PAY_PROVIDER, PAY_STATUS, PAY_TYPE } from '@/lib/constants';
import { downloadCsv } from '@/lib/csv';
import {
  createInitialRangeDraft,
  isRangeDirty,
  RangeApiParams,
  RangeDraft,
  RangeMode,
  today
} from '@/lib/date-range';
import { dt, money, n, nf } from '@/lib/format';
import { RevenueLotRow, RevenueResponse } from '@/lib/types';

function LotRevenueChart({ lots, commPct }: { lots: RevenueLotRow[]; commPct: number }) {
  if (!lots.length) {
    return (
      <div className="px-4 py-7 text-center text-slate-400">
        Chưa có bãi đỗ để thống kê trong kỳ này.
      </div>
    );
  }

  const values = lots.map(lot => n(lot.admin_revenue));
  const highest = Math.max(0, ...values);
  const lowest = Math.min(0, ...values);
  const roughStep = (Math.max(highest, -lowest) || 1000) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = ([1, 2, 5, 10].find(factor => factor * magnitude >= roughStep) || 10) * magnitude;
  const upper = Math.ceil(highest / step) * step || (lowest === 0 ? step * 4 : 0);
  const lower = Math.floor(lowest / step) * step;
  const width = Math.max(720, lots.length * 140 + 100);
  const left = Math.max(76, nf(Math.max(upper, -lower)).length * 8 + 24);
  const plotWidth = width - left - 24;
  const columnWidth = plotWidth / lots.length;
  const y = (value: number) => 34 + ((upper - value) / (upper - lower)) * 192;
  const baseline = y(0);
  const tickCount = Math.round((upper - lower) / step) + 1;

  return (
    <div className="px-4 py-3.5 sm:px-6 sm:pb-4 sm:pt-[18px]">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-slate-500">
        <span>Đơn vị: VNĐ</span>
        <span className="inline-flex items-center gap-[7px]">
          <i className="h-2.5 w-2.5 rounded-[3px] bg-brand" />
          Doanh thu Admin ({commPct}%)
        </span>
        {lowest < 0 ? (
          <span className="inline-flex items-center gap-[7px]">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-red-600" />
            Giảm do hoàn tiền
          </span>
        ) : null}
      </div>

      <div
        className="mt-3 overflow-x-auto overscroll-x-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
        tabIndex={0}
        role="region"
        aria-label="Biểu đồ cột doanh thu theo bãi; cuộn ngang để xem tất cả bãi"
      >
        <svg
          viewBox={`0 0 ${width} 310`}
          className="block w-full font-sans"
          style={{ minWidth: `${width}px` }}
          role="group"
          aria-label={`Doanh thu Admin của ${lots.length} bãi đỗ trong khoảng thời gian đã chọn`}
        >
          <title>Doanh thu Admin theo từng bãi đỗ</title>
          {Array.from({ length: tickCount }, (_, i) => {
            const value = upper - i * step;
            return (
              <g key={value}>
                <line
                  x1={left}
                  x2={width - 24}
                  y1={y(value)}
                  y2={y(value)}
                  className={value === 0 ? 'stroke-slate-400' : 'stroke-slate-200'}
                  strokeDasharray={value === 0 ? undefined : '4 4'}
                />
                <text
                  x={left - 12}
                  y={y(value) + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px]"
                >
                  {nf(value)}
                </text>
              </g>
            );
          })}
          {lots.map((lot, index) => {
            const value = values[index];
            const center = left + columnWidth * (index + 0.5);
            const barWidth = Math.min(52, columnWidth * 0.45);
            const label = String(lot.name || `Bãi #${n(lot.id)}`);
            const shortLabel = label.length > 24 ? `${label.slice(0, 22)}…` : label;
            const description = `${label}: ${money(value)}${
              value < 0 ? ' (giảm do hoàn tiền)' : ''
            }`;
            return (
              <g
                key={lot.id}
                className="group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                tabIndex={0}
                role="img"
                aria-label={description}
              >
                <title>{description}</title>
                {value === 0 ? (
                  <line
                    x1={center - barWidth / 2}
                    x2={center + barWidth / 2}
                    y1={baseline}
                    y2={baseline}
                    className="stroke-slate-300 stroke-[3]"
                  />
                ) : (
                  <rect
                    x={center - barWidth / 2}
                    y={Math.min(y(value), baseline)}
                    width={barWidth}
                    height={Math.abs(y(value) - baseline)}
                    rx={4}
                    className={`transition-opacity group-hover:opacity-75 group-focus:opacity-75 ${
                      value < 0 ? 'fill-red-600' : 'fill-blue-600'
                    }`}
                  />
                )}
                <text
                  x={center}
                  y={value < 0 ? y(value) + 18 : y(value) - 10}
                  textAnchor="middle"
                  className="fill-slate-700 text-xs font-semibold"
                >
                  {nf(value)}
                </text>
                <text
                  x={center}
                  y={267}
                  textAnchor="middle"
                  className="fill-slate-700 text-xs font-semibold"
                >
                  {shortLabel}
                </text>
                <text
                  x={center}
                  y={287}
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px]"
                >
                  Bãi #{n(lot.id)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Di chuột vào cột để xem tên bãi và số tiền. Cuộn ngang khi có nhiều bãi.
      </p>
    </div>
  );
}

export default function RevenuePage() {
  const {
    authReady,
    authenticated,
    refreshSummary,
    refreshTick,
    setRefreshing,
    setErrorBanner,
    notice,
    modal
  } = useAdmin();

  const [data, setData] = useState<RevenueResponse | null>(null);
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
        const [, d] = await Promise.all([
          refreshSummary(),
          api<RevenueResponse>('revenue', 'GET', undefined, {
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

        setData(d);
        setLoadError('');
        setErrorBanner('');
      } catch (err) {
        if (id !== reqIdRef.current) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải báo cáo doanh thu.';
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

  useEffect(() => {
    if (!authReady || !authenticated) return;
    void fetchData(true);
  }, [authReady, authenticated, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authReady || !authenticated) return;
    const timer = setInterval(() => void fetchData(false), 20000);
    return () => clearInterval(timer);
  }, [authReady, authenticated, fetchData]);

  function handleExport() {
    if (!data?.recent?.length) return;
    const exportCommPct = Math.round((data.commission?.rate ?? 0.05) * 1000) / 10;
    const exportOwnerPct = Math.round((100 - exportCommPct) * 10) / 10;
    downloadCsv(
      [
        [
          'ID thanh toán', 'Mã đơn', 'Khách hàng', 'Biển số', 'Bãi đỗ', 'Ô đỗ',
          'Cổng', 'Loại', 'Số tiền', `Admin (${exportCommPct}%)`, `Chủ bãi (${exportOwnerPct}%)`, 'Trạng thái', 'Thời gian'
        ],
        ...data.recent.map(x => [
          x.id, x.reservation_id, x.customer, x.license_plate, x.lot_name, x.slot_code,
          x.provider, x.payment_type, x.amount, x.admin_revenue, x.owner_revenue, x.status, x.paid_at
        ])
      ],
      `ezspace_revenue_${new Date().toISOString().slice(0, 10)}.csv`
    );
    notice('Đã xuất báo cáo CSV thành công.');
  }

  if (!data) {
    if (loadError) return <ErrorCard message={loadError} onRetry={() => void fetchData(true)} />;
    return <LoadingCard />;
  }

  const t = data.totals;
  const cash = n(t.received);
  const adminRevenue = n(t.admin_revenue);
  const commPct = Math.round((data.commission?.rate ?? 0.05) * 1000) / 10;
  const ownerPct = Math.round((100 - commPct) * 10) / 10;
  const daily = data.byDay || [];
  const maxDay = Math.max(1, ...daily.map(x => Math.abs(n(x.admin_revenue))));

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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Doanh thu Admin (${commPct}%)`}
          value={money(adminRevenue)}
          icon="account_balance_wallet"
          tone="brand"
          sub={`${commPct}% tiền thực thu sau hoàn tiền của mỗi lượt đặt ô`}
        />
        <KpiCard
          label={`Phần của chủ bãi (${ownerPct}%)`}
          value={money(t.owner_revenue)}
          icon="account_balance"
          tone="ok"
          sub="Phần còn lại sau khi trừ doanh thu Admin"
        />
        <KpiCard
          label="Tổng tiền khách thanh toán"
          value={money(cash)}
          icon="payments"
          tone="brand"
          sub={`Cọc: ${money(t.deposits)} · Tất toán: ${money(t.finals)}`}
        />
        <KpiCard
          label="Tiền hoàn cho khách"
          value={money(t.refunds)}
          icon="receipt_long"
          tone="warn"
          sub={`Tiền thực thu sau hoàn: ${money(t.net_received)}`}
        />
      </div>

      <SectionCard
        title="Doanh thu Admin theo bãi đỗ"
        subtitle={`So sánh phần doanh thu ${commPct}% của từng bãi trong khoảng thời gian đang chọn.`}
        icon="analytics"
      >
        <LotRevenueChart lots={data.byLot || []} commPct={commPct} />
      </SectionCard>

      <SectionCard
        title="Doanh thu Admin theo ngày"
        subtitle={`${commPct}% × (tiền cọc + tiền tất toán − tiền hoàn). Cột đỏ là khoản giảm do hoàn tiền.`}
        icon="calendar_today"
      >
        {daily.length ? (
          <div className="flex h-[225px] items-end gap-2 overflow-x-auto px-6 pb-[18px] pt-5">
            {daily.map(x => {
              const total = n(x.admin_revenue);
              return (
                <div
                  key={x.day}
                  className="flex h-full min-w-[28px] flex-1 flex-col items-center justify-end gap-[5px]"
                  title={`${x.day}: ${money(total)}${total < 0 ? ' (giảm do hoàn tiền)' : ''}`}
                >
                  <div className="whitespace-nowrap text-[10.5px] font-bold text-slate-700">
                    {total ? nf(total) : ''}
                  </div>
                  <div
                    className={`min-h-[2px] w-[min(36px,100%)] rounded-t-[5px] ${
                      total < 0
                        ? 'bg-gradient-to-b from-red-300 to-red-600'
                        : 'bg-gradient-to-b from-blue-400 to-blue-600'
                    }`}
                    style={{
                      height: `${total ? Math.max(8, Math.round((100 * Math.abs(total)) / maxDay)) : 0}%`
                    }}
                  />
                  <small className="text-[10px] text-slate-500">{String(x.day).slice(5)}</small>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-7 text-center text-slate-400">
            Chưa có giao dịch thanh toán thành công trong kỳ được chọn.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Đối soát tài chính theo từng bãi đỗ xe"
        subtitle={`Kỳ đối soát từ ${dt(data.range.from)} đến ${dt(data.range.to)}`}
        icon="account_balance"
      >
        <DataTable
          headers={[
            'Bãi đỗ xe', 'Lượt cọc', 'Tiền đặt cọc', 'Thanh toán cuối',
            'Cọc No-show', 'Tiền hoàn', 'Thực thu', `Admin (${commPct}%)`, `Chủ bãi (${ownerPct}%)`
          ]}
          hasRows={(data.byLot || []).length > 0}
        >
          {(data.byLot || []).map(x => (
            <tr key={x.id}>
              <td>
                <b>{x.name}</b>
                <div className="mt-0.5 text-[11.5px] text-slate-500">
                  Mã bãi #{n(x.id)} · {LOT[x.status] || x.status}
                </div>
              </td>
              <td>{nf(x.bookings)}</td>
              <td>{money(x.deposits)}</td>
              <td>{money(x.finals)}</td>
              <td>{money(x.forfeited_deposits)}</td>
              <td>{money(x.refunds)}</td>
              <td>{money(x.net_received)}</td>
              <td><b>{money(x.admin_revenue)}</b></td>
              <td>{money(x.owner_revenue)}</td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Chi tiết doanh thu Admin theo loại xe" icon="directions_car">
          <DataTable
            headers={['Loại xe', 'Số đơn', `Admin (${commPct}%)`, 'Tỷ trọng']}
            hasRows={(data.byVehicle || []).length > 0}
          >
            {(data.byVehicle || []).map(x => (
              <tr key={x.vehicle_type}>
                <td><b>{x.vehicle_type}</b></td>
                <td>{nf(x.bookings)}</td>
                <td>{money(x.admin_revenue)}</td>
                <td>
                  {adminRevenue > 0
                    ? `${((n(x.admin_revenue) / adminRevenue) * 100).toFixed(1)}%`
                    : '—'}
                </td>
              </tr>
            ))}
          </DataTable>
        </SectionCard>

        <SectionCard
          title="Thống kê theo cổng thanh toán"
          subtitle="Tổng hợp số lượng giao dịch và doanh thu theo từng phương thức thanh toán."
          icon="payments"
        >
          <DataTable
            headers={['Cổng thanh toán', 'Số giao dịch', 'Tiền khách trả', `Admin (${commPct}%)`]}
            hasRows={(data.byProvider || []).length > 0}
          >
            {(data.byProvider || []).map(x => (
              <tr key={x.provider}>
                <td><b>{PAY_PROVIDER[x.provider] || x.provider}</b></td>
                <td>{nf(x.transactions)}</td>
                <td>{money(x.received)}</td>
                <td><b>{money(x.admin_revenue)}</b></td>
              </tr>
            ))}
          </DataTable>
        </SectionCard>
      </div>

      <SectionCard
        title="Danh sách giao dịch thanh toán gần nhất"
        subtitle={`Tối đa 200 giao dịch gần nhất. Hoàn tiền làm giảm tương ứng phần ${commPct}% của Admin.`}
        icon="receipt_long"
        action={
          <button type="button" className="btn btn-sm h-9" onClick={handleExport}>
            <Icon name="download" sizeClass="h-4 w-4" />
            <span>Xuất CSV giao dịch</span>
          </button>
        }
      >
        <DataTable
          headers={[
            'Mã GD / Đơn', 'Khách hàng', 'Bãi / Ô đỗ', 'Cổng / Mã tham chiếu',
            'Loại', 'Số tiền', `Admin (${commPct}%)`, 'Trạng thái', 'Thời gian'
          ]}
          hasRows={(data.recent || []).length > 0}
        >
          {(data.recent || []).map(x => (
            <tr key={x.id}>
              <td className="font-mono">#{n(x.id)} / Đơn #{n(x.reservation_id)}</td>
              <td>
                <b>{x.customer || '—'}</b>
                <div className="mt-0.5 text-[11.5px] text-slate-500">{x.license_plate || '—'}</div>
              </td>
              <td>
                {x.lot_name}
                <div className="mt-0.5 text-[11.5px] text-slate-500">Ô {x.slot_code || '—'}</div>
              </td>
              <td>
                {PAY_PROVIDER[x.provider] || x.provider}
                <div className="mt-0.5 font-mono text-[11.5px] text-slate-500">{x.transaction_ref || '—'}</div>
              </td>
              <td><Pill tone={x.payment_type} label={PAY_TYPE[x.payment_type] || x.payment_type} /></td>
              <td><b>{money(x.amount)}</b></td>
              <td><b>{money(x.admin_revenue)}</b></td>
              <td><Pill tone={x.status} label={PAY_STATUS[x.status] || x.status} /></td>
              <td>{dt(x.paid_at)}</td>
            </tr>
          ))}
        </DataTable>
      </SectionCard>
    </>
  );
}
